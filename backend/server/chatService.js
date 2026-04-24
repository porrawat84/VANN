const { pool } = require("./db");

async function sendChat({ userId, sender, message }) {
  const ins = await pool.query(
    `INSERT INTO chat (user_id, sender, message)
     VALUES ($1, $2, $3)
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
    `SELECT chat_id, user_id, sender, message, created_at
     FROM chat
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [userId, limit]
  );

  return rows;
}

async function getAdminChatList() {
  const { rows } = await pool.query(
    `WITH last_msg AS (
       SELECT DISTINCT ON (c.user_id)
         c.user_id,
         c.message,
         c.created_at,
         c.sender
       FROM chat c
       ORDER BY c.user_id, c.created_at DESC
     )
     SELECT
       u.user_id,
       u.name,
       u.email,
       u.phone,
       lm.message AS last_message,
       lm.created_at AS last_created_at,
       lm.sender AS last_sender,
       0::int AS unread_count
     FROM last_msg lm
     JOIN app_user u ON u.user_id = lm.user_id
     ORDER BY lm.created_at DESC`
  );

  return rows;
}

module.exports = {
  sendChat,
  getChatHistory,
  getAdminChatList,
};