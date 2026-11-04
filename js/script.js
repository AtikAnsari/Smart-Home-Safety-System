/* ── Smart Home Safety — script.js (Standalone Frontend Portfolio Demo) ── */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ARCHITECTURE OVERVIEW:
   - Standalone Client-Side Architecture: Fully decoupled from external servers.
   - Client-side Telemetry Engine: Generates realistic simulated sensor data.
   - Hybrid Vanilla JS + React 18:
       • React handles micro-roots for high-frequency telemetry text:
           1. Stats bar   → id="reactStatsBar"
           2. Door value  → id="reactDoorVal"
           3. Gas value   → id="reactGasVal"
       • Vanilla JS handles canvas gauge, animated water tank, alerts, and safe DOM event log.
   - Persistence: Theme preference and activity history stored in localStorage.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const state = { door: null, gas: null, water: null };
let activities = [];
try {
  activities = JSON.parse(localStorage.getItem('sh_activities') || '[]');
} catch (err) {
  activities = [];
}
let pollCount  = 0;
let alertCount = 0;

/* ━━━ CLOCK ━━━ */
function updateClock() {
  const now = new Date();
  const el  = document.getElementById('clockTime');
  const de  = document.getElementById('clockDate');
  if (el) el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (de) de.textContent = now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}
setInterval(updateClock, 1000);
updateClock();

/* ━━━ THEME ━━━ */
const savedTheme = localStorage.getItem('sh_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('sh_theme', next);
    } catch (e) {}
    setTimeout(() => {
      if (state.gas !== null) drawGauge('gasGauge', state.gas);
    }, 60);
  });
}

/* ━━━ CANVAS GAUGE ━━━ */
function drawGauge(canvasId, pct) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H - 6;
  const r  = Math.min(W / 2, H) - 14;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const track  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';

  ctx.clearRect(0, 0, W, H);

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  ctx.lineWidth = 14;
  ctx.strokeStyle = track;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Coloured zone tints
  [
    { f: 0,   t: 0.2, c: isDark ? 'rgba(0,230,118,0.18)' : 'rgba(0,180,80,0.18)' },
    { f: 0.2, t: 0.5, c: isDark ? 'rgba(255,179,0,0.18)'  : 'rgba(200,130,0,0.18)' },
    { f: 0.5, t: 1.0, c: isDark ? 'rgba(255,59,59,0.18)'  : 'rgba(200,30,30,0.18)' },
  ].forEach(z => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI + z.f * Math.PI, Math.PI + z.t * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = z.c;
    ctx.lineCap = 'butt';
    ctx.stroke();
  });

  // Tick marks
  for (let i = 0; i <= 10; i++) {
    const ang = Math.PI + (i / 10) * Math.PI;
    const maj = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + (r - (maj ? 10 : 6)) * Math.cos(ang), cy + (r - (maj ? 10 : 6)) * Math.sin(ang));
    ctx.lineTo(cx + (r + 2) * Math.cos(ang),              cy + (r + 2) * Math.sin(ang));
    ctx.lineWidth = maj ? 2 : 1;
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
    ctx.stroke();
  }

  // Fill arc
  const clampedPct = Math.max(0, Math.min(pct, 100));
  const fc = clampedPct < 20
    ? (isDark ? '#00e676' : '#00aa50')
    : clampedPct < 50
    ? (isDark ? '#ffb300' : '#cc8800')
    : (isDark ? '#ff3b3b' : '#cc2020');

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + (clampedPct / 100) * Math.PI);
  ctx.lineWidth = 14;
  ctx.strokeStyle = fc;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle
  const na = Math.PI + (clampedPct / 100) * Math.PI;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + (r - 18) * Math.cos(na), cy + (r - 18) * Math.sin(na));
  ctx.lineWidth = 2;
  ctx.strokeStyle = fc;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = fc;
  ctx.fill();
}

/* ━━━ WATER TANK ━━━ */
function updateWaterTank(pct) {
  const fill  = document.getElementById('waterFill');
  const label = document.getElementById('waterTankLabel');
  if (!fill) return;
  const clamped = Math.max(0, Math.min(pct, 100));
  fill.style.height = clamped + '%';
  fill.classList.remove('high', 'overflow');
  if (clamped >= 95) {
    fill.classList.add('overflow');
  } else if (clamped >= 80) {
    fill.classList.add('high');
  }
  if (label) label.textContent = clamped + '%';
}

