const net = require("net");
require("dotenv").config();

const { listSeats, holdSeat, confirmSeat, releaseExpiredHolds } = require("./seatService");
const { createBooking, getBookings, getBookingDetail } = require("./bookingService");
const { sendChat, getChatHistory } = require("./chatService");
const { createPromptPayPayment, startPollingCharge } = require("./paymentService");
const { isBookingOpen } = require("./tripUtil");
const {
  registerUser,
  loginUser,
  getUserRole,
  requestPasswordReset,
  resetPassword
} = require("./authService");
const { DESTS, TIMES, bangkokNow, makeTripId } = require("./tripUtil");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 9000);

// --- clients + subscriptions
const clients = new Set();
function send(socket, obj) {
  socket.write(JSON.stringify(obj) + "\n");
}
function broadcastToTrip(tripId, obj) {
  for (const c of clients) if (c.tripId === tripId) send(c.socket, obj);
}
function broadcastToUser(userId, obj) {
  for (const c of clients) if (c.userId === userId) send(c.socket, obj);
}
function broadcastToAdmins(obj) {
  for (const c of clients) if (c.role === "ADMIN") send(c.socket, obj);
}

// ปล่อย hold หมดอายุ
setInterval(() => { releaseExpiredHolds().catch(() => {}); }, 1000);

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";

  const clientInfo = { socket, userId: null, role: "USER", tripId: null };
  clients.add(clientInfo);
  socket.on("close", () => clients.delete(clientInfo));

  socket.on("data", async (chunk) => {
    buffer += chunk;

    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      let msg;
      try { msg = JSON.parse(line); }
      catch { send(socket, { type: "ERROR", code: "BAD_JSON" }); continue; }

      try {

        // ================= AUTH =================

        if (msg.type === "REGISTER") {
          const r = await registerUser({
            name: msg.name,
            email: msg.email,
            phone: msg.phone,
            password: msg.password,
          });

          send(socket, { type: "REGISTER_OK", userId: r.userId, role: r.role });
          continue;
        }

        if (msg.type === "LOGIN") {
          const r = await loginUser({ email: msg.email, password: msg.password });

          if (!r.ok) {
            send(socket, { type: "LOGIN_FAIL", code: r.code });
            continue;
          }

          send(socket, { type: "LOGIN_OK", userId: r.userId, role: r.role });
          continue;
        }

        // 🔐 FORGOT PASSWORD (TCP)
        if (msg.type === "FORGOT_PASSWORD") {
          const r = await requestPasswordReset(msg.email);

          console.log("DEBUG requestPasswordReset result:", r);

          if (r.token) {
            console.log("===== RESET LINK =====");
            console.log(`http://localhost:3000/reset-password?token=${r.token}`);
            console.log("======================");
          }

          send(socket, { type: "FORGOT_PASSWORD_OK" });
          continue;
        }

        // 🔐 RESET PASSWORD (TCP)
        if (msg.type === "RESET_PASSWORD") {
          const r = await resetPassword(msg.token, msg.newPassword);

          if (!r.ok) {
            send(socket, { type: "RESET_PASSWORD_FAIL", code: r.code });
          } else {
            send(socket, { type: "RESET_PASSWORD_OK" });
          }
          continue;
        }

        send(socket, { type: "ERROR", code: "UNKNOWN_TYPE" });

      } catch (e) {
        send(socket, { type: "ERROR", code: "SERVER_ERROR", message: e.message });
      }
    }
  });
});

// ================= WebSocket Server =================

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {

  ws.on("message", async (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === "LOGIN") {
        const r = await loginUser({
          email: msg.email,
          password: msg.password,
        });

        if (!r.ok) {
          ws.send(JSON.stringify({
            type: "LOGIN_FAIL",
            code: r.code
          }));
        } else {
          ws.send(JSON.stringify({
            type: "LOGIN_OK",
            userId: r.userId,
            role: r.role
          }));
        }
      }

      if (msg.type === "REGISTER") {
        const r = await registerUser({
          name: msg.name,
          email: msg.email,
          phone: msg.phone,
          password: msg.password,
        });

        ws.send(JSON.stringify({
          type: "REGISTER_OK",
          userId: r.userId,
          role: r.role
        }));
      }

      // 🔐 FORGOT PASSWORD (WebSocket)
      if (msg.type === "FORGOT_PASSWORD") {
        const r = await requestPasswordReset(msg.email);

        if (r.token) {
          console.log("===== RESET LINK =====");
          console.log(`http://localhost:3000/reset-password?token=${r.token}`);
          console.log("======================");
        }

        ws.send(JSON.stringify({
          type: "FORGOT_PASSWORD_OK"
        }));
      }

      // 🔐 RESET PASSWORD (WebSocket)
      if (msg.type === "RESET_PASSWORD") {
        const r = await resetPassword(msg.token, msg.newPassword);

        if (!r.ok) {
          ws.send(JSON.stringify({
            type: "RESET_PASSWORD_FAIL",
            code: r.code
          }));
        } else {
          ws.send(JSON.stringify({
            type: "RESET_PASSWORD_OK"
          }));
        }
      }

    } catch (err) {
      ws.send(JSON.stringify({
        type: "ERROR",
        message: err.message
      }));
    }
  });
});

console.log("WebSocket server running on ws://localhost:8080");

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TCP server listening on ${PORT}`);
});