import { useEffect, useState } from "react";
import Location from "./Location";
import Time from "./Time";
import Seat from "./Seat";
// import Payment from "./Payment";
// import Success from "./Success";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function mapLocationToDestCode(location) {
  const value = String(location || "").trim().toLowerCase();
  if (value.includes("future")) return "FP";
  if (value.includes("mo chit") || value.includes("หมอชิต")) return "MC";
  if (value.includes("victory") || value.includes("อนุสาวรีย์")) return "VM";
  return "FP";
}

function normalizeTimeToHHMM(timeLabel) {
  const value = String(timeLabel || "").trim().toLowerCase();
  const map = {
    "10:00 am": "1000",
    "11:00 am": "1100",
    "12:00 pm": "1200",
    "1:00 pm": "1300",
    "2:00 pm": "1400",
    "3:00 pm": "1500",
    "4:00 pm": "1600",
    "5:00 pm": "1700",
  };
  return map[value] || "1000";
}

function ensureSessionUserId() {
  const key = "sessionUserId";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const generated = `guest-${Date.now()}`;
  localStorage.setItem(key, generated);
  return generated;
}

function App() {
  const [page, setPage] = useState("location");

  useEffect(() => {
    if (!window.tcp) return;

    const userId = ensureSessionUserId();
    const location = localStorage.getItem("location");
    const time = localStorage.getItem("time");

    const tripId = `${todayYMD()}_${mapLocationToDestCode(location)}_${normalizeTimeToHHMM(time)}`;

    window.tcp.onMessage((msg) => {
      console.log("FROM TCP:", msg);
    });

    window.tcp.send({ type: "HELLO", userId, role: "USER" });
    window.tcp.send({ type: "SUBSCRIBE_TRIP", tripId });
    window.tcp.send({ type: "LIST_SEATS", tripId });
  }, []);

  const goTo = (nextPage) => {
    setPage(nextPage);
  };

  const pages = {
    location: (
      <Location
        goNext={() => goTo("time")}
      />
    ),

    time: (
      <Time
        goBack={() => goTo("location")}
        goNext={() => goTo("seat")}
      />
    ),

    seat: (
      <Seat
        goBack={() => goTo("time")}
        goNext={() => goTo("payment")}
      />
    ),

    // payment: (
    //   <Payment
    //     goBack={() => goTo("seat")}
    //     goNext={() => goTo("success")}
    //   />
    // ),

    // success: <Success />
  };

  return pages[page] || <div>Page not found</div>;
}

export default App;
