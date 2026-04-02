import { useState } from "react";
import "./cssSignin.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";


export default function Signin({ goSignup, goForget, notify, goLocation, goAdmin }) {

    // สร้าง State สำหรับเก็บ Email และ Password
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    // ฟังก์ชันจับการเปลี่ยนแปลงเวลาผู้ใช้พิมพ์
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // ฟังก์ชันเช็คว่ากรอกข้อมูลครบและอีเมลถูกต้องไหม
    const isFormValid = () => {
        const { email, password } = formData;
        const cleanEmail = email.trim();


        if (!cleanEmail || !password) {
            return false;
        }

        // เช็ครูปแบบอีเมล (ต้องมี @ และ .)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return false;
        }

        return true;
    };

    const handleLogin = async () => {
        if (!isFormValid()) {
            notify?.("กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง", "error");
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    password: formData.password
                })
            });

            const data = await res.json();

            if (!data.ok) {
                notify?.("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "error");
                return;
            }

            // เก็บ user
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("role", data.role);

            // ✅ เช็ค role
            if (data.role === "ADMIN") {
                goAdmin();      // ไปหน้า admin
            } else {
                goLocation();   // ไปหน้า user ปกติ
            }

        } catch (err) {
            console.error(err);
            notify?.("เชื่อมต่อ server ไม่ได้", "error");
        }
    };




    return (
        <div className="app" style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
        }}>
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
                    </button>
                </div>

                <p className="forgot" onClick={goForget}>forget password?</p>
            </div>

        </div>
    );
}