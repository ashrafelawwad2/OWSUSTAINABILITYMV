/* ==========================================================================
   Oriental Weavers Platform — Executive Dashboard
   Consolidated portfolio, financial, operational and sustainability KPIs
   ========================================================================== */
'use strict';

(function () {
  const state = { category: '', company: '', factory: '', period: 12 };

  /**
   * Group energy cost performance as reported by the OW Sustainability
   * department for the current reporting period. Every figure is read from the
   * `energy_perf` settings row loaded from the Table API — nothing is hardcoded
   * here, so an updated monthly report only requires a data change.
   */
  function energyBand() {
    const perf = (typeof energyPerf === 'function') ? energyPerf() : null;
    if (!perf) return '';
    const cur = perf.currency || CFG.energyCurrency || 'EGP';
    const pct = num(perf.cost_savings_target_pct);
    const savedM = num(perf.cost_savings_ytd_m_egp);

    const tiles = perf.metrics.map(m => {
      const onTarget = m.on_target !== false;
      const accent = onTarget ? '#2E7D32' : '#C53030';
      return UI.kpi({
        label: m.label,
        value: esc(m.display),
        icon: m.key === 're_savings' ? 'solar-panel'
          : m.key === 'grid_elec' ? 'plug'
            : m.key === 'elec_savings' ? 'bolt'
              : 'fire-flame-simple',
        accent: accent,
        foot: '<span class="badge ' + (onTarget ? 'b-green' : 'b-red') + '">' +
          '<i class="fa-solid fa-' + (onTarget ? 'check' : 'triangle-exclamation') + '"></i>' +
          (onTarget ? 'On target' : 'Below target') + '</span>' +
          '<span class="muted"> Target ' + esc(m.target_display) + '</span>'
      });
    }).join('');

    return UI.sectionTitle('OW group energy performance — ' + Fmt.period(perf.period)) +
      '<div class="card card-pad" style="margin-bottom:14px;border-left:4px solid #1B2A6B">' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:baseline;margin-bottom:4px">' +
          '<strong style="font-size:14px;color:#1B2A6B">' + esc(perf.title || 'OW Energy Cost Performance') + '</strong>' +
          '<span class="tiny muted">' + esc(CFG.group) + ' · Sustainability Department</span>' +
          '<span style="margin-left:auto;font-size:12.5px">' +
            '<strong style="font-family:var(--font-display);font-size:20px;color:#1B2A6B">' +
            cur + ' ' + Fmt.dec(savedM, 1) + 'm</strong>' +
            '<span class="muted"> total energy cost savings YTD (' + Fmt.pct(pct, 0) + ' of target)</span>' +
          '</span>' +
        '</div>' +
        '<div class="kpi-bar" style="margin:6px 0 14px"><i style="width:' + clamp(pct, 0, 100) + '%;background:#1B2A6B"></i></div>' +
        '<div class="grid g5">' + tiles + '</div>' +
        '<p class="tiny muted" style="margin:12px 0 0">' +
          '<i class="fa-solid fa-circle-info"></i> Group energy figures are reported in ' + esc(cur) +
          ' by the Sustainability department; project budgets below are reported in ' + esc(CFG.currency) +
          '. Both are shown as published and are not converted.' +
        '</p>' +
      '</div>';
  }

  App.boot({
    page: 'dashboard',
    title: 'Executive Dashboard',
    crumb: 'Group overview · all facilities',
    async render(root) {
      paint(root);
    }
  });

  function paint(root) {
    const P = portfolio({
      category: state.category, company: state.company, factory: state.factory
    });
    const t = P.totals;
    const rows = P.rows;
    const viewer = Session.isViewer();

    /* ---------------- filter options ---------------- */
    const companies = uniq(S.projects.map(p => p.company)).sort();
    const factories = uniq(S.projects.filter(p => !state.company || p.company === state.company).map(p => p.factory)).sort();

    /* ---------------- alerts preview ---------------- */
    const alerts = buildAlerts();
    const urgent = alerts.filter(a => a.sev === 'high').slice(0, 4);
    const med = alerts.filter(a => a.sev === 'med').slice(0, 3);
    const topAlerts = urgent.concat(med).slice(0, 6);
    const alertDot = $('#alertDot');
    if (alertDot) alertDot.style.display = alerts.filter(a => a.sev === 'high').length ? 'block' : 'none';

    /* ---------------- trend data (12 months) ---------------- */
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(2026, 9, 1);
      d.setMonth(d.getMonth() - i);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    const trendActual = [], trendExpected = [], trendVerified = [], trendCumulative = [];
    let cum = 0;
    const tt = tariffs();
    months.forEach(per => {
      let costA = 0, costV = 0;
      rows.forEach(r => {
        const rec = r.mv.recs.find(x => x.period === per);
        if (!rec) return;
        const n = MV.normalize(rec, tt);
        costA += n.costSaved;
        if (n.verified) costV += n.costSaved;
      });
      const exp = sum(rows, r => num(r.p.savings_expected)) / 12;
      trendActual.push(Math.round(costA));
      trendVerified.push(Math.round(costV));
      trendExpected.push(Math.round(exp));
      cum += costA;
      trendCumulative.push(Math.round(cum));
    });

    /* ---------------- facility comparison ---------------- */
    const facRows = [];
    groupBy(rows.filter(r => r.p.status !== 'Cancelled'), r => r.p.factory).forEach((list, fac) => {
      const pl = list.map(r => r.p);
      facRows.push({
        factory: fac,
        company: list[0].p.company,
        count: list.length,
        capex: sum(pl, p => num(p.capex_actual) || num(p.capex_approved)),
        savingsExp: sum(pl, p => num(p.savings_expected)),
        savingsAct: sum(list, r => r.mv.annual.cost),
        energyMwh: sum(list, r => r.mv.annual.energyMwh),
        ghg: sum(list, r => r.mv.annual.ghg),
        progress: avg(pl, p => num(p.progress)),
        delayed: list.filter(r => r.delayed).length,
        verified: sum(list, r => r.mv.verified.cost)
      });
      facRows[facRows.length - 1].achievement = facRows[facRows.length - 1].savingsExp > 0
        ? (facRows[facRows.length - 1].savingsAct / facRows[facRows.length - 1].savingsExp) * 100 : 0;
    });
    facRows.sort((a, b) => b.savingsAct - a.savingsAct);

    /* ---------------- category split ---------------- */
    const catKeys = Object.keys(CATEGORIES);
    const catCounts = catKeys.map(k => rows.filter(r => r.p.category === k).length);
    const catSavings = catKeys.map(k => sum(rows.filter(r => r.p.category === k), r => r.mv.annual.cost));

    /* ---------------- top / bottom projects ---------------- */
    const rankBySavings = rows.filter(r => r.mv.hasData).slice().sort((a, b) => b.mv.annual.cost - a.mv.annual.cost);
    const atRisk = rows.filter(r => r.needsAttention).sort((a, b) => {
      const aScore = (a.delayed ? 3 : 0) + a.openRisks.filter(x => riskScore(x) >= 15).length * 2 + (a.p.priority === 'Critical' ? 2 : 0);
      const bScore = (b.delayed ? 3 : 0) + b.openRisks.filter(x => riskScore(x) >= 15).length * 2 + (b.p.priority === 'Critical' ? 2 : 0);
      return bScore - aScore;
    }).slice(0, 6);

    /* ---------------- render ---------------- */
    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Group Performance Overview</h2>
          <div class="sub">Consolidated position for ${t.count} registered projects across ${uniq(rows.map(r => r.p.factory)).length} facilities ·
            reporting period to ${Fmt.period(months[months.length - 1])}</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="exportBtn"><i class="fa-solid fa-file-excel"></i> Export</button>
          <button class="btn btn-sm" id="printBtn2"><i class="fa-solid fa-print"></i> Report</button>
          <a class="btn btn-sm btn-primary" href="register.html"><i class="fa-solid fa-plus"></i> New project</a>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px">
        <div class="filter-bar">
          <span class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.08em">Filter</span>
          <select id="fCat">
            <option value="">All categories</option>
            ${Object.keys(CATEGORIES).map(k => `<option value="${k}"${state.category === k ? ' selected' : ''}>${esc(CATEGORIES[k].label)}</option>`).join('')}
          </select>
          <select id="fComp">
            <option value="">All companies</option>
            ${companies.map(c => `<option value="${esc(c)}"${state.company === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <select id="fFac">
            <option value="">All facilities</option>
            ${factories.map(f => `<option value="${esc(f)}"${state.factory === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-ghost" id="resetF"><i class="fa-solid fa-rotate-left"></i> Reset</button>
          <span class="tiny muted" style="margin-left:auto">
            <i class="fa-solid fa-circle-info"></i> All figures recalculate live from the project database
          </span>
        </div>
      </div>

      ${UI.sectionTitle('Project portfolio')}
      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Total projects', value: Fmt.int(t.count), icon: 'layer-group', accent: '#1B2A6B',
          foot: `${t.inProgress} in progress · ${t.underStudy} under study` })}
        ${UI.kpi({ label: 'Under implementation', value: Fmt.int(t.inProgress), icon: 'person-digging', accent: '#1E7B96',
          foot: `Budget-weighted completion ${Fmt.pct(t.avgProgressActive, 0)}`, bar: t.avgProgressActive })}
        ${UI.kpi({ label: 'Completed', value: Fmt.int(t.completed), icon: 'circle-check', accent: '#2E7D32',
          foot: `${Fmt.pct(t.count ? t.completed / t.count * 100 : 0, 0)} of portfolio` })}
        ${UI.kpi({ label: 'Not started', value: Fmt.int(t.notStarted), icon: 'circle-play', accent: '#8C92A4',
          foot: `${t.cancelled} cancelled in review` })}
        ${UI.kpi({ label: 'Needs intervention', value: Fmt.int(t.attention), icon: 'triangle-exclamation', accent: '#B7791F',
          foot: `${t.criticalRisks} critical risks · ${t.openRisks} open risks` })}
      </div>

      ${UI.sectionTitle('Financial performance')}
      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Est. investment (CAPEX)', value: Fmt.money(t.capexEstimated), icon: 'sack-dollar', accent: '#3b9bff',
          foot: `${Fmt.money(t.capexApproved)} approved` })}
        ${UI.kpi({ label: 'Actual expenditure', value: Fmt.money(t.capexActual), icon: 'money-bill-transfer', accent: '#0ea5e9',
          foot: `${Fmt.pct(t.budgetUtil, 0)} of approved · ${Fmt.money(t.remainingBudget)} remaining`, bar: t.budgetUtil })}
        ${UI.kpi({ label: 'Expected annual savings', value: Fmt.money(t.savingsExpected), icon: 'bullseye', accent: '#f5a524',
          foot: 'Approved business cases' })}
        ${UI.kpi({ label: 'Measured annual savings', value: Fmt.money(t.savingsActual), icon: 'chart-line', accent: '#16c79a',
          foot: `${Fmt.pct(t.achievement, 0)} achievement vs expected`, bar: clamp(t.achievement, 0, 100) })}
        ${UI.kpi({ label: 'Verified annual savings', value: Fmt.money(t.savingsVerified), icon: 'certificate', accent: '#9b7bff',
          foot: `${Fmt.pct(t.verifyRate, 0)} of measured savings verified` })}
      </div>

      <div class="grid g4" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Portfolio payback', value: t.payback > 0 ? Fmt.dec(t.payback, 1) : '—', unit: 'yrs', icon: 'hourglass-half', accent: '#0ea5e9',
          foot: 'Measured savings basis' })}
        ${UI.kpi({ label: 'Portfolio ROI', value: Fmt.pct(t.roi, 0), icon: 'percent', accent: '#16c79a',
          foot: `Over ${tariffs().life}-year economic life` })}
        ${UI.kpi({ label: 'Portfolio NPV', value: Fmt.money(t.npv), icon: 'coins', accent: '#f5a524',
          foot: `At ${Fmt.pct(tariffs().discount * 100, 0)} discount rate` })}
        ${UI.kpi({ label: 'Budget utilisation', value: Fmt.pct(t.budgetUtil, 0), icon: 'gauge', accent: '#9b7bff',
          foot: `${Fmt.money(t.capexActual)} of ${Fmt.money(t.capexApproved)}`, bar: t.budgetUtil })}
      </div>

      ${UI.sectionTitle('Sustainability & operational performance')}
      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Electricity savings', value: Fmt.int(t.elecKwh / 1000), unit: 'MWh/yr', icon: 'bolt', accent: '#f5a524',
          foot: `${Fmt.int(t.elecKwh)} kWh/yr` })}
        ${UI.kpi({ label: 'Natural gas savings', value: Fmt.int(t.gasNm3), unit: 'Nm³/yr', icon: 'fire-flame-simple', accent: '#f2545b',
          foot: 'Thermal energy avoided' })}
        ${UI.kpi({ label: 'Total energy savings', value: Fmt.int(t.energySavedMwh), unit: 'MWh/yr', icon: 'plug-circle-bolt', accent: '#0ea5e9',
          foot: `${Fmt.int(t.energySavedMwhVerified)} MWh verified` })}
        ${UI.kpi({ label: 'GHG emissions avoided', value: Fmt.int(t.ghgAvoided), unit: 'tCO₂e/yr', icon: 'leaf', accent: '#16c79a',
          foot: `${Fmt.int(t.ghgAvoidedVerified)} tCO₂e verified` })}
        ${UI.kpi({ label: 'Renewable generation', value: Fmt.int(t.renewableMwh), unit: 'MWh/yr', icon: 'solar-panel', accent: '#9b7bff',
          foot: 'Contracted RE capacity' })}
      </div>
      <div class="grid g4">
        ${UI.kpi({ label: 'Water savings', value: Fmt.int(t.waterM3), unit: 'm³/yr', icon: 'droplet', accent: '#0ea5e9',
          foot: 'Reuse and conservation' })}
        ${UI.kpi({ label: 'Waste reduction', value: Fmt.int(t.wasteT), unit: 't/yr', icon: 'recycle', accent: '#16c79a',
          foot: 'Diverted or avoided' })}
        ${UI.kpi({ label: 'SEC improvement', value: Fmt.pct(t.secImprovement, 1), icon: 'arrow-trend-down', accent: '#3b9bff',
          foot: 'Specific energy consumption' })}
        ${UI.kpi({ label: 'Capacity added', value: Fmt.int(t.capacityAdded), icon: 'industry', accent: '#f5a524',
          foot: `${rows.filter(r => num(r.p.capacity_added) > 0).length} expansion projects` })}
      </div>

      ${energyBand()}

      ${UI.sectionTitle('Trends & distribution')}
      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head">
            <h3>Savings performance trend</h3>
            <span class="ch-sub">Measured vs expected vs verified · monthly</span>
            <div class="ch-actions"><div class="btn-group" id="trendToggle">
              <button data-mode="bar" class="on">Monthly</button><button data-mode="cum">Cumulative</button>
            </div></div>
          </div>
          <div class="card-body"><div class="chart-box lg"><canvas id="chTrend"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Portfolio status</h3><span class="ch-sub">${t.count} projects</span></div>
          <div class="card-body">
            <div class="chart-box" style="height:230px"><canvas id="chStatus"></canvas></div>
            <div style="margin-top:14px">
              ${Object.keys(STATUS_META).filter(k => (t.byStatus[k] || 0) > 0).map(k => `
                <div class="stat-line"><span class="k">${UI.tl(STATUS_META[k].tl.slice(3))} &nbsp;${esc(k)}</span>
                <span class="v">${t.byStatus[k] || 0}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Savings by project category</h3><span class="ch-sub">Measured annual savings</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="chCat"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Investment vs savings by category</h3><span class="ch-sub">CAPEX actual and measured benefit</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="chCatFin"></canvas></div></div>
        </div>
      </div>

      ${UI.sectionTitle('Facility & project performance')}
      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head">
            <h3>Facility comparison</h3>
            <span class="ch-sub">Ranked by measured annual savings</span>
            <div class="ch-actions"><button class="btn btn-sm" id="facExport"><i class="fa-solid fa-file-csv"></i> CSV</button></div>
          </div>
          <div id="facTable"></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Top projects by measured savings</h3></div>
          <div class="card-body" style="padding:10px">
            <div class="rank-list">
              ${rankBySavings.slice(0, 7).map((r, i) => `
                <a class="rank-item" href="project.html?id=${esc(r.p.id)}" style="color:inherit;text-decoration:none">
                  <span class="rank-no">${i + 1}</span>
                  <span class="rank-name" title="${esc(r.p.name)}">${esc(r.p.name)}</span>
                  <span class="rank-val">${Fmt.money(r.mv.annual.cost)}</span>
                </a>`).join('') || UI.empty('No measured data', 'Submit M&V records to populate this ranking.', 'chart-simple')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head">
            <h3>Projects requiring management attention</h3>
            <div class="ch-actions"><button class="btn btn-sm" id="allAlerts">View all alerts</button></div>
          </div>
          <div class="card-body" style="padding:11px">
            ${atRisk.length ? atRisk.map(r => {
              const reasons = [];
              if (r.delayed) reasons.push('delayed');
              if (r.openRisks.filter(x => riskScore(x) >= 15).length) reasons.push(r.openRisks.filter(x => riskScore(x) >= 15).length + ' critical risk');
              if (r.mv.achievement !== null && r.mv.achievement < 80) reasons.push('savings ' + Fmt.pct(r.mv.achievement, 0));
              if (r.p.priority === 'Critical') reasons.push('critical priority');
              return `<a class="alert-item" href="project.html?id=${esc(r.p.id)}" style="text-decoration:none;color:inherit">
                <span class="alert-sev ${r.delayed ? 'sev-high' : 'sev-med'}"></span>
                <span class="ai-body">
                  <span class="ai-title">${esc(r.p.code)} — ${esc(r.p.name)}</span>
                  <span class="ai-meta">${esc(r.p.factory)} · ${reasons.join(' · ')}</span>
                  <div style="margin-top:5px">${UI.prog(r.p.progress, r.delayed ? 'bad' : '')}</div>
                </span>
                ${UI.statusBadge(r.p.status)}
              </a>`;
            }).join('') : UI.empty('All clear', 'No projects currently require management intervention.', 'circle-check')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Active notifications</h3><span class="ch-sub">${alerts.length} total</span></div>
          <div class="card-body" style="padding:11px">
            ${topAlerts.length ? topAlerts.map(a => `
              <a class="alert-item" href="${a.link}" style="text-decoration:none;color:inherit">
                <span class="alert-sev sev-${a.sev}"></span>
                <span class="ai-body"><span class="ai-title">${esc(a.title)}</span>
                <span class="ai-meta">${esc(a.type)} · ${esc(a.meta)}</span></span>
              </a>`).join('') : UI.empty('No alerts', 'Everything is on track.', 'circle-check')}
          </div>
        </div>
      </div>

      <div class="card card-pad" style="margin-top:16px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:240px">
          <div style="font-size:12.5px;font-weight:650;margin-bottom:2px">M&amp;V coverage</div>
          <div class="tiny muted">Projects with submitted measurement data: ${rows.filter(r => r.mv.hasData).length} of ${rows.length}
            · fully verified: ${t.verifiedCount}</div>
        </div>
        <div style="flex:1;min-width:180px">${UI.prog(t.mvCoverage, t.mvCoverage < 70 ? 'warn' : '')}</div>
        <a class="btn btn-sm" href="mv.html"><i class="fa-solid fa-chart-line"></i> Open M&amp;V module</a>
      </div>
    `;

    /* ---------------- wire filters ---------------- */
    $('#fCat').addEventListener('change', e => { state.category = e.target.value; paint(root); });
    $('#fComp').addEventListener('change', e => { state.company = e.target.value; state.factory = ''; paint(root); });
    $('#fFac').addEventListener('change', e => { state.factory = e.target.value; paint(root); });
    $('#resetF').addEventListener('click', () => { state.category = state.company = state.factory = ''; paint(root); });
    $('#printBtn2').addEventListener('click', () => Export.printReport('Group Performance Report',
      state.category ? CATEGORIES[state.category].label : 'All categories'));
    $('#allAlerts').addEventListener('click', () => Shell.showAlerts());
    $('#exportBtn').addEventListener('click', () => {
      Export.excel('AXIS_dashboard_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'category', label: 'Category' }, { key: 'factory', label: 'Facility' },
        { key: 'status', label: 'Status' }, { key: 'progress', label: 'Progress %' },
        { key: 'capexActual', label: 'CAPEX Actual' },
        { key: 'savingsExpected', label: 'Expected Savings/yr' },
        { key: 'savingsMeasured', label: 'Measured Savings/yr' },
        { key: 'savingsVerified', label: 'Verified Savings/yr' },
        { key: 'achievement', label: 'Achievement %' }
      ], rows.map(r => ({
        code: r.p.code, name: r.p.name, category: CATEGORIES[r.p.category] ? CATEGORIES[r.p.category].label : r.p.category,
        factory: r.p.factory, status: r.p.status, progress: num(r.p.progress),
        capexActual: r.fin.capex, savingsExpected: num(r.p.savings_expected),
        savingsMeasured: Math.round(r.mv.annual.cost), savingsVerified: Math.round(r.mv.verified.cost),
        achievement: r.mv.achievement === null ? '' : Math.round(r.mv.achievement)
      })), 'AXIS Executive Dashboard — Portfolio Summary');
    });

    /* ---------------- facility table ---------------- */
    DataTable.render($('#facTable'), {
      pageSize: 8,
      searchable: false,
      columns: [
        { key: 'factory', label: 'Facility', render: r => `<strong>${esc(r.factory)}</strong><div class="tiny muted">${esc(r.company)}</div>` },
        { key: 'count', label: 'Proj', align: 'right', width: '58px' },
        { key: 'capex', label: 'CAPEX', align: 'right', render: r => Fmt.money(r.capex) },
        { key: 'savingsAct', label: 'Measured /yr', align: 'right', render: r => `<strong>${Fmt.money(r.savingsAct)}</strong>` },
        { key: 'achievement', label: 'Achieve', align: 'right', render: r => `<span class="badge ${r.achievement >= 95 ? 'b-green' : r.achievement >= 75 ? 'b-amber' : 'b-red'}">${Fmt.pct(r.achievement, 0)}</span>` },
        { key: 'energyMwh', label: 'MWh/yr', align: 'right', render: r => Fmt.int(r.energyMwh) },
        { key: 'delayed', label: 'Delay', align: 'right', render: r => r.delayed ? `<span class="badge b-red">${r.delayed}</span>` : '<span class="muted">—</span>' }
      ],
      rows: facRows,
      emptyTitle: 'No facilities in this filter'
    });

    /* ---------------- charts ---------------- */
    const monthLabels = months.map(m => Fmt.period(m));
    let trendMode = 'bar';
    function drawTrend() {
      if (trendMode === 'bar') {
        CH.mixed('chTrend', monthLabels,
          [
            { label: 'Measured savings', data: trendActual, color: '#16c79a' },
            { label: 'Verified savings', data: trendVerified, color: '#9b7bff' }
          ],
          [{ label: 'Expected monthly target', data: trendExpected, color: '#f5a524', dash: [5, 4], axis: 'y1' }],
          { tooltip: { label: c => c.dataset.label + ': ' + Fmt.money(c.parsed.y) } }
        );
      } else {
        let ca = [], cv = [], ce = [], a = 0, v = 0, e = 0;
        months.forEach((m, i) => { a += trendActual[i]; v += trendVerified[i]; e += trendExpected[i]; ca.push(a); cv.push(v); ce.push(e); });
        CH.line('chTrend', monthLabels, [
          { label: 'Cumulative measured', data: ca, color: '#16c79a' },
          { label: 'Cumulative verified', data: cv, color: '#9b7bff', fill: false },
          { label: 'Cumulative expected', data: ce, color: '#f5a524', dash: [5, 4], fill: false }
        ], { tooltip: { label: c => c.dataset.label + ': ' + Fmt.money(c.parsed.y) } });
      }
    }
    drawTrend();
    $$('#trendToggle button').forEach(b => b.addEventListener('click', () => {
      $$('#trendToggle button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      trendMode = b.getAttribute('data-mode');
      drawTrend();
    }));

    const statusOrder = Object.keys(STATUS_META).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);
    const statusColors = {};
    statusOrder.forEach(k => { statusColors[k] = STATUS_META[k].color; });
    const sLabels = statusOrder.filter(k => (t.byStatus[k] || 0) > 0);
    CH.doughnut('chStatus', sLabels, sLabels.map(k => t.byStatus[k]), {
      colors: sLabels.map(k => statusColors[k]),
      legend: false,
      tooltip: { label: c => c.label + ': ' + c.parsed + ' projects' }
    });

    CH.bar('chCat', Object.keys(CATEGORIES).map(k => CATEGORIES[k].short),
      [{ label: 'Measured annual savings', data: catSavings, colors: Object.keys(CATEGORIES).map(k => CATEGORIES[k].color) }],
      { legend: false, tooltip: { label: c => Fmt.money(c.parsed.y) + '/yr' } });

    CH.bar('chCatFin', Object.keys(CATEGORIES).map(k => CATEGORIES[k].short), [
      { label: 'CAPEX actual', data: catKeys.map(k => sum(rows.filter(r => r.p.category === k), r => r.fin.capex)), color: '#3b9bff' },
      { label: 'Measured savings/yr', data: catSavings, color: '#16c79a' }
    ], { tooltip: { label: c => c.dataset.label + ': ' + Fmt.money(c.parsed.y) } });

    $('#facExport').addEventListener('click', () => {
      Export.csv('AXIS_facility_comparison_' + today() + '.csv', [
        { key: 'factory', label: 'Facility' }, { key: 'company', label: 'Company' },
        { key: 'count', label: 'Projects' }, { key: 'capex', label: 'CAPEX Actual' },
        { key: 'savingsAct', label: 'Measured Savings/yr' }, { key: 'savingsExp', label: 'Expected Savings/yr' },
        { key: 'achievement', label: 'Achievement %' }, { key: 'energyMwh', label: 'Energy Savings MWh/yr' },
        { key: 'ghg', label: 'GHG Avoided tCO2e/yr' }, { key: 'delayed', label: 'Delayed Projects' }
      ], facRows);
    });
  }
})();
