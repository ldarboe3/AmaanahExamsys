import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  School,
  Award,
  Download,
  FileText,
  Printer,
  FileSpreadsheet,
  Filter,
  GraduationCap,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useMemo, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ExamYear, Region, Cluster, School as SchoolType } from "@shared/schema";

interface StudentsBySchool {
  schoolId: number;
  schoolName?: string;
  count: number;
  studentCount?: number;
  regionId?: number | null;
  clusterId?: number | null;
}

interface PerformanceByRegion {
  regionId: number;
  regionName: string;
  studentCount: number;
  avgScore: number;
  passRate: number;
}

interface PerformanceByGrade {
  grade: number;
  studentCount: number;
  avgScore: number;
  passRate: number;
}

interface SubjectResult {
  subject: string;
  subjectId: number;
  averageScore: number;
  totalStudents: number;
  passCount: number;
  failCount: number;
}

interface GenderResult {
  gender: string;
  studentCount: number;
  averageScore: number;
  passCount: number;
  failCount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];
const GRADE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

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

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md p-3 shadow-lg">
        <p className="font-medium">{payload[0].name || payload[0].payload?.regionName || label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value?.toLocaleString()} {payload[0].payload?.studentCount ? 'students' : ''}
        </p>
        {payload[0].payload?.passRate !== undefined && (
          <p className="text-sm text-chart-3">
            Pass Rate: {payload[0].payload.passRate.toFixed(1)}%
          </p>
        )}
        {payload[0].payload?.avgScore !== undefined && (
          <p className="text-sm text-primary">
            Avg Score: {payload[0].payload.avgScore.toFixed(1)}
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default function Analytics() {
  const { t, isRTL } = useLanguage();
  const [selectedExamYear, setSelectedExamYear] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const analyticsRef = useRef<HTMLDivElement>(null);

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: schoolsResponse } = useQuery<{ data: SchoolType[] }>({
    queryKey: ["/api/schools"],
  });
  const schoolsList = schoolsResponse?.data;

  const { data: subjects } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
  });

  const activeExamYear = useMemo(() => {
    if (examYears?.length) {
      const active = examYears.find(y => y.isActive);
      return active || examYears[0];
    }
    return null;
  }, [examYears]);

  const currentExamYearId = selectedExamYear ? parseInt(selectedExamYear) : activeExamYear?.id;

  const { data: studentsBySchool, isLoading: schoolLoading } = useQuery<StudentsBySchool[]>({
    queryKey: ["/api/analytics/students-by-school", currentExamYearId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/students-by-school?examYearId=${currentExamYearId}`);
      if (!res.ok) throw new Error('Failed to fetch students by school');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const { data: performanceByRegion, isLoading: perfRegionLoading } = useQuery<PerformanceByRegion[]>({
    queryKey: ["/api/analytics/performance-by-region", currentExamYearId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/performance-by-region?examYearId=${currentExamYearId}`);
      if (!res.ok) throw new Error('Failed to fetch performance by region');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('examYearId', String(currentExamYearId));
    if (selectedRegion !== "all") params.append('regionId', selectedRegion);
    if (selectedCluster !== "all") params.append('clusterId', selectedCluster);
    if (selectedSchool !== "all") params.append('schoolId', selectedSchool);
    return params.toString();
  };

  const { data: performanceByGrade, isLoading: gradeLoading } = useQuery<PerformanceByGrade[]>({
    queryKey: ["/api/analytics/performance-by-grade", currentExamYearId, selectedRegion, selectedCluster, selectedSchool],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/performance-by-grade?${buildQueryParams()}`);
      if (!res.ok) throw new Error('Failed to fetch performance by grade');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const { data: resultsBySubject, isLoading: subjectLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/results-by-subject", currentExamYearId, selectedRegion, selectedCluster, selectedSchool],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/results-by-subject?${buildQueryParams()}`);
      if (!res.ok) throw new Error('Failed to fetch results by subject');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const { data: resultsByGender, isLoading: genderLoading } = useQuery<GenderResult[]>({
    queryKey: ["/api/analytics/results-by-gender", currentExamYearId, selectedRegion, selectedCluster, selectedSchool],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/results-by-gender?${buildQueryParams()}`);
      if (!res.ok) throw new Error('Failed to fetch results by gender');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const filteredClusters = useMemo(() => {
    if (!clusters || selectedRegion === "all") return clusters;
    return clusters.filter(c => c.regionId === parseInt(selectedRegion));
  }, [clusters, selectedRegion]);

  const filteredSchools = useMemo(() => {
    if (!schoolsList || !Array.isArray(schoolsList)) return [];
    let filtered = [...schoolsList];
    if (selectedRegion !== "all") {
      filtered = filtered.filter(s => s.regionId === parseInt(selectedRegion));
    }
    if (selectedCluster !== "all") {
      filtered = filtered.filter(s => s.clusterId === parseInt(selectedCluster));
    }
    return filtered;
  }, [schoolsList, selectedRegion, selectedCluster]);

  const filteredSchoolData = useMemo(() => {
    if (!studentsBySchool) return [];
    let data = [...studentsBySchool];
    if (selectedRegion !== "all") {
      data = data.filter(s => s.regionId === parseInt(selectedRegion));
    }
    if (selectedCluster !== "all") {
      data = data.filter(s => s.clusterId === parseInt(selectedCluster));
    }
    return data;
  }, [studentsBySchool, selectedRegion, selectedCluster]);

  const totalStudents = useMemo(() => {
    return filteredSchoolData.reduce((sum, s) => sum + (s.count || s.studentCount || 0), 0);
  }, [filteredSchoolData]);

  const totalSchools = filteredSchoolData.length;

  const overallPassRate = useMemo(() => {
    if (!resultsBySubject || resultsBySubject.length === 0) return 0;
    const totalPass = resultsBySubject.reduce((sum, s) => sum + (s.passCount || 0), 0);
    const totalStudents = resultsBySubject.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
    return totalStudents > 0 ? (totalPass / totalStudents) * 100 : 0;
  }, [resultsBySubject]);

  const avgScore = useMemo(() => {
    if (!resultsBySubject || resultsBySubject.length === 0) return 0;
    const totalScore = resultsBySubject.reduce((sum, s) => sum + ((s.averageScore || s.avgScore || 0) * (s.totalStudents || 1)), 0);
    const totalStudents = resultsBySubject.reduce((sum, s) => sum + (s.totalStudents || 1), 0);
    return totalStudents > 0 ? totalScore / totalStudents : 0;
  }, [resultsBySubject]);

  const regionPerformancePieData = useMemo(() => {
    if (!performanceByRegion) return [];
    return performanceByRegion.map(r => ({
      name: r.regionName,
      value: r.passRate,
      studentCount: r.studentCount,
      avgScore: r.avgScore,
      passRate: r.passRate,
    }));
  }, [performanceByRegion]);

  const gradeBarData = useMemo(() => {
    if (!performanceByGrade) return [];
    return performanceByGrade
      .sort((a, b) => a.grade - b.grade)
      .map(g => ({
        name: `Grade ${g.grade}`,
        grade: g.grade,
        avgScore: g.avgScore,
        passRate: g.passRate,
        studentCount: g.studentCount,
      }));
  }, [performanceByGrade]);

  const genderPieData = useMemo(() => {
    if (!resultsByGender) return [];
    return resultsByGender.map(g => ({
      name: g.gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female'),
      value: g.studentCount || 0,
      passRate: g.passCount && g.failCount ? (g.passCount / (g.passCount + g.failCount)) * 100 : (g as any).passRate || 0,
      avgScore: g.averageScore || (g as any).avgScore || 0,
    }));
  }, [resultsByGender, isRTL]);

  const subjectBarData = useMemo(() => {
    if (!resultsBySubject || !subjects) return [];
    return resultsBySubject.map(s => {
      const subjectInfo = subjects.find(sub => sub.id === s.subjectId);
      const subjectName = subjectInfo?.name || `Subject ${s.subjectId}`;
      return {
        name: subjectName.length > 15 ? subjectName.slice(0, 12) + '...' : subjectName,
        fullName: subjectName,
        avgScore: s.averageScore || s.avgScore || 0,
        passRate: s.passRate || (s.passCount && s.totalStudents ? (s.passCount / s.totalStudents) * 100 : 0),
        students: s.totalStudents || 0,
      };
    });
  }, [resultsBySubject, subjects]);

  const exportCSV = () => {
    const BOM = '\uFEFF';
    let csvContent = BOM;
    const examYearLabel = activeExamYear?.year || '';
    
    csvContent += isRTL ? "تقرير تحليلات الامتحانات\n" : "Examination Analytics Report\n";
    csvContent += `${isRTL ? "سنة الامتحان" : "Examination Year"}: ${examYearLabel}\n\n`;
    
    csvContent += `${isRTL ? "الملخص" : "Summary"}\n`;
    csvContent += `${isRTL ? "إجمالي الطلاب" : "Total Students"},${totalStudents}\n`;
    csvContent += `${isRTL ? "إجمالي المدارس" : "Total Schools"},${totalSchools}\n`;
    csvContent += `${isRTL ? "نسبة النجاح" : "Pass Rate"},${overallPassRate.toFixed(1)}%\n`;
    csvContent += `${isRTL ? "متوسط الدرجات" : "Average Score"},${avgScore.toFixed(1)}\n\n`;
    
    csvContent += `${isRTL ? "الأداء حسب المنطقة" : "Performance by Region"}\n`;
    csvContent += `${isRTL ? "المنطقة" : "Region"},${isRTL ? "عدد الطلاب" : "Students"},${isRTL ? "متوسط الدرجات" : "Avg Score"},${isRTL ? "نسبة النجاح" : "Pass Rate"}\n`;
    performanceByRegion?.forEach(r => {
      csvContent += `"${r.regionName}",${r.studentCount},${r.avgScore.toFixed(1)},${r.passRate.toFixed(1)}%\n`;
    });
    csvContent += "\n";

    csvContent += `${isRTL ? "الأداء حسب الصف" : "Performance by Grade"}\n`;
    csvContent += `${isRTL ? "الصف" : "Grade"},${isRTL ? "عدد الطلاب" : "Students"},${isRTL ? "متوسط الدرجات" : "Avg Score"},${isRTL ? "نسبة النجاح" : "Pass Rate"}\n`;
    performanceByGrade?.forEach(g => {
      csvContent += `${g.grade},${g.studentCount},${g.avgScore.toFixed(1)},${g.passRate.toFixed(1)}%\n`;
    });
    csvContent += "\n";
    
    csvContent += `${isRTL ? "الأداء حسب المادة" : "Performance by Subject"}\n`;
    csvContent += `${isRTL ? "المادة" : "Subject"},${isRTL ? "متوسط الدرجات" : "Avg Score"},${isRTL ? "نسبة النجاح" : "Pass Rate"},${isRTL ? "عدد الطلاب" : "Students"}\n`;
    subjectBarData?.forEach(s => {
      csvContent += `"${s.fullName}",${s.avgScore.toFixed(1)},${s.passRate.toFixed(1)}%,${s.students}\n`;
    });
    csvContent += "\n";
    
    csvContent += `${isRTL ? "التوزيع حسب الجنس" : "Distribution by Gender"}\n`;
    csvContent += `${isRTL ? "الجنس" : "Gender"},${isRTL ? "عدد الطلاب" : "Count"},${isRTL ? "متوسط الدرجات" : "Avg Score"},${isRTL ? "نسبة النجاح" : "Pass Rate"}\n`;
    genderPieData?.forEach(g => {
      csvContent += `"${g.name}",${g.value},${g.avgScore.toFixed(1)},${g.passRate.toFixed(1)}%\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_report_${examYearLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const examYearLabel = activeExamYear?.year || '';

      const summaryData = [
        [isRTL ? "تقرير تحليلات الامتحانات" : "Examination Analytics Report"],
        [isRTL ? "سنة الامتحان" : "Examination Year", examYearLabel],
        [],
        [isRTL ? "الملخص" : "Summary"],
        [isRTL ? "إجمالي الطلاب" : "Total Students", totalStudents],
        [isRTL ? "إجمالي المدارس" : "Total Schools", totalSchools],
        [isRTL ? "نسبة النجاح" : "Pass Rate", `${overallPassRate.toFixed(1)}%`],
        [isRTL ? "متوسط الدرجات" : "Average Score", avgScore.toFixed(1)],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, isRTL ? "الملخص" : "Summary");

      if (performanceByRegion?.length) {
        const regionData = [
          [isRTL ? "المنطقة" : "Region", isRTL ? "عدد الطلاب" : "Students", isRTL ? "متوسط الدرجات" : "Avg Score", isRTL ? "نسبة النجاح" : "Pass Rate"],
          ...performanceByRegion.map(r => [r.regionName, r.studentCount, r.avgScore.toFixed(1), `${r.passRate.toFixed(1)}%`])
        ];
        const regionWs = XLSX.utils.aoa_to_sheet(regionData);
        XLSX.utils.book_append_sheet(wb, regionWs, isRTL ? "الأداء حسب المنطقة" : "By Region");
      }

      if (performanceByGrade?.length) {
        const gradeData = [
          [isRTL ? "الصف" : "Grade", isRTL ? "عدد الطلاب" : "Students", isRTL ? "متوسط الدرجات" : "Avg Score", isRTL ? "نسبة النجاح" : "Pass Rate"],
          ...performanceByGrade.map(g => [g.grade, g.studentCount, g.avgScore.toFixed(1), `${g.passRate.toFixed(1)}%`])
        ];
        const gradeWs = XLSX.utils.aoa_to_sheet(gradeData);
        XLSX.utils.book_append_sheet(wb, gradeWs, isRTL ? "الأداء حسب الصف" : "By Grade");
      }

      if (subjectBarData?.length) {
        const subjectData = [
          [isRTL ? "المادة" : "Subject", isRTL ? "متوسط الدرجات" : "Avg Score", isRTL ? "نسبة النجاح" : "Pass Rate", isRTL ? "عدد الطلاب" : "Students"],
          ...subjectBarData.map(s => [s.fullName, s.avgScore.toFixed(1), `${s.passRate.toFixed(1)}%`, s.students])
        ];
        const subjectWs = XLSX.utils.aoa_to_sheet(subjectData);
        XLSX.utils.book_append_sheet(wb, subjectWs, isRTL ? "الأداء حسب المادة" : "By Subject");
      }

      if (genderPieData?.length) {
        const genderData = [
          [isRTL ? "الجنس" : "Gender", isRTL ? "عدد الطلاب" : "Count", isRTL ? "متوسط الدرجات" : "Avg Score", isRTL ? "نسبة النجاح" : "Pass Rate"],
          ...genderPieData.map(g => [g.name, g.value, g.avgScore.toFixed(1), `${g.passRate.toFixed(1)}%`])
        ];
        const genderWs = XLSX.utils.aoa_to_sheet(genderData);
        XLSX.utils.book_append_sheet(wb, genderWs, isRTL ? "الأداء حسب الجنس" : "By Gender");
      }

      XLSX.writeFile(wb, `analytics_report_${examYearLabel}.xlsx`);
    });
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const examYearLabel = activeExamYear?.year || '';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${isRTL ? "تقرير التحليلات" : "Analytics Report"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { color: #0d9488; text-align: center; margin-bottom: 10px; }
          h2 { color: #333; border-bottom: 2px solid #0d9488; padding-bottom: 5px; margin-top: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; flex-wrap: wrap; }
          .stat-box { background: #f3f4f6; padding: 15px 25px; border-radius: 8px; text-align: center; margin: 5px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #0d9488; }
          .stat-label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background: #0d9488; color: white; }
          tr:nth-child(even) { background: #f9fafb; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${isRTL ? "تقرير تحليلات الامتحانات" : "Examination Analytics Report"}</h1>
          <p>${isRTL ? "سنة الامتحان" : "Examination Year"}: ${examYearLabel}</p>
        </div>

        <div class="summary">
          <div class="stat-box">
            <div class="stat-value">${totalStudents.toLocaleString()}</div>
            <div class="stat-label">${isRTL ? "إجمالي الطلاب" : "Total Students"}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${totalSchools.toLocaleString()}</div>
            <div class="stat-label">${isRTL ? "المدارس المسجلة" : "Registered Schools"}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${overallPassRate.toFixed(1)}%</div>
            <div class="stat-label">${isRTL ? "نسبة النجاح" : "Pass Rate"}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${avgScore.toFixed(1)}</div>
            <div class="stat-label">${isRTL ? "متوسط الدرجات" : "Average Score"}</div>
          </div>
        </div>

        <h2>${isRTL ? "الأداء حسب المنطقة" : "Performance by Region"}</h2>
        <table>
          <tr>
            <th>${isRTL ? "المنطقة" : "Region"}</th>
            <th>${isRTL ? "عدد الطلاب" : "Students"}</th>
            <th>${isRTL ? "متوسط الدرجات" : "Avg Score"}</th>
            <th>${isRTL ? "نسبة النجاح" : "Pass Rate"}</th>
          </tr>
          ${performanceByRegion?.map(r => `
            <tr>
              <td>${r.regionName}</td>
              <td>${r.studentCount.toLocaleString()}</td>
              <td>${r.avgScore.toFixed(1)}</td>
              <td>${r.passRate.toFixed(1)}%</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No data</td></tr>'}
        </table>

        <h2>${isRTL ? "الأداء حسب الصف" : "Performance by Grade"}</h2>
        <table>
          <tr>
            <th>${isRTL ? "الصف" : "Grade"}</th>
            <th>${isRTL ? "عدد الطلاب" : "Students"}</th>
            <th>${isRTL ? "متوسط الدرجات" : "Avg Score"}</th>
            <th>${isRTL ? "نسبة النجاح" : "Pass Rate"}</th>
          </tr>
          ${performanceByGrade?.map(g => `
            <tr>
              <td>${g.grade}</td>
              <td>${g.studentCount.toLocaleString()}</td>
              <td>${g.avgScore.toFixed(1)}</td>
              <td>${g.passRate.toFixed(1)}%</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No data</td></tr>'}
        </table>

        <h2>${isRTL ? "الأداء حسب المادة" : "Subject Performance"}</h2>
        <table>
          <tr>
            <th>${isRTL ? "المادة" : "Subject"}</th>
            <th>${isRTL ? "متوسط الدرجات" : "Avg Score"}</th>
            <th>${isRTL ? "نسبة النجاح" : "Pass Rate"}</th>
            <th>${isRTL ? "عدد الطلاب" : "Students"}</th>
          </tr>
          ${subjectBarData?.map(s => `
            <tr>
              <td>${s.fullName}</td>
              <td>${s.avgScore.toFixed(1)}</td>
              <td>${s.passRate.toFixed(1)}%</td>
              <td>${s.students.toLocaleString()}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No data</td></tr>'}
        </table>

        <h2>${isRTL ? "الأداء حسب الجنس" : "Performance by Gender"}</h2>
        <table>
          <tr>
            <th>${isRTL ? "الجنس" : "Gender"}</th>
            <th>${isRTL ? "عدد الطلاب" : "Count"}</th>
            <th>${isRTL ? "متوسط الدرجات" : "Avg Score"}</th>
            <th>${isRTL ? "نسبة النجاح" : "Pass Rate"}</th>
          </tr>
          ${genderPieData?.map(g => `
            <tr>
              <td>${g.name}</td>
              <td>${g.value.toLocaleString()}</td>
              <td>${g.avgScore.toFixed(1)}</td>
              <td>${g.passRate.toFixed(1)}%</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No data</td></tr>'}
        </table>

        <div class="footer">
          <p>${isRTL ? "تم إنشاء هذا التقرير بواسطة نظام إدارة الامتحانات أمانة" : "Generated by Amaanah Examination Management System"}</p>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = schoolLoading || subjectLoading || genderLoading || perfRegionLoading || gradeLoading;

  return (
    <div className="space-y-4" ref={analyticsRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            {isRTL ? "التحليلات" : "Analytics"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "رؤى الأداء وإحصائيات الامتحانات" : "Performance insights and examination statistics"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedExamYear || (activeExamYear?.id?.toString() || "")} onValueChange={setSelectedExamYear}>
            <SelectTrigger className="w-[150px]" data-testid="select-exam-year">
              <SelectValue placeholder={isRTL ? "السنة" : "Year"} />
            </SelectTrigger>
            <SelectContent>
              {examYears?.map(year => (
                <SelectItem key={year.id} value={year.id.toString()}>
                  {year.year} {year.isActive && (isRTL ? "(حالي)" : "(Current)")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <Download className="w-4 h-4 me-2" />
                {isRTL ? "تصدير" : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV} data-testid="export-csv">
                <FileText className="w-4 h-4 me-2" />
                {isRTL ? "تصدير CSV" : "Export CSV"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} data-testid="export-excel">
                <FileSpreadsheet className="w-4 h-4 me-2" />
                {isRTL ? "تصدير Excel" : "Export Excel"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF} data-testid="export-pdf">
                <FileText className="w-4 h-4 me-2" />
                {isRTL ? "تصدير PDF" : "Export PDF"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint} data-testid="print-report">
                <Printer className="w-4 h-4 me-2" />
                {isRTL ? "طباعة" : "Print"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={isRTL ? "إجمالي الطلاب" : "Total Students"}
            value={totalStudents.toLocaleString()}
            icon={Users}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            title={isRTL ? "المدارس المسجلة" : "Registered Schools"}
            value={totalSchools.toLocaleString()}
            icon={School}
            color="bg-chart-2/10 text-chart-2"
          />
          <StatCard
            title={isRTL ? "نسبة النجاح" : "Pass Rate"}
            value={`${overallPassRate.toFixed(1)}%`}
            icon={Award}
            color="bg-chart-3/10 text-chart-3"
          />
          <StatCard
            title={isRTL ? "متوسط الدرجات" : "Average Score"}
            value={avgScore.toFixed(1)}
            subtitle={isRTL ? "من 100" : "out of 100"}
            icon={BarChart3}
            color="bg-chart-4/10 text-chart-4"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRTL ? "الأداء حسب المنطقة" : "Performance by Region"}</CardTitle>
            <CardDescription>
              {isRTL ? "نسب النجاح ومتوسط الدرجات حسب المنطقة" : "Pass rates and average scores by region"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {regionPerformancePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={regionPerformancePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {regionPerformancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {isRTL ? "لا توجد بيانات متاحة" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRTL ? "التوزيع حسب الجنس" : "Distribution by Gender"}</CardTitle>
            <CardDescription>
              {isRTL ? "مقارنة أداء الطلاب والطالبات" : "Comparison of male and female student performance"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {genderPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#0088FE" />
                    <Cell fill="#FF69B4" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {isRTL ? "لا توجد بيانات متاحة" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                {isRTL ? "الأداء حسب الصف" : "Performance by Grade"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "متوسط الدرجات ونسب النجاح لكل صف" : "Average scores and pass rates for each grade"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedRegion} onValueChange={(v) => { setSelectedRegion(v); setSelectedCluster("all"); setSelectedSchool("all"); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-region-grade">
                  <SelectValue placeholder={isRTL ? "المنطقة" : "Region"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع المناطق" : "All Regions"}</SelectItem>
                  {regions?.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCluster} onValueChange={(v) => { setSelectedCluster(v); setSelectedSchool("all"); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-cluster-grade">
                  <SelectValue placeholder={isRTL ? "المجموعة" : "Cluster"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع المجموعات" : "All Clusters"}</SelectItem>
                  {filteredClusters?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-[140px]" data-testid="select-school-grade">
                  <SelectValue placeholder={isRTL ? "المدرسة" : "School"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "جميع المدارس" : "All Schools"}</SelectItem>
                  {filteredSchools?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gradeBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={gradeBarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-md p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm">
                            {isRTL ? "متوسط الدرجات" : "Avg Score"}: {data.avgScore.toFixed(1)}
                          </p>
                          <p className="text-sm text-chart-3">
                            {isRTL ? "نسبة النجاح" : "Pass Rate"}: {data.passRate.toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? "عدد الطلاب" : "Students"}: {data.studentCount.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgScore" fill="#10B981" name={isRTL ? "متوسط الدرجات" : "Avg Score"} />
                <Bar dataKey="passRate" fill="#3B82F6" name={isRTL ? "نسبة النجاح" : "Pass Rate"} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              {isRTL ? "لا توجد بيانات متاحة" : "No data available"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{isRTL ? "أداء المواد" : "Subject Performance"}</CardTitle>
              <CardDescription>
                {isRTL ? "متوسط الدرجات ونسب النجاح حسب المادة" : "Average scores and pass rates by subject"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {isRTL ? "تستخدم نفس فلاتر الصف أعلاه" : "Uses same filters as Grade above"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subjectBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={subjectBarData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-md p-3 shadow-lg">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm">
                            {isRTL ? "متوسط الدرجات" : "Avg Score"}: {data.avgScore.toFixed(1)}
                          </p>
                          <p className="text-sm text-chart-3">
                            {isRTL ? "نسبة النجاح" : "Pass Rate"}: {data.passRate.toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? "عدد الطلاب" : "Students"}: {data.students.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgScore" fill="#8884d8" name={isRTL ? "متوسط الدرجات" : "Avg Score"} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              {isRTL ? "لا توجد بيانات متاحة" : "No data available"}
            </div>
          )}
        </CardContent>
      </Card>

      {genderPieData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{isRTL ? "تفاصيل الأداء حسب الجنس" : "Performance Details by Gender"}</CardTitle>
                <CardDescription>
                  {isRTL ? "مقارنة مفصلة بين الذكور والإناث" : "Detailed comparison between male and female students"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                {isRTL ? "تستخدم نفس فلاتر الصف أعلاه" : "Uses same filters as Grade above"}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              {genderPieData.map((g, index) => (
                <div key={index} className={`p-6 border rounded-md ${index === 0 ? 'bg-chart-2/5' : 'bg-chart-4/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">
                      {g.name === 'Male' || g.name === 'ذكر' ? (isRTL ? 'الطلاب الذكور' : 'Male Students') : (isRTL ? 'الطالبات' : 'Female Students')}
                    </h4>
                    <span className="text-2xl font-semibold">{g.value.toLocaleString()}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{isRTL ? "متوسط الدرجات" : "Avg Score"}</span>
                      <span className="font-medium">{g.avgScore.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{isRTL ? "نسبة النجاح" : "Pass Rate"}</span>
                      <span className="font-medium text-chart-3">
                        {g.passRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={g.passRate} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
