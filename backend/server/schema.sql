BEGIN;

-- 1) USER (ใช้ role แทน admin_user ก็พอ)
CREATE TABLE IF NOT EXISTS app_user (
  user_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) LOCATION
CREATE TABLE IF NOT EXISTS location (
  location_id BIGSERIAL PRIMARY KEY,
  location_name TEXT NOT NULL,
  address TEXT
);

-- 3) VAN
CREATE TABLE IF NOT EXISTS van (
  van_id BIGSERIAL PRIMARY KEY,
  van_number TEXT NOT NULL UNIQUE,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE'))
);

-- 4) SCHEDULE (ตาม ER ฝั่ง admin จัดการรอบรถ)
--   *เก็บไว้เพื่อความ "ตรง ER" แต่ socket protocol ยังใช้ tripId string ได้
CREATE TABLE IF NOT EXISTS schedule (
  schedule_id BIGSERIAL PRIMARY KEY,
  van_id BIGINT NOT NULL REFERENCES van(van_id),
  origin_location_id BIGINT NOT NULL REFERENCES location(location_id),
  destination_location_id BIGINT NOT NULL REFERENCES location(location_id),
  departure_time TIMESTAMPTZ NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  service_date DATE GENERATED ALWAYS AS (departure_time::date) STORED,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED'))
);

-- 5) SEAT (ที่นั่ง 14 ที่ของรถตู้)
CREATE TABLE IF NOT EXISTS seat (
  seat_id TEXT PRIMARY KEY,          -- A1, A2, ...
  van_id BIGINT NOT NULL REFERENCES van(van_id),
  seat_number TEXT NOT NULL,         -- ซ้ำกับ seat_id ได้ แต่เก็บไว้ตาม ER
  UNIQUE (van_id, seat_number)
);

-- 6) BOOKING
-- สำคัญ: เพื่อให้ไม่รื้อโค้ดหนัก เรา "เก็บ trip_id เป็นหลัก" (ตรงกับ socket)
-- schedule_id เป็น optional (ไว้ mapping ภายหลัง/ฝั่ง admin)
CREATE TABLE IF NOT EXISTS booking (
  booking_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_user(user_id),
  trip_id TEXT NOT NULL,  -- ใช้จริงกับ socket: YYYYMMDD_DEST_HHMM
  schedule_id BIGINT REFERENCES schedule(schedule_id), -- optional
  booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_price INTEGER NOT NULL CHECK (total_price >= 0), -- หน่วยสตางค์/หรือบาทก็ได้ แต่ให้ fix ให้ชัด
  status TEXT NOT NULL CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','CANCELLED'))
);

-- กันจองซ้ำ trip เดียวกัน (optional แต่แนะนำ)
CREATE INDEX IF NOT EXISTS idx_booking_trip_id ON booking(trip_id);
CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking(user_id);

-- 7) BOOKING_SEAT (ผูกกับ seat จริง)
CREATE TABLE IF NOT EXISTS booking_seat (
  booking_seat_id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL REFERENCES seat(seat_id),
  UNIQUE (booking_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_seat_booking_id ON booking_seat(booking_id);

-- 8) PAYMENT (ลบของซ้ำ เหลือชุดเดียว)
CREATE TABLE IF NOT EXISTS payment (
  payment_id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0), -- หน่วยสตางค์
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','EXPIRED')),
  omise_charge_id TEXT,
  qr_download_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_booking_id ON payment(booking_id);

-- 9) CHAT (ผูก user เป็น BIGINT)
CREATE TABLE IF NOT EXISTS chat (
  chat_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('USER','ADMIN')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat(user_id, created_at DESC);

-- 10) SEAT_STATUS (แกน realtime ที่นั่ง ใช้ trip_id ตามเดิม)
-- seat_id ผูกกับ seat เพื่อกันค่าหลุด
CREATE TABLE IF NOT EXISTS seat_status (
  trip_id TEXT NOT NULL,
  seat_id TEXT NOT NULL REFERENCES seat(seat_id),
  status TEXT NOT NULL CHECK (status IN ('FREE','HELD','BOOKED')),
  hold_token TEXT,
  hold_user_id BIGINT REFERENCES app_user(user_id),
  hold_expires_at TIMESTAMPTZ,
  booked_user_id BIGINT REFERENCES app_user(user_id),
  booked_at TIMESTAMPTZ,
  PRIMARY KEY (trip_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_status_trip ON seat_status(trip_id);
CREATE INDEX IF NOT EXISTS idx_seat_status_hold_exp
  ON seat_status(status, hold_expires_at);

COMMIT;
