import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Briefcase, 
  Users, 
  BookOpen, 
  FileText, 
  Monitor, 
  DollarSign,
  GraduationCap,
  Shield,
  Megaphone,
  Award
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const executiveRoles = [
  {
    title: "Executive Director",
    titleAr: "المدير التنفيذي",
    category: "Leadership",
    categoryAr: "القيادة",
    icon: Briefcase,
    description: "Provides overall leadership and coordination for internal operations and strategic decisions. Oversees day-to-day operations and implements Executive Committee resolutions.",
    descriptionAr: "يوفر القيادة الشاملة والتنسيق للعمليات الداخلية والقرارات الاستراتيجية. يشرف على العمليات اليومية وينفذ قرارات اللجنة التنفيذية.",
    responsibilities: [
      "Strategic leadership and vision implementation",
      "Executive Committee liaison and reporting",
      "Cross-functional coordination and oversight",
      "Staff performance and development oversight"
    ]
  },
  {
    title: "Administrative Secretary",
    titleAr: "السكرتير الإداري",
    category: "Administration",
    categoryAr: "الإدارة",
    icon: FileText,
    description: "Manages the secretariat and record office, ensuring accurate institutional records and supporting internal/external communication.",
    descriptionAr: "يدير الأمانة ومكتب السجلات، ويضمن دقة السجلات المؤسسية ويدعم الاتصال الداخلي والخارجي.",
    responsibilities: [
      "Correspondence and filing management",
      "Internal communication facilitation",
      "Documentation and records safeguarding",
      "Administrative efficiency oversight"
    ]
  },
  {
    title: "Head of Programmes & Operations",
    titleAr: "رئيس البرامج والعمليات",
    category: "Programmes",
    categoryAr: "البرامج",
    icon: BookOpen,
    description: "Leads curriculum development, assessment, quality assurance, and monitoring activities across all affiliated institutions.",
    descriptionAr: "يقود تطوير المناهج والتقييم وضمان الجودة وأنشطة المراقبة عبر جميع المؤسسات التابعة.",
    responsibilities: [
      "Curriculum development and training coordination",
      "Examination and assessment oversight",
      "Quality assurance and monitoring management",
      "Data and certification administration"
    ]
  },
  {
    title: "Public Relations Officer",
    titleAr: "مسؤول العلاقات العامة",
    category: "Communications",
    categoryAr: "الاتصالات",
    icon: Megaphone,
    description: "Manages external relations, public image, communications, and information dissemination to stakeholders and the public.",
    descriptionAr: "يدير العلاقات الخارجية والصورة العامة والاتصالات ونشر المعلومات لأصحاب المصلحة والجمهور.",
    responsibilities: [
      "External relations and stakeholder engagement",
      "Media management and public campaigns",
      "Institutional partnership coordination",
      "Communication materials development"
    ]
  },
  {
    title: "Human Resources Officer",
    titleAr: "مسؤول الموارد البشرية",
    category: "Human Resources",
    categoryAr: "الموارد البشرية",
    icon: Users,
    description: "Oversees human resource development, staff welfare, performance management, and HR policy compliance.",
    descriptionAr: "يشرف على تنمية الموارد البشرية ورفاهية الموظفين وإدارة الأداء والامتثال لسياسة الموارد البشرية.",
    responsibilities: [
      "Recruitment and onboarding",
      "Staff welfare and development",
      "Performance management",
      "HR policy implementation"
    ]
  },
  {
    title: "Treasurer/Accounting Officer",
    titleAr: "أمين الصندوق/مسؤول المحاسبة",
    category: "Finance",
    categoryAr: "المالية",
    icon: DollarSign,
    description: "Ensures accurate financial management, reporting, and compliance with financial policies and procedures.",
    descriptionAr: "يضمن الإدارة المالية الدقيقة والتقارير والامتثال للسياسات والإجراءات المالية.",
    responsibilities: [
      "Financial transaction management",
      "Budget implementation and reporting",
      "Audit coordination",
      "Financial compliance oversight"
    ]
  },
  {
    title: "Curriculum & Training Officer",
    titleAr: "مسؤول المناهج والتدريب",
    category: "Education",
    categoryAr: "التعليم",
    icon: GraduationCap,
    description: "Leads curriculum design, review, and implementation while coordinating teacher training and professional development.",
    descriptionAr: "يقود تصميم المناهج ومراجعتها وتنفيذها مع تنسيق تدريب المعلمين والتطوير المهني.",
    responsibilities: [
      "Curriculum design and alignment",
      "Learning materials development",
      "Teacher training coordination",
      "Curriculum implementation monitoring"
    ]
  },
  {
    title: "Assessment & Examinations Officer",
    titleAr: "مسؤول التقييم والامتحانات",
    category: "Assessment",
    categoryAr: "التقييم",
    icon: Award,
    description: "Oversees standardized testing, examination logistics, marking, and results analysis for all affiliated institutions.",
    descriptionAr: "يشرف على الاختبارات الموحدة ولوجستيات الامتحانات والتصحيح وتحليل النتائج لجميع المؤسسات التابعة.",
    responsibilities: [
      "Examination development and administration",
      "Marking coordination and quality control",
      "Results analysis and reporting",
      "Examination policy compliance"
    ]
  },
  {
    title: "Quality Assurance & Monitoring Officer",
    titleAr: "مسؤول ضمان الجودة والمراقبة",
    category: "Quality",
    categoryAr: "الجودة",
    icon: Shield,
    description: "Coordinates national and regional monitoring, collects institutional data, and ensures compliance with education standards.",
    descriptionAr: "ينسق المراقبة الوطنية والإقليمية ويجمع البيانات المؤسسية ويضمن الامتثال لمعايير التعليم.",
    responsibilities: [
      "School monitoring and evaluation",
      "Quality standards compliance",
      "Institutional data collection",
      "Performance improvement support"
    ]
  },
  {
    title: "ICT Officer",
    titleAr: "مسؤول تكنولوجيا المعلومات",
    category: "Technology",
    categoryAr: "التكنولوجيا",
    icon: Monitor,
    description: "Provides reliable ICT infrastructure, supports digital transformation, and maintains data systems across the organization.",
    descriptionAr: "يوفر بنية تحتية موثوقة لتكنولوجيا المعلومات ويدعم التحول الرقمي ويحافظ على أنظمة البيانات عبر المنظمة.",
    responsibilities: [
      "IT systems maintenance",
      "Digital platform management",
      "Technical support and training",
      "Data security and backup"
    ]
  },
  {
    title: "Head of Endowment & Projects",
    titleAr: "رئيس الأوقاف والمشاريع",
    category: "Projects",
    categoryAr: "المشاريع",
    icon: Briefcase,
    description: "Develops, implements, and manages funded projects, endowments, and resource mobilization initiatives.",
    descriptionAr: "يطور وينفذ ويدير المشاريع الممولة والأوقاف ومبادرات تعبئة الموارد.",
    responsibilities: [
      "Project development and management",
      "Endowment fund coordination",
      "Donor engagement and partnerships",
      "Resource mobilization"
    ]
  }
];

