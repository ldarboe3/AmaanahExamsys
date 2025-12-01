import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Check } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-toggle">
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t.settings.selectLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className="gap-2"
          data-testid="button-language-en"
        >
          {language === 'en' && <Check className="h-4 w-4" />}
          <span className={language !== 'en' ? 'ml-6' : ''}>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ar')}
          className="gap-2"
          data-testid="button-language-ar"
        >
          {language === 'ar' && <Check className="h-4 w-4" />}
          <span className={language !== 'ar' ? 'ml-6' : ''}>العربية</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
