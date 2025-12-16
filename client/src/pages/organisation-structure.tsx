import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  BookOpen, 
  Briefcase, 
  Heart, 
  Settings, 
  FileText, 
  Monitor, 
  Landmark,
  GraduationCap,
  Shield,
  ClipboardCheck,
  Megaphone,
  DollarSign,
  Wrench,
  MapPin,
  ScrollText
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const administrativeUnits = [
  {
    id: 1,
    title: "Office of the Executive Director",
    titleAr: "مكتب المدير التنفيذي",
    icon: Briefcase,
    mandate: "Provide overall leadership and coordination for internal operations and strategic decisions.",
    mandateAr: "توفير القيادة الشاملة والتنسيق للعمليات الداخلية والقرارات الاستراتيجية.",
    responsibilities: [
      "Operations Management: Oversee day-to-day internal operations and inter-unit communication",
      "Executive Committee Support: Prepare reports, attend meetings, and track decisions",
      "Decision Implementation: Execute Executive Committee resolutions promptly",
      "Regional Coordination: Support timely submission of regional reports",
      "Conflict Resolution: Supervise reconciliation processes and address disputes"
    ],
    responsibilitiesAr: [
      "إدارة العمليات: الإشراف على العمليات الداخلية اليومية والتواصل بين الوحدات",
      "دعم اللجنة التنفيذية: إعداد التقارير وحضور الاجتماعات ومتابعة القرارات",
      "تنفيذ القرارات: تنفيذ قرارات اللجنة التنفيذية بسرعة",
      "التنسيق الإقليمي: دعم تقديم التقارير الإقليمية في الوقت المناسب",
      "حل النزاعات: الإشراف على عمليات المصالحة ومعالجة النزاعات"
    ]
  },
  {
    id: 2,
    title: "Public Relations Unit",
    titleAr: "وحدة العلاقات العامة",
    icon: Megaphone,
    mandate: "Manage external relations, public image, communications, and information dissemination.",
    mandateAr: "إدارة العلاقات الخارجية والصورة العامة والاتصالات ونشر المعلومات.",
    responsibilities: [
      "Unite Islamic educational institutions under Amaanah",
      "Collaborate with Ministries and conventional schools",
      "Manage institutional partnerships and MOUs",
      "Develop and distribute communication materials",
      "Manage media campaigns (TV, radio, print, online)"
    ],
    responsibilitiesAr: [
      "توحيد المؤسسات التعليمية الإسلامية تحت مظلة الأمانة",
      "التعاون مع الوزارات والمدارس التقليدية",
      "إدارة الشراكات المؤسسية ومذكرات التفاهم",
      "تطوير وتوزيع مواد الاتصال",
      "إدارة الحملات الإعلامية (التلفزيون، الإذاعة، المطبوعات، الإنترنت)"
    ]
  },
  {
    id: 3,
    title: "Secretariat and Record Office",
    titleAr: "الأمانة ومكتب السجلات",
    icon: FileText,
    mandate: "Maintain accurate institutional records and support internal/external communication.",
    mandateAr: "الحفاظ على السجلات المؤسسية الدقيقة ودعم الاتصال الداخلي والخارجي.",
    responsibilities: [
      "Register all incoming/outgoing correspondence",
      "Manage central filing systems and partner contact databases",
      "Facilitate structured communication within Amaanah",
      "Safeguard critical records and official stamps",
      "Issue attestations and manage Madrasah registrations"
    ],
    responsibilitiesAr: [
      "تسجيل جميع المراسلات الواردة والصادرة",
      "إدارة أنظمة الملفات المركزية وقواعد بيانات جهات الاتصال",
      "تسهيل الاتصال المنظم داخل الأمانة",
      "حماية السجلات الحيوية والأختام الرسمية",
      "إصدار الشهادات وإدارة تسجيلات المدارس"
    ]
  },
  {
    id: 4,
    title: "HR Management Unit",
    titleAr: "وحدة إدارة الموارد البشرية",
    icon: Users,
    mandate: "Oversee human resource development, welfare, performance, and compliance.",
    mandateAr: "الإشراف على تنمية الموارد البشرية والرفاهية والأداء والامتثال.",
    responsibilities: [
      "Assist in recruitment and new staff orientation",
      "Maintain employee files and HRIS",
      "Address staff concerns and coordinate welfare activities",
      "Manage performance appraisals and KPI tracking",
      "Identify training needs and organize training programs"
    ],
    responsibilitiesAr: [
      "المساعدة في التوظيف وتوجيه الموظفين الجدد",
      "الحفاظ على ملفات الموظفين ونظام معلومات الموارد البشرية",
      "معالجة مخاوف الموظفين وتنسيق أنشطة الرفاهية",
      "إدارة تقييمات الأداء ومتابعة مؤشرات الأداء",
      "تحديد احتياجات التدريب وتنظيم برامج التدريب"
    ]
  },
  {
    id: 5,
    title: "Finance & Account Unit",
    titleAr: "وحدة المالية والحسابات",
    icon: DollarSign,
    mandate: "Ensure accurate financial management, reporting, and compliance.",
    mandateAr: "ضمان الإدارة المالية الدقيقة والتقارير والامتثال.",
    responsibilities: [
      "Record transactions and maintain accounting systems",
      "Process all payments in line with policy",
      "Perform monthly reconciliations and resolve discrepancies",
      "Track budgets and prepare reports for stakeholders",
      "Facilitate internal and external audits"
    ],
    responsibilitiesAr: [
      "تسجيل المعاملات والحفاظ على أنظمة المحاسبة",
      "معالجة جميع المدفوعات وفقاً للسياسة",
      "إجراء المطابقات الشهرية وحل التناقضات",
      "تتبع الميزانيات وإعداد التقارير لأصحاب المصلحة",
      "تسهيل المراجعات الداخلية والخارجية"
    ]
  },
  {
    id: 6,
    title: "Assets Management & Procurement",
    titleAr: "إدارة الأصول والمشتريات",
    icon: Wrench,
    mandate: "Manage assets, procurement processes, and infrastructure maintenance.",
    mandateAr: "إدارة الأصول وعمليات الشراء وصيانة البنية التحتية.",
    responsibilities: [
      "Maintain Fixed Asset Register and conduct verifications",
      "Manage asset transfers, disposals, and insurance",
      "Develop procurement plans and implement policy",
      "Maintain supplier database and procurement documentation",
      "Supervise service contracts and monitor utilities"
    ],
    responsibilitiesAr: [
      "الحفاظ على سجل الأصول الثابتة وإجراء التحققات",
      "إدارة نقل الأصول والتصرف فيها والتأمين عليها",
      "تطوير خطط الشراء وتنفيذ السياسة",
      "الحفاظ على قاعدة بيانات الموردين ووثائق الشراء",
      "الإشراف على عقود الخدمة ومراقبة المرافق"
    ]
  },
  {
    id: 7,
    title: "Monitoring & Quality Assurance",
    titleAr: "المراقبة وضمان الجودة",
    icon: Shield,
    mandate: "Ensure continuous improvement and compliance of affiliated institutions.",
    mandateAr: "ضمان التحسين المستمر والامتثال للمؤسسات التابعة.",
    responsibilities: [
      "Collect and analyze monitoring reports from field monitors",
      "Conduct termly visits to assess academic and operational standards",
      "Participate in school assessments for registration/accreditation",
      "Ensure compliance with minimum standards for education delivery",
      "Recommend corrective actions for low-performing institutions"
    ],
    responsibilitiesAr: [
      "جمع وتحليل تقارير المراقبة من المراقبين الميدانيين",
      "إجراء زيارات فصلية لتقييم المعايير الأكاديمية والتشغيلية",
      "المشاركة في تقييمات المدارس للتسجيل والاعتماد",
      "ضمان الامتثال للحد الأدنى من معايير تقديم التعليم",
      "التوصية بإجراءات تصحيحية للمؤسسات منخفضة الأداء"
    ]
  },
  {
    id: 8,
    title: "Curriculum & Learning Materials",
    titleAr: "المناهج والمواد التعليمية",
    icon: BookOpen,
    mandate: "Design, review, and oversee curriculum implementation and learning materials.",
    mandateAr: "تصميم ومراجعة والإشراف على تنفيذ المناهج والمواد التعليمية.",
    responsibilities: [
      "Align curriculum with national standards and Islamic values",
      "Develop national curriculum framework for memorization centers",
      "Produce, evaluate, and distribute approved learning materials",
      "Organize validation workshops for stakeholders",
      "Develop teacher guides and training materials"
    ],
    responsibilitiesAr: [
      "مواءمة المناهج مع المعايير الوطنية والقيم الإسلامية",
      "تطوير إطار المناهج الوطني لمراكز الحفظ",
      "إنتاج وتقييم وتوزيع المواد التعليمية المعتمدة",
      "تنظيم ورش عمل التحقق لأصحاب المصلحة",
      "تطوير أدلة المعلمين ومواد التدريب"
    ]
  },
  {
    id: 9,
    title: "Examinations & Assessment",
    titleAr: "الامتحانات والتقييم",
    icon: ClipboardCheck,
    mandate: "Oversee standardized testing and examination logistics.",
    mandateAr: "الإشراف على الاختبارات الموحدة ولوجستيات الامتحانات.",
    responsibilities: [
      "Design and administer standardized exams",
      "Prepare schedules, logistics, and question papers",
      "Coordinate secure printing and distribution",
      "Supervise exam centers and ensure rule compliance",
      "Analyze performance data to inform policies"
    ],
    responsibilitiesAr: [
      "تصميم وإدارة الامتحانات الموحدة",
      "إعداد الجداول واللوجستيات وأوراق الأسئلة",
      "تنسيق الطباعة والتوزيع الآمن",
      "الإشراف على مراكز الامتحان وضمان الامتثال للقواعد",
      "تحليل بيانات الأداء لإثراء السياسات"
    ]
  },
  {
    id: 10,
    title: "ICT Unit",
    titleAr: "وحدة تكنولوجيا المعلومات",
    icon: Monitor,
    mandate: "Provide reliable ICT infrastructure and support digital transformation.",
    mandateAr: "توفير بنية تحتية موثوقة لتكنولوجيا المعلومات ودعم التحول الرقمي.",
    responsibilities: [
      "Install and maintain hardware and software systems",
      "Ensure data integrity, backup, and system security",
      "Provide tech support and training to staff",
      "Maintain MIS and digital collaboration platforms",
      "Support e-learning and digital exam systems"
    ],
    responsibilitiesAr: [
      "تركيب وصيانة أنظمة الأجهزة والبرمجيات",
      "ضمان سلامة البيانات والنسخ الاحتياطي وأمن النظام",
      "توفير الدعم الفني والتدريب للموظفين",
      "صيانة نظام المعلومات الإدارية ومنصات التعاون الرقمي",
      "دعم أنظمة التعلم الإلكتروني والامتحانات الرقمية"
    ]
  },
  {
    id: 11,
    title: "Projects & Endowments",
    titleAr: "المشاريع والأوقاف",
    icon: Landmark,
    mandate: "Develop, implement, and manage funded projects and endowments.",
    mandateAr: "تطوير وتنفيذ وإدارة المشاريع الممولة والأوقاف.",
    responsibilities: [
      "Identify funding opportunities and write proposals",
      "Track project outputs and engage stakeholders",
      "Maintain financial records of endowments",
      "Support income-generating initiatives (e.g., Waqf)",
      "Establish partnerships for technical and financial support"
    ],
    responsibilitiesAr: [
      "تحديد فرص التمويل وكتابة المقترحات",
      "تتبع مخرجات المشروع وإشراك أصحاب المصلحة",
      "الحفاظ على السجلات المالية للأوقاف",
      "دعم المبادرات المدرة للدخل (مثل الوقف)",
      "إقامة شراكات للدعم الفني والمالي"
    ]
  },
  {
    id: 12,
    title: "Qur'anic & Majalis Centers",
    titleAr: "مراكز القرآن والمجالس",
    icon: ScrollText,
    mandate: "Standardize and promote Qur'anic memorization and Majalis learning.",
    mandateAr: "توحيد وتعزيز حفظ القرآن وتعلم المجالس.",
    responsibilities: [
      "Register all Qur'anic centers and Majalis",
      "Develop a national database and directory",
      "Conduct training for Qur'anic teachers",
      "Establish QA mechanisms for Tahfeez institutions",
      "Host national Qur'an competitions"
    ],
    responsibilitiesAr: [
      "تسجيل جميع مراكز القرآن والمجالس",
      "تطوير قاعدة بيانات ودليل وطني",
      "إجراء تدريب لمعلمي القرآن",
      "إنشاء آليات ضمان الجودة لمؤسسات التحفيظ",
      "استضافة مسابقات القرآن الوطنية"
    ]
  }
];

