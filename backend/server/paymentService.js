require("dotenv").config();
const { pool } = require("./db");

const omise = require("omise")({ secretKey: process.env.OMISE_SECRET_KEY });

const POLL_MS = Number(process.env.PAYMENT_POLL_INTERVAL_MS || 3000);
const TIMEOUT_MS = Number(process.env.PAYMENT_TIMEOUT_MS || 300000);

// เก็บงาน polling ที่กำลังทำอยู่ (กันซ้ำ)
const activePolls = new Map(); // chargeId -> timeoutId/intervalId

async function createPromptPayPayment({ bookingId }) {
  // 1) อ่าน booking
  const b = await pool.query(
    `SELECT booking_id, user_id, total_price, status
     FROM booking WHERE booking_id=$1`,
    [bookingId]
  );
  if (b.rows.length === 0) return { ok: false, code: "NO_BOOKING" };
  const booking = b.rows[0];
  if (booking.status !== "PENDING_PAYMENT") return { ok: false, code: "BAD_BOOKING_STATUS" };

  const amount = Number(booking.total_price); // satang

  // 2) สร้าง source + charge ผ่าน HTTPS (Opn)
  const source = await omise.sources.create({ type: "promptpay", amount, currency: "THB" });
  const charge = await omise.charges.create({
    amount,
    currency: "THB",
    source: source.id,
    description: `VANN booking #${bookingId}`,
    metadata: { booking_id: String(bookingId) },
  });

  const qrUri = charge?.source?.scannable_code?.image?.download_uri || null;
  if (!qrUri) return { ok: false, code: "NO_QR" };

  // 3) บันทึก payment
  const ins = await pool.query(
    `INSERT INTO payment(booking_id, amount, status, omise_charge_id, qr_download_uri)
     VALUES ($1,$2,'PENDING',$3,$4)
     RETURNING payment_id`,
    [bookingId, amount, charge.id, qrUri]
  );

  return {
    ok: true,
    paymentId: ins.rows[0].payment_id,
    bookingId,
    userId: booking.user_id,
    amount,
    chargeId: charge.id,
    qrUri,
  };
}

function startPollingCharge({ chargeId, bookingId, paymentId, onPaid, onFail }) {
  if (activePolls.has(chargeId)) return; // กันซ้ำ

  const startedAt = Date.now();

  const intervalId = setInterval(async () => {
    try {
      const charge = await omise.charges.retrieve(chargeId);

      const isPaid = charge?.paid === true || charge?.status === "successful";
      const isFailed = charge?.status === "failed" || charge?.failure_code;

      if (isPaid) {
        clearInterval(intervalId);
        activePolls.delete(chargeId);

        // update DB: payment + booking
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `UPDATE payment SET status='PAID', paid_at=NOW() WHERE payment_id=$1`,
            [paymentId]
          );
          await client.query(
            `UPDATE booking SET status='CONFIRMED' WHERE booking_id=$1`,
            [bookingId]
          );
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }

        onPaid?.();
      } else if (isFailed) {
        clearInterval(intervalId);
        activePolls.delete(chargeId);

        await pool.query(`UPDATE payment SET status='FAILED' WHERE payment_id=$1`, [paymentId]);
        onFail?.("FAILED");
      } else if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(intervalId);
        activePolls.delete(chargeId);

        await pool.query(`UPDATE payment SET status='EXPIRED' WHERE payment_id=$1`, [paymentId]);
        onFail?.("EXPIRED");
      }
    } catch (e) {
      // ไม่หยุด polling ทันที แค่ข้ามรอบ
    }
  }, POLL_MS);

  activePolls.set(chargeId, intervalId);
}

module.exports = { createPromptPayPayment, startPollingCharge };
