import { useState } from "react";
import "./cssSignin.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";
import { useEffect } from "react";

export default function Signin({ goSignup, goForget, notify, goLocation, goAdmin }) {

    // สร้าง State สำหรับเก็บ Email และ Password
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    useEffect(() => {
        if (!window.tcp?.onMessage) return;

        const handler = (msg) => {
            if (msg.type === "SIGN_IN_OK") {
                localStorage.setItem("userId", msg.userId);
                localStorage.setItem("role", msg.role);

                if (msg.role === "ADMIN") {
                    goAdmin();
                } else {
                    goLocation();
                }
            }

            if (msg.type === "SIGN_IN_FAIL") {
                notify?.("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "error");
            }
        };

        const unsubscribe = window.tcp.onMessage(handler);

        return () => unsubscribe();
    }, [goAdmin, goLocation, notify]);

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

    const handleLogin = () => {
        if (!isFormValid()) {
            notify?.("กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง", "error");
            return;
        }

        localStorage.removeItem("userId");
        localStorage.removeItem("role");

        if (window.tcp) {
            window.tcp.send({
            type: "SIGN_IN",
            email: formData.email.trim(),
            password: formData.password
            });
        } else {
            console.log("Mock login");
            goLocation();
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
            <p className="forgot" onClick={goAdmin}>admin</p>
        </div>
    );
}