const governanceStructure = [
  {
    title: "General Assembly",
    titleAr: "الجمعية العامة",
    description: "Representative body of member schools and Secretariat officials that meets annually to set strategic direction.",
    descriptionAr: "الهيئة التمثيلية للمدارس الأعضاء ومسؤولي الأمانة العامة التي تجتمع سنوياً لتحديد التوجه الاستراتيجي.",
    icon: Users,
  },
  {
    title: "Executive Committee",
    titleAr: "اللجنة التنفيذية",
    description: "Elected leadership with two-year terms, including directors of major institutes and advisory members from partner organizations.",
    descriptionAr: "القيادة المنتخبة بفترات سنتين، تضم مديري المعاهد الرئيسية وأعضاء استشاريين من المنظمات الشريكة.",
    icon: Building2,
  },
  {
    title: "Executive Bureau",
    titleAr: "المكتب التنفيذي",
    description: "Professional Secretariat that manages day-to-day operations, policy execution, and administrative functions.",
    descriptionAr: "الأمانة المهنية التي تدير العمليات اليومية وتنفيذ السياسات والوظائف الإدارية.",
    icon: Briefcase,
  },
  {
    title: "Sub-Committees",
    titleAr: "اللجان الفرعية",
    description: "Technical groups for curriculum & training, examinations & scholarships, quality assurance, and socio-cultural activities.",
    descriptionAr: "مجموعات فنية للمناهج والتدريب، والامتحانات والمنح، وضمان الجودة، والأنشطة الاجتماعية والثقافية.",
    icon: Settings,
  },
];

