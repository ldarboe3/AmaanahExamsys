import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider, useLanguage } from "@/lib/i18n/LanguageContext";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { DocumentationButton } from "@/components/documentation-button";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Schools from "@/pages/schools";
import Students from "@/pages/students";
import ExamYears from "@/pages/exam-years";
import Payments from "@/pages/payments";
import Centers from "@/pages/centers";
import CenterDashboard from "@/pages/center-dashboard";
import SchoolCenterInfo from "@/pages/school-center-info";
import Results from "@/pages/results";
import Certificates from "@/pages/certificates";
import Transcripts from "@/pages/transcripts";
import Examiners from "@/pages/examiners";
import UsersPage from "@/pages/users";
import Analytics from "@/pages/analytics";
import Verify from "@/pages/verify";
import Regions from "@/pages/regions";
import AuditLogs from "@/pages/audit-logs";
import Reports from "@/pages/reports";
import Subjects from "@/pages/subjects";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import SchoolProfile from "@/pages/school-profile";
import SchoolResults from "@/pages/school-results";
import ExamDay from "@/pages/exam-day";
import ExamExecution from "@/pages/exam-execution";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { OfflineSyncBanner } from "@/components/OfflineSyncBanner";
import { useEffect } from "react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";

import Home from "@/pages/home";
import About from "@/pages/about";
import OrganisationStructure from "@/pages/organisation-structure";
import SeniorExecutives from "@/pages/senior-executives";
import Statistics from "@/pages/statistics";
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
import ChangePassword from "@/pages/change-password";
import WebsiteManagement from "@/pages/website-management";
import Documentation from "@/pages/documentation";
import VerifyTranscript from "@/pages/verify-transcript";
import VerifyCertificate from "@/pages/verify-certificate";
import StaffIdentity from "@/pages/staff-identity";
import VerifyStaff from "@/pages/verify-staff";
import PacketTracking from "@/pages/packet-tracking";
import MobilePacketScan from "@/pages/mobile-packet-scan";
import MobileAttendanceScan from "@/pages/mobile-attendance-scan";
import MobileTimetable from "@/pages/mobile-timetable";
import ExamScheduling from "@/pages/exam-scheduling";
import StudentAttendance from "@/pages/student-attendance";

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
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/school-verify/:token" component={SchoolVerify} />
      <Route path="/school-invite/:token" component={SchoolInvite} />
      <Route path="/forgot-password/:token" component={ForgotPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/schools" component={Schools} />
      <Route path="/students" component={Students} />
      <Route path="/exam-years" component={ExamYears} />
      <Route path="/payments" component={Payments} />
      <Route path="/centers" component={Centers} />
      <Route path="/centers/:id" component={CenterDashboard} />
      <Route path="/center-info" component={SchoolCenterInfo} />
      <Route path="/admin-results">
        {() => <ProtectedRoute component={Results} allowedRoles={["super_admin", "examination_admin"]} />}
      </Route>
      <Route path="/certificates" component={Certificates} />
      <Route path="/transcripts" component={Transcripts} />
      <Route path="/examiners" component={Examiners} />
      <Route path="/staff-identity">
        {() => <ProtectedRoute component={StaffIdentity} allowedRoles={["super_admin", "examination_admin"]} />}
      </Route>
      <Route path="/packet-tracking">
        {() => <ProtectedRoute component={PacketTracking} allowedRoles={["super_admin", "examination_admin", "logistics_admin"]} />}
      </Route>
      <Route path="/mobile-packet-scan">
        {() => <ProtectedRoute component={MobilePacketScan} allowedRoles={["super_admin", "examination_admin", "regional_logistics", "cluster_logistics", "examiner"]} />}
      </Route>
      <Route path="/mobile-attendance-scan">
        {() => <ProtectedRoute component={MobileAttendanceScan} allowedRoles={["super_admin", "examination_admin", "logistics_admin", "regional_coordinator", "cluster_coordinator", "examiner"]} />}
      </Route>
      <Route path="/mobile-timetable">
        {() => <ProtectedRoute component={MobileTimetable} allowedRoles={["super_admin", "examination_admin", "logistics_admin", "regional_logistics", "cluster_logistics", "regional_coordinator", "cluster_coordinator", "examiner"]} />}
      </Route>
      <Route path="/exam-scheduling">
        {() => <ProtectedRoute component={ExamScheduling} allowedRoles={["super_admin", "examination_admin", "logistics_admin", "regional_logistics", "cluster_logistics", "regional_coordinator", "cluster_coordinator", "examiner", "school_admin"]} />}
      </Route>
      <Route path="/exam-day">
        {() => <ProtectedRoute component={ExamDay} allowedRoles={["super_admin", "examination_admin", "logistics_admin", "examiner"]} />}
      </Route>
      <Route path="/exam-execution">
        {() => <ProtectedRoute component={ExamExecution} allowedRoles={["super_admin", "examination_admin", "logistics_admin", "examiner"]} />}
      </Route>
      <Route path="/student-attendance">
        {() => <ProtectedRoute component={StudentAttendance} allowedRoles={["super_admin", "examination_admin", "logistics_admin", "regional_coordinator", "cluster_coordinator"]} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={UsersPage} allowedRoles={["super_admin"]} />}
      </Route>
      <Route path="/analytics" component={Analytics} />
      <Route path="/regions" component={Regions} />
      <Route path="/audit-logs" component={AuditLogs} />
      <Route path="/reports" component={Reports} />
      <Route path="/website-management" component={WebsiteManagement} />
      <Route path="/subjects" component={Subjects} />
      <Route path="/timetable">{() => <Redirect to="/exam-scheduling" />}</Route>
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
      <Route path="/school-profile" component={SchoolProfile} />
      <Route path="/school-results" component={SchoolResults} />
      <Route path="/documentation" component={Documentation} />
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRoutes() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/login" component={Login} />
      <Route path="/verify" component={Verify} />
      <Route path="/verify/transcript/:token" component={VerifyTranscript} />
      <Route path="/verify/:token" component={VerifyCertificate} />
      <Route path="/verify-staff/:staffId" component={VerifyStaff} />
      <Route path="/verify-staff" component={VerifyStaff} />
      <Route path="/about" component={About} />
      <Route path="/about/organisation-structure" component={OrganisationStructure} />
      <Route path="/about/senior-executives" component={SeniorExecutives} />
      <Route path="/statistics" component={Statistics} />
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
    </>
  );
}

