import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

function UKFlag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      width="22"
      height="13"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-sm flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="9" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        stroke="#C8102E"
        strokeWidth="6"
        strokeDasharray="none"
      />
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="11" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function SAFlag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      width="22"
      height="14"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-sm flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="3" height="2" fill="#006c35" />
      <rect x="0" y="1.7" width="3" height="0.3" fill="white" />
      <text
        x="1.5"
        y="1.05"
        fill="white"
        fontSize="0.45"
        textAnchor="middle"
        fontFamily="serif"
      >
        ﷽
      </text>
    </svg>
  );
}

const languages = [
  { code: "en", label: "English",  FlagComponent: UKFlag },
  { code: "ar", label: "العربية", FlagComponent: SAFlag },
] as const;

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const current = languages.find((l) => l.code === language) ?? languages[0];
  const CurrentFlag = current.FlagComponent;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 px-2 text-sm font-medium"
          data-testid="button-language-toggle"
        >
          <CurrentFlag />
          <span className="hidden sm:inline text-xs opacity-80">
            {current.code.toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
          <span className="sr-only">{t.settings.selectLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((lang) => {
          const FlagComp = lang.FlagComponent;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="flex items-center gap-2.5 cursor-pointer"
              data-testid={`button-language-${lang.code}`}
            >
              <FlagComp />
              <span className="flex-1">{lang.label}</span>
              {language === lang.code && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
