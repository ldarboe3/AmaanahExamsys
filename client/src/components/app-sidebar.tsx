import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import amanahLogo from "@assets/Amana_Logo_1765125084736.png";
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  MapPin,
  ClipboardList,
  Award,
  FileCheck,
  UserCheck,
  Calendar,
  BarChart3,
  Settings,
  BookOpen,
  Building2,
  History,
  FileDown,
  Globe,
  type LucideIcon,
} from "lucide-react";

type MenuItemDef = {
  key: string;
  url: string;
  icon: LucideIcon;
};

const adminMenuDefs: MenuItemDef[] = [
  { key: "dashboard", url: "/dashboard", icon: LayoutDashboard },
  { key: "examYears", url: "/exam-years", icon: Calendar },
  { key: "schools", url: "/schools", icon: School },
  { key: "students", url: "/students", icon: Users },
  { key: "examCenters", url: "/centers", icon: MapPin },
  { key: "payments", url: "/payments", icon: CreditCard },
  { key: "results", url: "/admin-results", icon: FileCheck },
  { key: "certificates", url: "/certificates", icon: Award },
  { key: "transcripts", url: "/transcripts", icon: BookOpen },
  { key: "examiners", url: "/examiners", icon: UserCheck },
  { key: "analytics", url: "/analytics", icon: BarChart3 },
];

const schoolAdminMenuDefs: MenuItemDef[] = [
  { key: "dashboard", url: "/dashboard", icon: LayoutDashboard },
  { key: "students", url: "/students", icon: Users },
  { key: "payments", url: "/payments", icon: CreditCard },
  { key: "results", url: "/school-results", icon: FileCheck },
  { key: "examCenter", url: "/center-info", icon: MapPin },
  { key: "schoolProfile", url: "/school-profile", icon: School },
];

// Restricted menu for schools that haven't paid their registration fee
const schoolPendingPaymentMenuDefs: MenuItemDef[] = [
  { key: "payments", url: "/payments", icon: CreditCard },
];

const managementDefs: MenuItemDef[] = [
  { key: "regionsAndClusters", url: "/regions", icon: Building2 },
  { key: "subjects", url: "/subjects", icon: BookOpen },
  { key: "timetable", url: "/timetable", icon: ClipboardList },
  { key: "websiteManagement", url: "/website-management", icon: Globe },
  { key: "reportsAndExports", url: "/reports", icon: FileDown },
  { key: "auditLogs", url: "/audit-logs", icon: History },
  { key: "users", url: "/users", icon: UserCheck },
  { key: "settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  side?: "left" | "right";
}

export function AppSidebar({ side = "left" }: AppSidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'examination_admin' || user?.role === 'logistics_admin';
  const isSchoolAdmin = user?.role === 'school_admin';
  // Default to false for school admins unless explicitly true - ensures unpaid schools are restricted
  const registrationFeePaid = (user as any)?.registrationFeePaid === true;
  
  // Determine which menu to show
  let menuDefs: MenuItemDef[];
  if (isAdmin) {
    menuDefs = adminMenuDefs;
  } else if (isSchoolAdmin && !registrationFeePaid) {
    // School hasn't paid registration fee - only show Payments
    menuDefs = schoolPendingPaymentMenuDefs;
  } else {
    menuDefs = schoolAdminMenuDefs;
  }

  const getNavLabel = (key: string): string => {
    return (t.nav as Record<string, string>)[key] || key;
  };

  return (
    <Sidebar side={side}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <img 
            src={amanahLogo} 
            alt="AMAANAH Logo" 
            className="w-10 h-10 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-sidebar-foreground">{t.app.name}</span>
            <span className="text-xs text-muted-foreground">{t.app.tagline}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.nav.mainMenu}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuDefs.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.key}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{getNavLabel(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t.nav.management}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementDefs
                  .filter(item => item.key !== 'users' || user?.role === 'super_admin' || user?.role === 'examination_admin')
                  .map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.key}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{getNavLabel(item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
