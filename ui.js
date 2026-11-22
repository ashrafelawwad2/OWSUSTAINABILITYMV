/* ==========================================================================
   AXIS Platform — Shared UI components
   DataTable, Gantt chart, exports (Excel/CSV/print), document uploads
   ========================================================================== */
'use strict';

/* ============================ DataTable ============================ */
/**
 * DataTable.render(mountEl, {
 *   columns: [{key, label, align, width, sortable, render(row), cls, sortValue(row)}],
 *   rows, pageSize, searchable, empty, onRowClick, footer(rows), dense, id
 * })
 */
const DataTable = {
  render(mount, cfg) {
    const st = Object.assign({
      page: 1, pageSize: cfg.pageSize || 15, sortKey: null, sortDir: 'asc', search: ''
    }, mount._dtState || {});

    function computeRows() {
      let rows = cfg.rows.slice();
      if (st.search) {
        const q = st.search.toLowerCase();
        rows = rows.filter(r => {
          const hay = cfg.columns.map(c => {
            const v = c.sortValue ? c.sortValue(r) : r[c.key];
            return v === null || v === undefined ? '' : String(v);
          }).join(' ');
          return hay.toLowerCase().indexOf(q) > -1;
        });
      }
      if (st.sortKey) {
        const col = cfg.columns.find(c => c.key === st.sortKey);
        if (col) {
          rows.sort((a, b) => {
            const av = col.sortValue ? col.sortValue(a) : a[col.key];
            const bv = col.sortValue ? col.sortValue(b) : b[col.key];
            const an = typeof av === 'number' ? av : parseFloat(av);
            const bn = typeof bv === 'number' ? bv : parseFloat(bv);
            let cmp;
            if (Number.isFinite(an) && Number.isFinite(bn) && String(av).trim() !== '' && String(bv).trim() !== '') cmp = an - bn;
            else cmp = String(av === null || av === undefined ? '' : av).localeCompare(String(bv === null || bv === undefined ? '' : bv));
            return st.sortDir === 'asc' ? cmp : -cmp;
          });
        }
      }
      return rows;
    }

    function paint() {
      const all = computeRows();
      const total = all.length;
      const pages = Math.max(1, Math.ceil(total / st.pageSize));
      if (st.page > pages) st.page = pages;
      const start = (st.page - 1) * st.pageSize;
      const rows = all.slice(start, start + st.pageSize);

      let html = '';
      if (cfg.toolbar !== false && cfg.searchable !== false) {
        html += '<div class="filter-bar" style="padding:10px 12px;border-bottom:1px solid var(--line-soft)">' +
          '<input type="search" placeholder="Search ' + esc(cfg.searchLabel || 'records') + '…" value="' + esc(st.search) + '" data-dt-search>' +
          '<span class="tiny muted" style="margin-left:auto">' + total + ' record' + (total === 1 ? '' : 's') + '</span>' +
          (cfg.toolbarExtra || '') + '</div>';
      }

      html += '<div class="table-wrap"><table class="data" id="' + (cfg.id || 'dt') + '"><thead><tr>';
      cfg.columns.forEach(c => {
        const sorted = st.sortKey === c.key;
        html += '<th class="' + (c.sortable === false ? '' : 'sortable') + (sorted ? ' sorted' : '') +
          '" data-sort="' + c.key + '" style="' + (c.width ? 'width:' + c.width + ';' : '') +
          (c.align === 'right' ? 'text-align:right;' : '') + '">' + esc(c.label) +
          (c.sortable === false ? '' : '<span class="sort-ind"><i class="fa-solid fa-' +
            (sorted ? (st.sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort') + '"></i></span>') + '</th>';
      });
      html += '</tr></thead><tbody>';

      if (!rows.length) {
        html += '<tr><td colspan="' + cfg.columns.length + '">' +
          UI.empty(cfg.emptyTitle || 'No records', cfg.empty || 'Adjust your filters or add a new record.', cfg.emptyIcon) +
          '</td></tr>';
      } else {
        rows.forEach((r, i) => {
          const clickable = !!cfg.onRowClick;
          html += '<tr class="' + (clickable ? 'clickable' : '') + '" data-idx="' + (start + i) + '">';
          cfg.columns.forEach(c => {
            const val = c.render ? c.render(r, i) : esc(r[c.key] === undefined || r[c.key] === null || r[c.key] === '' ? '—' : r[c.key]);
            html += '<td class="' + (c.align === 'right' ? 'num' : '') + ' ' + (c.cls || '') + '">' + val + '</td>';
          });
          html += '</tr>';
        });
      }
      html += '</tbody>';

      if (cfg.footer) {
        html += '<tfoot><tr>' + cfg.footer(all) + '</tr></tfoot>';
      }
      html += '</table></div>';

      if (pages > 1) {
        html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--line-soft);flex-wrap:wrap">' +
          '<span class="tiny muted">Showing ' + (start + 1) + '–' + Math.min(start + st.pageSize, total) + ' of ' + total + '</span>' +
          '<div style="margin-left:auto;display:flex;gap:5px">' +
          '<button class="btn btn-sm" data-dt-page="' + (st.page - 1) + '"' + (st.page === 1 ? ' disabled' : '') + '><i class="fa-solid fa-chevron-left"></i></button>';
        const from = Math.max(1, st.page - 2), to = Math.min(pages, from + 4);
        for (let pgn = from; pgn <= to; pgn++) {
          html += '<button class="btn btn-sm' + (pgn === st.page ? ' btn-primary' : '') + '" data-dt-page="' + pgn + '">' + pgn + '</button>';
        }
        html += '<button class="btn btn-sm" data-dt-page="' + (st.page + 1) + '"' + (st.page === pages ? ' disabled' : '') + '><i class="fa-solid fa-chevron-right"></i></button>' +
          '</div></div>';
      }

      mount.innerHTML = html;
      mount._dtState = st;
      mount._dtFiltered = all;

      const searchEl = mount.querySelector('[data-dt-search]');
      if (searchEl) {
        let t;
        searchEl.addEventListener('input', e => {
          clearTimeout(t);
          t = setTimeout(() => { st.search = e.target.value; st.page = 1; paint(); }, 220);
        });
      }
      mount.querySelectorAll('[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.getAttribute('data-sort');
          const col = cfg.columns.find(c => c.key === key);
          if (col && col.sortable === false) return;
          if (st.sortKey === key) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
          else { st.sortKey = key; st.sortDir = 'desc'; }
          paint();
        });
      });
      mount.querySelectorAll('[data-dt-page]').forEach(b => {
        b.addEventListener('click', () => {
          st.page = +b.getAttribute('data-dt-page');
          paint();
        });
      });
      if (cfg.onRowClick) {
        mount.querySelectorAll('tbody tr.clickable').forEach(tr => {
          tr.addEventListener('click', e => {
            if (e.target.closest('a,button,input')) return;
            const idx = +tr.getAttribute('data-idx');
            cfg.onRowClick(all[idx]);
          });
        });
      }
      if (cfg.afterPaint) cfg.afterPaint(mount, all);
    }

    paint();
    return { repaint: paint, getFiltered: () => mount._dtFiltered || [] };
  }
};

