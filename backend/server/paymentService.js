require("dotenv").config();
const crypto = require("crypto");
const generatePayload = require("promptpay-qr");
const QRCode = require("qrcode");
const { pool } = require("./db");
const cloudinary = require("./cloudinary");

const PROMPTPAY_ID = process.env.PROMPTPAY_ID || "0813131998";

async function uploadSlipBase64(slipBase64, bookingId) {
  const dataUrl = slipBase64.includes(",")
    ? slipBase64
    : `data:image/png;base64,${slipBase64}`;

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: "vann/slips",
    public_id: `booking_${bookingId}_${Date.now()}_${crypto.randomUUID()}`,
    resource_type: "image",
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}

async function createManualPromptPayQR({ bookingId, userId }) {
  const { rows } = await pool.query(
    `SELECT booking_id, user_id, total_price, status
     FROM booking
     WHERE booking_id = $1`,
    [bookingId]
  );

  if (rows.length === 0) return { ok: false, code: "NO_BOOKING" };

  const booking = rows[0];

  if (Number(booking.user_id) !== Number(userId)) {
    return { ok: false, code: "FORBIDDEN" };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return { ok: false, code: "BAD_BOOKING_STATUS" };
  }

  const amountBaht = Number(booking.total_price) / 100;
  const payload = generatePayload(PROMPTPAY_ID, { amount: amountBaht });
  const qrDataUrl = await QRCode.toDataURL(payload);

  return {
    ok: true,
    bookingId,
    amountBaht,
    qrUri: qrDataUrl,
  };
}

