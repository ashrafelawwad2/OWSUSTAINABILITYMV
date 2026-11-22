/* ==========================================================================
   AXIS Platform — Reports & Analytics
   Automated executive, portfolio, M&V, sustainability and comparison reports
   ========================================================================== */
'use strict';

(function () {
  const state = { active: null };

  App.boot({
    page: 'reports',
    title: 'Reports & Analytics',
    crumb: 'Automated reporting and analysis',
    render: paint
  });

  const REPORTS = [
    {
      id: 'exec',
      name: 'Executive Monthly Performance Report',
      icon: 'gauge-high',
      desc: 'Consolidated group position: portfolio, financial, operational and sustainability KPIs with trends and attention items.',
      freq: 'Monthly',
      build: buildExec
    },
    {
      id: 'portfolio',
      name: 'Quarterly Project Portfolio Report',
      icon: 'layer-group',
      desc: 'Every project with status, progress, budget utilisation and schedule variance for portfolio governance review.',
      freq: 'Quarterly',
      build: buildPortfolio
    },
    {
      id: 'mv',
      name: 'M&V Performance & Verification Report',
      icon: 'chart-line',
      desc: 'Baseline, expected, measured and verified savings per project with achievement and verification status.',
      freq: 'Monthly',
      build: buildMv
    },
    {
      id: 'sustain',
      name: 'Energy & Sustainability Report',
      icon: 'leaf',
      desc: 'Energy savings by stream, renewable generation, GHG avoided, water and waste performance.',
      freq: 'Quarterly',
      build: buildSustain
    },
    {
      id: 'finance',
      name: 'Financial Savings & Investment Report',
      icon: 'coins',
      desc: 'CAPEX approved versus actual, expected versus measured savings, payback, NPV and IRR by project and company.',
      freq: 'Quarterly',
      build: buildFinance
    },
    {
      id: 'progress',
      name: 'Implementation Progress Report',
      icon: 'person-digging',
      desc: 'Milestone and task delivery, overdue activities, blocked items, budget overruns and corrective actions.',
      freq: 'Monthly',
      build: buildProgress
    },
    {
      id: 'factory',
      name: 'Factory Comparison Report',
      icon: 'industry',
      desc: 'Facility ranking on savings, investment efficiency, achievement, delays and risk exposure.',
      freq: 'Quarterly',
      build: buildFactory
    },
    {
      id: 'annual',
      name: 'Annual Project Performance Review',
      icon: 'calendar',
      desc: 'Year-to-date actuals against approved targets for every project, including verified benefit realisation.',
      freq: 'Annual',
      build: buildAnnual
    }
  ];

  function paint(root) {
    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Reports &amp; Analytics</h2>
          <div class="sub">Every report is generated live from the project database —
            no stored snapshots, so figures always reconcile with the dashboards</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="printAll"><i class="fa-solid fa-print"></i> Print view</button>
        </div>
      </div>

      <div class="grid g4" id="reportGrid"></div>
      <div id="reportHost" style="margin-top:16px"></div>
    `;

    $('#reportGrid').innerHTML = REPORTS.map(r => `
      <div class="card" style="display:flex;flex-direction:column">
        <div class="card-body" style="flex:1">
          <div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:8px">
            <span class="pill-ico"><i class="fa-solid fa-${r.icon}"></i></span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:650;font-size:12.8px;line-height:1.35">${esc(r.name)}</div>
              <span class="tag" style="margin-top:4px">${esc(r.freq)}</span>
            </div>
          </div>
          <p class="tiny muted" style="line-height:1.55;margin-bottom:11px">${esc(r.desc)}</p>
        </div>
        <div style="padding:0 15px 14px;display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" data-gen="${r.id}" style="flex:1"><i class="fa-solid fa-play"></i> Generate</button>
          <button class="btn btn-sm" data-xls="${r.id}" aria-label="Export Excel"><i class="fa-solid fa-file-excel"></i></button>
        </div>
      </div>`).join('');

    $$('[data-gen]').forEach(b => b.addEventListener('click', () => {
      state.active = b.getAttribute('data-gen');
      renderReport();
    }));
    $$('[data-xls]').forEach(b => b.addEventListener('click', () => {
      exportReport(b.getAttribute('data-xls'));
    }));
    $('#printAll').addEventListener('click', () => {
      if (!state.active) { info('Generate a report first, then print it.'); return; }
      const r = REPORTS.find(x => x.id === state.active);
      Export.printReport(r.name, CFG.group + ' · ' + Fmt.date(today()));
    });

    state.active = 'exec';
    renderReport();
  }

  function renderReport() {
    const r = REPORTS.find(x => x.id === state.active);
    if (!r) return;
    const host = $('#reportHost');
    host.innerHTML = '<div class="card"><div class="card-head"><h3>' + esc(r.name) + '</h3>' +
      '<span class="ch-sub">Generated ' + new Date().toLocaleString('en-GB') + ' · live data</span>' +
      '<div class="ch-actions">' +
      '<button class="btn btn-sm" id="rPrint"><i class="fa-solid fa-print"></i> Print / PDF</button>' +
      '<button class="btn btn-sm" id="rXls"><i class="fa-solid fa-file-excel"></i> Excel</button></div></div>' +
      '<div class="card-body" id="reportBody"></div></div>';
    $('#rPrint').addEventListener('click', () => Export.printReport(r.name, CFG.group + ' · ' + Fmt.date(today())));
    $('#rXls').addEventListener('click', () => exportReport(r.id));
    r.build($('#reportBody'));
  }

  /* ---------------------------- builders ---------------------------- */
  function kpiStrip(host, items) {
    return '<div class="grid g4" style="margin-bottom:16px">' + items.map(i =>
      UI.kpi({ label: i[0], value: i[1], accent: i[3] || '#16c79a', unit: i[2] || '' })).join('') + '</div>';
  }

  function tableBlock(host, title, columns, rows) {
    const id = 'rt_' + Math.random().toString(36).slice(2, 8);
    host.insertAdjacentHTML('beforeend',
      '<div class="section-title">' + esc(title) + '</div><div class="card"><div id="' + id + '"></div></div>');
    DataTable.render(document.getElementById(id), {
      columns: columns, rows: rows, pageSize: 100, searchable: false, toolbar: false
    });
  }

  function buildExec(host) {
    const P = portfolio({});
    const t = P.totals;
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:4px">Group Performance Summary</h3>' +
      '<p class="tiny muted" style="margin-bottom:14px">Reporting period ' + Fmt.period(new Date().toISOString().slice(0, 7)) +
      ' · ' + t.count + ' projects · ' + uniq(P.rows.map(r => r.p.factory)).length + ' facilities</p>' +
      kpiStrip(host, [
        ['Total projects', t.count, '', '#3b9bff'],
        ['Under implementation', t.inProgress, '', '#f5a524'],
        ['Completed', t.completed, '', '#16c79a'],
        ['Delayed', t.delayed, '', '#f2545b'],
        ['Approved CAPEX', Fmt.money(t.capexApproved), '', '#3b9bff'],
        ['Actual expenditure', Fmt.money(t.capexActual), '', '#0ea5e9'],
        ['Measured savings', Fmt.money(t.savingsActual) + '/yr', '', '#16c79a'],
        ['Verified savings', Fmt.money(t.savingsVerified) + '/yr', '', '#9b7bff'],
        ['Energy saved', Fmt.int(t.energySavedMwh), 'MWh/yr', '0ea5e9'],
        ['GHG avoided', Fmt.int(t.ghgAvoided), 'tCO2e/yr', '#16c79a'],
        ['Water saved', Fmt.int(t.waterM3), 'm3/yr', '#3b9bff'],
        ['Achievement', Fmt.pct(t.achievement, 0), '', t.achievement >= 95 ? '#16c79a' : '#f5a524']
      ]) +
      '<div class="section-title">Projects requiring attention</div><div id="execAtt"></div>';

    DataTable.render($('#execAtt'), {
      pageSize: 20, searchable: false, toolbar: false,
      rows: P.rows.filter(r => r.needsAttention).sort((a, b) => num(b.fin.capex) - num(a.fin.capex)),
      columns: [
        { key: 'code', label: 'Code', render: r => '<span class="mono">' + esc(r.p.code) + '</span>' },
        { key: 'name', label: 'Project', render: r => esc(r.p.name) },
        { key: 'factory', label: 'Facility', render: r => '<span class="tiny">' + esc(r.p.factory) + '</span>' },
        { key: 'status', label: 'Status', render: r => UI.statusBadge(r.p.status) },
        { key: 'progress', label: 'Progress', render: r => Fmt.pct(r.p.progress, 0) },
        { key: 'issue', label: 'Reason', render: r => {
            const why = [];
            if (r.delayed) why.push('delayed');
            if (r.openRisks.filter(x => riskScore(x) >= 15).length) why.push('critical risk');
            if (r.mv.achievement !== null && r.mv.achievement < 80) why.push('below target');
            if (num(r.p.capex_actual) > num(r.p.capex_approved) && num(r.p.capex_approved) > 0) why.push('budget overrun');
            return '<span class="tiny" style="color:#ffc768">' + esc(why.join(', ') || 'monitor') + '</span>';
          } }
      ]
    });
  }

  function buildPortfolio(host) {
    const P = portfolio({});
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:14px">Portfolio Register — ' + P.rows.length + ' projects</h3>';
    tableBlock(host, 'All projects', [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'cat', label: 'Category' }, { key: 'company', label: 'Company' },
      { key: 'factory', label: 'Facility' }, { key: 'owner', label: 'Owner' },
      { key: 'status', label: 'Status' }, { key: 'prog', label: 'Progress %' },
      { key: 'capex', label: 'CAPEX Actual' }, { key: 'budget', label: 'Utilisation %' },
      { key: 'end', label: 'Planned End' }, { key: 'flag', label: 'Schedule' }
    ], P.rows.map(r => ({
      code: r.p.code, name: r.p.name,
      cat: CATEGORIES[r.p.category] ? CATEGORIES[r.p.category].short : r.p.category,
      company: r.p.company, factory: r.p.factory, owner: r.p.owner,
      status: r.p.status, prog: Math.round(num(r.p.progress)),
      capex: Math.round(r.fin.capex),
      budget: num(r.p.capex_approved) > 0 ? Math.round(num(r.p.capex_actual) / num(r.p.capex_approved) * 100) : '',
      end: r.p.planned_end, flag: r.delayed ? 'DELAYED' : 'On track'
    })));
  }

  function buildMv(host) {
    const P = portfolio({});
    const rows = P.rows.filter(r => r.p.mv_method || r.mv.hasData);
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:14px">M&V Performance and Verification</h3>';
    tableBlock(host, 'Savings verification by project', [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'method', label: 'IPMVP' }, { key: 'periods', label: 'Periods' },
      { key: 'expected', label: 'Expected /yr' }, { key: 'measured', label: 'Measured /yr' },
      { key: 'verified', label: 'Verified /yr' }, { key: 'ach', label: 'Achievement %' },
      { key: 'energy', label: 'MWh/yr' }, { key: 'ghg', label: 'tCO2e/yr' },
      { key: 'status', label: 'Verification' }
    ], rows.map(r => ({
      code: r.p.code, name: r.p.name, method: r.p.mv_method || '',
      periods: r.mv.months, expected: num(r.p.savings_expected),
      measured: Math.round(r.mv.annual.cost), verified: Math.round(r.mv.verified.cost),
      ach: r.mv.achievement === null ? '' : Math.round(r.mv.achievement),
      energy: Math.round(r.mv.annual.energyMwh), ghg: Math.round(r.mv.annual.ghg),
      status: r.p.verification_status
    })));
  }

  function buildSustain(host) {
    const P = portfolio({});
    const t = P.totals;
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:4px">Energy &amp; Sustainability Performance</h3>' +
      '<p class="tiny muted" style="margin-bottom:14px">Measured environmental benefits from verified project performance</p>' +
      kpiStrip(host, [
        ['Electricity saved', Fmt.int(t.elecKwh), 'kWh/yr', '#f5a524'],
        ['Gas saved', Fmt.int(t.gasNm3), 'Nm3/yr', '#f2545b'],
        ['Total energy', Fmt.int(t.energySavedMwh), 'MWh/yr', '#0ea5e9'],
        ['Renewable', Fmt.int(t.renewableMwh), 'MWh/yr', '#9b7bff'],
        ['GHG avoided', Fmt.int(t.ghgAvoided), 'tCO2e/yr', '#16c79a'],
        ['GHG verified', Fmt.int(t.ghgAvoidedVerified), 'tCO2e/yr', '#4fd1c5'],
        ['Water saved', Fmt.int(t.waterM3), 'm3/yr', '#3b9bff'],
        ['Waste reduced', Fmt.int(t.wasteT), 't/yr', '#16c79a']
      ]);
    tableBlock(host, 'Environmental performance by project', [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'factory', label: 'Facility' }, { key: 'elec', label: 'kWh/yr' },
      { key: 'gas', label: 'Nm3/yr' }, { key: 'energy', label: 'MWh/yr' },
      { key: 'ghg', label: 'tCO2e/yr' }, { key: 'water', label: 'm3/yr' },
      { key: 'waste', label: 't/yr' }, { key: 'renew', label: 'RE MWh/yr' }
    ], P.rows.filter(r => r.mv.hasData).map(r => ({
      code: r.p.code, name: r.p.name, factory: r.p.factory,
      elec: Math.round(r.mv.annual.elec), gas: Math.round(r.mv.annual.gas),
      energy: Math.round(r.mv.annual.energyMwh), ghg: Math.round(r.mv.annual.ghg),
      water: Math.round(r.mv.annual.water), waste: Math.round(r.mv.annual.waste),
      renew: Math.round(num(r.p.renewable_mwh_year))
    })));
  }

  function buildFinance(host) {
    const P = portfolio({});
    const t = P.totals;
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:4px">Financial Savings and Investment</h3>' +
      '<p class="tiny muted" style="margin-bottom:14px">Capital deployed and benefit realisation across the portfolio</p>' +
      kpiStrip(host, [
        ['Approved CAPEX', Fmt.money(t.capexApproved), '', '#3b9bff'],
        ['Actual CAPEX', Fmt.money(t.capexActual), '', '#0ea5e9'],
        ['Measured benefit', Fmt.money(t.savingsActual) + '/yr', '', '#16c79a'],
        ['Verified benefit', Fmt.money(t.savingsVerified) + '/yr', '', '#9b7bff'],
        ['Portfolio payback', Fmt.dec(t.payback, 1) + ' yrs', '', '#f5a524'],
        ['Portfolio NPV', Fmt.money(t.npv), '', '#16c79a'],
        ['Budget utilised', Fmt.pct(t.budgetUtil, 0), '', '#3b9bff'],
        ['Achievement', Fmt.pct(t.achievement, 0), '', '#16c79a']
      ]);
    tableBlock(host, 'Investment and return by project', [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'company', label: 'Company' }, { key: 'appr', label: 'CAPEX Approved' },
      { key: 'act', label: 'CAPEX Actual' }, { key: 'exp', label: 'Expected /yr' },
      { key: 'meas', label: 'Measured /yr' }, { key: 'ver', label: 'Verified /yr' },
      { key: 'pb', label: 'Payback yrs' }, { key: 'npv', label: 'NPV' }, { key: 'roi', label: 'ROI %' }
    ], P.rows.map(r => ({
      code: r.p.code, name: r.p.name, company: r.p.company,
      appr: num(r.p.capex_approved), act: num(r.p.capex_actual),
      exp: num(r.p.savings_expected), meas: Math.round(r.mv.annual.cost),
      ver: Math.round(r.mv.verified.cost),
      pb: r.fin.payback ? +r.fin.payback.toFixed(2) : '',
      npv: Math.round(r.fin.npv), roi: Math.round(r.fin.roi)
    })));
  }

  function buildProgress(host) {
    const now = new Date(new Date().toDateString());
    const P = portfolio({});
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:14px">Implementation Progress</h3>';
    const overdue = S.milestones.filter(m => m.status !== 'Completed' && parseDate(m.planned_date) < now)
      .sort((a, b) => parseDate(a.planned_date) - parseDate(b.planned_date));
    const blocked = S.tasks.filter(t => t.status === 'Blocked');

    tableBlock(host, 'Overdue milestones (' + overdue.length + ')', [
      { key: 'code', label: 'Project' }, { key: 'name', label: 'Milestone' },
      { key: 'owner', label: 'Owner' }, { key: 'planned', label: 'Planned' },
      { key: 'late', label: 'Days late' }, { key: 'status', label: 'Status' }
    ], overdue.map(m => {
      const p = S.projById.get(m.project_id);
      return {
        code: p ? p.code : '', name: m.name, owner: m.owner,
        planned: m.planned_date,
        late: Math.round((now - parseDate(m.planned_date)) / 86400000),
        status: m.status
      };
    }));

    tableBlock(host, 'Blocked tasks (' + blocked.length + ')', [
      { key: 'code', label: 'Project' }, { key: 'name', label: 'Task' },
      { key: 'assignee', label: 'Assignee' }, { key: 'due', label: 'Due' },
      { key: 'notes', label: 'Reason' }
    ], blocked.map(t => {
      const p = S.projById.get(t.project_id);
      return { code: p ? p.code : '', name: t.name, assignee: t.assignee, due: t.due_date, notes: t.notes };
    }));
  }

  function buildFactory(host) {
    const P = portfolio({});
    const fac = [];
    groupBy(P.rows, r => r.p.factory).forEach((list, f) => {
      fac.push({
        factory: f, company: list[0].p.company, n: list.length,
        capex: sum(list, r => r.fin.capex),
        measured: sum(list, r => r.mv.annual.cost),
        expected: sum(list, r => num(r.p.savings_expected)),
        ghg: sum(list, r => r.mv.annual.ghg),
        delayed: list.filter(r => r.delayed).length,
        risks: sum(list, r => r.openRisks.length),
        ach: sum(list, r => num(r.p.savings_expected)) > 0
          ? sum(list, r => r.mv.annual.cost) / sum(list, r => num(r.p.savings_expected)) * 100 : 0
      });
    });
    fac.sort((a, b) => b.measured - a.measured);
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:14px">Factory Comparison</h3>';
    tableBlock(host, 'Facility ranking by measured savings', [
      { key: 'rank', label: '#' }, { key: 'factory', label: 'Facility' },
      { key: 'company', label: 'Company' }, { key: 'n', label: 'Projects' },
      { key: 'capex', label: 'CAPEX' }, { key: 'expected', label: 'Expected /yr' },
      { key: 'measured', label: 'Measured /yr' }, { key: 'ach', label: 'Achievement %' },
      { key: 'ghg', label: 'tCO2e/yr' }, { key: 'delayed', label: 'Delayed' },
      { key: 'risks', label: 'Open risks' }
    ], fac.map((f, i) => Object.assign({}, f, {
      rank: i + 1, capex: Math.round(f.capex),
      expected: Math.round(f.expected), measured: Math.round(f.measured),
      ach: Math.round(f.ach), ghg: Math.round(f.ghg)
    })));
  }

  function buildAnnual(host) {
    const P = portfolio({});
    const t = P.totals;
    host.innerHTML = '<h3 style="font-size:15px;margin-bottom:4px">Annual Project Performance Review</h3>' +
      '<p class="tiny muted" style="margin-bottom:14px">Actual against approved annual targets, year to date</p>' +
      kpiStrip(host, [
        ['Projects', t.count, '', '#3b9bff'],
        ['Expected annual savings', Fmt.money(t.savingsExpected), '', '#f5a524'],
        ['Measured annual savings', Fmt.money(t.savingsActual), '', '#16c79a'],
        ['Verified annual savings', Fmt.money(t.savingsVerified), '', '#9b7bff']
      ]);
    tableBlock(host, 'Actual versus approved target', [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'target', label: 'Approved target /yr' }, { key: 'measured', label: 'Actual /yr' },
      { key: 'gap', label: 'Gap' }, { key: 'ach', label: 'Achievement %' },
      { key: 'ver', label: 'Verified /yr' }, { key: 'vrate', label: 'Verified %' }
    ], P.rows.map(r => ({
      code: r.p.code, name: r.p.name,
      target: num(r.p.savings_expected), measured: Math.round(r.mv.annual.cost),
      gap: Math.round(r.mv.annual.cost - num(r.p.savings_expected)),
      ach: r.mv.achievement === null ? '' : Math.round(r.mv.achievement),
      ver: Math.round(r.mv.verified.cost),
      vrate: r.mv.annual.cost > 0 ? Math.round(r.mv.verified.cost / r.mv.annual.cost * 100) : ''
    })));
  }

  /* ---------------------------- export ---------------------------- */
  function exportReport(id) {
    const P = portfolio({});
    if (id === 'mv') {
      Export.excel('AXIS_MV_report_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'method', label: 'IPMVP' }, { key: 'periods', label: 'Periods' },
        { key: 'expected', label: 'Expected/yr' }, { key: 'measured', label: 'Measured/yr' },
        { key: 'verified', label: 'Verified/yr' }, { key: 'ach', label: 'Achievement %' }
      ], P.rows.map(r => ({
        code: r.p.code, name: r.p.name, method: r.p.mv_method || '', periods: r.mv.months,
        expected: num(r.p.savings_expected), measured: Math.round(r.mv.annual.cost),
        verified: Math.round(r.mv.verified.cost),
        ach: r.mv.achievement === null ? '' : Math.round(r.mv.achievement)
      })), 'M&V Performance Report');
      return;
    }
    if (id === 'sustain') {
      Export.excel('AXIS_sustainability_report_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'elec', label: 'Electricity kWh/yr' }, { key: 'gas', label: 'Gas Nm3/yr' },
        { key: 'energy', label: 'Energy MWh/yr' }, { key: 'ghg', label: 'GHG tCO2e/yr' },
        { key: 'water', label: 'Water m3/yr' }, { key: 'waste', label: 'Waste t/yr' }
      ], P.rows.map(r => ({
        code: r.p.code, name: r.p.name, elec: Math.round(r.mv.annual.elec),
        gas: Math.round(r.mv.annual.gas), energy: Math.round(r.mv.annual.energyMwh),
        ghg: Math.round(r.mv.annual.ghg), water: Math.round(r.mv.annual.water),
        waste: Math.round(r.mv.annual.waste)
      })), 'Energy & Sustainability Report');
      return;
    }
    // default: full portfolio export
    Export.excel('AXIS_report_' + id + '_' + today() + '.xls', [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'company', label: 'Company' }, { key: 'factory', label: 'Facility' },
      { key: 'status', label: 'Status' }, { key: 'progress', label: 'Progress %' },
      { key: 'capexApproved', label: 'CAPEX Approved' }, { key: 'capexActual', label: 'CAPEX Actual' },
      { key: 'expected', label: 'Expected /yr' }, { key: 'measured', label: 'Measured /yr' },
      { key: 'verified', label: 'Verified /yr' }, { key: 'achievement', label: 'Achievement %' },
      { key: 'energy', label: 'Energy MWh/yr' }, { key: 'ghg', label: 'GHG tCO2e/yr' }
    ], P.rows.map(r => ({
      code: r.p.code, name: r.p.name, company: r.p.company, factory: r.p.factory,
      status: r.p.status, progress: num(r.p.progress),
      capexApproved: num(r.p.capex_approved), capexActual: num(r.p.capex_actual),
      expected: num(r.p.savings_expected), measured: Math.round(r.mv.annual.cost),
      verified: Math.round(r.mv.verified.cost),
      achievement: r.mv.achievement === null ? '' : Math.round(r.mv.achievement),
      energy: Math.round(r.mv.annual.energyMwh), ghg: Math.round(r.mv.annual.ghg)
    })), 'AXIS Report — ' + id);
  }
})();
