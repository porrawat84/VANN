import { useState, useEffect } from "react";
import "./Location.css";
import BottomNav from "./BottomNav";

const DEST_CODE_TO_NAME = {
    FP: "Future Park Rangsit",
    MC: "Mo Chit",
    VM: "Victory Monument",
};

const DEST_NAME_TO_CODE = {
    "Future Park Rangsit": "FP",
    "Mo Chit": "MC",
    "Victory Monument": "VM",
};

function formatTime(hhmm) {
    const map = {
        "1000": "10:00 am",
        "1030": "10:30 am",
        "1100": "11:00 am",
        "1130": "11:30 am",
        "1200": "12:00 pm",
        "1230": "12:30 pm",
        "1300": "1:00 pm",
        "1330": "1:30 pm",
        "1400": "2:00 pm",
        "1430": "2:30 pm",
        "1500": "3:00 pm",
        "1530": "3:30 pm",
        "1600": "4:00 pm",
        "1630": "4:30 pm",
        "1700": "5:00 pm",
    };
    return map[String(hhmm)] || String(hhmm);
}

export default function AdminLocation({ goPage, tcpRequest, notify }) {
    const savedDest = localStorage.getItem("dest");
    const locations = ["Future Park Rangsit", "Mo Chit", "Victory Monument"];

    const [selectedLocation, setSelectedLocation] = useState(
        DEST_CODE_TO_NAME[savedDest] || locations[0]
    );

    const [trips, setTrips] = useState([]);
    const [availableMap, setAvailableMap] = useState({});
    const [loadingTrips, setLoadingTrips] = useState(false);
    const [loadingSeats, setLoadingSeats] = useState(false);

    useEffect(() => {
        const dest = localStorage.getItem("dest");
        if (dest && DEST_CODE_TO_NAME[dest]) {
            setSelectedLocation(DEST_CODE_TO_NAME[dest]);
        }
    }, []);

    const selectedDestCode = DEST_NAME_TO_CODE[selectedLocation] || "FP";

    useEffect(() => {
        const loadTrips = async () => {
            try {
                setLoadingTrips(true);

                const res = await tcpRequest({
                    type: "GET_TODAY_TRIPS",
                });

                console.log("GET_TODAY_TRIPS response:", res);

                if (res.type !== "TODAY_TRIPS") {
                    notify?.(res.code || "โหลดรอบรถไม่สำเร็จ", "error");
                    return;
                }

                const normalized = (res.trips || []).map((t) => ({
                    tripId: String(t.tripId ?? t.trip_id ?? ""),
                    dest: String(t.dest ?? "").toUpperCase(),
                    hhmm: String(t.hhmm ?? ""),
                }));

                setTrips(normalized);
            } catch (e) {
                console.error(e);
                notify?.("โหลดรอบรถไม่สำเร็จ", "error");
            } finally {
                setLoadingTrips(false);
            }
        };

        loadTrips();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredTrips = useMemo(() => {
        return trips
            .filter((t) => t.dest === selectedDestCode)
            .sort((a, b) => Number(a.hhmm) - Number(b.hhmm));
    }, [trips, selectedDestCode]);

    useEffect(() => {
        let cancelled = false;

        const loadAvailableCounts = async () => {
            try {
                setLoadingSeats(true);

                const next = {};

                for (const trip of filteredTrips) {
                    try {
                        const res = await tcpRequest({
                            type: "ADMIN_GET_SEATS",
                            tripId: trip.tripId,
                        });

                        console.log("ADMIN_GET_SEATS response:", trip.tripId, res);

                        if (res.type === "ADMIN_GET_SEATS_OK" && Array.isArray(res.seats)) {
                            const available = res.seats.filter(
                                (seat) => String(seat.seat_status).toUpperCase() === "FREE"
                            ).length;

                            next[trip.tripId] = available;
                        } else {
                            next[trip.tripId] = 0;
                        }
                    } catch (e) {
                        console.error("ADMIN_GET_SEATS failed:", trip.tripId, e);
                        next[trip.tripId] = 0;
                    }
                }

                if (!cancelled) {
                    console.log("availableMap final:", next);
                    setAvailableMap(next);
                }
            } finally {
                if (!cancelled) {
                    setLoadingSeats(false);
                }
            }
        };

        if (filteredTrips.length > 0) {
            loadAvailableCounts();
        } else {
            setAvailableMap({});
        }

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredTrips]);

    const timeSlots = filteredTrips.map((trip) => ({
        tripId: trip.tripId,
        hhmm: trip.hhmm,
        time: formatTime(trip.hhmm),
        available: availableMap[trip.tripId] ?? 0,
        dest: trip.dest,
    }));

    const handleOpenTrip = (slot) => {
        localStorage.setItem("adminTripId", slot.tripId);
        localStorage.setItem("adminTripHhmm", slot.hhmm);
        localStorage.setItem("adminTripDest", slot.dest);
        goPage("dataseat");
    };

    return (
        <div className="app">
            <div className="top-bar">
                <button className="back-btn" onClick={() => goPage("adminHome")}>
                    ⬅
                </button>

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

            <div className="card">
                {loadingTrips || loadingSeats ? (
                    <div style={{ padding: "12px" }}>loading...</div>
                ) : timeSlots.length === 0 ? (
                    <div style={{ padding: "12px" }}>no trips</div>
                ) : (
                    timeSlots.map((slot) => (
                        <button
                            key={slot.tripId}
                            className="slot-btn"
                            onClick={() => handleOpenTrip(slot)}
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

            <div>
                <BottomNav goPage={goPage} />
            </div>
        </div>
    );
}