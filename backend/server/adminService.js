/**
 * adminService.js
 * รวม logic ฝั่ง Admin ทั้งหมดไว้ที่เดียว
 */

const { pool } = require("./db");
const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────
// 1. ADMIN_GET_SEATS
//    ดึงข้อมูลที่นั่งทั้งหมดของ trip พร้อมข้อมูลผู้จอง
// ─────────────────────────────────────────────────────────
async function getAdminSeats(tripId) {
  const { rows } = await pool.query(
    `
    SELECT
      s.seat_id,
      s.seat_number,
      ss.status          AS seat_status,
      u.name,
      u.phone,
      b.total_price,
      p.status           AS payment_status,
      p.payment_id
    FROM seat_status ss
    JOIN seat s
      ON s.seat_id = ss.seat_id
    LEFT JOIN booking_seat bs
      ON bs.seat_id = s.seat_id
    LEFT JOIN booking b
      ON  b.booking_id = bs.booking_id
      AND b.trip_id    = ss.trip_id        -- ← กรอง booking ของ trip นี้เท่านั้น
      AND b.status NOT IN ('CANCELLED', 'PAYMENT_REJECTED')
    LEFT JOIN app_user u
      ON u.user_id = b.user_id
    LEFT JOIN payment p
      ON p.booking_id = b.booking_id
    WHERE ss.trip_id = $1
    ORDER BY s.seat_number
    `,
    [tripId]
  );

  return rows;
}

// ─────────────────────────────────────────────────────────
// 2. ADMIN_GET_PENDING_PAYMENTS
//    ดึง payment ที่รอ verify ทั้งหมด
// ─────────────────────────────────────────────────────────
async function getPendingPayments() {
  const { rows } = await pool.query(
    `
    SELECT
      p.payment_id,
      p.booking_id,
      p.amount,
      p.status           AS payment_status,
      p.transferred_at,
      p.submitted_at,
      p.slip_image_path,
      p.reject_reason,
      b.user_id,
      b.trip_id,
      b.status           AS booking_status,
      u.name,
      u.phone,
      u.email
    FROM payment p
    JOIN booking  b ON b.booking_id = p.booking_id
    JOIN app_user u ON u.user_id    = b.user_id
    WHERE p.status = 'WAITING_VERIFY'
    ORDER BY p.submitted_at ASC NULLS LAST, p.created_at ASC
    `
  );

  return rows;
}

// ─────────────────────────────────────────────────────────
// 3. ADMIN_APPROVE_PAYMENT
//    อนุมัติ payment → APPROVED, booking → CONFIRMED
// ─────────────────────────────────────────────────────────
async function approvePayment({ bookingId, adminUserId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ล็อค booking ก่อน
    const { rows } = await client.query(
      `SELECT booking_id, user_id, trip_id, status
       FROM booking
       WHERE booking_id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_BOOKING" };
    }

    if (rows[0].status !== "WAITING_VERIFY") {
      await client.query("ROLLBACK");
      return { ok: false, code: "BAD_BOOKING_STATUS" };
    }

    // อัปเดต payment
    await client.query(
      `UPDATE payment
       SET status      = 'APPROVED',
           reviewed_at = NOW(),
           reviewed_by = $2,
           reject_reason = NULL,
           paid_at     = NOW()
       WHERE booking_id = $1`,
      [bookingId, adminUserId]
    );

    // อัปเดต booking
    await client.query(
      `UPDATE booking
       SET status = 'CONFIRMED'
       WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────
// 4. ADMIN_REJECT_PAYMENT
//    ปฏิเสธ payment → REJECTED, booking → PAYMENT_REJECTED
//    คืนที่นั่งให้ FREE, ลบ booking_seat
// ─────────────────────────────────────────────────────────
async function rejectPayment({ bookingId, adminUserId, reason }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT booking_id, trip_id, status
       FROM booking
       WHERE booking_id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_BOOKING" };
    }

    if (rows[0].status !== "WAITING_VERIFY") {
      await client.query("ROLLBACK");
      return { ok: false, code: "BAD_BOOKING_STATUS" };
    }

    const { trip_id } = rows[0];

    // ดึง seat ที่ booking นี้จอง
    const seatRows = await client.query(
      `SELECT seat_id FROM booking_seat WHERE booking_id = $1`,
      [bookingId]
    );

    // อัปเดต payment
    await client.query(
      `UPDATE payment
       SET status      = 'REJECTED',
           reviewed_at = NOW(),
           reviewed_by = $2,
           reject_reason = $3
       WHERE booking_id = $1`,
      [bookingId, adminUserId, reason || null]
    );

    // อัปเดต booking
    await client.query(
      `UPDATE booking
       SET status = 'PAYMENT_REJECTED'
       WHERE booking_id = $1`,
      [bookingId]
    );

    // คืนที่นั่งให้ FREE
    for (const row of seatRows.rows) {
      await client.query(
        `UPDATE seat_status
         SET status           = 'FREE',
             hold_token       = NULL,
             hold_user_id     = NULL,
             hold_expires_at  = NULL,
             booked_user_id   = NULL,
             booked_at        = NULL
         WHERE trip_id = $1 AND seat_id = $2`,
        [trip_id, row.seat_id]
      );
    }

    // ลบ booking_seat
    await client.query(
      `DELETE FROM booking_seat WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────
// 5. ADMIN_GET_PAYMENT_SLIP
//    อ่านไฟล์สลิปแล้วแปลงเป็น base64 dataUrl
// ─────────────────────────────────────────────────────────
async function getPaymentSlipData({ paymentId }) {
  const { rows } = await pool.query(
    `SELECT payment_id, slip_image_path
     FROM payment
     WHERE payment_id = $1`,
    [paymentId]
  );

  if (rows.length === 0) return { ok: false, code: "NO_PAYMENT" };

  const slipPath = rows[0].slip_image_path;
  if (!slipPath)              return { ok: false, code: "NO_SLIP_PATH" };
  if (!fs.existsSync(slipPath)) return { ok: false, code: "SLIP_FILE_NOT_FOUND" };

  const ext = path.extname(slipPath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp"                   ? "image/webp" :
                                        "image/png";

  const base64  = fs.readFileSync(slipPath).toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  return { ok: true, paymentId, dataUrl };
}

module.exports = {
  getAdminSeats,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  getPaymentSlipData,
};