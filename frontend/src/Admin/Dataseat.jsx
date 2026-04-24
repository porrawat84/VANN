import { useEffect, useState } from "react";
import "./Dataseat.css";
import BottomNav from "./BottomNav";


export default function Dataseat({ goPage, tcpRequest, notify }) {
    const [time, setTime] = useState("10:00");
    const [filter, setFilter] = useState("all");

    const [payments, setPayments] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [loading, setLoading] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState({});

    const changeStatus = (id) => {
        setSeats((prev) =>
            prev.map((seat) => {
                if (seat.id !== id) return seat;

                if (seat.status === "empty") return { ...seat, status: "waiting" };
                if (seat.status === "waiting") return { ...seat, status: "success" };
                return { ...seat, status: "empty" };
            })
        );
    };

    // seat filter
    const filteredSeats = seats.filter((s) => {
        if (filter === "all") return true;
        if (filter === "booked") return s.status === "success";
        if (filter === "available") return s.status === "empty";
        return s.status === filter;
    });

    const getStatusText = (status) => {
        if (status === "success") return "success";
        if (status === "waiting") return "waiting";
        return "no select";
    };

    //SUMMARY
    const totalSeats = seats.length;

    const availableSeats = seats.filter(s => s.status === "empty").length;

    const bookedSeats = seats.filter(s => s.status === "success").length;

    // รวมเงินเฉพาะ success
    const totalMoney = seats
        .filter(s => s.status === "success")
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const openSlip = async (paymentId) => {
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
            notify?.("ดึงรูปสลิปไม่สำเร็จ", "error");
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
            setPayments((prev) => prev.filter((p) => p.booking_id !== bookingId));
            setSelectedSlip(null);
        } catch (e) {
            console.error(e);
            notify?.("อนุมัติไม่สำเร็จ", "error");
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
            setPayments((prev) => prev.filter((p) => p.booking_id !== bookingId));
            setSelectedSlip(null);
        } catch (e) {
            console.error(e);
            notify?.("ปฏิเสธไม่สำเร็จ", "error");
        }
        };

    useEffect(() => {
        const loadPending = async () => {
            try {
            setLoading(true);
            const res = await tcpRequest({
                type: "ADMIN_GET_PENDING_PAYMENTS",
            });

            if (res.type !== "PENDING_PAYMENTS") {
                notify?.(res.code || "โหลดรายการรอตรวจสอบไม่สำเร็จ", "error");
                return;
            }

            setPayments(res.payments || []);
            } catch (e) {
            console.error(e);
            notify?.("โหลดรายการแอดมินไม่สำเร็จ", "error");
            } finally {
            setLoading(false);
            }
        };

        loadPending();
        }, [tcpRequest, notify]);

    return (
        <div className="app">

            {/* BACK */}
            <button className="back-btn" onClick={() => goPage("adminLocation")}>
                ⬅
            </button>

            {/* TITLE */}
            <div className="location-title">
                future park rangsit
            </div>

            {/* FILTER */}
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
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
                <table className="seat-table">
                    <thead>
                        <tr>
                            <th>seat</th>
                            <th>Information</th>
                            <th>payment</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                            <td colSpan="3">loading...</td>
                            </tr>
                        ) : payments.length === 0 ? (
                            <tr>
                            <td colSpan="3">no pending payments</td>
                            </tr>
                        ) : (
                            payments.map((p) => (
                            <tr key={p.payment_id}>
                                <td>{p.booking_id}</td>

                                <td>
                                username : {p.name} <br />
                                phone : {p.phone || "-"} <br />
                                trip : {p.trip_id} <br />
                                amount : {(Number(p.amount) / 100).toFixed(2)} ฿
                                </td>

                                <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div>waiting verify</div>

                                    <button className="slip-btn" onClick={() => openSlip(p.payment_id)}>
                                    🖼 view slip
                                    </button>

                                    <button className="btn save" onClick={() => approvePayment(p.booking_id)}>
                                    approve
                                    </button>

                                    <button className="btn cancel" onClick={() => rejectPayment(p.booking_id)}>
                                    reject
                                    </button>
                                </div>
                                </td>
                            </tr>
                            ))
                        )}
                        </tbody>
                </table>
            </div>
            {/* popup รูป */}
            {selectedSlip && (
                <div className="popup" onClick={() => setSelectedSlip(null)}>
                    <div className="popup-content">
                        <img src={selectedSlip} alt="slip" />
                    </div>
                </div>
            )}
            <div className="summary-box">
                <div>total seats : {totalSeats}</div>
                <div>available : {availableSeats}</div>
                <div>booked : {bookedSeats}</div>
                <div>total money : {totalMoney} ฿</div>
            </div>
            <div><BottomNav goPage={goPage} /></div>
        </div>
    );
}