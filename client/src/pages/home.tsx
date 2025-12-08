import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/public-layout";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Shield,
  Award,
  Building2,
  ChevronRight,
  Mail,
  CheckCircle,
  Globe,
  Handshake,
  Sparkles,
  ArrowRight,
  FileCheck,
  School
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { NewsArticle, ImpactStat, NewsCategory } from "@shared/schema";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";
import heroImage from "@assets/generated_images/african_madrassah_students_studying.png";
import teacherImage from "@assets/generated_images/islamic_teacher_teaching_students.png";
import graduationImage from "@assets/generated_images/islamic_school_graduation_ceremony.png";

const quickLinksEn = [
  { name: "Curriculum & Training", href: "/programmes#curriculum", icon: BookOpen, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { name: "Examinations", href: "/programmes#examinations", icon: Award, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "Quality Assurance", href: "/programmes#quality", icon: Shield, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Projects", href: "/programmes#endowment", icon: Building2, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { name: "Membership", href: "/membership", icon: Users, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

const quickLinksAr = [
  { name: "المناهج والتدريب", href: "/programmes#curriculum", icon: BookOpen, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { name: "الامتحانات", href: "/programmes#examinations", icon: Award, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "ضمان الجودة", href: "/programmes#quality", icon: Shield, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "المشاريع", href: "/programmes#endowment", icon: Building2, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { name: "العضوية", href: "/membership", icon: Users, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

const defaultImpactStats = [
  { label: "Member Schools", labelAr: "المدارس الأعضاء", value: "400+", icon: School },
  { label: "Years of Service", labelAr: "سنوات الخدمة", value: "28+", icon: Award },
  { label: "Regions Covered", labelAr: "المناطق المغطاة", value: "7", icon: Globe },
  { label: "Students Certified", labelAr: "الطلاب المعتمدون", value: "50K+", icon: GraduationCap },
];

const defaultNewsItems = [
  {
    title: "2024 Examination Results Released",
    date: "December 2024",
    excerpt: "Results for the 2024 national Islamic and Arabic education examinations are now available for verification.",
    category: "Examinations",
  },
  {
    title: "Teacher Training Workshop",
    date: "November 2024",
    excerpt: "AMAANAH conducted training workshops for teachers across all regions to enhance curriculum delivery.",
    category: "Training",
  },
  {
    title: "New Curriculum Standards",
    date: "October 2024",
    excerpt: "Updated curriculum guidelines released for Madrassah institutions following stakeholder consultations.",
    category: "Curriculum",
  },
];

interface NewsApiResponse {
  articles: NewsArticle[];
  categories: NewsCategory[];
}

export default function Home() {
  const { toast } = useToast();
  const { t, language, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  
  const quickLinks = language === 'ar' ? quickLinksAr : quickLinksEn;

  const { data: newsData } = useQuery<NewsApiResponse>({
    queryKey: ["/api/public/news"],
  });

  const { data: impactStatsData } = useQuery<ImpactStat[]>({
    queryKey: ["/api/public/impact-stats"],
  });

  const newsletterMutation = useMutation({
    mutationFn: (data: { email: string; name: string }) => 
      apiRequest("POST", "/api/public/newsletter/subscribe", data),
    onSuccess: () => {
      toast({
        title: isRTL ? "تم الاشتراك!" : "Subscribed!",
        description: isRTL ? "شكراً لاشتراكك في نشرتنا الإخبارية." : "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
      setName("");
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message || (isRTL ? "فشل الاشتراك. حاول مرة أخرى." : "Failed to subscribe. Please try again."),
        variant: "destructive",
      });
    },
  });

  const formatPublishedDate = (date: Date | string | null): string => {
    if (!date) return "";
    try {
      return format(new Date(date), "MMMM yyyy");
    } catch {
      return "";
    }
  };

  const newsItems = newsData?.articles?.length 
    ? newsData.articles.slice(0, 3).map(article => ({
        title: article.title,
        date: formatPublishedDate(article.publishedAt),
        excerpt: article.excerpt || "",
        category: newsData.categories?.find(c => c.id === article.categoryId)?.name || "General",
      }))
    : defaultNewsItems;

  const impactStats = impactStatsData?.length
    ? impactStatsData.slice(0, 4).map((stat, i) => ({
        label: stat.label,
        labelAr: stat.label,
        value: stat.value,
        icon: defaultImpactStats[i]?.icon || Award,
      }))
    : defaultImpactStats;

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && name) {
      newsletterMutation.mutate({ email, name });
    }
  };

  return (
    <PublicLayout>
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-primary/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl animate-fade-in">
            <Badge className="mb-6 px-4 py-2 text-sm bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 transition-all" data-testid="badge-hero">
              <Sparkles className="w-4 h-4 me-2" />
              {t.website.servingGambiaSince1996}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight" data-testid="heading-hero">
              {isRTL ? "التعليم من أجل التنمية" : (
                <>
                  Education for<br />
                  <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                    Development
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl leading-relaxed">
              {t.website.strengtheningUnity}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 glow-primary transition-all duration-300 hover:scale-105" data-testid="button-get-involved">
                  {t.website.getInvolved}
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-all duration-300" data-testid="button-learn-about">
                  {t.website.learnAboutAmaanah}
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      <section className="py-10 md:py-14 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-50" />
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "خدماتنا" : "Quick Access"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {isRTL ? "استكشف خدماتنا" : "Explore Our Services"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {isRTL ? "الوصول السريع إلى البرامج والخدمات الرئيسية" : "Quick access to our main programmes and services"}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {quickLinks.map((link, i) => (
              <Link key={link.name} href={link.href}>
                <Card className="h-full group cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm" data-testid={`card-quicklink-${i}`}>
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${link.color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                      <link.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-foreground leading-tight">{link.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 bg-gradient-to-br from-primary via-primary to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">{isRTL ? "تأثيرنا" : "Our Impact"}</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {isRTL ? "تأثيرنا الوطني" : "National Impact"}
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto text-lg">
              {isRTL 
                ? "التنسيق الوطني للتعليم الإسلامي والقرآني بالشراكة مع الحكومة"
                : "National coordination of Madrassah and Tahfiz education in partnership with Government"}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {impactStats.map((stat, i) => (
              <div key={stat.label} className="text-center group" data-testid={`stat-${i}`}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                  <stat.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-white/80 font-medium">{isRTL ? stat.labelAr : stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge variant="outline" className="mb-4">{isRTL ? "عن الأمانة" : "About AMAANAH"}</Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                {isRTL ? "توحيد التعليم الإسلامي منذ 1996" : "Unifying Islamic Education Since 1996"}
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                {isRTL 
                  ? "الأمانة العامة للتعليم الإسلامي العربي هي هيئة تنسيقية وطنية تأسست في أبريل 1996 من قبل المعاهد الإسلامية الرائدة لتوحيد وتوحيد ورفع مستوى التعليم الإسلامي والعربي في جميع أنحاء غامبيا."
                  : "The General Secretariat for Islamic/Arabic Education (AMAANAH) is a national coordinating body founded in April 1996 by leading Madrassah institutions to unify, standardize, and elevate Islamic and Arabic education across The Gambia."}
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  isRTL ? "تعزيز الوحدة بين المدارس الإسلامية" : "Strengthen unity among Madrassah and Islamic schools",
                  isRTL ? "تنسيق وتوحيد المناهج والامتحانات" : "Coordinate and standardize curriculum and examinations",
                  isRTL ? "الشراكة مع الحكومة في تطوير التعليم" : "Partner with Government in national education development",
                  isRTL ? "تعزيز تعليم الفتيات ومحاربة الأمية" : "Promote girls' education and fight illiteracy",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/about">
                <Button size="lg" className="px-8" data-testid="button-learn-more">
                  {isRTL ? "اعرف المزيد" : "Learn More About Us"}
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </Link>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl" />
                <img 
                  src={teacherImage} 
                  alt="Islamic education in The Gambia" 
                  className="relative rounded-2xl shadow-2xl w-full"
                />
              </div>
              <Card className="absolute -bottom-8 -left-8 md:left-auto md:-right-8 shadow-xl border-0 bg-card/95 backdrop-blur-sm" data-testid="card-years">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">28+</p>
                    <p className="text-muted-foreground text-sm">{isRTL ? "سنوات التميز" : "Years of Excellence"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 section-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{isRTL ? "ماذا نقدم" : "What We Offer"}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isRTL ? "خدماتنا الأساسية" : "Our Core Services"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm overflow-hidden" data-testid="card-service-1">
              <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <Handshake className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle className="text-xl">{isRTL ? "الشراكة الحكومية" : "Government Partnership"}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {isRTL 
                    ? "العمل مع وزارة التعليم الأساسي والثانوي على السياسة الوطنية والتنفيذ للتعليم الإسلامي."
                    : "Working with Ministry of Basic and Secondary Education on national policy and implementation for Islamic education."}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm overflow-hidden" data-testid="card-service-2">
              <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <GraduationCap className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-xl">{isRTL ? "تدريب المعلمين" : "Teacher Training"}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {isRTL 
                    ? "برامج تدريب شاملة أثناء الخدمة ومناهج موحدة للمعلمين في جميع المناطق."
                    : "Comprehensive in-service training programs and standardized curricula for educators across all regions."}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm overflow-hidden" data-testid="card-service-3">
              <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <Award className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">{isRTL ? "الشهادات" : "Certification"}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {isRTL 
                    ? "إطار الامتحانات والشهادات الوطنية المعترف بها في جميع المؤسسات التعليمية في غامبيا."
                    : "National examination and certification framework recognized across educational institutions in The Gambia."}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <Badge variant="outline" className="mb-4">{isRTL ? "آخر الأخبار" : "Latest News"}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {isRTL ? "آخر التحديثات" : "Latest Updates"}
              </h2>
            </div>
            <Link href="/news">
              <Button variant="outline" size="lg" className="group" data-testid="button-view-news">
                {isRTL ? "عرض جميع الأخبار" : "View All News"}
                <ArrowRight className="w-4 h-4 ms-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {newsItems.map((item, i) => (
              <Card key={i} className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden" data-testid={`card-news-${i}`}>
                <div className="h-1 bg-gradient-to-r from-primary to-emerald-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="secondary" className="text-xs font-medium">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">{item.excerpt}</CardDescription>
                  <Button variant="ghost" className="px-0 mt-4 text-primary hover:text-primary/80 hover:bg-transparent group/btn" data-testid={`button-read-more-${i}`}>
                    {isRTL ? "اقرأ المزيد" : "Read More"} 
                    <ArrowRight className="w-4 h-4 ms-1 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${graduationImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-emerald-600/90" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <Badge className="mb-6 bg-white/20 text-white border-white/30">{isRTL ? "خدماتنا" : "Our Services"}</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {isRTL ? "الوصول إلى خدماتنا" : "Access Our Services"}
          </h2>
          <p className="text-white/90 text-lg max-w-2xl mx-auto mb-10">
            {isRTL 
              ? "تحقق من نتائج الامتحانات، تحقق من الشهادات، أو سجل مدرستك مع الأمانة."
              : "Check your examination results, verify certificates, or register your school with AMAANAH."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/results">
              <Button size="lg" variant="secondary" className="min-w-[200px] py-6 text-base shadow-xl hover:shadow-2xl transition-all hover:scale-105" data-testid="button-result-checker">
                <FileCheck className="w-5 h-5 me-2" />
                {isRTL ? "فحص النتائج" : "Check Results"}
              </Button>
            </Link>
            <Link href="/verify">
              <Button size="lg" variant="outline" className="min-w-[200px] py-6 text-base border-white/30 text-white hover:bg-white/15 transition-all" data-testid="button-verify-certificate">
                <Award className="w-5 h-5 me-2" />
                {isRTL ? "التحقق من الشهادة" : "Verify Certificate"}
              </Button>
            </Link>
            <Link href="/school-registration">
              <Button size="lg" variant="outline" className="min-w-[200px] py-6 text-base border-white/30 text-white hover:bg-white/15 transition-all" data-testid="button-register-school">
                <School className="w-5 h-5 me-2" />
                {isRTL ? "تسجيل مدرسة" : "Register School"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-12 section-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-2xl overflow-hidden" data-testid="card-newsletter">
              <div className="h-1.5 bg-gradient-to-r from-primary via-teal-400 to-emerald-500" />
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  {isRTL ? "اشترك في نشرتنا الإخبارية" : "Subscribe to Our Newsletter"}
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {isRTL 
                    ? "ابق على اطلاع بآخر الأخبار والإعلانات والفرص من الأمانة."
                    : "Stay updated with the latest news, announcements, and opportunities from AMAANAH."}
                </p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-4" data-testid="form-newsletter">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      placeholder={isRTL ? "اسمك" : "Your Name"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 h-12"
                      data-testid="input-newsletter-name"
                    />
                    <Input
                      type="email"
                      placeholder={isRTL ? "بريدك الإلكتروني" : "Your Email"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 h-12"
                      data-testid="input-newsletter-email"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full sm:w-auto px-12" disabled={newsletterMutation.isPending} data-testid="button-newsletter-subscribe">
                    {newsletterMutation.isPending 
                      ? (isRTL ? "جاري الاشتراك..." : "Subscribing...")
                      : (isRTL ? "اشترك" : "Subscribe")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
