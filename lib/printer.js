/**
 * Universal printing helper for Ordonnance, Bilan and Justification.
 * Dispatches to Electron's IPC printer if running in Electron desktop app,
 * or opens a printable window in standard Web browsers.
 */

const DEFAULT_CABINET_DATA = {
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
export async function getCabinetFromDb() {
  try {
    const res = await fetch("/api/cabinet", {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (res.ok) {
      const dbCabinet = await res.json();
      if (
        dbCabinet &&
        typeof dbCabinet === "object" &&
        (dbCabinet.id || dbCabinet.doctorName)
      ) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("cabinet", JSON.stringify(dbCabinet));
          } catch (e) {}
        }
        return dbCabinet;
      }
    }
  } catch (err) {
    console.warn("Erreur de récupération du cabinet depuis la BDD:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const item = localStorage.getItem("cabinet");
      if (item) return JSON.parse(item);
    } catch (e) {}
  }

  return {};
}

export function getCabinetHeader(data = {}, dbCabinet = {}) {
  let storedCab = {};
  if (typeof window !== "undefined") {
    try {
      const item = localStorage.getItem("cabinet");
      if (item) storedCab = JSON.parse(item);
    } catch (e) {}
  }
  const c = { ...storedCab, ...dbCabinet, ...(data.cabinet || {}) };
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
      c.addressAr || param.addressAr || "شارع الإخوة كافي عقار 38 الطابق الأول",
    city: c.city || param.city || "El-Harrouch SKIKDA",
    cityAr: c.cityAr || param.cityAr || "(بزاز لعلاوي) الحروش - سكيكدة",
    phones: c.phones || param.phones || "0652 76 89 72 / 0562 24 40 87",
    logo: c.logo || param.logo || "/uploads/image.PNG",
  };
}
// Small helper: escape user-provided text before injecting it into the print HTML.
function ordEsc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOrdonnanceHtml(
  { nom, prenom, age, consultationId, ordonnanceId, items },
  cab,
) {
  // Normalise medications (same field aliases as before + optional instructions)
  const meds = (items || []).map((m, i) => {
    const qty = m.quantity || m.quantite;
    const duration =
      m.duration || m.duree || (qty ? `${qty} boîte${qty > 1 ? "s" : ""}` : "");
    return {
      num: i + 1,
      name: `${m.name || m.nom || ""} ${m.dosage || ""}`.trim(),
      duration: String(duration || ""),
      frequency: String(m.frequency || m.frequence || ""),
      notes: String(
        m.instructions ||
          m.instruction ||
          m.administration ||
          m.notes ||
          m.note ||
          m.remarque ||
          "",
      ),
      cont: false,
    };
  });

  // Safe JSON for embedding inside <script>
  const medsJson = JSON.stringify(meds)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const today = new Date().toLocaleDateString("fr-FR");

  // Header / footer values (reference layout: contact details live in the footer)
  const ICON_PHONE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2f6db5"/><path fill="#fff" transform="translate(5.6 5.6) scale(0.53)" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
  const ICON_PIN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2f6db5"/><path fill="#fff" transform="translate(5.6 5.2) scale(0.53)" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
  const addrFr = [cab.address, cab.city].filter(Boolean).join(", ");
  const addrAr = [cab.addressAr, cab.cityAr].filter(Boolean).join(" - ");
  const orderNum = cab.numOrdre || cab.orderNumber || "2212/12"; // N° d'Ordre
  const orderHtml = orderNum
    ? `\n        <div class="ord-order">N° d'Ordre : ${ordEsc(consultationId) || "-"}/${ordEsc(ordonnanceId) || "-"}</div>`
    : "";
  const phonesHtml = cab.phones
    ? `\n          <span class="ord-contact-item">${ICON_PHONE}<span>${cab.phones}</span></span>`
    : "";
  const addrHtml = addrFr
    ? `\n          <span class="ord-contact-item">${ICON_PIN}<span>${addrFr}</span></span>`
    : "";
  const addrArHtml = addrAr
    ? `\n        <div class="ord-contact-ar">${addrAr}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordonnance Médicale - ${ordEsc(nom)} ${ordEsc(prenom)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    :root { --s: 1; } /* font scale, chosen automatically (1 → 0.85 minimum) */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body { background: white; }

    body {
      width: 29.7cm;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* One .page = one A4 landscape sheet; the prescription uses the left half */
    .page {
      position: relative;
      width: 29.7cm;
      height: 20.95cm; /* slightly under 21cm: avoids phantom blank pages */
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .ord-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 14.85cm;
      height: 20.95cm;
      border: 2px solid #2c3e50;
      padding: 0.6cm 0.7cm 0.5cm;
      display: flex;
      flex-direction: column;
    }
    .ord-container > * { flex: 0 0 auto; }
    .ord-container > .ord-body { flex: 1 1 0; min-height: 0; }
    .measuring .ord-container > .ord-body { flex: 0 0 auto; }

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
      padding-bottom: 0.35rem;
    }
    .ord-header::after {
      content: "";
      display: block;
      height: 1.5px;
      margin-top: 0.35rem;
      background: linear-gradient(to right, transparent, #a8323e 12%, #a8323e 88%, transparent);
    }
    .ord-header.compact { padding-bottom: 0.2rem; }

    .ord-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
    }

    .ord-left,
    .ord-right {
      flex: 1;
      min-width: 0;
      font-size: calc(13px * var(--s));
      line-height: 1.5;
      font-weight: 600;
      color: #222;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .compact .ord-left,
    .compact .ord-right { font-size: calc(12px * var(--s)); }

    .ord-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(80px * var(--s));
      height: calc(80px * var(--s));
    }
    .ord-center img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .ord-right {
      direction: rtl;
      font-family: 'Arial', sans-serif;
    }

    .ord-left strong,
    .ord-right strong {
      color: #a8323e;
      font-size: calc(15px * var(--s));
      font-weight: 800;
    }
    .compact .ord-left strong,
    .compact .ord-right strong { font-size: calc(13px * var(--s)); }

    .ord-order {
      text-align: center;
      margin-top: 0.25rem;
      font-size: calc(11px * var(--s));
      font-weight: 600;
      color: #222;
    }

    /* Patient Information */
    .ord-patient {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.3rem 0.5rem;
      font-size: calc(14px * var(--s));
      padding: 0.3rem 0.5rem;
      overflow-wrap: anywhere;
    }
    .ord-patient strong { color: #2c3e50; }
    .later .ord-patient { margin-top: 0.3rem; font-size: calc(12.5px * var(--s)); }

    /* Title */
    .ord-title {
      text-align: center;
      font-weight: bold;
      font-size: calc(20px * var(--s));
      margin-top: 0.7rem;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      color: #2c3e50;
      letter-spacing: 1px;
    }
    .later .ord-title { font-size: calc(16px * var(--s)); margin-top: 0.4rem; }

    /* Body - Medications */
    .ord-body {
      position: relative;
      margin-top: calc(14px * var(--s));
      font-size: calc(16px * var(--s));
      line-height: 1.5;
    }

    /* Logo watermark behind the medications (does not affect layout/pagination) */
    .ord-watermark {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-height: 95%;
      object-fit: contain;
      opacity: 0.09; /* raise/lower to make the watermark stronger/fainter */
      pointer-events: none;
      z-index: 0;
    }

    .med-item {
      position: relative;
      z-index: 1;
      margin-bottom: calc(10px * var(--s));
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .med-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
      margin-bottom: 0.1rem;
    }

    .med-name {
      font-weight: 700;
      font-size: calc(17px * var(--s));
      color: #2c3e50;
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .med-duration {
      font-size: calc(15px * var(--s));
      color: #555;
      font-weight: 500;
      text-align: right;
      flex-shrink: 0;
      max-width: 45%;
      overflow-wrap: anywhere;
    }

    .med-frequency,
    .med-notes {
      margin-left: 1rem;
      font-size: calc(15px * var(--s));
      color: #555;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .med-notes {
      font-size: calc(14px * var(--s));
      font-style: italic;
    }

    /* Footer */
    .ord-footer {
      position: relative;
      text-align: left;
      padding-top: 0.6rem;
      min-height: 2.6cm;
      font-size: calc(14px * var(--s));
      border-top: 1px dashed #2c3e50;
      font-style: italic;
      color: #555;
    }
    .ord-footer.ord-cont {
      min-height: 0;
      padding-top: 0.3rem;
      font-size: calc(12px * var(--s));
    }

    .ord-pageno {
      position: absolute;
      right: 0;
      bottom: 0.1cm;
      font-size: 11px;
      color: #777;
      font-style: normal;
    }

    /* Contact footer (repeated on every page) */
    .ord-contact {
      margin-top: 0.35rem;
      font-size: 11px;
      font-weight: 600;
      color: #222;
    }
    .ord-contact::before {
      content: "";
      display: block;
      height: 1.5px;
      margin-bottom: 0.35rem;
      background: linear-gradient(to right, transparent, #2f6db5 12%, #2f6db5 88%, transparent);
    }
    .ord-contact-row {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.2rem 0.9rem;
      line-height: 1.4;
    }
    .ord-contact-item {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .ord-contact-item svg { width: 14px; height: 14px; flex: none; }
    .ord-contact-ar {
      margin-top: 0.15rem;
      text-align: center;
      direction: rtl;
      font-family: 'Arial', sans-serif;
      font-size: 10.5px;
      font-weight: 600;
    }

    #measure {
      position: absolute;
      top: 0;
      left: 0;
      width: 29.7cm;
      visibility: hidden;
      pointer-events: none;
    }

    @media screen {
      body { background: #e5e5e5; }
      .page { background: white; margin-bottom: 10px; }
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
  <!-- Templates cloned on every page (header content is unchanged) -->
  <div id="tpl" style="display:none">
    <div id="t-num"></div>

    <div id="t-header-full">
      <div class="ord-header">
        <div class="ord-header-top">
          <div class="ord-left">
            <strong>${cab.doctorName}</strong><br>
            ${cab.specialty}
          </div>

          <div class="ord-center">
            <img src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="Logo Cabinet">
          </div>

          <div class="ord-right">
            <strong>${cab.doctorNameAr}</strong><br>
            ${cab.specialtyAr}
          </div>
        </div>${orderHtml}
      </div>
    </div>

    <div id="t-header-compact">
      <div class="ord-header compact">
        <div class="ord-header-top">
          <div class="ord-left"><strong>${cab.doctorName}</strong> — ${cab.specialty}</div>
          <div class="ord-right"><strong>${cab.doctorNameAr}</strong></div>
        </div>
      </div>
    </div>

    <div id="t-contact">
      <div class="ord-contact">
        <div class="ord-contact-row">${phonesHtml}${addrHtml}
        </div>${addrArHtml}
      </div>
    </div>

    <div id="t-watermark">
      <img class="ord-watermark" src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="">
    </div>

    <div id="t-patient">
      <div class="ord-patient">
        <span><strong>Nom :</strong> ${ordEsc(nom)}</span>
        <span><strong>Prénom :</strong> ${ordEsc(prenom)}</span>
        <span><strong>Âge :</strong> ${ordEsc(age)}</span>
        <span><strong>Le :</strong> ${today}</span>
      </div>
    </div>
  </div>

  <div id="pages"></div>

  <script>
    (function () {
      var MEDS = ${medsJson};
      // Font scales tried from largest to smallest. 0.85 keeps the smallest text
      // at ~12px (≈9pt) for details/instructions: the readable minimum.
      var SCALES = [1, 0.95, 0.9, 0.85];
      var SAFETY = 4; // px kept free at the bottom of each page body

      var root = document.getElementById("pages");
      var host = document.createElement("div");
      host.id = "measure";
      document.body.appendChild(host);

      function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text; // textContent: nothing is ever interpreted as HTML
        return e;
      }
      function tplHtml(id) { return document.getElementById(id).innerHTML; }
      function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
      function setScale(s) { document.documentElement.style.setProperty("--s", String(s)); }

      function buildItem(m) {
        var d = el("div", "med-item");
        var h = el("div", "med-header");
        h.appendChild(el("div", "med-name", m.num + ". " + m.name + (m.cont ? " (suite)" : "")));
        if (m.duration) h.appendChild(el("div", "med-duration", m.duration));
        d.appendChild(h);
        if (m.frequency) d.appendChild(el("div", "med-frequency", m.frequency));
        if (m.notes) d.appendChild(el("div", "med-notes", m.notes));
        return d;
      }

      function buildPage(first, last) {
        var page = el("div", "page");
        var c = el("div", "ord-container" + (first ? "" : " later"));
        var html = '<div class="ord-num">' + tplHtml("t-num") + "</div>";
        html += tplHtml(first ? "t-header-full" : "t-header-compact");
        html += tplHtml("t-patient");
        html += '<div class="ord-title">ORDONNANCE' + (first ? "" : " (suite)") + "</div>";
        html += '<div class="ord-body">' + tplHtml("t-watermark") + "</div>";
        html += last
          ? '<div ><div class="ord-pageno"></div></div>'
          : '<div class="ord-footer ord-cont">Suite page suivante &rarr;<div class="ord-pageno"></div></div>';
        html += tplHtml("t-contact");
        c.innerHTML = html;
        page.appendChild(c);
        return page;
      }

      // ---- measuring ----------------------------------------------------
      var capCache = {};
      var mbody = null;

      // Free height available for medications on a given kind of page
      function cap(first, last) {
        var key = (first ? "1" : "0") + (last ? "1" : "0");
        if (capCache[key] == null) {
          var p = buildPage(first, last);
          host.appendChild(p);
          capCache[key] = p.querySelector(".ord-body").getBoundingClientRect().height - SAFETY;
          host.removeChild(p);
        }
        return capCache[key];
      }

      // Real rendered height (with bottom margin) of a medication block
      function itemHeight(m) {
        mbody.innerHTML = "";
        var e = buildItem(m);
        mbody.appendChild(e);
        var h = e.getBoundingClientRect().height + parseFloat(getComputedStyle(e).marginBottom || "0");
        mbody.innerHTML = "";
        return h;
      }

      // Last resort: a single medication taller than a whole page is split at a
      // word boundary (nothing is ever dropped). Returns [head, rest] or null.
      function splitItem(m, capacity) {
        var field = m.notes.length >= m.frequency.length ? "notes" : "frequency";
        var toks = m[field].match(/\\S+\\s*/g) || [];
        if (toks.length < 2) return null;
        function part(a, b) { return toks.slice(a, b).join("").trim(); }
        function head(k) {
          var h = copy(m);
          h[field] = part(0, k);
          if (field === "frequency") h.notes = "";
          return h;
        }
        var lo = 0, hi = toks.length - 1;
        while (lo < hi) {
          var mid = Math.ceil((lo + hi) / 2);
          if (itemHeight(head(mid)) <= capacity) lo = mid; else hi = mid - 1;
        }
        if (lo < 1) return null;
        var rest = copy(m);
        rest.cont = true;
        rest.duration = "";
        rest[field] = part(lo, toks.length);
        if (field === "notes") rest.frequency = "";
        return [head(lo), rest];
      }

      // ---- pagination for one font scale ---------------------------------
      function layout(scale) {
        setScale(scale);
        capCache = {};
        host.innerHTML = "";
        var mp = buildPage(true, false);
        mp.classList.add("measuring");
        host.appendChild(mp);
        mbody = mp.querySelector(".ord-body");

        var queue = MEDS.map(copy);
        var pages = [], cur = [], used = 0;

        while (queue.length) {
          var m = queue.shift();
          var h = itemHeight(m);
          var c = cap(pages.length === 0, false);
          if (used + h <= c) { cur.push(m); used += h; continue; }
          if (cur.length === 0) {
            // does not fit even alone on an empty page
            var sp = splitItem(m, c);
            if (sp) { cur.push(sp[0]); queue.unshift(sp[1]); } else { cur.push(m); }
            pages.push(cur); cur = []; used = 0;
            continue;
          }
          pages.push(cur); cur = []; used = 0;
          queue.unshift(m);
        }
        if (cur.length || !pages.length) pages.push(cur);

        // The last page carries the (taller) signature footer: make sure it fits
        for (var guard = 0; guard < 500; guard++) {
          var li = pages.length - 1, lp = pages[li];
          var lc = cap(li === 0, true);
          var tot = 0;
          for (var i = 0; i < lp.length; i++) tot += itemHeight(lp[i]);
          if (tot <= lc || lp.length === 0) break;
          if (lp.length === 1) {
            var s2 = splitItem(lp[0], lc);
            if (!s2) break;
            pages[li] = [s2[0]];
            pages.push([s2[1]]);
            continue;
          }
          pages.push([lp.pop()]);
        }
        return pages;
      }

      function render(pages) {
        root.innerHTML = "";
        pages.forEach(function (items, i) {
          var first = i === 0, last = i === pages.length - 1;
          var p = buildPage(first, last);
          var b = p.querySelector(".ord-body");
          items.forEach(function (m) { b.appendChild(buildItem(m)); });
          if (pages.length > 1) {
            p.querySelector(".ord-pageno").textContent = "Page " + (i + 1) + " / " + pages.length;
          }
          root.appendChild(p);
        });
      }

      function run() {
        // Fewest pages possible at the minimum readable size, then the LARGEST
        // font scale that still gives that same number of pages.
        var minScale = SCALES[SCALES.length - 1];
        var best = layout(minScale), bestScale = minScale;
        for (var i = 0; i < SCALES.length - 1; i++) {
          var L = layout(SCALES[i]);
          if (L.length === best.length) { best = L; bestScale = SCALES[i]; break; }
        }
        setScale(bestScale);
        if (host.parentNode) host.parentNode.removeChild(host);
        render(best);
        function go() {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 250);
        }
        ready(".ord-watermark").then(go, go);
      }

      // Wait for the logo + fonts so measured heights are final
      function ready(sel) {
        var waits = [];
        var imgs = document.querySelectorAll(sel || "#tpl img");
        for (var i = 0; i < imgs.length; i++) {
          (function (img) {
            if (img.complete) return;
            waits.push(new Promise(function (res) {
              img.addEventListener("load", res);
              img.addEventListener("error", res);
            }));
          })(imgs[i]);
        }
        if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
        return Promise.race([
          Promise.all(waits),
          new Promise(function (res) { setTimeout(res, 1500); })
        ]);
      }

      window.addEventListener("load", function () {
        ready().then(run, run);
      });
    })();
  </script>
</body>
</html>`;
}

