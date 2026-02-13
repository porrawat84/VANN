import { useState } from "react";
import "./cssSeat.css";
import bg from "./assets/image/background.png";


function Seat({ goBack }) {


  const [selected, setSelected] = useState([]);
  const reservedSeats = ["B2", "D3"]; // 🔥 ตัวอย่างที่จองแล้ว

  const toggleSeat = (num) => {
    if (reservedSeats.includes(num)) return; // 🚫 กดไม่ได้ถ้าจองแล้ว

    if (selected.includes(num)) {
      setSelected(selected.filter((s) => s !== num));
    } else {
      setSelected([...selected, num]);
    }
  };

  const SeatBox = ({ num }) => {
    const isReserved = reservedSeats.includes(num);
    const isSelected = selected.includes(num);

    return (
      <div
        className={`seat 
          ${isReserved ? "reserved" : ""}
          ${isSelected ? "selected" : ""}
        `}
        onClick={() => toggleSeat(num)}
      >
        {num}
      </div>
    );
  };

  return (
    <div className="app" style={{ backgroundImage: `url(${bg})` }}>
        <button className="back-btn" onClick={goBack}>
  ←
</button>
      <div className="seat-card">
        <h2>Choose Seat</h2>

        {/* 🔥 Legend */}
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

        <button className="confirm">
          Confirm ({selected.length})
        </button>
      </div>
    </div>
  );
}

export default Seat;
