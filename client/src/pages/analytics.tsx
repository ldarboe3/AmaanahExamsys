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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  School,
  Award,
  Download,
  Filter,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ExamYear, Region, Cluster } from "@shared/schema";

interface StudentsBySchool {
  schoolId: number;
  schoolName: string;
  studentCount: number;
  regionId: number | null;
  clusterId: number | null;
}

interface StudentsByRegion {
  regionId: number;
  regionName: string;
  studentCount: number;
}

interface SubjectResult {
  subject: string;
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
        <p className="font-medium">{payload[0].name || label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value.toLocaleString()} students
        </p>
        {payload[0].payload.passRate !== undefined && (
          <p className="text-sm text-chart-3">
            Pass Rate: {payload[0].payload.passRate.toFixed(1)}%
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

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
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

  const { data: studentsByRegion, isLoading: regionLoading } = useQuery<StudentsByRegion[]>({
    queryKey: ["/api/analytics/students-by-region", currentExamYearId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/students-by-region?examYearId=${currentExamYearId}`);
      if (!res.ok) throw new Error('Failed to fetch students by region');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const { data: resultsBySubject, isLoading: subjectLoading } = useQuery<SubjectResult[]>({
    queryKey: ["/api/analytics/results-by-subject", currentExamYearId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/results-by-subject?examYearId=${currentExamYearId}`);
      if (!res.ok) throw new Error('Failed to fetch results by subject');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const { data: resultsByGender, isLoading: genderLoading } = useQuery<GenderResult[]>({
    queryKey: ["/api/analytics/results-by-gender", currentExamYearId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/results-by-gender?examYearId=${currentExamYearId}`);
      if (!res.ok) throw new Error('Failed to fetch results by gender');
      return res.json();
    },
    enabled: !!currentExamYearId,
  });

  const filteredClusters = useMemo(() => {
    if (!clusters || selectedRegion === "all") return clusters;
    return clusters.filter(c => c.regionId === parseInt(selectedRegion));
  }, [clusters, selectedRegion]);

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
    return filteredSchoolData.reduce((sum, s) => sum + s.studentCount, 0);
  }, [filteredSchoolData]);

  const totalSchools = filteredSchoolData.length;

  const overallPassRate = useMemo(() => {
    if (!resultsBySubject || resultsBySubject.length === 0) return 0;
    const totalPass = resultsBySubject.reduce((sum, s) => sum + s.passCount, 0);
    const totalStudents = resultsBySubject.reduce((sum, s) => sum + s.totalStudents, 0);
    return totalStudents > 0 ? (totalPass / totalStudents) * 100 : 0;
  }, [resultsBySubject]);

  const avgScore = useMemo(() => {
    if (!resultsBySubject || resultsBySubject.length === 0) return 0;
    const totalScore = resultsBySubject.reduce((sum, s) => sum + (s.averageScore * s.totalStudents), 0);
    const totalStudents = resultsBySubject.reduce((sum, s) => sum + s.totalStudents, 0);
    return totalStudents > 0 ? totalScore / totalStudents : 0;
  }, [resultsBySubject]);

  const regionPieData = useMemo(() => {
    if (!studentsByRegion) return [];
    return studentsByRegion.map(r => ({
      name: r.regionName,
      value: r.studentCount,
    }));
  }, [studentsByRegion]);

  const genderPieData = useMemo(() => {
    if (!resultsByGender) return [];
    return resultsByGender.map(g => ({
      name: g.gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female'),
      value: g.studentCount,
      passRate: g.passCount / (g.passCount + g.failCount) * 100 || 0,
      avgScore: g.averageScore,
    }));
  }, [resultsByGender, isRTL]);

  const subjectBarData = useMemo(() => {
    if (!resultsBySubject) return [];
    return resultsBySubject.map(s => ({
      name: s.subject.length > 15 ? s.subject.slice(0, 12) + '...' : s.subject,
      fullName: s.subject,
      avgScore: s.averageScore,
      passRate: (s.passCount / s.totalStudents) * 100 || 0,
      students: s.totalStudents,
    }));
  }, [resultsBySubject]);

  const exportData = () => {
    const BOM = '\uFEFF';
    let csvContent = BOM;
    
    csvContent += isRTL ? "تقرير تحليلات الامتحانات\n" : "Examination Analytics Report\n";
    csvContent += `${isRTL ? "سنة الامتحان" : "Examination Year"}: ${activeExamYear?.year || ''}\n\n`;
    
    csvContent += `${isRTL ? "الملخص" : "Summary"}\n`;
    csvContent += `${isRTL ? "إجمالي الطلاب" : "Total Students"},${totalStudents}\n`;
    csvContent += `${isRTL ? "إجمالي المدارس" : "Total Schools"},${totalSchools}\n`;
    csvContent += `${isRTL ? "نسبة النجاح" : "Pass Rate"},${overallPassRate.toFixed(1)}%\n`;
    csvContent += `${isRTL ? "متوسط الدرجات" : "Average Score"},${avgScore.toFixed(1)}\n\n`;
    
    csvContent += `${isRTL ? "التوزيع حسب المنطقة" : "Distribution by Region"}\n`;
    csvContent += `${isRTL ? "المنطقة" : "Region"},${isRTL ? "عدد الطلاب" : "Student Count"}\n`;
    studentsByRegion?.forEach(r => {
      csvContent += `"${r.regionName}",${r.studentCount}\n`;
    });
    csvContent += "\n";
    
    csvContent += `${isRTL ? "الأداء حسب المادة" : "Performance by Subject"}\n`;
    csvContent += `${isRTL ? "المادة" : "Subject"},${isRTL ? "متوسط الدرجات" : "Avg Score"},${isRTL ? "نسبة النجاح" : "Pass Rate"},${isRTL ? "عدد الطلاب" : "Students"}\n`;
    resultsBySubject?.forEach(s => {
      const passRate = (s.passCount / s.totalStudents) * 100 || 0;
      csvContent += `"${s.subject}",${s.averageScore.toFixed(1)},${passRate.toFixed(1)}%,${s.totalStudents}\n`;
    });
    csvContent += "\n";
    
    csvContent += `${isRTL ? "التوزيع حسب الجنس" : "Distribution by Gender"}\n`;
    csvContent += `${isRTL ? "الجنس" : "Gender"},${isRTL ? "عدد الطلاب" : "Count"},${isRTL ? "متوسط الدرجات" : "Avg Score"},${isRTL ? "نسبة النجاح" : "Pass Rate"}\n`;
    resultsByGender?.forEach(g => {
      const passRate = g.passCount / (g.passCount + g.failCount) * 100 || 0;
      const genderLabel = g.gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female');
      csvContent += `"${genderLabel}",${g.studentCount},${g.averageScore.toFixed(1)},${passRate.toFixed(1)}%\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_report_${activeExamYear?.year || 'current'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isLoading = schoolLoading || regionLoading || subjectLoading || genderLoading;

  return (
    <div className="space-y-6">
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
          <Select value={selectedRegion} onValueChange={(v) => { setSelectedRegion(v); setSelectedCluster("all"); }}>
            <SelectTrigger className="w-[150px]" data-testid="select-region-filter">
              <SelectValue placeholder={isRTL ? "المنطقة" : "Region"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع المناطق" : "All Regions"}</SelectItem>
              {regions?.map(r => (
                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-[150px]" data-testid="select-cluster-filter">
              <SelectValue placeholder={isRTL ? "المجموعة" : "Cluster"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? "جميع المجموعات" : "All Clusters"}</SelectItem>
              {filteredClusters?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            {isRTL ? "تصدير" : "Export"}
          </Button>
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
            <CardTitle className="text-lg">{isRTL ? "التوزيع حسب المنطقة" : "Distribution by Region"}</CardTitle>
            <CardDescription>
              {isRTL ? "عدد الطلاب في كل منطقة" : "Student count across regions"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {regionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={regionPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {regionPieData.map((entry, index) => (
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
          <CardTitle className="text-lg">{isRTL ? "أداء المواد" : "Subject Performance"}</CardTitle>
          <CardDescription>
            {isRTL ? "متوسط الدرجات ونسب النجاح حسب المادة" : "Average scores and pass rates by subject"}
          </CardDescription>
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
            <CardTitle className="text-lg">{isRTL ? "تفاصيل الأداء حسب الجنس" : "Performance Details by Gender"}</CardTitle>
            <CardDescription>
              {isRTL ? "مقارنة مفصلة بين الذكور والإناث" : "Detailed comparison between male and female students"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              {resultsByGender?.map((g, index) => (
                <div key={g.gender} className={`p-6 border rounded-md ${index === 0 ? 'bg-chart-2/5' : 'bg-chart-4/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">
                      {g.gender === 'male' ? (isRTL ? 'الطلاب الذكور' : 'Male Students') : (isRTL ? 'الطالبات' : 'Female Students')}
                    </h4>
                    <span className="text-2xl font-semibold">{g.studentCount.toLocaleString()}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{isRTL ? "متوسط الدرجات" : "Avg Score"}</span>
                      <span className="font-medium">{g.averageScore.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{isRTL ? "نسبة النجاح" : "Pass Rate"}</span>
                      <span className="font-medium text-chart-3">
                        {((g.passCount / (g.passCount + g.failCount)) * 100 || 0).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(g.passCount / (g.passCount + g.failCount)) * 100 || 0} 
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