const executiveCommittee = [
  {
    title: "Chairman",
    titleAr: "الرئيس",
    description: "Leads the Executive Committee and represents AMAANAH at the highest level",
  },
  {
    title: "Vice Chairman",
    titleAr: "نائب الرئيس",
    description: "Supports the Chairman and assumes leadership in the Chairman's absence",
  },
  {
    title: "Executive Director",
    titleAr: "المدير التنفيذي",
    description: "Chief executive responsible for day-to-day operations and staff management",
  },
  {
    title: "Secretary",
    titleAr: "السكرتير",
    description: "Manages official correspondence and maintains institutional records",
  },
  {
    title: "Treasurer",
    titleAr: "أمين الصندوق",
    description: "Oversees financial management and reporting to the Committee",
  },
];

export default function SeniorExecutives() {
  const { isRTL } = useLanguage();

  const groupedRoles = executiveRoles.reduce((acc, role) => {
    const category = isRTL ? role.categoryAr : role.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(role);
    return acc;
  }, {} as Record<string, typeof executiveRoles>);

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" data-testid="badge-page-type">
              {isRTL ? "القيادة" : "Leadership"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="heading-page-title">
              {isRTL ? "القيادة التنفيذية" : "Senior Executives"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL 
                ? "تعرف على فريق القيادة المسؤول عن إدارة وتطوير التعليم الإسلامي والعربي في غامبيا."
                : "Meet the leadership team responsible for managing and developing Islamic and Arabic education across The Gambia."}
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              {isRTL ? "اللجنة التنفيذية" : "Executive Committee"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "أعضاء اللجنة التنفيذية" : "Executive Committee Members"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "تتكون اللجنة التنفيذية من مديري المعاهد الكبرى ورئيس المجلس الإسلامي الأعلى والمستشارين من المؤسسات التعليمية."
                : "The Executive Committee consists of directors of major institutes, the head of the Supreme Islamic Council, and advisers from educational institutions."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {executiveCommittee.map((member, i) => (
              <Card key={i} className="text-center hover-elevate" data-testid={`card-committee-${i}`}>
                <CardHeader className="pb-2">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {(isRTL ? member.titleAr : member.title).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">{isRTL ? member.titleAr : member.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">{member.description}</CardDescription>
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
              {isRTL ? "المكتب التنفيذي" : "Executive Bureau"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "الأدوار الرئيسية في المكتب التنفيذي" : "Key Roles in the Executive Bureau"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "المكتب التنفيذي هو مركز الإدارة للأمانة، يضمن تنفيذ السياسات والتخطيط التعليمي وإدارة الموظفين."
                : "The Executive Bureau is the management hub of AMAANAH, ensuring policy execution, educational planning, and staff management."}
            </p>
          </div>

          <div className="space-y-12">
            {Object.entries(groupedRoles).map(([category, roles]) => (
              <div key={category}>
                <h3 className="text-xl font-semibold text-foreground mb-6 text-center md:text-left">
                  {category}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roles.map((role, i) => (
                    <Card key={i} className="hover-elevate" data-testid={`card-role-${role.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <role.icon className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{isRTL ? role.titleAr : role.title}</CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {isRTL ? role.categoryAr : role.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? role.descriptionAr : role.description}
                        </p>
                        <div>
                          <p className="text-xs font-medium text-foreground mb-2">
                            {isRTL ? "المسؤوليات الرئيسية:" : "Key Responsibilities:"}
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {role.responsibilities.map((resp, j) => (
                              <li key={j} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
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
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Users className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {isRTL ? "انضم إلى فريقنا" : "Join Our Team"}
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-4">
              {isRTL 
                ? "نحن نبحث دائماً عن أفراد موهوبين ومتحمسين للانضمام إلى مهمتنا في تطوير التعليم الإسلامي والعربي."
                : "We are always looking for talented and passionate individuals to join our mission of developing Islamic and Arabic education."}
            </p>
            <p className="text-primary-foreground/80">
              {isRTL 
                ? "للاستفسار عن فرص العمل، يرجى التواصل معنا على info@amaanah.gm"
                : "For inquiries about employment opportunities, please contact us at info@amaanah.gm"}
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
