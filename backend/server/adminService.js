const { pool } = require("./db");

async function getAdminSeats(tripId) {
  const { rows } = await pool.query(
    `
    WITH current_booking AS (
      SELECT
        bs.seat_id,
        b.booking_id,
        b.user_id,
        b.total_price,
        seat_count.cnt AS seat_count,
        seat_list.seats AS booked_seats
      FROM booking b
      JOIN booking_seat bs
        ON bs.booking_id = b.booking_id
      JOIN (
        SELECT booking_id, COUNT(*) AS cnt
        FROM booking_seat
        GROUP BY booking_id
      ) seat_count
        ON seat_count.booking_id = b.booking_id
      JOIN (
        SELECT booking_id, string_agg(seat_id, ', ' ORDER BY seat_id) AS seats
        FROM booking_seat
        GROUP BY booking_id
      ) seat_list
        ON seat_list.booking_id = b.booking_id
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
      cb.booking_id,
      cb.total_price,
      cb.seat_count,
      cb.booked_seats,
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