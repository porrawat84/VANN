const { pool } = require("./db");
const fs = require("fs");
const path = require("path");

//ADMIN_GET_SEATS
//ดึงข้อมูลที่นั่งทั้งหมดของ trip พร้อมข้อมูลผู้จอง
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

module.exports = {
  getAdminSeats,
};