import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/public-layout";
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
  Handshake
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { NewsArticle, ImpactStat, NewsCategory } from "@shared/schema";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";
import heroImage from "@assets/generated_images/african_madrassah_students_studying.png";
import teacherImage from "@assets/generated_images/islamic_teacher_teaching_students.png";
import graduationImage from "@assets/generated_images/islamic_school_graduation_ceremony.png";

const quickLinks = [
  { name: "Curriculum & Training", href: "/programmes#curriculum", icon: BookOpen },
  { name: "Examinations & Certification", href: "/programmes#examinations", icon: Award },
  { name: "Quality Assurance", href: "/programmes#quality", icon: Shield },
  { name: "Endowment & Projects", href: "/programmes#endowment", icon: Building2 },
  { name: "Membership", href: "/membership", icon: Users },
  { name: "Contact Us", href: "/contact", icon: Mail },
];

const defaultImpactStats = [
  { label: "Member Schools", value: "400+", description: "Madrassah & Islamic schools" },
  { label: "Years of Service", value: "28+", description: "Since 1996" },
  { label: "Regions Covered", value: "7", description: "Nationwide presence" },
  { label: "Students Certified", value: "50K+", description: "Annual examinations" },
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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const { data: newsData } = useQuery<NewsApiResponse>({
    queryKey: ["/api/public/news"],
  });

  const { data: impactStatsData } = useQuery<ImpactStat[]>({
    queryKey: ["/api/public/impact-stats"],
  });

  const newsletterMutation = useMutation({
    mutationFn: (data: { email: string; name: string }) => 
      apiRequest("/api/public/newsletter/subscribe", "POST", data),
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
      setName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe. Please try again.",
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
    ? impactStatsData.slice(0, 4).map(stat => ({
        label: stat.label,
        value: stat.value,
        description: "",
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
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-primary/20 text-white border-primary/30 hover:bg-primary/30">
              <Globe className="w-3 h-3 mr-1" />
              Serving The Gambia Since 1996
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Education for Development
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              Strengthening unity and quality across Madrassah and Islamic schools in The Gambia. 
              Coordinating curricula, assessments, and teacher training for excellence in Islamic and Arabic education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/membership">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-involved">
                  Get Involved
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20" data-testid="button-learn-about">
                  Learn About AMAANAH
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-8 bg-primary/5 border-y">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {quickLinks.map((link) => (
              <Link key={link.name} href={link.href}>
                <Button variant="ghost" className="flex items-center gap-2 text-foreground/80 hover:text-primary">
                  <link.icon className="w-4 h-4" />
                  <span className="text-sm">{link.name}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Highlights */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Impact
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              National coordination of Madrassah and Tahfiz education in partnership with Government on policy and implementation.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {impactStats.map((stat) => (
              <Card key={stat.label} className="text-center hover-elevate">
                <CardContent className="pt-6">
                  <p className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</p>
                  <p className="font-medium text-foreground">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <Handshake className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Government Partnership</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Working with Ministry of Basic and Secondary Education on national policy and implementation for Islamic education.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-md bg-chart-2/10 flex items-center justify-center mb-3">
                  <GraduationCap className="w-6 h-6 text-chart-2" />
                </div>
                <CardTitle>Teacher Training</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Comprehensive in-service training programs and standardized curricula for educators across all regions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="w-12 h-12 rounded-md bg-chart-3/10 flex items-center justify-center mb-3">
                  <Award className="w-6 h-6 text-chart-3" />
                </div>
                <CardTitle>Certification</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  National examination and certification framework recognized across educational institutions in The Gambia.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Preview with Image */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">About AMAANAH</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Unifying Islamic Education Since 1996
              </h2>
              <p className="text-muted-foreground mb-6">
                The General Secretariat for Islamic/Arabic Education (AMAANAH) is a national coordinating body founded in April 1996 by leading Madrassah institutions to unify, standardize, and elevate Islamic and Arabic education across The Gambia.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Strengthen unity among Madrassah and Islamic schools",
                  "Coordinate and standardize curriculum and examinations",
                  "Partner with Government in national education development",
                  "Promote girls' education and fight illiteracy",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/about">
                <Button>
                  Learn More About Us
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <img 
                src={teacherImage} 
                alt="Islamic education in The Gambia" 
                className="rounded-lg shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg hidden md:block">
                <p className="text-2xl font-bold">28+</p>
                <p className="text-sm">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Latest Updates
              </h2>
              <p className="text-muted-foreground">
                News and announcements from AMAANAH
              </p>
            </div>
            <Link href="/news">
              <Button variant="outline">
                View All News
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {newsItems.map((item, i) => (
              <Card key={i} className="hover-elevate overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.excerpt}</CardDescription>
                  <Button variant="ghost" className="px-0 mt-4 text-primary hover:text-primary/80">
                    Read More <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services CTA */}
      <section 
        className="py-16 md:py-24 relative"
        style={{ backgroundImage: `url(${graduationImage})` }}
      >
        <div className="absolute inset-0 bg-primary/90" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Access Our Services
          </h2>
          <p className="text-primary-foreground/90 text-lg max-w-2xl mx-auto mb-8">
            Check your examination results, verify certificates, or register your school with AMAANAH.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/results">
              <Button size="lg" variant="secondary" data-testid="button-result-checker">
                Check Results
              </Button>
            </Link>
            <Link href="/verify">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-verify-certificate">
                Verify Certificate
              </Button>
            </Link>
            <Link href="/school-registration">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-register-school">
                Register School
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-muted-foreground mb-8">
              Stay updated with the latest news, announcements, and opportunities from AMAANAH.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-4" data-testid="form-newsletter">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                  data-testid="input-newsletter-name"
                />
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  data-testid="input-newsletter-email"
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto" data-testid="button-newsletter-subscribe">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
