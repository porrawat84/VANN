const crypto = require("crypto");
const { pool } = require("./db");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const iterations = 120000;
  const keylen = 32;
  const digest = "sha256";
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString("hex");
  // เก็บเป็น format: pbkdf2$iters$salt$hash
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [algo, itersStr, salt, hash] = stored.split("$");
    if (algo !== "pbkdf2") return false;
    const iterations = Number(itersStr);
    const keylen = 32;
    const digest = "sha256";
    const test = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

async function registerUser({ name, email, phone, password }) {
  const passwordHash = hashPassword(password);

  const { rows } = await pool.query(
    `INSERT INTO app_user(name,email,phone,password_hash,role)
     VALUES ($1,$2,$3,$4,'USER')
     RETURNING user_id, role`,
    [name, email, phone || null, passwordHash]
  );

  return { 
    ok: true,
    userId: rows[0].user_id,
    role: rows[0].role
  };
}

async function loginUser({ email, password }) {
  const { rows } = await pool.query(
    `SELECT user_id, password_hash, role
     FROM app_user
     WHERE email=$1`,
    [email]
  );
  if (rows.length === 0) return { ok: false, code: "BAD_CREDENTIALS" };

  const u = rows[0];
  const ok = verifyPassword(password, u.password_hash);
  if (!ok) return { ok: false, code: "BAD_CREDENTIALS" };

  return { ok: true, userId: u.user_id, role: u.role };
}

async function getUserRole(userId) {
  const { rows } = await pool.query(`SELECT role FROM app_user WHERE user_id=$1`, [userId]);
  return rows[0]?.role || "USER";
}

module.exports = { registerUser, loginUser, getUserRole };
