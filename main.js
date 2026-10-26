const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const { exec } = require("child_process");
const { shell } = require("electron");
const { Menu } = require("electron");
const { backupDatabase } = require("./backup");
const { restoreDatabase, inspectBackupFile } = require("./restore");
let prisma;
try {
  const { PrismaClient } = require("./app/generated/prisma");
  prisma = new PrismaClient();
} catch (e) {
  console.warn("[main.js] PrismaClient initialization note:", e.message);
}

const DEFAULT_CABINET = {
  title: "Cabinet Dentaire",
  doctorName: "Docteur",
  doctorNameAr: "دكتور",
  specialty: "Chirurgien Dentiste",
  specialtyAr: "جراحة و طب الأسنان",
  cabinetName: "Cabinet Dentaire",
  cabinetNameAr: "عيادة طب الأسنان",
  address: "Rue Frères KAFI logts 38, 1er étage",
  addressAr: "شارع الإخوة كافي عقار 38 الطابق الأول",
  city: "El-Harrouch SKIKDA",
  cityAr: "(بزاز لعلاوي) الحروش - سكيكدة",
  phones: "0652 76 89 72 / 0562 24 40 87",
  logo: "/uploads/image.PNG",
};

let cachedCabinet = null;

async function getCabinetData() {
  if (prisma) {
    try {
      const dbCabinet = await prisma.cabinet.findFirst();
      if (dbCabinet) {
        cachedCabinet = dbCabinet;
        return dbCabinet;
      }
    } catch (e) {
      console.warn("[main.js] Prisma query cabinet error:", e.message);
    }
  }

  // Fallback: try Next.js cabinet API if server is running
  try {
    const res = await fetch("http://localhost:3000/api/cabinet");
    if (res.ok) {
      const data = await res.json();
      if (data) {
        cachedCabinet = data;
        return data;
      }
    }
  } catch (e) {}

  return cachedCabinet || DEFAULT_CABINET;
}

let mainWindow;
let splashWindow;
let serverProcess;

// if using ES modules
//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);
// main.js - ADD THIS AT THE TOP

if (app.isPackaged) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "app/generated/prisma/query_engine-windows.dll.node",
  );
} else {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    __dirname,
    "app/generated/prisma/query_engine-windows.dll.node",
  );
}

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', 'Roboto', sans-serif;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          
          .splash-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
            text-align: center;
            width: 500px;
            height: 400px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
          }
          
          .splash-container::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          
          .content {
            position: relative;
            z-index: 1;
          }
          
          .icon {
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: bounce 2s ease-in-out infinite;
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .icon svg {
            width: 60px;
            height: 60px;
            fill: #764ba2;
          }
          
          h1 {
            color: white;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          
          .subtitle {
            color: rgba(255,255,255,0.95);
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 35px;
          }
          
          .loader {
            width: 200px;
            height: 6px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            overflow: hidden;
            margin: 0 auto;
          }
          
          .loader-bar {
            height: 100%;
            background: white;
            border-radius: 10px;
            animation: loading 2s ease-in-out infinite;
            box-shadow: 0 0 15px rgba(255,255,255,0.5);
          }
          
          @keyframes loading {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
          
          .version {
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            margin-top: 20px;
            font-weight: 400;
          }
        </style>
      </head>
      <body>
        <div class="splash-container">
          <div class="content">
            <div class="icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <h1>${cachedCabinet?.title || cachedCabinet?.cabinetName || "Cabinet Dentaire"}</h1>
            <div class="subtitle">${cachedCabinet?.specialty || "Chirurgien Dentiste"}</div>
            <div class="loader">
              <div class="loader-bar"></div>
            </div>
            <div class="version">Version 1.0.0</div>
          </div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(splashHtml),
  );

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: false,
    resizable: false,
    show: false, // Don't show until ready
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });

  // Wait until the server starts before loading the Electron window
  const serverUrl = "http://localhost:3000";
  const checkServer = setInterval(() => {
    fetch(serverUrl)
      .then(() => {
        clearInterval(checkServer);
        mainWindow.loadURL(serverUrl);
      })
      .catch(() => console.log("Waiting for server..."));
  }, 1000);

  // Show main window and close splash when ready
  mainWindow.once("ready-to-show", () => {
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
      mainWindow.show();
      mainWindow.maximize();
    }, 2000); // Show splash for at least 2 seconds
  });
}

