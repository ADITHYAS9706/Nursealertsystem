/* ═══════════════════════════════════════════
   RxSense — Nurse Alert System | script.js
═══════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000';

/* ─────────── STATE ─────────── */
let state = {
  records: 0,
  totalAlerts: 0,
  patients: new Set(),
  history: [],
  lastResult: null
};

/* ════════════════════════════════
   NAVIGATION
════════════════════════════════ */
const SECTION_TITLES = {
  dashboard: 'Dashboard',
  upload:    'Upload Record',
  pad:       'Rx Pad',
  alerts:    'Alert Schedule',
  history:   'History'
};

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    gotoSec(el.dataset.sec);
  });
});

function gotoSec(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-sec="${id}"]`)?.classList.add('active');

  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${id}`)?.classList.add('active');

  document.getElementById('tbTitle').textContent = SECTION_TITLES[id] || id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ════════════════════════════════
   LIVE CLOCK
════════════════════════════════ */
function tickClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;
}
setInterval(tickClock, 1000);
tickClock();

/* ════════════════════════════════
   FILE DROP ZONE
════════════════════════════════ */
const dz       = document.getElementById('dropzone');
const fi       = document.getElementById('fileInput');
const dzIdle   = document.getElementById('dzIdle');
const dzPreview= document.getElementById('dzPreview');
const dzBrowse = document.getElementById('dzBrowse');
const dzFn     = document.getElementById('dzFn');
const dzFs     = document.getElementById('dzFs');
const dzRm     = document.getElementById('dzRm');

dz.addEventListener('click', () => { if (dzIdle.style.display !== 'none') fi.click(); });
dzBrowse.addEventListener('click', e => { e.stopPropagation(); fi.click(); });

dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f) applyFile(f);
});

fi.addEventListener('change', () => { if (fi.files[0]) applyFile(fi.files[0]); });
dzRm.addEventListener('click', e => { e.stopPropagation(); removeFile(); });

function applyFile(f) {
  dzFn.textContent = f.name;
  dzFs.textContent = formatBytes(f.size);
  dzIdle.style.display = 'none';
  dzPreview.style.display = 'flex';

  // Image preview
  if (f.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = ev => {
      const box = document.getElementById('imgPrevBox');
      document.getElementById('imgPrev').src = ev.target.result;
      box.style.display = 'block';
    };
    reader.readAsDataURL(f);
  } else {
    document.getElementById('imgPrevBox').style.display = 'none';
  }
}