/* ============================ Gantt ============================ */
const Gantt = {
  /**
   * Gantt.render(mountEl, bars, {from, to})
   * bars: [{label, start, end, percent, status}]
   */
  render(mount, bars, opts) {
    const o = opts || {};
    if (!bars.length) { mount.innerHTML = UI.empty('No schedule items', 'Add milestones or tasks to view the timeline.', 'gantt-chart'); return; }

    const dates = [];
    bars.forEach(b => { if (b.start) dates.push(parseDate(b.start)); if (b.end) dates.push(parseDate(b.end)); });
    const valid = dates.filter(Boolean);
    if (!valid.length) { mount.innerHTML = UI.empty('No dates', 'Schedule items need start and end dates.', 'calendar'); return; }
    const min = o.from ? parseDate(o.from) : new Date(Math.min.apply(null, valid));
    const max = o.to ? parseDate(o.to) : new Date(Math.max.apply(null, valid));
    // pad to month boundaries
    const from = new Date(min.getFullYear(), min.getMonth(), 1);
    const to = new Date(max.getFullYear(), max.getMonth() + 1, 0);
    const span = Math.max(1, to - from);

    // month header cells
    const months = [];
    let cur = new Date(from);
    while (cur <= to) {
      months.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    const today = new Date();
    const todayPct = (today >= from && today <= to) ? ((today - from) / span) * 100 : null;

    let html = '<div class="gantt"><div class="gantt-inner">';
    html += '<div class="gantt-head"><div class="gh-l">Schedule item</div><div class="gantt-months">';
    months.forEach(m => { html += '<span>' + m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) + '</span>'; });
    html += '</div></div>';

    bars.forEach(b => {
      const s = parseDate(b.start), e = parseDate(b.end);
      if (!s || !e) {
        html += '<div class="gantt-row"><div class="gantt-lbl"><span class="g-muted tiny">' + esc(b.label) + '</span></div>' +
          '<div class="gantt-track"><span class="tiny muted" style="padding-left:10px">No dates set</span></div></div>';
        return;
      }
      const left = clamp(((s - from) / span) * 100, 0, 100);
      const width = clamp(((e - s) / span) * 100, 0.8, 100 - left);
      let cls = 'g-ns';
      if (b.status === 'Completed') cls = 'g-done';
      else if (b.status === 'Delayed' || b.status === 'Blocked' || b.status === 'At Risk') cls = 'g-late';
      else if (b.status === 'In Progress') cls = 'g-prog';
      const pct = clamp(num(b.percent), 0, 100);

      html += '<div class="gantt-row"><div class="gantt-lbl">' +
        '<span class="tl ' + (cls === 'g-done' ? 'tl-g' : cls === 'g-late' ? 'tl-r' : cls === 'g-prog' ? 'tl-a' : 'tl-s') + '"></span>' +
        '<span class="g-name" title="' + esc(b.label) + '">' + esc(b.label) + '</span></div>' +
        '<div class="gantt-track">' +
        (todayPct !== null ? '<div class="gtoday" style="left:' + todayPct + '%"></div>' : '') +
        '<div class="gbar ' + cls + '" style="left:' + left + '%;width:' + width + '%" title="' +
        esc(b.label) + ' · ' + Fmt.dateShort(b.start) + ' → ' + Fmt.dateShort(b.end) + ' · ' + Math.round(pct) + '%">' +
        '<span class="gfill" style="width:' + pct + '%"></span>' +
        '<span class="gtxt">' + Math.round(pct) + '%</span></div>' +
        '</div></div>';
    });

    html += '</div></div>';
    html += '<div class="legend"><span><i style="background:#16c79a"></i>Completed</span>' +
      '<span><i style="background:#3b9bff"></i>In progress</span>' +
      '<span><i style="background:#f2545b"></i>Delayed / blocked</span>' +
      '<span><i style="background:#556b8c"></i>Not started</span>' +
      '<span><i style="background:#f5a524"></i>Today</span></div>';
    mount.innerHTML = html;
  }
};

