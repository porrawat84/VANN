const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const net = require("net");
const fs = require("fs");

const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

const TCP_HOST = process.env.VANN_SERVER_HOST || "127.0.0.1";
const TCP_PORT = Number(process.env.VANN_SERVER_PORT || 9000);

let win;
let socket;
let buffer = "";

function connectTCP() {
  socket = net.createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
    console.log(`Electron connected to TCP server at ${TCP_HOST}:${TCP_PORT}`);
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

      try {
        const msg = JSON.parse(line);
        console.log("Received from TCP server:", msg);
        if (win && !win.isDestroyed()) {
          win.webContents.send("tcp-message", msg);
        }
      } catch (err) {
        console.log("Bad TCP JSON from server:", err.message, line);
      }
    }
  });

  socket.on("error", (err) => {
    console.log("TCP error:", err.message);
    if (win && !win.isDestroyed()) {
      win.webContents.send("tcp-message", {
        type: "TCP_ERROR",
        message: err.message
      });
    }
  });

  socket.on("close", () => {
    console.log("TCP closed");
    if (win && !win.isDestroyed()) {
      win.webContents.send("tcp-message", { type: "TCP_CLOSED" });
    }
  });
}

ipcMain.on("tcp-send", (_, packet) => {
  if (!socket) {
    console.log("Socket not connected");
    return;
  }
  socket.write(JSON.stringify(packet) + "\n");
});

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(process.resourcesPath, "frontend-dist", "index.html"));
  } else {
    win.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(() => {
  createWindow();
  connectTCP();
});