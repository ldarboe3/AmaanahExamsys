import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Target, 
  Eye, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Building2,
  Award,
  Heart,
  Globe,
  CheckCircle,
  Calendar,
  MapPin,
  ArrowRight,
  History
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";
import libraryImage from "@assets/generated_images/islamic_library_with_students.png";

const objectives = [
  { 
    en: "Strengthen unity among Madrassah and Islamic schools",
    ar: "تعزيز التفاهم والتعاون والتنسيق بين مؤسسات التعليم الإسلامي العربي في غامبيا"
  },
  { 
    en: "Coordinate and standardize curriculum, syllabi, teacher training, examinations, and certification",
    ar: "توحيد المناهج والامتحانات والشهادات وتدريب المعلمين"
  },
  { 
    en: "Partner with Government in national education development",
    ar: "تعزيز التعاون والشراكة مع الحكومة ومع الشركاء المعنيين"
  },
  { 
    en: "Improve quality and standards across institutions",
    ar: "رفع مستوى مؤسسات التعليم الإسلامي العربي من الناحية العلمية والمهنية"
  },
  { 
    en: "Promote girls' education and fight illiteracy",
    ar: "تشجيع تعليم البنات ومكافحة الجهل والأمية في المجتمع"
  },
  { 
    en: "Expand Islamic/Arabic education into technical, vocational, and skills tracks",
    ar: "تقوية دراسة المهارات الفنية والمهينة في المدارس العربية"
  },
  { 
    en: "Enhance access to reference materials and libraries including mobile units",
    ar: "العمل على توفير الكتب والمراجع النادرة للدراسين بإنشاء مكتبات إسلامية"
  },
  { 
    en: "Increase higher education opportunities for Madrassah graduates",
    ar: "العمل على زيادة فرص التعليم العالي لخريجي المدارس العربية الإسلامية"
  },
  { 
    en: "Improve educational environment and infrastructure in Arabic schools",
    ar: "تحسين البنية التحتية والبيئة الدراسية في المدارس العربية"
  },
  { 
    en: "Improve financial sustainability and encourage development activities",
    ar: "تحسين الوضع المالي لمؤسسات التعليم الإسلامي وتشجيعها للإسهام في الأنشطة التنموية"
  },
];

const foundingInstitutions = [
  "Talinding Islamic Institute",
  "Tadamun Islamic Studies Centre",
  "Bun Jeng Islamic Schools",
  "Omar Quraise Islamic School",
  "Brikama Islamic Institute",
  "Scientific Islamic School",
  "Muslim High School",
  "Sheikh Mass Kah Islamic Institute",
];

const governanceStructure = [
  {
    title: "General Assembly",
    titleAr: "الجمعية العامة",
    description: "Representative body of member schools and Secretariat officials; meets annually",
    descriptionAr: "الهيئة التمثيلية للمدارس الأعضاء ومسؤولي الأمانة؛ تجتمع سنوياً",
    icon: Users,
  },
  {
    title: "Executive Committee",
    titleAr: "اللجنة التنفيذية",
    description: "Elected leadership with two-year terms; with advisory members from partner Islamic organizations",
    descriptionAr: "القيادة المنتخبة بولاية سنتين؛ مع أعضاء استشاريين من المنظمات الإسلامية الشريكة",
    icon: Award,
  },
  {
    title: "Executive Bureau",
    titleAr: "المكتب التنفيذي",
    description: "Professional Secretariat that manages day-to-day operations",
    descriptionAr: "الأمانة المهنية التي تدير العمليات اليومية",
    icon: Building2,
  },
  {
    title: "Sub-Committees",
    titleAr: "اللجان الفرعية",
    description: "Technical groups supporting training & curriculum, examinations & scholarships, quality assurance, socio-cultural activities",
    descriptionAr: "مجموعات فنية تدعم التدريب والمناهج والامتحانات والمنح وضمان الجودة والأنشطة الاجتماعية والثقافية",
    icon: BookOpen,
  },
];

const historicalMilestones = [
  {
    year: "1963",
    event: "Establishment of Khalid bin Al-Waleed School in Kombo Gunjur by Sheikh Hattab Bojang",
    eventAr: "تأسيس مدرسة خالد بن الوليد في كومبو غونجور على يد الشيخ حطاب بوجانغ"
  },
  {
    year: "1968",
    event: "Founding of Talinding Islamic Institute under Sheikh Muhammad Al-Amin Ceesay",
    eventAr: "تأسيس معهد تالندين الإسلامي تحت قيادة الشيخ محمد الأمين سيسي"
  },
  {
    year: "1996",
    event: "AMAANAH founded on April 6 by principals of major Islamic schools",
    eventAr: "تأسيس الأمانة في 6 أبريل من قبل مدراء المدارس الإسلامية الكبرى"
  },
  {
    year: "1997",
    event: "Official registration with License No. 54/1997 on March 25",
    eventAr: "التسجيل الرسمي بترخيص رقم 54/1997 في 25 مارس"
  },
  {
    year: "1998",
    event: "Official inauguration by Minister of Education Mrs. Satang Jaw at Talinding Islamic Institute",
    eventAr: "التدشين الرسمي من قبل وزيرة التربية السيدة ساتانغ جاو في معهد تالندين الإسلامي"
  },
];

