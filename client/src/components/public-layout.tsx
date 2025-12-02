import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackToTop } from "@/components/back-to-top";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Menu, ChevronDown, ArrowRight, Mail, MapPin, Phone, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";

const navigation = [
  { name: "Home", nameAr: "الرئيسية", href: "/" },
  { 
    name: "About Us", 
    nameAr: "عن الأمانة",
    href: "/about",
    children: [
      { name: "About AMAANAH", nameAr: "عن الأمانة", href: "/about" },
      { name: "Organisation Structure", nameAr: "الهيكل التنظيمي", href: "/about/organisation-structure" },
      { name: "Senior Executives", nameAr: "القيادة التنفيذية", href: "/about/senior-executives" },
    ]
  },
  { 
    name: "Programmes", 
    nameAr: "البرامج",
    href: "/programmes",
    children: [
      { name: "Curriculum & Training", nameAr: "المناهج والتدريب", href: "/programmes#curriculum" },
      { name: "Examinations & Certification", nameAr: "الامتحانات والشهادات", href: "/programmes#examinations" },
      { name: "Quality Assurance", nameAr: "ضمان الجودة", href: "/programmes#quality" },
      { name: "Endowment & Projects", nameAr: "المشاريع والأوقاف", href: "/programmes#endowment" },
    ]
  },
  { name: "Membership", nameAr: "العضوية", href: "/membership" },
  { name: "Statistics", nameAr: "الإحصائيات", href: "/statistics" },
  { name: "Resources", nameAr: "المراجع", href: "/resources" },
  { name: "News", nameAr: "الأخبار", href: "/news" },
  { name: "Contact", nameAr: "اتصل بنا", href: "/contact" },
];

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  const linkName = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : 'link';
  return (
    <Link href={href}>
      <span 
        className={`text-sm font-medium transition-all duration-200 hover:text-primary ${
          active ? "text-primary" : "text-foreground/70"
        }`}
        data-testid={`nav-${linkName}`}
      >
        {children}
      </span>
    </Link>
  );
}

export function PublicHeader() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      isScrolled 
        ? 'bg-background/95 backdrop-blur-lg shadow-md border-b border-border/50' 
        : 'bg-background/80 backdrop-blur-sm'
    }`}>
      <nav className="container mx-auto px-4 h-16 md:h-18 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img src={amaanahLogo} alt="Amaanah Logo" className="relative w-10 h-10 md:w-11 md:h-11 object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">AMAANAH</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t.website.educationForDevelopment}</p>
            </div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navigation.map((item) => (
            item.children ? (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-muted ${
                      location.startsWith(item.href) ? "text-primary bg-primary/5" : "text-foreground/70"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    {isRTL ? item.nameAr : item.name}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[200px]">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.name} asChild className="py-2.5">
                      <Link href={child.href}>
                        <span className="w-full" data-testid={`nav-${child.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          {isRTL ? child.nameAr : child.name}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link key={item.name} href={item.href}>
                <span 
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-muted ${
                    location === item.href ? "text-primary bg-primary/5" : "text-foreground/70"
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  {isRTL ? item.nameAr : item.name}
                </span>
              </Link>
            )
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/results">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex border-primary/30 hover:border-primary hover:bg-primary/5" data-testid="button-check-results">
              {t.website.checkResults}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="shadow-md hover:shadow-lg transition-shadow" data-testid="button-portal-login">
              {t.website.portalLogin}
            </Button>
          </Link>
          <div className="hidden sm:flex items-center gap-1 ms-2 ps-2 border-s border-border">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "left" : "right"} className="w-[300px] sm:w-[350px]">
              <div className="flex flex-col gap-1 mt-6">
                {navigation.map((item) => (
                  <div key={item.name}>
                    <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <span className={`block py-3 px-4 text-base font-medium rounded-lg transition-colors ${
                        location === item.href ? "text-primary bg-primary/5" : "text-foreground hover:bg-muted"
                      }`}>
                        {isRTL ? item.nameAr : item.name}
                      </span>
                    </Link>
                    {item.children && (
                      <div className="ms-4 space-y-1 mt-1">
                        {item.children.map((child) => (
                          <Link key={child.name} href={child.href} onClick={() => setMobileMenuOpen(false)}>
                            <span className="block py-2 px-4 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                              {isRTL ? child.nameAr : child.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-6 mt-4 border-t space-y-3">
                  <div className="flex items-center gap-2 px-4">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                  <Link href="/results" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">{t.website.checkResults}</Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">{t.website.portalLogin}</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const { t, isRTL } = useLanguage();
  
  return (
    <footer className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>
      
      <div className="relative container mx-auto px-4 py-16">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl p-2 flex items-center justify-center">
                <img src={amaanahLogo} alt="Amaanah Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">AMAANAH</h3>
                <p className="text-sm text-white/60">Education for Development</p>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              {isRTL 
                ? "الأمانة العامة للتعليم الإسلامي والعربي في غامبيا. تعزيز الوحدة والجودة في مدارس المدارس منذ 1996."
                : "General Secretariat for Islamic & Arabic Education in The Gambia. Strengthening unity and quality across Madrassah schools since 1996."}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-primary/50 transition-colors cursor-pointer">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-primary/50 transition-colors cursor-pointer">
                <Mail className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6 text-base">{isRTL ? 'الروابط السريعة' : 'Quick Links'}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'عن الأمانة' : 'About Us'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about/organisation-structure">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'الهيكل التنظيمي' : 'Organisation Structure'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/about/senior-executives">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'القيادة التنفيذية' : 'Senior Executives'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/programmes">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'البرامج والخدمات' : 'Programmes & Services'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/statistics">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'الإحصائيات' : 'Statistics'}
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6 text-base">{isRTL ? 'الخدمات' : 'Services'}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/results">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'فحص النتائج' : 'Result Checker'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/school-registration">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'تسجيل المدرسة' : 'School Registration'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/verify">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {isRTL ? 'التحقق من الشهادة' : 'Verify Certificate'}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/login">
                  <span className="text-white/70 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2 group">
                    <ArrowRight className="w-3 h-3 opacity-0 -ms-5 group-hover:opacity-100 group-hover:ms-0 transition-all" />
                    {t.website.portalLogin}
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6 text-base">{isRTL ? 'اتصل بنا' : 'Contact'}</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-0.5">{isRTL ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className="text-white/80">info@amaanah.gm</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-0.5">{isRTL ? 'الموقع' : 'Location'}</p>
                  <p className="text-white/80">{isRTL ? 'غامبيا، غرب أفريقيا' : 'The Gambia, West Africa'}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-0.5">{isRTL ? 'اللغات' : 'Languages'}</p>
                  <p className="text-white/80">{isRTL ? 'العربية والإنجليزية' : 'Arabic & English'}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className={`border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} AMAANAH - {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/contact">
              <span className="text-white/50 hover:text-primary transition-colors cursor-pointer">{t.website.contact}</span>
            </Link>
            <Link href="/news">
              <span className="text-white/50 hover:text-primary transition-colors cursor-pointer">{t.website.news}</span>
            </Link>
            <Link href="/resources">
              <span className="text-white/50 hover:text-primary transition-colors cursor-pointer">{isRTL ? 'المراجع' : 'Resources'}</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useLanguage();
  
  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
      <BackToTop />
    </div>
  );
}
