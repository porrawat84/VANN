const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tcp", {
  send: (packet) => ipcRenderer.send("tcp-send", packet),
  onMessage: (callback) => {
    const handler = (_evt, msg) => callback(msg);
    ipcRenderer.on("tcp-message", handler);
    return () => ipcRenderer.removeListener("tcp-message", handler);
  },
});
