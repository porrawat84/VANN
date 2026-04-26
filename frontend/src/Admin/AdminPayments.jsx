import { useEffect, useState } from "react";
import "./AdminPayments.css";
import BottomNav from "./BottomNav";

function parseTripId(tripId) {
    if (!tripId) return { destCode: "-", hhmm: "-" };
    const parts = String(tripId).split("_");
    return {
        destCode: parts[1] || "-",
        hhmm: parts[2] || "-",
    };
}

function formatDest(destCode) {
    if (destCode === "FP") return "future park rangsit";
    if (destCode === "MC") return "mo chit";
    if (destCode === "VM") return "victory monument";
    return "-";
}

function formatTime(hhmm) {
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
    return map[String(hhmm)] || "-";
}

function formatDateTime(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminPayments({ goPage, tcpRequest, notify }) {
    const [payments, setPayments] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [loading, setLoading] = useState(false);

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
    }, []);



    return (
        <div className="app">
            <button className="back-btn" onClick={() => goPage("adminHome")}>
                ⬅
            </button>

            <div className="location-title">Unverified Payment</div>

            <div className="table-wrapper">
                <table className="payment-table">
                    <thead>
                        <tr>
                            <th>booking</th>
                            <th>information</th>
                            <th>action</th>
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
                            payments.map((p) => {
                                const parsed = parseTripId(p.trip_id);

                                return (
                                    <tr key={p.payment_id}>
                                        <td>
                                            To : {formatDest(parsed.destCode)} <br />
                                            Time : {formatTime(parsed.hhmm)} <br />
                                            seat : {p.booked_seats || "-"}
                                        </td>

                                        <td>
                                            username : {p.name || "-"} <br />
                                            phone : {p.phone || "-"} <br />
                                            paid at : {formatDateTime(p.transferred_at || p.submitted_at)}<br />
                                            amount : {(Number(p.amount) / 100).toFixed(2)} ฿
                                        </td>

                                        <td>
                                            <div className="action-box">
                                                <button
                                                    className="view-slip-btn"
                                                    onClick={() => openSlip(p.payment_id)}
                                                >
                                                    View slip
                                                </button>

                                                <button
                                                    className="reject-btn"
                                                    onClick={() => rejectPayment(p.booking_id)}
                                                >
                                                    Reject
                                                </button>

                                                <button
                                                    className="accept-btn"
                                                    onClick={() => approvePayment(p.booking_id)}
                                                >
                                                    Accept
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
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
                        <img src={selectedSlip} alt="slip" style={{ width: "100%" }} />
                    </div>
                </div>
            )}

            <div>
                <BottomNav goPage={goPage} currentPage="adminPayments" />
            </div>
        </div>
    );
}