import { useEffect, useRef, useState } from "react";
import "./cssSeat.css";
import "./cssPayment.css";
import bg from "./assets/image/background.png";

function getSeatPrice(dest) {
  if (dest === "FP") return 20;
  if (dest === "MC") return 40;
  if (dest === "VM") return 43;
  return 0;
}

function getDestLabel(dest) {
  if (dest === "FP") return "future park rangsit";
  if (dest === "MC") return "mo chit";
  if (dest === "VM") return "victory monument";
  return "-";
}

function getTimeLabel(hhmm) {
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

export default function Seat({ goBack, seats, tripId, userId, tcpRequest }) {
  const [selected, setSelected] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(600);
  const [currentBookingId, setCurrentBookingId] = useState(null);

  const [transferTime, setTransferTime] = useState("");
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [submittingSlip, setSubmittingSlip] = useState(false);

  const holdTokensRef = useRef({});
  const paymentTimerRef = useRef(null);

  const dest = localStorage.getItem("dest") || "";
  const hhmm = localStorage.getItem("hhmm") || "";
  const username =
    localStorage.getItem("name") ||
    localStorage.getItem("username") ||
    localStorage.getItem("email") ||
    String(userId || "");
  const phone = localStorage.getItem("phone") || "-";

  const tcpSend = (packet) => {
    if (!window.tcp) return;
    window.tcp.send(packet);
  };

  const isReserved = (seatId) => {
    const st = seats?.[seatId];
    return st === "BOOKED" || st === "HELD";
  };

  const toggleSeat = (seatId) => {
    if (!tripId) return alert("ยังโหลดรอบรถไม่เสร็จ");
    if (isReserved(seatId)) return;

    setSelected((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : [...prev, seatId]
    );
  };

  const openSummary = () => {
    if (!tripId) return alert("ยังโหลดรอบรถไม่เสร็จ");
    if (!userId) return alert("กรุณาเข้าสู่ระบบ");
    if (selected.length === 0) return;

    const seatPrice = getSeatPrice(dest);
    const seatsCopy = [...selected];

    setBookingData({
      username,
      seats: seatsCopy,
      time: getTimeLabel(hhmm),
      phone,
      destination: getDestLabel(dest),
      price: seatPrice * seatsCopy.length,
      tripId,
      hhmm,
      dest,
    });

    setShowSummary(true);
  };

  const handleSummaryConfirm = async () => {
    if (!bookingData) return;

    try {
      setCreatingBooking(true);

      holdTokensRef.current = {};

      // HOLD อย่างเดียว ยังไม่ CONFIRM
      for (const seatId of bookingData.seats) {
        const holdMsg = await tcpRequest({
          type: "HOLD",
          tripId: bookingData.tripId,
          seat: seatId,
          userId: Number(userId),
        });

        if (holdMsg.type !== "HOLD_OK") {
          alert(`HOLD ไม่สำเร็จ: ${seatId}`);
          return;
        }

        holdTokensRef.current[seatId] = holdMsg.holdToken;
      }

      // CREATE_BOOKING ให้เป็น PENDING_PAYMENT
      const bookingRes = await tcpRequest({
        type: "CREATE_BOOKING",
        tripId: bookingData.tripId,
        seats: bookingData.seats,
        totalPriceBaht: bookingData.price,
        holdTokens: holdTokensRef.current,
        userId: Number(userId),
      });

      if (bookingRes.type !== "CREATE_BOOKING_OK") {
        alert("สร้าง booking ไม่สำเร็จ");
        return;
      }

      const paymentRes = await tcpRequest({
        type: "PAYMENT_CREATE_PROMPTPAY",
        bookingId: bookingRes.bookingId,
        userId: Number(userId),
      });

      if (paymentRes.type !== "PAYMENT_QR") {
        alert(paymentRes.code || "สร้าง QR payment ไม่สำเร็จ");
        return;
      }

      setPaymentQrUri(paymentRes.qrUri || "");
      setCurrentBookingId(bookingRes.bookingId);
      setShowSummary(false);
      setShowPayment(true);
      setPaymentSecondsLeft(600);

      if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = setInterval(() => {
        setPaymentSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(paymentTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      tcpSend({ type: "LIST_SEATS", tripId: bookingData.tripId });
    } catch (e) {
      console.error(e);
      alert("เชื่อมต่อผิดพลาด");
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlipFile(file);

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

  const handleSubmitSlip = async () => {
    if (!currentBookingId) {
      alert("ไม่พบ booking");
      return;
    }

    if (!transferTime) {
      alert("กรุณากรอกเวลาที่โอน");
      return;
    }

    if (!slipFile) {
      alert("กรุณาแนบสลิป");
      return;
    }

    try {
      setSubmittingSlip(true);

      const slipBase64 = await fileToBase64(slipFile);

      const res = await tcpRequest({
        type: "SUBMIT_PAYMENT_SLIP",
        bookingId: currentBookingId,
        transferredAt: transferTime,
        slipBase64,
        slipFileName: slipFile.name,
        userId: Number(userId),
      });

      if (res.type !== "SUBMIT_PAYMENT_SLIP_OK") {
        alert(res.code || "ส่งสลิปไม่สำเร็จ");
        return;
      }

      alert("ส่งสลิปเรียบร้อย รอแอดมินตรวจสอบ");
      closePayment();
    } catch (e) {
      console.error(e);
      alert("ส่งสลิปไม่สำเร็จ");
    } finally {
      setSubmittingSlip(false);
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
  };

  const closePayment = () => {
    setShowPayment(false);
    setSelected([]);
    setBookingData(null);
    setCurrentBookingId(null);
    setTransferTime("");
    setSlipFile(null);
    setSlipPreview("");
    holdTokensRef.current = {};

    if (paymentTimerRef.current) {
      clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (paymentTimerRef.current) {
        clearInterval(paymentTimerRef.current);
      }
      if (slipPreview) {
        URL.revokeObjectURL(slipPreview);
      }
    };
  }, [slipPreview]);

  const SeatBox = ({ num }) => {
    const reserved = isReserved(num);
    const chosen = selected.includes(num);

    return (
      <div
        className={`seat ${reserved ? "reserved" : ""} ${chosen ? "selected" : ""}`}
        onClick={() => toggleSeat(num)}
      >
        {num}
      </div>
    );
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <button className="back-btn" onClick={goBack}>←</button>

      <div className="seat-card">
        <h2>Choose Seat</h2>

        <div className="legend">
          <div className="seat example">Available</div>
          <div className="seat example selected">Selected</div>
          <div className="seat example reserved">Reserved</div>
        </div>

        <div className="bus">
          <div className="row left">
            <SeatBox num="A1" />
            <SeatBox num="A2" />
          </div>

          <div className="row right">
            <SeatBox num="B1" />
            <SeatBox num="B2" />
            <SeatBox num="B3" />
          </div>

          <div className="row split">
            <SeatBox num="C1" />
            <div className="right-group">
              <SeatBox num="C2" />
              <SeatBox num="C3" />
            </div>
          </div>

          <div className="row split">
            <SeatBox num="D1" />
            <div className="right-group">
              <SeatBox num="D2" />
              <SeatBox num="D3" />
            </div>
          </div>

          <div className="row split">
            <SeatBox num="E1" />
            <div className="right-group">
              <SeatBox num="E2" />
              <SeatBox num="E3" />
            </div>
          </div>
        </div>

        <button className="confirm" onClick={openSummary}>
          Confirm ({selected.length})
        </button>
      </div>

      {showSummary && bookingData && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close" onClick={closeSummary}>✕</button>

            <h2>information</h2>

            <p><b>username :</b> {bookingData.username}</p>
            <p><b>seat :</b> {bookingData.seats.join(", ")}</p>
            <p><b>time :</b> {bookingData.time}</p>
            <p><b>phone :</b> {bookingData.phone}</p>
            <p><b>destination :</b> {bookingData.destination}</p>
            <p><b>price :</b> {bookingData.price} baht</p>

            <button
              className="confirm-btn"
              onClick={handleSummaryConfirm}
              disabled={creatingBooking}
            >
              {creatingBooking ? "loading..." : "confirm"}
            </button>
          </div>
        </div>
      )}

      {showPayment && bookingData && (
        <div className="payment-overlay">
          <div className="payment-card">
            <button className="payment-close" onClick={closePayment}>×</button>

            <div className="payment-logo">PromptPay</div>

            <div className="payment-qr-wrap">
              {paymentQrUri ? (
                <img src={paymentQrUri} alt="PromptPay QR" className="payment-qr" />
              ) : (
                <div className="payment-qr-placeholder">loading...</div>
              )}
            </div>

            <div className="payment-info">
              <p><b>username :</b> {bookingData.username}</p>
              <p><b>seat :</b> {bookingData.seats.join(", ")}</p>
              <p><b>time :</b> {bookingData.time}</p>
              <p><b>phone :</b> {bookingData.phone}</p>
              <p><b>destination :</b> {bookingData.destination}</p>
              <p><b>price :</b> {bookingData.price} baht</p>
            </div>

            <p className="payment-pending">
              payment pending {formatCountdown(paymentSecondsLeft)}
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
                    maxHeight: "180px",
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
              onClick={handleSubmitSlip}
              disabled={submittingSlip}
            >
              {submittingSlip ? "submitting..." : "payment confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}