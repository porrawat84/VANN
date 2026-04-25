import { useEffect, useState } from "react";
import "./cssProfile.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";

export default function UserProfile({ goPage, tcpRequest, notify }) {
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        setName(localStorage.getItem("name") || "");
        setPhone(localStorage.getItem("phone") || "");
        setEmail(localStorage.getItem("email") || "");
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);

            const res = await tcpRequest({
                type: "UPDATE_PROFILE",
                name,
                phone,
            });

            if (res.type !== "UPDATE_PROFILE_OK") {
                notify?.(res.code || "บันทึกข้อมูลไม่สำเร็จ", "error");
                return;
            }

            localStorage.setItem("name", res.name || "");
            localStorage.setItem("phone", res.phone || "");
            localStorage.setItem("email", res.email || "");

            setName(res.name || "");
            setPhone(res.phone || "");
            setEmail(res.email || "");

            notify?.("บันทึกข้อมูลสำเร็จ", "info");
            setEditMode(false);
        } catch (e) {
            console.error(e);
            notify?.("บันทึกข้อมูลไม่สำเร็จ", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setName(localStorage.getItem("name") || "");
        setPhone(localStorage.getItem("phone") || "");
        setEmail(localStorage.getItem("email") || "");
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
            <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                    <img src={logo} alt="profile" className="profile-avatar-img" />
                </div>
                <h2 className="profile-name">{name || "VANN"}</h2>
            </div>

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
                        <button
                            className="btn signin-blue"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            ยกเลิก
                        </button>
                        <button
                            className="btn signin-purple"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                ) : (
                    <button
                        className="btn signin-purple"
                        style={{ marginTop: 8 }}
                        onClick={() => setEditMode(true)}
                    >
                        แก้ไขข้อมูล
                    </button>
                )}
            </div>

            <button className="btn profile-logout-btn" onClick={handleLogout}>
                ออกจากระบบ
            </button>
        </div>
    );
}