export default function About() {
  const { isRTL } = useLanguage();

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" data-testid="badge-about">
              {isRTL ? "عن الأمانة" : "About AMAANAH"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="heading-about-title">
              {isRTL ? "من نحن" : "Who We Are"}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {isRTL 
                ? "الأمانة العامة للتعليم الإسلامي العربي هي هيئة تنسيقية وطنية تأسست في أبريل 1996 من قبل المعاهد الإسلامية الرائدة لتوحيد وتوحيد ورفع مستوى التعليم الإسلامي والعربي في جميع أنحاء غامبيا."
                : "The General Secretariat for Islamic/Arabic Education (AMAANAH) is a national coordinating body founded in April 1996 by leading Madrassah institutions to unify, standardize, and elevate Islamic and Arabic education across The Gambia."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/about/organisation-structure">
                <Button variant="outline" data-testid="button-org-structure">
                  <Building2 className="w-4 h-4 me-2" />
                  {isRTL ? "الهيكل التنظيمي" : "Organisation Structure"}
                </Button>
              </Link>
              <Link href="/about/senior-executives">
                <Button variant="outline" data-testid="button-executives">
                  <Users className="w-4 h-4 me-2" />
                  {isRTL ? "القيادة التنفيذية" : "Senior Executives"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              <History className="w-3 h-3 me-1" />
              {isRTL ? "تاريخنا" : "Our History"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "التعليم الإسلامي العربي في غامبيا" : "Islamic Arabic Education in The Gambia"}
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              {isRTL 
                ? "جمهورية غامبيا من البلدان الإفريقية التي تهتم بالتعليم العربي منذ القديم. دخل هذا التعليم منذ دخول الإسلام على شكل كتاتيب المعروفة محلياً بـ'داره' باللغة الولوفية أو 'كرنتا' باللغة الماندنكية."
                : "The Republic of The Gambia, as a country with a Muslim majority, has been interested in Islamic Arabic education since ancient times. This education entered The Gambia since the introduction of Islam in the form of Kataatib known locally as 'Daara' in Wolof or 'Karantaa' in Mandinka."}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20" />
              {historicalMilestones.map((milestone, i) => (
                <div 
                  key={i} 
                  className={`relative flex items-start gap-4 mb-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className={`hidden md:block flex-1 ${i % 2 === 0 ? 'text-right pe-8' : 'text-left ps-8'}`}>
                    <p className="text-muted-foreground text-sm">
                      {isRTL ? milestone.eventAr : milestone.event}
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                  <div className={`flex-1 md:hidden ${i % 2 === 0 ? '' : ''}`}>
                    <p className="text-sm font-semibold text-primary">{milestone.year}</p>
                    <p className="text-muted-foreground text-sm">
                      {isRTL ? milestone.eventAr : milestone.event}
                    </p>
                  </div>
                  <div className={`hidden md:block flex-1 ${i % 2 === 0 ? 'ps-8' : 'pe-8 text-right'}`}>
                    <Badge variant="secondary" className="mb-2">{milestone.year}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="hover-elevate" data-testid="card-vision">
              <CardHeader>
                <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Eye className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl">{isRTL ? "رؤيتنا" : "Our Vision"}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {isRTL 
                    ? "مع حلول عام 2030 يتم بإذن الله تقديم التعليم النوعي المعاصر بتكلفة منخفضة إلى جميع الأطفال الذين اختار أولياء أمورهم نظام التعليم الإسلامي العربي ليتخرجوا بالعلم الرفيع والخلق السامي والمهارات الحياتية المتنوعة."
                    : "By the year 2030, God willing, contemporary quality education will be provided at a low cost to all children whose parents have chosen the Islamic Arabic education system so that they will graduate with high knowledge, good morals, and diverse skills."}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-mission">
              <CardHeader>
                <div className="w-14 h-14 rounded-md bg-chart-2/10 flex items-center justify-center mb-4">
                  <Target className="w-7 h-7 text-chart-2" />
                </div>
                <CardTitle className="text-2xl">{isRTL ? "رسالتنا" : "Our Mission"}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {isRTL 
                    ? "تقوية دراسة العلوم والثقافة الإسلامية العربية في غامبيا بواسطة اللغة العربية لغة القرآن الكريم والعبادة للمسلمين، ودعم جهود الحكومة في تحقيق أهداف السياسة التعليمية الوطنية وأهداف التعليم للجميع."
                    : "To coordinate curricula, assessments, teacher training, and quality assurance across Madrassah and Tahfiz institutions; strengthen partnerships with Government and stakeholders; and broaden learning opportunities including technical, vocational, and scientific fields."}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "أهدافنا" : "Our Goals"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "الأهداف الأساسية" : "Core Objectives"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {objectives.map((objective, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg" data-testid={`objective-${i}`}>
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90">{isRTL ? objective.ar : objective.en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img 
                src={libraryImage} 
                alt="Islamic library and learning" 
                className="rounded-lg shadow-xl"
              />
            </div>
            <div>
              <Badge variant="outline" className="mb-4">{isRTL ? "تراثنا" : "Our Heritage"}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                {isRTL ? "الشعار والرمز" : "Motto & Emblem"}
              </h2>
              <p className="text-muted-foreground mb-6">
                <strong className="text-foreground">{isRTL ? "الشعار:" : "Motto:"}</strong> {isRTL ? "التعليم من أجل التنمية" : "Education for Development"}
              </p>
              <p className="text-muted-foreground mb-6">
                {isRTL 
                  ? "يتميز الرمز بالقرآن/الكتاب والقلم الذي يدل على التعليم، مع الكمبيوتر الذي يرمز إلى تحويل المعرفة إلى تنمية؛ الألوان تعكس العلم الغامبي الذي يمثل هويتنا الوطنية والتزامنا."
                  : "The emblem features a Qur'an/book and pen signifying education, with a computer symbolizing the transformation of knowledge into development; colors reflect the Gambian flag representing our national identity and commitment."}
              </p>
              <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
                <img src={amaanahLogo} alt="AMAANAH Emblem" className="w-20 h-20 object-contain" />
                <div>
                  <p className="font-semibold text-foreground">GSIAE / AMAANAH</p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL 
                      ? "الأمانة العامة للتعليم الإسلامي والعربي في غامبيا"
                      : "General Secretariat for Islamic & Arabic Education in The Gambia"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "التنظيم" : "Organization"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "هيكل الحوكمة" : "Governance Structure"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "تعمل الأمانة من خلال هيكل حوكمة واضح يضمن التمثيل الديمقراطي والإدارة المهنية."
                : "AMAANAH operates through a well-defined governance structure ensuring democratic representation and professional management."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {governanceStructure.map((item, i) => (
              <Card key={i} className="text-center hover-elevate" data-testid={`governance-${i}`}>
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

          <div className="text-center mt-8">
            <Link href="/about/organisation-structure">
              <Button variant="outline" data-testid="button-view-structure">
                {isRTL ? "عرض الهيكل الكامل" : "View Full Structure"}
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "مؤسسونا" : "Our Founders"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "المؤسسات المؤسسة" : "Founding Institutions"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isRTL 
                ? "تأسست الأمانة في أبريل 1996 من قبل هذه المؤسسات التعليمية الإسلامية الرائدة."
                : "AMAANAH was founded in April 1996 by these pioneering Islamic educational institutions."}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {foundingInstitutions.map((institution, i) => (
              <div key={i} className="p-4 bg-background rounded-lg text-center hover-elevate border" data-testid={`institution-${i}`}>
                <GraduationCap className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{institution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <MapPin className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {isRTL ? "المقر الرئيسي" : "Headquarters"}
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-4">
              {isRTL 
                ? "تم إنشاء المقر العام للأمانة في كانفين/سيركندا مقابل مركز الشيخ زايد الإقليمي للعناية البصرية لتنفيذ أنشطتها اليومية."
                : "The General Headquarters was established in Kanifing-Serekunda, opposite Sheikh Zayid Regional Eye Center, to carry out daily activities."}
            </p>
            <p className="text-primary-foreground/80 mb-8">
              {isRTL 
                ? "يتضمن المقر مكاتب إدارية وقاعة اجتماعات ويعمل فيه 25 موظفاً باستثناء المراقبين الميدانيين."
                : "The headquarters includes administrative offices and a meeting room, with 25 employees working at the Secretariat, excluding field workers."}
            </p>
            <Link href="/contact">
              <Button variant="secondary" data-testid="button-contact-us">
                {isRTL ? "تواصل معنا" : "Contact Us"}
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
