const { contextBridge, ipcRenderer } = require("electron");

let listeners = new Set();

contextBridge.exposeInMainWorld("tcp", {
  send: (packet) => ipcRenderer.send("tcp-send", packet),

  onMessage: (callback) => {
    const handler = (_, msg) => callback(msg);
    ipcRenderer.on("tcp-message", handler);
    listeners.add(handler);
    return () => {
      ipcRenderer.removeListener("tcp-message", handler);
      listeners.delete(handler);
    };
  },

  offAllMessages: () => {
    for (const h of listeners) ipcRenderer.removeListener("tcp-message", h);
    listeners.clear();
  },
});
