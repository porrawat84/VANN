const { pool } = require("./db");

async function getAdminSeats(tripId) {
  const { rows } = await pool.query(
    `
    WITH current_booking AS (
      SELECT
        bs.seat_id,
        b.booking_id,
        b.user_id,
        b.total_price
      FROM booking b
      JOIN booking_seat bs
        ON bs.booking_id = b.booking_id
      WHERE b.trip_id = $1
        AND b.status NOT IN ('CANCELLED', 'PAYMENT_REJECTED')
    ),
    latest_payment AS (
      SELECT DISTINCT ON (booking_id)
        booking_id,
        payment_id,
        status AS payment_status
      FROM payment
      ORDER BY booking_id, payment_id DESC
    )
    SELECT
      s.seat_id,
      s.seat_number,
      ss.status AS seat_status,
      u.name,
      u.phone,
      cb.total_price,
      lp.payment_status,
      lp.payment_id
    FROM seat_status ss
    JOIN seat s
      ON s.seat_id = ss.seat_id
    LEFT JOIN current_booking cb
      ON cb.seat_id = s.seat_id
    LEFT JOIN app_user u
      ON u.user_id = cb.user_id
    LEFT JOIN latest_payment lp
      ON lp.booking_id = cb.booking_id
    WHERE ss.trip_id = $1
    ORDER BY s.seat_number
    `,
    [tripId]
  );

  return rows;
}

module.exports = {
  getAdminSeats,
};