const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const net = require("net");

let win;
let socket;
let buffer = "";

function sendTCP(obj) {
  if (socket) socket.write(JSON.stringify(obj) + "\n");
}

function connectTCP() {
  socket = net.createConnection({ host: "127.0.0.1", port: 9000}, () => { //เปลี่ยนip
    console.log("Electron connected to TCP server");
    if (win && !win.isDestroyed()) {
      win.webContents.send("tcp-message", { type: "TCP_CONNECTED" });
    }
  });

  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      win.webContents.send("tcp-message", msg);
    }
  });
  socket.on("error", (err) => console.log("TCP error:", err.message));
  socket.on("close", () => console.log("TCP closed"));
}

ipcMain.on("tcp-send", (_, packet) => {
  if (!socket) {
    console.log("Socket not connected");
    return;
  }

  console.log("Sending to TCP server:", packet);

  socket.write(JSON.stringify(packet) + "\n");
});

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  //win.loadURL("http://localhost:5173");
  win.loadFile(path.join(__dirname, "..", "frontend", "dist", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  connectTCP();
});
