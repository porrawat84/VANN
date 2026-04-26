import { useState } from "react";
import "./cssForgetpass.css";
import bg from "./assets/image/background.png";

export default function ForgetPassword({ goBack, goReset, notify, tcpRequest }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      notify?.("กรุณากรอกอีเมลของคุณ", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      notify?.("รูปแบบอีเมลไม่ถูกต้อง", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await tcpRequest({
        type: "FORGOT_PASSWORD",
        email: cleanEmail,
      });

      if (res.type === "FORGOT_PASSWORD_OK") {
        notify?.("ส่ง OTP ไปที่อีเมลของคุณแล้ว!", "success");
        // ส่ง email ไปด้วยเพื่อใช้ในหน้าถัดไป
        goReset(cleanEmail);
      } else {
        notify?.("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
      }
    } catch (e) {
      console.error(e);
      notify?.("เชื่อมต่อ server ไม่ได้", "error");
    } finally {
      setLoading(false);
    }

    console.log("goReset =", goReset);
  };

  return (
    <div
      className="app forget-app"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <btn className="back-btn" onClick={goBack}>←</btn>

      <div className="forget-header">
        <h1 className="title-text">forget password</h1>
      </div>

      <div className="forget-box">
        <p className="instruction-text">
          Enter your email account for reset password
        </p>

        <input
          className="input forget-input"
          type="email"
          name="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
          disabled={loading}
        />

        <button
          className="btn btn-pink"
          onClick={handleSendEmail}
          disabled={loading}
        >
          {loading ? "sending..." : "send OTP"}
        </button>
      </div>
    </div>
  );
}