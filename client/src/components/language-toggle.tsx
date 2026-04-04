import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const current = languages.find((l) => l.code === language) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 px-2 text-sm font-medium"
          data-testid="button-language-toggle"
        >
          <span className="text-base leading-none">{current.flag}</span>
          <span className="hidden sm:inline text-xs opacity-80">{current.code.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
          <span className="sr-only">{t.settings.selectLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center gap-2.5 cursor-pointer"
            data-testid={`button-language-${lang.code}`}
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="flex-1">{lang.label}</span>
            {language === lang.code && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