/* ============================ Export ============================ */
const Export = {
  /** Download CSV (Excel-compatible) */
  csv(filename, columns, rows) {
    const esc2 = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [columns.map(c => esc2(c.label)).join(',')];
    rows.forEach(r => lines.push(columns.map(c => esc2(c.value ? c.value(r) : r[c.key])).join(',')));
    this.download(filename, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  },

  /** Download a real .xls file using an HTML table (opens natively in Excel) */
  excel(filename, columns, rows, title) {
    let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">' +
      '<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}' +
      'th{background:#16c79a;color:#fff;border:1px solid #0c8f70;padding:5px 8px;text-align:left}' +
      'td{border:1px solid #cbd5e1;padding:4px 8px}m{font-weight:700}td.n{mso-number-format:General;text-align:right}' +
      'h1{font-family:Calibri,Arial;font-size:14pt;margin:0 0 4px}</style></head><body>';
    if (title) html += '<h1>' + esc(title) + '</h1>';
    html += '<table><thead><tr>' + columns.map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>';
    rows.forEach(r => {
      html += '<tr>' + columns.map(c => {
        const v = c.value ? c.value(r) : r[c.key];
        const isNum = typeof v === 'number';
        return '<td class="' + (isNum ? 'n' : '') + '">' + esc(v === null || v === undefined ? '' : v) + '</td>';
      }).join('') + '</tr>';
    });
    html += '</tbody></table></body></html>';
    this.download(filename, html, 'application/vnd.ms-excel');
  },

  download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    ok('Exported ' + filename);
  },

  /** Print / save-as-PDF with a report header */
  printReport(title, subtitle) {
    const head = document.createElement('div');
    head.className = 'print-only-head';
    head.style.cssText = 'display:none';
    head.innerHTML = '<div style="padding:0 0 14px;border-bottom:2px solid #1B2A6B;margin-bottom:16px">' +
      '<div style="font-size:10pt;letter-spacing:.14em;text-transform:uppercase;color:#1B2A6B;font-weight:700">' +
      esc(CFG.group) + ' · ' + esc(CFG.appFull) + '</div>' +
      '<div style="font-size:16pt;font-weight:700;margin-top:3px">' + esc(title) + '</div>' +
      '<div style="font-size:9.5pt;color:#555;margin-top:2px">' + esc(subtitle || '') +
      ' · Generated ' + new Date().toLocaleString('en-GB') + '</div></div>';
    document.querySelector('#content').insertBefore(head, document.querySelector('#content').firstChild);
    const st = document.createElement('style');
    st.textContent = '@media print{.print-only-head{display:block !important}}';
    document.head.appendChild(st);
    window.print();
    setTimeout(() => { head.remove(); st.remove(); }, 1200);
  },

  /** Excel upload template for bulk project registration */
  template() {
    const cols = [
      { key: 'code', label: 'Project Code' },
      { key: 'name', label: 'Project Name' },
      { key: 'category', label: 'Category (energy/sustainability/process/facilities/operations)' },
      { key: 'subcategory', label: 'Subcategory' },
      { key: 'company', label: 'Company' },
      { key: 'factory', label: 'Factory' },
      { key: 'department', label: 'Department' },
      { key: 'owner', label: 'Project Owner' },
      { key: 'sponsor', label: 'Sponsor' },
      { key: 'priority', label: 'Priority (Critical/High/Medium/Low)' },
      { key: 'status', label: 'Status' },
      { key: 'planned_start', label: 'Planned Start (YYYY-MM-DD)' },
      { key: 'planned_end', label: 'Planned End (YYYY-MM-DD)' },
      { key: 'capex_estimated', label: 'CAPEX Estimated' },
      { key: 'capex_approved', label: 'CAPEX Approved' },
      { key: 'savings_expected', label: 'Expected Annual Savings' },
      { key: 'savings_kwh_year', label: 'Electricity Savings kWh/yr' },
      { key: 'savings_gas_nm3_year', label: 'Gas Savings Nm3/yr' },
      { key: 'savings_water_m3_year', label: 'Water Savings m3/yr' },
      { key: 'savings_waste_t_year', label: 'Waste Reduction t/yr' },
      { key: 'mv_method', label: 'M&V Method (A/B/C/D)' },
      { key: 'description', label: 'Description' }
    ];
    const sample = [{
      code: 'OW-99', name: 'Example: Compressed air leak programme', category: 'energy',
      subcategory: 'Compressed air system optimisation', company: 'Oriental Weavers Carpets',
      factory: 'Ramses', department: 'Sustainability & Energy', owner: 'Ashraf Elawwad',
      sponsor: 'Maged Mamdouh', priority: 'High', status: 'Under Study',
      planned_start: '2027-01-01', planned_end: '2027-12-31', capex_estimated: 250000,
      capex_approved: 250000, savings_expected: 95000, savings_kwh_year: 800000,
      savings_gas_nm3_year: 0, savings_water_m3_year: 0, savings_waste_t_year: 0,
      mv_method: 'B', description: 'Replace this example row with your project data.'
    }];
    this.excel('OW_project_import_template.xls', cols, sample, 'Oriental Weavers Project Import Template — one project per row');
  },

  /** M&V monthly data template */
  mvTemplate() {
    const cols = [
      { key: 'project_code', label: 'Project Code' },
      { key: 'period', label: 'Period (YYYY-MM)' },
      { key: 'baseline_elec_kwh', label: 'Baseline Electricity kWh' },
      { key: 'elec_kwh', label: 'Actual Electricity kWh' },
      { key: 'baseline_gas_nm3', label: 'Baseline Gas Nm3' },
      { key: 'gas_nm3', label: 'Actual Gas Nm3' },
      { key: 'baseline_production_t', label: 'Baseline Production (t)' },
      { key: 'production_t', label: 'Actual Production (t)' },
      { key: 'hours', label: 'Operating Hours' },
      { key: 'baseline_water_m3', label: 'Baseline Water m3' },
      { key: 'water_m3', label: 'Actual Water m3' },
      { key: 'baseline_waste_t', label: 'Baseline Waste t' },
      { key: 'waste_t', label: 'Actual Waste t' },
      { key: 'notes', label: 'Notes' }
    ];
    this.excel('AXIS_mv_data_template.xls', cols, [{
      project_code: 'EN-01', period: '2026-11', baseline_elec_kwh: 480000, elec_kwh: 410000,
      baseline_gas_nm3: 0, gas_nm3: 0, baseline_production_t: 4200, production_t: 4310,
      hours: 700, baseline_water_m3: 0, water_m3: 0, baseline_waste_t: 0, waste_t: 0,
      notes: 'Replace this example row with measured data.'
    }], 'AXIS Monthly M&V Data Template');
  }
};

