/* ==========================================================================
   Oriental Weavers — Bilingual layer (English / العربية)
   --------------------------------------------------------------------------
   Two mechanisms, on purpose:

   1. I18N.t(str)        explicit lookup, for strings we compose ourselves.
   2. I18N.apply(root)   walks the rendered DOM and swaps any *exact* match of
                         an English phrase for its Arabic form. This is what
                         carries the ~11 legacy page modules without rewriting
                         every template literal in them.

   A MutationObserver re-applies the walk after tabs, modals, toasts and
   table repaints inject new nodes. The walk is idempotent: Arabic output is
   never a dictionary key, and every node visited is flagged, so it cannot
   loop or double-translate.

   Direction is switched on <html> (dir="rtl") rather than by per-element
   rules, and the RTL overrides live in css/style.css under [dir="rtl"].
   ========================================================================== */
'use strict';

const I18N = (function () {

  const KEY = 'axis_lang_v1';
  const ARABIC_FONT_ID = 'owArabicFont';

  /* ------------------------------------------------------------------ */
  /*  Dictionary — English source string → Arabic                        */
  /* ------------------------------------------------------------------ */
  const AR = {

    /* ---- Navigation groups ---- */
    'Overview': 'نظرة عامة',
    'Project Delivery': 'تنفيذ المشروعات',
    'Performance': 'الأداء',
    'Governance': 'الحوكمة',

    /* ---- Navigation items ---- */
    'Executive Slide': 'العرض التنفيذي',
    'All Projects Status': 'حالة جميع المشروعات',
    'Executive Dashboard': 'لوحة المؤشرات التنفيذية',
    'Project Portfolio': 'محفظة المشروعات',
    'Project Registration': 'تسجيل مشروع',
    'Project Management': 'إدارة المشروعات',
    'Implementation Monitoring': 'متابعة التنفيذ',
    'M&V & Verification': 'القياس والتحقق',
    'Energy & Sustainability': 'الطاقة والاستدامة',
    'Process Optimization': 'تحسين العمليات',
    'New Facilities': 'المنشآت الجديدة',
    'Financial Performance': 'الأداء المالي',
    'Risk & Issues': 'المخاطر والمشكلات',
    'Reports & Analytics': 'التقارير والتحليلات',
    'Administration': 'الإدارة والإعدادات',
    'Projects & M&V': 'المشروعات والقياس والتحقق',
    'Sustainability & Process Improvement': 'الاستدامة وتحسين العمليات',

    /* ---- Roles ---- */
    'Administrator': 'مدير النظام',
    'Editor': 'محرر',
    'Verifier': 'مُحقق',
    'M&V Verifier': 'مُحقق القياس والتحقق',
    'Viewer': 'مُشاهد',
    'Role': 'الدور',
    'Full control': 'تحكم كامل',
    'Manage projects': 'إدارة المشروعات',
    'Verify savings': 'التحقق من التوفير',
    'Read-only': 'قراءة فقط',
    'Access level': 'مستوى الصلاحية',
    'Account': 'الحساب',
    'Signed in as': 'مسجّل الدخول باسم',
    'Access mode': 'طريقة الوصول',
    'Shared viewer link': 'رابط عرض مشترك',
    'Authenticated session': 'جلسة موثّقة',
    'Sign out': 'تسجيل الخروج',
    'Sign in to the platform': 'تسجيل الدخول إلى المنصة',
    'Open read-only viewer dashboard': 'فتح لوحة العرض للقراءة فقط',
    'Administration & Settings': 'الإدارة والإعدادات',
    'Username / email': 'اسم المستخدم / البريد الإلكتروني',
    'Password': 'كلمة المرور',
    'Enter your password': 'أدخل كلمة المرور',
    'Projects, Monitoring & M&V': 'المشروعات والمتابعة والقياس والتحقق',
    'Projects, Monitoring & M&V Platform': 'منصة المشروعات والمتابعة والقياس والتحقق',
    'Oriental Weavers Group · portfolio, performance verification and reporting':
      'مجموعة أورينتال ويفرز · المحفظة والتحقق من الأداء والتقارير',
    'Demonstration access selector. In production this is derived from the authenticated account and Hosted Access Rules — never from the browser.':
      'مُحدِّد صلاحية تجريبي. في بيئة الإنتاج يُستنتج هذا من الحساب الموثّق وقواعد الوصول المُستضافة، وليس من المتصفح إطلاقًا.',
    'Shareable viewer link — dashboards, project details and reports without editing rights.':
      'رابط عرض قابل للمشاركة — لوحات المؤشرات وتفاصيل المشروعات والتقارير دون صلاحية تعديل.',
    'Security note.': 'ملاحظة أمنية.',
    'Route protection is enforced by the platform dispatcher (Hosted Access Rules). Administrative functions remain hidden from viewer sessions.':
      'تُطبّق حماية المسارات بواسطة موزّع المنصة (قواعد الوصول المُستضافة). وتبقى وظائف الإدارة مخفية عن جلسات العرض.',

    /* ---- Project status vocabulary ---- */
    'Not Started': 'لم يبدأ',
    'Under Study': 'تحت الدراسة',
    'In Progress': 'قيد التنفيذ',
    'Completed': 'مكتمل',
    'On Hold': 'متوقف مؤقتًا',
    'Cancelled': 'ملغى',
    'Delayed': 'متأخر',
    'Blocked': 'متعطّل',
    'At Risk': 'معرّض للخطر',
    'Open': 'مفتوح',
    'Mitigating': 'قيد المعالجة',
    'Escalated': 'مُصعّد',
    'Closed': 'مغلق',
    'Verification Pending': 'بانتظار التحقق',
    'Verified': 'مُتحقق منه',
    'Not Verified': 'غير مُتحقق منه',
    'Active': 'نشط',
    'Invited': 'مدعو',
    'Suspended': 'موقوف',
    'Critical': 'حرج',
    'High': 'مرتفع',
    'Medium': 'متوسط',
    'Low': 'منخفض',

    /* ---- Projects / common nouns ---- */
    'Project': 'المشروع',
    'Projects': 'المشروعات',
    'Project Code': 'كود المشروع',
    'Project Name': 'اسم المشروع',
    'Code': 'الكود',
    'Name': 'الاسم',
    'Full name': 'الاسم الكامل',
    'Email': 'البريد الإلكتروني',
    'Company': 'الشركة',
    'Manufacturing company': 'الشركة الصناعية',
    'Plant': 'المصنع',
    'Facility': 'المنشأة',
    'Factory / facility': 'المصنع / المنشأة',
    'Department': 'الإدارة',
    'Owner': 'المسؤول',
    'Sponsor': 'الراعي',
    'Project owner': 'مسؤول المشروع',
    'Project sponsor': 'راعي المشروع',
    'Category': 'الفئة',
    'Subcategory': 'الفئة الفرعية',
    'Budget': 'الميزانية',
    'Progress': 'نسبة الإنجاز',
    'Progress %': 'نسبة الإنجاز %',
    'Status': 'الحالة',
    'Priority': 'الأولوية',
    'Issues': 'المشكلات',
    'Reason': 'السبب',
    'Type': 'النوع',
    'Description': 'الوصف',
    'Milestone': 'المرحلة',
    'Milestones': 'المراحل',
    'Milestones Done': 'المراحل المنجزة',
    'Planned': 'المخطط',
    'Actual': 'الفعلي',
    'Variance': 'الفرق',
    'Period': 'الفترة',
    'Periods Reported': 'الفترات المُبلّغ عنها',
    'Expected Savings /yr': 'التوفير المتوقع سنويًا',
    'Measured Savings /yr': 'التوفير المقاس سنويًا',
    'Savings/yr': 'التوفير السنوي',
    'IPMVP Option': 'خيار IPMVP',
    'Last login': 'آخر دخول',
    'Company / plant': 'الشركة / المصنع',
    'Time Elapsed %': 'الوقت المنقضي %',
    'Schedule Variance %': 'انحراف الجدول %',
    'Budget utilisation': 'استهلاك الميزانية',
    'Budget overruns': 'تجاوزات الميزانية',
    'Avg completion': 'متوسط الإنجاز',
    'Avg progress': 'متوسط التقدم',
    'Overdue milestones': 'المراحل المتأخرة',
    'Overdue tasks': 'المهام المتأخرة',
    'In selection': 'ضمن التصفية',
    'Total registered': 'إجمالي المسجل',
    'Open items': 'البنود المفتوحة',
    'Critical (score ≥15)': 'حرجة (الدرجة ≥15)',
    'Past target date': 'تجاوزت التاريخ المستهدف',
    'Pending decisions': 'قرارات معلّقة',
    'Exposure score': 'درجة التعرّض',

    /* ---- KPIs & metrics ---- */
    'Total projects': 'إجمالي المشروعات',
    'Total portfolio budget': 'إجمالي ميزانية المحفظة',
    'Active budget': 'الميزانية النشطة',
    'Average completion': 'متوسط الإنجاز',
    'Needs attention': 'يحتاج إلى متابعة',
    'Needs intervention': 'يحتاج إلى تدخل',
    'Under implementation': 'قيد التنفيذ',
    'Est. investment (CAPEX)': 'الاستثمار المقدّر',
    'Actual expenditure': 'المصروف الفعلي',
    'Expected annual savings': 'التوفير السنوي المتوقع',
    'Measured annual savings': 'التوفير السنوي المقاس',
    'Verified annual savings': 'التوفير السنوي المُتحقق منه',
    'Verified savings': 'التوفير المُتحقق منه',
    'Measured savings': 'التوفير المقاس',
    'Measured benefit': 'العائد المقاس',
    'Verified benefit': 'العائد المُتحقق منه',
    'Approved investment': 'الاستثمار المعتمد',
    'Portfolio NPV': 'صافي القيمة الحالية للمحفظة',
    'Portfolio IRR': 'معدل العائد الداخلي للمحفظة',
    'Portfolio payback': 'فترة الاسترداد للمحفظة',
    'Portfolio ROI': 'العائد على الاستثمار للمحفظة',
    'Simple payback': 'فترة الاسترداد البسيطة',
    'ROI over life': 'العائد على مدى العمر',
    'CAPEX utilisation': 'استهلاك التمويل',
    'Payback': 'فترة الاسترداد',
    'Completion': 'الإنجاز',
    'M&V coverage': 'تغطية القياس والتحقق',
    'Achievement': 'نسبة التحقيق',
    'Pending verification': 'بانتظار التحقق',
    'Electricity savings': 'توفير الكهرباء',
    'Natural gas savings': 'توفير الغاز الطبيعي',
    'Total energy savings': 'إجمالي توفير الطاقة',
    'GHG emissions avoided': 'الانبعاثات المتجنَّبة',
    'Renewable generation': 'التوليد المتجدد',
    'Water savings': 'توفير المياه',
    'Waste reduction': 'خفض المخلفات',
    'SEC improvement': 'تحسن الاستهلاك النوعي للطاقة',
    'Capacity added': 'الطاقة الإنتاجية المضافة',

    /* ---- Section titles ---- */
    'Portfolio summary': 'ملخص المحفظة',
    'Project portfolio': 'محفظة المشروعات',
    'Financial performance': 'الأداء المالي',
    'Sustainability & operational performance': 'الأداء البيئي والتشغيلي',
    'Trends & distribution': 'الاتجاهات والتوزيع',
    'Status distribution': 'توزيع الحالات',
    'Project status register': 'سجل حالة المشروعات',
    'All projects — current status': 'جميع المشروعات — الحالة الراهنة',
    'Project status': 'حالة المشروعات',
    'Group energy performance': 'أداء الطاقة للمجموعة',
    'Group energy performance — Oct 2026': 'أداء الطاقة للمجموعة — أكتوبر ٢٠٢٦',
    'count and budget per status': 'العدد والميزانية لكل حالة',
    'portfolio key indicators': 'المؤشرات الرئيسية للمحفظة',

    /* ---- Energy report labels ---- */
    'NG SAVED — YTD': 'الغاز الطبيعي المُوفَّر — تراكمي',
    'NG CONSUMPTION — YTD': 'استهلاك الغاز الطبيعي — تراكمي',
    'ELECTRICITY SAVINGS — YTD': 'توفير الكهرباء — تراكمي',
    'GRID ELECTRICITY CONSUMPTION — YTD': 'استهلاك الكهرباء من الشبكة — تراكمي',
    'RE SAVINGS — YTD': 'توفير الطاقة المتجددة — تراكمي',
    'OW Energy Cost Performance': 'أداء تكلفة الطاقة — أورينتال ويفرز',
    'On target': 'مطابق للمستهدف',
    'Below target': 'أقل من المستهدف',
    'Target': 'المستهدف',
    'cost savings YTD': 'توفير التكلفة تراكميًا',
    'of target': 'من المستهدف',
    'Reported in': 'مُبلّغ عنه بـ',

    /* ---- Buttons / actions ---- */
    'Print': 'طباعة',
    'Print / PDF': 'طباعة / PDF',
    'Print current view': 'طباعة العرض الحالي',
    'Alerts': 'التنبيهات',
    'Notifications & Alerts': 'الإشعارات والتنبيهات',
    'Menu': 'القائمة',
    'Close': 'إغلاق',
    'Cancel': 'إلغاء',
    'Confirm': 'تأكيد',
    'Please confirm': 'يرجى التأكيد',
    'Save': 'حفظ',
    'Save changes': 'حفظ التغييرات',
    'Edit': 'تعديل',
    'Delete': 'حذف',
    'Add': 'إضافة',
    'Reset': 'إعادة تعيين',
    'Search': 'بحث',
    'Export': 'تصدير',
    'Download': 'تنزيل',
    'Upload': 'رفع',
    'Full portfolio': 'المحفظة الكاملة',
    'View project': 'عرض المشروع',
    'Full details': 'التفاصيل الكاملة',
    'Showing': 'عرض',
    'of': 'من',
    'records': 'سجل',
    'record': 'سجل',
    'No records': 'لا توجد سجلات',
    'Adjust your filters or add a new record.': 'عدّل عوامل التصفية أو أضف سجلًا جديدًا.',
    'No alerts': 'لا توجد تنبيهات',
    'All projects are within plan, budget and performance targets.': 'جميع المشروعات داخل حدود الخطة والميزانية والمستهدفات.',
    'Read-only viewer view.': 'عرض للقراءة فقط.',
    'Viewer mode': 'وضع العرض فقط',
    'Language': 'اللغة',

    /* ---- Slide page ---- */
    'Executive summary — all projects': 'ملخص تنفيذي — جميع المشروعات',
    'Project portfolio executive summary': 'الملخص التنفيذي لمحفظة المشروعات',
    'One slide for the whole portfolio': 'شريحة واحدة لكامل المحفظة',
    'One slide, all projects': 'شريحة واحدة لكل المشروعات',
    'Whole portfolio on one slide': 'المحفظة كاملة في شريحة واحدة',
    'Fit to screen': 'ملاءمة الشاشة',
    'Download as PDF': 'تنزيل بصيغة PDF',
    'Portfolio at a glance': 'المحفظة في لمحة',
    'projects across': 'مشروعًا موزعة على',
    'plants': 'مصانع',
    'as reported': 'كما ورد في',
    'Source': 'المصدر',
    'Prepared by': 'إعداد',
    'Group total': 'إجمالي المجموعة',
    'Top projects by budget': 'أكبر المشروعات بالميزانية',
    'All projects': 'جميع المشروعات',

    /* ---- Misc ---- */
    'Total': 'الإجمالي',
    'Group': 'المجموعة',
    'Group total projects': 'إجمالي مشروعات المجموعة',
    'Live from the project database': 'مباشر من قاعدة بيانات المشروعات',
    'All figures recalculate from the Table API on every load.':
      'تُحتسب جميع الأرقام من واجهة البيانات عند كل تحميل.',
    'Budgets as published in USD.': 'الميزانيات كما وردت بالدولار الأمريكي.',
    'sorted by project code': 'مرتبة حسب كود المشروع',
    'projects': 'مشروعات',
    'project': 'مشروع',
    'Group energy': 'طاقة المجموعة',
    'Budgets': 'الميزانيات',

    /* ---- Month / period ---- */
    'All facilities': 'جميع المنشآت',
    'All companies': 'جميع الشركات',
    'All categories': 'جميع الفئات',
    'All priorities': 'جميع الأولويات',
    'All statuses': 'جميع الحالات',
    'Any verification': 'أي حالة تحقق',
    'Needs attention': 'يحتاج إلى متابعة',
    'Delayed only': 'المتأخر فقط',
    'Table': 'جدول',
    'Cards': 'بطاقات',
    'Registered projects': 'المشروعات المسجلة',
    'Click any row to open the project profile': 'اضغط على أي صف لفتح ملف المشروع',
    'committed CAPEX': 'التمويل المُلتزم به',
    'completed': 'مكتمل',
    'expected': 'متوقع',
    'projects verified': 'مشروعات تم التحقق منها',
    'Past planned completion': 'تجاوز تاريخ الإنجاز المخطط',
    'vs': 'مقابل',
    'New project': 'مشروع جديد',
    'Search code, name, owner, facility': 'ابحث بالكود أو الاسم أو المسؤول أو المنشأة',
    'Search projects': 'بحث في المشروعات',
    'CAPEX Approved': 'التمويل المعتمد',
    'CAPEX Actual': 'التمويل الفعلي',
    'Planned Start': 'البداية المخططة',
    'Planned End': 'النهاية المخططة',
    'Achievement %': 'نسبة التحقيق %',
    'Energy Saved MWh/yr': 'الطاقة المُوفَّرة (ميجاوات ساعة/سنة)',
    'Measured Savings/yr': 'التوفير المقاس سنويًا',
    'Verified Savings/yr': 'التوفير المُتحقق منه سنويًا',
    'Subcategory': 'الفئة الفرعية',
    'Category breakdown': 'توزيع الفئات',
    'Status breakdown': 'توزيع الحالات',
    'Projects by status': 'المشروعات حسب الحالة',
    'Filters': 'عوامل التصفية',
    'All': 'الكل',
    'Apply': 'تطبيق',
    'Clear': 'مسح',
    'Details': 'التفاصيل',
    'Overview': 'نظرة عامة',
    'Summary': 'الملخص',
    'Amount': 'القيمة',
    'Date': 'التاريخ',
    'Notes': 'ملاحظات',
    'Owner / sponsor': 'المسؤول / الراعي',
    'Timeline': 'الجدول الزمني',
    'Milestones & tasks': 'المراحل والمهام',
    'Documents': 'المستندات',
    'KPIs': 'مؤشرات الأداء',
    'Risk register': 'سجل المخاطر',
    'Actions': 'الإجراءات',
    'View': 'عرض',
    'Back': 'رجوع',
    'Next': 'التالي',
    'Previous': 'السابق',
    'Yes': 'نعم',
    'No': 'لا',
    'None': 'بدون',
    'Loading': 'جارٍ التحميل',
    'No data': 'لا توجد بيانات',
    'CAPEX': 'التمويل',
    'Measured /yr': 'المقاس سنويًا',
    'Achieve': 'التحقيق',
    'Verification': 'التحقق',
    'Flags': 'التنبيهات',
    'unassigned': 'غير مُسند',
    'No projects match these filters': 'لا توجد مشروعات مطابقة لعوامل التصفية',
    'Adjust the category, facility or status filters to widen the selection.':
      'عدّل تصفية الفئة أو المنشأة أو الحالة لتوسيع النتائج.',
    'All registered projects and initiatives': 'جميع المشروعات والمبادرات المسجلة',
    'GHG Avoided tCO2e/yr': 'الانبعاثات المتجنَّبة (طن مكافئ CO₂/سنة)',
    'Verification Status': 'حالة التحقق',
    'M&V Method': 'طريقة القياس والتحقق',
    'approved investment': 'استثمار معتمد',
    'measured annual savings': 'توفير سنوي مقاس',
    'projects shown': 'مشروعًا معروضًا',
    'late': 'متأخر',
    'risk': 'خطر',
    'Delayed': 'متأخر',
    'Critical risk': 'خطر حرج',

    /* ---- Reports module ---- */
    'Automated reporting and analysis': 'التقارير والتحليلات الآلية',
    'Executive Monthly Performance Report': 'تقرير الأداء التنفيذي الشهري',
    'Quarterly Project Portfolio Report': 'تقرير محفظة المشروعات الربع سنوي',
    'M&V Performance & Verification Report': 'تقرير أداء القياس والتحقق',
    'Energy & Sustainability Report': 'تقرير الطاقة والاستدامة',
    'Financial Savings & Investment Report': 'تقرير التوفير المالي والاستثمار',
    'Implementation Progress Report': 'تقرير تقدم التنفيذ',
    'Factory Comparison Report': 'تقرير مقارنة المصانع',
    'Annual Project Performance Review': 'المراجعة السنوية لأداء المشروعات',
    'Consolidated group position: portfolio, financial, operational and sustainability KPIs with trends and attention items.':
      'الموقف المُجمّع للمجموعة: مؤشرات المحفظة والمالية والتشغيل والاستدامة مع الاتجاهات والبنود التي تحتاج إلى متابعة.',
    'Every project with status, progress, budget utilisation and schedule variance for portfolio governance review.':
      'كل مشروع مع حالته ونسبة إنجازه واستهلاك ميزانيته وانحراف جدوله الزمني لمراجعة حوكمة المحفظة.',
    'Baseline, expected, measured and verified savings per project with achievement and verification status.':
      'التوفير المرجعي والمتوقع والمقاس والمُتحقق منه لكل مشروع مع نسبة التحقيق وحالة التحقق.',
    'Energy savings by stream, renewable generation, GHG avoided, water and waste performance.':
      'توفير الطاقة حسب المصدر، والتوليد المتجدد، والانبعاثات المتجنَّبة، وأداء المياه والمخلفات.',
    'CAPEX approved versus actual, expected versus measured savings, payback, NPV and IRR by project and company.':
      'التمويل المعتمد مقابل الفعلي، والتوفير المتوقع مقابل المقاس، وفترة الاسترداد وصافي القيمة الحالية ومعدل العائد الداخلي لكل مشروع وشركة.',
    'Milestone and task delivery, overdue activities, blocked items, budget overruns and corrective actions.':
      'تسليم المراحل والمهام، والأنشطة المتأخرة، والبنود المتعطلة، وتجاوزات الميزانية، والإجراءات التصحيحية.',
    'Facility ranking on savings, investment efficiency, achievement, delays and risk exposure.':
      'ترتيب المنشآت حسب التوفير وكفاءة الاستثمار ونسبة التحقيق والتأخيرات والتعرض للمخاطر.',
    'Year-to-date actuals against approved targets for every project, including verified benefit realisation.':
      'الفعلي التراكمي مقابل المستهدفات المعتمدة لكل مشروع، بما في ذلك تحقيق العائد المُتحقق منه.',
    'Every report is generated live from the project database —':
      'يُولَّد كل تقرير مباشرة من قاعدة بيانات المشروعات —',
    'no stored snapshots, so figures always reconcile with the dashboards':
      'بلا نسخ محفوظة، لذا تتوافق الأرقام دائمًا مع لوحات المؤشرات',
    'Print view': 'عرض الطباعة',
    'Generate': 'إنشاء',
    'Run report': 'تشغيل التقرير',
    'Monthly': 'شهري',
    'Quarterly': 'ربع سنوي',
    'Annual': 'سنوي',
    'Frequency': 'الدورية',
    'Group performance summary': 'ملخص أداء المجموعة',
    'facilities': 'منشآت',
    'Generator': 'مُولِّد التقارير',

    /* ---- Months ---- */
    'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل',
    'May': 'مايو', 'Jun': 'يونيو', 'Jul': 'يوليو', 'Aug': 'أغسطس',
    'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر'
  };

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */
  let lang = 'en';
  let observer = null;

  function readStored() {
    try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; }
  }

  /* Arabic needs a face with proper glyph coverage — the Latin serif display
     stack renders Arabic very poorly, so direction also swaps the families. */
  function ensureArabicFont() {
    if (document.getElementById(ARABIC_FONT_ID)) return;
    const pre = document.createElement('link');
    pre.rel = 'preconnect'; pre.href = 'https://fonts.gstatic.com'; pre.crossOrigin = '';
    const l = document.createElement('link');
    l.id = ARABIC_FONT_ID;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';
    document.head.appendChild(pre);
    document.head.appendChild(l);
  }

  /* ------------------------------------------------------------------ */
  /*  Translation primitives                                             */
  /* ------------------------------------------------------------------ */

  /** Exact lookup. Returns the source string unchanged when not translated. */
  function t(s) {
    if (s === null || s === undefined) return s;
    if (lang !== 'ar') return s;
    const k = String(s);
    if (Object.prototype.hasOwnProperty.call(AR, k)) return AR[k];
    const trimmed = k.trim();
    if (trimmed !== k && Object.prototype.hasOwnProperty.call(AR, trimmed)) {
      return k.replace(trimmed, AR[trimmed]);
    }
    return s;
  }

  /** "Oct 2026" → "أكتوبر ٢٠٢٦" (month name localised, year left as digits). */
  function period(s) {
    if (lang !== 'ar' || !s) return s;
    return String(s).replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, m => AR[m] || m);
  }

  /** Join fragments with an Arabic separator when active. */
  function list(parts) {
    return parts.filter(Boolean).join(lang === 'ar' ? ' · ' : ' · ');
  }

  /* ------------------------------------------------------------------ */
  /*  DOM translation                                                    */
  /* ------------------------------------------------------------------ */
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, IFRAME: 1 };
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  /* Composed captions such as "3 completed" or "USD 15.4M committed CAPEX"
     are built by string concatenation in the legacy page modules, so they can
     never be an exact dictionary hit. For these we translate the known phrase
     *inside* the text, but only in UI chrome — never inside a data cell, so
     real content such as "Polyester Yarns Plant" is never mangled. */
  const CAPTION_SEL = '.kpi-foot,.kpi-label,.ch-sub,.card-foot,.mini-foot,.sub,' +
    '.tiny,.muted,.sp-meta,.crumb,.tag,.badge,.pill,.kv-k,.caption,.hint,' +
    '.section-title,.sp-head h3,.sf-right,.si-l,.si-f,.legend span,.stack-legend span,' +
    '.sld-row,.sld-en,.stat-line .k,.rank-val,.doc-meta,.alert-item .ai-meta,' +
    'label,th,button,.btn,option,summary';

  function inCaption(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('td:not(.cap),.pname,.strong,.doc-name,.rank-name')) {
      // Allow table headers, which are inside <th> not <td>
      if (!el.closest('th')) return false;
    }
    return !!el.closest(CAPTION_SEL);
  }

  /* Longest keys first so 'Total portfolio budget' wins over 'Total'. */
  const PHRASE_KEYS = Object.keys(AR).sort((a, b) => b.length - a.length);

  function phraseTranslate(text) {
    let out = text;
    for (let i = 0; i < PHRASE_KEYS.length; i++) {
      const k = PHRASE_KEYS[i];
      if (k.length < 3) continue;
      if (out.indexOf(k) === -1) continue;
      // word-boundary safety around the phrase
      const idx = out.indexOf(k);
      const before = idx === 0 ? ' ' : out[idx - 1];
      const after = idx + k.length >= out.length ? ' ' : out[idx + k.length];
      if (!/[\s·(:,–—-]/.test(before) || !/[\s·:),.!–—-]/.test(after)) continue;
      out = out.slice(0, idx) + AR[k] + out.slice(idx + k.length);
    }
    return out;
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentNode;
        if (!p || SKIP[p.nodeName]) return NodeFilter.FILTER_REJECT;
        if (node.__i18nDone) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const hits = [];
    while (walker.nextNode()) hits.push(walker.currentNode);

    hits.forEach(node => {
      const src = node.nodeValue;
      const trimmed = src.trim();

      // 1. exact phrase
      if (Object.prototype.hasOwnProperty.call(AR, trimmed)) {
        node.nodeValue = src.replace(trimmed, AR[trimmed]);
        node.__i18nDone = true;
        return;
      }

      // 2. known phrase embedded in a composed UI caption
      if (inCaption(node.parentNode) && /\d/.test(trimmed)) {
        const next = phraseTranslate(src);
        if (next !== src) { node.nodeValue = next; node.__i18nDone = true; }
      }
    });
  }

  function translateAttributes(root) {
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label],[alt]') : [];
    els.forEach(el => {
      if (el.__i18nAttrDone) return;
      ATTRS.forEach(a => {
        const v = el.getAttribute && el.getAttribute(a);
        if (!v) return;
        const trimmed = v.trim();
        if (Object.prototype.hasOwnProperty.call(AR, trimmed)) {
          el.setAttribute(a, v.replace(trimmed, AR[trimmed]));
        }
      });
      el.__i18nAttrDone = true;
    });
  }

  /** Translate an already-rendered subtree. Safe to call repeatedly. */
  function apply(root) {
    if (lang !== 'ar' || !root) return;
    const el = root.nodeType === 1 ? root : document.body;
    translateTextNodes(el);
    translateAttributes(el);

    // <title> is its own text node under <head>, handled separately
    if (el === document.body || el === document.documentElement) {
      const titleNode = document.querySelector('title');
      if (titleNode && !titleNode.__i18nDone) {
        const v = titleNode.textContent.trim();
        const sep = ' · ';
        const idx = v.indexOf(sep);
        if (idx > -1) {
          const head = v.slice(0, idx);
          if (AR[head]) {
            titleNode.textContent = AR[head] + v.slice(idx);
            titleNode.__i18nDone = true;
          }
        }
      }
    }
  }

  /** Re-translate whenever the app injects new markup (tabs, modals, rows). */
  function observe() {
    if (observer || lang !== 'ar' || typeof MutationObserver === 'undefined') return;
    let queued = false;
    observer = new MutationObserver(muts => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        muts.forEach(m => {
          if (m.type === 'attributes') { if (m.target.__i18nAttrDone) m.target.__i18nAttrDone = false; }
          m.addedNodes.forEach(n => {
            if (n.nodeType === 1) { n.__i18nAttrDone = false; apply(n); }
            else if (n.nodeType === 3 && n.parentNode) apply(n.parentNode);
          });
        });
      });
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt']
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Public                                                             */
  /* ------------------------------------------------------------------ */
  function applyDocumentAttrs() {
    const html = document.documentElement;
    html.lang = lang === 'ar' ? 'ar' : 'en';
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (lang === 'ar') { ensureArabicFont(); document.body && document.body.classList.add('lang-ar'); }
    else if (document.body) document.body.classList.remove('lang-ar');
  }

  function set(next) {
    lang = next === 'ar' ? 'ar' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) { /* private mode */ }
    applyDocumentAttrs();
    return lang;
  }

  function toggle() {
    set(lang === 'ar' ? 'en' : 'ar');
    // A full reload guarantees every composed string (counts, dates, ranges)
    // is rebuilt in the new language rather than only the static labels.
    location.reload();
  }

  function boot() {
    lang = readStored();
    applyDocumentAttrs();
    if (lang === 'ar') {
      apply(document.body);
      observe();
    }
  }

  return {
    get lang() { return lang; },
    get isArabic() { return lang === 'ar'; },
    t, period, list, apply, observe, set, toggle, boot,
    /** Label for the toggle: shows the language you would switch *to*. */
    get toggleLabel() { return lang === 'ar' ? 'EN' : 'ع'; },
    get toggleTitle() { return lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'; }
  };
})();

/* Apply direction and the Arabic face as early as possible. */
if (document.body) I18N.boot();
else document.addEventListener('DOMContentLoaded', () => I18N.boot(), { once: true });
