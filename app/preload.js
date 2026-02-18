const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tcp", {
  send: (packet) => ipcRenderer.send("tcp-send", packet),

  onMessage: (callback) => {
    const handler = (_, msg) => callback(msg);
    ipcRenderer.on("tcp-message", handler);
    return () => ipcRenderer.removeListener("tcp-message", handler); // ✅ unsubscribe
  },

  offAllMessages: () => {
    ipcRenderer.removeAllListeners("tcp-message"); // ✅ ล้างทั้งหมด (ทางลัด)
  },
});
