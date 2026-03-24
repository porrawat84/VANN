import { useState } from "react";
import "./Dataseat.css";
import BottomNav from "./BottomNav";


export default function Dataseat({ goPage }) {
    const [time, setTime] = useState("10:00");
    const [filter, setFilter] = useState("all");

    const seats = [
        { id: "A1", name: "nongvanda01", phone: "099-999-9999", price: 20, status: "success" },
        { id: "A2", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "B1", name: "somshudtocom", phone: "099-999-8888", price: 20, status: "waiting" },
        { id: "B2", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "B3", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "C1", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "C2", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "C3", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "D1", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "D2", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "D3", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "E1", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "E2", name: "-", phone: "-", price: "-", status: "empty" },
        { id: "E3", name: "-", phone: "-", price: "-", status: "empty" },

    ];


    const filteredSeats = seats.filter((s) => {
        if (filter === "booked") return s.status === "success";
        if (filter === "available") return s.status === "empty";
        return true;
    });

    const getStatusText = (status) => {
        if (status === "success") return "success";
        if (status === "waiting") return "waiting";
        return "no select";
    };

    return (
        <div className="app">

            {/* 🔙 BACK */}
            <button className="back-btn" onClick={() => goPage("adminLocation")}>
                ←
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

                                <td>
                                    username : {s.name} <br />
                                    phone : {s.phone} <br />
                                    price : {s.price}
                                </td>

                                <td>
                                    <span className={`status ${s.status}`}>
                                        {getStatusText(s.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div><BottomNav goPage={goPage} /></div>
        </div>
    );
}