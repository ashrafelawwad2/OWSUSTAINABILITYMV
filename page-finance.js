/* ==========================================================================
   AXIS Platform — Financial Performance
   CAPEX, savings, payback, NPV/IRR, portfolio investment appraisal
   ========================================================================== */
'use strict';

(function () {
  const state = { category: '', company: '' };

  App.boot({
    page: 'finance',
    title: 'Financial Performance',
    crumb: 'Investment, savings and return on capital',
    render: paint
  });

  function paint(root) {
    const P = portfolio({ category: state.category, company: state.company });
    const rows = P.rows;
    const t = P.totals;
    const tt = tariffs();
    const companies = uniq(S.projects.map(p => p.company)).sort();

    // portfolio-level appraisal
    const totalCapex = t.capexActual || t.capexApproved;
    const annualBenefit = t.savingsActual || t.savingsExpected;
    let npv = -totalCapex;
    for (let i = 1; i <= tt.life; i++) npv += annualBenefit / Math.pow(1 + tt.discount, i);
    let irr = null;
    if (totalCapex > 0 && annualBenefit > 0) {
      let lo = -0.9, hi = 3;
      const f = x => { let v = -totalCapex; for (let i = 1; i <= tt.life; i++) v += annualBenefit / Math.pow(1 + x, i); return v; };
      if (f(lo) * f(hi) < 0) {
        for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
        irr = (lo + hi) / 2 * 100;
      }
    }
    const portfolioPayback = annualBenefit > 0 ? totalCapex / annualBenefit : 0;
    const portfolioRoi = totalCapex > 0 ? ((annualBenefit * tt.life) - totalCapex) / totalCapex * 100 : 0;

    // annual cash flow curve
    const years = ['Y0'], cum = [-totalCapex], annual = [0];
    let running = -totalCapex;
    for (let i = 1; i <= tt.life; i++) { running += annualBenefit; years.push('Y' + i); cum.push(Math.round(running)); annual.push(Math.round(annualBenefit)); }

    // by company
    const compRows = [];
    groupBy(rows, r => r.p.company).forEach((list, co) => {
      const capex = sum(list, r => r.fin.capex);
      const expected = sum(list, r => num(r.p.savings_expected));
      const measured = sum(list, r => r.mv.annual.cost);
      const verified = sum(list, r => r.mv.verified.cost);
      compRows.push({
        company: co, n: list.length, capex: capex, expected: expected, measured: measured,
        verified: verified, payback: measured > 0 ? capex / measured : 0,
        achievement: expected > 0 ? measured / expected * 100 : 0,
        npv: (() => { let v = -capex; for (let i = 1; i <= tt.life; i++) v += measured / Math.pow(1 + tt.discount, i); return v; })()
      });
    });
    compRows.sort((a, b) => b.measured - a.measured);

    // payback distribution
    const buckets = { '< 1 year': 0, '1–2 years': 0, '2–3 years': 0, '3–5 years': 0, '5+ years': 0, 'Not attractive': 0 };
    rows.forEach(r => {
      const pb = r.fin.payback;
      if (!pb || pb <= 0) { buckets['Not attractive']++; return; }
      if (pb < 1) buckets['< 1 year']++;
      else if (pb < 2) buckets['1–2 years']++;
      else if (pb < 3) buckets['2–3 years']++;
      else if (pb < 5) buckets['3–5 years']++;
      else buckets['5+ years']++;
    });

    // variance analysis: approved vs actual capex
    const overruns = rows.filter(r => num(r.p.capex_approved) > 0 && num(r.p.capex_actual) > num(r.p.capex_approved));
    const underspend = rows.filter(r => num(r.p.capex_approved) > 0 && num(r.p.capex_actual) < num(r.p.capex_approved) * 0.9 && r.p.status === 'Completed');

    // bubble: capex vs payback, size by savings
    const bubbles = rows.filter(r => r.fin.capex > 0 && r.fin.payback).map(r => ({
      x: +r.fin.payback.toFixed(2),
      y: Math.round(r.mv.achievement || 0),
      r: clamp(Math.sqrt(r.fin.capex / 60000), 4, 26),
      label: r.p.code + ' ' + r.p.name.slice(0, 28),
      col: (CATEGORIES[r.p.category] || {}).color || '#16c79a'
    }));

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Financial Performance</h2>
          <div class="sub">${rows.length} projects · ${Fmt.moneyFull(t.capexActual)} spent of ${Fmt.moneyFull(t.capexApproved)} approved ·
            ${Fmt.moneyFull(t.savingsActual)} measured annual benefit</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="finExp"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button class="btn btn-sm" id="finPrint"><i class="fa-solid fa-print"></i> Report</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:14px">
        <div class="filter-bar">
          <select id="fComp2"><option value="">All companies</option>
            ${companies.map(c => `<option value="${esc(c)}"${state.company === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select id="fCat2"><option value="">All categories</option>
            ${Object.keys(CATEGORIES).map(k => `<option value="${k}"${state.category === k ? ' selected' : ''}>${esc(CATEGORIES[k].label)}</option>`).join('')}</select>
          <button class="btn btn-sm btn-ghost" id="fReset"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        </div>
      </div>

      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Approved investment', value: Fmt.money(t.capexApproved), accent: '#3b9bff', icon: 'sack-dollar',
          foot: Fmt.money(t.capexEstimated) + ' initially estimated' })}
        ${UI.kpi({ label: 'Actual expenditure', value: Fmt.money(t.capexActual), accent: '#0ea5e9', icon: 'money-bill-transfer',
          bar: t.budgetUtil, foot: Fmt.pct(t.budgetUtil, 0) + ' utilised · ' + Fmt.money(t.remainingBudget) + ' remaining' })}
        ${UI.kpi({ label: 'Measured benefit', value: Fmt.money(t.savingsActual), accent: '#16c79a', icon: 'chart-line',
          foot: Fmt.pct(t.achievement, 0) + ' of ' + Fmt.money(t.savingsExpected) + ' expected' })}
        ${UI.kpi({ label: 'Portfolio NPV', value: Fmt.money(npv), accent: npv >= 0 ? '#16c79a' : '#f2545b', icon: 'coins',
          foot: tt.life + ' years at ' + Fmt.pct(tt.discount * 100, 0) })}
        ${UI.kpi({ label: 'Portfolio IRR', value: irr !== null ? Fmt.pct(irr, 1) : '—', accent: '#9b7bff', icon: 'percent',
          foot: 'Measured benefit basis' })}
      </div>

      <div class="grid g4" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Simple payback', value: portfolioPayback > 0 ? Fmt.dec(portfolioPayback, 1) : '—', unit: 'yrs', accent: '#f5a524', icon: 'hourglass-half' })}
        ${UI.kpi({ label: 'ROI over life', value: Fmt.pct(portfolioRoi, 0), accent: '#16c79a', icon: 'arrow-trend-up' })}
        ${UI.kpi({ label: 'Verified benefit', value: Fmt.money(t.savingsVerified), accent: '#9b7bff', icon: 'certificate',
          foot: Fmt.pct(t.verifyRate, 0) + ' of measured' })}
        ${UI.kpi({ label: 'Budget overruns', value: overruns.length, accent: '#f2545b', icon: 'triangle-exclamation',
          foot: overruns.length ? Fmt.money(sum(overruns, r => num(r.p.capex_actual) - num(r.p.capex_approved))) + ' above approval' : 'None' })}
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Portfolio cash flow</h3>
            <span class="ch-sub">Cumulative net position over the ${tt.life}-year economic life</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="finCash"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Payback distribution</h3></div>
          <div class="card-body">
            <div class="chart-box" style="height:200px"><canvas id="finPb"></canvas></div>
            <div style="margin-top:12px">
              ${Object.keys(buckets).map(k => `<div class="stat-line"><span class="k">${esc(k)}</span><span class="v">${buckets[k]}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>CAPEX vs measured benefit by company</h3></div>
          <div class="card-body"><div class="chart-box"><canvas id="finComp"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Investment risk map</h3>
            <span class="ch-sub">Payback (x) against achievement (y) · bubble size = CAPEX</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="finBubble"></canvas></div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Company-level financial summary</h3></div>
        <div id="finCompTable"></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Project investment register</h3>
          <span class="ch-sub">Full financial detail by project</span></div>
        <div id="finTable"></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Budget overruns requiring approval</h3></div>
          <div class="card-body" style="padding:11px;max-height:330px;overflow:auto">
            ${overruns.length ? overruns.sort((a, b) =>
              (num(b.p.capex_actual) - num(b.p.capex_approved)) - (num(a.p.capex_actual) - num(a.p.capex_approved))
            ).map(r => {
              const over = num(r.p.capex_actual) - num(r.p.capex_approved);
              return `<a class="alert-item" href="project.html?id=${esc(r.p.id)}&tab=finance" style="text-decoration:none;color:inherit">
                <span class="alert-sev sev-high"></span>
                <span class="ai-body"><span class="ai-title">${esc(r.p.code)} — ${esc(r.p.name)}</span>
                <span class="ai-meta">${Fmt.moneyFull(over)} over · ${Fmt.pct(num(r.p.capex_actual) / num(r.p.capex_approved) * 100, 0)} utilisation</span></span>
              </a>`;
            }).join('') : UI.empty('No overruns', 'Every project is within its approved budget.', 'circle-check')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>High-return opportunities</h3>
            <span class="ch-sub">Fastest payback projects</span></div>
          <div class="card-body" style="padding:10px">
            <div class="rank-list">
              ${rows.filter(r => r.fin.payback && r.fin.payback > 0).sort((a, b) => a.fin.payback - b.fin.payback).slice(0, 7).map((r, i) => `
                <a class="rank-item" href="project.html?id=${esc(r.p.id)}&tab=finance" style="color:inherit;text-decoration:none">
                  <span class="rank-no">${i + 1}</span>
                  <span class="rank-name">${esc(r.p.name)}</span>
                  <span class="rank-val" style="color:#4fe0bb">${Fmt.dec(r.fin.payback, 1)} yr</span>
                </a>`).join('') || UI.empty('No data', 'Complete project financials to see payback ranking.', 'coins')}
            </div>
          </div>
        </div>
      </div>
    `;

    $('#fComp2').addEventListener('change', e => { state.company = e.target.value; paint(root); });
    $('#fCat2').addEventListener('change', e => { state.category = e.target.value; paint(root); });
    $('#fReset').addEventListener('click', () => { state.company = state.category = ''; paint(root); });
    $('#finPrint').addEventListener('click', () => Export.printReport('Financial Performance Report', rows.length + ' projects'));

    const finCols = [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
      { key: 'company', label: 'Company' }, { key: 'factory', label: 'Facility' },
      { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' },
      { key: 'capexEstimated', label: 'CAPEX Estimated' },
      { key: 'capexApproved', label: 'CAPEX Approved' },
      { key: 'capexActual', label: 'CAPEX Actual' },
      { key: 'variance', label: 'Budget Variance' },
      { key: 'expected', label: 'Expected Savings /yr' },
      { key: 'measured', label: 'Measured Savings /yr' },
      { key: 'verified', label: 'Verified Savings /yr' },
      { key: 'payback', label: 'Payback Years' },
      { key: 'npv', label: 'NPV' }, { key: 'irr', label: 'IRR %' }, { key: 'roi', label: 'ROI %' }
    ];
    const finRows = () => rows.map(r => ({
      code: r.p.code, name: r.p.name, company: r.p.company, factory: r.p.factory,
      category: CATEGORIES[r.p.category] ? CATEGORIES[r.p.category].label : r.p.category,
      status: r.p.status,
      capexEstimated: num(r.p.capex_estimated), capexApproved: num(r.p.capex_approved),
      capexActual: num(r.p.capex_actual),
      variance: num(r.p.capex_actual) - num(r.p.capex_approved),
      expected: num(r.p.savings_expected),
      measured: Math.round(r.mv.annual.cost), verified: Math.round(r.mv.verified.cost),
      payback: r.fin.payback ? +r.fin.payback.toFixed(2) : '',
      npv: Math.round(r.fin.npv), irr: r.fin.irr !== null ? +r.fin.irr.toFixed(1) : '',
      roi: Math.round(r.fin.roi)
    }));
    $('#finExp').addEventListener('click', () => Export.excel('AXIS_financial_' + today() + '.xls', finCols, finRows(), 'Financial Performance Report'));

    /* ---- charts ---- */
    CH.mixed('finCash', years,
      [{ label: 'Cumulative net cash flow', data: cum, color: '#16c79a' }],
      [{ label: 'Annual benefit', data: annual, color: '#3b9bff', axis: 'y1' }],
      { tooltip: { label: c => Fmt.moneyFull(c.parsed.y) } });

    const bk = Object.keys(buckets).filter(k => buckets[k] > 0);
    CH.doughnut('finPb', bk, bk.map(k => buckets[k]), {
      cutout: '62%', legend: false,
      colors: bk.map(k => k === '< 1 year' ? '#16c79a' : k === '1–2 years' ? '#4fd1c5' : k === '2–3 years' ? '#3b9bff' :
        k === '3–5 years' ? '#f5a524' : k === '5+ years' ? '#9b7bff' : '#64748b'),
      tooltip: { label: c => c.label + ': ' + c.parsed }
    });

    CH.bar('finComp', compRows.map(c => c.company.replace('Horizon ', '')),
      [
        { label: 'CAPEX actual', data: compRows.map(c => c.capex), color: '#3b9bff' },
        { label: 'Measured benefit/yr', data: compRows.map(c => c.measured), color: '#16c79a' }
      ], { tooltip: { label: c => c.dataset.label + ': ' + Fmt.money(c.parsed.y) } });

    if (bubbles.length) {
      CH.bubble('finBubble', bubbles, {
        label: 'Projects',
        axes: {
          x: { title: { display: true, text: 'Payback (years)' }, min: 0, grid: { color: 'rgba(38,54,79,.42)' } },
          y: { title: { display: true, text: 'Achievement (%)' }, min: 0, max: 140, grid: { color: 'rgba(38,54,79,.42)' } }
        }
      });
    } else {
      $('#finBubble').parentElement.innerHTML = UI.empty('Insufficient data', 'Projects need CAPEX and measured savings.', 'chart-scatter');
    }

    DataTable.render($('#finCompTable'), {
      pageSize: 10, searchable: false, rows: compRows,
      columns: [
        { key: 'company', label: 'Company', render: c => '<strong>' + esc(c.company) + '</strong>' },
        { key: 'n', label: 'Projects', align: 'right' },
        { key: 'capex', label: 'CAPEX actual', align: 'right', render: c => Fmt.money(c.capex) },
        { key: 'expected', label: 'Expected /yr', align: 'right', render: c => Fmt.money(c.expected) },
        { key: 'measured', label: 'Measured /yr', align: 'right', render: c => `<strong>${Fmt.money(c.measured)}</strong>` },
        { key: 'verified', label: 'Verified /yr', align: 'right', render: c => Fmt.money(c.verified) },
        { key: 'achievement', label: 'Achieve', align: 'right', render: c =>
            `<span class="badge ${c.achievement >= 95 ? 'b-green' : c.achievement >= 80 ? 'b-amber' : 'b-red'}">${Fmt.pct(c.achievement, 0)}</span>` },
        { key: 'payback', label: 'Payback', align: 'right', render: c => c.payback ? Fmt.dec(c.payback, 1) + 'y' : '—' },
        { key: 'npv', label: 'NPV', align: 'right', render: c => Fmt.money(c.npv) }
      ]
    });

    DataTable.render($('#finTable'), {
      pageSize: 15, searchable: true, rows: rows,
      columns: [
        { key: 'code', label: 'Code', width: '82px', render: r => `<a href="project.html?id=${esc(r.p.id)}&tab=finance" class="mono">${esc(r.p.code)}</a>` },
        { key: 'name', label: 'Project', render: r => `<div style="min-width:200px">${esc(r.p.name)}<div class="tiny muted">${esc(r.p.company)}</div></div>` },
        { key: 'est', label: 'Estimated', align: 'right', render: r => Fmt.money(r.p.capex_estimated), sortValue: r => num(r.p.capex_estimated) },
        { key: 'appr', label: 'Approved', align: 'right', render: r => Fmt.money(r.p.capex_approved), sortValue: r => num(r.p.capex_approved) },
        { key: 'act', label: 'Actual', align: 'right', render: r => Fmt.money(r.p.capex_actual), sortValue: r => num(r.p.capex_actual) },
        { key: 'var', label: 'Variance', align: 'right', render: r => {
            const v = num(r.p.capex_actual) - num(r.p.capex_approved);
            if (!num(r.p.capex_approved)) return '<span class="muted">—</span>';
            return `<span style="color:${v > 0 ? '#ff9298' : '#4fe0bb'}">${v > 0 ? '+' : ''}${Fmt.money(v)}</span>`;
          }, sortValue: r => num(r.p.capex_actual) - num(r.p.capex_approved) },
        { key: 'meas', label: 'Measured /yr', align: 'right', render: r => r.mv.hasData ? Fmt.money(r.mv.annual.cost) : '—', sortValue: r => r.mv.annual.cost },
        { key: 'pb', label: 'Payback', align: 'right', render: r => r.fin.payback ? Fmt.dec(r.fin.payback, 1) + 'y' : '—', sortValue: r => r.fin.payback || 999 },
        { key: 'npv', label: 'NPV', align: 'right', render: r => Fmt.money(r.fin.npv), sortValue: r => r.fin.npv },
        { key: 'irr', label: 'IRR', align: 'right', render: r => r.fin.irr !== null ? Fmt.pct(r.fin.irr, 1) : '—', sortValue: r => r.fin.irr || -999 },
        { key: 'roi', label: 'ROI', align: 'right', render: r => Fmt.pct(r.fin.roi, 0), sortValue: r => r.fin.roi }
      ],
      footer: all => `<td colspan="2"><strong>Total (${all.length})</strong></td>
        <td class="num">${Fmt.money(sum(all, r => num(r.p.capex_estimated)))}</td>
        <td class="num">${Fmt.money(sum(all, r => num(r.p.capex_approved)))}</td>
        <td class="num">${Fmt.money(sum(all, r => num(r.p.capex_actual)))}</td>
        <td class="num">${Fmt.money(sum(all, r => num(r.p.capex_actual) - num(r.p.capex_approved)))}</td>
        <td class="num">${Fmt.money(sum(all, r => r.mv.annual.cost))}</td>
        <td class="num">${Fmt.money(sum(all, r => r.fin.npv))}</td><td colspan="3"></td>`,
      emptyTitle: 'No projects'
    });
  }
})();
