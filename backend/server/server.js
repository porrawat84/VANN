const net = require("net");
require("dotenv").config();

const { listSeats, holdSeat, confirmSeat, releaseExpiredHolds } = require("./seatService");
const { createBooking, getBookings, getBookingDetail } = require("./bookingService");
const { sendChat, getChatHistory } = require("./chatService");
const { createPromptPayPayment, startPollingCharge } = require("./paymentService");
const { isBookingOpen } = require("./tripUtil");
const { signUp, signIn } = require("./authService");

const PORT = Number(process.env.PORT || 9000);

// --- clients + subscriptions
const clients = new Set(); // { socket, userId, role, tripId }
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
  console.log("Client connected:", socket.remoteAddress, socket.remotePort);

  socket.on("error", (err) => {
    console.log("Client socket error:", err.code || err.message);
  });

  socket.on("close", () => {
    console.log("Client disconnected:", socket.remoteAddress, socket.remotePort);
  });
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
        const requestedUserId = msg.userId != null ? String(msg.userId) : null;
        const sessionUserId = clientInfo.userId != null ? String(clientInfo.userId) : null;

        if (requestedUserId && sessionUserId && requestedUserId !== sessionUserId) {
          send(socket, { type: "ERROR", code: "USER_MISMATCH" });
          continue;
        }

        const actorUserId = sessionUserId || requestedUserId;

        // ---- session / subscribe
        if (msg.type === "HELLO") {
          clientInfo.userId = requestedUserId;
          
          const wantAdmin = msg.role === "ADMIN";
          const okAdmin = wantAdmin && msg.adminKey && msg.adminKey === process.env.ADMIN_KEY;

          clientInfo.role = okAdmin ? "ADMIN" : "USER";
          send(socket, { type: "HELLO_OK", userId: clientInfo.userId, role: clientInfo.role, isAdmin: clientInfo.role === "ADMIN" });
          continue;
        }

        if (msg.type === "SIGN_UP") {
          const result = await signUp({
            name: msg.name,
            phone: msg.phone,
            email: msg.email,
            password: msg.password,
          });

          if (!result.ok) {
            send(socket, { type: "SIGN_UP_FAIL", code: result.code });
            continue;
          }

          clientInfo.userId = result.user.userId;
          clientInfo.role = result.user.role;
          send(socket, { type: "SIGN_UP_OK", user: result.user });
          continue;
        }

        if (msg.type === "SIGN_IN") {
          const result = await signIn({ email: msg.email, password: msg.password });

          if (!result.ok) {
            send(socket, { type: "SIGN_IN_FAIL", code: result.code });
            continue;
          }

          clientInfo.userId = result.user.userId;
          clientInfo.role = result.user.role;
          send(socket, { type: "SIGN_IN_OK", user: result.user });
          continue;
        }
        if (msg.type === "SUBSCRIBE_TRIP") {
          clientInfo.tripId = msg.tripId || null;
          send(socket, { type: "SUBSCRIBE_OK", tripId: clientInfo.tripId });
          continue;
        }

        // ---- seat
        if (msg.type === "LIST_SEATS") {
          const seats = await listSeats(msg.tripId);
          send(socket, { type: "SEATS", tripId: msg.tripId, seats });
          continue;
        }

        if (msg.type === "HOLD") {
          if (!actorUserId) {
            send(socket, { type: "HOLD_FAIL", code: "AUTH_REQUIRED" });
            continue;
          }
          const open = isBookingOpen(msg.tripId);
          if (!open.ok) {
            send(socket, { type: "HOLD_FAIL", code: open.code });
            continue;
          }
          const r = await holdSeat(msg.tripId, msg.seat, actorUserId);
          if (r.ok) {
            send(socket, { type: "HOLD_OK", tripId: msg.tripId, seat: msg.seat, holdToken: r.holdToken, expiresInSec: r.expiresInSec });
            broadcastToTrip(msg.tripId, { type: "EVENT_SEAT_UPDATE", tripId: msg.tripId, seat: msg.seat, status: "HELD" });
          } else {
            send(socket, { type: "HOLD_FAIL", code: r.code });
          }
          continue;
        }

        if (msg.type === "CONFIRM") {
          if (!actorUserId) {
            send(socket, { type: "CONFIRM_FAIL", code: "AUTH_REQUIRED" });
            continue;
          }
          const r = await confirmSeat(msg.tripId, msg.holdToken, actorUserId);
          if (r.ok) {
            send(socket, { type: "CONFIRM_OK", tripId: msg.tripId, seat: r.seatId });
            broadcastToTrip(msg.tripId, { type: "EVENT_SEAT_UPDATE", tripId: msg.tripId, seat: r.seatId, status: "BOOKED" });
          } else {
            send(socket, { type: "CONFIRM_FAIL", code: r.code });
          }
          continue;
        }

        // ---- booking
        if (msg.type === "CREATE_BOOKING") {
          if (!actorUserId) {
            send(socket, { type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }
          const open = isBookingOpen(msg.tripId);
          if (!open.ok) {
            send(socket, { type: "ERROR", code: open.code });
            continue;
          }
          const totalPriceSatang = Math.round(Number(msg.totalPriceBaht) * 100);
          const r = await createBooking({
            userId: actorUserId,
            tripId: msg.tripId,
            seats: msg.seats,
            totalPriceSatang,
          });
          send(socket, { type: "CREATE_BOOKING_OK", bookingId: r.bookingId, status: r.status, amount: totalPriceSatang });
          broadcastToUser(actorUserId, { type: "EVENT_BOOKING", bookingId: r.bookingId, status: r.status });
          continue;
        }

        if (msg.type === "GET_BOOKINGS") {
          if (!actorUserId) {
            send(socket, { type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }
          const rows = await getBookings(actorUserId);
          send(socket, { type: "BOOKINGS", bookings: rows });
          continue;
        }

        if (msg.type === "GET_BOOKING_DETAIL") {
          const detail = await getBookingDetail(msg.bookingId);
          if (!detail) send(socket, { type: "ERROR", code: "NO_BOOKING" });
          else send(socket, { type: "BOOKING_DETAIL", detail });
          continue;
        }

        // ---- chat realtime
        if (msg.type === "CHAT_SEND") {
          if (!actorUserId) {
            send(socket, { type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }
          const r = await sendChat({ userId: actorUserId, sender: msg.sender, message: msg.message });

          // push realtime to user + admins
          broadcastToUser(actorUserId, {
            type: "EVENT_CHAT",
            userId: actorUserId,
            sender: msg.sender,
            message: msg.message,
            createdAt: r.createdAt,
          });
          broadcastToAdmins({
            type: "EVENT_CHAT",
            userId: actorUserId,
            sender: msg.sender,
            message: msg.message,
            createdAt: r.createdAt,
          });

          send(socket, { type: "CHAT_SEND_OK", chatId: r.chatId });
          continue;
        }

        if (msg.type === "CHAT_HISTORY") {
          if (!actorUserId) {
            send(socket, { type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }
          const rows = await getChatHistory(actorUserId, msg.limit || 50);
          send(socket, { type: "CHAT_HISTORY_OK", userId: actorUserId, messages: rows });
          continue;
        }

        // ---- payment (HTTPS to Opn, but internal comm stays TCP)
        if (msg.type === "PAYMENT_CREATE_PROMPTPAY") {
          const r = await createPromptPayPayment({ bookingId: msg.bookingId });
          if (!r.ok) {
            send(socket, { type: "PAYMENT_FAIL", code: r.code });
            continue;
          }

          // ส่ง QR กลับไป
          send(socket, { type: "PAYMENT_QR", bookingId: r.bookingId, paymentId: r.paymentId, amount: r.amount, qrUri: r.qrUri });

          // realtime push ให้ user ด้วย (เผื่อหลายหน้าต่าง)
          broadcastToUser(r.userId, { type: "EVENT_PAYMENT", bookingId: r.bookingId, status: "PENDING", amount: r.amount, qrUri: r.qrUri });

          // เริ่ม polling อัตโนมัติ
          startPollingCharge({
            chargeId: r.chargeId,
            bookingId: r.bookingId,
            paymentId: r.paymentId,
            onPaid: () => {
              broadcastToUser(r.userId, { type: "EVENT_PAYMENT", bookingId: r.bookingId, status: "PAID", amount: r.amount });
              broadcastToAdmins({ type: "EVENT_PAYMENT", bookingId: r.bookingId, status: "PAID", amount: r.amount, userId: r.userId });
              broadcastToTrip(r.tripId, { type: "EVENT_BOOKING", bookingId: r.bookingId, status: "CONFIRMED" });
            },
            onFail: (reason) => {
              broadcastToUser(r.userId, { type: "EVENT_PAYMENT", bookingId: r.bookingId, status: reason, amount: r.amount });
            },
          });

          continue;
        }

        send(socket, { type: "ERROR", code: "UNKNOWN_TYPE" });
      } catch (e) {
        send(socket, { type: "ERROR", code: "SERVER_ERROR", message: e.message });
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TCP server listening on ${PORT}`);
});

