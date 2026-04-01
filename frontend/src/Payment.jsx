import "./cssPayment.css";

function destLabel(dest) {
  if (dest === "FP") return "future park rangsit";
  if (dest === "MC") return "mo chit";
  if (dest === "VM") return "victory monument";
  return "-";
}

function formatHHMMLabel(hhmm) {
  const map = {
    "1000": "10:00 am",
    "1100": "11:00 am",
    "1200": "12:00 pm",
    "1300": "1:00 pm",
    "1400": "2:00 pm",
    "1500": "3:00 pm",
    "1600": "4:00 pm",
    "1700": "5:00 pm",
  };
  return map[hhmm] || hhmm || "-";
}

function formatCountdown(sec) {
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Payment({
  open,
  onClose,
  qrUri,
  amountBaht,
  secondsLeft,
  seats,
  dest,
  hhmm,
  username,
  phone,
}) {
  if (!open) return null;

  return (
    <div className="payment-overlay">
      <div className="payment-card">
        <button className="payment-close" onClick={onClose}>×</button>

        <div className="payment-logo">PromptPay</div>

        <div className="payment-qr-wrap">
          {qrUri ? (
            <img src={qrUri} alt="PromptPay QR" className="payment-qr" />
          ) : (
            <div className="payment-qr-placeholder">loading...</div>
          )}
        </div>

        <div className="payment-info">
          <p><b>username :</b> {username}</p>
          <p><b>seat :</b> {seats.join(", ")}</p>
          <p><b>time :</b> {formatHHMMLabel(hhmm)}</p>
          <p><b>phone :</b> {phone}</p>
          <p><b>destination :</b> {destLabel(dest)}</p>
          <p><b>price :</b> {Number(amountBaht).toFixed(2)} baht</p>
        </div>

        <p className="payment-pending">payment pending {formatCountdown(secondsLeft)}</p>
      </div>
    </div>
  );
}