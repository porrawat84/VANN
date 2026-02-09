const net = require("net");
require("dotenv").config();
const { listSeats, holdSeat, confirmSeat, releaseExpiredHolds } = require("./seatService");

const PORT = Number(process.env.PORT || 9000);

function send(socket, obj) {
  socket.write(JSON.stringify(obj) + "\n");
}

// ปล่อย hold หมดอายุทุก 1 วิ
setInterval(() => {
  releaseExpiredHolds().catch(() => {});
}, 1000);

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";

  socket.on("data", async (chunk) => {
    buffer += chunk;

    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        send(socket, { type: "ERROR", code: "BAD_JSON" });
        continue;
      }

      try {
        if (msg.type === "LIST_SEATS") {
          const seats = await listSeats(msg.tripId);
          send(socket, { type: "SEATS", tripId: msg.tripId, seats });
        } else if (msg.type === "HOLD") {
          const r = await holdSeat(msg.tripId, msg.seat, msg.userId);
          send(socket, r.ok
            ? { type: "HOLD_OK", tripId: msg.tripId, seat: msg.seat, holdToken: r.holdToken, expiresInSec: r.expiresInSec }
            : { type: "HOLD_FAIL", code: r.code }
          );
        } else if (msg.type === "CONFIRM") {
          const r = await confirmSeat(msg.tripId, msg.holdToken, msg.userId);
          send(socket, r.ok
            ? { type: "CONFIRM_OK", tripId: msg.tripId, seat: r.seatId }
            : { type: "CONFIRM_FAIL", code: r.code }
          );
        } else {
          send(socket, { type: "ERROR", code: "UNKNOWN_TYPE" });
        }
      } catch (e) {
        send(socket, { type: "ERROR", code: "SERVER_ERROR", message: e.message });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`TCP Seat Server listening on ${PORT}`);
});
