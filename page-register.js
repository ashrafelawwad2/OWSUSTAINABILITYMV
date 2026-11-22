/* ==========================================================================
   AXIS Platform — Project Registration
   Full project profile creation with validation, business case and import
   ========================================================================== */
'use strict';

(function () {
  App.boot({
    page: 'register',
    title: 'Project Registration',
    crumb: 'Capture a new manufacturing initiative',
    render: paint
  });

  const SUB = {
    energy: ['Energy efficiency improvement', 'Electricity consumption reduction', 'Natural gas consumption reduction',
      'Compressed air system optimisation', 'Boiler and steam system optimisation', 'Chiller and cooling system optimisation',
      'Motors, pumps, fans and HVAC', 'Waste heat recovery', 'Energy management systems (ISO 50001)', 'Energy cost reduction'],
    sustainability: ['Renewable energy projects', 'Carbon footprint reduction', 'GHG emissions reduction (Scope 1)', 'GHG emissions reduction (Scope 2)',
      'GHG emissions reduction (Scope 3)', 'Water conservation and wastewater reuse', 'Waste reduction and recycling',
      'Circular economy initiatives', 'Environmental compliance', 'Sustainable manufacturing'],
    process: ['Production process optimisation', 'Specific energy consumption (SEC) reduction', 'Production yield improvement',
      'Waste and scrap reduction', 'Raw material optimization', 'Productivity improvement', 'Production line efficiency',
      'Automation and digitalization', 'Quality improvement'],
    facilities: ['New production facilities', 'New production lines and equipment', 'Factory expansions',
      'Infrastructure development', 'Utility system upgrades', 'New buildings and warehouses', 'Commissioning and operational readiness'],
    operations: ['Maintenance optimization', 'Reliability improvement', 'Cost reduction initiatives',
      'Operational performance improvement', 'Technology upgrades', 'Safety improvements', 'Environmental improvements']
  };

  function paint(root) {
    if (!Session.canEdit()) {
      root.innerHTML = '<div class="card card-pad">' + UI.empty('Read-only access',
        'Your session does not have permission to register or edit projects. Sign in with Administrator or Editor access to create project records.',
        'lock') + '<div style="text-align:center"><a class="btn btn-primary" href="login.html"><i class="fa-solid fa-right-to-bracket"></i> Sign in</a></div></div>';
      return;
    }

    const companies = uniq(S.projects.map(p => p.company)).sort();
    const factories = uniq(S.facilities.filter(f => f.level === 'factory').map(f => f.name)).sort();
    const departments = uniq(S.facilities.filter(f => f.level === 'department').map(f => f.name)).sort();

    root.innerHTML = `
      <div class="page-head">
        <div class="ph-txt">
          <h2>Register a New Project</h2>
          <div class="sub">Complete the profile in stages. Required fields are marked *.
            All figures feed the dashboards, M&amp;V engine and reports automatically.</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" id="tplBtn"><i class="fa-solid fa-file-arrow-down"></i> Import template</button>
          <a class="btn btn-sm btn-ghost" href="portfolio.html"><i class="fa-solid fa-xmark"></i> Cancel</a>
        </div>
      </div>

      <form id="projForm" novalidate>
        <div class="tabs" id="stageTabs">
          <button type="button" class="tab on" data-stage="1">1. General information</button>
          <button type="button" class="tab" data-stage="2">2. Timeline</button>
          <button type="button" class="tab" data-stage="3">3. Technical scope</button>
          <button type="button" class="tab" data-stage="4">4. Financials &amp; benefits</button>
          <button type="button" class="tab" data-stage="5">5. M&amp;V setup</button>
        </div>

        <!-- Stage 1 -->
        <section class="card" data-panel="1">
          <div class="card-head"><h3>General information</h3><span class="ch-sub">Identity, ownership and classification</span></div>
          <div class="card-body" id="s1"></div>
        </section>

        <!-- Stage 2 -->
        <section class="card" data-panel="2" style="display:none">
          <div class="card-head"><h3>Project timeline</h3><span class="ch-sub">Lifecycle dates from idea to M&amp;V closure</span></div>
          <div class="card-body" id="s2"></div>
        </section>

        <!-- Stage 3 -->
        <section class="card" data-panel="3" style="display:none">
          <div class="card-head"><h3>Technical scope</h3><span class="ch-sub">Existing situation, proposed improvement and specifications</span></div>
          <div class="card-body" id="s3"></div>
        </section>

        <!-- Stage 4 -->
        <section class="card" data-panel="4" style="display:none">
          <div class="card-head"><h3>Financial information and expected benefits</h3>
            <span class="ch-sub">Business case used for approval</span></div>
          <div class="card-body">
            <div id="s4"></div>
            <div class="divider"></div>
            <div id="finPreview"></div>
          </div>
        </section>

        <!-- Stage 5 -->
        <section class="card" data-panel="5" style="display:none">
          <div class="card-head"><h3>Measurement &amp; Verification setup</h3>
            <span class="ch-sub">IPMVP option, baseline and expected savings streams</span></div>
          <div class="card-body" id="s5"></div>
        </section>

        <div class="card card-pad" style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="tiny muted" id="formMsg" style="margin-right:auto">
            <i class="fa-solid fa-circle-info"></i> A unique project ID and code are generated automatically.
          </span>
          <button type="button" class="btn" id="prevStage"><i class="fa-solid fa-chevron-left"></i> Previous</button>
          <button type="button" class="btn" id="nextStage">Next <i class="fa-solid fa-chevron-right"></i></button>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Register project</button>
        </div>
      </form>
    `;

    /* ---------------- stage 1 fields ---------------- */
    const f1 = [
      { name: 'name', label: 'Project name', type: 'text', required: true, span: 2, placeholder: 'e.g. Compressed air system optimisation — Plant 2' },
      { name: 'code', label: 'Project code', type: 'text', placeholder: 'auto-generated', hint: 'Leave blank to generate from category and sequence' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: Object.keys(CATEGORIES).map(k => ({ value: k, label: CATEGORIES[k].label })) },
      { name: 'subcategory', label: 'Subcategory', type: 'select', required: true, options: SUB.energy },
      { name: 'company', label: 'Manufacturing company', type: 'select', required: true, options: companies },
      { name: 'factory', label: 'Factory / facility', type: 'select', required: true, options: factories },
      { name: 'department', label: 'Department', type: 'select', options: departments },
      { name: 'description', label: 'Project description', type: 'textarea', required: true, span: 2, rows: 3,
        placeholder: 'What will be implemented, where, and what problem does it solve?' },
      { name: 'owner', label: 'Project owner', type: 'text', required: true },
      { name: 'sponsor', label: 'Project sponsor', type: 'text' },
      { name: 'team', label: 'Project team', type: 'text', hint: 'Comma-separated names' },
      { name: 'contractor', label: 'Implementation contractor / consultant', type: 'text' },
      { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['Critical', 'High', 'Medium', 'Low'] },
      { name: 'status', label: 'Status', type: 'select', required: true, options: Object.keys(STATUS_META) }
    ];
    $('#s1').innerHTML = Form.build(f1, { priority: 'High', status: 'Idea', category: 'energy', company: companies[0], factory: factories[0] });

    /* ---------------- stage 2 fields ---------------- */
    const f2 = [
      { name: 'idea_date', label: 'Idea submission date', type: 'date' },
      { name: 'feasibility_date', label: 'Feasibility study date', type: 'date' },
      { name: 'approval_date', label: 'Approval date', type: 'date' },
      { name: 'planned_start', label: 'Planned start', type: 'date', required: true },
      { name: 'actual_start', label: 'Actual start', type: 'date' },
      { name: 'planned_end', label: 'Planned completion', type: 'date', required: true },
      { name: 'actual_end', label: 'Actual completion', type: 'date' },
      { name: 'commissioning_date', label: 'Commissioning date', type: 'date' },
      { name: 'mv_start', label: 'M&V period start', type: 'date' },
      { name: 'mv_end', label: 'M&V period end', type: 'date' },
      { name: 'progress', label: 'Overall progress (%)', type: 'number', min: 0, max: 100, step: 1, value: 0 }
    ];
    $('#s2').innerHTML = Form.build(f2, { planned_start: today() });

    /* ---------------- stage 3 fields ---------------- */
    const f3 = [
      { name: 'existing_situation', label: 'Existing situation', type: 'textarea', span: 2, rows: 3,
        placeholder: 'Baseline equipment, current performance, known inefficiencies, current consumption and costs' },
      { name: 'proposed_improvement', label: 'Proposed improvement', type: 'textarea', span: 2, rows: 3,
        placeholder: 'What will be changed, and how will it deliver the improvement?' },
      { name: 'scope', label: 'Project scope', type: 'textarea', span: 2, rows: 3,
        placeholder: 'Inclusions, exclusions, boundaries and interfaces' },
      { name: 'tech_specs', label: 'Technical specifications', type: 'textarea', span: 2, rows: 3,
        placeholder: 'Capacities, ratings, key equipment data, control philosophy' },
      { name: 'capacity_added', label: 'Capacity added', type: 'number', step: 'any', min: 0 },
      { name: 'capacity_unit', label: 'Capacity unit', type: 'text', placeholder: 'e.g. t clinker/day, packs/hour' }
    ];
    $('#s3').innerHTML = Form.build(f3);

    /* ---------------- stage 4 fields ---------------- */
    const f4 = [
      { name: 'capex_estimated', label: 'Estimated CAPEX', type: 'number', step: 'any', min: 0, required: true, hint: 'USD' },
      { name: 'capex_approved', label: 'Approved CAPEX', type: 'number', step: 'any', min: 0, hint: 'USD — leave 0 until approved' },
      { name: 'capex_actual', label: 'Actual CAPEX to date', type: 'number', step: 'any', min: 0, hint: 'USD committed or spent' },
      { name: 'opex_annual', label: 'Annual OPEX impact', type: 'number', step: 'any', min: 0, hint: 'USD/yr additional operating cost (0 if none)' },
      { name: 'savings_expected', label: 'Expected annual savings', type: 'number', step: 'any', min: 0, required: true, hint: 'USD/yr — cost reduction and benefit' },
      { name: 'production_benefit', label: 'Expected production benefits', type: 'textarea', span: 2, rows: 2,
        placeholder: 'Additional output, yield improvement, quality gain, downtime reduction' },
      { name: 'env_benefit', label: 'Expected environmental benefits', type: 'textarea', span: 2, rows: 2,
        placeholder: 'Emissions, water, waste and compliance benefits' }
    ];
    $('#s4').innerHTML = Form.build(f4, { capex_estimated: 0, capex_approved: 0, capex_actual: 0, opex_annual: 0, savings_expected: 0 });

    /* ---------------- stage 5 fields ---------------- */
    const f5 = [
      { name: 'mv_method', label: 'IPMVP option', type: 'select', options: [
        { value: 'A', label: 'Option A — Retrofit isolation: key parameter measurement' },
        { value: 'B', label: 'Option B — Retrofit isolation: all parameter measurement' },
        { value: 'C', label: 'Option C — Whole facility metering' },
        { value: 'D', label: 'Option D — Calibrated simulation' }
      ], placeholder: 'Select methodology' },
      { name: 'verification_status', label: 'Verification status', type: 'select', options: Object.keys(VERIFY_META) },
      { name: 'savings_kwh_year', label: 'Electricity savings', type: 'number', step: 'any', min: 0, hint: 'kWh/yr' },
      { name: 'savings_gas_nm3_year', label: 'Natural gas savings', type: 'number', step: 'any', min: 0, hint: 'Nm³/yr' },
      { name: 'savings_water_m3_year', label: 'Water savings', type: 'number', step: 'any', min: 0, hint: 'm³/yr' },
      { name: 'savings_waste_t_year', label: 'Waste reduction', type: 'number', step: 'any', min: 0, hint: 'tonnes/yr' },
      { name: 'sec_improvement_pct', label: 'SEC improvement', type: 'number', step: 'any', min: 0, hint: '% improvement in specific energy consumption' },
      { name: 'renewable_mwh_year', label: 'Renewable generation', type: 'number', step: 'any', min: 0, hint: 'MWh/yr' },
      { name: 'notes', label: 'Internal notes', type: 'textarea', span: 2, rows: 2 }
    ];
    $('#s5').innerHTML = Form.build(f5, { verification_status: 'Not Started' });

    /* ---------------- subcategory depends on category ---------------- */
    const catEl = $('#f_category');
    catEl.addEventListener('change', () => {
      const opts = SUB[catEl.value] || [];
      $('#f_subcategory').innerHTML = opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    });

    /* ---------------- stage navigation ---------------- */
    let stage = 1;
    function goStage(n) {
      stage = clamp(n, 1, 5);
      $$('#stageTabs .tab').forEach(t => t.classList.toggle('on', +t.getAttribute('data-stage') === stage));
      $$('[data-panel]').forEach(p => { p.style.display = (+p.getAttribute('data-panel') === stage) ? '' : 'none'; });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (stage === 4) updateFinPreview();
    }
    $$('#stageTabs .tab').forEach(t => t.addEventListener('click', () => goStage(+t.getAttribute('data-stage'))));
    $('#nextStage').addEventListener('click', () => goStage(stage + 1));
    $('#prevStage').addEventListener('click', () => goStage(stage - 1));

    /* ---------------- live financial preview ---------------- */
    function updateFinPreview() {
      const v = Form.read(root, f4);
      const tt = tariffs();
      const capex = num(v.capex_approved) || num(v.capex_estimated);
      const save = num(v.savings_expected);
      const net = save - num(v.opex_annual);
      const payback = net > 0 ? capex / net : 0;
      let npv = -capex;
      for (let i = 1; i <= tt.life; i++) npv += net / Math.pow(1 + tt.discount, i);
      const roi = capex > 0 ? ((net * tt.life) - capex) / capex * 100 : 0;
      $('#finPreview').innerHTML = `
        <div class="tiny muted" style="margin-bottom:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Live business case preview</div>
        <div class="grid g4">
          ${UI.kpi({ label: 'Simple payback', value: payback > 0 ? Fmt.dec(payback, 2) : '—', unit: 'yrs', accent: '#0ea5e9', icon: 'hourglass-half' })}
          ${UI.kpi({ label: 'Net annual benefit', value: Fmt.money(net), accent: '#16c79a', icon: 'coins' })}
          ${UI.kpi({ label: 'NPV (' + tt.life + ' yr)', value: Fmt.money(npv), accent: npv >= 0 ? '#16c79a' : '#f2545b', icon: 'chart-line' })}
          ${UI.kpi({ label: 'ROI', value: Fmt.pct(roi, 0), accent: roi >= 0 ? '#f5a524' : '#f2545b', icon: 'percent' })}
        </div>`;
    }
    ['f_capex_estimated', 'f_capex_approved', 'f_savings_expected', 'f_opex_annual'].forEach(id => {
      const el = $('#' + id);
      if (el) el.addEventListener('input', updateFinPreview);
    });

    /* ---------------- template download ---------------- */
    $('#tplBtn').addEventListener('click', () => Export.template());

    /* ---------------- submit ---------------- */
    $('#projForm').addEventListener('submit', async e => {
      e.preventDefault();
      const all = [].concat(f1, f2, f3, f4, f5);
      const missing = Form.validate(root, all);
      if (missing.length) {
        const msg = $('#formMsg');
        msg.innerHTML = '<span style="color:#ff9298"><i class="fa-solid fa-circle-exclamation"></i> Required: ' + esc(missing.join(', ')) + '</span>';
        // reveal the first stage containing a missing field
        for (const st of [1, 2, 3, 4, 5]) {
          const panel = root.querySelector('[data-panel="' + st + '"]');
          const hasMissing = missing.some(m => {
            const fld = all.find(x => x.label === m);
            return fld && panel.querySelector('#f_' + fld.name) && !panel.querySelector('#f_' + fld.name).value.trim();
          });
          if (hasMissing) { goStage(st); break; }
        }
        return;
      }

      const data = Object.assign({}, Form.read(root, f1), Form.read(root, f2), Form.read(root, f3),
        Form.read(root, f4), Form.read(root, f5));

      // generate code when blank
      if (!data.code) {
        const prefix = ({ energy: 'EN', sustainability: 'SU', process: 'PR', facilities: 'NF', operations: 'OP' })[data.category] || 'GP';
        const existing = S.projects.filter(p => String(p.code).indexOf(prefix + '-') === 0).length;
        data.code = prefix + '-' + String(existing + 1).padStart(2, '0');
      }
      // uniqueness
      if (S.projects.some(p => p.code.toUpperCase() === String(data.code).toUpperCase())) {
        err('Project code ' + data.code + ' already exists. Choose a different code.');
        return;
      }

      const tt = tariffs();
      data.capex_estimated = num(data.capex_estimated);
      data.capex_approved = num(data.capex_approved);
      data.capex_actual = num(data.capex_actual);
      data.opex_annual = num(data.opex_annual);
      data.savings_expected = num(data.savings_expected);
      data.progress = num(data.progress);
      data.capacity_added = num(data.capacity_added);
      data.savings_kwh_year = num(data.savings_kwh_year);
      data.savings_gas_nm3_year = num(data.savings_gas_nm3_year);
      data.savings_water_m3_year = num(data.savings_water_m3_year);
      data.savings_waste_t_year = num(data.savings_waste_t_year);
      data.sec_improvement_pct = num(data.sec_improvement_pct);
      data.renewable_mwh_year = num(data.renewable_mwh_year);
      data.ghg_avoided_tco2e = Math.round((data.savings_kwh_year * tt.efElec + data.savings_gas_nm3_year * tt.efGas) / 1000);
      data.payback_expected = num(data.savings_expected) > 0
        ? +((num(data.capex_approved) || num(data.capex_estimated)) / num(data.savings_expected)).toFixed(2) : 0;
      data.id = 'prj-' + uuid().slice(0, 12);
      data.created_at = Date.now();
      data.updated_at = Date.now();

      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
      try {
        await API.create('projects', data);
        await audit('Create', 'project', data.id, 'Registered ' + data.code + ' — ' + data.name);
        ok('Project ' + data.code + ' registered successfully');
        location.href = 'project.html?id=' + encodeURIComponent(data.id);
      } catch (ex) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Register project';
        err('Registration failed: ' + ex.message);
      }
    });
  }
})();
