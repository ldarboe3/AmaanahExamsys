import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  School,
  Users,
  CreditCard,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DashboardStats {
  totalSchools: number;
  pendingSchools: number;
  totalStudents: number;
  pendingStudents: number;
  totalRevenue: number;
  pendingPayments: number;
  resultsPublished: number;
  pendingResults: number;
  activeExamYear: {
    id: number;
    name: string;
    registrationEndDate: string | null;
  } | null;
  recentActivity: Array<{
    id: number;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3 text-chart-3" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive" />
            )}
            <span className={`text-xs ${trend === "up" ? "text-chart-3" : "text-destructive"}`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-8 h-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  count,
  variant = "default",
  viewDetailsText,
  pendingText,
  isRTL = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  count?: number;
  variant?: "default" | "warning" | "success";
  viewDetailsText?: string;
  pendingText?: string;
  isRTL?: boolean;
}) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    warning: "bg-chart-5/10 text-chart-5",
    success: "bg-chart-3/10 text-chart-3",
  };

  return (
    <Card className="hover-elevate">
      <Link href={href}>
        <CardHeader className="pb-2">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${variantStyles[variant]}`}>
              <Icon className="w-5 h-5" />
            </div>
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count} {pendingText || 'pending'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className={isRTL ? 'text-right' : ''}>
          <CardTitle className="text-base mb-1">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
          <div className={`flex items-center gap-1 mt-3 text-sm text-primary ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <span>{viewDetailsText || 'View details'}</span>
            <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function ActivityItem({
  type,
  message,
  timestamp,
}: {
  type: string;
  message: string;
  timestamp: string;
}) {
  const getIcon = () => {
    switch (type) {
      case "school_registered":
        return <School className="w-4 h-4 text-primary" />;
      case "payment_received":
        return <CreditCard className="w-4 h-4 text-chart-3" />;
      case "students_approved":
        return <Users className="w-4 h-4 text-chart-2" />;
      case "results_published":
        return <FileCheck className="w-4 h-4 text-chart-4" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: school } = useQuery<{ name: string }>({
    queryKey: ["/api/school/profile"],
    enabled: user?.role === 'school_admin' && !!user?.schoolId,
  });

  const isAdmin = user?.role === 'super_admin' || user?.role === 'examination_admin';
  const isSchoolAdmin = user?.role === 'school_admin';
  
  const getWelcomeName = () => {
    if (isSchoolAdmin && school?.name) {
      return school.name;
    }
    return user?.firstName || 'Admin';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'GMD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeRemaining = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return t.dashboard.expired;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h ${t.dashboard.remaining}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            {t.dashboard.welcomeBack}, {getWelcomeName()}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.dashboard.whatsHappeningToday}
          </p>
        </div>
        {stats?.activeExamYear && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{stats.activeExamYear.name}</p>
                  {stats.activeExamYear.registrationEndDate && (
                    <p className="text-xs text-muted-foreground">
                      {getTimeRemaining(stats.activeExamYear.registrationEndDate)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={t.dashboard.totalSchools}
              value={stats?.totalSchools || 0}
              subtitle={`${stats?.pendingSchools || 0} ${t.dashboard.pendingApproval}`}
              icon={School}
              color="bg-primary/10 text-primary"
              trend="up"
              trendValue={`+12% ${t.dashboard.thisMonth}`}
            />
            <StatCard
              title={t.dashboard.totalStudents}
              value={stats?.totalStudents || 0}
              subtitle={`${stats?.pendingStudents || 0} ${t.dashboard.pendingValidation}`}
              icon={Users}
              color="bg-chart-2/10 text-chart-2"
              trend="up"
              trendValue={`+8% ${t.dashboard.thisMonth}`}
            />
            <StatCard
              title={t.dashboard.totalRevenue}
              value={formatCurrency(stats?.totalRevenue || 0)}
              subtitle={`${stats?.pendingPayments || 0} ${t.dashboard.pendingPayments}`}
              icon={CreditCard}
              color="bg-chart-3/10 text-chart-3"
            />
            <StatCard
              title={t.dashboard.resultsStatus}
              value={`${stats?.resultsPublished || 0} ${t.dashboard.published}`}
              subtitle={`${stats?.pendingResults || 0} ${t.dashboard.pendingReview}`}
              icon={FileCheck}
              color="bg-chart-4/10 text-chart-4"
            />
          </>
        )}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : ''}`}>{t.dashboard.quickActions}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {isAdmin ? (
              <>
                <QuickActionCard
                  title={t.dashboard.pendingSchools}
                  description={t.dashboard.reviewApprove}
                  href="/schools?status=pending"
                  icon={School}
                  count={stats?.pendingSchools}
                  variant="warning"
                  viewDetailsText={t.dashboard.viewDetails}
                  pendingText={t.common.pending}
                  isRTL={isRTL}
                />
                <QuickActionCard
                  title={t.dashboard.studentValidations}
                  description={t.dashboard.validateUploaded}
                  href="/students?status=pending"
                  icon={Users}
                  count={stats?.pendingStudents}
                  variant="warning"
                  viewDetailsText={t.dashboard.viewDetails}
                  pendingText={t.common.pending}
                  isRTL={isRTL}
                />
                <QuickActionCard
                  title={t.dashboard.paymentProcessing}
                  description={t.dashboard.processPending}
                  href="/payments?status=pending"
                  icon={CreditCard}
                  count={stats?.pendingPayments}
                  viewDetailsText={t.dashboard.viewDetails}
                  pendingText={t.common.pending}
                  isRTL={isRTL}
                />
                <QuickActionCard
                  title={t.dashboard.publishResults}
                  description={t.dashboard.reviewPublish}
                  href="/results?status=pending"
                  icon={FileCheck}
                  count={stats?.pendingResults}
                  variant="success"
                  viewDetailsText={t.dashboard.viewDetails}
                  pendingText={t.common.pending}
                  isRTL={isRTL}
                />
              </>
            ) : (
              <>
                <QuickActionCard
                  title={t.dashboard.registerStudents}
                  description={t.dashboard.uploadStudentList}
                  href="/students/register"
                  icon={Users}
                  viewDetailsText={t.dashboard.viewDetails}
                  isRTL={isRTL}
                />
                <QuickActionCard
                  title={t.dashboard.viewInvoice}
                  description={t.dashboard.checkPaymentStatus}
                  href="/payments"
                  icon={CreditCard}
                  viewDetailsText={t.dashboard.viewDetails}
                  isRTL={isRTL}
                />
                <QuickActionCard
                  title={t.dashboard.examCenter}
                  description={t.dashboard.viewAssignedCenter}
                  href="/center-info"
                  icon={CheckCircle2}
                  variant="success"
                  viewDetailsText={t.dashboard.viewDetails}
                  isRTL={isRTL}
                />
                <QuickActionCard
                  title={t.dashboard.downloadResults}
                  description={t.dashboard.getStudentResults}
                  href="/results"
                  icon={FileCheck}
                  viewDetailsText={t.dashboard.viewDetails}
                  isRTL={isRTL}
                />
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : ''}`}>{t.dashboard.recentActivity}</h2>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-8 h-8 rounded-md" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div>
                  {stats.recentActivity.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      type={activity.type}
                      message={activity.message}
                      timestamp={activity.timestamp}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t.dashboard.noRecentActivity}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Registration Progress (for Admin) */}
      {isAdmin && (
        <Card>
          <CardHeader className={isRTL ? 'text-right' : ''}>
            <CardTitle className="text-lg">{t.dashboard.registrationProgress}</CardTitle>
            <CardDescription>
              {t.dashboard.overviewOfRegistration}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["Western Region", "Central Region", "Northern Region", "Eastern Region"].map((region, index) => (
                <div key={region} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{region}</span>
                    <span className="text-muted-foreground">{70 + index * 5}%</span>
                  </div>
                  <Progress value={70 + index * 5} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
