import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GraduationCap,
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
  LogOut,
  ChevronUp,
  BookOpen,
  Building2,
  History,
  FileDown,
  type LucideIcon,
} from "lucide-react";

type MenuItemDef = {
  key: string;
  url: string;
  icon: LucideIcon;
};

const adminMenuDefs: MenuItemDef[] = [
  { key: "dashboard", url: "/", icon: LayoutDashboard },
  { key: "examYears", url: "/exam-years", icon: Calendar },
  { key: "schools", url: "/schools", icon: School },
  { key: "students", url: "/students", icon: Users },
  { key: "examCenters", url: "/centers", icon: MapPin },
  { key: "payments", url: "/payments", icon: CreditCard },
  { key: "results", url: "/results", icon: FileCheck },
  { key: "certificates", url: "/certificates", icon: Award },
  { key: "transcripts", url: "/transcripts", icon: BookOpen },
  { key: "examiners", url: "/examiners", icon: UserCheck },
  { key: "analytics", url: "/analytics", icon: BarChart3 },
];

const schoolAdminMenuDefs: MenuItemDef[] = [
  { key: "dashboard", url: "/", icon: LayoutDashboard },
  { key: "students", url: "/students", icon: Users },
  { key: "payments", url: "/payments", icon: CreditCard },
  { key: "results", url: "/results", icon: FileCheck },
  { key: "examCenter", url: "/center-info", icon: MapPin },
];

const managementDefs: MenuItemDef[] = [
  { key: "regionsAndClusters", url: "/regions", icon: Building2 },
  { key: "subjects", url: "/subjects", icon: BookOpen },
  { key: "timetable", url: "/timetable", icon: ClipboardList },
  { key: "reportsAndExports", url: "/reports", icon: FileDown },
  { key: "auditLogs", url: "/audit-logs", icon: History },
  { key: "settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'examination_admin' || user?.role === 'logistics_admin';
  const menuDefs = isAdmin ? adminMenuDefs : schoolAdminMenuDefs;

  const getNavLabel = (key: string): string => {
    return (t.nav as Record<string, string>)[key] || key;
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
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
                {managementDefs.map((item) => (
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

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt={`${user?.firstName || 'User'} ${user?.lastName || ''}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left min-w-0 flex-1">
                    <span className="text-sm font-medium truncate w-full">
                      {user?.firstName || 'User'} {user?.lastName || ''}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {user?.email || ''}
                    </span>
                  </div>
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <Settings className="w-4 h-4 me-2" />
                    {t.user.profileSettings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.href = '/';
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 me-2" />
                  {t.user.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
