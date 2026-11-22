/* ==========================================================================
   Oriental Weavers — Projects, Monitoring & M&V Platform — Core dataset
   --------------------------------------------------------------------------
   Source material (loaded from the supplied decks):
     • "OW Sustainability Monthly Report Oct. 26_AE" — group energy performance
       (NG, electricity, renewable and EGP cost KPIs, Oct-2026 YTD)
     • "OW_Monthly_Executive_Report_Nov_2026"       — process improvement and
       optimisation programme updates (coating & shearing, raw material, fleet
       reform, new projects, quality)
     • OW Projects Dashboard / Project Detail slides — the 21 capital projects
       with plant, budget, progress and status as reported.

   Guard rails:
     • Fixed row ids  -> the bootstrap is idempotent and resumable.
     • Deterministic PRNG -> generated series are reproducible.
     • Every figure rendered by the UI is recalculated from these rows; no
       dashboard value is hardcoded in the page code.
   ========================================================================== */
'use strict';

const Seed = (function () {

  const DATASET_VERSION = 'ow-2026-11';

  /* --------------------------- deterministic PRNG --------------------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let rnd = mulberry32(20261115);
  const rr = (lo, hi) => lo + rnd() * (hi - lo);
  const ri = (lo, hi) => Math.round(rr(lo, hi));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  /* ==========================================================================
     ORGANISATION — Oriental Weavers Group -> companies -> plants -> departments
     Plant names are taken from the projects dashboard.
     ========================================================================== */
  const FACILITIES = [
    ['id-ow-group', 'group', 'Oriental Weavers Group', 'OW', '',
      'Cairo, Egypt', 'EG', 26000, 'Group holding — carpets, yarns, home textiles'],

    ['id-ow-carpets', 'company', 'Oriental Weavers Carpets', 'OWC', 'id-ow-group',
      '10th of Ramadan City, Egypt', 'EG', 16500, 'Broadloom, tile and printed carpet'],
    ['id-ow-intl', 'company', 'Oriental Weavers International', 'OWI', 'id-ow-group',
      '10th of Ramadan City, Egypt', 'EG', 5200, 'Yarn spinning, twisting and heat-setting'],
    ['id-ow-tapes', 'company', 'Oriental Weavers Tapes', 'OWT', 'id-ow-group',
      '10th of Ramadan City, Egypt', 'EG', 1800, 'Narrow fabrics, tapes and technical textiles'],
    ['id-ow-logistics', 'company', 'OW Logistics & Warehousing', 'OWL', 'id-ow-group',
      'Sadat City, Egypt', 'EG', 2500, 'Finished goods warehousing and distribution'],

    ['id-ow-kingtut', 'factory', 'King Tut', 'OWC-KT', 'id-ow-carpets',
      '10th of Ramadan City, Egypt', 'EG', 2600, 'Printed and piece-dyed carpet plant'],
    ['id-ow-horus', 'factory', 'Horus', 'OWC-HR', 'id-ow-carpets',
      '10th of Ramadan City, Egypt', 'EG', 2100, 'Velvet and cut-pile carpet plant'],
    ['id-ow-axminster', 'factory', 'Axminister F. Hall', 'OWC-AX', 'id-ow-carpets',
      '10th of Ramadan City, Egypt', 'EG', 1400, 'Axminster weaving hall'],
    ['id-ow-ramses', 'factory', 'Ramses', 'OWC-RM', 'id-ow-carpets',
      'Sadat City, Egypt', 'EG', 2300, 'Shearing, coating and finishing complex'],
    ['id-ow-bcf1', 'factory', 'BCF 1', 'OWC-B1', 'id-ow-carpets',
      '10th of Ramadan City, Egypt', 'EG', 1900, 'Bulked continuous filament line 1 — Superba halls'],
    ['id-ow-bcf23', 'factory', 'BCF 2 & 3', 'OWC-B2', 'id-ow-carpets',
      '10th of Ramadan City, Egypt', 'EG', 2400, 'Bulked continuous filament lines 2 and 3'],
    ['id-ow-owi', 'factory', 'OWI', 'OWI-PL', 'id-ow-intl',
      '10th of Ramadan City, Egypt', 'EG', 3200, 'Spinning, twisting and heat-setting'],
    ['id-ow-owt', 'factory', 'OWT', 'OWT-PL', 'id-ow-tapes',
      '10th of Ramadan City, Egypt', 'EG', 1800, 'Tapes and narrow fabric plant'],
    ['id-ow-ikea', 'factory', 'IKEA WH', 'OWL-IK', 'id-ow-logistics',
      'Sadat City, Egypt', 'EG', 900, 'Dedicated IKEA finished-goods warehouse'],
    ['id-ow-tbd', 'factory', 'TBD', 'OW-TBD', 'id-ow-group',
      'Not yet allocated', 'EG', 0, 'Plant allocation pending for projects under study'],

    ['id-ow-dep-energy', 'department', 'Sustainability & Energy', 'DEP-SE', 'id-ow-group',
      'Group', 'EG', 0, 'Energy performance, M&V and decarbonisation'],
    ['id-ow-dep-process', 'department', 'Process Improvement', 'DEP-PI', 'id-ow-group',
      'Group', 'EG', 0, 'Process development and optimisation programme'],
    ['id-ow-dep-eng', 'department', 'Engineering & Projects', 'DEP-EP', 'id-ow-group',
      'Group', 'EG', 0, 'Capital project delivery'],
    ['id-ow-dep-ops', 'department', 'Operations', 'DEP-OP', 'id-ow-group',
      'Group', 'EG', 0, 'Plant operations and handling'],
    ['id-ow-dep-sc', 'department', 'Supply Chain', 'DEP-SC', 'id-ow-group',
      'Group', 'EG', 0, 'Logistics, fleet and warehousing'],
    ['id-ow-dep-qa', 'department', 'Quality', 'DEP-QA', 'id-ow-group',
      'Group', 'EG', 0, 'Quality assurance and laboratory']
  ];

  /* ==========================================================================
     21 CAPITAL PROJECTS — plant, budget (USD), progress and status as reported
     on the OW Project Detail slide (October 2026).
     ========================================================================== */
  const PROJECTS = [

    /* 1 */
    {
      code: 'OW-01', name: 'Polyester Yarns Plant', plant: 'King Tut',
      company: 'Oriental Weavers Carpets', category: 'facilities',
      subcategory: 'New production capacity',
      department: 'Engineering & Projects',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Critical', status: 'In Progress', progress: 90,
      budget: 7300000, savings: 2600000,
      start: '2025-02-01', end: '2027-03-31', actual_start: '2025-02-17',
      mv_method: 'C', verification: 'In Progress',
      kwh: 0, gas: 1250000, water: 0, waste: 0, sec_pct: 6.4,
      capex_unit: 'tonnes/yr', capex_qty: 18000,
      contractor: 'Oerlikon Neumag / local EPC',
      description: 'Greenfield polyester yarn plant serving the carpet backing and face-yarn demand that is currently imported. Covers polymerisation, spinning, drawing and texturising with a dedicated natural-gas thermal package. At 90% completion the plant is in commissioning, with utility tie-ins and performance testing remaining.',
      updates: 'Commissioning and utility tie-ins in progress; savings will be recognised once the line reaches stable production.'
    },
    /* 2 */
    {
      code: 'OW-02', name: 'Digital Printing', plant: 'King Tut',
      company: 'Oriental Weavers Carpets', category: 'process',
      subcategory: 'Printing technology upgrade',
      department: 'Process Improvement',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'Under Study', progress: 0,
      budget: 6280000, savings: 1900000,
      start: '2026-11-01', end: '2028-06-30', actual_start: '',
      mv_method: 'C', verification: 'Not Started',
      kwh: 2100000, gas: 0, water: 90000, waste: 0, sec_pct: 4.2,
      capex_unit: '', capex_qty: 0,
      contractor: 'Reggiani Macchine / SPGPrints',
      description: 'Replacement of rotary-screen printing at King Tut with single-pass digital printing. Delivers short-run flexibility, sharp pattern registration and a material step-change in water and paste consumption. Per the November executive report the project is heading for financial approval, with technical data submitted to project management.',
      updates: 'Nov-2026: heading for financial approval. TBR data submitted to project management for the investment case.'
    },
    /* 3 */
    {
      code: 'OW-03', name: 'Velvet Project', plant: 'Horus',
      company: 'Oriental Weavers Carpets', category: 'facilities',
      subcategory: 'New production capacity',
      department: 'Engineering & Projects',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'In Progress', progress: 25,
      budget: 5320000, savings: 1450000,
      start: '2026-03-01', end: '2027-12-31', actual_start: '2026-03-23',
      mv_method: 'B', verification: 'Not Started',
      kwh: 1850000, gas: 320000, water: 0, waste: 0, sec_pct: 3.1,
      capex_unit: 'm²/yr', capex_qty: 2400000,
      contractor: 'Van de Wiele / Superba',
      description: 'New velvet (cut-pile) carpet range at Horus including loom installation, backing line upgrade and finishing capacity. At 25% completion the first loom bay is installed and the coating and shearing configuration is being finalised with the process team.',
      updates: 'Nov-2026: coating and shearing configuration being agreed; humidity monitoring installed on line 1 is part of the finishing scope control.'
    },
    /* 4 */
    {
      code: 'OW-04', name: 'Axminister Capacity Increasing', plant: 'Axminister F. Hall',
      company: 'Oriental Weavers Carpets', category: 'facilities',
      subcategory: 'Capacity expansion',
      department: 'Engineering & Projects',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'In Progress', progress: 5,
      budget: 3800000, savings: 950000,
      start: '2026-09-01', end: '2028-03-31', actual_start: '2026-09-14',
      mv_method: 'B', verification: 'Not Started',
      kwh: 1250000, gas: 0, water: 0, waste: 0, sec_pct: 2.4,
      capex_unit: 'm²/yr', capex_qty: 900000,
      contractor: 'Vandewiele',
      description: 'Additional Axminster weaving capacity in the Axminister F. Hall to shorten lead times on the contract and hospitality order book. At 5% completion the order is placed and the civil and utility works package is being tendered.',
      updates: 'Nov-2026: equipment order placed; hall civil works in tender.'
    },
    /* 5 */
    {
      code: 'OW-05', name: '5 MW On-site Solar', plant: 'OWI',
      company: 'Oriental Weavers International', category: 'sustainability',
      subcategory: 'Renewable energy',
      department: 'Sustainability & Energy',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'In Progress', progress: 10,
      budget: 2500000, savings: 620000,
      start: '2026-06-01', end: '2027-09-30', actual_start: '2026-06-18',
      mv_method: 'B', verification: 'Not Started',
      kwh: 8900000, gas: 0, water: 0, waste: 0, sec_pct: 5.8,
      capex_unit: 'kWp', capex_qty: 5000,
      contractor: 'Scatec / local EPC',
      description: '5 MW rooftop and carport photovoltaic plant at OWI under a self-consumption model, offsetting grid import on the spinning and heat-setting load. At 10% completion the interconnection study is approved and the mounting structure design is complete. Renewable output is metered separately for M&V under IPMVP Option B.',
      updates: 'Contributes to the group renewable energy savings KPI; generation is metered at the inverter for monthly M&V.'
    },
    /* 6 */
    {
      code: 'OW-06', name: 'Air Tangle', plant: 'OWI / King Tut',
      company: 'Oriental Weavers International', category: 'process',
      subcategory: 'Yarn process optimisation',
      department: 'Process Improvement',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'In Progress', progress: 5,
      budget: 800000, savings: 240000,
      start: '2026-08-01', end: '2027-08-31', actual_start: '2026-08-19',
      mv_method: 'B', verification: 'Not Started',
      kwh: 620000, gas: 0, water: 0, waste: 0, sec_pct: 2.9,
      capex_unit: '', capex_qty: 0,
      contractor: 'Hills / SSM',
      description: 'Air-tangle interlacing installed on the yarn path between OWI spinning and King Tut twisting to replace conventional sizing knots. Reduces yarn breaks, improves crease recovery and removes a thermal process step. At 5% completion a single-position trial is running.',
      updates: 'Nov-2026: VAC latex trial shows a strong crease-recovery gain; interlacing parameters being aligned with the latex trial results.'
    },
    /* 7 */
    {
      code: 'OW-07', name: 'Racks + VNA RMWH', plant: 'King Tut',
      company: 'Oriental Weavers Carpets', category: 'operations',
      subcategory: 'Warehouse and handling',
      department: 'Supply Chain',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'In Progress', progress: 25,
      budget: 600000, savings: 180000,
      start: '2026-05-01', end: '2027-06-30', actual_start: '2026-05-21',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: 'pallet positions', capex_qty: 4200,
      contractor: 'Kardex / local racking supplier',
      description: 'Very-narrow-aisle racking and a raw-material warehouse re-layout at King Tut, increasing pallet positions within the existing footprint and cutting forklift travel distance. At 25% completion the racking drawings are approved.',
      updates: 'Nov-2026: fleet reform master plan integrates the VNA truck requirement, replacing part of the diesel fleet.'
    },
    /* 8 */
    {
      code: 'OW-08', name: 'Racks + VNA RMWH (OWT)', plant: 'OWT',
      company: 'Oriental Weavers Tapes', category: 'operations',
      subcategory: 'Warehouse and handling',
      department: 'Supply Chain',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Low', status: 'Cancelled', progress: 0,
      budget: 600000, savings: 170000,
      start: '2026-04-01', end: '2027-03-31', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: 'pallet positions', capex_qty: 0,
      contractor: '',
      description: 'Mirror of the King Tut racking and VNA project at the OWT tapes plant. Cancelled in the October 2026 portfolio review after the OWT volume forecast was revised; budget released back to the group.',
      updates: 'Cancelled — superseded by the consolidated King Tut raw-material warehouse plan.'
    },
    /* 9 */
    {
      code: 'OW-09', name: '30% Forklift Electrification (10 units)', plant: 'OWI',
      company: 'Oriental Weavers International', category: 'sustainability',
      subcategory: 'Fleet decarbonisation',
      department: 'Supply Chain',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'Not Started', progress: 0,
      budget: 256000, savings: 92000,
      start: '2026-12-01', end: '2027-12-31', actual_start: '',
      mv_method: 'A', verification: 'Not Started',
      kwh: 410000, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: 'units', capex_qty: 10,
      contractor: 'Toyota Material Handling / Linde',
      description: 'Replacement of 10 diesel counterbalance forklifts with electric units plus charger infrastructure, covering 30% of the OWI fleet. Forms part of the fleet reform master plan. Measured under IPMVP Option A using nameplate and operating-hour stipulation.',
      updates: 'Nov-2026: fleet reform master plan issued; 90% of RFQs are out and the vendor quote review is due 16/11.'
    },
    /* 10 */
    {
      code: 'OW-10', name: 'Handling Equipment', plant: 'OWI',
      company: 'Oriental Weavers International', category: 'operations',
      subcategory: 'Warehouse and handling',
      department: 'Operations',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Low', status: 'Not Started', progress: 0,
      budget: 150000, savings: 45000,
      start: '2026-12-15', end: '2027-09-30', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: 'units', capex_qty: 14,
      contractor: '',
      description: 'Additional beam trolleys, yarn stillages and roll handling equipment at OWI to remove manual double-handling between spinning and the yarn store. Scheduled to start once the fleet reform RFQ round closes.',
      updates: 'Nov-2026: scope frozen pending the fleet quote review on 16/11.'
    },
    /* 11 */
    {
      code: 'OW-11', name: 'Ventilation Superba Halls', plant: 'BCF 1',
      company: 'Oriental Weavers Carpets', category: 'energy',
      subcategory: 'HVAC and ventilation',
      department: 'Sustainability & Energy',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'In Progress', progress: 90,
      budget: 125000, savings: 38000,
      start: '2025-11-01', end: '2026-12-31', actual_start: '2025-11-19',
      mv_method: 'B', verification: 'In Progress',
      kwh: 540000, gas: 0, water: 0, waste: 0, sec_pct: 1.9,
      capex_unit: '', capex_qty: 0,
      contractor: 'Local HVAC contractor',
      description: 'Mechanical ventilation retrofit in the Superba heat-setting halls at BCF 1, replacing uncontrolled roof extraction with balanced supply and extract and variable-speed fans. Improves operative comfort and cuts fan energy. At 90% completion the ducting is installed and commissioning is under way.',
      updates: 'Nov-2026: heat-recovery option for the extract air is in discussion with vendors as a follow-on scope.'
    },
    /* 12 */
    {
      code: 'OW-12', name: 'BCF 2&3 Energy Digitalization', plant: 'BCF 2 & 3',
      company: 'Oriental Weavers Carpets', category: 'energy',
      subcategory: 'Energy monitoring and digitalisation',
      department: 'Sustainability & Energy',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'In Progress', progress: 10,
      budget: 100000, savings: 90000,
      start: '2026-07-01', end: '2027-06-30', actual_start: '2026-07-16',
      mv_method: 'C', verification: 'Not Started',
      kwh: 1450000, gas: 210000, water: 0, waste: 0, sec_pct: 2.2,
      capex_unit: '', capex_qty: 0,
      contractor: 'Schneider Electric EcoStruxure',
      description: 'Sub-metering and energy digitalisation across BCF lines 2 and 3: line-level electricity and gas metering, automatic data collection and dashboards feeding the group energy platform. Creates the measurement boundary for subsequent energy projects. At 10% completion meter locations are agreed.',
      updates: 'Nov-2026: MES and weight-measuring projects in discussion with vendors; the digitalisation scope is the data backbone for both.'
    },
    /* 13 */
    {
      code: 'OW-13', name: 'IKEA WH Handling Improvement', plant: 'IKEA WH',
      company: 'OW Logistics & Warehousing', category: 'operations',
      subcategory: 'Warehouse and handling',
      department: 'Supply Chain',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Low', status: 'Cancelled', progress: 0,
      budget: 100000, savings: 30000,
      start: '2026-02-01', end: '2027-01-31', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: '', capex_qty: 0,
      contractor: '',
      description: 'Handling and layout improvement at the dedicated IKEA warehouse. Cancelled in the October 2026 review; the IKEA operational requirement is being met through the existing layout instead.',
      updates: 'Cancelled — budget released.'
    },
    /* 14 */
    {
      code: 'OW-14', name: 'VOC Control in Shearing Halls Ramses', plant: 'Ramses',
      company: 'Oriental Weavers Carpets', category: 'sustainability',
      subcategory: 'Emissions control and compliance',
      department: 'Sustainability & Energy',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'High', status: 'Completed', progress: 100,
      budget: 45000, savings: 60000,
      start: '2025-06-01', end: '2026-04-30', actual_start: '2025-06-15', end_actual: '2026-04-21',
      mv_method: 'C', verification: 'Verified',
      kwh: 120000, gas: 0, water: 0, waste: 0, sec_pct: 1.2,
      capex_unit: '', capex_qty: 0,
      contractor: 'Local environmental contractor',
      description: 'Extraction and control of volatile organic compounds in the Ramses shearing halls, combining local exhaust ventilation with an activated-carbon polishing stage. Completed and verified; the investment is dominated by compliance value rather than energy savings.',
      updates: 'Completed and verified. Delivers the VOC compliance obligation for the shearing halls.'
    },
    /* 15 */
    {
      code: 'OW-15', name: 'Ramses Birds Control Net', plant: 'Ramses',
      company: 'Oriental Weavers Carpets', category: 'operations',
      subcategory: 'Plant housekeeping and compliance',
      department: 'Operations',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Low', status: 'Completed', progress: 100,
      budget: 20000, savings: 12000,
      start: '2025-09-01', end: '2025-12-31', actual_start: '2025-09-10', end_actual: '2026-01-14',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: '', capex_qty: 0,
      contractor: 'Local contractor',
      description: 'Bird-control netting over the Ramses yarn store and finished-goods yard to protect product quality and satisfy hygiene audit findings. Completed.',
      updates: 'Completed.'
    },
    /* 16 */
    {
      code: 'OW-16', name: 'Install Production Water Sub-meter', plant: 'OWI',
      company: 'Oriental Weavers International', category: 'energy',
      subcategory: 'Metering and measurement',
      department: 'Sustainability & Energy',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'Completed', progress: 100,
      budget: 20000, savings: 26000,
      start: '2025-10-01', end: '2026-03-31', actual_start: '2025-10-12', end_actual: '2026-03-18',
      mv_method: 'A', verification: 'Verified',
      kwh: 0, gas: 0, water: 185000, waste: 0, sec_pct: 0,
      capex_unit: '', capex_qty: 0,
      contractor: 'Local instrumentation contractor',
      description: 'Permanent sub-metering of the production water supply at OWI, separating process water from domestic and irrigation use. Establishes the measurement boundary for water savings verification under IPMVP Option A. Completed and verified.',
      updates: 'Completed and verified; water baseline now reported monthly.'
    },
    /* 17 */
    {
      code: 'OW-17', name: 'Tri Generation', plant: 'OWI',
      company: 'Oriental Weavers International', category: 'energy',
      subcategory: 'On-site generation',
      department: 'Engineering & Projects',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'In Progress', progress: 15,
      budget: 0, savings: 480000,
      start: '2026-09-01', end: '2028-06-30', actual_start: '2026-09-28',
      mv_method: 'B', verification: 'Not Started',
      kwh: 5200000, gas: 0, water: 0, waste: 0, sec_pct: 7.2,
      capex_unit: 'MWe', capex_qty: 4.5,
      contractor: 'Under tender',
      description: 'Combined heat and power (tri-generation) unit at OWI supplying electricity, process steam and chilled water from a single gas engine. Budget is still to be fixed: the investment figure is not yet on the approved portfolio, so the project is carried at zero budget in the October 2026 dashboard. At 15% completion the feasibility and heat-load study is under way.',
      updates: 'Nov-2026: heat-load and electrical-load profiles being confirmed with project management before the investment case is submitted.'
    },
    /* 18 */
    {
      code: 'OW-18', name: 'TPR Backcoating Line', plant: 'TBD',
      company: 'Oriental Weavers Carpets', category: 'process',
      subcategory: 'Coating and shearing',
      department: 'Process Improvement',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'Under Study', progress: 0,
      budget: 0, savings: 0,
      start: '2027-01-01', end: '2028-12-31', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: '', capex_qty: 0,
      contractor: '',
      description: 'Thermoplastic rubber (TPR) backcoating line to replace part of the latex backing capacity, giving a recyclable mono-material carpet construction. Plant not yet allocated (TBD) and budget not yet fixed; carried as Under Study in the October 2026 portfolio.',
      updates: 'Nov-2026: mono-polymer recycling trials succeeded, which supports the recyclable-backing case. Vendor discussions on coating, weight-measuring and heat recovery are in progress.'
    },
    /* 19 */
    {
      code: 'OW-19', name: '2 New Loop Looms', plant: 'TBD',
      company: 'Oriental Weavers Carpets', category: 'facilities',
      subcategory: 'Capacity expansion',
      department: 'Engineering & Projects',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Medium', status: 'Under Study', progress: 0,
      budget: 0, savings: 0,
      start: '2027-01-01', end: '2028-06-30', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: 'looms', capex_qty: 2,
      contractor: '',
      description: 'Two additional loop-pile looms to serve the contract and hospitality loop ranges. Plant allocation and budget are still to be determined, so the project is Under Study with no approved investment in the October 2026 portfolio.',
      updates: 'Nov-2026: TBR data with project management for the business case.'
    },
    /* 20 */
    {
      code: 'OW-20', name: 'Space Dye', plant: 'TBD',
      company: 'Oriental Weavers International', category: 'process',
      subcategory: 'Yarn dyeing technology',
      department: 'Process Improvement',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Low', status: 'Under Study', progress: 0,
      budget: 0, savings: 0,
      start: '2027-03-01', end: '2028-12-31', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: '', capex_qty: 0,
      contractor: '',
      description: 'Space-dyeing capability for multi-colour yarn effects, substituting batch dyeing with a continuous process that has significant water and thermal saving potential. Plant not yet allocated and budget not yet fixed.',
      updates: 'Nov-2026: under study; the VAC latex and mono-polymer trial results feed the yarn specification.'
    },
    /* 21 */
    {
      code: 'OW-21', name: 'Superba', plant: 'TBD',
      company: 'Oriental Weavers Carpets', category: 'process',
      subcategory: 'Heat-setting capacity',
      department: 'Process Improvement',
      owner: 'Ashraf Elawwad', sponsor: 'Maged Mamdouh',
      priority: 'Low', status: 'Under Study', progress: 0,
      budget: 0, savings: 0,
      start: '2027-03-01', end: '2029-03-31', actual_start: '',
      mv_method: '', verification: 'Not Started',
      kwh: 0, gas: 0, water: 0, waste: 0, sec_pct: 0,
      capex_unit: '', capex_qty: 0,
      contractor: '',
      description: 'Additional Superba heat-setting capacity to support the BCF yarn growth plan. Plant allocation (TBD) and budget are not yet fixed, so the project is Under Study in the October 2026 portfolio.',
      updates: 'Nov-2026: under study; heat-recovery scope from the Superba hall ventilation project would be replicated.'
    }
  ];

  /* ==========================================================================
     NOVEMBER 2026 PROCESS IMPROVEMENT PROGRAMME
     Action items taken from the OW Monthly Executive Report, each attached to
     the capital project it belongs to.
     ========================================================================== */
  const PROGRAMME_TASKS = {
    'OW-02': [
      ['Submit TBR technical data package to project management', 'Ashraf Elawwad', '2026-11-20', 'In Progress', 70,
        'Nov-2026 executive report: TBR data with project management.'],
      ['Prepare financial approval pack for digital print', 'Maged Mamdouh', '2026-12-05', 'In Progress', 55,
        'Nov-2026 executive report: digital print heading for financial approval.']
    ],
    'OW-03': [
      ['Resolve humidity sensor installation issue on coating line 1', 'Maged Mamdouh', '2026-11-28', 'Blocked', 40,
        'Nov-2026: continuous humidity reading installed on line 1, installation issues found — vendor to fix.'],
      ['Agree MES and weight-measuring scope with vendors', 'Ashraf Elawwad', '2026-12-12', 'In Progress', 25,
        'Nov-2026: MES and weight-measuring projects in discussion with vendors.'],
      ['Run VAC latex trial evaluation on crease recovery', 'Maged Mamdouh', '2026-11-30', 'Completed', 100,
        'Nov-2026: VAC latex trial shows strong crease-recovery gain.']
    ],
    'OW-06': [
      ['Validate VAC latex crease-recovery gain on production yarn', 'Ashraf Elawwad', '2026-12-08', 'In Progress', 45,
        'Nov-2026: VAC latex trial shows strong crease-recovery gain; production validation next.']
    ],
    'OW-09': [
      ['Close out fleet reform RFQ round (90% issued)', 'Maged Mamdouh', '2026-11-16', 'In Progress', 90,
        'Nov-2026: master plan issued, 90% of RFQs out, vendor quote review due 16/11.'],
      ['Complete vendor quote review for electric forklifts', 'Ashraf Elawwad', '2026-11-16', 'Not Started', 0,
        'Nov-2026: vendor quote review due 16/11.']
    ],
    'OW-11': [
      ['Evaluate heat recovery from Superba hall extracts', 'Ashraf Elawwad', '2027-01-15', 'In Progress', 30,
        'Nov-2026: heat-recovery project in discussion with vendors.'],
      ['Commission ventilation retrofit in Superba halls', 'Maged Mamdouh', '2026-12-20', 'In Progress', 85,
        'Ducting installed; commissioning under way.']
    ],
    'OW-12': [
      ['Agree MES interface specification with vendor', 'Ashraf Elawwad', '2026-12-12', 'In Progress', 20,
        'Nov-2026: MES project in discussion with vendors.'],
      ['Install line-level meters on BCF lines 2 and 3', 'Maged Mamdouh', '2027-02-28', 'Not Started', 0,
        'Meter locations agreed; procurement next.']
    ],
    'OW-14': [
      ['Obtain metal detector quotes for shearing halls', 'Maged Mamdouh', '2026-12-15', 'In Progress', 35,
        'Nov-2026: metal detector quotes pending; due 15/12.'],
      ['Issue incoming latex laboratory equipment list', 'Ashraf Elawwad', '2026-12-15', 'In Progress', 40,
        'Nov-2026: incoming latex lab equipment list due 15/12.']
    ],
    'OW-17': [
      ['Confirm heat and electrical load profile for tri-generation', 'Ashraf Elawwad', '2027-02-15', 'In Progress', 40,
        'Required before the investment case is submitted.']
    ],
    'OW-18': [
      ['Confirm vendor scope for coating, weight-measuring and heat recovery', 'Maged Mamdouh', '2027-01-31', 'In Progress', 30,
        'Nov-2026: coating, weight-measuring and heat-recovery projects in discussion with vendors.'],
      ['Confirm mono-polymer recycling trial outcome for backcoating', 'Ashraf Elawwad', '2026-12-10', 'Completed', 100,
        'Nov-2026: mono-polymer recycling trials succeeded.']
    ],
    'OW-19': [
      ['Complete TBR data for two new loop looms', 'Maged Mamdouh', '2026-12-19', 'In Progress', 50,
        'Nov-2026: TBR data with project management.']
    ]
  };

  /* --------------------------- milestone templates --------------------------- */
  const MILESTONES = {
    energy: ['Baseline established and approved', 'Feasibility study approved', 'Detailed design and BOQ',
      'Equipment procurement', 'Installation and commissioning', 'M&V verification report'],
    sustainability: ['Feasibility and permitting', 'Investment case approved', 'Engineering and procurement',
      'Construction and installation', 'Commissioning and metering', 'Independent M&V verification'],
    process: ['Baseline measurement campaign', 'Process audit and solution design', 'Pilot trial and validation',
      'Full rollout', 'Performance validation', 'Savings verification'],
    facilities: ['Concept and feasibility', 'Detailed design and permits', 'Procurement and contracts',
      'Construction works', 'Commissioning and handover', 'Operational readiness review'],
    operations: ['Assessment and baseline', 'Solution design', 'Pilot deployment', 'Rollout',
      'Benefits realisation review', 'Closure and lessons learned']
  };

  const TASK_TPL = {
    energy: ['Establish measurement baseline', 'Complete technical audit', 'Prepare specification and tender',
      'Install equipment', 'Commission and meter', 'Validate savings against baseline'],
    sustainability: ['Site survey and feasibility', 'Secure permits and grid approval', 'Finalise investment case',
      'Procure main equipment', 'Install and connect', 'Verify performance with independent M&V'],
    process: ['Establish process baseline', 'Root-cause analysis', 'Design trial protocol', 'Execute pilot trial',
      'Roll out to full production', 'Validate with production and quality data'],
    facilities: ['Prepare feasibility study', 'Appoint design consultant', 'Obtain permits', 'Execute supply contract',
      'Manage construction progress', 'Conduct commissioning and handover'],
    operations: ['Map current handling flow', 'Agree target layout', 'Procure equipment', 'Implement on site',
      'Train operators', 'Review realised benefit']
  };

  const RISK_TPL = {
    energy: [
      ['Technical', 'Metering boundary does not isolate project savings', 3, 3,
        'Install dedicated sub-metering before commissioning and agree the IPMVP boundary in writing.'],
      ['Financial', 'Energy tariff reform in Egypt changes the payback', 3, 4,
        'Model sensitivity at a higher tariff and retain the savings guarantee in the contract.'],
      ['Schedule', 'Import lead times for European equipment', 3, 3,
        'Place the order early and evaluate regional suppliers.']
    ],
    sustainability: [
      ['Compliance', 'Grid interconnection approval delays self-consumption', 4, 4,
        'Engage the utility early and submit the interconnection study before procurement.'],
      ['Financial', 'Currency devaluation raises imported component cost', 4, 4,
        'Lock EPC pricing in EGP where possible and hold contingency in USD.'],
      ['Technical', 'Actual PV yield below the simulation', 2, 4,
        'Contract a performance-ratio guarantee with liquidated damages.']
    ],
    process: [
      ['Technical', 'Product quality deviates during the trial', 3, 4,
        'Run the trial on a single line with quarantined output and a QA sampling plan.'],
      ['Operational', 'Humidity sensor installation faults delay readings', 4, 3,
        'Vendor to rectify the installation issue; interim handheld readings retained.'],
      ['Schedule', 'Vendor lead time on MES and weight-measuring scope', 3, 3,
        'Freeze scope and agree a delivery milestone with the vendor.']
    ],
    facilities: [
      ['Financial', 'CAPEX escalation from imported machinery and FX', 4, 4,
        'Fix 70% of the cost through a lump-sum supply contract and hold 10% contingency.'],
      ['Schedule', 'Permitting and authority approvals', 3, 4,
        'Appoint a permitting consultant and parallel-track early works.'],
      ['Contractual', 'Contractor performance on civil works', 3, 4,
        'Milestone-linked payments, performance bond and weekly progress reviews.']
    ],
    operations: [
      ['Operational', 'Operator adoption of the new handling routine', 3, 3,
        'Embed change management, nominate champions in each area and publish KPIs.'],
      ['Technical', 'Fleet charging capacity at the plant substation', 3, 3,
        'Confirm charger load with the electrical team before ordering units.'],
      ['Financial', 'Benefit attribution contested by plant finance', 2, 3,
        'Agree the benefit baseline and attribution rules with finance before the start.']
    ]
  };

  const DECISIONS = [
    ['Approve financial release for the digital printing investment case', 3, 4,
      'Financial approval pack to be submitted once TBR data is confirmed.'],
    ['Award the electric forklift package after the 16/11 quote review', 3, 3,
      'Compare the 90% RFQ round responses on total cost of ownership.'],
    ['Confirm plant allocation and budget for the TBD projects', 4, 4,
      'Requires a capacity plan before the investment committee can approve.'],
    ['Agree the MES and weight-measuring vendor for coating and shearing', 3, 3,
      'Technical and commercial comparison to be completed with the process team.'],
    ['Approve the heat-recovery scope as a follow-on to the Superba ventilation works', 2, 3,
      'Confirm the extract-air heat load before committing.']
  ];

  /* --------------------------- helpers --------------------------- */
  function addMonths(dateStr, n) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }
  function periodBack(n) {
    const d = new Date(2026, 9, 1);   // anchoring period: Oct 2026
    d.setMonth(d.getMonth() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function isDelayedSafe(p) {
    if (!p.planned_end) return false;
    if (p.status === 'Completed' || p.status === 'Cancelled' || p.status === 'Under Study') return false;
    return p.planned_end < '2026-11-15';
  }

  /* --------------------------- bulk insert --------------------------- */
  /**
   * Idempotent parallel insert: skips rows whose id already exists so a
   * partially completed bootstrap can safely be re-run without duplicating.
   */
  async function bulk(table, rows, say, label) {
    if (!rows.length) return 0;
    let existing = new Set();
    try {
      const have = await API.all(table);
      existing = new Set(have.map(r => r.id));
    } catch (e) { /* table empty or unreachable */ }

    const fresh = rows.filter(r => !existing.has(r.id));
    const skipped = rows.length - fresh.length;
    if (skipped) say(label + ': ' + skipped + ' rows already present');

    const BATCH = 20;
    let done = 0;
    for (let i = 0; i < fresh.length; i += BATCH) {
      const slice = fresh.slice(i, i + BATCH);
      await Promise.all(slice.map(r => API.create(table, r).catch(e => {
        // duplicate id or transient failure — do not abort the whole bootstrap
        console.warn('insert skipped', table, r.id, e.message);
        return null;
      })));
      done += slice.length;
      if (label) say(label + ': ' + done + '/' + fresh.length);
    }
    return done;
  }

  /* ==========================================================================
     GROUP ENERGY PERFORMANCE — October 2026 YTD
     Values from "OW Sustainability Monthly Report Oct. 26_AE".
     Stored in the settings table so the UI reads it from the database and
     never from a hardcoded page constant.
     ========================================================================== */
  const ENERGY_PERF = {
    period: '2026-10',
    title: 'OW Energy Cost Performance',
    currency: 'EGP',
    cost_savings_ytd_m_egp: 10.0,
    cost_savings_target_pct: 53,
    metrics: [
      {
        key: 'ng_saved', label: 'NG saved — YTD', short: 'NG saved', unit: 'm³', better: 'higher',
        ytd: 462000, target: 224000, display: '462k m³', target_display: '224k m³',
        baseline_note: '2025 Adjusted BL: 421 million EGP', on_target: true
      },
      {
        key: 'ng_consumption', label: 'NG consumption — YTD', short: 'NG consumed', unit: 'm³', better: 'lower',
        ytd: 10740000, target: 11208000, display: '10,740k m³', target_display: '11,208k m³',
        baseline_note: '2025 Adjusted BL: 421 million EGP', on_target: true
      },
      {
        key: 'elec_savings', label: 'Electricity savings — YTD', short: 'Electricity saved', unit: 'MWh', better: 'higher',
        ytd: -993, target: 3924, display: '-993 MWh', target_display: '3,924 MWh',
        baseline_note: '2025 Adjusted BL: 133.3 million EGP', on_target: false,
        flag: 'Below target — negative saving against the electricity baseline'
      },
      {
        key: 'grid_elec', label: 'Grid electricity consumption — YTD', short: 'Grid electricity', unit: 'GWh', better: 'lower',
        ytd: 193.5, target: 188.7, display: '193.5 GWh', target_display: '188.7 GWh',
        baseline_note: '2025 Adjusted BL: 133.3 million EGP', on_target: false,
        flag: 'Above target — grid draw exceeds the consumption allowance'
      },
      {
        key: 're_savings', label: 'RE savings — YTD', short: 'Renewable saved', unit: 'MWh', better: 'higher',
        ytd: 3702, target: 3583, display: '3,702 MWh', target_display: '3,583 MWh',
        baseline_note: 'Renewable self-generation', on_target: true
      }
    ]
  };

  /* --------------------------- generation --------------------------- */
  async function run(onProgress) {
    const say = m => { if (onProgress) onProgress(m); };
    rnd = mulberry32(20261115);   // reset for reproducibility

    /* 1. facilities / org hierarchy */
    say('Creating Oriental Weavers organisation hierarchy…');
    const facRows = FACILITIES.map(f => ({
      id: f[0], level: f[1], name: f[2], code: f[3], parent_id: f[4],
      location: f[5], country: f[6], headcount: f[7], notes: f[8]
    }));
    await bulk('facilities', facRows, say, 'facilities');

    /* 2. projects */
    say('Registering ' + PROJECTS.length + ' Oriental Weavers projects…');
    const projects = PROJECTS.map((src, idx) => {
      const p = {
        id: 'prj-ow-' + src.code.slice(3).toLowerCase(),
        dataset_version: DATASET_VERSION,
        archived: false,
        code: src.code,
        name: src.name,
        category: src.category,
        subcategory: src.subcategory,
        company: src.company,
        factory: src.plant,
        department: src.department,
        owner: src.owner,
        sponsor: src.sponsor,
        contractor: src.contractor,
        priority: src.priority,
        status: src.status,
        progress: src.progress,
        capex_estimated: src.budget,
        capex_approved: ['Under Study', 'Cancelled'].includes(src.status) ? 0 : src.budget,
        capex_actual: Math.round(num(src.budget) * (
          src.status === 'Completed' ? rr(0.94, 1.01)
            : (src.status === 'Cancelled' || src.status === 'Under Study' || src.status === 'Not Started') ? 0
              : (num(src.progress) / 100) * rr(0.85, 1.05))),
        savings_expected: src.savings,
        planned_start: src.start,
        planned_end: src.end,
        actual_start: src.actual_start || '',
        actual_end: src.end_actual || (src.status === 'Completed' ? src.end : ''),
        mv_method: src.mv_method,
        verification_status: src.verification,
        savings_kwh_year: src.kwh,
        savings_gas_nm3_year: src.gas,
        savings_water_m3_year: src.water,
        savings_waste_t_year: src.waste,
        sec_improvement_pct: src.sec_pct,
        capacity_added: src.capex_qty,
        capacity_unit: src.capex_unit,
        renewable_mwh_year: src.code === 'OW-05' ? 8900 : 0,
        description: src.description,
        scope: src.description,
        tech_specs: '',
        existing_situation: '',
        proposed_improvement: src.description,
        production_benefit: num(src.capex_qty) > 0 ? Fmt.int(src.capex_qty) + ' ' + src.capex_unit : '',
        env_benefit: '',
        notes: src.updates || '',
        opex_annual: 0,
        created_at: Date.now() - (1000 * 60 * 60 * 24 * (60 - idx)),
        updated_at: Date.now() - (1000 * 60 * 60 * 24 * idx)
      };

      // lifecycle dates
      p.idea_date = addMonths(p.planned_start, -5);
      p.feasibility_date = addMonths(p.planned_start, -3);
      p.approval_date = ['Under Study', 'Cancelled', 'Not Started'].includes(src.status) ? '' : addMonths(p.planned_start, -1);
      p.commissioning_date = p.actual_end || '';
      p.mv_start = p.actual_end || '';
      p.mv_end = p.actual_end ? addMonths(p.actual_end, 12) : '';

      // derived emissions and payback
      const kwh = num(p.savings_kwh_year), gas = num(p.savings_gas_nm3_year);
      p.ghg_avoided_tco2e = Math.round((kwh * 0.42 + gas * 2.02) / 1000);
      p.env_benefit = p.ghg_avoided_tco2e > 0 ? Fmt.int(p.ghg_avoided_tco2e) + ' tCO2e/yr avoided' : '';
      p.payback_expected = num(p.savings_expected) > 0
        ? +((num(p.capex_approved || p.capex_estimated)) / num(p.savings_expected)).toFixed(2) : 0;
      p.team = [src.owner, src.sponsor].filter((v, i, a) => a.indexOf(v) === i).join(', ');
      return p;
    });
    await bulk('projects', projects, say, 'projects');

    /* 3. milestones + tasks */
    say('Building milestones and the November 2026 action plan…');
    const msRows = [], taskRows = [];
    projects.forEach(p => {
      const names = MILESTONES[p.category];
      const start = p.planned_start, end = p.planned_end;
      const totalDays = Math.max(30, Math.round((parseDate(end) - parseDate(start)) / 86400000));
      const progress = num(p.progress);
      const frozen = ['Under Study', 'Cancelled'].includes(p.status);
      const key = p.id.slice(7);

      names.forEach((nm, i) => {
        const share = totalDays / names.length;
        const d = new Date(parseDate(start).getTime() + share * (i + 1) * 86400000);
        const plannedDate = d.toISOString().slice(0, 10);
        const threshold = ((i + 1) / names.length) * 100;
        let status;
        if (progress >= threshold) status = 'Completed';
        else if (progress > 0 && progress >= threshold - (100 / names.length) * 0.75) status = 'In Progress';
        else status = 'Not Started';
        if (!frozen && status !== 'Completed' && plannedDate < '2026-11-15') {
          status = rnd() > 0.45 ? 'Delayed' : 'At Risk';
        }
        msRows.push({
          id: 'ms-' + key + '-' + i,
          project_id: p.id,
          name: nm,
          owner: i % 2 === 0 ? p.owner : p.sponsor,
          planned_date: plannedDate,
          actual_date: status === 'Completed' ? addMonths(plannedDate, ri(-1, 1)) : '',
          status: status,
          weight: Math.round(100 / names.length),
          seq: i,
          notes: status === 'Delayed' ? 'Recovery plan in progress; revised date under review.' : ''
        });
      });

      const tpl = TASK_TPL[p.category];
      tpl.forEach((tname, i) => {
        const msStart = new Date(parseDate(start).getTime() + (totalDays / tpl.length) * i * 86400000);
        const due = new Date(msStart.getTime() + (totalDays / tpl.length) * 0.95 * 86400000);
        const thr = ((i + 1) / tpl.length) * 100;
        let st, pct;
        if (progress >= thr) { st = 'Completed'; pct = 100; }
        else if (progress > 0 && progress >= thr - (100 / tpl.length) * 0.8) { st = 'In Progress'; pct = clamp(Math.round(progress), 10, 95); }
        else { st = 'Not Started'; pct = 0; }
        taskRows.push({
          id: 'tk-' + key + '-' + i,
          project_id: p.id,
          milestone_id: 'ms-' + key + '-' + Math.min(i, names.length - 1),
          name: tname,
          assignee: i % 3 === 0 ? p.owner : p.sponsor,
          start_date: msStart.toISOString().slice(0, 10),
          due_date: due.toISOString().slice(0, 10),
          status: st,
          percent: pct,
          dependency: i > 0 ? 'tk-' + key + '-' + (i - 1) : '',
          priority: i < 2 ? 'High' : 'Medium',
          notes: '',
          source: 'Programme template'
        });
      });

      // Specific November 2026 executive report action items
      (PROGRAMME_TASKS[p.code] || []).forEach((t, i) => {
        taskRows.push({
          id: 'tk-' + key + '-nov' + i,
          project_id: p.id,
          milestone_id: 'ms-' + key + '-' + Math.min(2, names.length - 1),
          name: t[0],
          assignee: t[1],
          start_date: '2026-11-01',
          due_date: t[2],
          status: t[3],
          percent: t[4],
          dependency: '',
          priority: 'High',
          notes: t[5],
          source: 'OW Monthly Executive Report — Nov 2026'
        });
      });
    });
    await bulk('milestones', msRows, say, 'milestones');
    await bulk('tasks', taskRows, say, 'tasks');

    /* 4. M&V records */
    say('Generating monthly M&V records (IPMVP)…');
    const mvRows = [];
    projects.forEach(p => {
      if (!p.mv_method) return;
      if (['Under Study', 'Cancelled', 'Not Started'].includes(p.status)) return;
      const key = p.id.slice(7);

      const perf = rr(0.84, 1.12);                       // measured vs expected performance
      const annualElecSav = num(p.savings_kwh_year);
      const annualGasSav = num(p.savings_gas_nm3_year);
      const annualWaterSav = num(p.savings_water_m3_year);
      const annualWasteSav = num(p.savings_waste_t_year);

      const completed = p.status === 'Completed';
      const nM = completed ? 12 : (p.progress > 60 ? 10 : p.progress > 30 ? 8 : 6);

      const baseElec = annualElecSav > 0 ? (annualElecSav / 12) * rr(8, 16) : rr(320000, 620000);
      const baseGas = annualGasSav > 0 ? (annualGasSav / 12) * rr(6, 12) : 0;
      const baseWater = annualWaterSav > 0 ? (annualWaterSav / 12) * rr(4, 8) : 0;
      const baseWaste = annualWasteSav > 0 ? (annualWasteSav / 12) * rr(3, 6) : 0;
      const baseProd = rr(1800, 5400);

      for (let k = nM - 1; k >= 0; k--) {
        const period = periodBack(k);
        const mo = Number(period.slice(5, 7));
        // Egyptian summer cooling load peaks around July/August
        const seasonal = 1 + 0.11 * Math.cos((mo - 7) / 12 * 2 * Math.PI) * (p.category === 'energy' ? 1 : 0.6);
        const prodF = 1 + rr(-0.07, 0.08);
        const ramp = completed ? 1 : clamp((nM - k) / nM * 1.15 + 0.35, 0.35, 1);

        const elecSaved = (annualElecSav / 12) * perf * seasonal * ramp * rr(0.9, 1.1);
        const gasSaved = (annualGasSav / 12) * perf * seasonal * ramp * rr(0.9, 1.1);
        const waterSaved = (annualWaterSav / 12) * perf * ramp * rr(0.88, 1.12);
        const wasteSaved = (annualWasteSav / 12) * perf * ramp * rr(0.85, 1.15);

        const baseElecM = Math.round(baseElec * seasonal);
        const baseGasM = Math.round(baseGas * seasonal);
        const prodM = Math.round(baseProd * prodF);

        const rec = {
          id: 'mv-' + key + '-' + period,
          project_id: p.id,
          period: period,
          baseline_elec_kwh: baseElecM,
          elec_kwh: Math.max(0, Math.round(baseElecM * prodF - elecSaved)),
          baseline_gas_nm3: baseGasM,
          gas_nm3: Math.max(0, Math.round(baseGasM * prodF - gasSaved)),
          baseline_production_t: Math.round(baseProd),
          production_t: prodM,
          hours: Math.round(rr(600, 720)),
          energy_cost: 0,
          baseline_water_m3: Math.round(baseWater * seasonal),
          water_m3: Math.max(0, Math.round(baseWater * seasonal * prodF - waterSaved)),
          baseline_waste_t: Math.round(baseWaste),
          waste_t: Math.max(0, Math.round(baseWaste * prodF - wasteSaved)),
          baseline_ghg_tco2e: 0,
          ghg_tco2e: 0,
          verified: false,
          verified_by: '',
          notes: ''
        };
        if (p.verification_status === 'Verified') { rec.verified = true; rec.verified_by = 'OW Sustainability — M&V team'; }
        else if (p.verification_status === 'In Progress' && k > 2) { rec.verified = true; rec.verified_by = 'OW Sustainability — M&V team'; }
        rec.notes = rec.verified
          ? 'Meter readings validated against the utility invoice; baseline adjusted for production.'
          : 'Meter data submitted by the plant energy team; pending verification.';
        mvRows.push(rec);
      }
    });
    await bulk('mv_records', mvRows, say, 'M&V records');

    /* 5. KPIs */
    say('Defining project KPIs and targets…');
    const kpiRows = [];
    projects.forEach(p => {
      const key = p.id.slice(7);
      const k = [];
      if (num(p.savings_kwh_year) > 0) k.push(['Electricity saved', 'kWh/yr', num(p.savings_kwh_year)]);
      if (num(p.savings_gas_nm3_year) > 0) k.push(['Natural gas saved', 'Nm³/yr', num(p.savings_gas_nm3_year)]);
      if (num(p.savings_water_m3_year) > 0) k.push(['Water saved', 'm³/yr', num(p.savings_water_m3_year)]);
      if (num(p.savings_waste_t_year) > 0) k.push(['Waste reduced', 't/yr', num(p.savings_waste_t_year)]);
      if (num(p.ghg_avoided_tco2e) > 0) k.push(['GHG avoided', 'tCO₂e/yr', num(p.ghg_avoided_tco2e)]);
      if (num(p.sec_improvement_pct) > 0) k.push(['SEC improvement', '%', num(p.sec_improvement_pct)]);
      if (num(p.renewable_mwh_year) > 0) k.push(['Renewable generation', 'MWh/yr', num(p.renewable_mwh_year)]);
      if (num(p.capacity_added) > 0 && p.capacity_unit) k.push(['Capacity added', p.capacity_unit, num(p.capacity_added)]);
      if (num(p.savings_expected) > 0) k.push(['Annual cost savings', 'USD/yr', num(p.savings_expected)]);

      k.forEach((row, i) => {
        const target = row[2];
        const actualFactor = p.status === 'Completed' ? rr(0.95, 1.14)
          : p.status === 'In Progress' ? clamp(num(p.progress) / 100 + rr(-0.1, 0.15), 0.05, 1.05) : 0;
        kpiRows.push({
          id: 'kpi-' + key + '-' + i,
          project_id: p.id,
          name: row[0],
          unit: row[1],
          baseline: +(target / Math.max(0.02, num(p.sec_improvement_pct) / 100 || 0.06)).toFixed(0),
          target_annual: target,
          target_monthly: +(target / 12).toFixed(1),
          actual: +(target * actualFactor).toFixed(1),
          direction: row[0].indexOf('intensity') > -1 ? 'lower_is_better' : 'higher_is_better',
          category: p.category
        });
      });
    });
    await bulk('kpis', kpiRows, say, 'KPIs');

    /* 6. risks, issues and decisions */
    say('Registering risks, issues and decisions…');
    const riskRows = [];
    projects.forEach(p => {
      if (p.status === 'Cancelled') return;
      const key = p.id.slice(7);
      const tpl = RISK_TPL[p.category] || RISK_TPL.energy;
      const n = p.status === 'Completed' ? 1 : Math.min(tpl.length, ri(2, tpl.length));
      for (let i = 0; i < n; i++) {
        const t = tpl[i];
        const prob = clamp(t[2] + (isDelayedSafe(p) ? 1 : 0), 1, 5);
        const score = prob * t[3];
        let status = 'Open';
        if (p.status === 'Completed') status = 'Closed';
        else if (score >= 15) status = rnd() > 0.4 ? 'Escalated' : 'Mitigating';
        else if (rnd() > 0.45) status = 'Mitigating';
        riskRows.push({
          id: 'rk-' + key + '-' + i,
          project_id: p.id,
          title: t[1],
          category: t[0],
          type: 'Risk',
          probability: prob,
          impact: t[3],
          mitigation: t[4],
          responsible: i % 2 === 0 ? p.owner : p.sponsor,
          target_date: addMonths('2026-11-15', ri(1, 8)),
          status: status,
          raised_date: addMonths(p.planned_start, ri(0, 4))
        });
      }
      if (['In Progress', 'Under Study', 'Not Started'].includes(p.status)) {
        const d = DECISIONS[ri(0, DECISIONS.length - 1)];
        riskRows.push({
          id: 'rk-' + key + '-d',
          project_id: p.id,
          title: d[0],
          category: 'Financial',
          type: 'Decision',
          probability: d[1],
          impact: d[2],
          mitigation: d[3],
          responsible: p.sponsor,
          target_date: addMonths('2026-11-15', ri(1, 3)),
          status: 'Open',
          raised_date: addMonths('2026-11-15', -ri(1, 3))
        });
      }
    });

    // Explicit vendor / quality issues from the November executive report
    const NOV_ISSUES = [
      ['OW-03', 'Humidity sensor installation faults on coating line 1', 'Technical', 4, 3,
        'Vendor to correct the installation; continuous reading not yet reliable.', 'Open'],
      ['OW-09', 'Fleet reform RFQ round must close before quotes can be compared', 'Schedule', 4, 3,
        'Vendor quote review due 16/11.', 'Mitigating'],
      ['OW-14', 'Metal detector quotes still pending', 'Quality', 3, 3,
        'Quotes due 15/12; incoming latex lab equipment list also due 15/12.', 'Open'],
      ['OW-18', 'Coating, weight-measuring and heat-recovery scope not yet agreed with vendors', 'Technical', 3, 3,
        'Vendor discussions in progress; scope to be frozen before the investment case.', 'Open'],
      ['OW-02', 'Digital print investment case awaiting financial approval', 'Financial', 3, 4,
        'Financial approval pack being prepared; TBR data with project management.', 'Mitigating']
    ];
    NOV_ISSUES.forEach((r, i) => {
      riskRows.push({
        id: 'rk-nov-' + i,
        project_id: 'prj-ow-' + r[0].slice(3).toLowerCase(),
        title: r[1],
        category: r[2],
        type: 'Issue',
        probability: r[3],
        impact: r[4],
        mitigation: r[5],
        responsible: 'Sustainability & Process Improvement',
        target_date: '2026-12-15',
        status: r[6],
        raised_date: '2026-11-01'
      });
    });
    await bulk('risks', riskRows, say, 'risks & decisions');

    /* 7. document register */
    say('Creating document register…');
    const docRows = [];
    projects.forEach(p => {
      const key = p.id.slice(7);
      const types = ['Feasibility Study', 'Business Case', 'Technical Offer'];
      if (['Completed', 'In Progress'].includes(p.status)) types.push('Commissioning Report');
      if (p.verification_status === 'Verified') types.push('Verification Report');
      if (p.mv_method) types.push('Utility Bill');
      types.forEach((t, i) => {
        docRows.push({
          id: 'doc-' + key + '-' + i,
          project_id: p.id,
          name: p.code + ' — ' + t + ' (register entry)',
          doc_type: t,
          doc_date: addMonths(p.planned_start, i * 2),
          reference: '',
          content_type: '',
          size: 0,
          collection: 'mv-evidence',
          uploaded_by: p.owner,
          notes: 'Metadata record created during platform setup. Upload the file to attach the actual document.'
        });
      });
    });
    await bulk('documents', docRows, say, 'document register');

    /* 8. users */
    say('Setting up user accounts…');
    const users = [
      ['Ashraf Elawwad', 'ashraf.elawwad@orientalweavers.com', 'Administrator',
        'Sustainability & Process Improvement', 'Active'],
      ['Maged Mamdouh', 'maged.mamdouh@orientalweavers.com', 'Editor',
        'Sustainability & Process Improvement', 'Active']
    ];
    await bulk('users', users.map(u => ({
      id: 'usr-' + u[1].split('@')[0].replace(/\./g, '-'),
      name: u[0], email: u[1], role: u[2], company: u[3], status: u[4],
      last_login: u[4] === 'Active' ? '2026-11-1' + ri(0, 4) : '',
      notes: ''
    })), say, 'users');

    /* 9. settings — includes the OW energy performance dataset */
    say('Configuring platform settings and OW energy KPIs…');
    const settings = [
      ['elec_price', '0.055', 'Electricity tariff (USD/kWh)', 'tariff'],
      ['gas_price', '0.095', 'Natural gas tariff (USD/Nm³)', 'tariff'],
      ['water_price', '0.55', 'Water tariff (USD/m³)', 'tariff'],
      ['waste_cost', '35', 'Waste disposal cost (USD/tonne)', 'tariff'],
      ['grid_ef', '0.42', 'Grid emission factor (kgCO₂e/kWh)', 'carbon'],
      ['gas_ef', '2.02', 'Natural gas emission factor (kgCO₂e/Nm³)', 'carbon'],
      ['discount_rate', '0.12', 'Discount rate for NPV/IRR (decimal)', 'financial'],
      ['project_life', '12', 'Default project economic life (years)', 'financial'],
      ['group_name', 'Oriental Weavers Group', 'Group name', 'general'],
      ['dept_name', 'Sustainability & Process Improvement', 'Reporting department', 'general'],
      ['reporting_period', 'Monthly', 'Default M&V reporting period', 'general'],
      ['fy_start', '01-01', 'Financial year start (MM-DD)', 'general'],
      ['energy_report_period', '2026-10', 'Group energy report period', 'energy'],
      ['energy_cost_savings_ytd_m_egp', '10.0', 'Total energy cost savings YTD (million EGP)', 'energy'],
      ['energy_cost_savings_target_pct', '53', 'Energy cost savings achievement vs target (%)', 'energy'],
      ['energy_baseline_ng_egp', '421000000', '2025 adjusted baseline — natural gas (EGP)', 'energy'],
      ['energy_baseline_elec_egp', '133300000', '2025 adjusted baseline — electricity (EGP)', 'energy'],
      ['energy_perf', JSON.stringify(ENERGY_PERF), 'OW group energy performance (Oct 2026 YTD)', 'energy'],
      ['dataset_version', DATASET_VERSION, 'Dataset version loaded', 'general']
    ];
    await bulk('settings', settings.map(s => ({
      id: 'set-' + s[0], key: s[0], value: s[1], label: s[2], group: s[3]
    })), say, 'settings');

    /* 10. audit seed */
    await bulk('audit_log', [{
      id: 'aud-bootstrap', ts: Date.now(), actor: 'System', action: 'Bootstrap',
      entity: 'platform', entity_id: '',
      detail: 'Oriental Weavers dataset ' + DATASET_VERSION + ' loaded: ' + projects.length +
        ' projects, ' + msRows.length + ' milestones, ' + taskRows.length + ' tasks, ' +
        mvRows.length + ' M&V records.'
    }], say);

    say('Done');

    // Completion marker: the bootstrap is resumable, so a partially seeded
    // database can be finished on the next load instead of staying partial.
    await bulk('settings', [{
      id: 'set-dataset_complete', key: 'dataset_complete', value: DATASET_VERSION,
      label: 'Oriental Weavers dataset fully loaded', group: 'general'
    }], say);
  }

  /* --------------------------- public API --------------------------- */
  function isComplete() {
    const v = S.settings && S.settings.dataset_complete;
    return !!v && v === DATASET_VERSION;
  }

  /** True when the OW dataset has not yet been loaded at this version. */
  function needsRun() {
    return !isComplete();
  }

  return {
    run: run,
    isComplete: isComplete,
    needsRun: needsRun,
    version: DATASET_VERSION,
    projectCount: PROJECTS.length,
    energyPerf: ENERGY_PERF
  };
})();
