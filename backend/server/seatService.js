const crypto = require("crypto");
const { pool } = require("./db");

const HOLD_SECONDS = Number(process.env.HOLD_SECONDS || 120);

function token() {
  return crypto.randomBytes(16).toString("hex");
}

async function listSeats(tripId) {
  const { rows } = await pool.query(
    "SELECT seat_id, status FROM seat_status WHERE trip_id=$1 ORDER BY seat_id",
    [tripId]
  );
  const out = {};
  for (const r of rows) out[r.seat_id] = r.status;
  return out;
}

async function holdSeat(tripId, seatId, userId) {
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
    if (r.hold_user_id !== userId) {
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

module.exports = { listSeats, holdSeat, confirmSeat, releaseExpiredHolds };
