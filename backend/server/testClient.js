/**
 * testClient.js
 * ทดสอบ Admin features ผ่าน TCP
 * วิธีใช้: node testClient.js [command]
 *
 * commands:
 *   seats    → ADMIN_GET_SEATS
 *   pending  → ADMIN_GET_PENDING_PAYMENTS
 *   approve  → ADMIN_APPROVE_PAYMENT
 *   reject   → ADMIN_REJECT_PAYMENT
 *   slip     → ADMIN_GET_PAYMENT_SLIP
 *   chatlist → ADMIN_CHAT_LIST
 *   history  → ADMIN_CHAT_HISTORY
 */

const net = require("net");
require("dotenv").config();

const HOST = process.env.VANN_SERVER_HOST || "127.0.0.1";
const PORT = Number(process.env.VANN_SERVER_PORT || 9000);

// ──────────────────────────────────────────────
// รับ command จาก args (default: seats)
// ──────────────────────────────────────────────
const CMD = process.argv[2] || "seats";

// ──────────────────────────────────────────────
// สร้าง tripId วันนี้ (Bangkok)
// ──────────────────────────────────────────────
function todayTripId(time = "10:00") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}_${time}_BKK-RS`;
}

// ──────────────────────────────────────────────
// ข้อความทดสอบแต่ละ command
// ──────────────────────────────────────────────
const TEST_CASES = {
  seats: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_GET_SEATS", tripId: todayTripId("10:00") },
  ],

  pending: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_GET_PENDING_PAYMENTS" },
  ],

  approve: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_APPROVE_PAYMENT", bookingId: 1 },   // ← เปลี่ยน bookingId
  ],

  reject: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_REJECT_PAYMENT", bookingId: 1, reason: "สลิปไม่ชัด" },
  ],

  slip: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_GET_PAYMENT_SLIP", paymentId: 1 },  // ← เปลี่ยน paymentId
  ],

  chatlist: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_CHAT_LIST" },
  ],

  history: [
    { type: "HELLO", userId: 1, role: "ADMIN", adminKey: "1234" },
    { type: "ADMIN_CHAT_HISTORY", targetUserId: 2 },   // ← เปลี่ยน userId
  ],
};

const messages = TEST_CASES[CMD];
if (!messages) {
  console.error(`❌ ไม่รู้จัก command: "${CMD}"`);
  console.error("commands ที่ใช้ได้:", Object.keys(TEST_CASES).join(", "));
  process.exit(1);
}

// ──────────────────────────────────────────────
// เชื่อมต่อ TCP แล้วส่งทีละ message
// ──────────────────────────────────────────────
let msgIndex = 0;
let buffer = "";

const client = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log(`\n🔌 เชื่อมต่อ ${HOST}:${PORT} สำเร็จ`);
  console.log(`📤 กำลังทดสอบ: ${CMD}\n`);
  sendNext();
});

client.setEncoding("utf8");

client.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;

    try {
      const msg = JSON.parse(line);

      // ซ่อน dataUrl ถ้ายาวเกินไป
      if (msg.dataUrl && msg.dataUrl.length > 80) {
        msg.dataUrl = msg.dataUrl.slice(0, 60) + "...[truncated]";
      }

      console.log("📥 SERVER:", JSON.stringify(msg, null, 2));

      // ส่ง message ถัดไป
      if (msgIndex < messages.length) {
        sendNext();
      } else {
        console.log("\n✅ ทดสอบเสร็จ");
        client.end();
      }
    } catch {
      console.error("❌ JSON parse error:", line);
    }
  }
});

client.on("error", (err) => {
  console.error("❌ TCP error:", err.message);
});

client.on("close", () => {
  console.log("🔌 ปิดการเชื่อมต่อแล้ว\n");
});

function sendNext() {
  if (msgIndex >= messages.length) return;
  const msg = { ...messages[msgIndex], requestId: `req-${msgIndex}` };
  msgIndex++;
  console.log("📤 SEND:", JSON.stringify(msg));
  client.write(JSON.stringify(msg) + "\n");
}
