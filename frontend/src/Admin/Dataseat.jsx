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

                const mapped = res.seats.map(s => ({
                    id: s.seat_number,
                    name: s.name || "-",
                    phone: s.phone || "-",
                    price: s.total_price ? (Number(s.total_price) / 100).toFixed(2) : "-",
                    status: mapStatus(s.payment_status),
                    slip: null,
                }));

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
                        {filteredSeats.map((s) => (
                            <tr key={s.id}>
                                <td>{s.id}</td>

                                {/* 🟡 INFORMATION */}
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
                                        </>
                                    ) : (
                                        <>
                                            username : {s.name} <br />
                                            phone : {s.phone} <br />
                                            price : {s.price}
                                        </>
                                    )}

                                    {/* 🔘 EDIT BUTTON */}
                                    {editingId === s.id ? (
                                        <div className="btn-groupedit">
                                            <button
                                                className="btn save"
                                                onClick={() => {
                                                    setSeats((prev) =>
                                                        prev.map((seat) =>
                                                            seat.id === s.id ? draft : seat
                                                        )
                                                    );
                                                    setEditingId(null);
                                                }}
                                            >
                                                save
                                            </button>

                                            <button
                                                className="btn cancel" onClick={() => setEditingId(null)}>
                                                cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn edit"
                                            onClick={() => {
                                                setEditingId(s.id);
                                                setDraft(s);
                                            }}
                                        >
                                            edit
                                        </button>
                                    )}
                                </td>


                                {/* 💰 PAYMENT */}
                                <td>
                                    <select
                                        className={`status ${s.status}`}
                                        value={s.status}
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            setSeats((prev) =>
                                                prev.map((seat) =>
                                                    seat.id === s.id
                                                        ? { ...seat, status: newStatus }
                                                        : seat
                                                )
                                            );
                                        }}
                                    >
                                        <option value="empty">no select</option>
                                        <option value="waiting">waiting</option>
                                        <option value="success">success</option>
                                    </select>

                                    {/* 👉 ปุ่มดูสลิป */}
                                    {s.slip && (
                                        <button
                                            className="slip-btn"
                                            onClick={() => setSelectedSlip(s.slip)}
                                        >
                                            🖼
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
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