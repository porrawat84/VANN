import { useEffect, useMemo, useState } from "react";
import Signin from "./Signin";
import Signup from "./Signup";
import Location from "./Location";
import Time from "./Time";
import Seat from "./Seat";

function ensureSessionUserId() {
  const key = "sessionUserId";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = `guest-${Date.now()}`;
  localStorage.setItem(key, generated);
  return generated;
}

export default function App() {
  const [page, setPage] = useState("signin");

  const [tcpConnected, setTcpConnected] = useState(false);
  const [todayTrips, setTodayTrips] = useState([]);     // มาจาก server (Bangkok time)
  const [seats, setSeats] = useState({});               // seat map ล่าสุด
  const [selectedTripId, setSelectedTripId] = useState(null);

  const userId = useMemo(() => ensureSessionUserId(), []);

  const dest = localStorage.getItem("dest") || "FP";
  const hhmm = localStorage.getItem("hhmm") || "1000";
  const found = todayTrips.find((t) => t.dest === dest && t.hhmm === hhmm);


  // 1) connect + listen messages
  useEffect(() => {
    if (!window.tcp) return;

    const onMsg = (msg) => {
      console.log("FROM TCP:", msg);

      if (msg.type === "TCP_CONNECTED") {
        setTcpConnected(true);
        window.tcp.send({ type: "HELLO", userId, role: "USER" });
        window.tcp.send({ type: "GET_TODAY_TRIPS" });
      }

      if (msg.type === "TODAY_TRIPS") {
        setTodayTrips(msg.trips || []);
      }

      if (msg.type === "SEATS") {
        setSeats(msg.seats || {});
      }

      if (msg.type === "EVENT_SEAT_UPDATE") {
        setSeats((prev) => ({ ...prev, [msg.seat]: msg.status }));
      }
    };

    // ถ้า preload ของคุณยังไม่มี off() ก็ใช้แบบนี้ไปก่อน
    window.tcp.onMessage(onMsg);

    // เผื่อบางครั้ง server ส่ง TCP_CONNECTED ไปแล้ว:
    // ขอ trips ซ้ำได้ ไม่เสียหาย
    window.tcp.send({ type: "GET_TODAY_TRIPS" });
  }, [userId]);

  // helper: สร้าง tripId จาก "วันนี้ของ server"
  function computeTripIdFromSelection() {
   const dest = localStorage.getItem("dest") || "FP";

    const time = localStorage.getItem("time");

    const hhmm = normalizeTimeToHHMM(time);

    const found = todayTrips.find((t) => t.dest === dest && t.hhmm === hhmm);
    return found?.tripId || null;
  }

  // 2) เวลาไปหน้า seat ให้ subscribe + list seats ตามที่เลือก
  useEffect(() => {
    if (!window.tcp) return;
    if (!tcpConnected) return;
    if (page !== "seat") return;

    const tripId = computeTripIdFromSelection();
    if (!tripId) {
      console.log("TripId not ready yet (maybe TODAY_TRIPS not loaded).");
      return;
    }

    setSelectedTripId(tripId);
    window.tcp.send({ type: "SUBSCRIBE_TRIP", tripId });
    window.tcp.send({ type: "LIST_SEATS", tripId });
  }, [page, tcpConnected, todayTrips]);

  const goTo = (nextPage) => setPage(nextPage);

  const pages = {
    signin: (
      <Signin
        goNext={() => goTo("location")}
        goSignup={() => goTo("signup")}
      />
    ),

    signup: (
      <Signup
        goNext={() => goTo("signin")}
      />
    ),

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
        // ส่ง state ให้ Seat ใช้เลย (ไม่ต้องต่อ tcp ใน Seat ซ้ำ)
        seats={seats}
        tripId={selectedTripId}
      />
    ),
  };

  return pages[page] || <div>Page not found</div>;
}