export async function printOrdonnance(data = {}) {
  let dbCab = data.cabinet;
  if (!dbCab || Object.keys(dbCab).length === 0) {
    dbCab = await getCabinetFromDb();
  }
  const cab = getCabinetHeader(data, dbCab);
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

  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer l'ordonnance.");
    return;
  }

  const printHtml = buildOrdonnanceHtml(
    { nom, prenom, age, consultationId, ordonnanceId, items },
    cab,
  );

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

// NOTE: uses the `ordEsc` helper defined next to printOrdonnance.
// If printBilan lives in another file, export ordEsc from there and import it here
// (do not declare it twice in the same module).

/**
 * Builds the full print document for the "Demande de bilan".
 * Pagination is done inside the print window at load time by measuring the
 * real rendered height of every bilan, so it depends on the actual content.
 */
// NOTE: uses the `ordEsc` helper defined next to printOrdonnance.
// If printBilan lives in another file, export ordEsc from there and import it here
// (do not declare it twice in the same module).

/**
 * Builds the full print document for the "Demande de bilan".
 * Pagination is done inside the print window at load time by measuring the
 * real rendered height of every bilan, so it depends on the actual content.
 */
// NOTE: uses the `ordEsc` helper defined next to printOrdonnance.
// If printBilan lives in another file, export ordEsc from there and import it here
// (do not declare it twice in the same module).

