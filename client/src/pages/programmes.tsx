import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  Shield, 
  Building2,
  Users,
  FileCheck,
  Database,
  Award,
  Globe,
  Heart,
  CheckCircle
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import teacherImage from "@assets/generated_images/islamic_teacher_teaching_students.png";

const programmes = [
  {
    id: "curriculum",
    title: "Curriculum Development & Teacher Training",
    titleAr: "تطوير المناهج والتدريب على التدريس",
    icon: BookOpen,
    color: "primary",
    features: [
      "Lead curriculum design and review (syllabuses, textbooks)",
      "Commission writing workshops and teacher orientation",
      "Maintain electronic/hard-copy repositories of curriculum materials",
      "Conduct training needs assessments",
      "Plan and monitor in-service training programs",
    ],
    featuresAr: [
      "قيادة تصميم المناهج والمراجعة (المناهج الدراسية، الكتب المدرسية)",
      "تنظيم ورش كتابة وتوجيه المعلمين",
      "الحفاظ على مستودعات إلكترونية وورقية لمواد المناهج",
      "إجراء تقييمات احتياجات التدريب",
      "تخطيط ومراقبة برامج التدريب أثناء الخدمة",
    ],
  },
  {
    id: "examinations",
    title: "Examinations, Assessment & Certification",
    titleAr: "الامتحانات والتقييم والشهادات",
    icon: Award,
    color: "chart-2",
    features: [
      "Develop and validate exam papers and marking schemes",
      "Oversee conduct of examinations, marking, tabulation, validation",
      "Issue certificates and maintain results archives",
      "Analyse results to inform curriculum improvements",
      "National certification framework",
    ],
    featuresAr: [
      "تطوير والتحقق من صحة أوراق الامتحان وخطط التصحيح",
      "الإشراف على إجراء الامتحانات والتصحيح والجدولة والتحقق",
      "إصدار الشهادات والحفاظ على أرشيفات النتائج",
      "تحليل النتائج لتحسين المناهج",
      "الإطار الوطني للشهادات",
    ],
  },
  {
    id: "quality",
    title: "Quality Assurance & Monitoring (QAM)",
    titleAr: "ضمان الجودة والمراقبة",
    icon: Shield,
    color: "chart-3",
    features: [
      "Coordinate national/regional monitoring through QALO and cluster monitors",
      "Collect and analyse institutional data and monitoring reports",
      "Identify gaps and best practices; liaise with regions and MoBSE",
      "Issue Certificates of Recognition",
      "Maintain statistical databases",
    ],
    featuresAr: [
      "تنسيق المراقبة الوطنية والإقليمية من خلال QALO والمراقبين الكلاسيين",
      "جمع وتحليل البيانات المؤسسية وتقارير المراقبة",
      "تحديد الفجوات وأفضل الممارسات والتواصل مع المناطق ووزارة التعليم",
      "إصدار شهادات الاعتراف",
      "الحفاظ على قواعد البيانات الإحصائية",
    ],
  },
  {
    id: "endowment",
    title: "Endowment & Projects",
    titleAr: "الأوقاف والمشاريع",
    icon: Building2,
    color: "chart-4",
    features: [
      "Coordinate endowment contributions and special accounts",
      "Resource mobilisation (infrastructure, materials, maintenance)",
      "Lease and manage AMAANAH properties and assets",
      "Develop proposals; supervise implementation",
      "Maintain project registers",
    ],
    featuresAr: [
      "تنسيق مساهمات الأوقاف والحسابات الخاصة",
      "تعبئة الموارد (البنية التحتية والمواد والصيانة)",
      "تأجير وإدارة ممتلكات وأصول الأمانة",
      "تطوير المقترحات والإشراف على التنفيذ",
      "الحفاظ على سجلات المشاريع",
    ],
  },
];

const bureauUnits = [
  {
    title: "Administration Unit",
    titleAr: "وحدة الإدارة",
    roles: ["Records/Secretariat", "HR", "Finance", "Public Relations", "IT"],
    rolesAr: ["السجلات/الأمانة", "الموارد البشرية", "المالية", "العلاقات العامة", "تقنية المعلومات"],
    icon: Database,
  },
  {
    title: "Programmes & Operations Unit",
    titleAr: "وحدة البرامج والعمليات",
    roles: ["Curriculum Development & Training", "Assessment/Examinations", "Quality Assurance & Monitoring", "Data and Certification"],
    rolesAr: ["تطوير المناهج والتدريب", "التقييم/الامتحانات", "ضمان الجودة والمراقبة", "البيانات والشهادات"],
    icon: GraduationCap,
  },
  {
    title: "Endowment & Projects Unit",
    titleAr: "وحدة الأوقاف والمشاريع",
    roles: ["Endowment Coordination", "Resource Mobilisation", "Project Development", "Project Supervision"],
    rolesAr: ["تنسيق الأوقاف", "تعبئة الموارد", "تطوير المشاريع", "الإشراف على المشاريع"],
    icon: Building2,
  },
];