async function submitPaymentSlip({
  bookingId,
  userId,
  transferredAt,
  slipBase64,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const b = await client.query(
      `SELECT booking_id, user_id, trip_id, status, total_price
       FROM booking
       WHERE booking_id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (b.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_BOOKING" };
    }

    const booking = b.rows[0];

    if (Number(booking.user_id) !== Number(userId)) {
      await client.query("ROLLBACK");
      return { ok: false, code: "FORBIDDEN" };
    }

    if (booking.status !== "PENDING_PAYMENT") {
      await client.query("ROLLBACK");
      return { ok: false, code: "BAD_BOOKING_STATUS" };
    }

    if (!slipBase64) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_SLIP" };
    }

    const uploaded = await uploadSlipBase64(slipBase64, bookingId);
    const slipImagePath = uploaded.secureUrl;

    const existing = await client.query(
      `SELECT payment_id
       FROM payment
       WHERE booking_id = $1
       LIMIT 1`,
      [bookingId]
    );

    let paymentId;

    if (existing.rows.length > 0) {
      paymentId = existing.rows[0].payment_id;

      await client.query(
        `UPDATE payment
         SET amount = $2,
             status = 'WAITING_VERIFY',
             transferred_at = $3,
             submitted_at = NOW(),
             slip_image_path = $4,
             reviewed_at = NULL,
             reviewed_by = NULL,
             reject_reason = NULL
         WHERE payment_id = $1`,
        [paymentId, booking.total_price, transferredAt || null, slipImagePath]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO payment
         (booking_id, amount, status, transferred_at, submitted_at, slip_image_path)
         VALUES ($1, $2, 'WAITING_VERIFY', $3, NOW(), $4)
         RETURNING payment_id`,
        [bookingId, booking.total_price, transferredAt || null, slipImagePath]
      );

      paymentId = ins.rows[0].payment_id;
    }

    const seatRows = await client.query(
      `SELECT seat_id
       FROM booking_seat
       WHERE booking_id = $1`,
      [bookingId]
    );

    for (const row of seatRows.rows) {
      await client.query(
        `UPDATE seat_status
         SET status = 'BOOKED',
             booked_user_id = $3,
             booked_at = NOW(),
             hold_token = NULL,
             hold_user_id = NULL,
             hold_expires_at = NULL
         WHERE trip_id = $1 AND seat_id = $2`,
        [booking.trip_id, row.seat_id, booking.user_id]
      );
    }

    await client.query(
      `UPDATE booking
       SET status = 'WAITING_VERIFY'
       WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query("COMMIT");

    return {
      ok: true,
      paymentId,
      slipImagePath,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function getPendingPayments() {
  const { rows } = await pool.query(
    `
    SELECT
      p.payment_id,
      p.booking_id,
      p.amount,
      p.status AS payment_status,
      p.transferred_at,
      p.submitted_at,
      p.slip_image_path,
      p.reject_reason,
      b.user_id,
      b.trip_id,
      b.status AS booking_status,
      u.name,
      u.phone,
      u.email,
      string_agg(bs.seat_id, ', ' ORDER BY bs.seat_id) AS booked_seats
    FROM payment p
    JOIN booking b
      ON b.booking_id = p.booking_id
    JOIN app_user u
      ON u.user_id = b.user_id
    LEFT JOIN booking_seat bs
      ON bs.booking_id = b.booking_id
    WHERE p.status = 'WAITING_VERIFY'
    GROUP BY
      p.payment_id,
      p.booking_id,
      p.amount,
      p.status,
      p.transferred_at,
      p.submitted_at,
      p.slip_image_path,
      p.reject_reason,
      b.user_id,
      b.trip_id,
      b.status,
      u.name,
      u.phone,
      u.email
    ORDER BY p.submitted_at ASC NULLS LAST, p.payment_id ASC
    `
  );

  return rows;
}

async function approvePayment({ bookingId, adminUserId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const b = await client.query(
      `SELECT booking_id, user_id, trip_id, status, hold_tokens_json
       FROM booking
       WHERE booking_id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (b.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_BOOKING" };
    }

    const booking = b.rows[0];

    if (booking.status !== "WAITING_VERIFY") {
      await client.query("ROLLBACK");
      return { ok: false, code: "BAD_BOOKING_STATUS" };
    }

    await client.query(
      `UPDATE payment
       SET status = 'APPROVED',
           reviewed_at = NOW(),
           reviewed_by = $2,
           reject_reason = NULL,
           paid_at = NOW()
       WHERE booking_id = $1`,
      [bookingId, adminUserId]
    );

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

async function rejectPayment({ bookingId, adminUserId, reason }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const b = await client.query(
      `SELECT booking_id, trip_id, status
       FROM booking
       WHERE booking_id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (b.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_BOOKING" };
    }

    const booking = b.rows[0];

    if (booking.status !== "WAITING_VERIFY") {
      await client.query("ROLLBACK");
      return { ok: false, code: "BAD_BOOKING_STATUS" };
    }

    const seatRows = await client.query(
      `SELECT seat_id
       FROM booking_seat
       WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query(
      `UPDATE payment
       SET status = 'REJECTED',
           reviewed_at = NOW(),
           reviewed_by = $2,
           reject_reason = $3
       WHERE booking_id = $1`,
      [bookingId, adminUserId, reason || null]
    );

    await client.query(
      `UPDATE booking
       SET status = 'PAYMENT_REJECTED'
       WHERE booking_id = $1`,
      [bookingId]
    );

    for (const row of seatRows.rows) {
      await client.query(
        `UPDATE seat_status
         SET status = 'FREE',
             hold_token = NULL,
             hold_user_id = NULL,
             hold_expires_at = NULL,
             booked_user_id = NULL,
             booked_at = NULL
         WHERE trip_id = $1 AND seat_id = $2`,
        [booking.trip_id, row.seat_id]
      );
    }

    await client.query(
      `DELETE FROM booking_seat
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

async function getPaymentSlipData({ paymentId }) {
  const { rows } = await pool.query(
    `SELECT payment_id, slip_image_path
     FROM payment
     WHERE payment_id = $1`,
    [paymentId]
  );

  if (rows.length === 0) {
    return { ok: false, code: "NO_PAYMENT" };
  }

  const slipPath = rows[0].slip_image_path;
  if (!slipPath) {
    return { ok: false, code: "NO_SLIP_PATH" };
  }

  return {
    ok: true,
    paymentId,
    dataUrl: slipPath,
    slipPath,
  };
}

module.exports = {
  createManualPromptPayQR,
  submitPaymentSlip,
  getPendingPayments,
  getPaymentSlipData,
  approvePayment,
  rejectPayment,
};