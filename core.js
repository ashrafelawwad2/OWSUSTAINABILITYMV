/* ==========================================================================
   Oriental Weavers — Projects, Monitoring & M&V Platform — Core runtime
   Table API access, app shell, formatting, M&V calculation engine
   ========================================================================== */
'use strict';

/* ----------------------------- Config ----------------------------- */
const CFG = {
  appName: 'Oriental Weavers',
  appShort: 'OW',
  appFull: 'Projects, Monitoring & M&V Platform',
  group: 'Oriental Weavers Group',
  dept: 'Sustainability & Process Improvement',
  // Project budgets on the OW dashboard are reported in USD.
  currency: 'USD',
  // Group energy performance from the Sustainability monthly report is in EGP.
  energyCurrency: 'EGP',
  datasetVersion: 'ow-2026-11',
  sessionKey: 'axis_session_v1',
  // Viewer link parameter, e.g. portfolio.html?view=1
  viewParam: 'view'
};

/* ----------------------------- Helpers ----------------------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* Bilingual helper. js/i18n.js is loaded first on every page; the fallback
   keeps the platform working even if that file is ever missing. */
const T = typeof I18N !== 'undefined' ? s => I18N.t(s) : s => s;

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function num(v, dflt) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : (dflt === undefined ? 0 : dflt);
}
function sum(arr, fn) { return arr.reduce((a, x) => a + (fn ? num(fn(x)) : num(x)), 0); }
function avg(arr, fn) { return arr.length ? sum(arr, fn) / arr.length : 0; }
function uniq(arr) { return Array.from(new Set(arr.filter(v => v !== null && v !== undefined && v !== ''))); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function byKey(arr, key) { const m = new Map(); arr.forEach(r => m.set(r[key], r)); return m; }
function groupBy(arr, fn) {
  const m = new Map();
  arr.forEach(r => { const k = fn(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return m;
}
function today() { return new Date().toISOString().slice(0, 10); }
function parseDate(s) { if (!s) return null; const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? null : d; }
function monthsBetween(a, b) {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db) return 0;
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/* ----------------------------- Formatting ----------------------------- */
const Fmt = {
  int(v) { return num(v).toLocaleString('en-US', { maximumFractionDigits: 0 }); },
  dec(v, d) { return num(v).toLocaleString('en-US', { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d }); },
  money(v, opts) {
    const n = num(v);
    const o = opts || {};
    const abs = Math.abs(n);
    const cur = o.cur || CFG.currency;
    let body;
    if (o.short !== false && abs >= 1e9) body = (n / 1e9).toFixed(2) + 'B';
    else if (o.short !== false && abs >= 1e6) body = (n / 1e6).toFixed(2) + 'M';
    else if (o.short !== false && abs >= 1e4) body = (n / 1e3).toFixed(1) + 'K';
    else body = n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return (o.sym === false ? '' : cur + ' ') + body;
  },
  moneyFull(v, cur) { return (cur || CFG.currency) + ' ' + num(v).toLocaleString('en-US', { maximumFractionDigits: 0 }); },
  pct(v, d) { return num(v).toFixed(d === undefined ? 1 : d) + '%'; },
  mwh(kwh) { return Fmt.dec(num(kwh) / 1000, 0); },
  signed(v, d) {
    const n = num(v);
    return (n > 0 ? '+' : '') + n.toFixed(d === undefined ? 1 : d);
  },
  date(s) {
    if (!s) return '—';
    const d = parseDate(s);
    if (!d) return esc(s);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateShort(s) {
    if (!s) return '—';
    const d = parseDate(s);
    if (!d) return esc(s);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  },
  period(p) {
    if (!p) return '—';
    const m = String(p).match(/^(\d{4})-(\d{2})$/);
    if (!m) return p;
    const d = new Date(+m[1], +m[2] - 1, 1);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  },
  daysUntil(s) {
    const d = parseDate(s);
    if (!d) return null;
    return Math.round((d - new Date(new Date().toDateString())) / 86400000);
  }
};

/* ----------------------------- Table API ----------------------------- */
const API = {
  async _req(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) { /* non-JSON */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  },
  async list(table, params) {
    const q = new URLSearchParams(Object.assign({ page: 1, limit: 100 }, params || {}));
    const j = await this._req('tables/' + table + '?' + q.toString());
    return { data: (j && j.data) || [], total: (j && j.total) || 0, schema: j && j.schema };
  },
  async all(table, params) {
    const out = [];
    let page = 1;
    for (let guard = 0; guard < 60; guard++) {
      const q = new URLSearchParams(Object.assign({}, params || {}, { page: String(page), limit: '100' }));
      const j = await this._req('tables/' + table + '?' + q.toString());
      const data = (j && j.data) || [];
      out.push.apply(out, data);
      const total = (j && j.total) || 0;
      if (data.length < 100 || out.length >= total) break;
      page++;
    }
    return out;
  },
  get(table, id) { return this._req('tables/' + table + '/' + encodeURIComponent(id)); },
  create(table, data) {
    return this._req('tables/' + table, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
  },
  update(table, id, data) {
    return this._req('tables/' + table + '/' + encodeURIComponent(id), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
  },
  patch(table, id, data) {
    return this._req('tables/' + table + '/' + encodeURIComponent(id), {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
  },
  remove(table, id) {
    return this._req('tables/' + table + '/' + encodeURIComponent(id), { method: 'DELETE' });
  }
};

/* ----------------------------- Session ----------------------------- */
const Session = {
  read() {
    try { return JSON.parse(localStorage.getItem(CFG.sessionKey) || 'null'); } catch (e) { return null; }
  },
  write(s) { localStorage.setItem(CFG.sessionKey, JSON.stringify(s)); },
  clear() { localStorage.removeItem(CFG.sessionKey); },
  isViewerLink() {
    const v = new URLSearchParams(location.search).get(CFG.viewParam);
    return v === '1' || v === 'true' || v === 'view';
  },
  current() {
    if (this.isViewerLink()) {
      return { role: 'viewer', name: 'Stakeholder', email: 'viewer@share', mode: 'link' };
    }
    const s = this.read();
    if (s && (s.role === 'admin' || s.role === 'editor' || s.role === 'verifier' || s.role === 'viewer')) return s;
    return null;
  },
  isViewer() { const c = this.current(); return !c || c.role === 'viewer'; },
  canEdit() { const c = this.current(); return !!c && c.role !== 'viewer'; },
  canVerify() { const c = this.current(); return !!c && (c.role === 'admin' || c.role === 'verifier'); },
  canAdmin() { const c = this.current(); return !!c && c.role === 'admin'; },
  roleLabel(r) {
    return ({ admin: 'Administrator', editor: 'Editor', verifier: 'M&V Verifier', viewer: 'Viewer' })[r] || 'Viewer';
  }
};

/* ----------------------------- Reference data ----------------------------- */
const CATEGORIES = {
  energy: { label: 'Energy Efficiency', icon: 'bolt', color: '#f5a524', short: 'Energy' },
  sustainability: { label: 'Sustainability & Decarbonization', icon: 'leaf', color: '#16c79a', short: 'Sustainability' },
  process: { label: 'Process Development', icon: 'gears', color: '#3b9bff', short: 'Process' },
  facilities: { label: 'New Facilities & Capacity', icon: 'industry', color: '#9b7bff', short: 'Facilities' },
  operations: { label: 'Operational Excellence', icon: 'chart-line', color: '#0ea5e9', short: 'Operations' }
};

/* OW project status vocabulary, taken verbatim from the projects dashboard.
   `order` drives dashboard charts; `color` mirrors the OW deck palette. */
const STATUS_META = {
  'Not Started': { cls: 'b-slate', tl: 'tl-s', color: '#8C92A4', order: 1, active: true },
  'Under Study': { cls: 'b-purple', tl: 'tl-a', color: '#6B46C1', order: 2 },
  'In Progress': { cls: 'b-teal', tl: 'tl-a', color: '#1E7B96', order: 3, active: true },
  'Completed': { cls: 'b-green', tl: 'tl-g', color: '#2E7D32', order: 4 },
  'On Hold': { cls: 'b-amber', tl: 'tl-a', color: '#B7791F', order: 5 },
  'Cancelled': { cls: 'b-red', tl: 'tl-r', color: '#C53030', order: 6 }
};

/* Statuses that count as "active budget" on the OW dashboard:
   In Progress + Not Started. */
const ACTIVE_STATUSES = ['In Progress', 'Not Started'];

const VERIFY_META = {
  'Not Started': 'b-slate',
  'In Progress': 'b-blue',
  'Verification Pending': 'b-amber',
  'Verified': 'b-green',
  'Not Verified': 'b-red'
};

const RISK_META = {
  'Open': 'b-red', 'Mitigating': 'b-amber', 'Escalated': 'b-purple', 'Closed': 'b-green'
};

const TASK_META = {
  'Not Started': 'b-slate', 'In Progress': 'b-blue', 'Completed': 'b-green',
  'Blocked': 'b-red', 'Delayed': 'b-amber', 'At Risk': 'b-amber', 'Cancelled': 'b-slate'
};

/* ----------------------------- Global state ----------------------------- */
const S = {
  facilities: [], projects: [], milestones: [], tasks: [], mvRecords: [],
  kpis: [], risks: [], documents: [], users: [], audit: [], settings: {},
  loaded: false, loadError: null
};

const TABLES = ['facilities', 'projects', 'milestones', 'tasks', 'mv_records', 'kpis', 'risks', 'documents', 'users', 'audit_log', 'settings'];

async function loadAll(force) {
  if (S.loaded && !force) return S;
  const results = await Promise.all(TABLES.map(async t => {
    try { return [t, await API.all(t)]; }
    catch (e) { console.warn('load failed', t, e.message); return [t, []]; }
  }));
  const map = {};
  results.forEach(([t, rows]) => { map[t] = rows; });
  S.facilities = map.facilities || [];
  S.projects = map.projects || [];
  S.milestones = map.milestones || [];
  S.tasks = map.tasks || [];
  S.mvRecords = map.mv_records || [];
  S.kpis = map.kpis || [];
  S.risks = map.risks || [];
  S.documents = map.documents || [];
  S.users = map.users || [];
  S.audit = (map.audit_log || []).sort((a, b) => num(b.ts) - num(a.ts));
  S.settings = {};
  (map.settings || []).forEach(r => { S.settings[r.key] = r.value; });
  // derived lookups
  S.projById = byKey(S.projects, 'id');
  S.loaded = true;
  return S;
}

async function reloadAll() { S.loaded = false; return loadAll(true); }

function setting(key, dflt) {
  const v = S.settings[key];
  return (v === undefined || v === null || v === '') ? dflt : v;
}

/**
 * Group energy performance reported by the OW Sustainability department.
 * Parsed from the `energy_perf` settings row (seeded from the Sustainability
 * monthly report) so the UI never hardcodes these figures.
 * Returns null when the dataset has not been loaded.
 */
function energyPerf() {
  const raw = S.settings && S.settings.energy_perf;
  if (!raw) return null;
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (o && Array.isArray(o.metrics)) ? o : null;
  } catch (e) {
    console.warn('energy_perf setting unreadable', e.message);
    return null;
  }
}

/* ----------------------------- Tariffs / constants ----------------------------- */
function tariffs() {
  return {
    elec: num(setting('elec_price', 0.112)),          // USD / kWh
    gas: num(setting('gas_price', 0.385)),            // USD / Nm3
    water: num(setting('water_price', 1.45)),         // USD / m3
    waste: num(setting('waste_cost', 62)),            // USD / tonne
    efElec: num(setting('grid_ef', 0.451)),           // kgCO2e / kWh
    efGas: num(setting('gas_ef', 2.02)),              // kgCO2e / Nm3
    discount: num(setting('discount_rate', 0.09)),
    life: num(setting('project_life', 12))
  };
}

/* ----------------------------- Project helpers ----------------------------- */
function projectFacility(p) {
  return S.facilities.find(f => f.name === p.factory) || null;
}
function projectCompany(p) { return p.company || '—'; }

function isDelayed(p) {
  if (!p.planned_end) return false;
  if (p.status === 'Completed' || p.status === 'Cancelled') return false;
  return parseDate(p.planned_end) < new Date(new Date().toDateString());
}

function projectDocs(id) { return S.documents.filter(d => d.project_id === id); }
function projectMilestones(id) { return S.milestones.filter(m => m.project_id === id).sort((a, b) => num(a.seq) - num(b.seq)); }
function projectTasks(id) { return S.tasks.filter(t => t.project_id === id); }
function projectRisks(id) { return S.risks.filter(r => r.project_id === id); }
function projectKpis(id) { return S.kpis.filter(k => k.project_id === id); }
function projectMV(id) {
  return S.mvRecords.filter(r => r.project_id === id)
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
}

function riskScore(r) {
  const p = num(r.probability), i = num(r.impact);
  return p * i;
}
function riskLevel(score) {
  if (score >= 15) return { label: 'Critical', cls: 'b-red', tl: 'tl-r' };
  if (score >= 9) return { label: 'High', cls: 'b-amber', tl: 'tl-a' };
  if (score >= 4) return { label: 'Medium', cls: 'b-blue', tl: 'tl-a' };
  return { label: 'Low', cls: 'b-slate', tl: 'tl-s' };
}

/* ==========================================================================
   M&V CALCULATION ENGINE
   IPMVP-inspired: production-normalised baseline adjustment, then savings.
   ========================================================================== */
const MV = {
  /**
   * Normalise one monthly record against its baseline.
   * Production-normalised (Option B/C style) when both production figures exist.
   */
  normalize(r, t) {
    const tt = t || tariffs();
    const prodF = (num(r.production_t) > 0 && num(r.baseline_production_t) > 0)
      ? num(r.production_t) / num(r.baseline_production_t) : 1;

    const baseElec = num(r.baseline_elec_kwh);
    const baseGas = num(r.baseline_gas_nm3);
    const adjBaseElec = baseElec * prodF;
    const adjBaseGas = baseGas * prodF;

    const actElec = num(r.elec_kwh);
    const actGas = num(r.gas_nm3);

    const elecSaved = adjBaseElec - actElec;
    const gasSaved = adjBaseGas - actGas;

    const energySavedKwh = elecSaved + gasSaved * 10.55;  // Nm3 NG -> kWh (LHV ~10.55 kWh/Nm3)
    const costSaved = elecSaved * tt.elec + gasSaved * tt.gas;

    const baseWater = num(r.baseline_water_m3);
    const actWater = num(r.water_m3);
    const waterSaved = baseWater * prodF - actWater;

    const baseWaste = num(r.baseline_waste_t);
    const actWaste = num(r.waste_t);
    const wasteSaved = baseWaste * prodF - actWaste;

    const ghgBase = (adjBaseElec * tt.efElec + adjBaseGas * tt.efGas) / 1000;
    const ghgAct = (actElec * tt.efElec + actGas * tt.efGas) / 1000;
    const ghgSaved = ghgBase - ghgAct;

    const secBase = (num(r.baseline_production_t) > 0) ? baseElec / num(r.baseline_production_t) : 0;
    const secAct = (num(r.production_t) > 0) ? actElec / num(r.production_t) : 0;

    return {
      period: r.period, prodF, elecSaved, gasSaved, energySavedKwh, costSaved,
      waterSaved, wasteSaved, ghgSaved, ghgBase, ghgAct,
      secBase, secAct, actElec, adjBaseElec, actGas, adjBaseGas,
      production: num(r.production_t), verified: !!r.verified, rec: r
    };
  },

  /** Aggregate every M&V record of a project. */
  summary(project, t) {
    const tt = t || tariffs();
    const recs = project ? projectMV(project.id) : [];
    const norm = recs.map(r => this.normalize(r, tt));
    const months = norm.length;
    const ann = months > 0 ? Math.min(12 / months, 12) : 0;  // annualisation factor

    const tot = {
      months,
      elecSaved: sum(norm, n => n.elecSaved),
      gasSaved: sum(norm, n => n.gasSaved),
      energySavedKwh: sum(norm, n => n.energySavedKwh),
      costSaved: sum(norm, n => n.costSaved),
      waterSaved: sum(norm, n => n.waterSaved),
      wasteSaved: sum(norm, n => n.wasteSaved),
      ghgSaved: sum(norm, n => n.ghgSaved),
      actualElec: sum(norm, n => n.actElec),
      adjBaseElec: sum(norm, n => n.adjBaseElec),
      actualGas: sum(norm, n => n.actGas),
      adjBaseGas: sum(norm, n => n.adjBaseGas),
      production: sum(norm, n => n.production)
    };

    const vnorm = norm.filter(n => n.verified);
    const ver = {
      count: vnorm.length,
      elecSaved: sum(vnorm, n => n.elecSaved),
      gasSaved: sum(vnorm, n => n.gasSaved),
      energySavedKwh: sum(vnorm, n => n.energySavedKwh),
      costSaved: sum(vnorm, n => n.costSaved),
      ghgSaved: sum(vnorm, n => n.ghgSaved),
      waterSaved: sum(vnorm, n => n.waterSaved),
      wasteSaved: sum(vnorm, n => n.wasteSaved)
    };

    const expected = num(project && project.savings_expected);
    const costAnnual = tot.costSaved * ann;
    const verAnnual = ver.costSaved * ann;
    const energyAnnual = tot.energySavedKwh * ann;
    const ghgAnnual = tot.ghgSaved * ann;
    const verEnergyAnnual = ver.energySavedKwh * ann;
    const verGhgAnnual = ver.ghgSaved * ann;

    const achievement = expected > 0 ? (costAnnual / expected) * 100 : null;
    const verifiedPct = costAnnual !== 0 ? (verAnnual / costAnnual) * 100 : 0;

    const capex = num(project && (project.capex_actual || project.capex_approved || project.capex_estimated));
    const payback = costAnnual > 0 ? capex / costAnnual : null;
    const secBase = months ? avg(norm, n => n.secBase) : 0;
    const secAct = months ? avg(norm, n => n.secAct) : 0;
    const secImpr = secBase > 0 ? ((secBase - secAct) / secBase) * 100 : 0;

    return {
      months, annualisation: ann, recs, norm, tot,
      annual: {
        cost: costAnnual,
        energyKwh: energyAnnual,
        energyMwh: energyAnnual / 1000,
        ghg: ghgAnnual,
        water: tot.waterSaved * ann,
        waste: tot.wasteSaved * ann,
        gas: tot.gasSaved * ann,
        elec: tot.elecSaved * ann
      },
      verified: {
        cost: verAnnual, energyKwh: verEnergyAnnual, energyMwh: verEnergyAnnual / 1000,
        ghg: verGhgAnnual, water: ver.waterSaved * ann, waste: ver.wasteSaved * ann,
        count: ver.count, pct: verifiedPct
      },
      expected, achievement, payback, secBase, secAct, secImpr, capex,
      hasData: months > 0
    };
  },

  /** Financial metrics for a project. */
  finance(p, annualSaving) {
    const tt = tariffs();
    const capex = num(p.capex_actual) || num(p.capex_approved) || num(p.capex_estimated);
    const save = num(annualSaving);
    const opex = num(p.opex_annual);
    const net = save - opex;
    const life = tt.life;
    const r = tt.discount;
    let npv = -capex;
    for (let i = 1; i <= life; i++) npv += net / Math.pow(1 + r, i);
    let irr = null;
    if (net > 0 && capex > 0) {
      let lo = -0.9, hi = 3.0;
      const f = x => {
        let v = -capex;
        for (let i = 1; i <= life; i++) v += net / Math.pow(1 + x, i);
        return v;
      };
      if (f(lo) * f(hi) < 0) {
        for (let i = 0; i < 80; i++) {
          const mid = (lo + hi) / 2;
          if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
        }
        irr = (lo + hi) / 2 * 100;
      }
    }
    return {
      capex, save, opex, net, npv, irr, life,
      payback: net > 0 ? capex / net : null,
      roi: capex > 0 ? (net * life - capex) / capex * 100 : null,
      benefitCost: capex > 0 ? (net * life) / capex : null
    };
  }
};

/* ----------------------------- Portfolio aggregation ----------------------------- */
/**
 * Build the enriched portfolio model used by every dashboard.
 * opts: {category, company, factory, status, priority}
 */
function portfolio(opts) {
  const o = opts || {};
  const tt = tariffs();
  const projects = S.projects.filter(p => {
    if (o.category && p.category !== o.category) return false;
    if (o.company && p.company !== o.company) return false;
    if (o.factory && p.factory !== o.factory) return false;
    if (o.status && p.status !== o.status) return false;
    if (o.priority && p.priority !== o.priority) return false;
    if (o.search) {
      const q = o.search.toLowerCase();
      const hay = [p.code, p.name, p.factory, p.company, p.owner, p.subcategory, p.description].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  const rows = projects.map(p => {
    const mv = MV.summary(p, tt);
    const fin = MV.finance(p, mv.hasData ? mv.annual.cost : num(p.savings_expected));
    return {
      p, mv, fin,
      delayed: isDelayed(p),
      risks: projectRisks(p.id),
      openRisks: projectRisks(p.id).filter(r => r.status !== 'Closed'),
      needsAttention: isDelayed(p) || p.priority === 'Critical' ||
        (mv.achievement !== null && mv.achievement < 80) ||
        projectRisks(p.id).some(r => r.status !== 'Closed' && riskScore(r) >= 15)
    };
  });

  const byStatus = {};
  Object.keys(STATUS_META).forEach(k => { byStatus[k] = 0; });
  rows.forEach(r => { byStatus[r.p.status] = (byStatus[r.p.status] || 0) + 1; });

  const totals = {
    count: rows.length,
    byStatus,
    notStarted: byStatus['Not Started'] || 0,
    underStudy: byStatus['Under Study'] || 0,
    inProgress: byStatus['In Progress'] || 0,
    completed: byStatus['Completed'] || 0,
    onHold: byStatus['On Hold'] || 0,
    cancelled: byStatus['Cancelled'] || 0,
    delayed: rows.filter(r => r.delayed).length,
    attention: rows.filter(r => r.needsAttention).length,
    // OW dashboard basis: total budget of all projects, and active budget
    // covering only In Progress + Not Started.
    budgetTotal: sum(rows, r => num(r.p.capex_estimated)),
    budgetActive: sum(rows.filter(r => ACTIVE_STATUSES.includes(r.p.status)), r => num(r.p.capex_estimated)),
    activeCount: rows.filter(r => ACTIVE_STATUSES.includes(r.p.status)).length,
    capexEstimated: sum(rows, r => num(r.p.capex_estimated)),
    capexApproved: sum(rows, r => num(r.p.capex_approved)),
    capexActual: sum(rows, r => num(r.p.capex_actual)),
    savingsExpected: sum(rows, r => num(r.p.savings_expected)),
    savingsActual: sum(rows, r => r.mv.hasData ? r.mv.annual.cost : 0),
    savingsVerified: sum(rows, r => r.mv.verified.cost),
    energySavedMwh: sum(rows, r => r.mv.annual.energyMwh),
    energySavedMwhVerified: sum(rows, r => r.mv.verified.energyMwh),
    elecKwh: sum(rows, r => r.mv.annual.elec),
    gasNm3: sum(rows, r => r.mv.annual.gas),
    renewableMwh: sum(rows, r => num(r.p.renewable_mwh_year)),
    ghgAvoided: sum(rows, r => r.mv.annual.ghg),
    ghgAvoidedVerified: sum(rows, r => r.mv.verified.ghg),
    waterM3: sum(rows, r => r.mv.annual.water),
    wasteT: sum(rows, r => r.mv.annual.waste),
    capacityAdded: sum(rows, r => num(r.p.capacity_added)),
    secImprovement: avg(rows.filter(r => r.p.sec_improvement_pct), r => num(r.p.sec_improvement_pct)),
    avgProgress: rows.length ? avg(rows, r => num(r.p.progress)) : 0,
    /* OW dashboard basis: budget-weighted completion across the In Progress
       projects that carry a budget. This reproduces the 42% the deck reports;
       a plain average over all 21 rows (many at 0%) would understate it. */
    avgProgressActive: (function () {
      const act = rows.filter(r => r.p.status === 'In Progress' && num(r.p.capex_estimated) > 0);
      const b = sum(act, r => num(r.p.capex_estimated));
      if (b > 0) return sum(act, r => num(r.p.capex_estimated) * num(r.p.progress)) / b;
      return act.length ? avg(act, r => num(r.p.progress)) : 0;
    })(),
    /* Progress count basis used alongside the weighted figure, so the board can
       show both the weighted % and how many projects it is derived from. */
    avgProgressActiveCount: rows.filter(r => r.p.status === 'In Progress').length,
    mvCoverage: rows.length ? (rows.filter(r => r.mv.hasData).length / rows.length) * 100 : 0,
    verifiedCount: rows.filter(r => r.p.verification_status === 'Verified').length,
    openRisks: sum(rows, r => r.openRisks.length),
    criticalRisks: rows.reduce((a, r) => a + r.openRisks.filter(x => riskScore(x) >= 15).length, 0)
  };

  totals.remainingBudget = totals.capexApproved - totals.capexActual;
  totals.budgetUtil = totals.capexApproved > 0 ? (totals.capexActual / totals.capexApproved) * 100 : 0;
  totals.achievement = totals.savingsExpected > 0 ? (totals.savingsActual / totals.savingsExpected) * 100 : 0;
  totals.verifyRate = totals.savingsActual > 0 ? (totals.savingsVerified / totals.savingsActual) * 100 : 0;
  totals.payback = totals.savingsActual > 0 ? totals.capexActual / totals.savingsActual : 0;
  totals.roi = totals.capexActual > 0 ? ((totals.savingsActual * tt.life) - totals.capexActual) / totals.capexActual * 100 : 0;

  // Portfolio-level NPV / IRR on actual spend & measured savings
  let pnpv = -totals.capexActual;
  for (let i = 1; i <= tt.life; i++) pnpv += totals.savingsActual / Math.pow(1 + tt.discount, i);
  totals.npv = pnpv;

  return { rows, totals, projects, filtered: rows };
}

/* ----------------------------- Notifications / alerts ----------------------------- */
function buildAlerts() {
  const alerts = [];
  const now = new Date(new Date().toDateString());
  const tt = tariffs();

  S.projects.forEach(p => {
    if (p.status === 'Cancelled') return;
    // Overdue milestone
    projectMilestones(p.id).forEach(m => {
      if (m.status !== 'Completed' && m.planned_date) {
        const d = parseDate(m.planned_date);
        if (d && d < now) {
          const late = Math.round((now - d) / 86400000);
          alerts.push({
            sev: late > 30 ? 'high' : 'med', type: 'Milestone overdue',
            title: p.code + ' — ' + m.name, meta: late + ' days overdue · owner ' + (m.owner || 'unassigned'),
            projectId: p.id, link: 'project.html?id=' + p.id + '&tab=timeline'
          });
        }
      }
    });
    // Project past planned completion
    if (isDelayed(p)) {
      const late = Math.round((now - parseDate(p.planned_end)) / 86400000);
      alerts.push({
        sev: p.priority === 'Critical' ? 'high' : 'med', type: 'Project delayed',
        title: p.code + ' — ' + p.name,
        meta: 'Planned completion passed ' + late + ' days ago · ' + Fmt.pct(num(p.progress), 0) + ' complete',
        projectId: p.id, link: 'project.html?id=' + p.id
      });
    }
    // Budget overrun
    if (num(p.capex_actual) > num(p.capex_approved) && num(p.capex_approved) > 0) {
      const over = num(p.capex_actual) - num(p.capex_approved);
      alerts.push({
        sev: 'high', type: 'Budget overrun', title: p.code + ' — ' + p.name,
        meta: Fmt.moneyFull(over) + ' over approved CAPEX (' + Fmt.pct(num(p.capex_actual) / num(p.capex_approved) * 100, 0) + ' utilisation)',
        projectId: p.id, link: 'project.html?id=' + p.id + '&tab=finance'
      });
    }
    // Performance below target
    const mv = MV.summary(p, tt);
    if (mv.hasData && mv.achievement !== null && mv.achievement < 90) {
      alerts.push({
        sev: mv.achievement < 70 ? 'high' : 'med', type: 'Below target',
        title: p.code + ' — savings achievement ' + Fmt.pct(mv.achievement, 0),
        meta: Fmt.money(mv.annual.cost) + '/yr measured vs ' + Fmt.money(mv.expected) + '/yr target',
        projectId: p.id, link: 'project.html?id=' + p.id + '&tab=mv'
      });
    }
    // Missing M&V data for active projects
    if ((p.status === 'Completed' || p.status === 'In Progress') && p.mv_method) {
      const recs = projectMV(p.id);
      const thisPeriod = new Date().toISOString().slice(0, 7);
      const lastPeriod = recs.length ? recs[recs.length - 1].period : null;
      if (!lastPeriod || (lastPeriod < thisPeriod && lastPeriod < prevPeriod(thisPeriod))) {
        alerts.push({
          sev: 'med', type: 'Missing M&V data', title: p.code + ' — no data for ' + Fmt.period(prevPeriod(thisPeriod)),
          meta: lastPeriod ? 'Last submitted period: ' + Fmt.period(lastPeriod) : 'No M&V records submitted yet',
          projectId: p.id, link: 'project.html?id=' + p.id + '&tab=mv'
        });
      }
    }
    // Target exceeded
    if (mv.hasData && mv.achievement !== null && mv.achievement >= 100) {
      alerts.push({
        sev: 'ok', type: 'Target achieved', title: p.code + ' — ' + Fmt.pct(mv.achievement, 0) + ' of expected savings',
        meta: Fmt.money(mv.annual.cost) + '/yr measured vs ' + Fmt.money(mv.expected) + '/yr target',
        projectId: p.id, link: 'project.html?id=' + p.id + '&tab=mv'
      });
    }
    // Pending verification
    if (p.verification_status === 'Verification Pending') {
      alerts.push({
        sev: 'med', type: 'Verification pending', title: p.code + ' — awaiting independent verification',
        meta: 'M&V method ' + (p.mv_method || '—') + ' · ' + mv.months + ' monthly records',
        projectId: p.id, link: 'project.html?id=' + p.id + '&tab=mv'
      });
    }
  });

  // Critical risks
  S.risks.filter(r => r.status !== 'Closed' && riskScore(r) >= 15).forEach(r => {
    const p = S.projById.get(r.project_id);
    alerts.push({
      sev: 'high', type: 'Critical risk', title: (p ? p.code + ' — ' : '') + r.title,
      meta: 'Score ' + riskScore(r) + ' · ' + r.category + ' · target ' + Fmt.dateShort(r.target_date),
      projectId: r.project_id, link: 'risks.html'
    });
  });

  // Pending decisions
  S.risks.filter(r => r.type === 'Decision' && r.status === 'Open').forEach(r => {
    const p = S.projById.get(r.project_id);
    alerts.push({
      sev: 'low', type: 'Decision pending', title: (p ? p.code + ' — ' : '') + r.title,
      meta: 'Raised ' + Fmt.dateShort(r.raised_date) + ' · responsible ' + (r.responsible || '—'),
      projectId: r.project_id, link: 'risks.html'
    });
  });

  // Upcoming milestones (next 21 days)
  S.milestones.forEach(m => {
    if (m.status === 'Completed' || !m.planned_date) return;
    const d = parseDate(m.planned_date);
    if (!d) return;
    const days = Math.round((d - now) / 86400000);
    if (days >= 0 && days <= 21) {
      const p = S.projById.get(m.project_id);
      alerts.push({
        sev: 'low', type: 'Milestone due soon', title: (p ? p.code + ' — ' : '') + m.name,
        meta: 'Due in ' + days + ' day' + (days === 1 ? '' : 's') + ' (' + Fmt.dateShort(m.planned_date) + ')',
        projectId: m.project_id, link: 'project.html?id=' + m.project_id + '&tab=timeline'
      });
    }
  });

  const order = { high: 0, med: 1, low: 2, ok: 3 };
  alerts.sort((a, b) => order[a.sev] - order[b.sev]);
  return alerts;
}

function prevPeriod(period) {
  const m = String(period).match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  let y = +m[1], mo = +m[2] - 1;
  if (mo < 1) { mo = 12; y -= 1; }
  return y + '-' + String(mo).padStart(2, '0');
}

/* ----------------------------- UI primitives ----------------------------- */
const UI = {
  toast(msg, kind, ms) {
    let host = $('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'info');
    const ico = kind === 'ok' ? 'check-circle' : kind === 'err' ? 'circle-exclamation' : 'circle-info';
    el.innerHTML = '<i class="fa-solid fa-' + ico + '"></i><div>' + esc(msg) + '</div>';
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = '.25s'; }, ms || 3400);
    setTimeout(() => el.remove(), (ms || 3400) + 300);
  },

  modal(opts) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML =
      '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(opts.title || '') + '</h3>' +
      '<button class="icon-btn" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.footer === false ? '' : '<div class="modal-foot">' + (opts.footer || '<button class="btn" data-close>Close</button>') + '</div>') +
      '</div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-close]')) close();
    });
    const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    back._close = close;
    if (opts.onMount) opts.onMount(back);
    return back;
  },

  confirm(msg, onYes, danger) {
    const m = UI.modal({
      title: 'Please confirm',
      size: 'narrow',
      body: '<p style="font-size:13px;color:var(--text-dim)">' + esc(msg) + '</p>',
      footer: '<button class="btn" data-close>Cancel</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-yes>Confirm</button>'
    });
    m.querySelector('[data-yes]').addEventListener('click', () => { m._close(); onYes(); });
  },

  badge(text, cls) { return '<span class="badge ' + (cls || 'b-slate') + '">' + esc(text) + '</span>'; },
  statusBadge(status) {
    const m = STATUS_META[status] || { cls: 'b-slate' };
    return '<span class="badge ' + m.cls + '">' + esc(status) + '</span>';
  },
  verifyBadge(v) { return '<span class="badge ' + (VERIFY_META[v] || 'b-slate') + '">' + esc(v || '—') + '</span>'; },
  riskBadge(s) { return '<span class="badge ' + (RISK_META[s] || 'b-slate') + '">' + esc(s) + '</span>'; },
  taskBadge(s) { return '<span class="badge ' + (TASK_META[s] || 'b-slate') + '">' + esc(s) + '</span>'; },
  catBadge(cat) {
    const c = CATEGORIES[cat] || { label: cat, color: '#64748b' };
    return '<span class="badge" style="background:' + c.color + '1f;color:' + c.color + ';border-color:' + c.color + '4d">' + esc(c.label) + '</span>';
  },
  prog(v, cls) {
    const p = clamp(num(v), 0, 100);
    return '<div class="prog-row"><div class="prog ' + (cls || '') + '"><i style="width:' + p + '%"></i></div><span>' + Math.round(p) + '%</span></div>';
  },
  tl(level) { return '<span class="tl tl-' + level + '"></span>'; },
  delta(v, goodWhenUp) {
    const up = num(v) >= 0;
    const good = goodWhenUp === false ? !up : up;
    return '<span class="kpi-delta ' + (good ? 'up' : 'down') + '"><i class="fa-solid fa-' + (up ? 'arrow-up' : 'arrow-down') + '"></i>' + Math.abs(num(v)).toFixed(1) + '%</span>';
  },
  kpi(opts) {
    const accent = opts.accent || 'var(--brand)';
    return '<div class="kpi" style="--kpi-accent:' + accent + '">' +
      '<div class="kpi-top"><span class="kpi-label">' + esc(opts.label) + '</span>' +
      (opts.icon ? '<i class="fa-solid fa-' + opts.icon + ' kpi-icon"></i>' : '') + '</div>' +
      '<div class="kpi-value">' + opts.value + (opts.unit ? '<small>' + esc(opts.unit) + '</small>' : '') + '</div>' +
      (opts.bar !== undefined ? '<div class="kpi-bar"><i style="width:' + clamp(num(opts.bar), 0, 100) + '%"></i></div>' : '') +
      '<div class="kpi-foot">' + (opts.foot || '') + '</div>' +
      '</div>';
  },
  empty(title, msg, icon) {
    return '<div class="empty-state"><i class="fa-solid fa-' + (icon || 'inbox') + '"></i>' +
      '<h4>' + esc(title) + '</h4><p>' + esc(msg || '') + '</p></div>';
  },
  loadingRow(cols) {
    return '<tr><td colspan="' + cols + '"><div class="skeleton" style="height:14px;margin:6px 0"></div></td></tr>';
  },
  sectionTitle(txt) { return '<div class="section-title">' + esc(txt) + '</div>'; }
};

/* ----------------------------- Shell / navigation ----------------------------- */
const NAV = [
  { group: 'Overview', items: [
    { id: 'slide', n: 1, label: 'Executive Slide', icon: 'chalkboard-user', href: 'slide.html' },
    { id: 'status', n: 2, label: 'All Projects Status', icon: 'table-columns', href: 'status.html' },
    { id: 'dashboard', n: 3, label: 'Executive Dashboard', icon: 'gauge-high', href: 'index.html' },
    { id: 'portfolio', n: 4, label: 'Project Portfolio', icon: 'layer-group', href: 'portfolio.html' }
  ]},
  { group: 'Project Delivery', items: [
    { id: 'register', n: 5, label: 'Project Registration', icon: 'file-circle-plus', href: 'register.html' },
    { id: 'management', n: 6, label: 'Project Management', icon: 'diagram-project', href: 'management.html' },
    { id: 'monitoring', n: 7, label: 'Implementation Monitoring', icon: 'gantt-chart', href: 'monitoring.html' }
  ]},
  { group: 'Performance', items: [
    { id: 'mv', n: 8, label: 'M&V & Verification', icon: 'chart-line', href: 'mv.html' },
    { id: 'energy', n: 9, label: 'Energy & Sustainability', icon: 'leaf', href: 'energy.html' },
    { id: 'process', n: 10, label: 'Process Optimization', icon: 'gears', href: 'process.html' },
    { id: 'facilities', n: 11, label: 'New Facilities', icon: 'industry', href: 'facilities.html' },
    { id: 'finance', n: 12, label: 'Financial Performance', icon: 'coins', href: 'finance.html' }
  ]},
  { group: 'Governance', items: [
    { id: 'risks', n: 13, label: 'Risk & Issues', icon: 'triangle-exclamation', href: 'risks.html' },
    { id: 'reports', n: 14, label: 'Reports & Analytics', icon: 'file-export', href: 'reports.html' },
    { id: 'admin', n: 15, label: 'Administration', icon: 'sliders', href: 'admin.html', adminOnly: true }
  ]}
];

const Shell = {
  render(pageId, title, crumb) {
    const viewerLink = Session.isViewerLink();
    const sess = Session.current();
    const isViewer = !sess || sess.role === 'viewer';
    document.body.classList.toggle('viewer', isViewer);

    // Sidebar
    const sidebar = $('#sidebar');
    if (sidebar) {
      let nav = '<div class="brand"><div class="brand-mark">' + esc(CFG.appShort) + '</div><div class="brand-txt">' +
        '<strong>' + esc(T('Oriental Weavers')) + '</strong><span>' + esc(T('Projects & M&V')) + '</span></div></div><nav class="nav">';
      NAV.forEach(g => {
        nav += '<div class="nav-group"><div class="nav-label">' + esc(T(g.group)) + '</div>';
        g.items.forEach(it => {
          const cls = (it.id === pageId ? ' active' : '') + (it.adminOnly && !Session.canAdmin() ? ' admin-only' : '');
          nav += '<a class="nav-item' + cls + '" href="' + it.href + (viewerLink ? (it.href.indexOf('?') > -1 ? '&' : '?') + 'view=1' : '') + '">' +
            '<i class="fa-solid fa-' + it.icon + '"></i><span>' + esc(T(it.label)) + '</span>' +
            '<span class="nav-num">' + it.n + '</span></a>';
        });
        nav += '</div>';
      });
      nav += '</nav><div class="sidebar-foot"><span class="live-dot"></span>' +
        esc(isViewer ? T('Read-only viewer') : T(CFG.dept)) + '</div>';
      sidebar.innerHTML = nav;
    }

    // Topbar
    const top = $('#topbar');
    if (top) {
      const name = sess ? sess.name : T('Guest');
      const role = sess ? T(Session.roleLabel(sess.role)) : T('Viewer');
      const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      top.innerHTML =
        '<button class="icon-btn hamburger" id="navToggle" aria-label="' + esc(T('Menu')) + '"><i class="fa-solid fa-bars"></i></button>' +
        '<div><h1>' + esc(T(title)) + '</h1><div class="crumb">' + esc(crumb ? T(crumb) : T(CFG.group)) + '</div></div>' +
        '<div class="topbar-spacer"></div>' +
        '<span class="viewer-flag"><i class="fa-solid fa-lock"></i>' + esc(T('Viewer mode')) + '</span>' +
        '<span class="tiny muted nowrap" style="display:inline-flex;align-items:center;gap:6px">' +
        '<i class="fa-solid fa-calendar-days"></i>' + esc(I18N.period(Fmt.period(setting('energy_report_period', '2026-10')))) + '</span>' +
        '<button class="icon-btn" id="alertBtn" aria-label="' + esc(T('Alerts')) + '" title="' + esc(T('Alerts')) + '"><i class="fa-solid fa-bell"></i><span class="dot" id="alertDot" style="display:none"></span></button>' +
        '<button class="icon-btn" id="printBtn" aria-label="' + esc(T('Print')) + '" title="' + esc(T('Print current view')) + '"><i class="fa-solid fa-print"></i></button>' +
        '<button class="lang-btn" id="langBtn" title="' + esc(I18N.toggleTitle) + '" aria-label="' + esc(T('Language')) + '">' +
        '<i class="fa-solid fa-language"></i>' + esc(I18N.toggleLabel) + '</button>' +
        '<div class="user-chip" id="userChip" title="' + esc(role) + '">' +
        '<div class="avatar">' + esc(initials || 'G') + '</div>' +
        '<div><div class="u-name">' + esc(name) + '</div><div class="u-role">' + esc(role) + '</div></div></div>';

      $('#navToggle')?.addEventListener('click', () => document.body.classList.toggle('nav-open'));
      $('#printBtn')?.addEventListener('click', () => window.print());
      $('#alertBtn')?.addEventListener('click', () => Shell.showAlerts());
      $('#userChip')?.addEventListener('click', () => Shell.userMenu());
      $('#langBtn')?.addEventListener('click', () => I18N.toggle());
    }

    // Scrim
    if (!$('#navScrim')) {
      const sc = document.createElement('div');
      sc.className = 'nav-scrim'; sc.id = 'navScrim';
      sc.addEventListener('click', () => document.body.classList.remove('nav-open'));
      document.body.appendChild(sc);
    }
  },

  showAlerts() {
    const alerts = buildAlerts();
    const counts = { high: 0, med: 0, low: 0, ok: 0 };
    alerts.forEach(a => counts[a.sev]++);
    let body = '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' +
      '<span class="badge b-red">' + counts.high + ' urgent</span>' +
      '<span class="badge b-amber">' + counts.med + ' attention</span>' +
      '<span class="badge b-blue">' + counts.low + ' informational</span>' +
      '<span class="badge b-green">' + counts.ok + ' achievements</span></div>';
    if (!alerts.length) body += UI.empty('No alerts', 'All projects are within plan, budget and performance targets.', 'circle-check');
    else {
      body += alerts.slice(0, 60).map(a =>
        '<a class="alert-item" href="' + a.link + '" style="text-decoration:none;color:inherit">' +
        '<span class="alert-sev sev-' + a.sev + '"></span>' +
        '<span class="ai-body"><span class="ai-title">' + esc(a.title) + '</span>' +
        '<span class="ai-meta">' + esc(a.type) + ' · ' + esc(a.meta) + '</span></span>' +
        '<i class="fa-solid fa-chevron-right" style="color:var(--text-mute);font-size:10px;margin-top:4px"></i></a>'
      ).join('');
    }
    UI.modal({ title: 'Notifications & Alerts (' + alerts.length + ')', body: body, size: 'wide' });
  },

  userMenu() {
    const sess = Session.current() || {};
    const body = '<div class="field"><label>Signed in as</label><div class="kv-v" style="font-size:14px">' + esc(sess.name || 'Guest') + '</div></div>' +
      '<div class="kv-grid" style="margin-bottom:16px">' +
      '<div class="kv"><div class="kv-k">Role</div><div class="kv-v">' + esc(Session.roleLabel(sess.role)) + '</div></div>' +
      '<div class="kv"><div class="kv-k">Email</div><div class="kv-v">' + esc(sess.email || '—') + '</div></div>' +
      '<div class="kv"><div class="kv-k">Access mode</div><div class="kv-v">' + (Session.isViewerLink() ? 'Shared viewer link' : 'Authenticated session') + '</div></div>' +
      '</div>' +
      (Session.canEdit() ? '<a class="btn" href="admin.html" style="width:100%;margin-bottom:8px"><i class="fa-solid fa-sliders"></i> Administration &amp; Settings</a>' : '') +
      '<button class="btn btn-danger" id="signOut" style="width:100%"><i class="fa-solid fa-right-from-bracket"></i> Sign out</button>';
    const m = UI.modal({ title: 'Account', body: body, size: 'narrow', footer: false });
    m.querySelector('#signOut').addEventListener('click', () => {
      Session.clear();
      location.href = 'login.html';
    });
  }
};

/* ----------------------------- App boot ----------------------------- */
const App = {
  /**
   * boot({page, title, crumb, render})
   * Enforces the session gate, renders the shell, loads data, then renders.
   */
  async boot(cfg) {
    // Session gate
    if (!Session.current()) { location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search)); return; }

    Shell.render(cfg.page, cfg.title, cfg.crumb);

    const content = $('#content');
    if (content && cfg.skeleton !== false) {
      content.innerHTML = '<div class="loading-wrap"><div class="skeleton" style="height:96px;margin-bottom:14px"></div>' +
        '<div class="skeleton" style="height:300px"></div></div>';
    }

    try {
      await loadAll();

      // First run, or an OW dataset upgrade: load the Oriental Weavers data.
      // The seed is idempotent (fixed row ids) and resumable, so an interrupted
      // bootstrap is completed on the next load instead of being left partial.
      // NOTE: `Seed` is a top-level const, so it is not a window property.
      // Previously-loaded synthetic demonstration rows are NOT deleted: they are
      // marked archived by the upgrade below so real OW records are never lost.
      const needsSeed = typeof Seed !== 'undefined' && !Seed.isComplete();
      if (needsSeed) {
        content.innerHTML = '<div class="card card-pad"><div class="loading-wrap">' +
          '<div class="spinner" style="width:30px;height:30px;border-radius:50%;margin:0 auto 12px;' +
          'border:3px solid rgba(27,42,107,.2);border-top-color:var(--brand);animation:spin .8s linear infinite"></div>' +
          '<div id="seedMsg">Loading the Oriental Weavers project database…</div></div></div>';
        try {
          await Seed.run(m => { const el = $('#seedMsg'); if (el) el.textContent = m; });
          await reloadAll();
        } catch (e) {
          console.warn('seed failed', e);
          content.innerHTML = '<div class="banner banner-warn"><i class="fa-solid fa-triangle-exclamation"></i>' +
            '<div><strong>Initial data setup did not complete.</strong><br>' + esc(e.message) +
            '<br>You can still register projects manually.</div></div>' +
            '<a class="btn btn-primary" href="register.html"><i class="fa-solid fa-plus"></i> Register a project</a>';
          return;
        }
      }

      if (!S.projects.length) {
        content.innerHTML = '<div class="card card-pad">' + UI.empty('No project data yet',
          'The project database is empty. Administrator or Editor access is required to load the Oriental Weavers dataset.',
          'database') + '<div style="text-align:center"><a class="btn btn-primary" href="login.html"><i class="fa-solid fa-right-to-bracket"></i> Sign in to continue</a></div></div>';
        return;
      }

      await cfg.render(content);
    } catch (e) {
      console.error(e);
      content.innerHTML = '<div class="banner banner-warn"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Unable to load data.</strong><br>' +
        esc(e.message) + '<br><span class="tiny">The Table API may be unavailable. Reload the page or check the deployment.</span></div></div>';
    }
  },

  /** Debounced re-render helper */
  refresh(fn) { return fn(); }
};

/* ----------------------------- Audit log ----------------------------- */
async function audit(action, entity, entityId, detail) {
  const sess = Session.current() || {};
  try {
    await API.create('audit_log', {
      ts: Date.now(),
      actor: sess.name || 'System',
      action: action,
      entity: entity,
      entity_id: entityId || '',
      detail: detail || ''
    });
  } catch (e) { console.warn('audit failed', e.message); }
}

/* ----------------------------- Toast convenience ----------------------------- */
function ok(m) { UI.toast(m, 'ok'); }
function err(m) { UI.toast(m, 'err'); }
function info(m) { UI.toast(m, 'info'); }
