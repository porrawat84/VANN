import "./cssTime.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";
import { useState } from "react";

const TIME_OPTIONS = [
  { label: "10:00 am", hhmm: "1000" },
  { label: "11:00 am", hhmm: "1100" },
  { label: "12:00 pm", hhmm: "1200" },
  { label: "1:00 pm",  hhmm: "1300" },
  { label: "2:00 pm",  hhmm: "1400" },
  { label: "3:00 pm",  hhmm: "1500" },
  { label: "4:00 pm",  hhmm: "1600" },
  { label: "5:00 pm",  hhmm: "1700" },
];

function bangkokNow() {
  // ได้เวลาปัจจุบันแบบ Asia/Bangkok
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hh = Number(parts.find(p => p.type === "hour").value);
  const mm = Number(parts.find(p => p.type === "minute").value);
  return hh * 60 + mm; // นาทีตั้งแต่ 00:00
}

function hhmmToMinutes(hhmm) {
  const hh = Number(String(hhmm).slice(0, 2));
  const mm = Number(String(hhmm).slice(2, 4));
  return hh * 60 + mm;
}


function destLabel(dest) {
  if (dest === "FP") return "Future Park Rangsit";
  if (dest === "MC") return "Mo Chit";
  if (dest === "VM") return "Victory Monument";
  return "-";
}

function Time({ goBack, goNext }) {

  const dest = localStorage.getItem("dest"); //ใช้ dest code ที่เราปรับจาก Location แล้ว
  const [selectedHHMM, setSelectedHHMM] = useState(localStorage.getItem("hhmm") || null);

  const handleSelect = (hhmm) => {
    setSelectedHHMM(hhmm);
    localStorage.setItem("hhmm", hhmm); //เก็บเป็น 1000/1100...
  };

  const nowMin = bangkokNow();
  const CLOSE_BEFORE_MIN = 1;

  return (
    <div className="app" style={{ backgroundImage: `url(${bg})` }}>
      <button className="back-fixed" onClick={goBack}>←</button>

      <div className="content time">
        <h2>location</h2>
        <div className="pill">{destLabel(dest)}</div>

        <h2>time schedule</h2>

        <div className="times">
          {TIME_OPTIONS.map((t) => {
            const departMin = hhmmToMinutes(t.hhmm);
            const closed = nowMin >= (departMin - CLOSE_BEFORE_MIN);

            return (
              <button
                key={t.hhmm}
                disabled={closed}
                className={`time-btn ${selectedHHMM === t.hhmm ? "selected" : ""} ${closed ? "closed" : ""}`}
                onClick={() => !closed && handleSelect(t.hhmm)}
                title={closed ? "ปิดรับจองแล้ว" : ""}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {selectedHHMM && (
          <button className="confirm-btn" onClick={goNext}>
            confirm time
          </button>
        )}
      </div>
    </div>
  );
}

export default Time;
