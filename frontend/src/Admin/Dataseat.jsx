import "./Dataseat.css";
import BottomNav from "./BottomNav";
import { useState, useEffect, useMemo } from "react";

const ALL_SEATS = [
    "A1", "A2",
    "B1", "B2", "B3",
    "C1", "C2", "C3",
    "D1", "D2", "D3",
    "E1", "E2", "E3",
];

function formatDest(dest) {
    if (dest === "FP") return "future park rangsit";
    if (dest === "MC") return "mo chit";
    if (dest === "VM") return "victory monument";
    return dest || "-";
}

function formatTimeLabel(hhmm) {
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
    return map[String(hhmm)] || String(hhmm || "-");
}

function timeLabelToHhmm(label) {
    const map = {
        "10:00": "1000",
        "11:00": "1100",
        "12:00": "1200",
        "13:00": "1300",
        "14:00": "1400",
        "15:00": "1500",
        "16:00": "1600",
        "17:00": "1700",
    };
    return map[label] || "1000";
}

function hhmmToTimeLabel(hhmm) {
    const map = {
        "1000": "10:00",
        "1100": "11:00",
        "1200": "12:00",
        "1300": "13:00",
        "1400": "14:00",
        "1500": "15:00",
        "1600": "16:00",
        "1700": "17:00",
    };
    return map[String(hhmm)] || "10:00";
}

function mapSeatRow(row) {
    const seatStatus = String(row?.seat_status || "").toUpperCase();
    const paymentStatus = String(row?.payment_status || "").toUpperCase();

    let status = "empty";
    if (paymentStatus === "WAITING_VERIFY" || seatStatus === "HELD") {
        status = "waiting";
    } else if (seatStatus === "BOOKED" || paymentStatus === "APPROVED") {
        status = "success";
    }

    return {
        id: row.seat_number,
        seatId: row.seat_id,
        name: row.name || "-",
        phone: row.phone || "-",
        price:
            row.total_price != null
                ? (
                    Number(row.total_price) /
                    100 /
                    Number(row.seat_count || 1)
                ).toFixed(2)
                : "-",
        total_price:
            row.total_price != null
                ? (Number(row.total_price) / 100).toFixed(2)
                : "-",
        seat_count: row.seat_count || 1,
        booked_seats: row.booked_seats || row.seat_number || "-",
        status,
        seat_status: row.seat_status || "FREE",
        payment_status: row.payment_status || null,
        payment_id: row.payment_id || null,
        booking_id: row.booking_id || null,
        trip_id: row.trip_id || null,
    };
}

