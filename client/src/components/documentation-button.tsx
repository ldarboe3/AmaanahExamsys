import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function DocumentationButton() {
  const [, navigate] = useLocation();
  const { isRTL } = useLanguage();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/documentation")}
          data-testid="button-documentation"
        >
          <BookOpen className="h-5 w-5" />
          <span className="sr-only">
            {isRTL ? "التوثيق" : "Documentation"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isRTL ? "دليل المستخدم" : "User Guide"}</p>
      </TooltipContent>
    </Tooltip>
  );
}