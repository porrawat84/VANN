const crypto = require("crypto");
const { pool } = require("./db");
const { SEATS } = require("./tripUtil");

const HOLD_SECONDS = Number(process.env.HOLD_SECONDS || 120);

function token() {
  return crypto.randomBytes(16).toString("hex");
}

async function listSeats(tripId) {
  await ensureTripSeats(tripId);
  const { rows } = await pool.query(
    "SELECT seat_id, status FROM seat_status WHERE trip_id=$1 ORDER BY seat_id",
    [tripId]
  );
  const out = {};
  for (const r of rows) out[r.seat_id] = r.status;
  return out;
}

async function holdSeat(tripId, seatId, userId) {
  await ensureTripSeats(tripId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT status, hold_expires_at
       FROM seat_status
       WHERE trip_id=$1 AND seat_id=$2
       FOR UPDATE`,
      [tripId, seatId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NO_SEAT" };
    }

    const s = rows[0];
    const now = new Date();

    if (s.status === "BOOKED") {
      await client.query("ROLLBACK");
      return { ok: false, code: "SEAT_BOOKED" };
    }

    if (s.status === "HELD" && s.hold_expires_at && s.hold_expires_at > now) {
      await client.query("ROLLBACK");
      return { ok: false, code: "SEAT_HELD" };
    }

    const holdToken = token();
    await client.query(
      `UPDATE seat_status
       SET status='HELD',
           hold_token=$3,
           hold_user_id=$4,
           hold_expires_at=NOW() + ($5 || ' seconds')::interval
       WHERE trip_id=$1 AND seat_id=$2`,
      [tripId, seatId, holdToken, userId, HOLD_SECONDS]
    );

    await client.query("COMMIT");
    return { ok: true, holdToken, expiresInSec: HOLD_SECONDS };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function confirmSeat(tripId, holdToken, userId) {
  await ensureTripSeats(tripId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT seat_id, status, hold_user_id, hold_expires_at
       FROM seat_status
       WHERE trip_id=$1 AND hold_token=$2
       FOR UPDATE`,
      [tripId, holdToken]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "BAD_TOKEN" };
    }

    const r = rows[0];
    const now = new Date();

    if (r.status !== "HELD") {
      await client.query("ROLLBACK");
      return { ok: false, code: "NOT_HELD" };
    }
    if (String(r.hold_user_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return { ok: false, code: "NOT_OWNER" };
    }
    if (!r.hold_expires_at || r.hold_expires_at <= now) {
      await client.query(
        `UPDATE seat_status
         SET status='FREE', hold_token=NULL, hold_user_id=NULL, hold_expires_at=NULL
         WHERE trip_id=$1 AND seat_id=$2`,
        [tripId, r.seat_id]
      );
      await client.query("COMMIT");
      return { ok: false, code: "EXPIRED" };
    }

    await client.query(
      `UPDATE seat_status
       SET status='BOOKED',
           booked_user_id=$3,
           booked_at=NOW(),
           hold_token=NULL,
           hold_user_id=NULL,
           hold_expires_at=NULL
       WHERE trip_id=$1 AND seat_id=$2`,
      [tripId, r.seat_id, userId]
    );

    await client.query("COMMIT");
    return { ok: true, seatId: r.seat_id };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function releaseExpiredHolds() {
  await pool.query(
    `UPDATE seat_status
     SET status='FREE', hold_token=NULL, hold_user_id=NULL, hold_expires_at=NULL
     WHERE status='HELD' AND hold_expires_at <= NOW()`
  );
}

async function ensureTripSeats(tripId) {
  // เช็คว่ามี seat แถวไหนอยู่แล้วบ้าง
  const existing = await pool.query(
    `SELECT seat_id FROM seat_status WHERE trip_id=$1`,
    [tripId]
  );
  const have = new Set(existing.rows.map(r => r.seat_id));

  const missing = SEATS.filter(s => !have.has(s));
  if (missing.length === 0) return;

  // ใส่ที่นั่งที่หายไปเป็น FREE
  const values = missing.map((_, i) => `($1,$${i + 2},'FREE')`).join(",");
  await pool.query(
    `INSERT INTO seat_status(trip_id, seat_id, status) VALUES ${values}`,
    [tripId, ...missing]
  );
}

module.exports = { listSeats, holdSeat, confirmSeat, releaseExpiredHolds, ensureTripSeats };