/* ━━━ SAFE DOM HELPERS ━━━ */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setCardState(id, lvl) {
  const c = document.getElementById(id);
  if (!c) return;
  c.classList.remove('state-safe', 'state-warn', 'state-danger');
  c.classList.add(`state-${lvl}`);
}

function setDot(id, lvl) {
  const d = document.getElementById(id);
  if (!d) return;
  d.className = `foot-dot ${lvl}`;
}

function setBadge(containerId, cls, iconClass, text) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.textContent = '';
  const badge = document.createElement('span');
  badge.className = `badge ${cls}`;
  const icon = document.createElement('i');
  icon.className = iconClass;
  badge.appendChild(icon);
  badge.appendChild(document.createTextNode(' ' + text));
  container.appendChild(badge);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REACT 18 COMPONENTS
   Works seamlessly via CDN without build tools.
   Includes safe fallback if React CDN is unavailable.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const e = typeof React !== 'undefined' ? React.createElement : null;

/* Stats Bar Component */
function StatsBar({ poll, lastTime, alerts, online }) {
  const connText  = online === true ? 'ACTIVE' : 'PAUSED';
  const connClass = `chip-badge ${online === true ? 'live' : 'paused'}`;
  return e('div', { className: 'stats-row' },
    e('div', { className: 'stat-chip' },
      e('i', { className: 'fa-solid fa-satellite-dish' }), ' ',
      e('span', null, poll), ' telemetry ticks'
    ),
    e('div', { className: 'stat-chip' },
      e('i', { className: 'fa-solid fa-bolt' }), ' last: ',
      e('span', null, lastTime || '—')
    ),
    e('div', { className: 'stat-chip warn-chip' },
      e('i', { className: 'fa-solid fa-bell' }), ' ',
      e('span', null, alerts), ' alerts today'
    ),
    e('div', { className: 'stat-chip' },
      e('i', { className: 'fa-solid fa-microchip' }), ' simulation: ',
      e('span', { className: connClass }, connText)
    )
  );
}

/* Door Value Component */
function DoorVal({ value }) {
  const locked = value === 'LOCKED';
  const color  = !value ? 'var(--cyan)' : locked ? 'var(--green)' : 'var(--red)';
  return e('div', {
    className: 'card-val mono',
    style: { color, textAlign: 'center', fontSize: '26px', letterSpacing: '0.06em', transition: 'color 0.3s' }
  }, value || '— — —');
}

/* Gas Value Component */
function GasVal({ value }) {
  const color = value === null ? 'var(--cyan)'
    : value > 50 ? 'var(--red)'
    : value > 20 ? 'var(--amber)'
    : 'var(--green)';
  return e('div', {
    className: 'gauge-val mono',
    style: { color, transition: 'color 0.3s' }
  }, value !== null ? value + '%' : '—%');
}

/* React Roots & Fallback */
let statsRoot = null;
let doorRoot  = null;
let gasRoot   = null;
let reactData = { poll: 0, lastTime: '—', alerts: 0, online: true };

function renderFallbackStatsBar() {
  const sEl = document.getElementById('reactStatsBar');
  if (!sEl) return;
  sEl.textContent = '';
  const row = document.createElement('div');
  row.className = 'stats-row';

  const c1 = document.createElement('div');
  c1.className = 'stat-chip';
  c1.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> <span>${reactData.poll}</span> telemetry ticks`;

  const c2 = document.createElement('div');
  c2.className = 'stat-chip';
  c2.innerHTML = `<i class="fa-solid fa-bolt"></i> last: <span>${reactData.lastTime || '—'}</span>`;

  const c3 = document.createElement('div');
  c3.className = 'stat-chip warn-chip';
  c3.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${reactData.alerts}</span> alerts today`;

  const c4 = document.createElement('div');
  c4.className = 'stat-chip';
  const connClass = reactData.online ? 'live' : 'paused';
  const connText = reactData.online ? 'ACTIVE' : 'PAUSED';
  c4.innerHTML = `<i class="fa-solid fa-microchip"></i> simulation: <span class="chip-badge ${connClass}">${connText}</span>`;

  row.append(c1, c2, c3, c4);
  sEl.appendChild(row);
}

