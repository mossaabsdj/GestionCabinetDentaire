import param from "@/param.json";

/**
 * Universal printing helper for Ordonnance, Bilan and Justification.
 * Dispatches to Electron's IPC printer if running in Electron desktop app,
 * or opens a printable window in standard Web browsers.
 */

export function getCabinetHeader(data = {}) {
  const c = data.cabinet || {};
  return {
    title: c.title || param.title || "Professeur",
    doctorName: c.doctorName || param.doctorName || "Professeur",
    doctorNameAr: c.doctorNameAr || param.doctorNameAr || "بروفيسور",
    specialty:
      c.specialty ||
      param.specialty ||
      "Médecin Spécialiste en Pédiatrie et Néonatologie",
    specialtyAr:
      c.specialtyAr ||
      param.specialtyAr ||
      "طبيبة مختصة في طب الأطفال و حديثي الولادة",
    cabinetName: c.cabinetName || param.cabinetName || "Cabinet Pédiatrique",
    cabinetNameAr: c.cabinetNameAr || param.cabinetNameAr || "عيادة طب الأطفال",
    address:
      c.address || param.address || "Rue Frères KAFI logts 38, 1er étage",
    addressAr:
      c.addressAr ||
      param.addressAr ||
      "شارع الإخوة كافي عقار 38 الطابق الأول",
    city: c.city || param.city || "El-Harrouch SKIKDA",
    cityAr: c.cityAr || param.cityAr || "(بزاز لعلاوي) الحروش - سكيكدة",
    phones:
      c.phones || param.phones || "0652 76 89 72 / 0562 24 40 87",
    logo: c.logo || param.logo || "/uploads/image.PNG",
  };
}

