/* ==========================================================================
   AXIS Platform — Project Portfolio
   Searchable, filterable, drill-down table of every registered project
   ========================================================================== */
'use strict';

(function () {
  const state = {
    category: '', company: '', factory: '', status: '', priority: '',
    verification: '', attention: '', search: '', view: 'table'
  };

  App.boot({
    page: 'portfolio',
    title: 'Project Portfolio',
    crumb: 'All registered projects and initiatives',
    render: paint
  });

  function paint(root) {
    const P = portfolio({
      category: state.category, company: state.company, factory: state.factory,
      status: state.status, priority: state.priority, search: state.search
    });
    let rows = P.rows;
    if (state.verification) rows = rows.filter(r => r.p.verification_status === state.verification);
    if (state.attention === 'yes') rows = rows.filter(r => r.needsAttention);
    if (state.attention === 'delayed') rows = rows.filter(r => r.delayed);

    const t = P.totals;
    const companies = uniq(S.projects.map(p => p.company)).sort();
    const factories = uniq(S.projects.filter(p => !state.company || p.company === state.company).map(p => p.factory)).sort();
    const canEdit = Session.canEdit();

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Project Portfolio</h2>
          <div class="sub">${rows.length} of ${S.projects.length} projects shown ·
            ${Fmt.moneyFull(sum(rows, r => num(r.p.capex_approved)))} approved investment ·
            ${Fmt.moneyFull(sum(rows, r => r.mv.annual.cost))} measured annual savings</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="expBtn"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button class="btn btn-sm" id="csvBtn"><i class="fa-solid fa-file-csv"></i> CSV</button>
          ${canEdit ? '<a class="btn btn-sm btn-primary" href="register.html"><i class="fa-solid fa-plus"></i> New project</a>' : ''}
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:14px">
        <div class="filter-bar">
          <input type="search" id="fSearch" placeholder="Search code, name, owner, facility…" value="${esc(state.search)}">
          <select id="fCat"><option value="">All categories</option>
            ${Object.keys(CATEGORIES).map(k => `<option value="${k}"${state.category === k ? ' selected' : ''}>${esc(CATEGORIES[k].label)}</option>`).join('')}</select>
          <select id="fComp"><option value="">All companies</option>
            ${companies.map(c => `<option value="${esc(c)}"${state.company === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select id="fFac"><option value="">All facilities</option>
            ${factories.map(f => `<option value="${esc(f)}"${state.factory === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
          <select id="fStatus"><option value="">All statuses</option>
            ${Object.keys(STATUS_META).map(s => `<option value="${s}"${state.status === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <select id="fPri"><option value="">All priorities</option>
            ${['Critical', 'High', 'Medium', 'Low'].map(p => `<option value="${p}"${state.priority === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>
          <select id="fVer"><option value="">Any verification</option>
            ${Object.keys(VERIFY_META).map(v => `<option value="${v}"${state.verification === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>
          <select id="fAtt"><option value="">All projects</option>
            <option value="yes"${state.attention === 'yes' ? ' selected' : ''}>Needs attention</option>
            <option value="delayed"${state.attention === 'delayed' ? ' selected' : ''}>Delayed only</option></select>
          <button class="btn btn-sm btn-ghost" id="resetBtn"><i class="fa-solid fa-rotate-left"></i> Reset</button>
          <div style="margin-left:auto" class="btn-group" id="viewToggle">
            <button data-v="table" class="${state.view === 'table' ? 'on' : ''}"><i class="fa-solid fa-table-list"></i> Table</button>
            <button data-v="cards" class="${state.view === 'cards' ? 'on' : ''}"><i class="fa-solid fa-table-cells-large"></i> Cards</button>
          </div>
        </div>
      </div>

      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'In selection', value: Fmt.int(rows.length), icon: 'filter', accent: '#3b9bff',
          foot: `${Fmt.money(sum(rows, r => r.fin.capex))} committed CAPEX` })}
        ${UI.kpi({ label: 'Avg progress', value: Fmt.pct(rows.length ? avg(rows, r => num(r.p.progress)) : 0, 0), icon: 'bars-progress', accent: '#16c79a',
          foot: `${rows.filter(r => r.p.status === 'Completed').length} completed` })}
        ${UI.kpi({ label: 'Delayed', value: Fmt.int(rows.filter(r => r.delayed).length), icon: 'clock-rotate-left', accent: '#f2545b',
          foot: 'Past planned completion' })}
        ${UI.kpi({ label: 'Measured savings', value: Fmt.money(sum(rows, r => r.mv.annual.cost)), icon: 'chart-line', accent: '#f5a524',
          foot: `vs ${Fmt.money(sum(rows, r => num(r.p.savings_expected)))} expected` })}
        ${UI.kpi({ label: 'Verified savings', value: Fmt.money(sum(rows, r => r.mv.verified.cost)), icon: 'certificate', accent: '#9b7bff',
          foot: `${rows.filter(r => r.p.verification_status === 'Verified').length} projects verified` })}
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Registered projects</h3>
          <span class="ch-sub" id="rowCount">${rows.length} records</span>
          <div class="ch-actions">
            <span class="tiny muted">Click any row to open the project profile</span>
          </div>
        </div>
        ${state.view === 'table' ? '<div id="tbl"></div>' : '<div class="card-body" id="cards"></div>'}
      </div>
    `;

    /* ---------- filters ---------- */
    const bind = (id, key, repaint) => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', e => { state[key] = e.target.value; paint(root); });
    };
    bind('fCat', 'category'); bind('fComp', 'company'); bind('fFac', 'factory');
    bind('fStatus', 'status'); bind('fPri', 'priority'); bind('fVer', 'verification'); bind('fAtt', 'attention');

    const searchEl = $('#fSearch');
    let timer;
    searchEl.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.search = e.target.value; paint(root); }, 320);
    });
    $('#resetBtn').addEventListener('click', () => {
      Object.assign(state, { category: '', company: '', factory: '', status: '', priority: '', verification: '', attention: '', search: '' });
      paint(root);
    });
    $$('#viewToggle button').forEach(b => b.addEventListener('click', () => {
      state.view = b.getAttribute('data-v');
      paint(root);
    }));

    /* ---------- exports ---------- */
    const exportCols = [
      { key: 'code', label: 'Project Code' }, { key: 'name', label: 'Project Name' },
      { key: 'category', label: 'Category' }, { key: 'subcategory', label: 'Subcategory' },
      { key: 'company', label: 'Company' }, { key: 'factory', label: 'Facility' },
      { key: 'department', label: 'Department' }, { key: 'owner', label: 'Owner' },
      { key: 'sponsor', label: 'Sponsor' }, { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' }, { key: 'progress', label: 'Progress %' },
      { key: 'planned_start', label: 'Planned Start' }, { key: 'planned_end', label: 'Planned End' },
      { key: 'capexApproved', label: 'CAPEX Approved' }, { key: 'capexActual', label: 'CAPEX Actual' },
      { key: 'savingsExpected', label: 'Expected Savings/yr' },
      { key: 'savingsMeasured', label: 'Measured Savings/yr' },
      { key: 'savingsVerified', label: 'Verified Savings/yr' },
      { key: 'achievement', label: 'Achievement %' },
      { key: 'energyMwh', label: 'Energy Saved MWh/yr' },
      { key: 'ghg', label: 'GHG Avoided tCO2e/yr' },
      { key: 'verification', label: 'Verification Status' },
      { key: 'mvMethod', label: 'M&V Method' }
    ];
    const exportRows = () => rows.map(r => ({
      code: r.p.code, name: r.p.name,
      category: CATEGORIES[r.p.category] ? CATEGORIES[r.p.category].label : r.p.category,
      subcategory: r.p.subcategory, company: r.p.company, factory: r.p.factory,
      department: r.p.department, owner: r.p.owner, sponsor: r.p.sponsor,
      priority: r.p.priority, status: r.p.status, progress: num(r.p.progress),
      planned_start: r.p.planned_start, planned_end: r.p.planned_end,
      capexApproved: num(r.p.capex_approved), capexActual: num(r.p.capex_actual),
      savingsExpected: num(r.p.savings_expected),
      savingsMeasured: Math.round(r.mv.annual.cost),
      savingsVerified: Math.round(r.mv.verified.cost),
      achievement: r.mv.achievement === null ? '' : Math.round(r.mv.achievement),
      energyMwh: Math.round(r.mv.annual.energyMwh),
      ghg: Math.round(r.mv.annual.ghg),
      verification: r.p.verification_status, mvMethod: r.p.mv_method
    }));
    $('#expBtn').addEventListener('click', () => Export.excel('AXIS_portfolio_' + today() + '.xls', exportCols, exportRows(), 'AXIS Project Portfolio'));
    $('#csvBtn').addEventListener('click', () => Export.csv('AXIS_portfolio_' + today() + '.csv', exportCols, exportRows()));

    /* ---------- views ---------- */
    if (state.view === 'table') renderTable(rows, root);
    else renderCards(rows, root);
  }

  function renderTable(rows, root) {
    DataTable.render($('#tbl'), {
      pageSize: 20,
      searchable: false,
      rows: rows,
      id: 'portfolioTable',
      onRowClick: r => { location.href = 'project.html?id=' + encodeURIComponent(r.p.id); },
      columns: [
        {
          key: 'code', label: 'Code', width: '92px',
          render: r => `<strong class="mono">${esc(r.p.code)}</strong>`
        },
        {
          key: 'name', label: 'Project',
          render: r => `<div style="min-width:230px"><div class="strong" style="font-weight:600">${esc(r.p.name)}</div>
            <div class="tiny muted">${esc(r.p.subcategory || '')} · ${esc(r.p.owner || 'unassigned')}</div></div>`,
          sortValue: r => r.p.name
        },
        {
          key: 'factory', label: 'Facility',
          render: r => `<div class="tiny">${esc(r.p.factory)}</div><div class="tiny muted">${esc(r.p.company)}</div>`
        },
        { key: 'status', label: 'Status', render: r => UI.statusBadge(r.p.status) },
        {
          key: 'progress', label: 'Progress', width: '128px',
          render: r => UI.prog(r.p.progress, r.delayed ? 'bad' : ''),
          sortValue: r => num(r.p.progress)
        },
        {
          key: 'capex', label: 'CAPEX', align: 'right',
          render: r => Fmt.money(r.fin.capex),
          sortValue: r => r.fin.capex
        },
        {
          key: 'savings', label: 'Measured /yr', align: 'right',
          render: r => r.mv.hasData ? `<strong>${Fmt.money(r.mv.annual.cost)}</strong>` : '<span class="muted">—</span>',
          sortValue: r => r.mv.annual.cost
        },
        {
          key: 'achieve', label: 'Achieve', align: 'right',
          render: r => r.mv.achievement === null ? '<span class="muted">—</span>' :
            `<span class="badge ${r.mv.achievement >= 95 ? 'b-green' : r.mv.achievement >= 80 ? 'b-amber' : 'b-red'}">${Fmt.pct(r.mv.achievement, 0)}</span>`,
          sortValue: r => r.mv.achievement === null ? -1 : r.mv.achievement
        },
        {
          key: 'payback', label: 'Payback', align: 'right',
          render: r => r.fin.payback ? Fmt.dec(r.fin.payback, 1) + 'y' : '<span class="muted">—</span>',
          sortValue: r => r.fin.payback || 999
        },
        {
          key: 'verif', label: 'Verification',
          render: r => UI.verifyBadge(r.p.verification_status)
        },
        {
          key: 'flags', label: 'Flags', width: '84px', sortable: false,
          render: r => {
            const f = [];
            if (r.delayed) f.push('<span class="badge b-red" title="Delayed">late</span>');
            if (r.openRisks.filter(x => riskScore(x) >= 15).length) f.push('<span class="badge b-amber" title="Critical risk">risk</span>');
            if (r.p.priority === 'Critical') f.push('<span class="badge b-purple">P1</span>');
            return f.join(' ') || '<span class="muted">—</span>';
          }
        }
      ],
      footer: all => `
        <td><strong>Total (${all.length})</strong></td><td></td><td></td><td></td><td></td>
        <td class="num">${Fmt.money(sum(all, r => r.fin.capex))}</td>
        <td class="num">${Fmt.money(sum(all, r => r.mv.annual.cost))}</td>
        <td class="num">${sum(all, r => num(r.p.savings_expected)) > 0
          ? Fmt.pct(sum(all, r => r.mv.annual.cost) / sum(all, r => num(r.p.savings_expected)) * 100, 0) : '—'}</td>
        <td class="num">${Fmt.money(sum(all, r => r.mv.verified.cost))}</td>
        <td colspan="3"></td>`,
      emptyTitle: 'No projects match these filters',
      empty: 'Adjust the category, facility or status filters to widen the selection.',
      emptyIcon: 'filter-circle-xmark'
    });
  }

  function renderCards(rows, root) {
    const host = $('#cards');
    if (!rows.length) {
      host.innerHTML = UI.empty('No projects match these filters', 'Adjust the filters to widen the selection.', 'filter-circle-xmark');
      return;
    }
    host.innerHTML = '<div class="grid g3">' + rows.map(r => `
      <a class="card" href="project.html?id=${esc(r.p.id)}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column">
        <div class="card-body" style="flex:1">
          <div style="display:flex;align-items:start;gap:8px;margin-bottom:8px">
            <span class="pill-ico" style="background:${(CATEGORIES[r.p.category] || {}).color || '#64748b'}22;color:${(CATEGORIES[r.p.category] || {}).color || '#64748b'}">
              <i class="fa-solid fa-${(CATEGORIES[r.p.category] || {}).icon || 'folder'}"></i></span>
            <div style="flex:1;min-width:0">
              <div class="tiny mono muted">${esc(r.p.code)}</div>
              <div style="font-weight:650;font-size:13px;line-height:1.35;margin-top:1px">${esc(r.p.name)}</div>
            </div>
          </div>
          <div class="tiny muted" style="margin-bottom:9px">${esc(r.p.factory)} · ${esc(r.p.owner)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
            ${UI.statusBadge(r.p.status)}
            ${r.delayed ? '<span class="badge b-red">Delayed</span>' : ''}
            ${r.p.priority === 'Critical' ? '<span class="badge b-purple">Critical</span>' : ''}
          </div>
          ${UI.prog(r.p.progress, r.delayed ? 'bad' : '')}
          <div class="divider" style="margin:10px 0"></div>
          <div class="stat-line"><span class="k">CAPEX</span><span class="v">${Fmt.money(r.fin.capex)}</span></div>
          <div class="stat-line"><span class="k">Measured savings</span><span class="v">${r.mv.hasData ? Fmt.money(r.mv.annual.cost) : '—'}</span></div>
          <div class="stat-line"><span class="k">Achievement</span><span class="v">${r.mv.achievement === null ? '—' : Fmt.pct(r.mv.achievement, 0)}</span></div>
        </div>
      </a>`).join('') + '</div>';
  }
})();
