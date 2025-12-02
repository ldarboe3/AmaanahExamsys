import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!mounted || !isVisible) return null;

  return createPortal(
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-8 ltr:right-8 rtl:left-8 z-50 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
      data-testid="button-back-to-top"
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>,
    document.body
  );
}
