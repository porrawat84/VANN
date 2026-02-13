// backend/server/chatService.js
const { pool } = require("./db");

async function sendChat({ userId, sender, message }) {
  const ins = await pool.query(
    `INSERT INTO chat(user_id, sender, message_text)
     VALUES ($1,$2,$3)
     RETURNING chat_id, created_at`,
    [userId, sender, message]
  );

  return {
    chatId: ins.rows[0].chat_id,
    createdAt: ins.rows[0].created_at,
  };
}

async function getChatHistory(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT sender, message_text, created_at
     FROM chat
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.reverse(); // เก่า -> ใหม่
}

module.exports = { sendChat, getChatHistory };
