import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackToTop } from "@/components/back-to-top";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { 
    name: "Programmes", 
    href: "/programmes",
    children: [
      { name: "Curriculum & Training", href: "/programmes#curriculum" },
      { name: "Examinations & Certification", href: "/programmes#examinations" },
      { name: "Quality Assurance", href: "/programmes#quality" },
      { name: "Endowment & Projects", href: "/programmes#endowment" },
    ]
  },
  { name: "Membership", href: "/membership" },
  { name: "Resources", href: "/resources" },
  { name: "News", href: "/news" },
  { name: "Contact", href: "/contact" },
];

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  const linkName = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : 'link';
  return (
    <Link href={href}>
      <span 
        className={`text-sm font-medium transition-colors hover:text-primary ${
          active ? "text-primary" : "text-foreground/80"
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
  const { t, isRTL } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <img src={amaanahLogo} alt="Amaanah Logo" className="w-10 h-10 object-contain" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground leading-tight">AMAANAH</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t.website.educationForDevelopment}</p>
            </div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {navigation.map((item) => (
            item.children ? (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${
                      location.startsWith(item.href) ? "text-primary" : "text-foreground/80"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    {item.name}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.name} asChild>
                      <Link href={child.href}>
                        <span className="w-full" data-testid={`nav-${child.name.toLowerCase().replace(/\s+/g, '-')}`}>{child.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <NavLink key={item.name} href={item.href} active={location === item.href}>
                {item.name}
              </NavLink>
            )
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/results">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" data-testid="button-check-results">
              {t.website.checkResults}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" data-testid="button-portal-login">
              {t.website.portalLogin}
            </Button>
          </Link>
          <LanguageToggle />
          <ThemeToggle />
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-4 mt-6">
                {navigation.map((item) => (
                  <div key={item.name}>
                    <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <span className={`block py-2 text-base font-medium ${
                        location === item.href ? "text-primary" : "text-foreground"
                      }`}>
                        {item.name}
                      </span>
                    </Link>
                    {item.children && (
                      <div className="ml-4 space-y-2">
                        {item.children.map((child) => (
                          <Link key={child.name} href={child.href} onClick={() => setMobileMenuOpen(false)}>
                            <span className="block py-1 text-sm text-muted-foreground hover:text-foreground">
                              {child.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t space-y-2">
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
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={amaanahLogo} alt="Amaanah Logo" className="w-12 h-12 object-contain bg-white rounded-md p-1" />
              <div>
                <h3 className="font-semibold">AMAANAH</h3>
                <p className="text-sm text-primary-foreground/80">Education for Development</p>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/80">
              General Secretariat for Islamic & Arabic Education in The Gambia. Strengthening unity and quality across Madrassah schools since 1996.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{isRTL ? 'الروابط السريعة' : 'Quick Links'}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about"><span className="hover:underline cursor-pointer">{isRTL ? 'عن الأمانة' : 'About Us'}</span></Link></li>
              <li><Link href="/programmes"><span className="hover:underline cursor-pointer">{isRTL ? 'البرامج والخدمات' : 'Programmes & Services'}</span></Link></li>
              <li><Link href="/membership"><span className="hover:underline cursor-pointer">{isRTL ? 'العضوية' : 'Membership'}</span></Link></li>
              <li><Link href="/resources"><span className="hover:underline cursor-pointer">{isRTL ? 'المراجع' : 'Resources'}</span></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{isRTL ? 'الخدمات' : 'Services'}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/results"><span className="hover:underline cursor-pointer">{isRTL ? 'فحص النتائج' : 'Result Checker'}</span></Link></li>
              <li><Link href="/school-registration"><span className="hover:underline cursor-pointer">{isRTL ? 'تسجيل المدرسة' : 'School Registration'}</span></Link></li>
              <li><Link href="/verify"><span className="hover:underline cursor-pointer">{isRTL ? 'التحقق من الشهادة' : 'Verify Certificate'}</span></Link></li>
              <li><Link href="/login"><span className="hover:underline cursor-pointer">{t.website.portalLogin}</span></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{isRTL ? 'اتصل بنا' : 'Contact'}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>Email: info@amaanah.gm</li>
              <li>{isRTL ? 'السنغال، غرب أفريقيا' : 'The Gambia, West Africa'}</li>
              <li className="pt-2">
                <span className="text-primary-foreground/60 text-xs">{isRTL ? 'لغات العمل: العربية والإنجليزية' : 'Working Languages: Arabic & English'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={`border-t border-primary-foreground/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-primary-foreground/80">
            &copy; {new Date().getFullYear()} AMAANAH - {isRTL ? 'الأمانة - الأمانة العامة للتعليم الإسلامي والعربي. جميع الحقوق محفوظة.' : 'General Secretariat for Islamic & Arabic Education. All rights reserved.'}
          </p>
          <div className="flex gap-4 text-sm">
            <Link href="/contact"><span className="hover:underline cursor-pointer">{t.website.contact}</span></Link>
            <Link href="/news"><span className="hover:underline cursor-pointer">{t.website.news}</span></Link>
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