function removeFile() {
  fi.value = '';
  dzIdle.style.display = '';
  dzPreview.style.display = 'none';
  document.getElementById('imgPrevBox').style.display = 'none';
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

/* ════════════════════════════════
   UPLOAD FILE
════════════════════════════════ */
async function uploadFile() {
  const file = fi.files[0];
  if (!file) { toast('Please select a prescription file first', 'warn'); return; }

  showProcCard(true);
  hideOcrPanel();

  const fd = new FormData();
  fd.append('file', file);

  try {
    await animateSteps(['ps1','ps2','ps3','ps4'], async () => {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  } catch (err) {
    showProcCard(false);
    console.warn('Backend offline, running demo:', err.message);
    toast('Backend offline — showing demo data', 'warn');
    await delay(300);
    const demo = makeDemoData(file.name);
    handleResult(demo);
    return;
  }
}

async function animateSteps(stepIds, fetchFn) {
  const card = document.getElementById('procCard');
  card.style.display = 'flex';
  document.getElementById('upEmpty').style.display = 'none';

  // Reset steps
  stepIds.forEach(id => {
    const s = document.getElementById(id);
    s.querySelector('.pd').style.cssText = '';
    s.classList.remove('done','active');
  });

  let data;
  for (let i = 0; i < stepIds.length; i++) {
    const s = document.getElementById(stepIds[i]);
    s.classList.add('active');
    await delay(i === 1 ? 800 : 400); // OCR step takes longer
    if (i === 0) {
      try { data = await fetchFn(); } catch(e) { showProcCard(false); throw e; }
    }
    s.classList.remove('active');
    s.classList.add('done');
    s.querySelector('.pd').style.cssText = 'background:var(--teal);border-color:var(--teal)';
  }

  showProcCard(false);
  handleResult(data);
  toast('Prescription analysed successfully!', 'success');
}

function showProcCard(show) {
  document.getElementById('procCard').style.display = show ? 'flex' : 'none';
}

function hideOcrPanel() {
  document.getElementById('ocrPanel').style.display = 'none';
  document.getElementById('upEmpty').style.display = '';
}

/* ════════════════════════════════
   HANDLE RESULT
════════════════════════════════ */
function handleResult(data) {
  state.lastResult = data;
  state.records++;
  state.totalAlerts += (data.alerts || []).length;
  if (data.patient_name && data.patient_name !== 'Unknown') state.patients.add(data.patient_name);

  // History
  state.history.unshift({
    patient: data.patient_name || 'Unknown',
    drugs: (data.alerts || []).length,
    time: new Date().toLocaleTimeString(),
    data
  });

  updateStats();
  renderOcrPanel(data);
  renderAlerts(data);
  renderHistory();
  updateAlertBadge((data.alerts || []).length);
  toast(`Found ${(data.alerts||[]).length} medication(s) for ${data.patient_name || 'patient'}`, 'success');
}

function updateStats() {
  document.getElementById('statR').textContent = state.records;
  document.getElementById('statA').textContent = state.totalAlerts;
  document.getElementById('statP').textContent = state.patients.size;
}

function renderOcrPanel(data) {
  const panel = document.getElementById('ocrPanel');
  document.getElementById('ocrPre').textContent = data.extracted_text || `Patient: ${data.patient_name}\n(text extracted from image)`;
  panel.style.display = 'block';
  document.getElementById('upEmpty').style.display = 'none';
}

/* ════════════════════════════════
   RENDER ALERTS
════════════════════════════════ */
function renderAlerts(data) {
  const alerts = data.alerts || [];

  // Patient banner
  const banner = document.getElementById('patBanner');
  if (data.patient_name) {
    document.getElementById('pbAv').textContent = (data.patient_name[0] || '?').toUpperCase();
    document.getElementById('pbName').textContent = data.patient_name;
    document.getElementById('pbTime').textContent = new Date().toLocaleTimeString();
    banner.style.display = 'flex';
  }

  // Time-of-day view
  renderTodView(alerts);

  // Alert cards
  const grid = document.getElementById('alertsGrid');
  if (!alerts.length) {
    grid.innerHTML = `<div class="ag-empty"><div class="age-ico"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div><p>No medications detected — check the prescription format.</p></div>`;
    return;
  }

  grid.innerHTML = '';
  alerts.forEach((med, i) => {
    const card = document.createElement('div');
    card.className = 'med-card';
    card.style.animationDelay = `${i * 70}ms`;

    const times = (med.alert_times || [])
      .map(t => `<span class="mc-time">${t}</span>`).join('');
    const dur = med.duration_days
      ? `<span class="mc-chip">⏱ ${med.duration_days}d</span>` : '';
    const freqClass = med.frequency || 'OD';

    card.innerHTML = `
      <div class="mc-head">
        <div class="mc-name">${med.drug_name}</div>
        <div class="mc-tags">
          <span class="tag freq ${freqClass}">${med.frequency || 'OD'}</span>
          <span class="tag route">${med.route || 'Oral'}</span>
        </div>
      </div>
      <div class="mc-body">
        <div class="mc-meta">
          <span class="mc-chip">💊 ${med.dosage}</span>
          ${dur}
          <span class="mc-chip">${med.frequency_label || med.frequency}</span>
        </div>
        <div class="mc-times">${times || '<span style="color:var(--ink4);font-size:12px">No times set</span>'}</div>
      </div>`;
    grid.appendChild(card);
  });

  // Raw JSON
  const jv = document.getElementById('jsonVwr');
  document.getElementById('jsonPre').textContent = JSON.stringify(data, null, 2);
  jv.style.display = 'block';
}

function renderTodView(alerts) {
  const times = {};
  alerts.forEach(med => {
    (med.alert_times || []).forEach(t => {
      if (!times[t]) times[t] = [];
      times[t].push(med.drug_name);
    });
  });

  const sorted = Object.keys(times).sort();
  if (!sorted.length) { document.getElementById('todView').style.display = 'none'; return; }

  const labels = {
    '06:00':'Early Morning','08:00':'Morning','12:00':'Noon','14:00':'Afternoon',
    '18:00':'Evening','20:00':'Night','22:00':'Bedtime'
  };

  const cols = document.getElementById('todCols');
  cols.innerHTML = '';
  sorted.forEach(t => {
    const col = document.createElement('div');
    col.className = 'tod-col';
    col.innerHTML = `
      <div class="tod-col-head">
        <div>
          <div class="tod-time">${t}</div>
          <div class="tod-label">${labels[t] || ''}</div>
        </div>
      </div>
      <div class="tod-drugs">${times[t].map(d=>`<div class="tod-drug">${d}</div>`).join('')}</div>`;
    cols.appendChild(col);
  });

  document.getElementById('todView').style.display = 'block';
}

function updateAlertBadge(n) {
  const b = document.getElementById('alertBadge');
  if (n > 0) { b.textContent = n; b.style.display = ''; }
  else b.style.display = 'none';
}

/* ════════════════════════════════
   HISTORY
════════════════════════════════ */
function renderHistory() {
  const list = document.getElementById('histList');
  if (!state.history.length) {
    list.innerHTML = '<div class="hist-empty"><p>No records processed yet in this session</p></div>';
    return;
  }
  list.innerHTML = '';
  state.history.forEach((h, i) => {
    const item = document.createElement('div');
    item.className = 'hist-item';
    item.innerHTML = `
      <div class="hi-num">${String(state.history.length - i).padStart(2,'0')}</div>
      <div>
        <div class="hi-name">${h.patient}</div>
        <div class="hi-meta">${h.drugs} medication${h.drugs !== 1 ? 's' : ''} · ${h.drugs > 0 ? (h.data.alerts||[]).map(a=>a.drug_name).slice(0,2).join(', ') + (h.drugs > 2 ? '…' : '') : 'none'}</div>
      </div>
      <div class="hi-time">${h.time}</div>
      <div class="hi-arrow">→</div>`;
    item.onclick = () => { renderAlerts(h.data); gotoSec('alerts'); };
    list.appendChild(item);
  });
}

/* ════════════════════════════════
   DEMO DATA
════════════════════════════════ */
function makeDemoData(fname) {
  return {
    patient_name: 'Demo Patient',
    extracted_text: `Patient: Demo Patient\nTab Paracetamol 500mg Oral TID 5 days\nInj Ceftriaxone 1gm IV BD 7 days\nTab Aspirin 75mg Oral OD 30 days\nTab Metformin 500mg Oral BD 90 days`,
    alerts: [
      { drug_name:'Paracetamol', dosage:'500mg', route:'Oral', frequency:'TID', frequency_label:'Thrice Daily', duration_days:5,  alert_times:['08:00','14:00','20:00'] },
      { drug_name:'Ceftriaxone', dosage:'1gm',   route:'IV',   frequency:'BD',  frequency_label:'Twice Daily',  duration_days:7,  alert_times:['08:00','20:00'] },
      { drug_name:'Aspirin',     dosage:'75mg',   route:'Oral', frequency:'OD',  frequency_label:'Once Daily',   duration_days:30, alert_times:['08:00'] },
      { drug_name:'Metformin',   dosage:'500mg',  route:'Oral', frequency:'BD',  frequency_label:'Twice Daily',  duration_days:90, alert_times:['08:00','20:00'] }
    ]
  };
}
/* ════════════════════════════════
   CANVAS RX PAD
════════════════════════════════ */

const canvas = document.getElementById('pad');
const ctx = canvas.getContext('2d');

let drawing = false;
let tool = 'pen';
let penSize = 1.5;

let hist = [];
let redoSt = [];

let lastX = 0;
let lastY = 0;

let padHasContent = false;


/* ───────── CANVAS INIT ───────── */
function initCanvas() {

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  /* IMPORTANT */
  ctx.globalCompositeOperation = "source-over";
}

window.addEventListener("load", initCanvas);


/* ───────── RESIZE HANDLING ───────── */
window.addEventListener("resize", () => {

  const saved = canvas.toDataURL();

  initCanvas();

  if (padHasContent) {

    const img = new Image();

    img.onload = () => ctx.drawImage(
      img,
      0,
      0,
      canvas.getBoundingClientRect().width,
      canvas.getBoundingClientRect().height
    );

    img.src = saved;
  }

});


/* ───────── POSITION HELPERS ───────── */
function pos(e) {

  const r = canvas.getBoundingClientRect();

  return {
    x: e.clientX - r.left,
    y: e.clientY - r.top
  };

}

function tpos(e) {

  const r = canvas.getBoundingClientRect();

  return {
    x: e.touches[0].clientX - r.left,
    y: e.touches[0].clientY - r.top
  };

}


/* ───────── EVENTS ───────── */
canvas.addEventListener("mousedown", e => startDraw(pos(e)));
canvas.addEventListener("mousemove", e => drawing && moveDraw(pos(e)));
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  startDraw(tpos(e));
}, { passive:false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  drawing && moveDraw(tpos(e));
}, { passive:false });

canvas.addEventListener("touchend", endDraw);


/* ───────── DRAW START ───────── */
function startDraw(p) {

  drawing = true;

  lastX = p.x;
  lastY = p.y;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);

  padHasContent = true;

  document.getElementById("padWm").style.opacity = "0";
}


