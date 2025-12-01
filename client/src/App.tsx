import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Schools from "@/pages/schools";
import Students from "@/pages/students";
import ExamYears from "@/pages/exam-years";
import Payments from "@/pages/payments";
import Centers from "@/pages/centers";
import Results from "@/pages/results";
import Certificates from "@/pages/certificates";
import Examiners from "@/pages/examiners";
import Analytics from "@/pages/analytics";
import Verify from "@/pages/verify";
import Regions from "@/pages/regions";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

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

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <div />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <Router />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/verify" component={Verify} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/schools" component={Schools} />
      <Route path="/students" component={Students} />
      <Route path="/exam-years" component={ExamYears} />
      <Route path="/payments" component={Payments} />
      <Route path="/centers" component={Centers} />
      <Route path="/center-info" component={Centers} />
      <Route path="/results" component={Results} />
      <Route path="/certificates" component={Certificates} />
      <Route path="/examiners" component={Examiners} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/regions" component={Regions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {!isLoading && isAuthenticated ? (
            <AuthenticatedLayout />
          ) : (
            <Switch>
              <Route path="/verify" component={Verify} />
              <Route path="/" component={Landing} />
              <Route component={Landing} />
            </Switch>
          )}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
