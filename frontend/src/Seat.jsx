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

export default function Seat({ goBack, seats, tripId, userId, tcpRequest, notify, openPaymentPage }) {  const [selected, setSelected] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const holdTokensRef = useRef({});

  const dest = localStorage.getItem("dest") || "";
  const hhmm = localStorage.getItem("hhmm") || "";
  const username =
    localStorage.getItem("name") ||
    localStorage.getItem("username") ||
    localStorage.getItem("email") ||
    String(userId || "");
  const phone = localStorage.getItem("phone") || "-";
  const effectiveUserId = userId || Number(localStorage.getItem("userId")) || null;

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

      if (!tripId) {
        notify("ยังโหลดรอบรถไม่เสร็จ", "error");
        return;
      }

      if (!effectiveUserId) {
        notify("กรุณาเข้าสู่ระบบใหม่อีกครั้ง", "error");
        return;
      }

      if (selected.length === 0) {
        notify("กรุณาเลือกที่นั่งก่อน", "error");
        return;
      }

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

      for (const seatId of bookingData.seats) {

        const holdMsg = await tcpRequest({
          type: "HOLD",
          tripId: bookingData.tripId,
          seat: seatId,
          userId: Number(userId),
        });

        if (holdMsg.type !== "HOLD_OK") {
          notify(`จองที่นั่ง ${seatId} ไม่สำเร็จ: ${holdMsg.code || holdMsg.message || "unknown"}`, "error");
          return;
        }

        holdTokensRef.current[seatId] = holdMsg.holdToken;
      }

      const bookingRes = await tcpRequest({
        type: "CREATE_BOOKING",
        tripId: bookingData.tripId,
        seats: bookingData.seats,
        totalPriceBaht: bookingData.price,
        holdTokens: holdTokensRef.current,
        userId: Number(userId),
      });

      if (bookingRes.type !== "CREATE_BOOKING_OK") {
        notify(`สร้าง booking ไม่สำเร็จ: ${bookingRes.code || bookingRes.message || "unknown"}`, "error");
        return;
      }

      const paymentRes = await tcpRequest({
        type: "PAYMENT_CREATE_PROMPTPAY",
        bookingId: bookingRes.bookingId,
        userId: Number(userId),
      });

      if (paymentRes.type !== "PAYMENT_QR") {
        notify(paymentRes.code || "สร้าง QR payment ไม่สำเร็จ", "error");
        return;
      }

      setShowSummary(false);

      openPaymentPage({
        bookingId: bookingRes.bookingId,
        qrUri: paymentRes.qrUri || "",
        amountBaht: paymentRes.amountBaht || bookingData.price,
        seats: bookingData.seats,
        dest: bookingData.dest,
        hhmm: bookingData.hhmm,
        username: bookingData.username,
        phone: bookingData.phone,
      });

      tcpSend({ type: "LIST_SEATS", tripId: bookingData.tripId });

    } catch (e) {
      console.error("handleSummaryConfirm ERROR:", e);
      notify("เชื่อมต่อผิดพลาด กรุณาลองใหม่", "error");
    } finally {
      setCreatingBooking(false);
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
  };

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
    </div>
  );
}