function createMenu() {
  const getTargetWindow = (browserWindow) => {
    return browserWindow || BrowserWindow.getFocusedWindow() || mainWindow;
  };

  const changeZoom = (delta, browserWindow) => {
    const win = getTargetWindow(browserWindow);
    if (win && win.webContents) {
      const current = win.webContents.getZoomFactor();
      const newFactor = Math.min(Math.max(current + delta, 0.5), 2.5);
      win.webContents.setZoomFactor(parseFloat(newFactor.toFixed(2)));
    }
  };

  const setZoom = (factor, browserWindow) => {
    const win = getTargetWindow(browserWindow);
    if (win && win.webContents) {
      win.webContents.setZoomFactor(factor);
    }
  };

  const template = [
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Actualiser" },
        { role: "forceReload", label: "Forcer l'actualisation" },
        { role: "toggledevtools", label: "Outils de développement" },
        { type: "separator" },
        {
          label: "Zoom avant (+)",
          role: "zoomIn",
        },
        {
          label: "Zoom arrière (-)",
          role: "zoomOut",
        },
        {
          label: "Taille normale (100%)",
          role: "resetZoom",
        },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
      ],
    },
    {
      label: "🔍 Zoom",
      submenu: [
        {
          label: "Zoom avant (+10%)",
          accelerator: "CmdOrCtrl+Plus",
          click: (item, win) => changeZoom(0.1, win),
        },
        {
          label: "Zoom arrière (-10%)",
          accelerator: "CmdOrCtrl+-",
          click: (item, win) => changeZoom(-0.1, win),
        },
        {
          label: "Réinitialiser (100%)",
          accelerator: "CmdOrCtrl+0",
          click: (item, win) => setZoom(1.0, win),
        },
        { type: "separator" },
        { label: "70%", click: (item, win) => setZoom(0.7, win) },
        { label: "80%", click: (item, win) => setZoom(0.8, win) },
        { label: "90%", click: (item, win) => setZoom(0.9, win) },
        { label: "100% (Normal)", click: (item, win) => setZoom(1.0, win) },
        { label: "110%", click: (item, win) => setZoom(1.1, win) },
        { label: "125%", click: (item, win) => setZoom(1.25, win) },
        { label: "150%", click: (item, win) => setZoom(1.5, win) },
        { label: "175%", click: (item, win) => setZoom(1.75, win) },
        { label: "200%", click: (item, win) => setZoom(2.0, win) },
      ],
    },
    {
      label: "➕ Zoom +",
      click: (item, win) => changeZoom(0.1, win),
    },
    {
      label: "➖ Zoom -",
      click: (item, win) => changeZoom(-0.1, win),
    },
    {
      label: "🔄 100%",
      click: (item, win) => setZoom(1.0, win),
    },
    {
      label: "🚪 Exit",
      click: () => app.quit(),
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Pre-load cabinet data from database
  try {
    await getCabinetData();
  } catch (e) {}

  // Show splash screen first
  createSplashScreen();

  // Start Next.js server
  const serverScript = path.join(__dirname, "server.js");
  serverProcess = fork(serverScript);

  // Create main window (hidden initially)
  createWindow();

  // Create menu
  createMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  if (serverProcess) {
    serverProcess.kill();
  }
});

ipcMain.handle("get-app-path", () => {
  return path.dirname(path.dirname(app.getAppPath()));
});

ipcMain.handle("get-cabinet", async () => {
  return await getCabinetData();
});

