import { useState } from "react";
import "./cssSignin.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";

export default function Signin({  goSignup, goForget }) {

        // 1. สร้าง State สำหรับเก็บ Email และ Password
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    // 2. ฟังก์ชันจับการเปลี่ยนแปลงเวลาผู้ใช้พิมพ์
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // 3. ฟังก์ชันเช็คว่ากรอกข้อมูลครบและอีเมลถูกต้องไหม
    const isFormValid = () => {
        const { email, password } = formData;
        const cleanEmail = email.trim(); // ป้องกันการเว้นวรรคหลอก

        // เช็คว่ามีช่องไหนว่างไหม
        if (!cleanEmail || !password) {
            return false;
        }

        // เช็ครูปแบบอีเมล (ต้องมี @ และ .)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return false;
        }

        return true; // ข้อมูลเป๊ะ พร้อมให้กด!
    };

    const handleLogin = () => {
        if (!isFormValid()) {
            alert("กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง");
            return;
        }

        if (!window.tcp) {
            alert("TCP ยังไม่พร้อม (Electron preload ไม่เจอ window.tcp)");
            return;
        }

        window.tcp.send({
            type: "SIGN_IN",
            email: formData.email.trim(),
            password: formData.password
        });
    };



    return (
        <div className="app" style={{ backgroundImage: `url(${bg})` }}>
            <img src={logo} className="signin-logo" alt="logo" />

            <div className="boxyellow">
                <label>email :</label>
                {/* เติม name, value, onChange ให้ input ผูกกับ State */}
                <input 
                    className="input"
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                />

                <label>password :</label>
                <input
                    className="input"
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                />

            <div className="signin-btn-group">
                <button className="btn signin-purple" onClick={goSignup}>
                sign up
                </button>
                <button className="btn signin-blue" onClick={handleLogin}>
                sign in
                </button></div>

            <p className="forgot" onClick={goForget}>forget password?</p>
            </div>

        </div>
        );
    }