/**
 * Builds the full print document for the "Demande de bilan".
 * Pagination is done inside the print window at load time by measuring the
 * real rendered height of every bilan, so it depends on the actual content.
 */
// NOTE: uses the `ordEsc` helper defined next to printOrdonnance.
// If printBilan lives in another file, export ordEsc from there and import it here
// (do not declare it twice in the same module).

/**
 * Builds the full print document for the "Demande de bilan".
 * Pagination is done inside the print window at load time by measuring the
 * real rendered height of every bilan, so it depends on the actual content.
 */
function buildBilanHtml(
  { nom, prenom, age, consultationId, bilanId, items },
  cab,
) {
  const bilans = (items || []).map((b, i) => ({
    num: i + 1,
    name: String(b.nom || b.name || ""),
    // optional extra text (not required by the existing data structure)
    notes: String(
      b.instructions || b.instruction || b.notes || b.note || b.remarque || "",
    ),
    cont: false,
  }));

  // Safe JSON for embedding inside <script>
  const bilansJson = JSON.stringify(bilans)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const today = new Date().toLocaleDateString("fr-FR");

  // Header / footer values (reference layout: contact details live in the footer)
  const ICON_PHONE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2f6db5"/><path fill="#fff" transform="translate(5.6 5.6) scale(0.53)" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
  const ICON_PIN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2f6db5"/><path fill="#fff" transform="translate(5.6 5.2) scale(0.53)" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
  const addrFr = [cab.address, cab.city].filter(Boolean).join(", ");
  const addrAr = [cab.addressAr, cab.cityAr].filter(Boolean).join(" - ");
  const orderNum = cab.numOrdre || cab.orderNumber || "2212/12"; // N° d'Ordre
  const orderHtml = orderNum
    ? `\n        <div class="ord-order">N° d'Ordre : ${ordEsc(consultationId) || "-"}/${ordEsc(bilanId) || "-"}</div>`
    : "";
  const phonesHtml = cab.phones
    ? `\n          <span class="ord-contact-item">${ICON_PHONE}<span>${cab.phones}</span></span>`
    : "";
  const addrHtml = addrFr
    ? `\n          <span class="ord-contact-item">${ICON_PIN}<span>${addrFr}</span></span>`
    : "";
  const addrArHtml = addrAr
    ? `\n        <div class="ord-contact-ar">${addrAr}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bilan Médical - ${ordEsc(nom)} ${ordEsc(prenom)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    :root { --s: 1; } /* font scale, chosen automatically (1 → 0.85 minimum) */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body { background: white; }

    body {
      width: 29.7cm;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* One .page = one A4 landscape sheet; the document uses the left half */
    .page {
      position: relative;
      width: 29.7cm;
      height: 20.95cm; /* slightly under 21cm: avoids phantom blank pages */
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .ord-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 14.85cm;
      height: 20.95cm;
      border: 2px solid #2c3e50;
      padding: 0.6cm 0.7cm 0.5cm;
      display: flex;
      flex-direction: column;
    }
    .ord-container > * { flex: 0 0 auto; }
    .ord-container > .ord-body { flex: 1 1 0; min-height: 0; }
    .measuring .ord-container > .ord-body { flex: 0 0 auto; }

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
      padding-bottom: 0.35rem;
    }
    .ord-header::after {
      content: "";
      display: block;
      height: 1.5px;
      margin-top: 0.35rem;
      background: linear-gradient(to right, transparent, #a8323e 12%, #a8323e 88%, transparent);
    }
    .ord-header.compact { padding-bottom: 0.2rem; }

    .ord-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
    }

    .ord-left,
    .ord-right {
      flex: 1;
      min-width: 0;
      font-size: calc(13px * var(--s));
      line-height: 1.5;
      font-weight: 600;
      color: #222;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .compact .ord-left,
    .compact .ord-right { font-size: calc(12px * var(--s)); }

    .ord-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(80px * var(--s));
      height: calc(80px * var(--s));
    }
    .ord-center img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .ord-right {
      direction: rtl;
    }

    .ord-left strong,
    .ord-right strong {
      color: #a8323e;
      font-size: calc(15px * var(--s));
      font-weight: 800;
    }
    .compact .ord-left strong,
    .compact .ord-right strong { font-size: calc(13px * var(--s)); }

    .ord-order {
      text-align: center;
      margin-top: 0.25rem;
      font-size: calc(11px * var(--s));
      font-weight: 600;
      color: #222;
    }

    /* PATIENT INFO */
    .ord-patient {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.3rem 0.5rem;
      font-size: calc(14px * var(--s));
      padding: 0.3rem 0.5rem;
      overflow-wrap: anywhere;
    }
    .ord-patient strong { color: #2c3e50; }
    .later .ord-patient { margin-top: 0.3rem; font-size: calc(12.5px * var(--s)); }

    .ord-title {
      text-align: center;
      font-weight: bold;
      font-size: calc(20px * var(--s));
      margin-top: 0.7rem;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      color: #2c3e50;
      letter-spacing: 1px;
    }
    .later .ord-title { font-size: calc(16px * var(--s)); margin-top: 0.4rem; }

    /* BODY */
    .ord-body {
      position: relative;
      margin-top: calc(14px * var(--s));
      font-size: calc(16px * var(--s));
      line-height: 1.5;
    }

    /* Logo watermark behind the body content (does not affect layout/pagination) */
    .ord-watermark {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-height: 95%;
      object-fit: contain;
      opacity: 0.09; /* raise/lower to make the watermark stronger/fainter */
      pointer-events: none;
      z-index: 0;
    }

    .bilan-item {
      position: relative;
      z-index: 1;
      margin-bottom: calc(12px * var(--s));
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .bilan-name {
      font-weight: 600;
      font-size: calc(17px * var(--s));
      color: #2c3e50;
      overflow-wrap: anywhere;
    }

    .bilan-notes {
      margin-left: 1rem;
      font-size: calc(14px * var(--s));
      font-style: italic;
      color: #555;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .ord-footer {
      position: relative;
      text-align: left;
      padding-top: 0.6rem;
      min-height: 2.6cm;
      font-size: calc(14px * var(--s));
      border-top: 1px dashed #2c3e50;
      font-style: italic;
      color: #555;
    }
    .ord-footer.ord-cont {
      min-height: 0;
      padding-top: 0.3rem;
      font-size: calc(12px * var(--s));
    }

    .ord-pageno {
      position: absolute;
      right: 0;
      bottom: 0.1cm;
      font-size: 11px;
      color: #777;
      font-style: normal;
    }

    /* Contact footer (repeated on every page) */
    .ord-contact {
      margin-top: 0.35rem;
      font-size: 11px;
      font-weight: 600;
      color: #222;
    }
    .ord-contact::before {
      content: "";
      display: block;
      height: 1.5px;
      margin-bottom: 0.35rem;
      background: linear-gradient(to right, transparent, #2f6db5 12%, #2f6db5 88%, transparent);
    }
    .ord-contact-row {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.2rem 0.9rem;
      line-height: 1.4;
    }
    .ord-contact-item {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .ord-contact-item svg { width: 14px; height: 14px; flex: none; }
    .ord-contact-ar {
      margin-top: 0.15rem;
      text-align: center;
      direction: rtl;
      font-family: 'Arial', sans-serif;
      font-size: 10.5px;
      font-weight: 600;
    }

    #measure {
      position: absolute;
      top: 0;
      left: 0;
      width: 29.7cm;
      visibility: hidden;
      pointer-events: none;
    }

    @media screen {
      body { background: #e5e5e5; }
      .page { background: white; margin-bottom: 10px; }
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
  <!-- Templates cloned on every page (header content is unchanged) -->
  <div id="tpl" style="display:none">
    <div id="t-num"></div>

    <div id="t-header-full">
      <div class="ord-header">
        <div class="ord-header-top">
          <div class="ord-left">
            <strong>${cab.doctorName}</strong><br>
            ${cab.specialty}
          </div>

          <div class="ord-center">
            <img src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="Logo Cabinet">
          </div>

          <div class="ord-right">
            <strong>${cab.doctorNameAr}</strong><br>
            ${cab.specialtyAr}
          </div>
        </div>${orderHtml}
      </div>
    </div>

    <div id="t-header-compact">
      <div class="ord-header compact">
        <div class="ord-header-top">
          <div class="ord-left"><strong>${cab.doctorName}</strong> — ${cab.specialty}</div>
          <div class="ord-right"><strong>${cab.doctorNameAr}</strong></div>
        </div>
      </div>
    </div>

    <div id="t-contact">
      <div class="ord-contact">
        <div class="ord-contact-row">${phonesHtml}${addrHtml}
        </div>${addrArHtml}
      </div>
    </div>

    <div id="t-watermark">
      <img class="ord-watermark" src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="">
    </div>

    <div id="t-patient">
      <div class="ord-patient">
        <span><strong>Nom :</strong> ${ordEsc(nom)}</span>
        <span><strong>Prénom :</strong> ${ordEsc(prenom)}</span>
        <span><strong>Âge :</strong> ${ordEsc(age)}</span>
        <span><strong>Le :</strong> ${today}</span>
      </div>
    </div>
  </div>

  <div id="pages"></div>

  <script>
    (function () {
      var BILANS = ${bilansJson};
      // Font scales tried from largest to smallest; 0.85 keeps text at ~12px+ (≈9pt+)
      var SCALES = [1, 0.95, 0.9, 0.85];
      var SAFETY = 4; // px kept free at the bottom of each page body

      var root = document.getElementById("pages");
      var host = document.createElement("div");
      host.id = "measure";
      document.body.appendChild(host);

      function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text; // never interpreted as HTML
        return e;
      }
      function tplHtml(id) { return document.getElementById(id).innerHTML; }
      function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
      function setScale(s) { document.documentElement.style.setProperty("--s", String(s)); }

      function buildItem(b) {
        var d = el("div", "bilan-item");
        d.appendChild(el("div", "bilan-name", b.num + ". " + b.name + (b.cont ? " (suite)" : "")));
        if (b.notes) d.appendChild(el("div", "bilan-notes", b.notes));
        return d;
      }

      function buildPage(first, last) {
        var page = el("div", "page");
        var c = el("div", "ord-container" + (first ? "" : " later"));
        var html = '<div class="ord-num">' + tplHtml("t-num") + "</div>";
        html += tplHtml(first ? "t-header-full" : "t-header-compact");
        html += tplHtml("t-patient");
        html += '<div class="ord-title">DEMANDE DE BILAN' + (first ? "" : " (suite)") + "</div>";
        html += '<div class="ord-body">' + tplHtml("t-watermark") + "</div>";
        html += last
          ? '<div ><div class="ord-pageno"></div></div>'
          : '<div class="ord-footer ord-cont">Suite page suivante &rarr;<div class="ord-pageno"></div></div>';
        html += tplHtml("t-contact");
        c.innerHTML = html;
        page.appendChild(c);
        return page;
      }

      // ---- measuring ----------------------------------------------------
      var capCache = {};
      var mbody = null;

      function cap(first, last) {
        var key = (first ? "1" : "0") + (last ? "1" : "0");
        if (capCache[key] == null) {
          var p = buildPage(first, last);
          host.appendChild(p);
          capCache[key] = p.querySelector(".ord-body").getBoundingClientRect().height - SAFETY;
          host.removeChild(p);
        }
        return capCache[key];
      }

      function itemHeight(b) {
        mbody.innerHTML = "";
        var e = buildItem(b);
        mbody.appendChild(e);
        var h = e.getBoundingClientRect().height + parseFloat(getComputedStyle(e).marginBottom || "0");
        mbody.innerHTML = "";
        return h;
      }

      // Last resort: a single bilan taller than a whole page is split at a word
      // boundary (nothing is ever dropped). Returns [head, rest] or null.
      function splitItem(b, capacity) {
        var field = b.notes.length >= b.name.length ? "notes" : "name";
        var toks = b[field].match(/\\S+\\s*/g) || [];
        if (toks.length < 2) return null;
        function part(x, y) { return toks.slice(x, y).join("").trim(); }
        function head(k) {
          var h = copy(b);
          h[field] = part(0, k);
          if (field === "name") h.notes = "";
          return h;
        }
        var lo = 0, hi = toks.length - 1;
        while (lo < hi) {
          var mid = Math.ceil((lo + hi) / 2);
          if (itemHeight(head(mid)) <= capacity) lo = mid; else hi = mid - 1;
        }
        if (lo < 1) return null;
        var rest = copy(b);
        rest.cont = true;
        rest[field] = part(lo, toks.length);
        return [head(lo), rest];
      }

      // ---- pagination for one font scale ---------------------------------
      function layout(scale) {
        setScale(scale);
        capCache = {};
        host.innerHTML = "";
        var mp = buildPage(true, false);
        mp.classList.add("measuring");
        host.appendChild(mp);
        mbody = mp.querySelector(".ord-body");

        var queue = BILANS.map(copy);
        var pages = [], cur = [], used = 0;

        while (queue.length) {
          var b = queue.shift();
          var h = itemHeight(b);
          var c = cap(pages.length === 0, false);
          if (used + h <= c) { cur.push(b); used += h; continue; }
          if (cur.length === 0) {
            // does not fit even alone on an empty page
            var sp = splitItem(b, c);
            if (sp) { cur.push(sp[0]); queue.unshift(sp[1]); } else { cur.push(b); }
            pages.push(cur); cur = []; used = 0;
            continue;
          }
          pages.push(cur); cur = []; used = 0;
          queue.unshift(b);
        }
        if (cur.length || !pages.length) pages.push(cur);

        // The last page carries the (taller) signature footer: make sure it fits
        for (var guard = 0; guard < 500; guard++) {
          var li = pages.length - 1, lp = pages[li];
          var lc = cap(li === 0, true);
          var tot = 0;
          for (var i = 0; i < lp.length; i++) tot += itemHeight(lp[i]);
          if (tot <= lc || lp.length === 0) break;
          if (lp.length === 1) {
            var s2 = splitItem(lp[0], lc);
            if (!s2) break;
            pages[li] = [s2[0]];
            pages.push([s2[1]]);
            continue;
          }
          pages.push([lp.pop()]);
        }
        return pages;
      }

      function render(pages) {
        root.innerHTML = "";
        pages.forEach(function (items, i) {
          var first = i === 0, last = i === pages.length - 1;
          var p = buildPage(first, last);
          var body = p.querySelector(".ord-body");
          items.forEach(function (b) { body.appendChild(buildItem(b)); });
          if (pages.length > 1) {
            p.querySelector(".ord-pageno").textContent = "Page " + (i + 1) + " / " + pages.length;
          }
          root.appendChild(p);
        });
      }

      function run() {
        // Fewest pages at the minimum readable size, then the LARGEST scale
        // that still gives that same number of pages.
        var minScale = SCALES[SCALES.length - 1];
        var best = layout(minScale), bestScale = minScale;
        for (var i = 0; i < SCALES.length - 1; i++) {
          var L = layout(SCALES[i]);
          if (L.length === best.length) { best = L; bestScale = SCALES[i]; break; }
        }
        setScale(bestScale);
        if (host.parentNode) host.parentNode.removeChild(host);
        render(best);
        function go() {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 250);
        }
        ready(".ord-watermark").then(go, go);
      }

      // Wait for the logo + fonts so measured heights are final
      function ready(sel) {
        var waits = [];
        var imgs = document.querySelectorAll(sel || "#tpl img");
        for (var i = 0; i < imgs.length; i++) {
          (function (img) {
            if (img.complete) return;
            waits.push(new Promise(function (res) {
              img.addEventListener("load", res);
              img.addEventListener("error", res);
            }));
          })(imgs[i]);
        }
        if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
        return Promise.race([
          Promise.all(waits),
          new Promise(function (res) { setTimeout(res, 1500); })
        ]);
      }

      window.addEventListener("load", function () {
        ready().then(run, run);
      });
    })();
  </script>
</body>
</html>`;
}

