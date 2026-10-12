const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const { shell } = require("electron");
const { Menu } = require("electron");
const { backupDatabase } = require("./backup");
const { restoreDatabase } = require("./restore");
const { autoUpdater } = require("electron-updater");

let param = {
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
let mainWindow;
let splashWindow;
let serverProcess;
let updaterWindow;

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

  const splashHtml = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI','Roboto',sans-serif;background:transparent;display:flex;justify-content:center;align-items:center;height:100vh;overflow:hidden}.splash-container{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:20px;padding:40px;box-shadow:0 20px 60px rgba(102,126,234,0.4);text-align:center;width:500px;height:400px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;overflow:hidden}.splash-container::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%);animation:pulse 3s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.1);opacity:0.8}}.content{position:relative;z-index:1}.icon{width:100px;height:100px;background:white;border-radius:50%;display:flex;justify-content:center;align-items:center;margin:0 auto 25px;box-shadow:0 10px 30px rgba(0,0,0,0.2);animation:bounce 2s ease-in-out infinite}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}.icon svg{width:60px;height:60px;fill:#764ba2}h1{color:white;font-size:32px;font-weight:700;margin-bottom:8px;text-shadow:0 2px 10px rgba(0,0,0,0.2)}.subtitle{color:rgba(255,255,255,0.95);font-size:18px;font-weight:500;margin-bottom:35px}.loader{width:200px;height:6px;background:rgba(255,255,255,0.2);border-radius:10px;overflow:hidden;margin:0 auto}.loader-bar{height:100%;background:white;border-radius:10px;animation:loading 2s ease-in-out infinite;box-shadow:0 0 15px rgba(255,255,255,0.5)}@keyframes loading{0%{width:0%}50%{width:70%}100%{width:100%}}.version{color:rgba(255,255,255,0.7);font-size:12px;margin-top:20px;font-weight:400}</style></head><body><div class="splash-container"><div class="content"><div class="icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div><h1>${param.title}</h1><div class="subtitle">Cabinet Dentaire</div><div class="loader"><div class="loader-bar"></div></div><div class="version">Version 1.0.0</div></div></div></body></html>`;

  splashWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(splashHtml),
  );
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createUpdateWindow() {
  updaterWindow = new BrowserWindow({
    width: 600,
    height: 500,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const updateHtml = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:transparent;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;overflow:hidden}.update-container{width:600px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:24px;box-shadow:0 25px 80px rgba(0,0,0,0.3);padding:48px;text-align:center;color:white;position:relative;overflow:hidden}.update-container::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%);animation:rotate 20s linear infinite}@keyframes rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.content{position:relative;z-index:1}.icon-container{width:100px;height:100px;background:white;border-radius:50%;display:flex;justify-content:center;align-items:center;margin:0 auto 24px;box-shadow:0 12px 40px rgba(0,0,0,0.2);animation:pulse-icon 2s ease-in-out infinite}@keyframes pulse-icon{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}.icon-container svg{width:56px;height:56px;fill:#764ba2}h1{font-size:32px;font-weight:700;margin-bottom:12px;text-shadow:0 2px 12px rgba(0,0,0,0.2)}.subtitle{font-size:18px;opacity:0.95;font-weight:500;margin-bottom:8px}#status{font-size:16px;margin:24px 0;min-height:24px;opacity:0.9;font-weight:500}.progress-container{width:100%;height:8px;background:rgba(255,255,255,0.2);border-radius:12px;overflow:hidden;margin:24px 0;display:none}.progress-container.active{display:block}.progress-bar{height:100%;background:white;border-radius:12px;width:0%;transition:width 0.3s ease;box-shadow:0 0 20px rgba(255,255,255,0.5)}.buttons{display:none;gap:16px;margin-top:32px;justify-content:center}.buttons.active{display:flex}.btn{padding:14px 32px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s ease;font-family:inherit;min-width:140px}.btn-primary{background:white;color:#764ba2;box-shadow:0 6px 20px rgba(0,0,0,0.15)}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.2)}.btn-secondary{background:rgba(255,255,255,0.15);color:white;border:2px solid rgba(255,255,255,0.4)}.btn-secondary:hover{background:rgba(255,255,255,0.25);transform:translateY(-2px)}.spinner{width:40px;height:40px;border:4px solid rgba(255,255,255,0.2);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;margin:24px auto;display:none}.spinner.active{display:block}@keyframes spin{to{transform:rotate(360deg)}}.version-info{margin-top:24px;padding:16px;background:rgba(255,255,255,0.1);border-radius:12px;font-size:14px;display:none}.version-info.active{display:block}.version-info p{margin:8px 0}</style></head><body><div class="update-container"><div class="content"><div class="icon-container"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div><h1>${param.title}</h1><div class="subtitle">Cabinet Dentaire</div><div id="status">Vérification des mises à jour...</div><div class="spinner active" id="spinner"></div><div class="progress-container" id="progressContainer"><div class="progress-bar" id="progressBar"></div></div><div class="version-info" id="versionInfo"></div><div class="buttons" id="buttons"><button class="btn btn-primary" id="btnUpdate">Mettre à jour</button><button class="btn btn-secondary" id="btnSkip">Plus tard</button></div></div></div><script>const {ipcRenderer}=require("electron");const statusEl=document.getElementById("status");const spinnerEl=document.getElementById("spinner");const buttonsEl=document.getElementById("buttons");const progressContainer=document.getElementById("progressContainer");const progressBar=document.getElementById("progressBar");const versionInfo=document.getElementById("versionInfo");const btnUpdate=document.getElementById("btnUpdate");const btnSkip=document.getElementById("btnSkip");ipcRenderer.on("update-status",(event,data)=>{statusEl.textContent=data.message;if(data.type==="checking"){spinnerEl.classList.add("active");buttonsEl.classList.remove("active");progressContainer.classList.remove("active")}if(data.type==="available"){spinnerEl.classList.remove("active");buttonsEl.classList.add("active");versionInfo.classList.add("active");versionInfo.innerHTML=\`<p><strong>Nouvelle version disponible</strong></p><p>Version: \${data.version||'N/A'}</p>\`}if(data.type==="downloading"){spinnerEl.classList.remove("active");buttonsEl.classList.remove("active");progressContainer.classList.add("active");progressBar.style.width=data.percent+"%"}if(data.type==="downloaded"){spinnerEl.classList.remove("active");progressContainer.classList.remove("active");statusEl.textContent="✅ Mise à jour téléchargée ! Redémarrage..."}if(data.type==="not-available"||data.type==="error"){spinnerEl.classList.remove("active");buttonsEl.classList.remove("active");progressContainer.classList.remove("active")}});btnUpdate.addEventListener("click",()=>{ipcRenderer.send("start-update");buttonsEl.classList.remove("active");spinnerEl.classList.add("active");statusEl.textContent="Préparation de la mise à jour..."});btnSkip.addEventListener("click",()=>{ipcRenderer.send("skip-update")});</script></body></html>`;

  updaterWindow.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(updateHtml),
  );
  updaterWindow.on("closed", () => {
    updaterWindow = null;
  });
  return updaterWindow;
}

