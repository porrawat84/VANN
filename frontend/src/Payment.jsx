import { useEffect, useRef, useState } from "react";
import "./cssPayment.css";
import bg from "./assets/image/background.png";

function destLabel(dest) {
  if (dest === "FP") return "future park rangsit";
  if (dest === "MC") return "mo chit";
  if (dest === "VM") return "victory monument";
  return "-";
}

function formatHHMMLabel(hhmm) {
  const map = {
    "1000": "10:00 am",
    "1100": "11:00 am",
    "1200": "12:00 pm",
    "1300": "1:00 pm",
    "1400": "2:00 pm",
    "1500": "3:00 pm",
    "1600": "4:00 pm",
    "1700": "5:00 pm",
  };
  return map[hhmm] || hhmm || "-";
}

function formatCountdown(sec) {
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Payment({ data, tcpRequest, notify, goBack, goDone }) {
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [transferTime, setTransferTime] = useState("");
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [submittingSlip, setSubmittingSlip] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!data) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data]);

  useEffect(() => {
    return () => {
      if (slipPreview) URL.revokeObjectURL(slipPreview);
    };
  }, [slipPreview]);

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlipFile(file);

    if (slipPreview) URL.revokeObjectURL(slipPreview);
    const previewUrl = URL.createObjectURL(file);
    setSlipPreview(previewUrl);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!data?.bookingId) {
      notify("ไม่พบ booking", "error");
      return;
    }

    if (!transferTime) {
      notify("กรุณากรอกวันเวลาที่โอนเงิน", "error");
      return;
    }

    if (!slipFile) {
      notify("กรุณาแนบสลิปการโอนเงิน", "error");
      return;
    }

    try {
      setSubmittingSlip(true);

      const slipBase64 = await fileToBase64(slipFile);

      const res = await tcpRequest({
        type: "SUBMIT_PAYMENT_SLIP",
        bookingId: data.bookingId,
        transferredAt: transferTime,
        slipBase64,
        slipFileName: slipFile.name,
      });

      if (res.type !== "SUBMIT_PAYMENT_SLIP_OK") {
        notify(res.code || "ส่งสลิปไม่สำเร็จ", "error");
        return;
      }

      notify("ส่งสลิปเรียบร้อย รอแอดมินตรวจสอบ", "info");
      goDone?.();
    } catch (e) {
      console.error(e);
      notify("เกิดข้อผิดพลาดระหว่างส่งสลิป", "error");
    } finally {
      setSubmittingSlip(false);
    }
  };

  if (!data) {
    return (
      <div className="payment-overlay" style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
        <div className="payment-card">
          <p>ไม่พบข้อมูลการชำระเงิน</p>
          <button className="payment-confirm-btn" onClick={goBack}>back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-overlay" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}>
      <div className="payment-card">
        <button className="payment-close" onClick={goBack}>×</button>

        <div className="payment-logo">PromptPay</div>

        <div className="payment-qr-wrap">
          {data.qrUri ? (
            <img src={data.qrUri} alt="PromptPay QR" className="payment-qr" />
          ) : (
            <div className="payment-qr-placeholder">loading...</div>
          )}
        </div>

        <div className="payment-info">
          <p><b>username :</b> {data.username}</p>
          <p><b>seat :</b> {data.seats.join(", ")}</p>
          <p><b>time :</b> {formatHHMMLabel(data.hhmm)}</p>
          <p><b>phone :</b> {data.phone || "-"}</p>
          <p><b>destination :</b> {destLabel(data.dest)}</p>
          <p><b>price :</b> {Number(data.amountBaht).toFixed(2)} baht</p>
        </div>

        <p className="payment-pending">
          payment pending {formatCountdown(secondsLeft)}
        </p>

        <div style={{ marginTop: "12px", textAlign: "left" }}>
          <label style={{ display: "block", marginBottom: "6px" }}>
            transfer time
          </label>
          <input
            type="datetime-local"
            value={transferTime}
            onChange={(e) => setTransferTime(e.target.value)}
            style={{ width: "100%", marginBottom: "10px" }}
          />

          <label style={{ display: "block", marginBottom: "6px" }}>
            upload slip
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleSlipChange}
            style={{ width: "100%", marginBottom: "10px" }}
          />

          {slipPreview && (
            <img
              src={slipPreview}
              alt="slip preview"
              style={{
                width: "100%",
                maxHeight: "140px",
                objectFit: "contain",
                borderRadius: "12px",
                marginBottom: "10px",
                background: "#fff",
              }}
            />
          )}
        </div>

        <button
          className="payment-confirm-btn"
          onClick={handleSubmit}
          disabled={submittingSlip}
        >
          {submittingSlip ? "submitting..." : "payment confirm"}
        </button>
      </div>
    </div>
  );
}