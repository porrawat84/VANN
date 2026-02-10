const { pool } = require("./db");

async function createBooking({ userId, tripId, seats, totalPriceSatang }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const b = await client.query(
      `INSERT INTO booking(user_id, trip_id, total_price, status)
       VALUES ($1,$2,$3,'PENDING_PAYMENT')
       RETURNING booking_id, status`,
      [userId, tripId, totalPriceSatang]
    );
    const bookingId = b.rows[0].booking_id;

    for (const seatId of seats) {
      await client.query(
        `INSERT INTO booking_seat(booking_id, seat_id) VALUES ($1,$2)`,
        [bookingId, seatId]
      );
    }

    await client.query("COMMIT");
    return { bookingId, status: b.rows[0].status };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function getBookings(userId) {
  const { rows } = await pool.query(
    `SELECT booking_id, trip_id, total_price, status, booking_date
     FROM booking
     WHERE user_id=$1
     ORDER BY booking_date DESC`,
    [userId]
  );
  return rows;
}

async function getBookingDetail(bookingId) {
  const b = await pool.query(
    `SELECT booking_id, user_id, trip_id, total_price, status, booking_date
     FROM booking WHERE booking_id=$1`,
    [bookingId]
  );
  if (b.rows.length === 0) return null;

  const seats = await pool.query(
    `SELECT seat_id FROM booking_seat WHERE booking_id=$1 ORDER BY seat_id`,
    [bookingId]
  );

  const pay = await pool.query(
    `SELECT payment_id, amount, status, qr_download_uri, created_at, paid_at
     FROM payment WHERE booking_id=$1
     ORDER BY created_at DESC LIMIT 1`,
    [bookingId]
  );

  return {
    ...b.rows[0],
    seats: seats.rows.map(r => r.seat_id),
    payment: pay.rows[0] || null,
  };
}

module.exports = { createBooking, getBookings, getBookingDetail };
