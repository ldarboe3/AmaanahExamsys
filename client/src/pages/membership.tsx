import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CheckCircle, 
  Award, 
  BookOpen, 
  Shield,
  FileText,
  Building2,
  ChevronRight,
  Star
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import graduationImage from "@assets/generated_images/islamic_school_graduation_ceremony.png";

const membershipCategories = [
  {
    title: "General Membership",
    titleAr: "العضوية العامة",
    description: "Open to all Islamic schools under recognized organizations",
    descriptionAr: "مفتوحة لجميع المدارس الإسلامية التابعة لمنظمات معترف بها",
    features: [
      "Access to standardized curriculum",
      "Participation in national examinations",
      "Basic training opportunities",
      "Quality assurance support",
    ],
    featuresAr: [
      "الوصول إلى المناهج الموحدة",
      "المشاركة في الامتحانات الوطنية",
      "فرص التدريب الأساسية",
      "دعم ضمان الجودة",
    ],
    icon: Users,
  },
  {
    title: "Executive Membership",
    titleAr: "العضوية التنفيذية",
    description: "For institutions with enhanced engagement and leadership roles",
    descriptionAr: "للمؤسسات ذات المشاركة المحسّنة والأدوار القيادية",
    features: [
      "All General membership benefits",
      "Voting rights in General Assembly",
      "Priority training access",
      "Committee participation opportunities",
    ],
    featuresAr: [
      "جميع فوائد العضوية العامة",
      "حقوق التصويت في الجمعية العامة",
      "أولوية الوصول إلى التدريب",
      "فرص المشاركة في اللجان",
    ],
    icon: Star,
  },
  {
    title: "Permanent Executive (Advisory)",
    titleAr: "العضوية التنفيذية الدائمة (استشارية)",
    description: "Senior institutions providing guidance and expertise",
    descriptionAr: "المؤسسات الكبرى التي تقدم التوجيه والخبرة",
    features: [
      "All Executive membership benefits",
      "Advisory role in policy development",
      "Representation in key decisions",
      "Leadership mentorship opportunities",
    ],
    featuresAr: [
      "جميع فوائد العضوية التنفيذية",
      "دور استشاري في تطوير السياسات",
      "التمثيل في القرارات الرئيسية",
      "فرص الإرشاد القيادي",
    ],
    icon: Award,
  },
  {
    title: "Honorary Membership",
    titleAr: "العضوية الفخرية",
    description: "Recognition for distinguished contributions to Islamic education",
    descriptionAr: "تكريماً للإسهامات المميزة في التعليم الإسلامي",
    features: [
      "Special recognition status",
      "Invitation to official events",
      "Advisory consultation",
      "Legacy acknowledgment",
    ],
    featuresAr: [
      "حالة اعتراف خاصة",
      "دعوة للفعاليات الرسمية",
      "استشارة استشارية",
      "الاعتراف بالإرث",
    ],
    icon: Shield,
  },
];

const benefits = [
  { icon: BookOpen, title: "Standardized Curriculum", titleAr: "المناهج الموحدة", description: "Access to approved syllabuses, textbooks, and teaching guides", descriptionAr: "الوصول إلى المناهج والكتب المدرسية المعتمدة وأدلة التدريس" },
  { icon: Award, title: "Examinations & Certification", titleAr: "الامتحانات والشهادات", description: "Participation in national certification frameworks", descriptionAr: "المشاركة في أطر الشهادات الوطنية" },
  { icon: Users, title: "Teacher Development", titleAr: "تطوير المعلمين", description: "Training workshops and professional development opportunities", descriptionAr: "ورش التدريب وفرص التطوير المهني" },
  { icon: Shield, title: "Quality Assurance", titleAr: "ضمان الجودة", description: "Monitoring, evaluation, and institutional support", descriptionAr: "المراقبة والتقييم والدعم المؤسسي" },
  { icon: Building2, title: "Data Systems", titleAr: "أنظمة البيانات", description: "Inclusion in national educational data systems", descriptionAr: "الإدراج في أنظمة البيانات التعليمية الوطنية" },
  { icon: FileText, title: "Resources & Projects", titleAr: "الموارد والمشاريع", description: "Access to library resources and development projects", descriptionAr: "الوصول إلى موارد المكتبة ومشاريع التطوير" },
];