async function getElectronCabinet(customCab = {}) {
  let dbCab = {};
  try {
    dbCab = await getCabinetData();
  } catch (e) {
    dbCab = cachedCabinet || DEFAULT_CABINET;
  }

  const cab = { ...DEFAULT_CABINET, ...dbCab, ...customCab };
  const doctorName = cab.doctorName || "Docteur";
  const doctorNameAr = cab.doctorNameAr || "دكتور";
  const specialty = cab.specialty || "Chirurgien Dentiste";
  const specialtyAr = cab.specialtyAr || "جراحة و طب الأسنان";
  const cabinetName = cab.cabinetName || "Cabinet Dentaire";
  const cabinetNameAr = cab.cabinetNameAr || "عيادة طب الأسنان";
  const address = cab.address || "Rue Frères KAFI logts 38, 1er étage";
  const addressAr = cab.addressAr || "شارع الإخوة كافي عقار 38 الطابق الأول";
  const city = cab.city || "El-Harrouch SKIKDA";
  const cityAr = cab.cityAr || "(بزاز لعلاوي) الحروش - سكيكدة";
  const phones = cab.phones || "0652 76 89 72 / 0562 24 40 87";
  const logo = cab.logo || "/uploads/image.PNG";

  let imageUrl = logo;
  if (
    !logo.startsWith("data:") &&
    !logo.startsWith("http://") &&
    !logo.startsWith("https://")
  ) {
    const cleanPath = logo.startsWith("/") ? logo.slice(1) : logo;
    const fs = require("fs");
    const cwdPath = path.join(process.cwd(), "public", cleanPath);
    let fullImagePath = cwdPath;
    if (!fs.existsSync(cwdPath)) {
      const basePath = app.isPackaged
        ? path.join(path.dirname(process.execPath), "public", cleanPath)
        : path.resolve(__dirname, "..", "app");
      fullImagePath = path.join(basePath, "public", cleanPath);
    }
    imageUrl = `file://${fullImagePath.replace(/\\/g, "/").replace(/ /g, "%20")}`;
  }

  return {
    doctorName,
    doctorNameAr,
    specialty,
    specialtyAr,
    cabinetName,
    cabinetNameAr,
    address,
    addressAr,
    city,
    cityAr,
    phones,
    imageUrl,
  };
}
const fs = require("fs");
const os = require("os");
const {
  buildOrdonnanceHtml,
  buildBilanHtml,
  buildJustificationHtml,
} = require("./print-templates");

/**
 * Opens a hidden-from-nobody print window, waits until the page has finished its
 * automatic pagination (window.__printReady), then opens the system print dialog.
 */
