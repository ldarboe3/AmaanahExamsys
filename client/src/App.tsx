import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider, useLanguage } from "@/lib/i18n/LanguageContext";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Schools from "@/pages/schools";
import Students from "@/pages/students";
import ExamYears from "@/pages/exam-years";
import Payments from "@/pages/payments";
import Centers from "@/pages/centers";
import Results from "@/pages/results";
import Certificates from "@/pages/certificates";
import Transcripts from "@/pages/transcripts";
import Examiners from "@/pages/examiners";
import Analytics from "@/pages/analytics";
import Verify from "@/pages/verify";
import Regions from "@/pages/regions";
import AuditLogs from "@/pages/audit-logs";
import Reports from "@/pages/reports";
import Subjects from "@/pages/subjects";
import Timetable from "@/pages/timetable";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import SchoolProfile from "@/pages/school-profile";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

import Home from "@/pages/home";
import About from "@/pages/about";
import Programmes from "@/pages/programmes";
import Membership from "@/pages/membership";
import Contact from "@/pages/contact";
import Resources from "@/pages/resources";
import News from "@/pages/news";
import ResultChecker from "@/pages/result-checker";
import SchoolRegistration from "@/pages/school-registration";
import SchoolVerify from "@/pages/school-verify";
import SchoolInvite from "@/pages/school-invite";
import ForgotPassword from "@/pages/forgot-password";
import WebsiteManagement from "@/pages/website-management";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/school-verify/:token" component={SchoolVerify} />
      <Route path="/school-invite/:token" component={SchoolInvite} />
      <Route path="/forgot-password/:token" component={ForgotPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/schools" component={Schools} />
      <Route path="/students" component={Students} />
      <Route path="/exam-years" component={ExamYears} />
      <Route path="/payments" component={Payments} />
      <Route path="/centers" component={Centers} />
      <Route path="/center-info" component={Centers} />
      <Route path="/admin-results" component={Results} />
      <Route path="/certificates" component={Certificates} />
      <Route path="/transcripts" component={Transcripts} />
      <Route path="/examiners" component={Examiners} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/regions" component={Regions} />
      <Route path="/audit-logs" component={AuditLogs} />
      <Route path="/reports" component={Reports} />
      <Route path="/website-management" component={WebsiteManagement} />
      <Route path="/subjects" component={Subjects} />
      <Route path="/timetable" component={Timetable} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
      <Route path="/school-profile" component={SchoolProfile} />
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/verify" component={Verify} />
      <Route path="/about" component={About} />
      <Route path="/programmes" component={Programmes} />
      <Route path="/membership" component={Membership} />
      <Route path="/contact" component={Contact} />
      <Route path="/resources" component={Resources} />
      <Route path="/news" component={News} />
      <Route path="/results" component={ResultChecker} />
      <Route path="/school-registration" component={SchoolRegistration} />
      <Route path="/school-verify/:token" component={SchoolVerify} />
      <Route path="/school-invite/:token" component={SchoolInvite} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/forgot-password/:token" component={ForgotPassword} />
      <Route path="/" component={Home} />
      <Route component={Home} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const { isRTL } = useLanguage();
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar side={isRTL ? "right" : "left"} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
              <LanguageToggle />
              <ThemeToggle />
              <UserProfileDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <AuthenticatedRoutes />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <PublicRoutes />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