function sendUpdateStatus(message, type = "checking", extra = {}) {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.webContents.send("update-status", {
      message,
      type,
      ...extra,
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    resizable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });

  const serverUrl = "http://localhost:3000";
  const checkServer = setInterval(() => {
    fetch(serverUrl)
      .then(() => {
        clearInterval(checkServer);
        mainWindow.loadURL(serverUrl);
      })
      .catch(() => console.log("Waiting for server..."));
  }, 1000);

  mainWindow.once("ready-to-show", () => {
    setTimeout(() => {
      if (splashWindow) splashWindow.close();
      mainWindow.show();
      mainWindow.maximize();
    }, 2000);
  });
}

function createMenu() {
  const template = [
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "toggledevtools" }],
    },
    { label: "🚪 Exit", click: () => app.quit() },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function startApp() {
  createSplashScreen();
  createWindow();
  createMenu();
  const serverScript = path.join(__dirname, "server.js");
  serverProcess = fork(serverScript);
}

app.whenReady().then(() => {
  updaterWindow = createUpdateWindow();
  autoUpdater.autoDownload = false;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus("🔍 Vérification des mises à jour...", "checking");
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus(
      "🎉 Une nouvelle mise à jour est disponible !",
      "available",
      { version: info.version },
    );
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateStatus("✅ Vous avez la dernière version", "not-available");
    setTimeout(() => {
      if (updaterWindow) updaterWindow.close();
      startApp();
    }, 1500);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent);
    sendUpdateStatus(`📥 Téléchargement... ${percent}%`, "downloading", {
      percent,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    sendUpdateStatus("✅ Mise à jour téléchargée !", "downloaded");
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 2000);
  });

  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
    sendUpdateStatus("❌ Erreur lors de la mise à jour", "error");
    setTimeout(() => {
      if (updaterWindow) updaterWindow.close();
      startApp();
    }, 2000);
  });

  ipcMain.on("start-update", () => {
    autoUpdater.downloadUpdate();
  });
  ipcMain.on("skip-update", () => {
    if (updaterWindow) updaterWindow.close();
    startApp();
  });

  autoUpdater.checkForUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
  if (serverProcess) serverProcess.kill();
});
ipcMain.handle("get-app-path", () => {
  return path.dirname(path.dirname(app.getAppPath()));
});