const howToJoin = [
  { step: 1, title: "Submit Application", titleAr: "تقديم الطلب", description: "Submit written application via supervising/affiliated organization", descriptionAr: "قدم طلباً مكتوباً عبر منظمة إشرافية/شريكة" },
  { step: 2, title: "Pay Registration", titleAr: "دفع التسجيل", description: "Pay registration fee and annual subscription by membership level", descriptionAr: "دفع رسوم التسجيل والاشتراك السنوي حسب مستوى العضوية" },
  { step: 3, title: "Accept Guidelines", titleAr: "قبول الإرشادات", description: "Agree to use approved curricula and comply with Secretariat regulations", descriptionAr: "وافق على استخدام المناهج المعتمدة والامتثال لأنظمة الأمانة" },
  { step: 4, title: "Get Verified", titleAr: "الحصول على التحقق", description: "Complete verification process and receive membership confirmation", descriptionAr: "أكمل عملية التحقق وتلقي تأكيد العضوية" },
];

export default function Membership() {
  const { isRTL } = useLanguage();
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section 
        className="relative py-12 md:py-12"
        style={{ backgroundImage: `url(${graduationImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/50" />
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/20 text-white border-primary/30">{isRTL ? "العضوية" : "Membership"}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {isRTL ? "انضم إلى الأمانة" : "Join AMAANAH"}
            </h1>
            <p className="text-lg text-white/90 mb-8">
              {isRTL 
                ? "كن جزءاً من شبكة موحدة من المؤسسات التعليمية الإسلامية عبر غامبيا. احصل على دعم المناهج والامتحانات والتدريب على التدريس وخدمات ضمان الجودة."
                : "Become part of a unified network of Islamic educational institutions across The Gambia. Access curriculum support, examinations, teacher training, and quality assurance services."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/school-registration">
                <Button size="lg" data-testid="button-register-school">
                  Register Your School
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Categories */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "الفئات" : "Categories"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "مستويات العضوية" : "Membership Levels"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "تقدم الأمانة فئات عضوية مختلفة لاستيعاب أنواع مختلفة من المؤسسات التعليمية الإسلامية."
                : "AMAANAH offers different membership categories to accommodate various types of Islamic educational institutions."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {membershipCategories.map((category, i) => (
              <Card key={i} className="hover-elevate h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <category.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{isRTL ? category.titleAr : category.title}</CardTitle>
                  <CardDescription>{isRTL ? category.descriptionAr : category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(isRTL ? category.featuresAr : category.features).map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "القيمة" : "Value"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "فوائد العضوية" : "Membership Benefits"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "انضم إلى الأمانة واحصل على دعم شامل لمهمة مؤسستك التعليمية."
                : "Join AMAANAH and access comprehensive support for your institution's educational mission."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-4 p-6 bg-background rounded-lg hover-elevate">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{isRTL ? benefit.titleAr : benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{isRTL ? benefit.descriptionAr : benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "العملية" : "Process"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "كيفية الانضمام" : "How to Join"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "اتبع هذه الخطوات لتصبح عضواً في الأمانة."
                : "Follow these steps to become a member of AMAANAH."}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {howToJoin.map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-foreground mb-1">{isRTL ? item.titleAr : item.title}</h3>
                    <p className="text-muted-foreground">{isRTL ? item.descriptionAr : item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Card className="inline-block">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">{isRTL ? "جاهز للانضمام؟" : "Ready to join?"}</h3>
                  <p className="text-muted-foreground mb-4">
                    {isRTL 
                      ? "سجل مدرستك عبر الإنترنت وابدأ عملية العضوية."
                      : "Register your school online and start the membership process."}
                  </p>
                  <Link href="/school-registration">
                    <Button>
                      {isRTL ? "ابدأ التسجيل" : "Start Registration"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="py-12 md:py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Award className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isRTL ? "الاعتراف والشهادات" : "Recognition & Certification"}
          </h2>
          <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            {isRTL 
              ? "يمكن للمؤسسات أن تتلقى شهادات الاعتراف والمشاركة في أطر الشهادات الوطنية من خلال الأمانة."
              : "Institutions can receive Certificates of Recognition and participate in national certification frameworks through AMAANAH."}
          </p>
          <Link href="/contact">
            <Button variant="secondary" size="lg">
              {isRTL ? "تعرف على المزيد عن الاعتراف" : "Learn More About Recognition"}
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
