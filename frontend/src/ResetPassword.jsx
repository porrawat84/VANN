import { useState } from "react";
import "./cssForgetpass.css";
import bg from "./assets/image/background.png";

export default function ResetPassword({ email, goBack, goLogin, notify, tcpRequest }) {
  const [otp,      setOtp]      = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);

  // --- inline error states ---
  const [otpError,      setOtpError]      = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError,  setConfirmError]  = useState("");

  // --- per-field validators ---
  const validateOtp = (value) => {
    if (!value.trim())        return "โปรดระบุรหัส OTP";
    if (value.length !== 6)   return "รหัส OTP ต้องประกอบด้วยตัวเลข 6 หลัก";
    return "";
  };

  const validatePassword = (value) => {
    if (!value)               return "โปรดระบุรหัสผ่านใหม่";
    if (value.length < 8)     return "รหัสผ่านต้องมีความยาวไม่น้อยกว่า 8 ตัวอักษร";
    if (!/[A-Z]/.test(value)) return "รหัสผ่านต้องประกอบด้วยตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว";
    return "";
  };

  const validateConfirm = (value, pwd = password) => {
    if (!value)          return "โปรดยืนยันรหัสผ่านอีกครั้ง";
    if (value !== pwd)   return "รหัสผ่านไม่ตรงกัน โปรดตรวจสอบและลองใหม่อีกครั้ง";
    return "";
  };

  // --- onChange handlers with live validation ---
  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setOtp(val);
    setOtpError(validateOtp(val));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordError(validatePassword(val));
    if (confirm) setConfirmError(validateConfirm(confirm, val));
  };

  const handleConfirmChange = (e) => {
    const val = e.target.value;
    setConfirm(val);
    setConfirmError(validateConfirm(val));
  };

  const handleReset = async () => {
    const e1 = validateOtp(otp);
    const e2 = validatePassword(password);
    const e3 = validateConfirm(confirm);

    setOtpError(e1);
    setPasswordError(e2);
    setConfirmError(e3);

    if (e1 || e2 || e3) return;

    setLoading(true);
    try {
      const res = await tcpRequest({
        type: "RESET_PASSWORD",
        email,
        otp: otp.trim(),
        password,
      });

      if (res.type === "RESET_PASSWORD_OK") {
        notify?.("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง", "success");
        goLogin?.();
      } else {
        const messages = {
          OTP_WRONG:          "รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
          OTP_EXPIRED:        "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่",
          OTP_NOT_FOUND:      "ไม่พบรหัส OTP กรุณาขอรหัสใหม่",
          PASSWORD_TOO_SHORT: "รหัสผ่านไม่เป็นไปตามเงื่อนไขที่กำหนด",
          MISSING_FIELDS:     "ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบทุกช่อง",
        };
        notify?.(messages[res.code] || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", "error");
      }
    } catch (e) {
      console.error(e);
      notify?.("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่ภายหลัง", "error");
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
          className={`input forget-input ${otpError ? "input-error" : ""}`}
          type="text"
          placeholder="OTP 6 หลัก"
          maxLength={6}
          value={otp}
          onChange={handleOtpChange}
          disabled={loading}
        />
        {otpError && <p className="field-error">{otpError}</p>}

        {/* New password */}
        <input
          className={`input forget-input ${passwordError ? "input-error" : ""}`}
          type="password"
          placeholder="รหัสผ่านใหม่"
          value={password}
          onChange={handlePasswordChange}
          disabled={loading}
        />
        {passwordError
          ? <p className="field-error">{passwordError}</p>
          : <p className="field-hint" style={{ fontSize: "0.6rem" }}>ความยาวอย่างน้อย 8 ตัวอักษร และต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว</p>
        }

        {/* Confirm password */}
        <input
          className={`input forget-input ${confirmError ? "input-error" : ""}`}
          type="password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          value={confirm}
          onChange={handleConfirmChange}
          onKeyDown={(e) => e.key === "Enter" && handleReset()}
          disabled={loading}
        />
        {confirmError && <p className="field-error">{confirmError}</p>}

        <button
          className="btn btn-pink"
          onClick={handleReset}
          disabled={loading}
        >
          {loading ? "กำลังบันทึก..." : "ยืนยัน"}
        </button>
      </div>
    </div>
  );
}
