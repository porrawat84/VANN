const net = require("net");
require("dotenv").config();

const { listSeats, holdSeat, confirmSeat, releaseExpiredHolds } = require("./seatService");
const { createBooking, getBookings, getBookingDetail } = require("./bookingService");
const { sendChat, getChatHistory } = require("./chatService");
const { createPromptPayPayment, startPollingCharge } = require("./paymentService");
const { isBookingOpen } = require("./tripUtil");

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
        // ---- session / subscribe
        if (msg.type === "HELLO") {
          clientInfo.userId = msg.userId || null;
          
          const wantAdmin = msg.role === "ADMIN";
          const okAdmin = wantAdmin && msg.adminKey && msg.adminKey === process.env.ADMIN_KEY;

          clientInfo.role = okAdmin ? "ADMIN" : "USER";
          send(socket, { type: "HELLO_OK", role: clientInfo.role, isAdmin: clientInfo.role === "ADMIN" });
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
          const open = isBookingOpen(msg.tripId);
          if (!open.ok) {
            send(socket, { type: "HOLD_FAIL", code: open.code });
            continue;
          }
          const r = await holdSeat(msg.tripId, msg.seat, msg.userId);
          if (r.ok) {
            send(socket, { type: "HOLD_OK", tripId: msg.tripId, seat: msg.seat, holdToken: r.holdToken, expiresInSec: r.expiresInSec });
            broadcastToTrip(msg.tripId, { type: "EVENT_SEAT_UPDATE", tripId: msg.tripId, seat: msg.seat, status: "HELD" });
          } else {
            send(socket, { type: "HOLD_FAIL", code: r.code });
          }
          continue;
        }

        if (msg.type === "CONFIRM") {
          const r = await confirmSeat(msg.tripId, msg.holdToken, msg.userId);
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
          const open = isBookingOpen(msg.tripId);
          if (!open.ok) {
            send(socket, { type: "ERROR", code: open.code });
            continue;
          }
          const totalPriceSatang = Math.round(Number(msg.totalPriceBaht) * 100);
          const r = await createBooking({
            userId: msg.userId,
            tripId: msg.tripId,
            seats: msg.seats,
            totalPriceSatang,
          });
          send(socket, { type: "CREATE_BOOKING_OK", bookingId: r.bookingId, status: r.status, amount: totalPriceSatang });
          broadcastToUser(msg.userId, { type: "EVENT_BOOKING", bookingId: r.bookingId, status: r.status });
          continue;
        }

        if (msg.type === "GET_BOOKINGS") {
          const rows = await getBookings(msg.userId);
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
          const r = await sendChat({ userId: msg.userId, sender: msg.sender, message: msg.message });

          // push realtime to user + admins
          broadcastToUser(msg.userId, {
            type: "EVENT_CHAT",
            userId: msg.userId,
            sender: msg.sender,
            message: msg.message,
            createdAt: r.createdAt,
          });
          broadcastToAdmins({
            type: "EVENT_CHAT",
            userId: msg.userId,
            sender: msg.sender,
            message: msg.message,
            createdAt: r.createdAt,
          });

          send(socket, { type: "CHAT_SEND_OK", chatId: r.chatId });
          continue;
        }

        if (msg.type === "CHAT_HISTORY") {
          const rows = await getChatHistory(msg.userId, msg.limit || 50);
          send(socket, { type: "CHAT_HISTORY_OK", userId: msg.userId, messages: rows });
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

