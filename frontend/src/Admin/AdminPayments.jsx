import { useEffect, useState } from "react";
import "./Dataseat.css";
import BottomNav from "./BottomNav";

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

            <div className="location-title">pending payments</div>

            <div className="table-wrapper">
                <table className="seat-table">
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
                            payments.map((p) => (
                                <tr key={p.payment_id}>
                                    <td className="booking-cell">
                                        To : {p.destination || "-"} <br />
                                        Time : {p.departure_time || "-"} <br />
                                        seat : {p.seat_no || "-"}
                                    </td>

                                    <td className="info-cell">
                                        username : {p.name} <br />
                                        phone : {p.phone || "-"} <br />
                                        paid time : {p.paytime || "-"} <br />
                                        paid date : {p.paydate || "-"} <br />
                                        amount : {(Number(p.amount) / 100).toFixed(2)} ฿
                                    </td>

                                    <td className="payment-cell">
                                        <button
                                            className="slip-btn"
                                            onClick={() => openSlip(p.payment_id)}
                                        >
                                            🖼
                                        </button>

                                        <button
                                            className="reject-btn"
                                            onClick={() => rejectPayment(p.booking_id)}
                                        >
                                            reject
                                        </button>

                                        <button
                                            className="accept-btn"
                                            onClick={() => approvePayment(p.booking_id)}
                                        >
                                            accept
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