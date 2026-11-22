/* ==========================================================================
   Oriental Weavers — All Projects Status (one-page board)
   Single-screen command view: portfolio KPIs, status split, budget by status,
   group energy performance and every project's live status on one page.
   Everything is recalculated from the Table API — no hardcoded figures.
   ========================================================================== */
'use strict';

(function () {

  App.boot({
    page: 'status',
    title: 'All Projects Status',
    crumb: 'Oriental Weavers Group · one-page portfolio board',
    async render(root) {
      paint(root);
    }
  });

  function paint(root) {
    const P = portfolio({});
    const t = P.totals;

    /* Order projects by code (OW-01 … OW-21) */
    const rows = P.rows.slice().sort((a, b) =>
      String(a.p.code || '').localeCompare(String(b.p.code || ''), undefined, { numeric: true }));

    const perf = (typeof energyPerf === 'function') ? energyPerf() : null;

    /* Status ordering / colours come from STATUS_META so they stay in sync */
    const stOrder = Object.keys(STATUS_META).sort(
      (a, b) => STATUS_META[a].order - STATUS_META[b].order);

    /* Budget and count per status */
    const budgetByStatus = {};
    stOrder.forEach(k => { budgetByStatus[k] = 0; });
    rows.forEach(r => {
      budgetByStatus[r.p.status] = (budgetByStatus[r.p.status] || 0) + num(r.p.capex_estimated);
    });

    /* ---------- KPI row ---------- */
    const kpis = [
      UI.kpi({
        label: 'Total projects', value: Fmt.int(t.count), icon: 'layer-group', accent: '#1B2A6B',
        foot: `${t.inProgress} in progress · ${t.underStudy} under study · ${t.completed} complete`
      }),
      UI.kpi({
        label: 'Total portfolio budget', value: Fmt.money(t.budgetTotal), icon: 'sack-dollar', accent: '#1B2A6B',
        foot: `${t.count} projects as reported`
      }),
      UI.kpi({
        label: 'Active budget', value: Fmt.money(t.budgetActive), icon: 'bolt', accent: '#1E7B96',
        foot: `${t.activeCount} projects (In Progress + Not Started)`
      }),
      UI.kpi({
        label: 'Average completion', value: Fmt.pct(t.avgProgressActive, 0), icon: 'gauge-high', accent: '#2E7D32',
        foot: 'Budget-weighted · ' + t.avgProgressActiveCount + ' in-progress projects', bar: t.avgProgressActive
      }),
      UI.kpi({
        label: 'Completed', value: Fmt.int(t.completed), icon: 'circle-check', accent: '#2E7D32',
        foot: `${Fmt.money(budgetByStatus.Completed || 0)} delivered`
      }),
      UI.kpi({
        label: 'Needs attention', value: Fmt.int(t.attention), icon: 'triangle-exclamation', accent: '#C53030',
        foot: `${t.criticalRisks} critical risks · ${t.openRisks} open`
      })
    ].join('');

    /* ---------- status chips ---------- */
    const chips = stOrder.filter(k => (t.byStatus[k] || 0) > 0).map(k => {
      const col = STATUS_META[k].color;
      return '<div class="chip">' +
        '<span class="c-dot" style="background:' + col + '"></span>' +
        '<span class="c-n">' + (t.byStatus[k] || 0) + '</span>' +
        '<span class="c-l">' + esc(k) + '</span>' +
        '<span class="c-b">' + Fmt.money(budgetByStatus[k] || 0) + '</span>' +
        '</div>';
    }).join('');

    /* ---------- budget by status stacked bar ---------- */
    const totalBudget = t.budgetTotal || 1;
    const stackSegs = stOrder
      .filter(k => (budgetByStatus[k] || 0) > 0)
      .map(k => '<i style="width:' + ((budgetByStatus[k] / totalBudget) * 100).toFixed(2) +
        '%;background:' + STATUS_META[k].color + '" title="' + esc(k) + '"></i>').join('');
    const stackLegend = stOrder
      .filter(k => (budgetByStatus[k] || 0) > 0)
      .map(k => '<span><em style="background:' + STATUS_META[k].color + '"></em>' +
        esc(k) + ' ' + Fmt.money(budgetByStatus[k]) + '</span>').join('');

    /* ---------- group energy performance ---------- */
    let energyHtml = '';
    if (perf) {
      const cur = perf.currency || CFG.energyCurrency || 'EGP';
      const pct = num(perf.cost_savings_target_pct);
      const tiles = perf.metrics.map(m => {
        const onTarget = m.on_target !== false;
        return UI.kpi({
          label: m.label,
          value: esc(m.display),
          icon: m.key === 're_savings' ? 'solar-panel'
            : m.key === 'grid_elec' ? 'plug'
              : m.key === 'elec_savings' ? 'bolt' : 'fire-flame-simple',
          accent: onTarget ? '#2E7D32' : '#C53030',
          foot: '<span class="badge ' + (onTarget ? 'b-green' : 'b-red') + '">' +
            '<i class="fa-solid fa-' + (onTarget ? 'check' : 'triangle-exclamation') + '"></i>' +
            (onTarget ? 'On target' : 'Below target') + '</span>' +
            '<span class="muted"> Target ' + esc(m.target_display) + '</span>'
        });
      }).join('');

      energyHtml = UI.sectionTitle('Group energy performance — ' + Fmt.period(perf.period)) +
        '<div class="card card-pad" style="margin-bottom:14px;border-left:4px solid #1B2A6B">' +
          '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:baseline">' +
            '<strong style="font-size:13.5px;color:#1B2A6B">' + esc(perf.title || 'OW Energy Cost Performance') + '</strong>' +
            '<span class="tiny muted">Reported in ' + esc(cur) + '</span>' +
            '<span style="margin-left:auto;font-size:12.5px">' +
              '<strong style="font-family:var(--font-display);font-size:19px;color:#1B2A6B">' +
              cur + ' ' + Fmt.dec(num(perf.cost_savings_ytd_m_egp), 1) + 'm</strong>' +
              '<span class="muted"> cost savings YTD (' + Fmt.pct(pct, 0) + ' of target)</span>' +
            '</span>' +
          '</div>' +
          '<div class="kpi-bar" style="margin:7px 0 13px"><i style="width:' +
            clamp(pct, 0, 100) + '%;background:#1B2A6B"></i></div>' +
          '<div class="grid g5">' + tiles + '</div>' +
        '</div>';
    }

    /* ---------- main project table ---------- */
    const bodyRows = rows.map((r, i) => {
      const p = r.p;
      const st = STATUS_META[p.status] || { color: '#8C92A4' };
      const issues = r.openRisks.length;
      const crit = r.openRisks.filter(x => riskScore(x) >= 15).length;
      return '<tr>' +
        '<td class="num muted">' + (i + 1) + '</td>' +
        '<td class="pcode">' + esc(p.code || '') + '</td>' +
        '<td class="pname">' + esc(p.name || '') + '</td>' +
        '<td>' + esc(p.factory || '—') + '</td>' +
        '<td class="nowrap">' + esc(p.owner || '—') + '</td>' +
        '<td class="num">' + (num(p.capex_estimated) > 0 ? Fmt.money(p.capex_estimated) : '—') + '</td>' +
        '<td style="min-width:96px">' + UI.prog(p.progress) + '</td>' +
        '<td><span class="badge" style="background:' + st.color + '1a;color:' + st.color +
          ';border-color:' + st.color + '55">' + esc(p.status || '') + '</span></td>' +
        '<td class="num">' + (num(p.savings_expected) > 0 ? Fmt.money(p.savings_expected) : '—') + '</td>' +
        '<td class="num">' + (issues ? (crit ? '<span class="badge b-red">' + issues + '</span>'
          : '<span class="badge b-slate">' + issues + '</span>') : '<span class="muted">—</span>') + '</td>' +
        '</tr>';
    }).join('');

    /* ---------- totals row ---------- */
    const footRow = '<tr style="background:#F1F5FB;font-weight:700">' +
      '<td colspan="5" style="color:#1B2A6B">Total — ' + rows.length + ' projects</td>' +
      '<td class="num" style="color:#1B2A6B">' + Fmt.money(t.budgetTotal) + '</td>' +
      '<td>' + Fmt.pct(t.avgProgress, 0) + '</td>' +
      '<td></td>' +
      '<td class="num" style="color:#1B2A6B">' + Fmt.money(t.savingsExpected) + '</td>' +
      '<td class="num">' + t.openRisks + '</td>' +
      '</tr>';

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>All Projects Status</h2>
          <div class="sub">Every Oriental Weavers project with its current status, budget and progress ·
            ${rows.length} projects across ${uniq(rows.map(r => r.p.factory)).length} plants ·
            as reported ${perf ? Fmt.period(perf.period) : 'October 2026'}</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="stPrint"><i class="fa-solid fa-print"></i> Print / PDF</button>
          <button class="btn btn-sm" id="stCsv"><i class="fa-solid fa-file-csv"></i> CSV</button>
          <a class="btn btn-sm btn-primary" href="portfolio.html"><i class="fa-solid fa-layer-group"></i> Full portfolio</a>
        </div>
      </div>

      ${UI.sectionTitle('Portfolio summary')}
      <div class="grid g5" style="margin-bottom:14px">${kpis}</div>

      <div class="card card-pad" style="margin-bottom:14px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <strong style="font-size:12.5px;color:#1B2A6B">Status distribution</strong>
          <span class="tiny muted">count and budget per status</span>
        </div>
        <div class="chip-row" style="margin-bottom:14px">${chips}</div>
        <div class="stack">${stackSegs}</div>
        <div class="stack-legend">${stackLegend}</div>
      </div>

      ${energyHtml}

      ${UI.sectionTitle('All projects — current status')}
      <div class="card" style="margin-bottom:6px">
        <div class="card-head">
          <h3>Project status register</h3>
          <span class="ch-sub">${rows.length} projects · sorted by project code</span>
          <div class="ch-actions">
            <span class="tiny muted"><i class="fa-solid fa-circle-info"></i> Live from the project database</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="board-table">
            <thead>
              <tr>
                <th style="width:34px">#</th>
                <th style="width:64px">Code</th>
                <th>Project</th>
                <th>Plant</th>
                <th>Owner</th>
                <th style="text-align:right">Budget</th>
                <th>Progress</th>
                <th>Status</th>
                <th style="text-align:right">Savings/yr</th>
                <th style="text-align:right">Issues</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
            <tfoot>${footRow}</tfoot>
          </table>
        </div>
        <div class="card-foot">
          Budgets as published in USD. Projects marked “—” have no approved budget on the current
          portfolio. Group energy performance above is reported in ${esc(CFG.energyCurrency)}.
        </div>
      </div>

      <p class="tiny muted" style="margin-top:10px">
        <i class="fa-solid fa-lock"></i>
        ${Session.isViewer() ? 'Read-only viewer view.' : 'All figures recalculate from the Table API on every load.'}
      </p>
    `;

    /* ---------- actions ---------- */
    const printBtn = $('#stPrint');
    if (printBtn) printBtn.addEventListener('click', () => {
      Export.printReport('All Projects Status', CFG.group + ' · ' + rows.length + ' projects');
    });

    const csvBtn = $('#stCsv');
    if (csvBtn) csvBtn.addEventListener('click', () => {
      Export.csv('OW_all_projects_status_' + today() + '.csv', [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Project' },
        { key: 'plant', label: 'Plant' },
        { key: 'company', label: 'Company' },
        { key: 'owner', label: 'Owner' },
        { key: 'sponsor', label: 'Sponsor' },
        { key: 'budget', label: 'Budget (USD)' },
        { key: 'progress', label: 'Progress %' },
        { key: 'status', label: 'Status' },
        { key: 'savings', label: 'Savings per year (USD)' },
        { key: 'issues', label: 'Open issues' }
      ], rows.map(r => ({
        code: r.p.code, name: r.p.name, plant: r.p.factory, company: r.p.company,
        owner: r.p.owner, sponsor: r.p.sponsor,
        budget: num(r.p.capex_estimated), progress: num(r.p.progress),
        status: r.p.status, savings: num(r.p.savings_expected),
        issues: r.openRisks.length
      })));
    });
  }
})();