export function printOrdonnance(data = {}) {
  const cab = getCabinetHeader(data);
  const dataWithCabinet = { ...data, cabinet: cab };

  // If running in Electron, use its native print window
  if (typeof window !== "undefined" && window?.electron?.printOrdonnance) {
    try {
      window.electron.printOrdonnance(dataWithCabinet);
      return;
    } catch (err) {
      console.warn(
        "Electron printOrdonnance failed, falling back to browser print:",
        err,
      );
    }
  }

  if (typeof window === "undefined") return;

  const {
    nom = "",
    prenom = "",
    age = "",
    consultationId = "",
    ordonnanceId = "",
    items = [],
  } = data;

  // Format medication list
  const medListHtml = (items || [])
    .map(
      (m, i) => `
        <div class="med-item">
          <div class="med-header">
            <div class="med-name">${i + 1}. ${m.name || m.nom || ""} ${
              m.dosage || ""
            }</div>
            <div class="med-duration">${
              m.duration ||
              m.duree ||
              (m.quantity || m.quantite
                ? `${m.quantity || m.quantite} boîte${(m.quantity || m.quantite) > 1 ? "s" : ""}`
                : "")
            }</div>
          </div>
          <div class="med-frequency">${m.frequency || m.frequence || ""}</div>
        </div>`,
    )
    .join("");

  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer l'ordonnance.");
    return;
  }

  const printHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordonnance Médicale - ${nom} ${prenom}</title>
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
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
    <div class="ord-num">N° : ${consultationId || "-"}/${ordonnanceId || "-"}</div>

    <div class="ord-header">
      <div class="ord-header-top">
        <div class="ord-left">
          <strong>${cab.doctorName}</strong><br>
          ${cab.specialty}<br>
          <strong>Adresse :</strong> ${cab.address}<br>
          ${cab.city}
        </div>
        
        <div class="ord-center">
          <img src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="Logo Cabinet">
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
      <span><strong>Le :</strong> ${new Date().toLocaleDateString("fr-FR")}</span>
    </div>

    <div class="ord-title">ORDONNANCE</div>

    <div class="ord-body">${medListHtml}</div>

    <div class="ord-footer">
      Signature et cachet du médecin
    </div>
  </div>

  <script>
    window.addEventListener("load", function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

export function printBilan(data = {}) {
  const cab = getCabinetHeader(data);
  const dataWithCabinet = { ...data, cabinet: cab };

  // If running in Electron, use its native print window
  if (typeof window !== "undefined" && window?.electron?.printBilan) {
    try {
      window.electron.printBilan(dataWithCabinet);
      return;
    } catch (err) {
      console.warn(
        "Electron printBilan failed, falling back to browser print:",
        err,
      );
    }
  }

  if (typeof window === "undefined") return;

  const {
    nom = "",
    prenom = "",
    age = "",
    consultationId = "",
    bilanId = "",
    items = [],
  } = data;

  const bilanListHtml = (items || [])
    .map(
      (b, i) => `
        <div class="bilan-item">
          <div class="bilan-name">${i + 1}. ${b.nom || b.name || ""}</div>
        </div>`,
    )
    .join("");

  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer le bilan.");
    return;
  }

  const printHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bilan Médical - ${nom} ${prenom}</title>
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
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
      height: auto;
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

    .ord-patient strong {
      color: #2c3e50;
    }

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

    /* BODY */
    .ord-body {
      margin-top: 1.2rem;
      font-size: 16px;
      line-height: 1.8;
      flex: 1;
      overflow: auto;
    }

    .bilan-item {
      margin-bottom: 1.2rem;
    }

    .bilan-name {
      font-weight: 600;
      font-size: 17px;
      color: #2c3e50;
    }

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
    <div class="ord-num">N° : ${consultationId || "-"}/${bilanId || "-"}</div>

    <div class="ord-header">
      <div class="ord-header-top">
        <div class="ord-left">
          <strong>${cab.doctorName}</strong><br>
          ${cab.specialty}<br>
          <strong>Adresse :</strong> ${cab.address}<br>
          ${cab.city}
        </div>

        <div class="ord-center">
          <img src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="Logo Cabinet">
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
      <span><strong>Le :</strong> ${new Date().toLocaleDateString("fr-FR")}</span>
    </div>

    <div class="ord-title">DEMANDE DE BILAN</div>

    <div class="ord-body">${bilanListHtml}</div>

    <div class="ord-footer">
      Signature et cachet du médecin
    </div>
  </div>

  <script>
    window.addEventListener("load", function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

export function printJustification(data = {}) {
  const cab = getCabinetHeader(data);
  const dataWithCabinet = { ...data, cabinet: cab };

  // If running in Electron, use its native print window
  if (typeof window !== "undefined" && window?.electron?.printJustification) {
    try {
      window.electron.printJustification(dataWithCabinet);
      return;
    } catch (err) {
      console.warn(
        "Electron printJustification failed, falling back to browser print:",
        err,
      );
    }
  }

  if (typeof window === "undefined") return;

  const {
    nom = "",
    prenom = "",
    age = "",
    consultationId = "",
    justificationId = "",
    texte = "",
  } = data;

  const formattedText = (texte || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((p) => `<p style="margin-bottom: 0.8rem; text-indent: 1rem;">${p}</p>`)
    .join("");

  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer la justification.");
    return;
  }

  const printHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Justification Médicale - ${nom} ${prenom}</title>
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
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
      height: auto;
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

    .ord-patient strong {
      color: #2c3e50;
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
          <img src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="Logo Cabinet">
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
      <span><strong>Le :</strong> ${new Date().toLocaleDateString("fr-FR")}</span>
    </div>

    <div class="ord-title">JUSTIFICATION MÉDICALE</div>

    <div class="ord-body">
      ${formattedText || "<p>Je soussigné(e), Docteur en médecine, certifie avoir examiné ce jour l'enfant mentionné ci-dessus et que son état de santé justifie ce certificat médical.</p>"}
    </div>

    <div class="ord-footer">
      Signature et cachet du médecin
    </div>
  </div>

  <script>
    window.addEventListener("load", function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}