/* ============================ File uploads ============================ */
const Files = {
  /**
   * Upload a visitor file to the /files/{collection} endpoint
   * Returns the persisted reference record or throws.
   */
  async upload(file, collection) {
    const col = collection || 'mv-evidence';
    const res = await fetch('/files/' + col, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'Idempotency-Key': uuid()
      },
      body: file
    });

    if (res.status === 401) {
      let j = null; try { j = await res.json(); } catch (e) { /* ignore */ }
      throw new Error('Sign-in required to upload. ' + (j && j.login_url ? 'Open ' + j.login_url : ''));
    }
    if (res.status === 413) throw new Error('File too large — the maximum request size is 10 MB. Please compress or split the file.');
    if (res.status === 503) {
      let j = null; try { j = await res.json(); } catch (e) { /* ignore */ }
      if (j && j.error === 'files_not_enabled') throw new Error('File uploads are not enabled for this deployment yet. Uploads become available after the site is deployed with file access rules published.');
      throw new Error('Upload service temporarily unavailable — please try again shortly.');
    }
    if (res.status === 404) throw new Error('File uploads are not available on this host (preview / static hosting). Deploy the site with file access enabled to upload binaries.');
    if (!res.ok) throw new Error('Upload failed (' + res.status + ').');

    const ct = res.headers.get('content-type') || '';
    if (ct.indexOf('application/json') === -1) throw new Error('Unexpected upload response — the file service is not enabled on this host.');
    return res.json();
  },

  /** Build a modal document-manager for a project */
  manager(projectId, onDone) {
    const docs = projectDocs(projectId);
    const canEdit = Session.canEdit();

    let body = '';
    if (canEdit) {
      body += '<div class="dropzone" id="dz" tabindex="0" role="button" aria-label="Upload document">' +
        '<i class="fa-solid fa-cloud-arrow-up"></i>' +
        '<strong>Click to select a file</strong> or drag it here<br>' +
        '<span class="tiny">Feasibility studies, offers, contracts, invoices, utility bills, calibration certificates, measurement records, verification reports, photos · max 10 MB</span>' +
        '</div>' +
        '<div class="form-grid" style="margin-top:12px">' +
        '<div class="field"><label>Document type</label><select id="dType">' +
        ['Feasibility Study', 'Business Case', 'Technical Offer', 'Contract', 'Invoice', 'Utility Bill',
          'Calibration Certificate', 'Measurement Record', 'Verification Report', 'Commissioning Report', 'Photo', 'Other']
          .map(t => '<option>' + t + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Document date</label><input type="date" id="dDate" value="' + today() + '"></div>' +
        '</div><div id="upStatus" class="tiny muted"></div><div class="divider"></div>';
    }

    body += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">' +
      '<strong style="font-size:12.5px">Document register (' + docs.length + ')</strong></div>';

    if (!docs.length) {
      body += UI.empty('No documents', 'Upload supporting documents, measurement records, invoices and verification reports.', 'folder-open');
    } else {
      body += docs.map(d => {
        const hasFile = !!d.reference;
        const actions = hasFile
          ? '<a class="btn btn-sm" href="/files/' + esc(d.collection || 'mv-evidence') + '/' + esc(d.reference) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i></a>'
          : '<span class="tag">no file</span>';
        return '<div class="doc-item"><div class="doc-ico"><i class="fa-solid fa-file-lines"></i></div>' +
          '<div class="doc-main"><div class="doc-name">' + esc(d.name) + '</div>' +
          '<div class="doc-meta">' + esc(d.doc_type) + ' · ' + Fmt.date(d.doc_date) +
          (d.size ? ' · ' + Files.sizeLabel(d.size) : '') + (d.uploaded_by ? ' · ' + esc(d.uploaded_by) : '') + '</div></div>' +
          actions +
          (canEdit ? '<button class="btn btn-sm btn-icon btn-danger" data-del="' + d.id + '" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>' : '') +
          '</div>';
      }).join('');
    }

    const m = UI.modal({
      title: 'Documents & Evidence', body: body, size: 'wide',
      footer: '<span class="tiny muted" style="margin-right:auto">Binary files are stored in the deployment file store; metadata in the project database.</span>' +
        '<button class="btn" data-close>Close</button>'
    });

    if (!canEdit) return m;

    const dz = m.querySelector('#dz');
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    m.querySelector('.modal-body').appendChild(input);

    dz.addEventListener('click', () => input.click());
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files.length) doUpload(e.dataTransfer.files[0]); });
    input.addEventListener('change', () => { if (input.files.length) doUpload(input.files[0]); });

    async function doUpload(file) {
      const status = m.querySelector('#upStatus');
      const type = m.querySelector('#dType').value;
      const dDate = m.querySelector('#dDate').value;
      status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading ' + esc(file.name) + '…';
      try {
        const rec = await Files.upload(file, 'mv-evidence');
        await API.create('documents', {
          project_id: projectId,
          name: file.name,
          doc_type: type,
          doc_date: dDate,
          reference: rec.id,
          content_type: rec.content_type || file.type,
          size: rec.size || file.size,
          collection: 'mv-evidence',
          uploaded_by: (Session.current() || {}).name || 'System',
          notes: 'Checksum ' + (rec.checksum || '—')
        });
        await audit('Upload', 'document', projectId, file.name + ' (' + type + ')');
        ok('Uploaded ' + file.name);
        m._close();
        if (onDone) onDone();
      } catch (e) {
        status.innerHTML = '<span style="color:#ff9298"><i class="fa-solid fa-circle-exclamation"></i> ' + esc(e.message) + '</span>';
        err(e.message);
      }
    }

    m.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-del');
        UI.confirm('Delete this document record? The stored binary file is not removed automatically.', async () => {
          try {
            await API.remove('documents', id);
            await audit('Delete', 'document', id, 'Document record removed');
            ok('Document deleted');
            m._close();
            if (onDone) onDone();
          } catch (e) { err('Delete failed: ' + e.message); }
        }, true);
      });
    });

    return m;
  },

  sizeLabel(b) {
    const n = num(b);
    if (!n) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
};

