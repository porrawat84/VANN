import { useEffect, useRef, useState } from "react";
import Signin from "./Signin";
import Signup from "./Signup";
import Location from "./Location";
import Time from "./Time";
import Seat from "./Seat";
import Forgetpass from "./Forgetpass";
import UserBottomNav from './UserBottomNav';

import AdminBottomNav from "./Admin/BottomNav";
import AdminHome from "./Admin/Home";
import AdminLocation from "./Admin/Location";
import Dataseat from "./Admin/Dataseat";
import AdminDashboardChat from "./Admin/DashboardChat";
import AdminChatRoom from "./Admin/ChatRoom";
import AdminProfile from "./Admin/Profile";

function bangkokYMD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}${m}${d}`;
}

export default function App() {
  const pendingRef = useRef(new Map());
  const toastTimerRef = useRef(null);

  const tcpRequest = (packet, timeoutMs = 6000) => {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        pendingRef.current.delete(requestId);
        reject(new Error("timeout"));
      }, timeoutMs);

      pendingRef.current.set(requestId, (msg) => {
        clearTimeout(t);
        pendingRef.current.delete(requestId);
        resolve(msg);
      });

      window.tcp.send({ ...packet, requestId });
    });
  };

  const [page, setPage] = useState("signin");

  const [connected, setConnected] = useState(false);
  const [todayTrips, setTodayTrips] = useState([]);
  const [seats, setSeats] = useState({});
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [authUserId, setAuthUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(() => {
    const s = localStorage.getItem("userId");
    return s ? Number(s) : null;
  });

  const notify = (message, type = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    const nextToast = {
      id: Date.now(),
      message,
      type,
    };

    setToast(nextToast);
    toastTimerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === nextToast.id ? null : current));
      toastTimerRef.current = null;
    }, 3500);
  };

  const computeTripIdFromSelection = () => {
    const dest = localStorage.getItem("dest") || "FP";
    const hhmm = localStorage.getItem("hhmm") || "1000";

    // ใช้จาก server ก่อน
    const found = todayTrips.find((t) => t.dest === dest && t.hhmm === hhmm);
    if (found?.tripId) return found.tripId;

    // fallback สร้างเอง
    return `${bangkokYMD()}_${dest}_${hhmm}`;
  };

  const didInit = useRef(false);
  const didHello = useRef(false);

  useEffect(() => {
    if (!window.tcp) return;

    if (didInit.current) return;
    didInit.current = true;

    window.tcp.offAllMessages?.();

    const handler = (msg) => {
      console.log("TCP message from server:", msg);

      if (msg.type === "ERROR") {
        console.error("Server error:", msg);
        notify(msg.message || msg.code || "server error", "error");
        return;
      }
      const cb = msg.requestId && pendingRef.current.get(msg.requestId);
      if (cb) return cb(msg);

      if (msg.type === "TODAY_TRIPS") setTodayTrips(msg.trips || []);
      if (msg.type === "SEATS") setSeats(msg.seats || {});
      if (msg.type === "EVENT_SEAT_UPDATE") {
        setSeats((prev) => ({ ...prev, [msg.seat]: msg.status }));
      }

      if (msg.type === "SIGN_IN_OK" || msg.type === "SIGN_UP_OK") {
        const id = Number(msg.userId);
        setUserId(id);

        localStorage.setItem("userId", String(id));
        localStorage.setItem("role", msg.role || "USER");

        if (!didHello.current) {
          didHello.current = true;
          window.tcp.send({ type: "HELLO", userId: id, role: msg.role || "USER" });
        }

        if (msg.role === "ADMIN") {
          setPage("admin");
        } else {
          setPage("location");
        }
      }

      if (msg.type === "SIGN_IN_FAIL") {
        notify("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "error");
      }
      if (msg.type === "HELLO_OK") setConnected(true);
      if (msg.type === "HELLO_FAIL") console.log("HELLO_FAIL:", msg.code);
    };

    const unsubscribe = window.tcp.onMessage(handler);
    // ขอ trips
    window.tcp.send({ type: "GET_TODAY_TRIPS" });

    // ถ้ามี userId ค้างไว้ ค่อย HELLO
    //const stored = localStorage.getItem("userId");
    //const uid = stored ? Number(stored) : null;
    //if (Number.isFinite(uid) && !didHello.current) {
      //didHello.current = true;
      //const role = localStorage.getItem("role") || "USER";
      //window.tcp.send({ type: "HELLO", userId: uid, role });
    //}

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!window.tcp) return;
    if (page !== "seat") return;

    const tripId = computeTripIdFromSelection();
    console.log("SELECTED tripId =", tripId);

    setSelectedTripId(tripId);
    window.tcp.send({ type: "SUBSCRIBE_TRIP", tripId });
    window.tcp.send({ type: "LIST_SEATS", tripId });
  }, [page]);

  const [selectedChat, setSelectedChat] = useState(null);

  const goTo = (nextPage, data = null) => {
    if (data) setSelectedChat(data);   // 🔥 เก็บตรงนี้ก็ได้
    setPage(nextPage);
  };

  const [unreadMap, setUnreadMap] = useState({
    1: 2,
    2: 1,
  });

  const pages = {
    signin: <Signin notify={notify}
      goSignup={() => goTo("signup")}
      goForget={() => goTo("forgetpass")}
      goLocation={() => goTo("location")}
      goAdmin={() => goTo("adminHome")} />,

    signup: <Signup goNext={() => goTo("signin")}
      notify={notify}
      goBack={() => goTo("signin")} />,

    forgetpass: <Forgetpass goBack={() => goTo("signin")} notify={notify} />,

    location: <Location goNext={() => goTo("time")} />,

    time: <Time goBack={() => goTo("location")} goNext={() => goTo("seat")} />,

    seat: (
      <Seat
        goBack={() => goTo("time")}
        seats={seats}
        tripId={selectedTripId}
        userId={userId}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),

    //Admin
    adminHome: <AdminHome goPage={goTo} />,
    adminLocation: <AdminLocation goPage={goTo} />,
    dataseat: <Dataseat goPage={goTo} />,

    adminDashboardChat: (
      <AdminDashboardChat
        goChat={(chat) => {
          setSelectedChat(chat);

          // 🔥 ล้าง unread
          setUnreadMap((prev) => ({
            ...prev,
            [chat.id]: 0,
          }));

          goTo("adminChatRoom");
        }}
        goPage={goTo}
        unreadMap={unreadMap}
      />
    ),

    adminChatRoom: (
      <AdminChatRoom
        goPage={goTo}
        goBack={() => goTo("adminDashboardChat")}
        chat={selectedChat}
        userId={userId}
      />
    ),

    adminProfile: <AdminProfile goPage={goTo} />,

  };

  return (
    <>
      {pages[page] || <div>Page not found</div>}

      

      {toast && (
        <div className={`app-toast app-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </>
  );
}
