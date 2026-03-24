import { useRef, useState } from "react";
import "./cssSeat.css";
import bg from "./assets/image/background.png";

export default function Seat({ goBack, seats, tripId, userId, tcpRequest }) {
  const [selected, setSelected] = useState([]);
  const holdTokensRef = useRef({});
  const [showSummary, setShowSummary] = useState(false);
  const [bookingData, setBookingData] = useState(null);

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

  const handleConfirm = async () => {
    if (!tripId) return alert("ยังโหลดรอบรถไม่เสร็จ");
    if (!userId) return alert("กรุณาเข้าสู่ระบบ");
    if (selected.length === 0) return;

    try {
      // HOLD
      for (const seatId of selected) {
        const holdMsg = await tcpRequest({
          type: "HOLD",
          tripId,
          seat: seatId,
          userId: Number(userId),
        });

        if (holdMsg.type !== "HOLD_OK") {
          alert("HOLD ไม่สำเร็จ");
          return;
        }
        holdTokensRef.current[seatId] = holdMsg.holdToken;
      }

      // CONFIRM
      for (const seatId of selected) {
        const confirmMsg = await tcpRequest({
          type: "CONFIRM",
          tripId,
          holdToken: holdTokensRef.current[seatId],
          userId: Number(userId),
        });

        if (confirmMsg.type !== "CONFIRM_OK") {
          alert("CONFIRM ไม่สำเร็จ");
          return;
        }
      }

      // ✅ clone array กัน state เพี้ยน
      const seatsCopy = [...selected];

      setBookingData({
        username: userId,
        seats: seatsCopy,
        time: "11:00 am",
        phone: "099-999-9999",
        destination: "future park rangsit",
        price: seatsCopy.length * 20,
      });

      setShowSummary(true);

      tcpSend({ type: "LIST_SEATS", tripId });

    } catch (e) {
      console.error(e);
      alert("เชื่อมต่อผิดพลาด");
    }
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

  const closeModal = () => {
    setShowSummary(false);
    setSelected([]);
    holdTokensRef.current = {};
  };

  return (
    <div className="app" style={{
      backgroundImage: `url(${bg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
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

        <button className="confirm" onClick={handleConfirm}>
          Confirm ({selected.length})
        </button>
      </div>

      {/* 🔥 MODAL */}
      {showSummary && bookingData && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close" onClick={closeModal}>✕</button>

            <h2>information</h2>

            <p><b>username :</b> {bookingData.username}</p>
            <p><b>seat :</b> {bookingData.seats.join(", ")}</p>
            <p><b>time :</b> {bookingData.time}</p>
            <p><b>phone :</b> {bookingData.phone}</p>
            <p><b>destination :</b> {bookingData.destination}</p>
            <p><b>price :</b> {bookingData.price} baht</p>

            <button className="confirm-btn" onClick={closeModal}>
              confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 