/* ============================ Simple form builder ============================ */
/**
 * Form.build(config) -> html string
 * config: [{name,label,type,options,value,span,required,hint,min,max,step,rows}]
 */
const Form = {
  build(fields, values) {
    const v = values || {};
    let html = '<div class="form-grid">';
    fields.forEach(f => {
      const val = v[f.name] !== undefined && v[f.name] !== null ? v[f.name] : (f.value !== undefined ? f.value : '');
      const span = f.span === 2 ? ' span2' : f.span === 3 ? ' span3' : '';
      html += '<div class="field' + span + '">';
      if (f.type !== 'check') html += '<label for="f_' + f.name + '">' + esc(f.label) + (f.required ? ' *' : '') + '</label>';
      if (f.type === 'select') {
        html += '<select id="f_' + f.name + '" name="' + f.name + '"' + (f.required ? ' required' : '') + '>' +
          (f.placeholder ? '<option value="">' + esc(f.placeholder) + '</option>' : '') +
          f.options.map(o => {
            const ov = (typeof o === 'object') ? o.value : o;
            const ol = (typeof o === 'object') ? o.label : o;
            return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>';
          }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        html += '<textarea id="f_' + f.name + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' +
          (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>' + esc(val) + '</textarea>';
      } else if (f.type === 'check') {
        html += '<label class="check" style="margin-top:22px"><input type="checkbox" id="f_' + f.name + '" name="' + f.name + '"' +
          (val ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
      } else {
        html += '<input type="' + (f.type || 'text') + '" id="f_' + f.name + '" name="' + f.name + '" value="' + esc(val) + '"' +
          (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
          (f.min !== undefined ? ' min="' + f.min + '"' : '') +
          (f.max !== undefined ? ' max="' + f.max + '"' : '') +
          (f.step !== undefined ? ' step="' + f.step + '"' : '') +
          (f.required ? ' required' : '') + (f.readonly ? ' readonly' : '') + '>';
      }
      if (f.hint) html += '<div class="hint">' + esc(f.hint) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  },

  read(root, fields) {
    const out = {};
    fields.forEach(f => {
      const el = root.querySelector('#f_' + f.name) || root.querySelector('[name="' + f.name + '"]');
      if (!el) return;
      if (f.type === 'check') out[f.name] = el.checked;
      else if (f.type === 'number') out[f.name] = el.value === '' ? 0 : parseFloat(el.value);
      else out[f.name] = el.value;
    });
    return out;
  },

  validate(root, fields) {
    const missing = [];
    fields.forEach(f => {
      if (!f.required) return;
      const el = root.querySelector('#f_' + f.name);
      if (el && !String(el.value || '').trim()) missing.push(f.label);
    });
    return missing;
  }
};

/* ============================ Menu / dropdown helper ============================ */
function menuButton(btn, items) {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const existing = document.querySelector('.pop-menu');
    if (existing) existing.remove();
    const r = btn.getBoundingClientRect();
    const m = document.createElement('div');
    m.className = 'pop-menu';
    m.style.cssText = 'position:fixed;z-index:300;background:#1b2942;border:1px solid var(--line);border-radius:10px;' +
      'box-shadow:0 12px 34px rgba(0,0,0,.5);padding:5px;min-width:190px;right:' + (window.innerWidth - r.right) + 'px;top:' + (r.bottom + 6) + 'px';
    m.innerHTML = items.map((it, i) => it.sep
      ? '<div style="height:1px;background:var(--line-soft);margin:4px 2px"></div>'
      : '<button data-mi="' + i + '" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:0;background:transparent;' +
        'color:var(--text-dim);font-size:12.4px;text-align:left;border-radius:6px;cursor:pointer">' +
        (it.icon ? '<i class="fa-solid fa-' + it.icon + '" style="width:14px;font-size:11px"></i>' : '') + esc(it.label) + '</button>').join('');
    document.body.appendChild(m);
    m.querySelectorAll('[data-mi]').forEach(b => {
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(255,255,255,.07)'; b.style.color = '#fff'; });
      b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; b.style.color = 'var(--text-dim)'; });
      b.addEventListener('click', () => {
        const it = items[+b.getAttribute('data-mi')];
        m.remove();
        if (it.onClick) it.onClick();
      });
    });
    const off = ev => {
      if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); }
    };
    setTimeout(() => document.addEventListener('click', off), 0);
  });
}
