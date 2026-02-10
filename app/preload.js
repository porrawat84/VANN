const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tcp", {
  send: (packet) => ipcRenderer.send("tcp-send", packet),
  onMessage: (callback) => ipcRenderer.on("tcp-message", (_, msg) => callback(msg)),
});