function mountReact() {
  const hasReact = typeof React !== 'undefined' && typeof ReactDOM !== 'undefined' && ReactDOM.createRoot;
  const sEl = document.getElementById('reactStatsBar');
  const dEl = document.getElementById('reactDoorVal');
  const gEl = document.getElementById('reactGasVal');

  if (hasReact) {
    try {
      if (sEl) { statsRoot = ReactDOM.createRoot(sEl); statsRoot.render(e(StatsBar, reactData)); }
      if (dEl) { doorRoot  = ReactDOM.createRoot(dEl); doorRoot.render(e(DoorVal,  { value: state.door })); }
      if (gEl) { gasRoot   = ReactDOM.createRoot(gEl); gasRoot.render(e(GasVal,   { value: state.gas })); }
      return;
    } catch (err) {
      console.warn('React mounting fallback invoked:', err);
    }
  }
  renderFallbackStatsBar();
}

function updateReact(patch) {
  reactData = { ...reactData, ...patch };
  if (statsRoot && e) {
    statsRoot.render(e(StatsBar, reactData));
  } else {
    renderFallbackStatsBar();
  }
}

/* ━━━ FULL DASHBOARD RENDER ━━━ */
function renderAll() {
  const { door, gas, water } = state;
  const alerts = [];

  // Door card
  if (door !== null) {
    const locked = door === 'LOCKED';
    if (doorRoot && e) {
      doorRoot.render(e(DoorVal, { value: door }));
    } else {
      const dEl = document.getElementById('reactDoorVal');
      if (dEl) {
        dEl.textContent = door;
        dEl.style.color = locked ? 'var(--green)' : 'var(--red)';
      }
    }

    if (locked) {
      setBadge('doorBadge', 'badge-safe', 'fa-solid fa-lock', 'SECURE');
    } else {
      setBadge('doorBadge', 'badge-danger', 'fa-solid fa-lock-open', 'OPEN');
    }

    const doorIcon = document.getElementById('doorIcon');
    if (doorIcon) {
      doorIcon.className = locked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
    }
    setCardState('cardDoor', locked ? 'safe' : 'danger');
    setDot('doorDot', locked ? 'safe' : 'danger');

    if (!locked) {
      alerts.push({ text: 'Door is UNLOCKED — entry point compromised', level: 'danger' });
    }
  }

  // Gas card
  if (gas !== null) {
    if (gasRoot && e) {
      gasRoot.render(e(GasVal, { value: gas }));
    } else {
      const gEl = document.getElementById('reactGasVal');
      if (gEl) {
        gEl.textContent = gas + '%';
        gEl.style.color = gas > 50 ? 'var(--red)' : gas > 20 ? 'var(--amber)' : 'var(--green)';
      }
    }
    drawGauge('gasGauge', gas);

    const lvl = gas > 50 ? 'danger' : gas > 20 ? 'warn' : 'safe';
    if (lvl === 'danger') {
      setBadge('gasBadge', 'badge-danger', 'fa-solid fa-triangle-exclamation', 'DANGER');
    } else if (lvl === 'warn') {
      setBadge('gasBadge', 'badge-warn', 'fa-solid fa-exclamation', 'WARNING');
    } else {
      setBadge('gasBadge', 'badge-safe', 'fa-solid fa-check', 'SAFE');
    }

    setCardState('cardGas', lvl);
    setDot('gasDot', lvl);

    if (gas > 50) {
      alerts.push({ text: `Gas critical: ${gas}% — ventilate immediately`, level: 'danger' });
    } else if (gas > 20) {
      alerts.push({ text: `Gas elevated: ${gas}% — atmosphere monitoring`, level: 'warn' });
    }
  }

  // Water card
  if (water !== null) {
    updateWaterTank(water);
    const lvl = water >= 95 ? 'danger' : water >= 80 ? 'warn' : 'safe';
    if (lvl === 'danger') {
      setBadge('waterBadge', 'badge-danger', 'fa-solid fa-triangle-exclamation', 'OVERFLOW');
    } else if (lvl === 'warn') {
      setBadge('waterBadge', 'badge-warn', 'fa-solid fa-exclamation', 'HIGH');
    } else {
      setBadge('waterBadge', 'badge-info', 'fa-solid fa-check', 'NORMAL');
    }

    setCardState('cardWater', lvl);
    setDot('waterDot', lvl);

    if (water >= 95) {
      alerts.push({ text: `Water overflow risk: ${water}% — check reservoir`, level: 'danger' });
    } else if (water >= 80) {
      alerts.push({ text: `Water level high: ${water}%`, level: 'warn' });
    }
  }

  // Alert Panel (Safe DOM)
  const panel = document.getElementById('alertPanel');
  if (panel) {
    panel.classList.remove('state-safe', 'state-warn', 'state-danger');
    const alertIcon  = document.getElementById('alertIcon');
    const alertCode  = document.getElementById('alertCode');
    const alertTitle = document.getElementById('alertTitle');
    const alertMsg   = document.getElementById('alertMsg');
    const alertLevel = document.getElementById('alertLevel');

    if (alerts.length === 0) {
      panel.classList.add('state-safe');
      if (alertCode) alertCode.textContent = 'STATUS · OK';
      if (alertTitle) alertTitle.textContent = 'ALL SYSTEMS NOMINAL';
      if (alertMsg) alertMsg.textContent = 'No anomalies detected across all sensor zones. Your home is secure.';
      if (alertLevel) alertLevel.textContent = 'SAFE';
      if (alertIcon) alertIcon.className = 'fa-solid fa-shield-halved';
    } else {
      const top = alerts.some(a => a.level === 'danger') ? 'danger' : 'warn';
      panel.classList.add(`state-${top}`);
      if (alertCode) alertCode.textContent = top === 'danger' ? 'STATUS · ALERT' : 'STATUS · WARN';
      if (alertTitle) alertTitle.textContent = top === 'danger' ? 'ALERT — IMMEDIATE ACTION REQUIRED' : 'WARNING — CHECK YOUR HOME';
      if (alertLevel) alertLevel.textContent = top === 'danger' ? 'ALERT' : 'WARNING';
      if (alertIcon) {
        alertIcon.className = top === 'danger'
          ? 'fa-solid fa-triangle-exclamation'
          : 'fa-solid fa-exclamation-circle';
      }

      if (alertMsg) {
        alertMsg.textContent = '';
        alerts.forEach(a => {
          const row = document.createElement('div');
          row.textContent = `► ${a.text}`;
          alertMsg.appendChild(row);
        });
      }

      alertCount++;
      updateReact({ alerts: alertCount });
    }
  }
}