function moveDraw(p) {

  const color = document.getElementById("penColor").value;

  if (tool === "eraser") {

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 25;

  } else {

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;

  }

  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  lastX = p.x;
  lastY = p.y;

}


/* ───────── DRAW END ───────── */
function endDraw() {

  if (!drawing) return;

  drawing = false;

  ctx.closePath();

  hist.push(canvas.toDataURL());
  redoSt = [];

}

/* ───────── UNDO / REDO ───────── */
function undo() {

  if (!hist.length) return;

  redoSt.push(hist.pop());

  restoreCanvas(hist[hist.length - 1]);

}

function redo() {

  if (!redoSt.length) return;

  const s = redoSt.pop();

  hist.push(s);

  restoreCanvas(s);

}


/* ───────── RESTORE CANVAS ───────── */
function restoreCanvas(src) {

  const rect = canvas.getBoundingClientRect();

  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!src) {

    padHasContent = false;

    document.getElementById("padWm").style.opacity = "1";

    return;
  }

  const img = new Image();

  img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);

  img.src = src;

}


/* ───────── CLEAR PAD ───────── */
function clearPad() {

  const r = canvas.getBoundingClientRect();

  ctx.clearRect(0, 0, r.width, r.height);

  hist = [];
  redoSt = [];

  padHasContent = false;

  document.getElementById("padWm").style.opacity = "1";

  document.getElementById("padPanel").style.display = "none";

}