ipcMain.on("printOrdonnance", (event, data) => {
  const {
    id,
    nom,
    prenom,
    age,
    consultationId,
    ordonnanceId,
    items = [],
  } = data;
  const basePath = app.isPackaged
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, "..", "app");

  const imagePath = path.join(basePath, "public/uploads", "image.PNG");
  const imageUrl = `file://${imagePath
    .replace(/\\/g, "/")
    .replace(/ /g, "%20")}`;
  console.log("🖼️ imageUrl:", imageUrl);
  console.log(imageUrl);
  const printWindow = new BrowserWindow({
    show: true,
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // disable cross-origin blocking
      allowFileAccessFromFileURLs: true,
      allowUniversalAccessFromFileURLs: true, // <== important extra flag
      allowFileAccessFromFileURLs: true, // ✅ for file:// images
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
  min-height: 3cm;  /* ارتفاع أدنى للتوقيع */
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
          <strong>${param.doctorName || "Docteur"}</strong><br>
          ${param.specialty || "Chirurgien Dentiste"}<br>
          <strong>Adresse :</strong> ${param.address || "Rue Frères KAFI logts 38, 1er étage"}<br>
          ${param.city || "El-Harrouch SKIKDA"}
        </div>
        
        <div class="ord-center">
          <img src="${imageUrl}" alt="Logo Cabinet Médical">
        </div>

        <div class="ord-right">
          <strong>${param.doctorNameAr || "طبيب"}</strong><br>
          ${param.specialtyAr || "جراحة الأسنان"}<br>
          <strong>العنوان :</strong> ${param.addressAr || "شارع الإخوة كافي عقار 38 الطابق الأول"}<br>
          ${param.cityAr || "(بزاز لعلاوي) الحروش - سكيكدة"}
        </div>
      </div>
      
      <div class="ord-phone">
        <strong>Tél :</strong> ${param.phones || "0652 76 89 72 / 0562 24 40 87"}
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
  const { id, nom, prenom, age, consultationId, bilanId, items = [] } = data;

  // 🧱 Safe base path (works in dev & prod)
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "public")
    : path.resolve(__dirname, "..", "app");

  const imagePath = path.join(basePath, "public/uploads", "image.PNG");

  // 🧩 Encode spaces for file://
  const imageUrl = `file://${imagePath
    .replace(/\\/g, "/")
    .replace(/ /g, "%20")}`;
  console.log("🧾 Bilan imageUrl:", imageUrl);

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
          <strong>${param.doctorName || "Docteur"}</strong><br>
          ${param.specialty || "Chirurgien Dentiste"}<br>
          <strong>Adresse :</strong> ${param.address || "Rue Frères KAFI logts 38, 1er étage"}<br>
          ${param.city || "El-Harrouch SKIKDA"}
        </div>

        <div class="ord-center">
          <img src="${imageUrl}" alt="Logo Cabinet Médical">
        </div>

        <div class="ord-right">
          <strong>${param.doctorNameAr || "طبيب"}</strong><br>
          ${param.specialtyAr || "جراحة الأسنان"}<br>
          <strong>العنوان :</strong> ${param.addressAr || "شارع الإخوة كافي عقار 38 الطابق الأول"}<br>
          ${param.cityAr || "(بزاز لعلاوي) الحروش - سكيكدة"}
        </div>
      </div>

      <div class="ord-phone">
        <strong>Tél :</strong> ${param.phones || "0652 76 89 72 / 0562 24 40 87"}
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

ipcMain.handle("backup-database", async () => {
  backupDatabase();
});
ipcMain.handle("restore-database", async () => {
  // Let the user select a .sql file
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir un fichier de sauvegarde",
    filters: [{ name: "SQL Files", extensions: ["sql"] }],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0)
    return { success: false, message: "Aucun fichier sélectionné" };

  const filePath = filePaths[0];
  console.log("🗂 Selected backup file:", filePath);
  restoreDatabase(filePath);
  return { success: true, message: "Restauration démarrée" };
});
ipcMain.handle("open-file", async (event, filePath) => {
  await shell.openPath(filePath);
});
ipcMain.on("exit", () => {
  app.quit();
});
