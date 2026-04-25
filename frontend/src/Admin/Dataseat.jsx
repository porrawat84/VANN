Dataseat

import "./Dataseat.css";
import BottomNav from "./BottomNav";
import { useState, useEffect } from "react";


export default function Dataseat({ goPage, tcpRequest, notify }) {
    const [time, setTime] = useState("10:00");
    const [filter, setFilter] = useState("all");

    const [seats, setSeats] = useState([]);

    // popup รูป
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);

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

    const mapStatus = (status) => {
        if (status === "APPROVED") return "success";
        if (status === "WAITING_VERIFY") return "waiting";
        return "empty";
    };

    useEffect(() => {
        const loadSeats = async () => {
            try {
                const tripId = `${new Date().toISOString().slice(0, 10)}_${time}_BKK-RS`;
                const res = await tcpRequest({
                    type: "ADMIN_GET_SEATS",
                    tripId,
                });

                if (res.type !== "ADMIN_GET_SEATS_OK") {
                    notify?.(res.code || "โหลดที่นั่งไม่สำเร็จ", "error");
                    return;
                }

                const allSeatNumbers = [
                    "A1", "A2",
                    "B1", "B2", "B3",
                    "C1", "C2", "C3",
                    "D1", "D2", "D3",
                ];

                const bookedSeats = res.seats || [];

                const mapped = allSeatNumbers.map((seatNo) => {
                    const booking = bookedSeats.find(
                        (s) => s.seat_number === seatNo
                    );

                    if (!booking) {
                        return {
                            id: seatNo,
                            name: "-",
                            phone: "-",
                            price: "-",
                            status: "empty",
                            slip: null,
                        };
                    }

                    return {
                        id: seatNo,
                        name: booking.name || "-",
                        phone: booking.phone || "-",
                        price: booking.total_price
                            ? (Number(booking.total_price) / 100).toFixed(2)
                            : "-",
                        status: mapStatus(booking.payment_status),
                        slip: null,
                    };
                });

                setSeats(mapped);

                setSeats(mapped);
            } catch (e) {
                console.error(e);
                notify?.("โหลดที่นั่งไม่สำเร็จ", "error");
            }
        };

        loadSeats();
    }, [time]); // โหลดใหม่เมื่อเปลี่ยน time

    return (
        <div className="app">

            {/* 🔙 BACK */}
            <button className="back-btn" onClick={() => goPage("adminLocation")}>
                ⬅
            </button>

            {/* 🟡 TITLE */}
            <div className="location-title">
                future park rangsit
            </div>

            {/* 🔵 FILTER */}
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

            {/* 📋 TABLE */}
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
                        {filteredSeats.length === 0 ? (
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
                                        {editingId === s.id ? (
                                            <>
                                                username :
                                                <input
                                                    value={draft.name}
                                                    onChange={(e) =>
                                                        setDraft({ ...draft, name: e.target.value })
                                                    }
                                                />
                                                <br />

                                                phone :
                                                <input
                                                    value={draft.phone}
                                                    onChange={(e) =>
                                                        setDraft({ ...draft, phone: e.target.value })
                                                    }
                                                />
                                                <br />

                                                price :
                                                <input
                                                    value={draft.price}
                                                    onChange={(e) =>
                                                        setDraft({ ...draft, price: e.target.value })
                                                    }
                                                />

                                                <div className="btn-groupedit">
                                                    <button
                                                        className="btn save"
                                                        onClick={() => {
                                                            setSeats((prev) =>
                                                                prev.map((seat) =>
                                                                    seat.id === s.id ? { ...seat, ...draft } : seat
                                                                )
                                                            );
                                                            setEditingId(null);
                                                        }}
                                                    >
                                                        save
                                                    </button>

                                                    <button
                                                        className="btn cancel"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        cancel
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                username : {s.name} <br />
                                                phone : {s.phone} <br />
                                                price : {s.price}

                                                <br />

                                                <button
                                                    className="btn edit"
                                                    onClick={() => {
                                                        setEditingId(s.id);
                                                        setDraft(s);
                                                    }}
                                                >
                                                    edit
                                                </button>
                                            </>
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            className={`payment-status ${s.status}`}
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
            {/* 👉 popup รูป */}
            {selectedSlip && (
                <div className="popup" onClick={() => setSelectedSlip(null)}>
                    <div className="popup-content">
                        <img src={selectedSlip} alt="slip" />
                    </div>
                </div>
            )}
            {selectedPayment && (
                <div className="popup" onClick={() => setSelectedPayment(null)}>
                    <div className="payment-popup" onClick={(e) => e.stopPropagation()}>

                        <div className="payment-popup-table">

                            {/* booking */}
                            <div className="popup-booking">
                                To : - <br />
                                Time : - <br />
                                seat : {selectedPayment.id}
                            </div>

                            {/* info */}
                            <div className="popup-info">
                                username : {selectedPayment.name} <br />
                                phone : {selectedPayment.phone} <br />
                                paid time : - <br />
                                paid date : - <br />
                                amount : {selectedPayment.price} ฿
                            </div>

                            {/* action */}
                            <div className="popup-action">

                                <button
                                    className="reject-btn"
                                    onClick={() => {
                                        setSeats((prev) =>
                                            prev.map((seat) =>
                                                seat.id === selectedPayment.id
                                                    ? {
                                                        ...seat,
                                                        status: "empty",
                                                        name: "-",
                                                        phone: "-",
                                                        price: "-"
                                                    }
                                                    : seat
                                            )
                                        );
                                        setSelectedPayment(null);
                                    }}
                                >
                                    reject
                                </button>

                                <button
                                    className="accept-btn"
                                    onClick={() => {
                                        setSeats((prev) =>
                                            prev.map((seat) =>
                                                seat.id === selectedPayment.id
                                                    ? { ...seat, status: "success" }
                                                    : seat
                                            )
                                        );
                                        setSelectedPayment(null);
                                    }}
                                >
                                    accept
                                </button>

                            </div>

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
            <div><BottomNav goPage={goPage} /></div>
        </div>
    );
}