import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  FileText,
  School,
  Users,
  CreditCard,
  FileCheck,
  UserCheck,
  BarChart3,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExamYear } from "@shared/schema";

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  formats: string[];
  endpoint: string;
}

const reportTypes: ReportType[] = [
  {
    id: "schools",
    title: "Schools Report",
    description: "Export all registered schools with details",
    icon: School,
    formats: ["CSV"],
    endpoint: "/api/export/schools/csv",
  },
  {
    id: "students",
    title: "Students Report",
    description: "Export student enrollment data",
    icon: Users,
    formats: ["CSV"],
    endpoint: "/api/export/students/csv",
  },
  {
    id: "invoices",
    title: "Invoices Report",
    description: "Export financial records and payment status",
    icon: CreditCard,
    formats: ["CSV"],
    endpoint: "/api/export/invoices/csv",
  },
  {
    id: "results",
    title: "Results Report",
    description: "Export examination results data",
    icon: FileCheck,
    formats: ["CSV"],
    endpoint: "/api/export/results/csv",
  },
  {
    id: "examiners",
    title: "Examiners Report",
    description: "Export examiner information and assignments",
    icon: UserCheck,
    formats: ["CSV"],
    endpoint: "/api/export/examiners/csv",
  },
];

function ReportCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 mt-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [selectedExamYear, setSelectedExamYear] = useState<string>("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: examYears, isLoading: loadingYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: summaryReport } = useQuery({
    queryKey: ["/api/export/report/summary"],
  });

  const handleDownload = async (report: ReportType) => {
    try {
      setDownloading(report.id);
      
      let url = report.endpoint;
      if (selectedExamYear !== "all") {
        url += `?examYearId=${selectedExamYear}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${report.id}_export.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download Complete",
        description: `${report.title} has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the report.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Reports & Exports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and download system reports in various formats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
            <SelectTrigger className="w-[200px]" data-testid="select-exam-year-filter">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {examYears?.map((year) => (
                <SelectItem key={year.id} value={year.id.toString()}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-schools">
              {(summaryReport as any)?.summary?.totalSchools || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved: {(summaryReport as any)?.schoolsByStatus?.approved || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-students">
              {(summaryReport as any)?.summary?.totalStudents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Examiners</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-examiners">
              {(summaryReport as any)?.summary?.totalExaminers || 0}
            </div>
            <p className="text-xs text-muted-foreground">Registered examiners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${parseFloat((summaryReport as any)?.summary?.totalRevenue || '0').toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Collected payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingYears
          ? [1, 2, 3, 4, 5].map((i) => <ReportCardSkeleton key={i} />)
          : reportTypes.map((report) => (
              <Card key={report.id} className="hover-elevate transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <report.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      {report.formats.map((format) => (
                        <Badge key={format} variant="secondary">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleDownload(report)}
                    disabled={downloading === report.id}
                    data-testid={`button-download-${report.id}`}
                  >
                    {downloading === report.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Quick Statistics by Region
          </CardTitle>
          <CardDescription>School distribution across regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(summaryReport as any)?.schoolsByRegion?.length > 0 ? (
              (summaryReport as any).schoolsByRegion.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.region}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(
                            (item.count /
                              Math.max(
                                ...(summaryReport as any).schoolsByRegion.map((r: any) => r.count)
                              )) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No regional data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
