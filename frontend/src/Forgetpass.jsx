import { useState } from "react";
import "./cssForgetpass.css";
import bg from "./assets/image/background.png";

export default function ForgetPassword({ goBack, notify }) {
    //  สร้าง State สำหรับเก็บ Email
    const [email, setEmail] = useState("");

    // ฟังก์ชันตรวจสอบและส่งอีเมล
    const handleSendEmail = () => {
        const cleanEmail = email.trim();
        
        if (!cleanEmail) {
            notify?.("กรุณากรอกอีเมลของคุณ", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            notify?.("รูปแบบอีเมลไม่ถูกต้อง", "error");
            return;
        }

        notify?.(`ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่: ${cleanEmail}`, "success");
    };

    return (
        <div className="app forget-app" style={{ backgroundImage: `url(${bg})` }}>
            <btn className="back-btn" onClick={goBack}>←</btn>
            <div className="forget-header">
                <h1 className="title-text">forget password</h1>
            </div>

            {/* กล่องสีเหลือง */}
            <div className="forget-box">
                <p className="instruction-text">
                    Enter your email account for reset password
                </p>
                
                <input 
                    className="input forget-input" 
                    type="email" 
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <button className="btn btn-pink" onClick={handleSendEmail}>
                    send email
                </button>
            </div>

        </div>
    );
}