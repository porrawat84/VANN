import { useState } from "react";
import "./AdminProfile.css";
import BottomNav from "./BottomNav";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";

export default function Profile({ goPage, onLogout }) {
    const [loading, setLoading] = useState(false);

    const name = localStorage.getItem("name") || "Admin";
    const email = localStorage.getItem("email") || "-";
    const phone = localStorage.getItem("phone") || "-";

    const handleLogout = () => {
        setLoading(true);
        setTimeout(() => {
            localStorage.clear();
            goPage("signin");
            setLoading(false);
        }, 800);
    };

    return (
        <div
            className="admin-profile-page"

        >
            {/* Avatar */}
            <div className="admin-profile-avatar-wrap">
                <div className="admin-profile-avatar">
                    <img src={logo} alt="logo" className="admin-profile-avatar-img" />
                </div>
                <h2 className="admin-profile-name">{name}</h2>
                <p className="admin-profile-role">admin</p>
            </div>

            {/* Info Box */}
            <div className="admin-profile-box">
                <p className="admin-profile-section-title">information</p>

                
                <label>email</label>
                <div className="admin-profile-value">{email}</div>

               

                <button
                    className="admin-logout-btn"
                    onClick={handleLogout}
                    disabled={loading}
                >
                    {loading ? "logging out..." : "log out"}
                </button>
            </div>
            <div><BottomNav goPage={goPage} /></div>

            <BottomNav goPage={goPage} currentPage="adminProfile" />
        </div>
    );
}