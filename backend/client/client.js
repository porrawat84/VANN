const net = require("net");

const socket = net.createConnection({ host: "127.0.0.1", port: 9000 }, () => {
  console.log("Connected to TCP Seat Server");
  send({ type: "LIST_SEATS", tripId: "T1" });
});

socket.setEncoding("utf8");
let buffer = "";

socket.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    console.log("<<", JSON.parse(line));
  }
});

function send(obj) {
  console.log(">>", obj);
  socket.write(JSON.stringify(obj) + "\n");
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (t) => {
  t = t.trim();
  if (!t) return;
  try { send(JSON.parse(t)); }
  catch {
    console.log('พิมพ์แบบนี้: {"type":"HOLD","tripId":"T1","seat":"A3","userId":"U1"}');
  }
});