/* ───────── TOOL SWITCH ───────── */
function setTool(t) {

  tool = t;

  document.getElementById("tbPen").classList.toggle("active", t === "pen");
  document.getElementById("tbEraser").classList.toggle("active", t === "eraser");

  canvas.style.cursor = t === "eraser" ? "cell" : "crosshair";

}


/* ───────── PEN SIZE ───────── */
function setSize(btn) {

  penSize = parseFloat(btn.dataset.sz);

  document.querySelectorAll(".szb").forEach(b => b.classList.remove("act"));

  btn.classList.add("act");

}


/* ───────── COLOR PICKER ───────── */
document.getElementById("penColor").addEventListener("input", function () {

  document.getElementById("clrSw").style.background = this.value;

});

document.getElementById("clrSw").style.background =
  document.getElementById("penColor").value;


/* ───────── FULLSCREEN ───────── */
function toggleFS() {

  const pc = document.getElementById("padContainer");

  pc.classList.toggle("fs");

  document.getElementById("fsBtn").title =
    pc.classList.contains("fs") ? "Exit Fullscreen" : "Fullscreen";

  setTimeout(initCanvas, 60);

}


/* ════════════════════════════════
   EXTRACT FROM PAD
════════════════════════════════ */
async function extractFromPad() {
  if (!padHasContent) { toast('Please write something on the pad first', 'warn'); return; }

  const loader = document.getElementById('padLoader');
  loader.style.display = 'flex';
  document.getElementById('padPanel').style.display = 'none';

  canvas.toBlob(async blob => {
    const fd = new FormData();
    fd.append('file', blob, 'prescription.png');

    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      showPadResult(data);
      handleResult(data);
    } catch {
      toast('Backend offline — showing demo extraction', 'warn');
      const demo = makeDemoData('pad_prescription');
      showPadResult(demo);
      handleResult(demo);
    } finally {
      loader.style.display = 'none';
    }
  }, 'image/png');
}