export async function printBilan(data = {}) {
  let dbCab = data.cabinet;
  if (!dbCab || Object.keys(dbCab).length === 0) {
    dbCab = await getCabinetFromDb();
  }
  const cab = getCabinetHeader(data, dbCab);
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

  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer le bilan.");
    return;
  }

  const printHtml = buildBilanHtml(
    { nom, prenom, age, consultationId, bilanId, items },
    cab,
  );

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}
// NOTE: uses the `ordEsc` helper defined next to printOrdonnance.
// If printJustification lives in another file, export ordEsc from there and import it here
// (do not declare it twice in the same module).

/**
 * Builds the full print document for the "Justification médicale".
 * Pagination is done inside the print window at load time by measuring the
 * real rendered height of every paragraph, so it depends on the actual text.
 */
// NOTE: uses the `ordEsc` helper defined next to printOrdonnance.
// If printJustification lives in another file, export ordEsc from there and import it here
// (do not declare it twice in the same module).

/**
 * Builds the full print document for the "Justification médicale".
 * Pagination is done inside the print window at load time by measuring the
 * real rendered height of every paragraph, so it depends on the actual text.
 */
function buildJustificationHtml(
  { nom, prenom, age, consultationId, justificationId, texte },
  cab,
) {
  // One entry per non-empty line (same rule as before)
  let paras = String(texte || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text) => ({ text, cont: false }));

  if (!paras.length) {
    paras = [
      {
        text: "Je soussigné(e), Docteur en médecine, certifie avoir examiné ce jour l'enfant mentionné ci-dessus et que son état de santé justifie ce certificat médical.",
        cont: false,
      },
    ];
  }

  // Safe JSON for embedding inside <script>
  const parasJson = JSON.stringify(paras)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const today = new Date().toLocaleDateString("fr-FR");

  // Header / footer values (contact details live in the footer)
  const ICON_PHONE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2f6db5"/><path fill="#fff" transform="translate(5.6 5.6) scale(0.53)" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
  const ICON_PIN =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#2f6db5"/><path fill="#fff" transform="translate(5.6 5.2) scale(0.53)" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
  const addrFr = [cab.address, cab.city].filter(Boolean).join(", ");
  const addrAr = [cab.addressAr, cab.cityAr].filter(Boolean).join(" - ");
  const orderNum = cab.numOrdre || cab.orderNumber || "2212/12"; // N° d'Ordre
  const orderHtml = orderNum
    ? `\n        <div class="ord-order"> ${ordEsc(consultationId) || "-"}/${ordEsc(justificationId) || "-"}</div>`
    : "";
  const phonesHtml = cab.phones
    ? `\n          <span class="ord-contact-item">${ICON_PHONE}<span>${cab.phones}</span></span>`
    : "";
  const addrHtml = addrFr
    ? `\n          <span class="ord-contact-item">${ICON_PIN}<span>${addrFr}</span></span>`
    : "";
  const addrArHtml = addrAr
    ? `\n        <div class="ord-contact-ar">${addrAr}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Justification Médicale - ${ordEsc(nom)} ${ordEsc(prenom)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    :root { --s: 1; } /* font scale, chosen automatically (1 → 0.85 minimum) */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body { background: white; }

    body {
      width: 29.7cm;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* One .page = one A4 landscape sheet; the document uses the left half */
    .page {
      position: relative;
      width: 29.7cm;
      height: 20.95cm; /* slightly under 21cm: avoids phantom blank pages */
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .ord-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 14.85cm;
      height: 20.95cm;
      border: 2px solid #2c3e50;
      padding: 0.6cm 0.7cm 0.5cm;
      display: flex;
      flex-direction: column;
    }
    .ord-container > * { flex: 0 0 auto; }
    .ord-container > .ord-body { flex: 1 1 0; min-height: 0; }
    .measuring .ord-container > .ord-body { flex: 0 0 auto; }

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
      padding-bottom: 0.35rem;
    }
    .ord-header::after {
      content: "";
      display: block;
      height: 1.5px;
      margin-top: 0.35rem;
      background: linear-gradient(to right, transparent, #a8323e 12%, #a8323e 88%, transparent);
    }
    .ord-header.compact { padding-bottom: 0.2rem; }

    .ord-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
    }

    .ord-left,
    .ord-right {
      flex: 1;
      min-width: 0;
      font-size: calc(13px * var(--s));
      line-height: 1.5;
      font-weight: 600;
      color: #222;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .compact .ord-left,
    .compact .ord-right { font-size: calc(12px * var(--s)); }

    .ord-center {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(80px * var(--s));
      height: calc(80px * var(--s));
    }
    .ord-center img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .ord-right {
      direction: rtl;
    }

    .ord-left strong,
    .ord-right strong {
      color: #a8323e;
      font-size: calc(15px * var(--s));
      font-weight: 800;
    }
    .compact .ord-left strong,
    .compact .ord-right strong { font-size: calc(13px * var(--s)); }

    .ord-order {
      text-align: center;
      margin-top: 0.25rem;
      font-size: calc(11px * var(--s));
      font-weight: 600;
      color: #222;
    }

    /* PATIENT INFO */
    .ord-patient {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.3rem 0.5rem;
      font-size: calc(14px * var(--s));
      padding: 0.3rem 0.5rem;
      overflow-wrap: anywhere;
    }
    .ord-patient strong { color: #2c3e50; }
    .later .ord-patient { margin-top: 0.3rem; font-size: calc(12.5px * var(--s)); }

    .ord-title {
      text-align: center;
      font-weight: bold;
      font-size: calc(18px * var(--s));
      margin-top: 0.7rem;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
      color: #2c3e50;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .later .ord-title { font-size: calc(15px * var(--s)); margin-top: 0.4rem; }

    /* BODY */
    .ord-body {
      position: relative;
      margin-top: calc(14px * var(--s));
      font-size: calc(15px * var(--s));
      line-height: 1.7;
      text-align: justify;
    }

    /* Logo watermark behind the body content (does not affect layout/pagination) */
    .ord-watermark {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-height: 95%;
      object-fit: contain;
      opacity: 0.09; /* raise/lower to make the watermark stronger/fainter */
      pointer-events: none;
      z-index: 0;
    }

    .just-p {
      position: relative;
      z-index: 1;
      margin-bottom: calc(13px * var(--s));
      text-indent: 1rem;
      overflow-wrap: anywhere;
    }
    .just-p.cont { text-indent: 0; } /* continuation of a paragraph split across pages */

    .ord-footer {
      position: relative;
      text-align: left;
      padding-top: 0.6rem;
      min-height: 2.6cm;
      font-size: calc(14px * var(--s));
      border-top: 1px dashed #2c3e50;
      font-style: italic;
      color: #555;
    }
    .ord-footer.ord-cont {
      min-height: 0;
      padding-top: 0.3rem;
      font-size: calc(12px * var(--s));
    }

    .ord-pageno {
      position: absolute;
      right: 0;
      bottom: 0.1cm;
      font-size: 11px;
      color: #777;
      font-style: normal;
    }

    /* Contact footer (repeated on every page) */
    .ord-contact {
      margin-top: 0.35rem;
      font-size: 11px;
      font-weight: 600;
      color: #222;
    }
    .ord-contact::before {
      content: "";
      display: block;
      height: 1.5px;
      margin-bottom: 0.35rem;
      background: linear-gradient(to right, transparent, #2f6db5 12%, #2f6db5 88%, transparent);
    }
    .ord-contact-row {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.2rem 0.9rem;
      line-height: 1.4;
    }
    .ord-contact-item {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .ord-contact-item svg { width: 14px; height: 14px; flex: none; }
    .ord-contact-ar {
      margin-top: 0.15rem;
      text-align: center;
      direction: rtl;
      font-family: 'Arial', sans-serif;
      font-size: 10.5px;
      font-weight: 600;
    }

    #measure {
      position: absolute;
      top: 0;
      left: 0;
      width: 29.7cm;
      visibility: hidden;
      pointer-events: none;
    }

    @media screen {
      body { background: #e5e5e5; }
      .page { background: white; margin-bottom: 10px; }
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
  <!-- Templates cloned on every page -->
  <div id="tpl" style="display:none">
    <div id="t-num"></div>

    <div id="t-header-full">
      <div class="ord-header">
        <div class="ord-header-top">
          <div class="ord-left">
            <strong>${cab.doctorName}</strong><br>
            ${cab.specialty}
          </div>

          <div class="ord-center">
            <img src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="Logo Cabinet">
          </div>

          <div class="ord-right">
            <strong>${cab.doctorNameAr}</strong><br>
            ${cab.specialtyAr}
          </div>
        </div>${orderHtml}
      </div>
    </div>

    <div id="t-header-compact">
      <div class="ord-header compact">
        <div class="ord-header-top">
          <div class="ord-left"><strong>${cab.doctorName}</strong> — ${cab.specialty}</div>
          <div class="ord-right"><strong>${cab.doctorNameAr}</strong></div>
        </div>
      </div>
    </div>

    <div id="t-contact">
      <div class="ord-contact">
        <div class="ord-contact-row">${phonesHtml}${addrHtml}
        </div>${addrArHtml}
      </div>
    </div>

    <div id="t-watermark">
      <img class="ord-watermark" src="${cab.logo}" onerror="this.src='/uploads/image.PNG'; this.onerror=null;" alt="">
    </div>

    <div id="t-patient">
      <div class="ord-patient">
        <span><strong>Nom :</strong> ${ordEsc(nom)}</span>
        <span><strong>Prénom :</strong> ${ordEsc(prenom)}</span>
        <span><strong>Âge :</strong> ${ordEsc(age)}</span>
        <span><strong>Le :</strong> ${today}</span>
      </div>
    </div>
  </div>

  <div id="pages"></div>

  <script>
    (function () {
      var PARAS = ${parasJson};
      // Font scales tried from largest to smallest; 0.85 keeps body text at ~12.7px (≈9.5pt)
      var SCALES = [1, 0.95, 0.9, 0.85];
      var SAFETY = 4; // px kept free at the bottom of each page body

      var root = document.getElementById("pages");
      var host = document.createElement("div");
      host.id = "measure";
      document.body.appendChild(host);

      function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text; // never interpreted as HTML
        return e;
      }
      function tplHtml(id) { return document.getElementById(id).innerHTML; }
      function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
      function setScale(s) { document.documentElement.style.setProperty("--s", String(s)); }

      function buildItem(p) {
        return el("p", "just-p" + (p.cont ? " cont" : ""), p.text);
      }

      function buildPage(first, last) {
        var page = el("div", "page");
        var c = el("div", "ord-container" + (first ? "" : " later"));
        var html = '<div class="ord-num">' + tplHtml("t-num") + "</div>";
        html += tplHtml(first ? "t-header-full" : "t-header-compact");
        html += tplHtml("t-patient");
        html += '<div class="ord-title">JUSTIFICATION MÉDICALE' + (first ? "" : " (suite)") + "</div>";
        html += '<div class="ord-body">' + tplHtml("t-watermark") + "</div>";
        html += last
          ? '<div ><div class="ord-pageno"></div></div>'
          : '<div class="ord-footer ord-cont">Suite page suivante &rarr;<div class="ord-pageno"></div></div>';
        html += tplHtml("t-contact");
        c.innerHTML = html;
        page.appendChild(c);
        return page;
      }

      // ---- measuring ----------------------------------------------------
      var capCache = {};
      var mbody = null;
      var minSplit = 70;

      // Free height available for text on a given kind of page
      function cap(first, last) {
        var key = (first ? "1" : "0") + (last ? "1" : "0");
        if (capCache[key] == null) {
          var p = buildPage(first, last);
          host.appendChild(p);
          capCache[key] = p.querySelector(".ord-body").getBoundingClientRect().height - SAFETY;
          host.removeChild(p);
        }
        return capCache[key];
      }

      // Real rendered height (with bottom margin) of a paragraph
      function itemHeight(p) {
        mbody.innerHTML = "";
        var e = buildItem(p);
        mbody.appendChild(e);
        var h = e.getBoundingClientRect().height + parseFloat(getComputedStyle(e).marginBottom || "0");
        mbody.innerHTML = "";
        return h;
      }

      // Splits a paragraph at a word boundary so that the first part fits in
      // capacity; the rest continues on the next page. Nothing is dropped.
      // Returns [head, rest] or null.
      function splitItem(p, capacity) {
        var toks = p.text.match(/\\S+\\s*/g) || [];
        if (toks.length < 2) return null;
        function part(a, b) { return toks.slice(a, b).join("").trim(); }
        function head(k) { var h = copy(p); h.text = part(0, k); return h; }
        var lo = 0, hi = toks.length - 1;
        while (lo < hi) {
          var mid = Math.ceil((lo + hi) / 2);
          if (itemHeight(head(mid)) <= capacity) lo = mid; else hi = mid - 1;
        }
        if (lo < 1) return null;
        var rest = copy(p);
        rest.cont = true;
        rest.text = part(lo, toks.length);
        return [head(lo), rest];
      }

      // Only split into the remaining space if at least ~3 lines fit there
      function trySplit(p, avail) {
        if (avail < minSplit) return null;
        return splitItem(p, avail);
      }

      // ---- pagination for one font scale ---------------------------------
      function layout(scale) {
        setScale(scale);
        capCache = {};
        minSplit = 3 * 15 * 1.7 * scale + 13 * scale;
        host.innerHTML = "";
        var mp = buildPage(true, false);
        mp.classList.add("measuring");
        host.appendChild(mp);
        mbody = mp.querySelector(".ord-body");

        var queue = PARAS.map(copy);
        var pages = [], cur = [], used = 0;

        while (queue.length) {
          var p = queue.shift();
          var h = itemHeight(p);
          var c = cap(pages.length === 0, false);
          if (used + h <= c) { cur.push(p); used += h; continue; }
          if (cur.length === 0) {
            // does not fit even alone on an empty page
            var sp = splitItem(p, c);
            if (sp) { cur.push(sp[0]); queue.unshift(sp[1]); } else { cur.push(p); }
            pages.push(cur); cur = []; used = 0;
            continue;
          }
          // fill the rest of the page with the start of the paragraph if it is worth it
          var sp2 = trySplit(p, c - used);
          if (sp2) { cur.push(sp2[0]); queue.unshift(sp2[1]); } else { queue.unshift(p); }
          pages.push(cur); cur = []; used = 0;
        }
        if (cur.length || !pages.length) pages.push(cur);

        // The last page carries the (taller) signature footer: make sure it fits
        for (var guard = 0; guard < 500; guard++) {
          var li = pages.length - 1, lp = pages[li];
          var lc = cap(li === 0, true);
          var tot = 0;
          for (var i = 0; i < lp.length; i++) tot += itemHeight(lp[i]);
          if (tot <= lc || lp.length === 0) break;
          var lastP = lp[lp.length - 1];
          var avail = lc - (tot - itemHeight(lastP));
          var s2 = lp.length > 1 ? trySplit(lastP, avail) : splitItem(lastP, lc);
          if (s2) {
            lp[lp.length - 1] = s2[0];
            pages.push([s2[1]]);
            continue;
          }
          if (lp.length === 1) break;
          pages.push([lp.pop()]);
        }
        return pages;
      }

      function render(pages) {
        root.innerHTML = "";
        pages.forEach(function (items, i) {
          var first = i === 0, last = i === pages.length - 1;
          var pg = buildPage(first, last);
          var body = pg.querySelector(".ord-body");
          items.forEach(function (p) { body.appendChild(buildItem(p)); });
          if (pages.length > 1) {
            pg.querySelector(".ord-pageno").textContent = "Page " + (i + 1) + " / " + pages.length;
          }
          root.appendChild(pg);
        });
      }

      function run() {
        // Fewest pages at the minimum readable size, then the LARGEST scale
        // that still gives that same number of pages.
        var minScale = SCALES[SCALES.length - 1];
        var best = layout(minScale), bestScale = minScale;
        for (var i = 0; i < SCALES.length - 1; i++) {
          var L = layout(SCALES[i]);
          if (L.length === best.length) { best = L; bestScale = SCALES[i]; break; }
        }
        setScale(bestScale);
        if (host.parentNode) host.parentNode.removeChild(host);
        render(best);
        function go() {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 250);
        }
        ready(".ord-watermark").then(go, go);
      }

      // Wait for the logo + fonts so measured heights are final
      function ready(sel) {
        var waits = [];
        var imgs = document.querySelectorAll(sel || "#tpl img");
        for (var i = 0; i < imgs.length; i++) {
          (function (img) {
            if (img.complete) return;
            waits.push(new Promise(function (res) {
              img.addEventListener("load", res);
              img.addEventListener("error", res);
            }));
          })(imgs[i]);
        }
        if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
        return Promise.race([
          Promise.all(waits),
          new Promise(function (res) { setTimeout(res, 1500); })
        ]);
      }

      window.addEventListener("load", function () {
        ready().then(run, run);
      });
    })();
  </script>
</body>
</html>`;
}

export async function printJustification(data = {}) {
  let dbCab = data.cabinet;
  if (!dbCab || Object.keys(dbCab).length === 0) {
    dbCab = await getCabinetFromDb();
  }
  const cab = getCabinetHeader(data, dbCab);
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

  const printWindow = window.open("", "_blank", "width=1000,height=700");
  if (!printWindow) {
    alert(
      "Veuillez autoriser les fenêtres pop-up pour imprimer la justification.",
    );
    return;
  }

  const printHtml = buildJustificationHtml(
    { nom, prenom, age, consultationId, justificationId, texte },
    cab,
  );

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}
