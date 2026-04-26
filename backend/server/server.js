const net = require("net");
require("dotenv").config();

const { sendPasswordResetEmail } = require("./emailService");

// เก็บ OTP ใน Memory  { email → { otp, expiresAt } }
const otpStore = new Map();

const { listSeats, holdSeat, confirmSeat, releaseExpiredHolds, ensureTripSeats, } = require("./seatService");
const { createBooking, getBookings, getBookingDetail } = require("./bookingService");
const { sendChat, getChatHistory, getAdminChatList } = require("./chatService");
const {
  createManualPromptPayQR,
  submitPaymentSlip,
  getPendingPayments,
  getPaymentSlipData,
  approvePayment,
  rejectPayment
} = require("./paymentService");
const {
  getAdminSeats,
} = require("./adminService");
const { isBookingOpen } = require("./tripUtil");
const { registerUser, loginUser, updateUserProfile, getUserRole } = require("./authService");
const { DESTS, TIMES, bangkokNow, makeTripId } = require("./tripUtil");
const { sendPasswordResetEmail } = require("./emailService");//test
const nodemailer = require("nodemailer");//test

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
setInterval(() => { releaseExpiredHolds().catch(() => { }); }, 1000);

const server = net.createServer((socket) => {

  socket.on("error", (err) => {
    console.log("Client socket error:", err.code || err.message);
  });

  socket.on("close", () => {
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
      try {
        msg = JSON.parse(line);
      } catch {
        send(socket, { type: "ERROR", code: "BAD_JSON" });
        continue;
      }

      try {
        const normalizeUserId = (v) => {
          if (v === null || v === undefined) return null;
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };

        const requestedUserId = normalizeUserId(msg.userId);
        const sessionUserId = normalizeUserId(clientInfo.userId);

        if (sessionUserId != null && requestedUserId != null && requestedUserId !== sessionUserId) {
          send(socket, {
            type: "ERROR",
            code: "USER_MISMATCH",
            requestId: msg.requestId,
          });
          continue;
        }

        // actor คือ session เป็นหลัก ถ้าไม่มี session ค่อยใช้ requested
        const actorUserId = sessionUserId ?? requestedUserId;


        // ---- session / subscribe
        if (msg.type === "HELLO") {
          const uid = normalizeUserId(msg.userId);
          if (uid == null) {
            send(socket, { type: "HELLO_FAIL", code: "BAD_USER_ID", requestId: msg.requestId });
            continue;
          }

          clientInfo.userId = uid;

          const wantAdmin = msg.role === "ADMIN";
          const hasValidAdminKey =
            wantAdmin &&
            msg.adminKey &&
            msg.adminKey === process.env.ADMIN_KEY;

          // ถ้า login มาเป็น ADMIN อยู่แล้ว ให้คง role เดิมไว้
          if (clientInfo.role === "ADMIN") {
            // keep ADMIN
          } else if (hasValidAdminKey) {
            clientInfo.role = "ADMIN";
          } else {
            clientInfo.role = "USER";
          }

          send(socket, {
            type: "HELLO_OK",
            userId: uid,
            role: clientInfo.role,
            isAdmin: clientInfo.role === "ADMIN",
            requestId: msg.requestId,
          });
          continue;
        }

        if (msg.type === "SIGN_UP") {
          const r = await registerUser({
            name: msg.name,
            email: msg.email,
            phone: msg.phone,
            password: msg.password,
          });

          clientInfo.userId = Number(r.userId);
          clientInfo.role = r.role;

          send(socket, { type: "SIGN_UP_OK", userId: clientInfo.userId, role: clientInfo.role });
          continue;
        }

        const reply = (obj) => send(socket, { ...obj, requestId: msg.requestId });

        if (msg.type === "SIGN_IN") {
          const r = await loginUser({ email: msg.email, password: msg.password });

          if (!r.ok) {
            send(socket, { type: "SIGN_IN_FAIL", code: r.code });
            continue;
          }

          clientInfo.userId = Number(r.userId);
          clientInfo.role = r.role;

          send(socket, {
            type: "SIGN_IN_OK",
            userId: clientInfo.userId,
            role: clientInfo.role,
            name: r.name,
            phone: r.phone,
            email: r.email,
          });
          continue;
        }

        if (msg.type === "UPDATE_PROFILE") {
          if (actorUserId == null) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const r = await updateUserProfile({
            userId: actorUserId,
            name: msg.name,
            phone: msg.phone,
          });

          if (!r.ok) {
            reply({ type: "UPDATE_PROFILE_FAIL", code: r.code });
            continue;
          }

          reply({
            type: "UPDATE_PROFILE_OK",
            userId: r.userId,
            name: r.name,
            phone: r.phone,
            email: r.email,
            role: r.role,
          });
          continue;
        }

        // ---- forgot password
        if (msg.type === "FORGOT_PASSWORD") {
          const email = (msg.email || "").trim().toLowerCase();

          if (!email) {
            reply({ type: "FORGOT_PASSWORD_FAIL", code: "NO_EMAIL" });
            continue;
          }

          try {
            const { pool } = require("./db");

            // เช็คว่า email มีในระบบไหม
            const { rows } = await pool.query(
              `SELECT user_id, name FROM app_user WHERE LOWER(email) = $1`,
              [email]
            );

            if (rows.length === 0) {
              // ไม่บอกว่าไม่มี email เพื่อความปลอดภัย
              reply({ type: "FORGOT_PASSWORD_OK" });
              continue;
            }

            const user = rows[0];

            // สร้าง OTP 6 หลัก
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

            // เก็บใน Map
            otpStore.set(email, { otp, expiresAt, userId: user.user_id });

            // ส่งอีเมล
            await sendPasswordResetEmail(email, otp, user.name);

            console.log(`OTP sent to ${email}: ${otp}`);
            reply({ type: "FORGOT_PASSWORD_OK" });

          } catch (err) {
            console.error("FORGOT_PASSWORD error:", err);
            reply({ type: "FORGOT_PASSWORD_FAIL", code: "SERVER_ERROR" });
          }

          continue;
        }

        // ---- reset password (กรอก OTP + password ใหม่)
        if (msg.type === "RESET_PASSWORD") {
          const email = (msg.email || "").trim().toLowerCase();
          const otp = (msg.otp || "").trim();
          const password = (msg.password || "").trim();

          if (!email || !otp || !password) {
            reply({ type: "RESET_PASSWORD_FAIL", code: "MISSING_FIELDS" });
            continue;
          }

          if (password.length < 8) {
            reply({ type: "RESET_PASSWORD_FAIL", code: "PASSWORD_TOO_SHORT" });
            continue;
          }

          const record = otpStore.get(email);

          if (!record) {
            reply({ type: "RESET_PASSWORD_FAIL", code: "OTP_NOT_FOUND" });
            continue;
          }

          if (new Date() > record.expiresAt) {
            otpStore.delete(email);
            reply({ type: "RESET_PASSWORD_FAIL", code: "OTP_EXPIRED" });
            continue;
          }

          if (record.otp !== otp) {
            reply({ type: "RESET_PASSWORD_FAIL", code: "OTP_WRONG" });
            continue;
          }

          try {
            const crypto = require("crypto");
            const { pool } = require("./db");

            // Hash password ใหม่ (ใช้วิธีเดียวกับ authService.js)
            const salt = crypto.randomBytes(16).toString("hex");
            const hash = crypto
              .pbkdf2Sync(password, salt, 120000, 32, "sha256")
              .toString("hex");
            const passwordHash = `pbkdf2$120000$${salt}$${hash}`;

            await pool.query(
              `UPDATE app_user SET password_hash = $1 WHERE user_id = $2`,
              [passwordHash, record.userId]
            );

            // ลบ OTP ออกจาก Map ทันที ใช้ได้ครั้งเดียว
            otpStore.delete(email);

            console.log(`Password reset success for userId: ${record.userId}`);
            reply({ type: "RESET_PASSWORD_OK" });

          } catch (err) {
            console.error("RESET_PASSWORD error:", err);
            reply({ type: "RESET_PASSWORD_FAIL", code: "SERVER_ERROR" });
          }

          continue;
        }

        if (msg.type === "SUBSCRIBE_TRIP") {
          clientInfo.tripId = msg.tripId || null;
          send(socket, { type: "SUBSCRIBE_OK", tripId: clientInfo.tripId });
          continue;
        }

        if (msg.type === "GET_TODAY_TRIPS") {
          const now = bangkokNow();

          const trips = [];
          for (const dest of DESTS) {
            for (const t of TIMES) {
              const tripId = makeTripId(now, dest, t);

              trips.push({
                tripId,
                dest,
                hhmm: t,
              });
            }
          }

          reply({
            type: "TODAY_TRIPS",
            date: now.toISOString(),
            trips,
          });
          continue;
        }

        // ---- seat
        if (msg.type === "LIST_SEATS") {
          const seats = await listSeats(msg.tripId);
          reply({ type: "SEATS", tripId: msg.tripId, seats });
          continue;
        }

        if (msg.type === "HOLD") {
          if (actorUserId == null) {
            send(socket, { type: "HOLD_FAIL", tripId: msg.tripId, code: "AUTH_REQUIRED" });
            continue;
          }
          const open = isBookingOpen(msg.tripId);
          if (!open.ok) {
            send(socket, { type: "HOLD_FAIL", tripId: msg.tripId, code: open.code });
            continue;
          }

          const r = await holdSeat(msg.tripId, msg.seat, actorUserId);
          if (r.ok) {
            reply({
              type: "HOLD_OK",
              tripId: msg.tripId,
              seat: msg.seat,
              holdToken: r.holdToken,
              expiresInSec: r.expiresInSec
            });

            broadcastToTrip(msg.tripId, {
              type: "EVENT_SEAT_UPDATE",
              tripId: msg.tripId,
              seat: msg.seat,
              status: "HELD"
            });
          } else {
            reply({ type: "HOLD_FAIL", tripId: msg.tripId, code: r.code });
          }
          continue;
        }

        if (msg.type === "CONFIRM") {
          if (actorUserId == null) {
            send(socket, { type: "CONFIRM_FAIL", tripId: msg.tripId, code: "AUTH_REQUIRED" });
            continue;
          }

          const r = await confirmSeat(msg.tripId, msg.holdToken, actorUserId);
          if (r.ok) {
            reply({ type: "CONFIRM_OK", tripId: msg.tripId, seat: r.seatId });

            broadcastToTrip(msg.tripId, {
              type: "EVENT_SEAT_UPDATE",
              tripId: msg.tripId,
              seat: r.seatId,
              status: "BOOKED"
            });
          } else {
            reply({ type: "CONFIRM_FAIL", tripId: msg.tripId, code: r.code });
          }
          continue;
        }

        // ---- booking
        if (msg.type === "CREATE_BOOKING") {
          if (actorUserId == null) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const open = isBookingOpen(msg.tripId);
          if (!open.ok) {
            reply({ type: "ERROR", code: open.code });
            continue;
          }

          try {
            const totalPriceSatang = Math.round(Number(msg.totalPriceBaht) * 100);
            const r = await createBooking({
              userId: actorUserId,
              tripId: msg.tripId,
              seats: msg.seats,
              totalPriceSatang,
              holdTokens: msg.holdTokens || {},
            });

            reply({
              type: "CREATE_BOOKING_OK",
              bookingId: r.bookingId,
              status: r.status,
              amount: totalPriceSatang,
            });

            broadcastToUser(actorUserId, {
              type: "EVENT_BOOKING",
              bookingId: r.bookingId,
              status: r.status,
            });
          } catch (e) {
            console.error("CREATE_BOOKING error:", e);
            reply({ type: "ERROR", code: "CREATE_BOOKING_FAILED", message: e.message });
          }

          continue;
        }

        if (msg.type === "GET_BOOKINGS") {
          if (!actorUserId) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }
          const rows = await getBookings(actorUserId);
          reply({ type: "BOOKINGS", bookings: rows });
          continue;
        }

        if (msg.type === "GET_BOOKING_DETAIL") {
          if (actorUserId == null) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const detail = await getBookingDetail(msg.bookingId);
          if (!detail) {
            reply({ type: "ERROR", code: "NO_BOOKING" });
            continue;
          }

          if (clientInfo.role !== "ADMIN" && Number(detail.user_id) !== Number(actorUserId)) {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          reply({ type: "BOOKING_DETAIL", detail });
          continue;
        }
        // ---- auth
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

        if (msg.type === "ADMIN_CHAT_LIST") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          const rows = await getAdminChatList();
          reply({ type: "ADMIN_CHAT_LIST_OK", chats: rows });
          continue;
        }

        if (msg.type === "ADMIN_CHAT_HISTORY") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          const targetUserId = normalizeUserId(msg.targetUserId);
          if (targetUserId == null) {
            reply({ type: "ERROR", code: "BAD_USER_ID" });
            continue;
          }

          const rows = await getChatHistory(targetUserId, msg.limit || 50);
          reply({ type: "ADMIN_CHAT_HISTORY_OK", userId: targetUserId, messages: rows });
          continue;
        }

        // ---- chat realtime
        if (msg.type === "CHAT_SEND") {
          if (!actorUserId) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const targetUserId =
            clientInfo.role === "ADMIN"
              ? normalizeUserId(msg.targetUserId)
              : actorUserId;

          if (!targetUserId) {
            reply({ type: "ERROR", code: "BAD_USER_ID" });
            continue;
          }

          const sender = clientInfo.role === "ADMIN" ? "ADMIN" : "USER";

          const r = await sendChat({
            userId: targetUserId,
            sender,
            message: msg?.message,
          });

          broadcastToUser(targetUserId, {
            type: "EVENT_CHAT",
            userId: targetUserId,
            sender,
            message: msg.message,
            createdAt: r.createdAt,
          });

          broadcastToAdmins({
            type: "EVENT_CHAT",
            userId: targetUserId,
            sender,
            message: msg.message,
            createdAt: r.createdAt,
          });

          reply({
            type: "CHAT_SEND_OK",
            chatId: r.chatId,
            userId: targetUserId,
          });
          continue;
        }

        if (msg.type === "CHAT_HISTORY") {
          if (!actorUserId) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const rows = await getChatHistory(actorUserId, msg.limit || 50);
          reply({ type: "CHAT_HISTORY_OK", userId: actorUserId, messages: rows });
          continue;
        }
        if (msg.type === "PAYMENT_CREATE_PROMPTPAY") {
          if (actorUserId == null) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const r = await createManualPromptPayQR({
            bookingId: msg.bookingId,
            userId: actorUserId,
          });

          if (!r.ok) {
            reply({ type: "PAYMENT_FAIL", code: r.code });
            continue;
          }

          reply({
            type: "PAYMENT_QR",
            bookingId: r.bookingId,
            amountBaht: r.amountBaht,
            qrUri: r.qrUri,
          });

          continue;
        }

        if (msg.type === "SUBMIT_PAYMENT_SLIP") {
          if (actorUserId == null) {
            reply({ type: "ERROR", code: "AUTH_REQUIRED" });
            continue;
          }

          const r = await submitPaymentSlip({
            bookingId: msg.bookingId,
            userId: actorUserId,
            transferredAt: msg.transferredAt,
            slipBase64: msg.slipBase64,
            slipFileName: msg.slipFileName,
          });

          if (!r.ok) {
            reply({ type: "SUBMIT_PAYMENT_SLIP_FAIL", code: r.code });
            continue;
          }

          reply({
            type: "SUBMIT_PAYMENT_SLIP_OK",
            bookingId: msg.bookingId,
            paymentId: r.paymentId,
            slipImagePath: r.slipImagePath,
          });

          broadcastToAdmins({
            type: "EVENT_PAYMENT_VERIFY_REQUIRED",
            bookingId: msg.bookingId,
          });

          continue;
        }

        if (msg.type === "ADMIN_GET_PENDING_PAYMENTS") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          const rows = await getPendingPayments();
          reply({ type: "PENDING_PAYMENTS", payments: rows });
          continue;
        }

        if (msg.type === "ADMIN_GET_PAYMENT_SLIP") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          const r = await getPaymentSlipData({
            paymentId: msg.paymentId,
          });

          if (!r.ok) {
            reply({ type: "ADMIN_GET_PAYMENT_SLIP_FAIL", code: r.code });
            continue;
          }

          reply({
            type: "ADMIN_PAYMENT_SLIP",
            paymentId: r.paymentId,
            dataUrl: r.dataUrl,
          });
          continue;
        }

        if (msg.type === "ADMIN_APPROVE_PAYMENT") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          const r = await approvePayment({
            bookingId: msg.bookingId,
            adminUserId: actorUserId,
          });

          if (!r.ok) {
            reply({ type: "ADMIN_APPROVE_PAYMENT_FAIL", code: r.code });
            continue;
          }

          reply({ type: "ADMIN_APPROVE_PAYMENT_OK", bookingId: msg.bookingId });
          continue;
        }

        if (msg.type === "ADMIN_REJECT_PAYMENT") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }

          const r = await rejectPayment({
            bookingId: msg.bookingId,
            adminUserId: actorUserId,
            reason: msg.reason,
          });

          if (!r.ok) {
            reply({ type: "ADMIN_REJECT_PAYMENT_FAIL", code: r.code });
            continue;
          }

          const detail = await getBookingDetail(msg.bookingId);
          if (detail?.user_id) {
            broadcastToUser(detail.user_id, {
              type: "EVENT_PAYMENT",
              bookingId: msg.bookingId,
              status: "REJECTED",
            });
          }

          broadcastToAdmins({
            type: "EVENT_PAYMENT",
            bookingId: msg.bookingId,
            status: "REJECTED",
          });

          reply({ type: "ADMIN_REJECT_PAYMENT_OK", bookingId: msg.bookingId });
          continue;
        }

        if (msg.type === "ADMIN_GET_SEATS") {
          if (clientInfo.role !== "ADMIN") {
            reply({ type: "ERROR", code: "FORBIDDEN" });
            continue;
          }
          if (!msg.tripId) {
            reply({ type: "ERROR", code: "MISSING_TRIP_ID" });
            continue;
          }
          try {
            await ensureTripSeats(msg.tripId);
            const seats = await getAdminSeats(msg.tripId);
            reply({ type: "ADMIN_GET_SEATS_OK", seats });
          } catch (err) {
            console.error("ADMIN_GET_SEATS error:", err);
            reply({ type: "ERROR", code: "DB_ERROR", message: err.message });
          }
          continue;
        }

        send(socket, { type: "ERROR", code: "UNKNOWN_TYPE" });
      } catch (e) {
        console.error("SERVER_ERROR while handling message:", msg, e);
        send(socket, {
          type: "ERROR",
          code: "SERVER_ERROR",
          message: e.message,
          requestId: msg?.requestId,
        });
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`TCP server listening on ${PORT}`);
});

