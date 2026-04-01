import { useEffect, useRef, useState } from "react";
import "./cssSeat.css";
import "./cssPayment.css";
import bg from "./assets/image/background.png";
import Payment from "./Payment";

function getSeatPrice(dest) {
  if (dest === "FP") return 20;
  if (dest === "MC") return 40;
  if (dest === "VM") return 43;
  return 0;
}

function getDestLabel(dest) {
  if (dest === "FP") return "future park rangsit";
  if (dest === "MC") return "mo chit";
  if (dest === "VM") return "victory monument";
  return "-";
}

function getTimeLabel(hhmm) {
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

export default function Seat({ goBack, seats, tripId, userId, tcpRequest }) {
  const [selected, setSelected] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentQrUri, setPaymentQrUri] = useState("");
  const [paymentAmountBaht, setPaymentAmountBaht] = useState(0);
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(600);

  const holdTokensRef = useRef({});
  const paymentTimerRef = useRef(null);

  const dest = localStorage.getItem("dest") || "";
  const hhmm = localStorage.getItem("hhmm") || "";
  const username =
    localStorage.getItem("name") ||
    localStorage.getItem("username") ||
    localStorage.getItem("email") ||
    String(userId || "");
  const phone = localStorage.getItem("phone") || "-";

  const tcpSend = (packet) => {
    if (!window.tcp) return;
    window.tcp.send(packet);
  };

  const isReserved = (seatId) => {
    const st = seats?.[seatId];
    return st === "BOOKED" || st === "HELD";
  };

  const toggleSeat = (seatId) => {
    if (!tripId) return alert("ยังโหลดรอบรถไม่เสร็จ");
    if (isReserved(seatId)) return;

    setSelected((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : [...prev, seatId]
    );
  };

  const openSummary = () => {
    if (!tripId) return alert("ยังโหลดรอบรถไม่เสร็จ");
    if (!userId) return alert("กรุณาเข้าสู่ระบบ");
    if (selected.length === 0) return;

    const seatPrice = getSeatPrice(dest);
    const seatsCopy = [...selected];

    setBookingData({
      username,
      seats: seatsCopy,
      time: getTimeLabel(hhmm),
      phone,
      destination: getDestLabel(dest),
      price: seatPrice * seatsCopy.length,
      tripId,
      hhmm,
      dest,
    });

    setShowSummary(true);
  };

  const handleSummaryConfirm = async () => {
    if (!bookingData) return;

    try {
      setCreatingPayment(true);

      for (const seatId of bookingData.seats) {
        const holdMsg = await tcpRequest({
          type: "HOLD",
          tripId: bookingData.tripId,
          seat: seatId,
          userId: Number(userId),
        });

        if (holdMsg.type !== "HOLD_OK") {
          alert(`HOLD ไม่สำเร็จ: ${seatId}`);
          return;
        }

        holdTokensRef.current[seatId] = holdMsg.holdToken;
      }

      for (const seatId of bookingData.seats) {
        const confirmMsg = await tcpRequest({
          type: "CONFIRM",
          tripId: bookingData.tripId,
          holdToken: holdTokensRef.current[seatId],
          userId: Number(userId),
        });

        if (confirmMsg.type !== "CONFIRM_OK") {
          alert(`CONFIRM ไม่สำเร็จ: ${seatId}`);
          return;
        }
      }

      const bookingRes = await tcpRequest({
        type: "CREATE_BOOKING",
        tripId: bookingData.tripId,
        seats: bookingData.seats,
        totalPriceBaht: bookingData.price,
        userId: Number(userId),
      });

      if (bookingRes.type !== "CREATE_BOOKING_OK") {
        alert("สร้าง booking ไม่สำเร็จ");
        return;
      }

      const paymentRes = await tcpRequest({
        type: "PAYMENT_CREATE_PROMPTPAY",
        bookingId: bookingRes.bookingId,
        userId: Number(userId),
      });

      if (paymentRes.type !== "PAYMENT_QR") {
        alert("สร้าง QR payment ไม่สำเร็จ");
        return;
      }

      setPaymentQrUri(paymentRes.qrUri || "");
      setPaymentAmountBaht(bookingData.price);
      setShowSummary(false);
      setShowPayment(true);
      setPaymentSecondsLeft(600);

      if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = setInterval(() => {
        setPaymentSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(paymentTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      tcpSend({ type: "LIST_SEATS", tripId: bookingData.tripId });
    } catch (e) {
      console.error(e);
      alert("เชื่อมต่อผิดพลาด");
    } finally {
      setCreatingPayment(false);
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
  };

  const closePayment = () => {
    setShowPayment(false);
    setSelected([]);
    setBookingData(null);
    holdTokensRef.current = {};

    if (paymentTimerRef.current) {
      clearInterval(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (paymentTimerRef.current) {
        clearInterval(paymentTimerRef.current);
      }
    };
  }, []);

  const SeatBox = ({ num }) => {
    const reserved = isReserved(num);
    const chosen = selected.includes(num);

    return (
      <div
        className={`seat ${reserved ? "reserved" : ""} ${chosen ? "selected" : ""}`}
        onClick={() => toggleSeat(num)}
      >
        {num}
      </div>
    );
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <button className="back-btn" onClick={goBack}>←</button>

      <div className="seat-card">
        <h2>Choose Seat</h2>

        <div className="legend">
          <div className="seat example">Available</div>
          <div className="seat example selected">Selected</div>
          <div className="seat example reserved">Reserved</div>
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

        <button className="confirm" onClick={openSummary}>
          Confirm ({selected.length})
        </button>
      </div>

      {showSummary && bookingData && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close" onClick={closeSummary}>✕</button>

            <h2>information</h2>

            <p><b>username :</b> {bookingData.username}</p>
            <p><b>seat :</b> {bookingData.seats.join(", ")}</p>
            <p><b>time :</b> {bookingData.time}</p>
            <p><b>phone :</b> {bookingData.phone}</p>
            <p><b>destination :</b> {bookingData.destination}</p>
            <p><b>price :</b> {bookingData.price} baht</p>

            <button className="confirm-btn" onClick={handleSummaryConfirm} disabled={creatingPayment}>
              {creatingPayment ? "loading..." : "confirm"}
            </button>
          </div>
        </div>
      )}

      <Payment
        open={showPayment}
        onClose={closePayment}
        qrUri={paymentQrUri}
        amountBaht={paymentAmountBaht}
        secondsLeft={paymentSecondsLeft}
        seats={bookingData?.seats || []}
        dest={bookingData?.dest || dest}
        hhmm={bookingData?.hhmm || hhmm}
        username={bookingData?.username || username}
        phone={bookingData?.phone || phone}
      />
    </div>
  );
}