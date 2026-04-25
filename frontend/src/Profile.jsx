import { useState } from "react";
import "./cssProfile.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";

export default function UserProfile({ goPage }) {
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState(localStorage.getItem("name") || "");
    const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
    const [email] = useState(localStorage.getItem("email") || "");

    const handleSave = () => {
        localStorage.setItem("name", name);
        localStorage.setItem("phone", phone);
        setEditMode(false);
    };

    const handleLogout = () => {
        localStorage.clear();
        goPage("signin");
    };

    return (
        <div
            className="app profile-app"
            style={{
                backgroundImage: `url(${bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            {/* Avatar */}
            <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                    <img src={logo} alt="profile" className="profile-avatar-img" />
                </div>
                <h2 className="profile-name">{name || "VANN"}</h2>
            </div>

            {/* Info Box */}
            <div className="boxyellow profile-box">
                <p className="profile-section-title">ข้อมูลส่วนตัว</p>

                <label>ชื่อ - นามสกุล</label>
                {editMode ? (
                    <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ชื่อ - นามสกุล"
                    />
                ) : (
                    <div className="profile-value">{name || "-"}</div>
                )}

                <label>เบอร์โทรศัพท์</label>
                {editMode ? (
                    <input
                        className="input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="เบอร์โทรศัพท์"
                    />
                ) : (
                    <div className="profile-value">{phone || "-"}</div>
                )}

                <label>อีเมล</label>
                <div className="profile-value profile-value--muted">{email || "-"}</div>

                {editMode ? (
                    <div className="signin-btn-group">
                        <button className="btn signin-blue" onClick={() => setEditMode(false)}>ยกเลิก</button>
                        <button className="btn signin-purple" onClick={handleSave}>บันทึก</button>
                    </div>
                ) : (
                    <button className="btn signin-purple" style={{ marginTop: 8 }} onClick={() => setEditMode(true)}>
                        แก้ไขข้อมูล
                    </button>
                )}
            </div>

            {/* Logout */}
            <button className="btn profile-logout-btn" onClick={handleLogout}>
                ออกจากระบบ
            </button>
        </div>
    );
}
