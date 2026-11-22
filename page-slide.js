/* ==========================================================================
   Oriental Weavers — Executive slide (whole portfolio on one slide)
   --------------------------------------------------------------------------
   One 16:9 deck slide covering every project: portfolio KPIs, the full
   project register, the status split and group energy performance.

   Geometry is fixed at 1400x788 design units and scaled to the viewport, so
   it reads as a slide rather than a stretched web page, and prints as one
   landscape page.

   Every figure is computed from the Table API via portfolio() — nothing here
   is a hardcoded dashboard number.
   ========================================================================== */
'use strict';

(function () {

  const W = 1400, H = 788;

  App.boot({
    page: 'slide',
    title: 'Executive Slide',
    crumb: 'Oriental Weavers Group · one slide, all projects',
    async render(root) {
      paint(root);
    }
  });

  /* Explicit lookup so composed strings are translated before they are
     rendered (the DOM walk in i18n.js then covers anything left over). */
  const T = s => (typeof I18N !== 'undefined' ? I18N.t(s) : s);

  function paint(root) {
    const P = portfolio({});
    const t = P.totals;
    const perf = (typeof energyPerf === 'function') ? energyPerf() : null;
    const period = Fmt.period(setting('energy_report_period', '2026-10'));

    const rows = P.rows.slice().sort((a, b) =>
      String(a.p.code || '').localeCompare(String(b.p.code || ''), undefined, { numeric: true }));

    const stOrder = Object.keys(STATUS_META).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);

    const budgetByStatus = {};
    stOrder.forEach(k => { budgetByStatus[k] = 0; });
    rows.forEach(r => {
      budgetByStatus[r.p.status] = (budgetByStatus[r.p.status] || 0) + num(r.p.capex_estimated);
    });

    const plants = uniq(rows.map(r => r.p.factory)).length;

    /* ---------- KPI strip ---------- */
    const kpis = [
      { l: 'Total projects', v: Fmt.int(t.count), f: `<b>${t.inProgress}</b> ${T('In Progress')} · <b>${t.completed}</b> ${T('Completed')}`, a: '#1B2A6B' },
      { l: 'Total portfolio budget', v: Fmt.money(t.budgetTotal), f: `${t.count} ${T('projects')}`, a: '#1B2A6B' },
      { l: 'Active budget', v: Fmt.money(t.budgetActive), f: `${t.activeCount} ${T('projects')}`, a: '#1E7B96' },
      { l: 'Average completion', v: Fmt.pct(t.avgProgressActive, 0), f: `Budget-weighted · ${t.avgProgressActiveCount}`, a: '#2E7D32' },
      { l: 'Completed', v: Fmt.int(t.completed), f: Fmt.money(budgetByStatus.Completed || 0) + ' ' + T('Total').toLowerCase(), a: '#2E7D32' },
      { l: 'Needs attention', v: Fmt.int(t.attention), f: `${t.criticalRisks} ${T('Critical')} · ${t.openRisks} ${T('Open')}`, a: '#C53030' }
    ].map(k => `
      <div class="skpi" style="--sk-accent:${k.a}">
        <div class="sk-l">${esc(T(k.l))}</div>
        <div class="sk-v">${k.v}</div>
        <div class="sk-f">${k.f}</div>
      </div>`).join('');

    /* ---------- full project register, split across two columns ---------- */
    const half = Math.ceil(rows.length / 2);
    const cols = [rows.slice(0, half), rows.slice(half)];

    const headCells = `
      <thead><tr>
        <th style="width:38px">${esc(T('Code'))}</th>
        <th>${esc(T('Project'))}</th>
        <th style="text-align:right;width:52px">${esc(T('Budget'))}</th>
        <th style="width:44px">${esc(T('Progress'))}</th>
        <th style="width:66px">${esc(T('Status'))}</th>
      </tr></thead>`;

    const tbl = chunk => `
      <table class="slide-tbl">
        ${headCells}
        <tbody>
          ${chunk.map(r => {
            const p = r.p;
            const st = STATUS_META[p.status] || { color: '#8C92A4' };
            const prog = clamp(num(p.progress), 0, 100);
            return `<tr>
              <td class="c">${esc(p.code || '')}</td>
              <td class="pj" title="${esc(p.name || '')}">${esc(p.name || '')}</td>
              <td class="n">${num(p.capex_estimated) > 0 ? Fmt.money(p.capex_estimated) : '—'}</td>
              <td>
                <div class="mini"><i style="width:${prog}%;background:${st.color}"></i></div>
              </td>
              <td class="st"><span class="sdot" style="background:${st.color}"></span>${esc(T(p.status || ''))}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    /* ---------- status breakdown ---------- */
    const stack = stOrder
      .filter(k => (budgetByStatus[k] || 0) > 0)
      .map(k => `<i style="width:${((budgetByStatus[k] / (t.budgetTotal || 1)) * 100).toFixed(2)}%;background:${STATUS_META[k].color}" title="${esc(T(k))}"></i>`)
      .join('');

    const statusRows = stOrder
      .filter(k => (t.byStatus[k] || 0) > 0 || (budgetByStatus[k] || 0) > 0)
      .map(k => `
        <div class="sld-row">
          <span class="sdot" style="background:${STATUS_META[k].color}"></span>
          <span class="sr-l">${esc(T(k))}</span>
          <span class="sr-n">${t.byStatus[k] || 0}</span>
          <span class="sr-b">${Fmt.money(budgetByStatus[k] || 0)}</span>
        </div>`).join('');

    /* ---------- group energy, compact ---------- */
    let energyHtml = '';
    if (perf) {
      const cur = perf.currency || CFG.energyCurrency || 'EGP';
      const pct = num(perf.cost_savings_target_pct);
      const items = perf.metrics.map(m => {
        const ok = m.on_target !== false;
        return `<div class="sld-en ${ok ? 'ok' : 'bad'}">
          <span class="se-l">${esc(T(m.label))}</span>
          <span class="se-v">${esc(m.display)}</span>
          <span class="se-t">/ ${esc(m.target_display)}</span>
        </div>`;
      }).join('');

      energyHtml = `
        <div class="slide-panel" style="flex:1">
          <div class="sp-head">
            <h3>${esc(T('Group energy performance'))}</h3>
            <span class="sp-meta">${esc(Fmt.period(perf.period))}</span>
          </div>
          <div class="sp-body">
            ${items}
            <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid var(--line)">
              <strong style="font-size:12.5px;color:#1B2A6B">${cur} ${Fmt.dec(num(perf.cost_savings_ytd_m_egp), 1)}m</strong>
              <span class="tiny muted">${esc(T('cost savings YTD'))} · ${Fmt.pct(pct, 0)} ${esc(T('of target'))}</span>
            </div>
            <div class="mini" style="height:4px;margin-top:4px;min-width:0">
              <i style="width:${clamp(pct, 0, 100)}%;background:#1B2A6B"></i>
            </div>
          </div>
        </div>`;
    }

    /* ---------- shell ---------- */
    root.innerHTML = `
      <div class="page-head no-print">
        <div class="ph-txt">
          <h2>${esc(T('Executive summary — all projects'))}</h2>
          <div class="sub">${esc(T('One slide for the whole portfolio'))} · ${rows.length} ${esc(T('projects'))} ·
            ${esc(T('as reported'))} ${esc(period)}</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="slFit"><i class="fa-solid fa-expand"></i> ${esc(T('Fit to screen'))}</button>
          <button class="btn btn-sm" id="slPrint"><i class="fa-solid fa-file-pdf"></i> ${esc(T('Download as PDF'))}</button>
          <a class="btn btn-sm" href="status.html"><i class="fa-solid fa-table-columns"></i> ${esc(T('All Projects Status'))}</a>
        </div>
      </div>

      <div class="slide-scaler" id="slideScaler">
        <section class="slide" id="execSlide" aria-label="${esc(T('Project portfolio executive summary'))}">

          <header class="slide-head">
            <div class="sh-brand">
              <div class="sh-mark">OW</div>
              <div>
                <div class="sh-co">${esc(T('Oriental Weavers'))}</div>
                <div class="sh-div">${esc(T('Sustainability & Process Improvement'))}</div>
              </div>
            </div>
            <div>
              <h2>${esc(T('Project portfolio executive summary'))}</h2>
              <div class="sh-sub">${esc(T('Portfolio at a glance'))} · ${rows.length} ${esc(T('projects across'))} ${plants} ${esc(T('plants'))}</div>
            </div>
            <div class="sh-right">
              <span class="sh-period"><i class="fa-solid fa-calendar-days"></i> ${esc(period)}</span>
              <div class="sh-note">${esc(T('Source'))}: OW monthly reporting · M&amp;V register</div>
            </div>
          </header>

          <div class="slide-kpis">${kpis}</div>

          <div class="slide-main">
            <div class="slide-panel">
              <div class="sp-head">
                <h3>${esc(T('All projects'))}</h3>
                <span class="sp-meta">${rows.length} ${esc(T('projects'))} · ${esc(T('sorted by project code'))}</span>
              </div>
              <div class="sp-body">
                <div class="slide-split">
                  ${tbl(cols[0])}
                  ${tbl(cols[1])}
                </div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;min-height:0">
              <div class="slide-panel" style="flex:0 0 auto">
                <div class="sp-head">
                  <h3>${esc(T('Status distribution'))}</h3>
                  <span class="sp-meta">${esc(T('count and budget per status'))}</span>
                </div>
                <div class="sp-body">
                  <div class="sld-stack">${stack}</div>
                  <div class="sld-rows">${statusRows}</div>
                </div>
              </div>
              ${energyHtml}
            </div>
          </div>

          <footer class="slide-foot">
            <span>${esc(T('Prepared by'))}: ${esc(CFG.dept)}</span>
            <span class="sf-sep">|</span>
            <span>${esc(T('All figures recalculate from the Table API on every load.'))}</span>
            <span class="sf-right">${esc(CFG.group)}</span>
          </footer>

        </section>
      </div>
    `;

    fit();
    wireScale();
    actions(rows, t);
  }

  /* ------------------------------------------------------------------ */
  /*  Scale the fixed slide into the available width                     */
  /* ------------------------------------------------------------------ */
  function fit() {
    const scaler = document.getElementById('slideScaler');
    const slide = document.getElementById('execSlide');
    if (!scaler || !slide) return;

    /* Narrow screens reflow the slide into a stacked document (see the
       max-width:980px block in style.css). Scaling a 1400px slide to a phone
       would technically "fit" but at ~26% it is unreadable, so leave it be. */
    if (window.innerWidth <= 980) {
      slide.style.transform = '';
      scaler.style.height = '';
      slide.dataset.scale = 'reflow';
      return;
    }

    const avail = scaler.clientWidth || scaler.parentElement.clientWidth;
    const scale = Math.min(1, avail / W);
    slide.style.transform = 'scale(' + scale + ')';
    scaler.style.height = Math.round(H * scale) + 'px';
    slide.dataset.scale = String(scale);
  }

  function wireScale() {
    const scaler = document.getElementById('slideScaler');
    if (!scaler || scaler.__wired) return;
    scaler.__wired = true;

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => fit()).observe(scaler);
    }
    window.addEventListener('resize', fit);
    // Web fonts change metrics after first paint; re-fit once they land.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */
  function actions(rows, t) {
    const printBtn = document.getElementById('slPrint');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    const fitBtn = document.getElementById('slFit');
    if (fitBtn) fitBtn.addEventListener('click', () => {
      const slide = document.getElementById('execSlide');
      if (!document.fullscreenElement) {
        (slide.requestFullscreen ? slide.requestFullscreen() : Promise.reject())
          .then(() => { fit(); window.dispatchEvent(new Event('resize')); })
          .catch(() => UI.toast('Full screen is not available in this browser', 'info'));
      } else {
        document.exitFullscreen().then(fit);
      }
    });
  }
})();
