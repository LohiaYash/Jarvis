import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("jarvisDesktop", {
  platform: () => ipcRenderer.invoke("jarvis:platform")
});