function showPadResult(data) {
  document.getElementById('padPre').textContent = data.extracted_text || 'No text detected';
  document.getElementById('padPanel').style.display = 'block';
  gotoSec('alerts');
}

/* ════════════════════════════════
   EXPORT / PRINT
════════════════════════════════ */
function doExport() {
  if (!state.lastResult) { toast('No data to export yet', 'warn'); return; }
  const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rxsense-${Date.now()}.json`;
  a.click();
  toast('JSON exported!', 'success');
}

function doPrint() {
  if (!state.lastResult) { toast('No data to print yet', 'warn'); return; }
  const d = state.lastResult;
  const rows = (d.alerts || []).map(m => `
    <tr>
      <td>${m.drug_name}</td>
      <td>${m.dosage}</td>
      <td>${m.route}</td>
      <td>${m.frequency} — ${m.frequency_label || ''}</td>
      <td>${(m.alert_times||[]).join(', ')}</td>
      <td>${m.duration_days ? m.duration_days + ' days' : '—'}</td>
    </tr>`).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>RxSense Alert Schedule</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #0f172a; color: white; padding: 10px 14px; text-align: left; }
    td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
  </style></head><body>
  <h1>Nurse Alert Schedule</h1>
  <div class="sub">Patient: ${d.patient_name || 'Unknown'} · Generated: ${new Date().toLocaleString()}</div>
  <table><thead><tr><th>Drug</th><th>Dosage</th><th>Route</th><th>Frequency</th><th>Alert Times</th><th>Duration</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="footer">Generated by RxSense — Nurse Alert System · For clinical use only</div>
  </body></html>`);
  win.document.close();
  win.print();
}

/* ════════════════════════════════
   UTILITIES
════════════════════════════════ */
function copyEl(id) {
  const el = document.getElementById(id);
  navigator.clipboard.writeText(el.textContent)
    .then(() => toast('Copied to clipboard!', 'success'))
    .catch(() => toast('Copy failed', 'error'));
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function toast(msg, type = 'info') {
  const rack = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success:'✓', warn:'⚠', error:'✕', info:'ℹ' };
  t.innerHTML = `<span style="font-size:15px">${icons[type]||'ℹ'}</span> ${msg}`;
  t.onclick = () => t.remove();
  rack.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(12px)';
    setTimeout(() => t.remove(), 350);
  }, 3800);
}