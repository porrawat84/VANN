import { useState } from "react";
import "./cssForgetpass.css";
import bg from "./assets/image/background.png";

export default function ResetPassword({ email, goBack, goLogin, notify, tcpRequest }) {
  const [otp,      setOtp]      = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleReset = async () => {
    if (!otp.trim()) {
      notify?.("กรุณากรอก OTP", "error");
      return;
    }
    if (otp.length !== 6) {
      notify?.("OTP ต้องมี 6 หลัก", "error");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password)) {
      notify?.("อย่างน้อย 8 ตัว และมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว", "error");
      return;
    }
    if (password !== confirm) {
      notify?.("รหัสผ่านไม่ตรงกัน", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await tcpRequest({
        type: "RESET_PASSWORD",
        email,
        otp: otp.trim(),
        password,
      });

      if (res.type === "RESET_PASSWORD_OK") {
        notify?.("เปลี่ยนรหัสผ่านสำเร็จ! กรุณา login ใหม่", "success");
        goLogin?.();
      } else {
        const messages = {
          OTP_WRONG:       "OTP ไม่ถูกต้อง",
          OTP_EXPIRED:     "OTP หมดอายุแล้ว กรุณาขอใหม่",
          OTP_NOT_FOUND:   "ไม่พบ OTP กรุณาขอใหม่",
          PASSWORD_TOO_SHORT: "รหัสผ่านสั้นเกินไป",
          MISSING_FIELDS:  "กรุณากรอกข้อมูลให้ครบ",
        };
        notify?.(messages[res.code] || "เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
      }
    } catch (e) {
      console.error(e);
      notify?.("เชื่อมต่อ server ไม่ได้", "error");
    } finally {
      setLoading(false);
    }
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
        <h1 className="title-text">reset password</h1>
      </div>

      <div className="forget-box">
        <p className="instruction-text">
          กรอก OTP 6 หลักที่ส่งไปที่<br />
          <strong>{email}</strong>
        </p>

        {/* OTP */}
        <input
          className="input forget-input"
          type="text"
          placeholder="OTP 6 หลัก"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          disabled={loading}
        />

        {/* New password */}
        <input
          className="input forget-input"
          type="password"
          placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว และมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {/* Confirm password */}
        <input
          className="input forget-input"
          type="password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleReset()}
          disabled={loading}
        />

        <button
          className="btn btn-pink"
          onClick={handleReset}
          disabled={loading}
        >
          {loading ? "saving..." : "confirm"}
        </button>
      </div>
    </div>
  );
}