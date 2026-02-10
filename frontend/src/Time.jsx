import "./Time.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";
import { useState } from "react";

function Time() {
  const location = localStorage.getItem("location");
  const [selectedTime, setSelectedTime] = useState(null);

  const handleSelect = (time) => {
    setSelectedTime(time);
    localStorage.setItem("time", time);
  };

  const goNext = () => {
    window.location.href = "/seat";
  };

  return (
    <div className="app" style={{ backgroundImage: `url(${bg})` }}>
      <img src={logo} className="logo" />

      <div className="content">
        <h2>location</h2>
        <div className="pill">{location}</div>

        <h2>time schedule</h2>

        <div className="times">
          {["10:00 am", "10:30 am", "11:00 am", "11:30 am","12:00 am","12:30 am","13:00 pm","13:30 pm"].map((t) => (
            <button
              key={t}
              className={`time-btn ${selectedTime === t ? "selected" : ""}`}
              onClick={() => handleSelect(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {selectedTime && (
          <button className="back-btn" onClick={goNext}>
            back
          </button>
        )}
      </div>
    </div>
  );
}

export default Time;