const subCommittees = [
  { name: "Curriculum and Educational Resources Committee", nameAr: "لجنة المناهج والموارد التعليمية" },
  { name: "Assessment and Examination Committee", nameAr: "لجنة الاختبارات والتقييم" },
  { name: "Qur'anic Centers Coordination Committee", nameAr: "لجنة تنسيق المدارس القرآنية" },
  { name: "Technical Training Committee", nameAr: "اللجنة الفنية للتدريب" },
  { name: "Endowment and Investment Committee", nameAr: "لجنة الوقف والمشاريع الاستثمارية" },
];

export default function OrganisationStructure() {
  const { isRTL } = useLanguage();

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" data-testid="badge-page-type">
              {isRTL ? "الهيكل التنظيمي" : "Organisation"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="heading-page-title">
              {isRTL ? "الهيكل الإداري" : "Organisation Structure"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL 
                ? "الأمانة العامة للتعليم الإسلامي العربي في غامبيا تعمل من خلال هيكل حوكمة واضح يضمن التمثيل الديمقراطي والإدارة المهنية."
                : "AMAANAH operates through a well-defined governance structure ensuring democratic representation and professional management of Islamic and Arabic education across The Gambia."}
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              {isRTL ? "الحوكمة" : "Governance"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "هيكل الحوكمة" : "Governance Structure"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "تتكون الأمانة من أربعة مستويات رئيسية للحوكمة تضمن الإدارة الفعالة والمساءلة."
                : "AMAANAH consists of four main governance levels ensuring effective management and accountability."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {governanceStructure.map((item, i) => (
              <Card key={i} className="text-center hover-elevate" data-testid={`card-governance-${i}`}>
                <CardHeader>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{isRTL ? item.titleAr : item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{isRTL ? item.descriptionAr : item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              {isRTL ? "اللجان الفرعية" : "Sub-Committees"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "اللجان الفرعية للأمانة" : "Secretariat Sub-Committees"}
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {subCommittees.map((committee, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="px-4 py-2 text-sm"
                data-testid={`badge-committee-${i}`}
              >
                {isRTL ? committee.nameAr : committee.name}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              {isRTL ? "الوحدات الإدارية" : "Administrative Units"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "الوحدات الإدارية الأساسية" : "Core Administrative Units"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "تعمل الأمانة من خلال وحدات إدارية متخصصة، كل منها مسؤول عن جوانب محددة من عمليات التعليم الإسلامي."
                : "AMAANAH operates through specialized administrative units, each responsible for specific aspects of Islamic education operations."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {administrativeUnits.map((unit) => (
              <Card key={unit.id} className="hover-elevate" data-testid={`card-unit-${unit.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <unit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-base leading-tight">
                      {isRTL ? unit.titleAr : unit.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">
                      {isRTL ? "التفويض" : "Mandate"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? unit.mandateAr : unit.mandate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {isRTL ? "المسؤوليات الرئيسية:" : "Key Responsibilities:"}
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {(isRTL ? unit.responsibilitiesAr : unit.responsibilities).slice(0, 3).map((resp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Building2 className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {isRTL ? "المقر العام" : "Headquarters"}
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-4">
              {isRTL 
                ? "تم إنشاء المقر العام للأمانة في كانفين/سيركندا مقابل مركز الشيخ زايد الإقليمي للعناية البصرية لتنفيذ أنشطتها اليومية."
                : "The General Headquarters for AMAANAH was established in Kanifing-Serekunda, opposite Sheikh Zayid Regional Eye Center, to carry out its daily activities."}
            </p>
            <p className="text-primary-foreground/80">
              {isRTL 
                ? "يتضمن المقر مكاتب إدارية وقاعة اجتماعات ويعمل فيه 25 موظفاً باستثناء المراقبين الميدانيين."
                : "The headquarters includes administrative offices and a meeting room, with 25 employees working at the Secretariat's headquarters, excluding field workers."}
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
