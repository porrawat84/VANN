import { useEffect, useRef, useState } from "react";
import Signin from "./Signin";
import Signup from "./Signup";
import Location from "./Location";
import Time from "./Time";
import Seat from "./Seat";
import Forgetpass from "./Forgetpass";
import ResetPassword from "./ResetPassword";
import UserBottomNav from './UserBottomNav';
import Payment from "./Payment";
import UserChat from "./UserChat";
import Profile from "./Profile";
import MyTicket from "./MyTicket";

import AdminBottomNav from "./Admin/BottomNav";
import AdminHome from "./Admin/Home";
import AdminLocation from "./Admin/AdminLocation";
import Dataseat from "./Admin/Dataseat";
import AdminDashboardChat from "./Admin/DashboardChat";
import AdminChatRoom from "./Admin/ChatRoom";
import AdminProfile from "./Admin/AdminProfile";
import AdminPayments from "./Admin/AdminPayments";
import DashboardChat from "./Admin/DashboardChat";
import ChatRoom from "./Admin/ChatRoom";

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

  const tcpRequest = (packet, timeoutMs = 15000) => {
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
  const [resetEmail, setResetEmail] = useState("");

  const [paymentPageData, setPaymentPageData] = useState(null);
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

  //const didInit = useRef(false);
  const didHello = useRef(false);
  //if (didInit.current) return;อยู่ในuseEffect
  //didInit.current = true;อยู่ในuseEffect

  //window.tcp.offAllMessages?.();
  useEffect(() => {
    if (!window.tcp?.onMessage) {
      console.error("window.tcp.onMessage not available");
      return;
    }

    console.log("App listener attached");

    const handler = (msg) => {
      console.log("TCP message from server:", msg);

      if (msg.type === "IPC_TEST") {
        console.log("Renderer got IPC_TEST:", msg);
        return;
      }

      const cb = msg.requestId && pendingRef.current.get(msg.requestId);
      if (cb) return cb(msg);

      if (msg.type === "ERROR") {
        console.error("Server error:", msg);
        notify(msg.message || msg.code || "server error", "error");
        return;
      }

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
        if (msg.name) localStorage.setItem("name", msg.name);
        if (msg.phone) localStorage.setItem("phone", msg.phone);
        if (msg.email) localStorage.setItem("email", msg.email);

        window.tcp.send({ type: "HELLO", userId: id, role: msg.role || "USER" });

        if (msg.role === "ADMIN") {
          setPage("adminHome");
        } else {
          setPage("location");
        }
      }

      if (msg.type === "UPDATE_PROFILE_OK") {
        if (msg.name) localStorage.setItem("name", msg.name);
        if (msg.phone) localStorage.setItem("phone", msg.phone);
        if (msg.email) localStorage.setItem("email", msg.email);

        notify?.("บันทึกข้อมูลสำเร็จ", "info");
      }

      if (msg.type === "SIGN_IN_FAIL") {
        notify("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "error");
      }

      if (msg.type === "HELLO_OK") setConnected(true);
    };

    const unsubscribe = window.tcp.onMessage(handler);

    window.tcp.send({ type: "GET_TODAY_TRIPS" });

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
    if (data) setSelectedChat(data);
    setPage(nextPage);
  };

  const [unreadMap, setUnreadMap] = useState({
    1: 2,
    2: 1,
  });

  const openPaymentPage = (data) => {
    setPaymentPageData(data);
    setPage("payment");
  };

  const pages = {
    signin: <Signin notify={notify}
      goSignup={() => goTo("signup")}
      goForget={() => goTo("forgetpass")}
      goLocation={() => goTo("location")}
      goAdmin={() => goTo("adminHome")} />,

    signup: <Signup goNext={() => goTo("signin")}
      notify={notify}
      goBack={() => goTo("signin")} />,

    forgetpass: <Forgetpass
      goBack={() => goTo("signin")}
      goReset={(email) => { setResetEmail(email); goTo("resetpassword"); }}
      notify={notify}
      tcpRequest={tcpRequest}
    />,

    resetpassword: <ResetPassword
      email={resetEmail}
      goBack={() => goTo("forgetpass")}
      goLogin={() => goTo("signin")}
      notify={notify}
      tcpRequest={tcpRequest}
    />,

    location: <Location goNext={() => goTo("time")} goChat={() => goTo("userChat")} />,
    time: <Time goBack={() => goTo("location")} goNext={() => goTo("seat")} />,

    seat: (
      <Seat
        goBack={() => goTo("time")}
        seats={seats}
        tripId={selectedTripId}
        userId={userId}
        tcpRequest={tcpRequest}
        notify={notify}
        openPaymentPage={openPaymentPage}
      />
    ),

    payment: (
      <Payment
        data={paymentPageData}
        tcpRequest={tcpRequest}
        notify={notify}
        goBack={() => setPage("seat")}
        goDone={() => {
          setPaymentPageData(null);
          setPage("location");
        }}
      />
    ),

    userChat: (
      <UserChat
        goBack={() => goTo("location")}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),

    profile: (
      <Profile
        goPage={goTo}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),
    myticket: (
      <MyTicket
        goPage={goTo}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),


    //Admin
    adminHome: <AdminHome goPage={goTo} />,
    adminLocation: <AdminLocation goPage={goTo} />,
    dataseat: <Dataseat goPage={goTo} tcpRequest={tcpRequest} notify={notify} />,

    adminDashboardChat: (
      <AdminDashboardChat
        goChat={(chat) => {
          setSelectedChat(chat);
          goTo("adminChatRoom");
        }}
        goPage={goTo}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),

    adminChatRoom: (
      <AdminChatRoom
        goPage={goTo}
        goBack={() => goTo("adminDashboardChat")}
        chat={selectedChat}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),
    adminProfile: <AdminProfile goPage={goTo} />,

    adminPayments: (
      <AdminPayments
        goPage={goTo}
        tcpRequest={tcpRequest}
        notify={notify}
      />
    ),

  };

  return (
    <>
      {pages[page] || <div>Page not found</div>}

      {["location", "time", "seat", "userChat", "profile", "myticket"].includes(page) && (
        <UserBottomNav
          goPage={goTo}
          currentPage={page}
          chatUnread={0}
        />
      )}


      {toast && (
        <div className={`app-toast app-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </>
  );
}
