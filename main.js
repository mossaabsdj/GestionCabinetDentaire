const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const { exec } = require("child_process");
const { shell } = require("electron");
const { Menu } = require("electron");
const { backupDatabase } = require("./backup");
const { restoreDatabase } = require("./restore");
let param = {};
try {
  param = require("./param.json");
} catch (e) {
  try {
    param = require(path.join(process.execPath, "..", "param.json"));
  } catch (e2) {}
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
            <h1>${param.title}</h1>
            <div class="subtitle">Pédiatre</div>
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

app.whenReady().then(() => {
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

function getElectronCabinet(customCab = {}) {
  let currentParam = {};
  try {
    currentParam = require("./param.json");
  } catch (e) {
    try {
      currentParam = require(path.join(process.execPath, "..", "param.json"));
    } catch (e2) {}
  }

  const cab = { ...currentParam, ...customCab };
  const doctorName = cab.doctorName || "Professeur";
  const doctorNameAr = cab.doctorNameAr || "بروفيسور";
  const specialty =
    cab.specialty || "Médecin Spécialiste en Pédiatrie et Néonatologie";
  const specialtyAr =
    cab.specialtyAr || "طبيبة مختصة في طب الأطفال و حديثي الولادة";
  const cabinetName = cab.cabinetName || "Cabinet Pédiatrique";
  const cabinetNameAr = cab.cabinetNameAr || "عيادة طب الأطفال";
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
    const basePath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked")
      : path.resolve(__dirname, "..", "app");
    const fullImagePath = path.join(basePath, "public", cleanPath);
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

ipcMain.on("printOrdonnance", (event, data) => {
  const {
    id,
    nom,
    prenom,
    age,
    consultationId,
    ordonnanceId,
    items = [],
    cabinet = {},
  } = data;

  const cab = getElectronCabinet(cabinet);

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

  // Génération du contenu des médicaments
  const medListHtml = items
    .map(
      (m, i) => `
        <div class="med-item">
          <div class="med-header">
            <div class="med-name">${i + 1}. ${m.name || ""} ${
              m.dosage || ""
            }</div>
            <div class="med-duration">${
              m.duration ||
              (m.quantity
                ? `${m.quantity} boîte${m.quantity > 1 ? "s" : ""}`
                : "")
            }</div>
          </div>
          <div class="med-frequency">${m.frequency || ""}</div>
        </div>`,
    )
    .join("");

  const printHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordonnance Médicale</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 29.7cm;
      height: 21cm;
      background: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
    }

    .ord-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 14.85cm;
      height: 21cm;
      border: 2px solid #2c3e50;
      padding: 0.8cm;
      display: flex;
      flex-direction: column;
    }

    /* Order Number - Top Right */
    .ord-num {
      position: absolute;
      top: 0.2cm;
      right: 0.2cm;
      font-size: 12px;
      color: #555;
      font-weight: 600;
      background: white;
      padding: 0.3rem 0.5rem;
      border-radius: 4px;
    }

    /* Header Section */
    .ord-header {
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 0.5rem;
      margin-top: 0rem;
    }

    .ord-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .ord-left,
    .ord-right {
      flex: 1;
      font-size: 13px;
      line-height: 1.5;
    }

    .ord-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 80px;
    }

    .ord-center img {
      max-width: 100%;
      height: auto;
      max-height: 80px;
      object-fit: contain;
    }

    .ord-right {
      text-align: right;
      direction: rtl;
      font-family: 'Arial', sans-serif;
    }

    .ord-left strong,
    .ord-right strong {
      color: #2c3e50;
      font-size: 14px;
    }

    .ord-phone {
      text-align: center;
      margin-top: 0.5rem;
      font-weight: 500;
      font-size: 13px;
    }

    /* Patient Information */
    .ord-patient {
      margin-top: 0.8rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 14px;
      padding: 0.5rem;
    }

    .ord-patient strong {
      color: #2c3e50;
    }

    /* Title */
    .ord-title {
      text-align: center;
      font-weight: bold;
      font-size: 20px;
      margin-top: 1rem;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      color: #2c3e50;
      letter-spacing: 1px;
    }

    /* Body - Medications */
    .ord-body {
      margin-top: 1.2rem;
      font-size: 16px;
      line-height: 1.8;
      flex: 1;
      overflow: auto;
    }

    .med-item {
      margin-bottom: 0.8rem;
    }

    .med-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
      margin-bottom: 0.2rem;
    }

    .med-name {
      font-weight: 700;
      font-size: 17px;
      color: #2c3e50;
      flex: 1;
    }

    .med-duration {
      font-size: 15px;
      color: #555;
      font-weight: 500;
      text-align: right;
    }

    .med-frequency {
      margin-left: 1rem;
      font-size: 15px;
      color: #555;
    }

    /* Footer */
    .ord-footer {
      text-align: left;
      margin-top: auto;
      padding-top: 0.8rem;
      min-height: 3cm;
      font-size: 14px;
      border-top: 1px dashed #2c3e50;
      font-style: italic;
      color: #555;
    }

    /* Print Optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="ord-container">
    <div class="ord-num">N° : ${consultationId}/${ordonnanceId}</div>

    <div class="ord-header">
      <div class="ord-header-top">
        <div class="ord-left">
          <strong>${cab.doctorName}</strong><br>
          ${cab.specialty}<br>
          <strong>Adresse :</strong> ${cab.address}<br>
          ${cab.city}
        </div>
        
        <div class="ord-center">
          <img src="${cab.imageUrl}" alt="Logo Cabinet Médical" onerror="this.src='/uploads/image.PNG'; this.onerror=null;">
        </div>

        <div class="ord-right">
          <strong>${cab.doctorNameAr}</strong><br>
          ${cab.specialtyAr}<br>
          <strong>العنوان :</strong> ${cab.addressAr}<br>
          ${cab.cityAr}
        </div>
      </div>
      
      <div class="ord-phone">
        <strong>Tél :</strong> ${cab.phones}
      </div>
    </div>

    <div class="ord-patient">
      <span><strong>Nom :</strong> ${nom}</span>
      <span><strong>Prénom :</strong> ${prenom}</span>
      <span><strong>Âge :</strong> ${age}</span>
      <span><strong>Le :</strong> ${new Date().toLocaleDateString(
        "fr-FR",
      )}</span>
    </div>

    <div class="ord-title">ORDONNANCE</div>

    <div class="ord-body">${medListHtml}</div>

    <div class="ord-footer">
      Signature et cachet du médecin
    </div>
  </div>
</body>
</html>
`;

  printWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(printHtml),
  );

  printWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: "none" },
          pageSize: { name: "A4", width: 297000, height: 210000 },
          landscape: true,
        },
        (success, failureReason) => {
          if (success) console.log("🖨️ Ordonnance printed successfully");
          else console.error("❌ Print failed:", failureReason);
          printWindow.close();
        },
      );
    }, 500);
  });
});

ipcMain.on("printBilan", (event, data) => {
  const {
    id,
    nom,
    prenom,
    age,
    consultationId,
    bilanId,
    items = [],
    cabinet = {},
  } = data;

  const cab = getElectronCabinet(cabinet);

  // 🪟 Allow file access for local image
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

  // 🔬 Generate list of analyses/exams
  const bilanListHtml = items
    .map(
      (b, i) => `
        <div class="bilan-item">
          <div class="bilan-name">${i + 1}. ${b.nom || b.name || ""}</div>
        </div>`,
    )
    .join("");

  // 🧾 HTML Layout (identical to Ordonnance)
  const printHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 landscape; margin: 0; }

    body {
      margin: 0;
      padding: 0;
      width: 29.7cm;
      height: 21cm;
      background: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
    }

    .ord-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 14.85cm;
      height: 21cm;
      border: 2px solid #2c3e50;
      padding: 0.8cm;
      display: flex;
      flex-direction: column;
    }

    .ord-num {
      position: absolute;
      top: 0.2cm;
      right: 0.2cm;
      font-size: 12px;
      color: #555;
      font-weight: 600;
      background: white;
      padding: 0.3rem 0.5rem;
      border-radius: 4px;
    }

    /* HEADER */
    .ord-header {
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 0.5rem;
    }

    .ord-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .ord-left, .ord-right {
      flex: 1;
      font-size: 13px;
      line-height: 1.5;
    }

    .ord-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 80px;
    }

    .ord-center img {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
    }

    .ord-right {
      text-align: right;
      direction: rtl;
    }

    .ord-left strong, .ord-right strong {
      color: #2c3e50;
      font-size: 14px;
    }

    .ord-phone {
      text-align: center;
      margin-top: 0.5rem;
      font-weight: 500;
      font-size: 13px;
    }

    /* PATIENT INFO */
    .ord-patient {
      margin-top: 0.8rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 14px;
      padding: 0.5rem;
    }

    .ord-title {
      text-align: center;
      font-weight: bold;
      font-size: 20px;
      margin-top: 1rem;
      text-decoration: underline;
      color: #2c3e50;
    }

    /* BODY */
    .ord-body {
      margin-top: 1.2rem;
      font-size: 16px;
      line-height: 1.8;
      flex: 1;
    }

    .bilan-item {
      margin-bottom: 1.2rem;
      font-size: 17px;
    }

    .bilan-name {
      font-weight: 600;
      color: #2c3e50;
    }

    /* FOOTER */
    .ord-footer {
      text-align: left;
      margin-top: auto;
      border-top: 1px dashed #2c3e50;
      padding-top: 0.8rem;
      font-style: italic;
      font-size: 14px;
      color: #555;
      min-height: 3cm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>

<body>
  <div class="ord-container">
    <div class="ord-num">N° de Bilan : ${consultationId}/${bilanId}</div>

    <div class="ord-header">
      <div class="ord-header-top">
        <div class="ord-left">
          <strong>${cab.doctorName}</strong><br>
          ${cab.specialty}<br>
          <strong>Adresse :</strong> ${cab.address}<br>
          ${cab.city}
        </div>

        <div class="ord-center">
          <img src="${cab.imageUrl}" alt="Logo Cabinet Médical" onerror="this.src='/uploads/image.PNG'; this.onerror=null;">
        </div>

        <div class="ord-right">
          <strong>${cab.doctorNameAr}</strong><br>
          ${cab.specialtyAr}<br>
          <strong>العنوان :</strong> ${cab.addressAr}<br>
          ${cab.cityAr}
        </div>
      </div>

      <div class="ord-phone">
        <strong>Tél :</strong> ${cab.phones}
      </div>
    </div>

    <div class="ord-patient">
      <span><strong>Nom :</strong> ${nom}</span>
      <span><strong>Prénom :</strong> ${prenom}</span>
      <span><strong>Âge :</strong> ${age}</span>
      <span><strong>Le :</strong> ${new Date().toLocaleDateString(
        "fr-FR",
      )}</span>
    </div>

    <div class="ord-title">BILAN</div>

    <div class="ord-body">${bilanListHtml}</div>

    <div class="ord-footer">Signature et cachet du médecin</div>
  </div>
</body>
</html>
`;

  // ✅ Load content
  printWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(printHtml),
  );

  // 🖨 Print setup
  printWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: "none" },
          pageSize: { name: "A4", width: 297000, height: 210000 },
          landscape: true,
        },
        (success, failureReason) => {
          if (success) console.log("🖨️ Bilan printed successfully");
          else console.error("❌ Print failed:", failureReason);
          printWindow.close();
        },
      );
    }, 500);
  });
});

ipcMain.on("printJustification", (event, data) => {
  const {
    id,
    nom,
    prenom,
    age,
    consultationId,
    justificationId,
    texte = "",
    cabinet = {},
  } = data;

  const cab = getElectronCabinet(cabinet);

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

  const formattedText = (texte || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((p) => `<p style="margin-bottom: 0.8rem; text-indent: 1rem;">${p}</p>`)
    .join("");

  const printHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 29.7cm;
      height: 21cm;
      background: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
    }

    .ord-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 14.85cm;
      height: 21cm;
      border: 2px solid #2c3e50;
      padding: 0.8cm;
      display: flex;
      flex-direction: column;
    }

    .ord-num {
      position: absolute;
      top: 0.2cm;
      right: 0.2cm;
      font-size: 12px;
      color: #555;
      font-weight: 600;
      background: white;
      padding: 0.3rem 0.5rem;
      border-radius: 4px;
    }

    /* HEADER */
    .ord-header {
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 0.5rem;
    }

    .ord-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .ord-left, .ord-right {
      flex: 1;
      font-size: 13px;
      line-height: 1.5;
    }

    .ord-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 80px;
    }

    .ord-center img {
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
    }

    .ord-right {
      text-align: right;
      direction: rtl;
    }

    .ord-left strong, .ord-right strong {
      color: #2c3e50;
      font-size: 14px;
    }

    .ord-phone {
      text-align: center;
      margin-top: 0.5rem;
      font-weight: 500;
      font-size: 13px;
    }

    /* PATIENT INFO */
    .ord-patient {
      margin-top: 0.8rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 14px;
      padding: 0.5rem;
    }

    .ord-title {
      text-align: center;
      font-weight: bold;
      font-size: 18px;
      margin-top: 0.9rem;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      color: #2c3e50;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* BODY */
    .ord-body {
      margin-top: 1.2rem;
      font-size: 15px;
      line-height: 1.8;
      flex: 1;
      overflow: auto;
      text-align: justify;
    }

    .ord-meta {
      margin-top: 0.5rem;
      font-size: 14px;
      color: #2c3e50;
      font-weight: 600;
    }

    /* FOOTER */
    .ord-footer {
      text-align: left;
      margin-top: auto;
      border-top: 1px dashed #2c3e50;
      padding-top: 0.8rem;
      font-style: italic;
      font-size: 14px;
      color: #555;
      min-height: 3cm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>

<body>
  <div class="ord-container">
    <div class="ord-num">N° : ${consultationId || "-"}/${justificationId || "-"}</div>

    <div class="ord-header">
      <div class="ord-header-top">
        <div class="ord-left">
          <strong>${cab.doctorName}</strong><br>
          ${cab.specialty}<br>
          <strong>Adresse :</strong> ${cab.address}<br>
          ${cab.city}
        </div>

        <div class="ord-center">
          <img src="${cab.imageUrl}" alt="Logo Cabinet Médical" onerror="this.src='/uploads/image.PNG'; this.onerror=null;">
        </div>

        <div class="ord-right">
          <strong>${cab.doctorNameAr}</strong><br>
          ${cab.specialtyAr}<br>
          <strong>العنوان :</strong> ${cab.addressAr}<br>
          ${cab.cityAr}
        </div>
      </div>

      <div class="ord-phone">
        <strong>Tél :</strong> ${cab.phones}
      </div>
    </div>

    <div class="ord-patient">
      <span><strong>Nom :</strong> ${nom}</span>
      <span><strong>Prénom :</strong> ${prenom}</span>
      <span><strong>Âge :</strong> ${age}</span>
      <span><strong>Le :</strong> ${new Date().toLocaleDateString(
        "fr-FR",
      )}</span>
    </div>

    <div class="ord-title">JUSTIFICATION MÉDICALE</div>

    <div class="ord-body">
      ${formattedText || "<p>Je soussigné(e), Docteur en médecine, certifie avoir examiné ce jour l'enfant mentionné ci-dessus et que son état de santé justifie ce certificat médical.</p>"}
    </div>

    <div class="ord-footer">Signature et cachet du médecin</div>
  </div>
</body>
</html>
`;

  // ✅ Load content
  printWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(printHtml),
  );

  // 🖨 Print setup
  printWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: "none" },
          pageSize: { name: "A4", width: 297000, height: 210000 },
          landscape: true,
        },
        (success, failureReason) => {
          if (success) console.log("🖨️ Justification printed successfully");
          else console.error("❌ Print failed:", failureReason);
          printWindow.close();
        },
      );
    }, 500);
  });
});

ipcMain.handle("backup-database", async () => {
  const timestamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Exporter la base de données (JSON)",
    defaultPath: `backup_amel_${timestamp}.json`,
    filters: [{ name: "Fichiers JSON", extensions: ["json"] }],
  });

  if (canceled || !filePath) {
    return { canceled: true, success: false, message: "Exportation annulée." };
  }

  try {
    const result = await backupDatabase(filePath);
    return {
      success: true,
      filePath: result.filePath,
      message: "Base de données exportée avec succès.",
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle("restore-database", async () => {
  // Let the user select a JSON backup file
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir un fichier de sauvegarde (JSON)",
    filters: [{ name: "Fichiers JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0)
    return {
      canceled: true,
      success: false,
      message: "Aucun fichier sélectionné",
    };

  const filePath = filePaths[0];
  console.log("🗂 Selected backup file:", filePath);
  try {
    const result = await restoreDatabase(filePath);
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
