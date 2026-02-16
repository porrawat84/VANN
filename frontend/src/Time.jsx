import "./cssTime.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";
import { useState } from "react";

function Time({ goBack, goNext }) {
  const location = localStorage.getItem("location");
  const [selectedTime, setSelectedTime] = useState(null);

  const handleSelect = (time) => {
    setSelectedTime(time);
    localStorage.setItem("time", time);
  };

  return (
    <div
      className="app"
      style={{ backgroundImage: `url(${bg})` }}
    >

      <button className="back-fixed" onClick={goBack}>
    ← 
  </button>

      <div className="content time">
        {/* ปุ่มย้อนกลับบนสุด */}
        

        <h2>location</h2>
        <div className="pill">{location}</div>

        <h2>time schedule</h2>

        <div className="times">
          {[
            "10:00 am",
            "11:00 am",
            "12:00 pm",
            "1:00 pm",
            "2:00 pm",
            "3:00 pm",
            "4:00 pm",
            "5:00 pm",
          ].map((t) => (
            <button
              key={t}
              className={`time-btn ${
                selectedTime === t ? "selected" : ""
              }`}
              onClick={() => handleSelect(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {selectedTime && (
          <button
            className="confirm-btn"
            onClick={goNext}
          >
            confirm time
          </button>
        )}
      </div>
    </div>
  );
}

export default Time;
