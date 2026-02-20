import { useEffect, useRef, useState } from "react";
import "./cssSeat.css";
import bg from "./assets/image/background.png";

export default function Seat({ goBack, seats, tripId, userId, tcpRequest }) {
  const [selected, setSelected] = useState([]);
  const holdTokensRef = useRef({}); // seatId -> holdToken

  // --- simple message bus (กัน listener leak)
  const listenersRef = useRef(new Set());

  useEffect(() => {
    if (!window.tcp) return;

    const handler = (msg) => {
      for (const fn of listenersRef.current) fn(msg);
    };

    window.tcp.onMessage(handler);
    return () => {
      listenersRef.current.clear();
    };
  }, []);

  const tcpSend = (packet) => {
    if (!window.tcp) return;
    window.tcp.send(packet);
  };

  const isReserved = (seatId) => {
    const st = seats?.[seatId];
    return st === "BOOKED" || st === "HELD";
  };

  const toggleSeat = (seatId) => {
    if (!tripId) {
      alert("ยังโหลดรอบรถไม่เสร็จ ลองรอสักครู่");
      return;
    }
    if (isReserved(seatId)) return;

    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const handleConfirm = async () => {
    if (!tripId) {
      alert("ยังโหลดรอบรถไม่เสร็จ ลองรอสักครู่แล้วเข้าหน้านี้ใหม่");
      return;
    }
    if (!userId || Number.isNaN(Number(userId))) {
      alert("กรุณาเข้าสู่ระบบก่อนจองที่นั่ง");
      return;
    }

    if (selected.length === 0) return;

    console.log("BOOKING tripId =", tripId, "selected =", selected);

    try {
      // 1) HOLD ทีละที่นั่ง (รอผลของ seat นั้นจริงๆ)
      for (const seatId of selected) {
        const holdMsg = await tcpRequest({ type:"HOLD", tripId, seat: seatId, userId: Number(userId) });

        if (holdMsg.type !== "HOLD_OK") {
          alert(`HOLD ไม่สำเร็จ: ${holdMsg.code || holdMsg.message}`);
          await tcpRequest({ type: "LIST_SEATS", tripId });
          return;
        }
        holdTokensRef.current[seatId] = holdMsg.holdToken;
      }

      // 2) CONFIRM ทีละที่นั่ง (รอให้ตรง seat ด้วย)
      for (const seatId of selected) {
        const holdToken = holdTokensRef.current[seatId];

        const confirmMsg = await tcpRequest({ type:"CONFIRM", tripId, holdToken: holdTokensRef.current[seatId], userId: Number(userId) });

        if (confirmMsg.type !== "CONFIRM_OK") {
          alert(`CONFIRM ไม่สำเร็จ: ${confirmMsg.code || confirmMsg.message}`);
          await tcpRequest({ type: "LIST_SEATS", tripId });
          return;
        }
      }

      alert(`จองสำเร็จ ✅ (${selected.join(", ")})`);
      setSelected([]);
      holdTokensRef.current = {};
      tcpSend({ type: "LIST_SEATS", tripId });
    } catch (e) {
      console.error(e);
      alert("เชื่อมต่อช้า/timeout ลองใหม่อีกครั้ง");
      tcpSend({ type: "LIST_SEATS", tripId });
    }
  };

  const SeatBox = ({ num }) => {
    const reserved = isReserved(num);
    const chosen = selected.includes(num);

    return (
      <div
        className={`seat ${reserved ? "reserved" : ""} ${chosen ? "selected" : ""}`}
        onClick={() => toggleSeat(num)}
        title={seats?.[num] || "UNKNOWN"}
      >
        {num}
      </div>
    );
  };

  return (
    <div className="app" style={{ backgroundImage: `url(${bg})` }}>
      <button className="back-btn" onClick={goBack}>←</button>

      <div className="seat-card">
        <h2>Choose Seat</h2>

        <div className="legend">
          <div className="seat example"> Available</div>
          <div className="seat example selected"> Selected</div>
          <div className="seat example reserved"> Reserved</div>
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

        <button className="confirm" onClick={handleConfirm} disabled={!tripId}>
          Confirm ({selected.length})
        </button>

        <div style={{ marginTop: 10, fontSize: 12 }}>
          tripId: {tripId || "(loading...)"}
        </div>
      </div>
    </div>
  );
}
