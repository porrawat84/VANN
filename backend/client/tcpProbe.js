const net = require("net");

const tripId = process.argv[2] || "20260216_FP_1000";
const seat = process.argv[3] || "A1";
const userId = process.argv[4] || "U1";
const host = process.argv[5] || "127.0.0.1";
const port = Number(process.argv[6] || 9000);

let buffer = "";

const socket = net.createConnection({ host, port }, () => {
  const send = (obj) => {
    const payload = JSON.stringify(obj);
    console.log(">>", payload);
    socket.write(payload + "\n");
  };

  send({ type: "HELLO", userId, role: "USER" });
  send({ type: "SUBSCRIBE_TRIP", tripId });
  send({ type: "LIST_SEATS", tripId });

  setTimeout(() => {
    send({ type: "HOLD", tripId, seat, userId });
  }, 200);

  setTimeout(() => {
    socket.end();
  }, 2200);
});

socket.setEncoding("utf8");

socket.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    console.log("<<", line);
  }
});

socket.on("error", (err) => {
  console.error("ERR", err.code || err.message);
});

socket.on("close", () => {
  console.log("TCP probe closed");
});