const keyRoles = [
  { en: "Administrative Secretary (Executive Secretary)", ar: "السكرتير الإداري (السكرتير التنفيذي)" },
  { en: "Secretary/Records Manager", ar: "أمين السجلات/مدير السجلات" },
  { en: "Human Resources Officer", ar: "مسؤول الموارد البشرية" },
  { en: "Treasurer/Accounting Officer", ar: "أمين الصندوق/مسؤول المحاسبة" },
  { en: "Public Relations Officer", ar: "مسؤول العلاقات العامة" },
  { en: "IT Officer", ar: "مسؤول تقنية المعلومات" },
  { en: "Head of Programmes/Operations", ar: "رئيس البرامج/العمليات" },
  { en: "Curriculum Development & Training Officer", ar: "مسؤول تطوير المناهج والتدريب" },
  { en: "Assessment/Examinations Officer", ar: "مسؤول التقييم/الامتحانات" },
  { en: "Quality Assurance & Monitoring Officer", ar: "مسؤول ضمان الجودة والمراقبة" },
  { en: "Quality Assurance Liaison Officers (regional)", ar: "مسؤولو الاتصال لضمان الجودة (إقليمي)" },
  { en: "Head of Endowment & Projects", ar: "رئيس الأوقاف والمشاريع" },
];

export default function Programmes() {
  const { isRTL } = useLanguage();
  
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">{isRTL ? "عملنا" : "Our Work"}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {isRTL ? "البرامج والخدمات" : "Programmes & Services"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL 
                ? "خدمات تعليمية شاملة تدعم المدارس والمؤسسات الإسلامية عبر غامبيا من خلال تطوير المناهج والامتحانات وضمان الجودة والمزيد."
                : "Comprehensive educational services supporting Madrassah and Islamic institutions across The Gambia through curriculum development, examinations, quality assurance, and more."}
            </p>
          </div>
        </div>
      </section>

      {/* Main Programmes */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="space-y-12">
            {programmes.map((programme, i) => (
              <div 
                key={programme.id} 
                id={programme.id}
                className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className={`w-14 h-14 rounded-md bg-${programme.color}/10 flex items-center justify-center mb-4`}>
                    <programme.icon className={`w-7 h-7 text-${programme.color}`} />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    {isRTL ? programme.titleAr : programme.title}
                  </h2>
                  <ul className="space-y-3">
                    {(isRTL ? programme.featuresAr : programme.features).map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`bg-muted/30 rounded-xl p-8 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  <Card className="hover-elevate">
                    <CardHeader className="text-center">
                      <programme.icon className="w-16 h-16 text-primary mx-auto mb-4" />
                      <CardTitle>{isRTL ? programme.titleAr : programme.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        {isRTL 
                          ? "دعم التميز في التعليم الإسلامي والعربي من خلال التنسيق المهني وضمان الجودة."
                          : "Supporting excellence in Islamic and Arabic education through professional coordination and quality assurance."}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Welfare */}
      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img 
                src={teacherImage} 
                alt="Community engagement" 
                className="rounded-lg shadow-xl"
              />
            </div>
            <div>
              <Badge variant="outline" className="mb-4">{isRTL ? "المجتمع" : "Community"}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                {isRTL ? "الرعاية الاجتماعية والنشر" : "Social Welfare & Propagation"}
              </h2>
              <ul className="space-y-4">
                {(isRTL ? [
                  "تعزيز الثقافة الإسلامية والمشاركة المجتمعية",
                  "دعم برامج رفاهية الموظفين والطلاب",
                  "أنشطة المعلومات العامة والتوعية والدعوة",
                  "الخدمة المجتمعية والشراكات",
                ] : [
                  "Promote Islamic culture and community engagement",
                  "Support staff welfare and student welfare programmes",
                  "Public information, sensitisation, and da'wa activities",
                  "Community outreach and partnerships",
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Bureau */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "الإدارة" : "Administration"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "المكتب التنفيذي" : "Executive Bureau"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "المكتب التنفيذي هو مركز الإدارة في الأمانة، يضمن تنفيذ السياسات والتخطيط التعليمي وإدارة الموظفين وإعداد الميزانيات والتقارير وأنظمة البيانات والعلاقات العامة والتنسيق الإقليمي والمصالحة."
                : "The Bureau is the management hub of AMAANAH, ensuring policy execution, educational planning, staff management, budgeting and reporting, data systems, public relations, regional coordination, and reconciliation."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {bureauUnits.map((unit, i) => (
              <Card key={i} className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <unit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{isRTL ? unit.titleAr : unit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(isRTL ? unit.rolesAr : unit.roles).map((role, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {role}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-muted/30 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">{isRTL ? "الأدوار الرئيسية" : "Key Roles"}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {keyRoles.map((role, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{isRTL ? role.ar : role.en}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
