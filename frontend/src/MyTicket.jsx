import { useEffect, useState } from "react";
import "./cssMyTicket.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";
import UserBottomNav from "./UserBottomNav";

function formatDest(dest) {
  if (dest === "FP") return "future park rangsit";
  if (dest === "MC") return "mo chit";
  if (dest === "VM") return "victory monument";
  return dest || "-";
}

function formatTripTime(hhmm) {
  const map = {
    "1000": "10:00 am",
    "1100": "11:00 am",
    "1200": "12:00 pm",
    "1300": "1:00 pm",
    "1400": "2:00 pm",
    "1500": "3:00 pm",
    "1600": "4:00 pm",
    "1700": "5:00 pm",
  };
  return map[hhmm] || hhmm || "-";
}

function formatBookingDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  const dd = d.getDate();
  const mm = d.toLocaleString("en-GB", { month: "short" }).toLowerCase();
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd} ${mm} ${yy}`;
}

function parseTripId(tripId) {
  if (!tripId) {
    return { dest: "-", hhmm: "-" };
  }

  const parts = String(tripId).split("_");
  return {
    dest: parts[1] || "-",
    hhmm: parts[2] || "-",
  };
}

function isExpired(bookingDate, minutes = 10) {
  if (!bookingDate) return false;
  const created = new Date(bookingDate).getTime();
  const now = Date.now();
  return now - created > minutes * 60 * 1000;
}

function mapStatus(status, bookingDate) {
  if (status === "CONFIRMED") {
    return { label: "success", className: "success", clickable: false };
  }

  if (status === "WAITING_VERIFY") {
    return { label: "waiting", className: "waiting", clickable: true };
  }

  if (status === "PENDING_PAYMENT") {
    if (isExpired(bookingDate)) {
      return { label: "expired", className: "expired", clickable: true };
    }
    return { label: "waiting", className: "waiting", clickable: true };
  }

  if (status === "PAYMENT_REJECTED") {
    return { label: "rejected", className: "rejected", clickable: false };
  }

  return {
    label: status?.toLowerCase?.() || "-",
    className: "default",
    clickable: false,
  };
}

export default function MyTicket({ goPage, tcpRequest, notify }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const buyerName =
    localStorage.getItem("name") ||
    localStorage.getItem("email") ||
    "guest";

  const loadTickets = async () => {
    try {
      setLoading(true);

      const res = await tcpRequest({
        type: "GET_BOOKINGS",
      });

      if (res.type !== "BOOKINGS") {
        notify?.(res.code || "โหลดตั๋วไม่สำเร็จ", "error");
        return;
      }

      setTickets(res.bookings || []);
    } catch (e) {
      console.error(e);
      notify?.("โหลดตั๋วไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleTicketClick = (ticket) => {
    if (ticket.status === "WAITING_VERIFY") {
      notify?.("ส่งสลิปแล้ว รอแอดมินตรวจสอบ", "info");
      return;
    }

    if (ticket.status === "PENDING_PAYMENT") {
      if (isExpired(ticket.booking_date)) {
        notify?.("จ่ายไม่ทันแล้ว กรุณาจองใหม่", "error");
        return;
      }

      localStorage.setItem("resumeBookingId", String(ticket.booking_id));
      goPage("payment");
      return;
    }

    if (ticket.status === "CONFIRMED") {
      notify?.("รายการนี้ยืนยันสำเร็จแล้ว", "info");
      return;
    }

    if (ticket.status === "PAYMENT_REJECTED") {
      notify?.("รายการนี้ถูกปฏิเสธการชำระเงิน", "error");
      return;
    }
  };

  return (
    <div
      className="myticket-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <img src={logo} alt="logo" className="myticket-logo" />

      <div className="myticket-card">
        <button className="myticket-close" onClick={() => goPage("location")}>
          ×
        </button>
        <div className="myticket-title">my ticket</div>

        <div className="myticket-list">
          {loading ? (
            <div className="ticket-item">loading...</div>
          ) : tickets.length === 0 ? (
            <div className="ticket-item">no tickets</div>
          ) : (
            tickets.map((ticket) => {
              const parsed = parseTripId(ticket.trip_id);
              const status = mapStatus(ticket.status, ticket.booking_date);

              return (
                <div
                  className={`ticket-item ${status.clickable ? "clickable" : ""}`}
                  key={ticket.booking_id}
                  onClick={() => handleTicketClick(ticket)}
                >
                  <div className="ticket-icon">🎫</div>

                  <div className="ticket-main">
                    <div className="ticket-dest">{formatDest(parsed.dest)}</div>
                    <div className="ticket-line">
                      buy date : {formatBookingDate(ticket.booking_date)}
                    </div>
                    <div className="ticket-line">
                      time : {formatTripTime(parsed.hhmm)}
                    </div>
                    <div className="ticket-line">
                      buyer : {buyerName}
                    </div>
                  </div>

                  <div className={`ticket-status ${status.className}`}>
                    {status.label}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <UserBottomNav goPage={goPage} currentPage="myticket" />
    </div>
  );
}