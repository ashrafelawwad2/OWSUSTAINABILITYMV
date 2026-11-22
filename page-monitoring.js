/* ==========================================================================
   AXIS Platform — Implementation Monitoring & Project Management
   Schedule health, Gantt, delayed items, budget utilisation, task workload
   ========================================================================== */
'use strict';

(function () {
  const isMonitoring = document.body.getAttribute('data-page') === 'monitoring';
  const state = { category: '', company: '', view: 'progress', scope: 'active' };

  App.boot({
    page: isMonitoring ? 'monitoring' : 'management',
    title: isMonitoring ? 'Implementation Monitoring' : 'Project Management',
    crumb: isMonitoring ? 'Schedule, delivery and budget tracking' : 'Milestones, action plans and delivery control',
    render: paint
  });

  function paint(root) {
    const P = portfolio({ category: state.category, company: state.company });
    let rows = P.rows;
    if (state.scope === 'active') rows = rows.filter(r => ['In Progress', 'Not Started', 'Under Study'].includes(r.p.status));
    const t = P.totals;

    // ---- schedule health across all milestones / tasks
    const projIds = new Set(rows.map(r => r.p.id));
    const mss = S.milestones.filter(m => projIds.has(m.project_id));
    const tks = S.tasks.filter(x => projIds.has(x.project_id));
    const now = new Date(new Date().toDateString());
    const overdueMs = mss.filter(m => m.status !== 'Completed' && parseDate(m.planned_date) < now);
    const overdueTk = tks.filter(x => x.status !== 'Completed' && parseDate(x.due_date) < now);
    const blockedTk = tks.filter(x => x.status === 'Blocked');
    const overBudget = rows.filter(r => num(r.p.capex_actual) > num(r.p.capex_approved) && num(r.p.capex_approved) > 0);

    const companies = uniq(S.projects.map(p => p.company)).sort();

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>${isMonitoring ? 'Implementation Monitoring' : 'Project Management'}</h2>
          <div class="sub">${rows.length} projects in scope · ${mss.length} milestones · ${tks.length} tasks ·
            ${overdueMs.length} overdue milestones and ${overdueTk.length} overdue tasks require action</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="expMon"><i class="fa-solid fa-file-excel"></i> Export</button>
          <button class="btn btn-sm" id="printMon"><i class="fa-solid fa-print"></i> Report</button>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:14px">
        <div class="filter-bar">
          <select id="mComp"><option value="">All companies</option>
            ${companies.map(c => `<option value="${esc(c)}"${state.company === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <select id="mCat"><option value="">All categories</option>
            ${Object.keys(CATEGORIES).map(k => `<option value="${k}"${state.category === k ? ' selected' : ''}>${esc(CATEGORIES[k].label)}</option>`).join('')}</select>
          <select id="mScope">
            <option value="active"${state.scope === 'active' ? ' selected' : ''}>Active delivery only</option>
            <option value="all"${state.scope === 'all' ? ' selected' : ''}>All projects</option>
          </select>
          <button class="btn btn-sm btn-ghost" id="mReset"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        </div>
      </div>

      <div class="grid g5" style="margin-bottom:14px">
        ${UI.kpi({ label: 'Avg completion', value: Fmt.pct(rows.length ? avg(rows, r => num(r.p.progress)) : 0, 0), accent: '#16c79a',
          icon: 'bars-progress', bar: rows.length ? avg(rows, r => num(r.p.progress)) : 0, foot: rows.length + ' projects in scope' })}
        ${UI.kpi({ label: 'Overdue milestones', value: overdueMs.length, accent: '#f2545b', icon: 'clock-rotate-left',
          foot: `${mss.length} milestones total` })}
        ${UI.kpi({ label: 'Overdue tasks', value: overdueTk.length, accent: '#f5a524', icon: 'list-check',
          foot: `${blockedTk.length} blocked of ${tks.length}` })}
        ${UI.kpi({ label: 'Budget utilisation', value: Fmt.pct(t.budgetUtil, 0), accent: '#3b9bff', icon: 'sack-dollar',
          bar: t.budgetUtil, foot: `${Fmt.money(t.capexActual)} of ${Fmt.money(t.capexApproved)}` })}
        ${UI.kpi({ label: 'Budget overruns', value: overBudget.length, accent: '#9b7bff', icon: 'triangle-exclamation',
          foot: overBudget.length ? Fmt.money(sum(overBudget, r => num(r.p.capex_actual) - num(r.p.capex_approved))) + ' over approved' : 'All within budget' })}
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head">
          <h3>Delivery schedule</h3>
          <span class="ch-sub">Top milestones and tasks with progress · today marker shows current position</span>
          <div class="ch-actions">
            <div class="btn-group" id="schedToggle">
              <button data-s="milestone" class="on">Milestones</button>
              <button data-s="task">Tasks</button>
            </div>
          </div>
        </div>
        <div class="card-body"><div id="ganttBig"></div></div>
      </div>

      <div class="grid g23" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>Project progress vs plan</h3><span class="ch-sub">Time elapsed against completion</span></div>
          <div class="card-body"><div class="chart-box lg"><canvas id="chProgress"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Milestone status</h3></div>
          <div class="card-body">
            <div class="chart-box" style="height:196px"><canvas id="chMsStatus"></canvas></div>
            <div style="margin-top:12px">
              ${['Completed', 'In Progress', 'Not Started', 'Delayed', 'At Risk'].map(s => {
                const c = mss.filter(m => m.status === s).length;
                return c ? `<div class="stat-line"><span class="k">${esc(s)}</span><span class="v">${c}</span></div>` : '';
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>Project delivery register</h3>
          <span class="ch-sub">Sorted by schedule risk</span></div>
        <div id="monTable"></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Milestones requiring action</h3>
            <span class="ch-sub">${overdueMs.length} overdue</span></div>
          <div class="card-body" style="padding:11px;max-height:390px;overflow:auto">
            ${overdueMs.length ? overdueMs.sort((a, b) => parseDate(a.planned_date) - parseDate(b.planned_date)).slice(0, 10).map(m => {
              const p = S.projById.get(m.project_id);
              const late = Math.round((now - parseDate(m.planned_date)) / 86400000);
              return `<a class="alert-item" href="project.html?id=${esc(m.project_id)}&tab=timeline" style="text-decoration:none;color:inherit">
                <span class="alert-sev ${late > 45 ? 'sev-high' : 'sev-med'}"></span>
                <span class="ai-body"><span class="ai-title">${esc(m.name)}</span>
                <span class="ai-meta">${p ? esc(p.code) + ' · ' + esc(p.factory) : ''} · ${late} days overdue · ${esc(m.owner || 'unassigned')}</span></span>
                ${UI.taskBadge(m.status)}
              </a>`;
            }).join('') : UI.empty('No overdue milestones', 'Every milestone is on or ahead of schedule.', 'circle-check')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Task workload by assignee</h3>
            <span class="ch-sub">Open tasks per responsible person</span></div>
          <div class="card-body"><div class="chart-box"><canvas id="chWorkload"></canvas></div></div>
        </div>
      </div>
    `;

    /* ---- filters ---- */
    $('#mComp').addEventListener('change', e => { state.company = e.target.value; paint(root); });
    $('#mCat').addEventListener('change', e => { state.category = e.target.value; paint(root); });
    $('#mScope').addEventListener('change', e => { state.scope = e.target.value; paint(root); });
    $('#mReset').addEventListener('click', () => { state.company = state.category = ''; state.scope = 'active'; paint(root); });

    $('#printMon').addEventListener('click', () => Export.printReport(
      isMonitoring ? 'Implementation Monitoring Report' : 'Project Management Report',
      rows.length + ' projects · ' + Fmt.date(today())));

    $('#expMon').addEventListener('click', () => {
      Export.excel('AXIS_delivery_' + today() + '.xls', [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Project' },
        { key: 'factory', label: 'Facility' }, { key: 'status', label: 'Status' },
        { key: 'progress', label: 'Progress %' }, { key: 'elapsed', label: 'Time Elapsed %' },
        { key: 'variance', label: 'Schedule Variance %' },
        { key: 'milestones', label: 'Milestones' }, { key: 'msDone', label: 'Milestones Done' },
        { key: 'tasks', label: 'Tasks' }, { key: 'tasksOverdue', label: 'Overdue Tasks' },
        { key: 'capexApproved', label: 'CAPEX Approved' }, { key: 'capexActual', label: 'CAPEX Actual' },
        { key: 'budgetPct', label: 'Budget Utilisation %' },
        { key: 'plannedEnd', label: 'Planned End' }, { key: 'delayed', label: 'Delayed' }
      ], rows.map(r => {
        const mc = S.milestones.filter(m => m.project_id === r.p.id);
        const tc = S.tasks.filter(x => x.project_id === r.p.id);
        const elapsed = timeElapsed(r.p);
        return {
          code: r.p.code, name: r.p.name, factory: r.p.factory, status: r.p.status,
          progress: num(r.p.progress), elapsed: Math.round(elapsed * 100),
          variance: Math.round(num(r.p.progress) - elapsed * 100),
          milestones: mc.length, msDone: mc.filter(m => m.status === 'Completed').length,
          tasks: tc.length,
          tasksOverdue: tc.filter(x => x.status !== 'Completed' && parseDate(x.due_date) < now).length,
          capexApproved: num(r.p.capex_approved), capexActual: num(r.p.capex_actual),
          budgetPct: num(r.p.capex_approved) > 0 ? Math.round(num(r.p.capex_actual) / num(r.p.capex_approved) * 100) : 0,
          plannedEnd: r.p.planned_end, delayed: r.delayed ? 'Yes' : 'No'
        };
      }), 'Implementation Delivery Register');
    });

    /* ---- gantt ---- */
    let schedMode = 'milestone';
    function drawGantt() {
      let bars;
      if (schedMode === 'milestone') {
        bars = mss.filter(m => m.status !== 'Completed' || rndPick(m)).slice(0, 26).map(m => {
          const p = S.projById.get(m.project_id);
          return {
            label: (p ? p.code + ' · ' : '') + m.name,
            start: m.planned_date,
            end: m.actual_date || addDays(m.planned_date, 30),
            percent: m.status === 'Completed' ? 100 : m.status === 'In Progress' ? 55 : 0,
            status: m.status
          };
        });
      } else {
        bars = tks.filter(x => x.status !== 'Completed').slice(0, 26).map(x => {
          const p = S.projById.get(x.project_id);
          return {
            label: (p ? p.code + ' · ' : '') + x.name,
            start: x.start_date, end: x.due_date,
            percent: num(x.percent), status: x.status
          };
        });
      }
      Gantt.render($('#ganttBig'), bars, { from: '2025-01-01', to: '2029-12-31' });
    }
    drawGantt();
    $$('#schedToggle button').forEach(b => b.addEventListener('click', () => {
      $$('#schedToggle button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      schedMode = b.getAttribute('data-s');
      drawGantt();
    }));

    /* ---- progress vs plan scatter ---- */
    const scatter = rows.filter(r => r.p.planned_start && r.p.planned_end).map(r => {
      const elapsed = timeElapsed(r.p) * 100;
      const prog = num(r.p.progress);
      return { x: Math.round(elapsed), y: Math.round(prog), label: r.p.code + ' ' + r.p.name };
    });
    CH.make('chProgress', {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Projects',
          data: scatter,
          backgroundColor: scatter.map(s => s.y >= s.x ? '#16c79acc' : '#f2545bcc'),
          borderColor: scatter.map(s => s.y >= s.x ? '#16c79a' : '#f2545b'),
          pointRadius: 6, pointHoverRadius: 8, borderWidth: 1.5
        }, {
          type: 'line', label: 'On-plan line', data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          borderColor: '#f5a524', borderDash: [5, 4], borderWidth: 1.6,
          pointRadius: 0, fill: false
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: c => c.dataset.label === 'Projects'
                ? c.raw.label + ': ' + c.raw.y + '% done, ' + c.raw.x + '% time elapsed' : 'On-plan line'
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Time elapsed (%)' }, min: 0, max: 105, grid: { color: 'rgba(38,54,79,.42)' } },
          y: { title: { display: true, text: 'Completion (%)' }, min: 0, max: 105, grid: { color: 'rgba(38,54,79,.42)' } }
        }
      }
    });

    const msStatuses = ['Completed', 'In Progress', 'Delayed', 'At Risk', 'Not Started'];
    const msCounts = msStatuses.map(s => mss.filter(m => m.status === s).length);
    CH.doughnut('chMsStatus', msStatuses, msCounts, {
      cutout: '62%', legend: false,
      colors: ['#16c79a', '#3b9bff', '#f2545b', '#f5a524', '#64748b'],
      tooltip: { label: c => c.label + ': ' + c.parsed }
    });

    // ---- workload
    const open = tks.filter(x => x.status !== 'Completed');
    const wl = [];
    groupBy(open, x => x.assignee || 'Unassigned').forEach((list, who) => {
      wl.push({ who: who, n: list.length, overdue: list.filter(x => parseDate(x.due_date) < now).length });
    });
    wl.sort((a, b) => b.n - a.n);
    CH.hbar('chWorkload', wl.slice(0, 9).map(w => w.who.split(' ')[0] + ' ' + (w.who.split(' ')[1] || '').charAt(0)),
      wl.slice(0, 9).map(w => w.n),
      { label: 'Open tasks', colorFn: v => v > 8 ? '#f2545b' : v > 4 ? '#f5a524' : '#16c79a' });

    /* ---- delivery register ---- */
    DataTable.render($('#monTable'), {
      pageSize: 15, searchable: true, rows: rows,
      columns: [
        { key: 'code', label: 'Code', width: '88px', render: r => `<a href="project.html?id=${esc(r.p.id)}" class="mono">${esc(r.p.code)}</a>` },
        { key: 'name', label: 'Project', render: r => `<div style="min-width:200px">${esc(r.p.name)}<div class="tiny muted">${esc(r.p.factory)}</div></div>` },
        { key: 'status', label: 'Status', render: r => UI.statusBadge(r.p.status) },
        { key: 'sched', label: 'Schedule', width: '170px', render: r => {
            const el = timeElapsed(r.p) * 100;
            const pr = num(r.p.progress);
            const dev = Math.round(pr - el);
            return `<div class="tiny muted" style="margin-bottom:2px">${Fmt.pct(el, 0)} time elapsed</div>
              ${UI.prog(pr, dev < -15 ? 'bad' : dev < 0 ? 'warn' : '')}`;
          }, sortValue: r => num(r.p.progress) - timeElapsed(r.p) * 100 },
        { key: 'variance', label: 'Vs plan', align: 'right', render: r => {
            const dev = Math.round(num(r.p.progress) - timeElapsed(r.p) * 100);
            return `<span class="badge ${dev >= 0 ? 'b-green' : dev > -15 ? 'b-amber' : 'b-red'}">${dev > 0 ? '+' : ''}${dev}%</span>`;
          }, sortValue: r => num(r.p.progress) - timeElapsed(r.p) * 100 },
        { key: 'ms', label: 'Milestones', align: 'right', render: r => {
            const mc = S.milestones.filter(m => m.project_id === r.p.id);
            const done = mc.filter(m => m.status === 'Completed').length;
            const late = mc.filter(m => m.status !== 'Completed' && parseDate(m.planned_date) < now).length;
            return `${done}/${mc.length}${late ? ` <span class="badge b-red">${late} late</span>` : ''}`;
          } },
        { key: 'tasks', label: 'Tasks', align: 'right', render: r => {
            const tc = S.tasks.filter(x => x.project_id === r.p.id);
            const over = tc.filter(x => x.status !== 'Completed' && parseDate(x.due_date) < now).length;
            return `${tc.filter(x => x.status === 'Completed').length}/${tc.length}${over ? ` <span class="badge b-amber">${over}</span>` : ''}`;
          } },
        { key: 'budget', label: 'Budget', align: 'right', render: r => {
            const ap = num(r.p.capex_approved);
            const ac = num(r.p.capex_actual);
            const pct = ap > 0 ? ac / ap * 100 : 0;
            return `<div class="tiny">${Fmt.money(ac)} / ${Fmt.money(ap)}</div>${UI.prog(pct, pct > 100 ? 'bad' : '')}`;
          }, sortValue: r => num(r.p.capex_approved) > 0 ? num(r.p.capex_actual) / num(r.p.capex_approved) : 0 },
        { key: 'end', label: 'Planned end', render: r => {
            const d = Fmt.daysUntil(r.p.planned_end);
            const late = r.delayed;
            return `<span style="${late ? 'color:#ff9298' : ''}">${Fmt.dateShort(r.p.planned_end)}</span>
              ${late ? '<div class="tiny" style="color:#ff9298">' + Math.abs(d) + 'd late</div>' : (d !== null && d >= 0 && d < 45 ? '<div class="tiny muted">in ' + d + 'd</div>' : '')}`;
          }, sortValue: r => r.p.planned_end || '9999' },
        { key: 'flags', label: '', width: '46px', sortable: false, render: r =>
            r.needsAttention ? '<span class="tl tl-r" title="Needs attention"></span>' : '<span class="tl tl-g" title="On track"></span>' }
      ],
      footer: all => `<td colspan="7"><strong>${all.length} projects in scope</strong></td>
        <td class="num">${Fmt.money(sum(all, r => num(r.p.capex_actual)))} / ${Fmt.money(sum(all, r => num(r.p.capex_approved)))}</td>
        <td colspan="2"></td>`,
      emptyTitle: 'No projects in scope',
      empty: 'Change the filters or register a new project.'
    });
  }

  /* ------------------------------------------------------------------ */
  function timeElapsed(p) {
    const s = parseDate(p.actual_start || p.planned_start);
    const e = parseDate(p.actual_end || p.planned_end);
    if (!s || !e) return 0;
    const now = new Date();
    if (now >= e) return 1;
    if (now <= s) return 0;
    return (now - s) / (e - s);
  }
  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  let rndCounter = 0;
  function rndPick() { rndCounter++; return rndCounter % 3 === 0; }
})();