const MOBILE_ONLY_ROLES = ["regional_logistics", "cluster_logistics"];

function MobileOnlyLayout() {
  return (
    <div className="min-h-screen w-full bg-background">
      <OfflineSyncBanner />
      <Switch>
        <Route path="/mobile-packet-scan" component={MobilePacketScan} />
        <Route path="/mobile-timetable" component={MobileTimetable} />
        <Route path="/profile" component={Profile} />
        <Route path="/change-password" component={ChangePassword} />
        <Route>
          <Redirect to="/mobile-packet-scan" />
        </Route>
      </Switch>
    </div>
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
          {/* Gambia flag stripe */}
          <div className="flex h-[4px] w-full shrink-0">
            <div className="flex-1 bg-[#CE1126]" />
            <div className="w-[16px] bg-white" />
            <div className="flex-[2] bg-[#3B7BDB]" />
            <div className="w-[16px] bg-white" />
            <div className="flex-1 bg-[#3A7728]" />
          </div>
          <header className="flex items-center justify-between gap-2 px-4 py-3 bg-sidebar border-b border-sidebar-border text-sidebar-foreground">
            <SidebarTrigger className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent" data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2 [&_button]:text-sidebar-foreground [&_button:hover]:text-white [&_svg]:text-sidebar-foreground">
              <NotificationsDropdown />
              <DocumentationButton />
              <LanguageToggle />
              <UserProfileDropdown />
            </div>
          </header>
          <OfflineSyncBanner />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <AuthenticatedRoutes />
            </div>
          </main>
          <footer className="border-t bg-muted/30 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Developed by{" "}
              <a
                href="https://theskyinnovationhub.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:underline"
              >
                Sky Innovation Hub
              </a>
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}

function OfflineToastListener() {
  const { toast } = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast({
        title: "Saved offline",
        description: detail?.label
          ? `"${detail.label}" queued — will sync when you're back online.`
          : "Change queued — will sync automatically when you're back online.",
        duration: 4000,
      });
    };
    window.addEventListener('amaanah:offline-queued', handler);
    return () => window.removeEventListener('amaanah:offline-queued', handler);
  }, [toast]);
  return null;
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <PublicRoutes />;
  }

  if (user?.role && MOBILE_ONLY_ROLES.includes(user.role)) {
    return <MobileOnlyLayout />;
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
            <OfflineToastListener />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