function runElectronPrint(html, label) {
  const printWindow = new BrowserWindow({
    show: true,
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true,
    },
  });

  // data: URLs are limited in size; fall back to a temp file for very large
  // documents (e.g. a logo embedded as base64).
  let tmpFile = null;
  const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  if (dataUrl.length < 1800000) {
    printWindow.loadURL(dataUrl);
  } else {
    tmpFile = path.join(os.tmpdir(), `print-${label}-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html, "utf8");
    printWindow.loadFile(tmpFile);
  }

  printWindow.webContents.on("did-finish-load", async () => {
    // Wait (max 8s) for the page script to finish measuring / paginating
    const start = Date.now();
    while (Date.now() - start < 8000) {
      try {
        const ready = await printWindow.webContents.executeJavaScript(
          "window.__printReady === true",
        );
        if (ready) break;
      } catch (_) {
        /* page not ready yet */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, 300)); // let the last paint settle

    printWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        margins: { marginType: "none" },
        pageSize: { name: "A4", width: 297000, height: 210000 },
        landscape: true,
      },
      (success, failureReason) => {
        if (success) console.log(`🖨️ ${label} printed successfully`);
        else console.error(`❌ ${label} print failed:`, failureReason);
        printWindow.close();
        if (tmpFile) fs.unlink(tmpFile, () => {});
      },
    );
  });
}

ipcMain.on("printOrdonnance", async (event, data = {}) => {
  try {
    const {
      nom = "",
      prenom = "",
      age = "",
      consultationId,
      ordonnanceId,
      items = [],
      cabinet = {},
    } = data;

    const cab = await getElectronCabinet(cabinet);

    const html = buildOrdonnanceHtml(
      {
        nom,
        prenom,
        age,
        consultationId,
        ordonnanceId,
        items,
      },
      cab,
      { autoPrint: false },
    );

    runElectronPrint(html, "Ordonnance");
  } catch (error) {
    console.error("Erreur impression ordonnance:", error);

    event.sender.send("printOrdonnanceError", {
      message: "Impossible de préparer l'ordonnance pour impression.",
    });
  }
});


ipcMain.on("printBilan", async (event, data = {}) => {
  try {
    const {
      nom = "",
      prenom = "",
      age = "",
      consultationId,
      bilanId,
      items = [],
      cabinet = {},
    } = data;

    const cab = await getElectronCabinet(cabinet);

    const html = buildBilanHtml(
      { nom, prenom, age, consultationId, bilanId, items },
      cab,
      { autoPrint: false },
    );

    runElectronPrint(html, "Bilan");
  } catch (error) {
    console.error("Erreur impression bilan:", error);

    event.sender.send("printBilanError", {
      message: "Impossible de préparer le bilan pour impression.",
    });
  }
});

ipcMain.on("printJustification", async (event, data = {}) => {
  try {
    const {
      nom = "",
      prenom = "",
      age = "",
      consultationId,
      justificationId,
      texte = "",
      cabinet = {},
    } = data;

    const cab = await getElectronCabinet(cabinet);

    const html = buildJustificationHtml(
      {
        nom,
        prenom,
        age,
        consultationId,
        justificationId,
        texte,
      },
      cab,
      { autoPrint: false },
    );

    runElectronPrint(html, "Justification");
  } catch (error) {
    console.error("Erreur impression justification:", error);

    event.sender.send("printJustificationError", {
      message: "Impossible de préparer la justification pour impression.",
    });
  }
});

ipcMain.handle("backup-database", async (event, options = {}) => {
  const password = typeof options === "string" ? options : options?.password;

  const timestamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Exporter la base de données sécurisée",
    defaultPath: `backup_dentaire_${timestamp}.cbak`,
    filters: [
      { name: "Sauvegarde sécurisée (*.cbak, *.enc, *.json)", extensions: ["cbak", "enc", "json"] },
      { name: "Tous les fichiers", extensions: ["*"] },
    ],
  });

  if (canceled || !filePath) {
    return { canceled: true, success: false, message: "Exportation annulée." };
  }

  try {
    const result = await backupDatabase(filePath, password);
    return {
      success: true,
      filePath: result.filePath,
      message: "Base de données exportée et chiffrée avec succès.",
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle("select-backup-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir un fichier de sauvegarde",
    filters: [
      { name: "Sauvegarde sécurisée (*.cbak, *.enc, *.json)", extensions: ["cbak", "enc", "json"] },
      { name: "Tous les fichiers", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];
  const inspection = inspectBackupFile(filePath);
  return {
    canceled: false,
    filePath,
    ...inspection,
  };
});

ipcMain.handle("restore-database", async (event, options = {}) => {
  let filePath = typeof options === "string" ? null : options?.filePath;
  let password = typeof options === "string" ? options : options?.password;

  if (!filePath) {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Choisir un fichier de sauvegarde",
      filters: [
        { name: "Sauvegarde sécurisée (*.cbak, *.enc, *.json)", extensions: ["cbak", "enc", "json"] },
        { name: "Tous les fichiers", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return {
        canceled: true,
        success: false,
        message: "Aucun fichier sélectionné",
      };
    }
    filePath = filePaths[0];
  }

  console.log("🗂 Restoring backup file:", filePath);
  try {
    const result = await restoreDatabase(filePath, password);
    return {
      success: true,
      message: result.message || "Base de données restaurée avec succès.",
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});
ipcMain.handle("open-file", async (event, filePath) => {
  await shell.openPath(filePath);
});
ipcMain.on("exit", () => {
  app.quit();
});

// === Zoom Controller IPC Handlers ===
ipcMain.handle("get-zoom-factor", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win && win.webContents ? win.webContents.getZoomFactor() : 1.0;
});

ipcMain.handle("set-zoom-factor", (event, factor) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win && win.webContents && typeof factor === "number") {
    win.webContents.setZoomFactor(factor);
    return win.webContents.getZoomFactor();
  }
  return 1.0;
});

ipcMain.handle("zoom-in", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win && win.webContents) {
    const current = win.webContents.getZoomFactor();
    const newFactor = Math.min(current + 0.1, 2.5);
    win.webContents.setZoomFactor(parseFloat(newFactor.toFixed(2)));
    return win.webContents.getZoomFactor();
  }
  return 1.0;
});

ipcMain.handle("zoom-out", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win && win.webContents) {
    const current = win.webContents.getZoomFactor();
    const newFactor = Math.max(current - 0.1, 0.5);
    win.webContents.setZoomFactor(parseFloat(newFactor.toFixed(2)));
    return win.webContents.getZoomFactor();
  }
  return 1.0;
});

ipcMain.handle("reset-zoom", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win && win.webContents) {
    win.webContents.setZoomFactor(1.0);
    return 1.0;
  }
  return 1.0;
});
