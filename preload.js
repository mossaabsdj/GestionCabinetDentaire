const { contextBridge, ipcRenderer } = require("electron");
const { app } = require("electron");

console.log("Preload script loaded");
contextBridge.exposeInMainWorld("electron", {
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  printOrdonnance: (data) => ipcRenderer.send("printOrdonnance", data),
  printBilan: (data) => ipcRenderer.send("printBilan", data),
  printJustification: (data) => ipcRenderer.send("printJustification", data),
  //backup: () => ipcRenderer.invoke("electron.backup"), // Expose the backup function
  backup: () => ipcRenderer.invoke("backup-database"),
  restore: () => ipcRenderer.invoke("restore-database"),
  getCabinet: () => ipcRenderer.invoke("get-cabinet"),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  exit: () => ipcRenderer.send("exit"),

  printBarcode2: (barcodeData) =>
    ipcRenderer.send("print-barcode2", barcodeData),

  getZoomFactor: () => ipcRenderer.invoke("get-zoom-factor"),
  setZoomFactor: (factor) => ipcRenderer.invoke("set-zoom-factor", factor),
  zoomIn: () => ipcRenderer.invoke("zoom-in"),
  zoomOut: () => ipcRenderer.invoke("zoom-out"),
  resetZoom: () => ipcRenderer.invoke("reset-zoom"),
});