export default function Dataseat({ goPage, tcpRequest, notify }) {
    const storedTripId = localStorage.getItem("adminTripId") || "";
    const storedTripHhmm = localStorage.getItem("adminTripHhmm") || "1000";
    const storedTripDest = localStorage.getItem("adminTripDest") || "FP";

    const [time, setTime] = useState(hhmmToTimeLabel(storedTripHhmm));
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [seats, setSeats] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);

    const destCode = localStorage.getItem("adminTripDest") || storedTripDest;
    const currentTripId = useMemo(() => {
        const datePart = storedTripId.split("_")[0] || new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const hhmm = timeLabelToHhmm(time);
        return `${datePart}_${destCode}_${hhmm}`;
    }, [storedTripId, destCode, time]);

    const loadSeats = async () => {
        try {
            setLoading(true);

            const res = await tcpRequest({
                type: "ADMIN_GET_SEATS",
                tripId: currentTripId,
            });

            if (res.type !== "ADMIN_GET_SEATS_OK") {
                notify?.(res.code || "โหลดที่นั่งไม่สำเร็จ", "error");
                return;
            }

            const rows = Array.isArray(res.seats) ? res.seats : [];

            const bySeat = new Map();
            for (const row of rows) {
                if (!row?.seat_number) continue;
                bySeat.set(row.seat_number, mapSeatRow(row));
            }

            const mapped = ALL_SEATS.map((seatNo) => {
                return (
                    bySeat.get(seatNo) || {
                        id: seatNo,
                        seatId: seatNo,
                        name: "-",
                        phone: "-",
                        price: "-",
                        status: "empty",
                        seat_status: "FREE",
                        payment_status: null,
                        payment_id: null,
                        trip_id: currentTripId,
                    }
                );
            });

            setSeats(mapped);
        } catch (e) {
            console.error(e);
            notify?.("โหลดที่นั่งไม่สำเร็จ", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSeats();
    }, [currentTripId]);

    const filteredSeats = seats.filter((s) => {
        if (filter === "all") return true;
        if (filter === "booked") return s.status === "success";
        if (filter === "available") return s.status === "empty";
        if (filter === "waiting") return s.status === "waiting";
        return true;
    });

    const getStatusText = (status) => {
        if (status === "success") return "success";
        if (status === "waiting") return "waiting";
        return"available";
    };

    const totalSeats = seats.length;
    const availableSeats = seats.filter((s) => s.status === "empty").length;
    const bookedSeats = seats.filter((s) => s.status === "success").length;
    const totalMoney = seats
        .filter((s) => s.status === "success" && s.price !== "-")
        .reduce((sum, s) => sum + Number(s.price || 0), 0)
        .toFixed(2);

    const openSlip = async (paymentId) => {
        if (!paymentId) {
            notify?.("ไม่มีสลิปของรายการนี้", "error");
            return;
        }

        try {
            const res = await tcpRequest({
                type: "ADMIN_GET_PAYMENT_SLIP",
                paymentId,
            });

            if (res.type !== "ADMIN_PAYMENT_SLIP") {
                notify?.(res.code || "เปิดสลิปไม่สำเร็จ", "error");
                return;
            }

            setSelectedSlip(res.dataUrl);
        } catch (e) {
            console.error(e);
            notify?.("เปิดสลิปไม่สำเร็จ", "error");
        }
    };

    const rejectPayment = async (bookingId) => {
        try {
            const res = await tcpRequest({
                type: "ADMIN_REJECT_PAYMENT",
                bookingId,
                reason: "manual reject by admin",
            });

            if (res.type !== "ADMIN_REJECT_PAYMENT_OK") {
                notify?.(res.code || "ปฏิเสธไม่สำเร็จ", "error");
                return;
            }

            notify?.("ปฏิเสธการชำระเงินแล้ว", "info");
            setSelectedPayment(null);
            setSelectedSlip(null);
            loadSeats();
        } catch (e) {
            console.error(e);
            notify?.("ปฏิเสธไม่สำเร็จ", "error");
        }
    };

    const approvePayment = async (bookingId) => {
        try {
            const res = await tcpRequest({
                type: "ADMIN_APPROVE_PAYMENT",
                bookingId,
            });

            if (res.type !== "ADMIN_APPROVE_PAYMENT_OK") {
                notify?.(res.code || "อนุมัติไม่สำเร็จ", "error");
                return;
            }

            notify?.("อนุมัติการชำระเงินแล้ว", "info");
            setSelectedPayment(null);
            setSelectedSlip(null);
            loadSeats();
        } catch (e) {
            console.error(e);
            notify?.("อนุมัติไม่สำเร็จ", "error");
        }
    };

    return (
        <div className="app">
            <button className="back-btn" onClick={() => goPage("adminLocation")}>
                ⬅
            </button>

            <div className="location-title">{formatDest(destCode)}</div>

            <div className="filter-box">
                <div>
                    Time :
                    <select value={time} onChange={(e) => setTime(e.target.value)}>
                        <option>10:00</option>
                        <option>11:00</option>
                        <option>12:00</option>
                        <option>13:00</option>
                        <option>14:00</option>
                        <option>15:00</option>
                        <option>16:00</option>
                        <option>17:00</option>
                    </select>
                </div>

                <div>
                    Seat :
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">all</option>
                        <option value="booked">booked</option>
                        <option value="available">available</option>
                        <option value="waiting">waiting</option>
                    </select>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="seat-table">
                    <thead>
                        <tr>
                            <th>seat</th>
                            <th>Information</th>
                            <th>status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>
                                    loading...
                                </td>
                            </tr>
                        ) : filteredSeats.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>
                                    no seats data
                                </td>
                            </tr>
                        ) : (
                            filteredSeats.map((s) => (
                                <tr key={s.id}>
                                    <td>{s.id}</td>

                                    <td>
                                        username : {s.name} <br />
                                        phone : {s.phone} <br />
                                        price : {s.price}
                                    </td>

                                    <td>
                                        <button
                                            className={`status ${s.status}`}
                                            disabled={s.status !== "waiting"}
                                            onClick={() => setSelectedPayment(s)}
                                        >
                                            {getStatusText(s.status)}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedSlip && (
                <div className="popup" onClick={() => setSelectedSlip(null)}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="slip-close-btn"
                            onClick={() => setSelectedSlip(null)}
                        >
                            ×
                        </button>

                        <img src={selectedSlip} alt="slip" />
                    </div>
                </div>
            )}

            {selectedPayment && (
                <div className="payment-overlay" onClick={() => setSelectedPayment(null)}>
                    <div className="payment-popup2" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="popup-close-btn"
                            onClick={() => setSelectedPayment(null)}
                        >
                            ×
                        </button>

                        <h2>Payment Detail</h2>

                        <div className="popup-section">
                            <strong>User</strong>
                            <div>Username : {selectedPayment.name}</div>
                            <div>Phone : {selectedPayment.phone}</div>
                        </div>

                        <div className="popup-section">
                            <strong>Booking</strong>
                            <div>To : {formatDest(destCode)}</div>
                            <div>Time : {formatTimeLabel(timeLabelToHhmm(time))}</div>
                            <div>Booked seats : {selectedPayment.booked_seats}</div>
                            <div>Total amount : {selectedPayment.total_price} ฿</div>
                        </div>

                        {selectedPayment.payment_id ? (
                            <button
                                className="file-slip-btn"
                                onClick={() => openSlip(selectedPayment.payment_id)}
                            >
                                📄 View slip
                            </button>
                        ) : null}

                        <div className="popup-btns">
                            <button
                                className="reject-btn"
                                onClick={() => rejectPayment(selectedPayment.booking_id)}
                            >
                                Reject
                            </button>

                            <button
                                className="accept-btn"
                                onClick={() => approvePayment(selectedPayment.booking_id)}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="summary-box">
                <div>total seats : {totalSeats}</div>
                <div>available : {availableSeats}</div>
                <div>booked : {bookedSeats}</div>
                <div>total money : {totalMoney} ฿</div>
            </div>

            <div>
                <BottomNav goPage={goPage} currentPage="dataseat" />
            </div>
        </div >
    );
}