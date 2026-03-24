import { useState } from "react";
import "./Location.css";
import BottomNav from "./BottomNav";

export default function AdminLocation({ goPage }) {
    const locations = ["Future Park Rangsit", "Mo Chit", "Victory Monument"];
    const [selectedLocation, setSelectedLocation] = useState(locations[0]);

    const timeSlots = [
        { time: "10:00 am", available: 8 },
        { time: "11:00 am", available: 12 },
        { time: "12:00 am", available: 0 },
        { time: "1:30 pm", available: 8 },
        { time: "2:00 pm", available: 12 },
        { time: "3:00 pm", available: 0 },
        { time: "4:00 pm", available: 0 },
        { time: "5:00 pm", available: 0 },

    ];

    return (
        <div className="app" >

            {/* top bar */}
            <div className="top-bar">
                <button className="back-btn">←</button>

                <select
                    className="location-filter"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                >
                    {locations.map((loc) => (
                        <option key={loc}>{loc}</option>
                    ))}
                </select>
            </div>

            {/* card */}
            <div className="card">
                {timeSlots.map((slot, index) => (
                    <button key={index} 
                    className="slot-btn" 
                    onClick={() => goPage("dataseat")}
                    >
                        <span>{slot.time}</span>

                        <span
                            className={`badge ${slot.available === 0 ? "full" : ""
                                }`}
                        >
                            {slot.available} available
                        </span>
                    </button>
                ))}
            </div>
            <div><BottomNav goPage={goPage} /></div>

        </div>
    );
}