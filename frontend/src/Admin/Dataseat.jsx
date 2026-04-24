import { useState } from "react";
import "./Dataseat.css";
import BottomNav from "./BottomNav";

export default function Dataseat({ goPage }) {
    const [time, setTime] = useState("10:00");
    const [filter, setFilter] = useState("all");

    const [seats, setSeats] = useState([
        { id: "A1", username: "nongvanda01", phone: "099-999-9999", price: 20, status: "success" },
        { id: "A2", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "B1", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "B2", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "B3", username: "somshydotcom", phone: "099-999-8888", price: 20, status: "waiting" },
        { id: "C1", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "C2", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "C3", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "D1", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "D2", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "D3", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "E1", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "E2", username: "-", phone: "-", price: "-", status: "empty" },
        { id: "E3", username: "-", phone: "-", price: "-", status: "empty" },
    ]);

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

    const filteredSeats = seats.filter((seat) => {
        if (filter === "all") return true;
        if (filter === "booked") return seat.status === "success";
        if (filter === "available") return seat.status === "empty";
        return true;
    });

    const getStatusText = (status) => {
        if (status === "success") return "success";
        if (status === "waiting") return "waiting";
        return "no select";
    };

    const totalSeats = seats.length;
    const availableSeats = seats.filter((s) => s.status === "empty").length;
    const bookedSeats = seats.filter((s) => s.status === "success").length;
    const totalMoney = seats
        .filter((s) => s.status === "success")
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    return (
        <div className="app">
            <button className="back-btn" onClick={() => goPage("adminLocation")}>
                ⬅
            </button>

            <div className="location-title">
                future park rangsit
            </div>

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

            <button className="seat-map-btn" onClick={() => goPage("adminSeatMap")}>
                Seat Maps
            </button>

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
                        {filteredSeats.map((seat) => (
                            <tr key={seat.id}>
                                <td>{seat.id}</td>
                                <td>
                                    username : {seat.username} <br />
                                    phone : {seat.phone} <br />
                                    price : {seat.price}
                                </td>
                                <td>
                                    <button
                                        className={`status-btn ${seat.status}`}
                                        onClick={() => changeStatus(seat.id)}
                                    >
                                        {getStatusText(seat.status)}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="summary-box">
                <div>total seats : {totalSeats}</div>
                <div>available : {availableSeats}</div>
                <div>booked : {bookedSeats}</div>
                <div>total money : {totalMoney} ฿</div>
            </div>

            <div>
                <BottomNav goPage={goPage} />
            </div>
        </div>
    );
}