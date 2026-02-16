const net = require("net");

const userId = process.argv[2] || "U1";
const role = process.argv[3] || "USER";
const host = process.argv[4] || process.env.TCP_HOST || "127.0.0.1";
const port = Number(process.argv[5] || process.env.TCP_PORT || 9000);
const dest = process.argv[6] || "FP";
const hhmm = process.argv[7] || "1000";

function pad2(n){ return String(n).padStart(2,"0"); }
function todayYMD(){
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}`;
}
function makeTripId(dest="FP", hhmm="1000"){
  return `${todayYMD()}_${dest}_${hhmm}`;
}

const tripId = makeTripId(dest, hhmm);

const socket = net.createConnection({ host, port }, () => {
    console.log(`Connected as ${userId} (${role})`);
  send({ type: "HELLO", userId, role });
  send({ type: "SUBSCRIBE_TRIP", tripId});
  send({ type: "LIST_SEATS", tripId});
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
