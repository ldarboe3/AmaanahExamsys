import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BackToTop } from "@/components/back-to-top";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Menu,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Globe,
  ArrowRight,
  Facebook,
  Twitter,
  Youtube,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import amaanahLogo from "@assets/Amana_Logo_1770390631299.jpeg";

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
    ],
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
    ],
  },
  { name: "Membership", nameAr: "العضوية", href: "/membership" },
  { name: "Statistics", nameAr: "الإحصائيات", href: "/statistics" },
  { name: "Resources", nameAr: "المراجع", href: "/resources" },
  { name: "News", nameAr: "الأخبار", href: "/news" },
  { name: "Contact", nameAr: "اتصل بنا", href: "/contact" },
];

export function PublicHeader() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Gambia flag stripe — 5 bands: red, white, blue, white, green */}
      <div className="flex h-[5px] w-full">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="w-[16px] bg-white" />
        <div className="flex-[2] bg-[#3B7BDB]" />
        <div className="w-[16px] bg-white" />
        <div className="flex-1 bg-[#3A7728]" />
      </div>

      {/* Top contact bar */}
      <div className="bg-[#0d3320] text-white/80 text-xs py-2 hidden md:block">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-amber-400" />
              +220 4228604
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-amber-400" />
              info@amaanah.gm
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-amber-400" />
              Banjul, The Gambia
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <span className="text-white/30">|</span>
            <span
              className="flex items-center gap-1 text-white/70 cursor-default"
              data-testid="topbar-new-portal"
            >
              <ExternalLink className="w-3 h-3" />
              Monitoring & QA Portal
            </span>
            <span className="text-white/30">|</span>
            <Link href="/login">
              <span className="flex items-center gap-1 text-amber-400 font-semibold hover:text-amber-300 transition-colors cursor-pointer" data-testid="topbar-portal-login">
                <ExternalLink className="w-3 h-3" />
                Exam Portal Login
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav
        className={`w-full transition-all duration-300 ${
          isScrolled
            ? "bg-[#155530] shadow-lg shadow-[#0d3320]/40"
            : "bg-[#155530]"
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group flex-shrink-0" data-testid="nav-logo">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md flex-shrink-0">
                <img
                  src={amaanahLogo}
                  alt="Amaanah Logo"
                  className="w-9 h-9 object-contain rounded-md"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-white leading-tight tracking-wide">AMAANAH</h1>
                <p className="text-[10px] text-amber-400/80 leading-tight font-medium tracking-wide uppercase">
                  {isRTL ? "التعليم الإسلامي والعربي" : "Islamic & Arabic Education"}
                </p>
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navigation.map((item) =>
              item.children ? (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        location.startsWith(item.href) && item.href !== "/"
                          ? "text-amber-400 bg-white/10"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }`}
                      data-testid={`nav-${item.name.toLowerCase()}`}
                    >
                      {isRTL ? item.nameAr : item.name}
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="min-w-[200px] bg-[#0d3320] border-white/10 rounded-lg shadow-xl"
                  >
                    {item.children.map((child) => (
                      <DropdownMenuItem
                        key={child.name}
                        asChild
                        className="py-2.5 text-white/80 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10 cursor-pointer rounded-md"
                      >
                        <Link href={child.href}>
                          <span
                            className="w-full"
                            data-testid={`nav-${child.name.toLowerCase().replace(/\s+/g, "-")}`}
                          >
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
                    className={`block px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                      location === item.href
                        ? "text-amber-400 bg-white/10"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    {isRTL ? item.nameAr : item.name}
                  </span>
                </Link>
              )
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/results">
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
                data-testid="button-check-results"
              >
                {t.website.checkResults}
              </Button>
            </Link>

            {/* Mobile language toggle */}
            <div className="flex md:hidden">
              <LanguageToggle />
            </div>

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side={isRTL ? "left" : "right"}
                className="w-[300px] sm:w-[350px] bg-[#0d3320] border-white/10"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                    <img src={amaanahLogo} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
                  </div>
                  <span className="text-white font-bold text-base">AMAANAH</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {navigation.map((item) => (
                    <div key={item.name}>
                      <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <span
                          className={`block py-2.5 px-3 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                            location === item.href
                              ? "text-amber-400 bg-white/10"
                              : "text-white/80 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {isRTL ? item.nameAr : item.name}
                        </span>
                      </Link>
                      {item.children && (
                        <div className="ms-4 space-y-0.5 mt-0.5">
                          {item.children.map((child) => (
                            <Link key={child.name} href={child.href} onClick={() => setMobileMenuOpen(false)}>
                              <span className="block py-2 px-3 text-xs text-white/60 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                                {isRTL ? child.nameAr : child.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-5 mt-3 border-t border-white/10 space-y-2">
                    <Link href="/results" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                        {t.website.checkResults}
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const { t, isRTL } = useLanguage();

  return (
    <footer className="relative overflow-hidden bg-[#0a2318]">
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative">
        {/* Gold top accent line */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <img src={amaanahLogo} alt="Logo" className="w-10 h-10 object-contain rounded-md" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">AMAANAH</p>
                  <p className="text-amber-400/70 text-xs leading-tight">The Gambia</p>
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                {isRTL
                  ? "الهيئة الوطنية للتعليم الإسلامي والعربي في غامبيا منذ 1996."
                  : "National coordinating body for Islamic & Arabic education in The Gambia since 1996."}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-amber-400 hover:text-[#0d3320] transition-all duration-200"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-amber-400 hover:text-[#0d3320] transition-all duration-200"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-amber-400 hover:text-[#0d3320] transition-all duration-200"
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {isRTL ? "روابط سريعة" : "Quick Links"}
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: isRTL ? "الرئيسية" : "Home", href: "/" },
                  { label: isRTL ? "عن الأمانة" : "About Us", href: "/about" },
                  { label: isRTL ? "البرامج" : "Programmes", href: "/programmes" },
                  { label: isRTL ? "العضوية" : "Membership", href: "/membership" },
                  { label: isRTL ? "الأخبار" : "News & Events", href: "/news" },
                  { label: isRTL ? "اتصل بنا" : "Contact Us", href: "/contact" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="text-white/50 hover:text-amber-400 text-sm transition-colors cursor-pointer flex items-center gap-1.5 group">
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {isRTL ? "الخدمات" : "Services"}
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: isRTL ? "فحص النتائج" : "Result Checker", href: "/results" },
                  { label: isRTL ? "التحقق من الشهادة" : "Verify Certificate", href: "/verify" },
                  { label: isRTL ? "تسجيل المدارس" : "School Registration", href: "/school-registration" },
                  { label: isRTL ? "بوابة المدارس" : "Schools Portal", href: "/login" },
                  { label: isRTL ? "الإحصائيات" : "Statistics", href: "/statistics" },
                  { label: isRTL ? "الموارد" : "Resources", href: "/resources" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="text-white/50 hover:text-amber-400 text-sm transition-colors cursor-pointer flex items-center gap-1.5 group">
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {isRTL ? "تواصل معنا" : "Contact Us"}
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">{isRTL ? "هاتف" : "Phone"}</p>
                    <p className="text-white/70 text-sm">+220 4228604</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">{isRTL ? "بريد إلكتروني" : "Email"}</p>
                    <p className="text-white/70 text-sm">info@amaanah.gm</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">{isRTL ? "العنوان" : "Address"}</p>
                    <p className="text-white/70 text-sm">Banjul, The Gambia</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">{isRTL ? "الموقع" : "Website"}</p>
                    <p className="text-white/70 text-sm">www.amaanah.gm</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/30 text-xs text-center md:text-start">
              &copy; {new Date().getFullYear()} AMAANAH — General Secretariat for Islamic/Arabic Education. {isRTL ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </p>
            <p className="text-white/30 text-xs">
              {isRTL ? "تم التطوير بواسطة " : "Developed by "}
              <a
                href="https://theskyinnovationhub.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400/70 hover:text-amber-400 transition-colors font-medium"
              >
                {isRTL ? "مركز سكاي نت للابتكار" : "SkyNet Innovation Hub"}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen flex flex-col ${isRTL ? "rtl" : "ltr"}`}>
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <BackToTop />
    </div>
  );
}
