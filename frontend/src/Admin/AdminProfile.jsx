import { useState } from "react";
import "./AdminProfile.css";
import BottomNav from "./BottomNav";


export default function Profile({ goPage, onLogout, user={ }}){
    const [loading, setLoading] = useState(false);

    const handleLogout = () => {
        setLoading(true);

        setTimeout(() => {
            onLogout && onLogout();
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-content">
                    <img
                        src={user?.avatar || "https://via.placeholder.com/100"}
                        alt="avatar"
                        className="profile-avatar"
                    />

                    <h2 className="profile-name">{user?.name || "Guest"}</h2>
                    <p className="profile-email">{user?.email || "No email"}</p>

                    <button
                        onClick={handleLogout}
                        className="logout-btn"
                        disabled={loading}
                    >
                        {loading ? "Logging out..." : "Logout"}
                    </button>
                </div>
            </div>
            <div><BottomNav goPage={goPage} /></div>

        </div>
    );
}