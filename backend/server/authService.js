const crypto = require("crypto");
const { pool } = require("./db");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, saltHex = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto.scryptSync(String(password), saltHex, 64).toString("hex");
  return `scrypt$${saltHex}$${digest}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || typeof passwordHash !== "string") return false;

  const [algo, saltHex, digestHex] = passwordHash.split("$");
  if (algo !== "scrypt" || !saltHex || !digestHex) return false;

  const actual = crypto.scryptSync(String(password), saltHex, 64);
  const expected = Buffer.from(digestHex, "hex");
  if (actual.length !== expected.length) return false;

  return crypto.timingSafeEqual(actual, expected);
}

async function signUp({ name, phone, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!name || !normalizedEmail || !password) {
    return { ok: false, code: "BAD_SIGNUP_INPUT" };
  }

  const passwordHash = hashPassword(password);

  try {
    const result = await pool.query(
      `INSERT INTO app_user(name, phone, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'USER')
       RETURNING user_id, name, email, role, created_at`,
      [String(name).trim(), phone || null, normalizedEmail, passwordHash]
    );

    const row = result.rows[0];
    return {
      ok: true,
      user: {
        userId: String(row.user_id),
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
      },
    };
  } catch (error) {
    if (error && error.code === "23505") {
      return { ok: false, code: "EMAIL_EXISTS" };
    }
    throw error;
  }
}

async function signIn({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return { ok: false, code: "BAD_SIGNIN_INPUT" };
  }

  const result = await pool.query(
    `SELECT user_id, name, email, role, password_hash
     FROM app_user
     WHERE email=$1
     LIMIT 1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) return { ok: false, code: "BAD_CREDENTIALS" };

  const row = result.rows[0];
  const passOk = verifyPassword(password, row.password_hash);
  if (!passOk) return { ok: false, code: "BAD_CREDENTIALS" };

  return {
    ok: true,
    user: {
      userId: String(row.user_id),
      name: row.name,
      email: row.email,
      role: row.role,
    },
  };
}

module.exports = { signUp, signIn };