/* ━━━ ACTIVITY LOG (SAFE DOM + LOCALSTORAGE) ━━━ */
function saveActivities() {
  try {
    localStorage.setItem('sh_activities', JSON.stringify(activities.slice(0, 60)));
  } catch (err) {}
}

function logActivity(msg, level = 'safe') {
  activities.unshift({ msg, level, time: new Date().toISOString() });
  saveActivities();
  renderActivity();
}

function renderActivity() {
  const ul = document.getElementById('activityLog');
  if (!ul) return;
  ul.textContent = ''; // Safe clear

  if (!activities.length) {
    const li = document.createElement('li');
    li.className = 'no-log';
    li.textContent = '— NO EVENTS RECORDED —';
    ul.appendChild(li);
    return;
  }

  activities.forEach((a, i) => {
    let t = '--:--:--';
    try {
      t = new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {}

    const li = document.createElement('li');
    li.className = 'log-item';

    const spanTime = document.createElement('span');
    spanTime.className = 'log-time';
    spanTime.textContent = t;

    const spanMsg = document.createElement('span');
    spanMsg.className = 'log-msg';
    spanMsg.textContent = a.msg || '';

    const validLevels = ['safe', 'warn', 'danger'];
    const lvl = validLevels.includes(a.level) ? a.level : 'safe';
    const spanLevel = document.createElement('span');
    spanLevel.className = `log-level ${lvl}`;
    spanLevel.textContent = lvl.toUpperCase();

    const delBtn = document.createElement('button');
    delBtn.className = 'log-del';
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', 'Delete log entry');
    delBtn.title = 'Delete entry';

    const delIcon = document.createElement('i');
    delIcon.className = 'fa-solid fa-xmark';
    delBtn.appendChild(delIcon);

    delBtn.addEventListener('click', () => {
      deleteActivity(i);
    });

    li.appendChild(spanTime);
    li.appendChild(spanMsg);
    li.appendChild(spanLevel);
    li.appendChild(delBtn);

    ul.appendChild(li);
  });
}

function deleteActivity(i) {
  activities.splice(i, 1);
  saveActivities();
  renderActivity();
}

function clearActivity() {
  activities = [];
  saveActivities();
  renderActivity();
}

/* ━━━ TELEMETRY APPLIER & MEANINGFUL EVENT LOGGING ━━━ */
function applyData(newDoor, newGas, newWater) {
  const prev = { ...state };
  state.door  = newDoor;
  state.gas   = typeof newGas   === 'number' ? newGas   : parseInt(newGas, 10)   || 0;
  state.water = typeof newWater === 'number' ? newWater : parseInt(newWater, 10) || 0;

  // 1. Door sensor transitions
  if (prev.door !== null && prev.door !== state.door) {
    if (state.door === 'UNLOCKED') {
      logActivity('Door unlocked', 'danger');
    } else if (state.door === 'LOCKED') {
      logActivity('Door locked', 'safe');
    }
  }

  // 2. Gas sensor transitions
  if (prev.gas !== null) {
    const prevLvl = prev.gas > 50 ? 'danger' : prev.gas > 20 ? 'warn' : 'safe';
    const currLvl = state.gas > 50 ? 'danger' : state.gas > 20 ? 'warn' : 'safe';

    if (prevLvl !== currLvl) {
      if (currLvl === 'warn' && prevLvl === 'safe') {
        logActivity(`Gas level warning detected (${state.gas}%)`, 'warn');
      } else if (currLvl === 'danger') {
        logActivity(`Critical gas concentration detected (${state.gas}%)`, 'danger');
      } else if (currLvl === 'safe' && prevLvl !== 'safe') {
        logActivity(`Gas level returned to safe range`, 'safe');
      }
    }
  }

  // 3. Water sensor transitions
  if (prev.water !== null) {
    const prevLvl = prev.water >= 95 ? 'danger' : prev.water >= 80 ? 'warn' : 'safe';
    const currLvl = state.water >= 95 ? 'danger' : state.water >= 80 ? 'warn' : 'safe';

    if (prevLvl !== currLvl) {
      if (currLvl === 'warn' && prevLvl === 'safe') {
        logActivity(`Water level increased (${state.water}%)`, 'warn');
      } else if (currLvl === 'danger') {
        logActivity(`Water overflow warning detected (${state.water}%)`, 'danger');
      } else if (currLvl === 'safe' && prevLvl !== 'safe') {
        logActivity(`Water level returned to normal`, 'safe');
      }
    }
  }

  pollCount++;
  const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  updateReact({ poll: pollCount, lastTime: t });
  renderAll();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SIMULATED SENSOR ENGINE
   Runs automatic client-side telemetry updates.
   Supports manual override with hold grace periods.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const sim = {
  active: true,
  intervalMs: 3000,
  timerId: null,
  manualHoldUntil: { door: 0, gas: 0, water: 0 },
  // Drift & anomaly models
  ambientGas: 7,
  waterTrend: 1,
  cycleCount: 0
};

function simulationTick() {
  if (!sim.active) return;
  sim.cycleCount++;

  const now = Date.now();
  let nextDoor  = state.door  !== null ? state.door  : 'LOCKED';
  let nextGas   = state.gas   !== null ? state.gas   : 6;
  let nextWater = state.water !== null ? state.water : 42;

  // 1. Door sensor simulation
  if (now > sim.manualHoldUntil.door) {
    // 97% locked, occasional 1-tick entry event every ~35 cycles
    if (sim.cycleCount % 35 === 0) {
      nextDoor = 'UNLOCKED';
    } else {
      nextDoor = 'LOCKED';
    }
  }

  // 2. Gas sensor simulation
  if (now > sim.manualHoldUntil.gas) {
    if (nextGas > 20) {
      // Natural ventilation decay back to ambient safe range
      nextGas = Math.max(sim.ambientGas, nextGas - Math.floor(Math.random() * 8 + 5));
    } else {
      // Ambient noise jitter between 4% and 12%
      const jitter = Math.floor(Math.random() * 5) - 2;
      nextGas = Math.max(3, Math.min(14, sim.ambientGas + jitter));

      // Occasional spike (e.g. cooking anomaly or simulated vapor leak)
      if (sim.cycleCount % 45 === 0) {
        nextGas = 32; // Warning
      } else if (sim.cycleCount % 90 === 0) {
        nextGas = 65; // Danger
      }
    }
  }

  // 3. Water sensor simulation
  if (now > sim.manualHoldUntil.water) {
    if (nextWater >= 95) {
      // Overflow auto-drainage simulation
      sim.waterTrend = -1;
      nextWater = nextWater - Math.floor(Math.random() * 6 + 4);
    } else if (nextWater <= 25) {
      // Automatic reservoir refill simulation
      sim.waterTrend = 1;
      nextWater = nextWater + Math.floor(Math.random() * 6 + 4);
    } else {
      // Slow gentle drift
      const delta = (Math.random() > 0.4 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
      nextWater = Math.max(15, Math.min(98, nextWater + (sim.waterTrend * delta)));
    }
  }

  applyData(nextDoor, nextGas, nextWater);
}

function startSimulation() {
  if (sim.timerId) clearInterval(sim.timerId);
  sim.timerId = setInterval(simulationTick, sim.intervalMs);
  updateSimulationUI();
}

function toggleSimulation() {
  sim.active = !sim.active;
  updateSimulationUI();
  if (sim.active) {
    logActivity('Simulation resumed', 'safe');
    simulationTick(); // Immediate feedback on resume
  } else {
    logActivity('Simulation paused', 'warn');
  }
}

function updateSimulationUI() {
  const btn = document.getElementById('simToggleBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (sim.active) {
    if (btn) {
      btn.classList.remove('paused');
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> <span id="simToggleText">PAUSE SIMULATION</span>';
    }
    if (statusDot)  statusDot.className = 'status-dot online';
    if (statusText) statusText.textContent = 'DEMO MODE · SIMULATED SENSOR DATA';
    updateReact({ online: true });
  } else {
    if (btn) {
      btn.classList.add('paused');
      btn.innerHTML = '<i class="fa-solid fa-play"></i> <span id="simToggleText">RESUME SIMULATION</span>';
    }
    if (statusDot)  statusDot.className = 'status-dot paused';
    if (statusText) statusText.textContent = 'SIMULATION PAUSED · DEMO MODE';
    updateReact({ online: false });
  }
}

/* ━━━ MANUAL OVERRIDE CONTROLS ━━━ */
function manualSet(sensor, value) {
  const now = Date.now();
  // Hold manual state for 15s so simulation doesn't immediately overwrite user testing
  if (sim.manualHoldUntil[sensor] !== undefined) {
    sim.manualHoldUntil[sensor] = now + 15000;
  }

  let nextDoor  = state.door;
  let nextGas   = state.gas;
  let nextWater = state.water;

  if (sensor === 'door') {
    nextDoor = value;
  } else if (sensor === 'gas') {
    nextGas = parseInt(value, 10);
  } else if (sensor === 'water') {
    nextWater = parseInt(value, 10);
  }

  const display = sensor === 'door' ? value : value + '%';
  let level = 'safe';
  if (sensor === 'door'  && value === 'UNLOCKED')           level = 'danger';
  if (sensor === 'gas'   && parseInt(value, 10) > 50)       level = 'danger';
  else if (sensor === 'gas'   && parseInt(value, 10) > 20)  level = 'warn';
  if (sensor === 'water' && parseInt(value, 10) >= 95)      level = 'danger';
  else if (sensor === 'water' && parseInt(value, 10) >= 80) level = 'warn';

  logActivity(`Manual Override · ${sensor.toUpperCase()} → ${display}`, level);
  applyData(nextDoor, nextGas, nextWater);
}

/* ━━━ NAVIGATION & SCROLL TRACKING ━━━ */
function setupNavigation() {
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');
  const navLinks  = document.querySelectorAll('.nav-link');

  // Mobile drawer toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = navToggle.querySelector('i');
      if (icon) {
        icon.className = navMenu.classList.contains('open') ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
      }
    });

    // Close mobile drawer when link clicked
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
          const icon = navToggle.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-bars';
        }
      });
    });
  }

  // Active section highlight on scroll
  const sectionIds = ['dashboard', 'about', 'workflow', 'features', 'architecture', 'tech-stack'];
  window.addEventListener('scroll', () => {
    let currentId = 'dashboard';
    const scrollPos = window.scrollY + 140;

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentId = id;
        }
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

// Expose handlers to window for inline HTML onclick attributes
window.manualSet = manualSet;
window.clearActivity = clearActivity;
window.deleteActivity = deleteActivity;
window.toggleSimulation = toggleSimulation;

/* ━━━ INIT ━━━ */
document.addEventListener('DOMContentLoaded', () => {
  mountReact();
  renderActivity();
  setupNavigation();

  // Initial nominal baseline
  state.door  = 'LOCKED';
  state.gas   = 7;
  state.water = 42;
  renderAll();

  // If activity log was empty, add a welcome demo entry
  if (!activities.length) {
    logActivity('System initialized in Demo Mode', 'safe');
  }

  // Start automatic simulation
  startSimulation();
});
