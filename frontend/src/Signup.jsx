import { useState } from "react"; //
import "./cssSignup.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";

export default function Signup({ goBack, goNext }) {

    // Check ข้อมูลในกล่องข้อความinput
    //1. สร้าง State สำหรับเก็บข้อมูลทุกช่อง
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    // 2. ฟังก์ชันจับการเปลี่ยนแปลงเวลาพิมพ์
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // 3. ฟังก์ชันเช็คความถูกต้องของฟอร์ม
    const isFormValid = () => {
        const { username, email, phone, password, confirmPassword } = formData;

        // เช็คว่ามีช่องไหนเว้นว่างไว้ไหม
        if (!username || !email || !phone || !password || !confirmPassword) {
            return false;
        }

        // เช็ครูปแบบอีเมล (ต้องมี @ และ . เช่น test@mail.com)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }

        // เช็คว่ารหัสผ่าน 2 ช่องตรงกันไหม
        if (password !== confirmPassword) {
            return false;
        }

        return true; // ถ้าผ่านทุกด่าน คืนค่า true (ฟอร์มพร้อมใช้งาน)
    };

    const handleSignup = () => {
        if (!isFormValid()) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน อีเมลถูกต้อง และรหัสผ่านตรงกัน");
            return;
        }

        const socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: "REGISTER",
                name: formData.username,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
            }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "REGISTER_OK") {
                alert("สมัครสมาชิกสำเร็จ");
                goNext();
            }

            if (data.type === "REGISTER_FAIL") {
                alert("สมัครสมาชิกไม่สำเร็จ");
            }
        };

        socket.onerror = () => {
            alert("เชื่อมต่อ WebSocket ไม่ได้");
        };
    };

    return (
        <div className="app" style={{ backgroundImage: `url(${bg})` }}>
            <img src={logo} className="signup-logo" alt="logo" />

            <div className="boxblue">

                <label>username :</label>
                {/* เติม name, value และ onChange ให้ input ทุกตัว */}
                <input className="input" type="text" name="username" value={formData.username} onChange={handleChange} />

                <label>email :</label>
                <input className="input" type="email" name="email" value={formData.email} onChange={handleChange} />

                <label>phone :</label>
                <input className="input" type="tel" name="phone" value={formData.phone} onChange={handleChange} />

                <label>password :</label>
                <input className="input" type="password" name="password" value={formData.password} onChange={handleChange} />

                <label>confirm password :</label>
                <input className="input" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
                <button className="btn signup-purple" onClick={handleSignup}
    
                >
                    sign up
                </button>

            </div>
        </div>
    );
}
