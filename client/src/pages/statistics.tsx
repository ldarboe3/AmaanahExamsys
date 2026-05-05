import { useState, useMemo } from "react";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  GraduationCap,
  School,
  Filter,
  Download,
  TrendingUp,
  AlertCircle,
  Loader2,
  X,
  CheckSquare,
  BarChart2,
  Layers,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";

type StatCategory = "students" | "schools" | "results" | "examiners";

type StudentGroupBy  = "region" | "cluster" | "school" | "grade" | "gender" | "examYear" | "status";
type SchoolGroupBy   = "region" | "cluster" | "type" | "status";
type ResultGroupBy   = "region" | "cluster" | "school" | "grade";
type ExaminerGroupBy = "region" | "cluster" | "status";
type GroupBy = StudentGroupBy | SchoolGroupBy | ResultGroupBy | ExaminerGroupBy;

interface StatResult {
  label: string;
  count: number;
  extra?: Record<string, any>;
}

interface StatsMeta {
  examYears?: { id: number; name: string; status: string }[];
  grades?: number[];
  isResultsMode?: boolean;
}

interface StatsResponse {
  results: StatResult[];
  total: number;
  groupBy: string;
  category: string;
  availableInEmis: boolean;
  meta: StatsMeta;
}

const GRADE_LABELS_EN: Record<number, string> = {
  3:  "Grade 3 — LBS",
  6:  "Grade 6 — UBS",
  9:  "Grade 9 — BCS",
  12: "Grade 12 — SSS",
};

const GRADE_LABELS_AR: Record<number, string> = {
  3:  "الصف 3 — LBS",
  6:  "الصف 6 — UBS",
  9:  "الصف 9 — BCS",
  12: "الصف 12 — SSS",
};

export default function Statistics() {
  const { isRTL } = useLanguage();
  const GRADE_LABELS = isRTL ? GRADE_LABELS_AR : GRADE_LABELS_EN;

  const [activeTab, setActiveTab]               = useState<StatCategory>("students");
  const [groupBy, setGroupBy]                   = useState<GroupBy>("region");
  const [selectedRegion, setSelectedRegion]     = useState<string>("all");
  const [selectedCluster, setSelectedCluster]   = useState<string>("all");
  const [selectedExamYear, setSelectedExamYear] = useState<string>("all");
  const [selectedGrade, setSelectedGrade]       = useState<string>("all");

  /* ── Reference data ─────────────────────────────── */
  const { data: regions }  = useQuery<any[]>({ queryKey: ["/api/regions"] });
  const { data: clusters } = useQuery<any[]>({ queryKey: ["/api/clusters"] });

  const visibleClusters = useMemo(() => {
    if (!clusters) return [];
    if (selectedRegion === "all") return clusters;
    return clusters.filter((c: any) => c.regionId === parseInt(selectedRegion));
  }, [clusters, selectedRegion]);

  /* ── Group-by options per tab ────────────────────── */
  type GroupOption = { value: GroupBy; label: string; labelAr: string };
  const groupOptions: Record<StatCategory, GroupOption[]> = {
    students: [
      { value: "region",   label: "By Region",    labelAr: "حسب المنطقة" },
      { value: "cluster",  label: "By Cluster",   labelAr: "حسب المجموعة" },
      { value: "school",   label: "By School",    labelAr: "حسب المدرسة" },
      { value: "grade",    label: "By Grade",     labelAr: "حسب الصف" },
      { value: "gender",   label: "By Gender",    labelAr: "حسب الجنس" },
      { value: "examYear", label: "By Exam Year", labelAr: "حسب سنة الامتحان" },
      { value: "status",   label: "By Status",    labelAr: "حسب الحالة" },
    ],
    schools: [
      { value: "region",  label: "By Region",      labelAr: "حسب المنطقة" },
      { value: "cluster", label: "By Cluster",     labelAr: "حسب المجموعة" },
      { value: "type",    label: "By School Type", labelAr: "حسب نوع المدرسة" },
      { value: "status",  label: "By Status",      labelAr: "حسب الحالة" },
    ],
    results: [
      { value: "region",  label: "By Region",  labelAr: "حسب المنطقة" },
      { value: "cluster", label: "By Cluster", labelAr: "حسب المجموعة" },
      { value: "school",  label: "By School",  labelAr: "حسب المدرسة" },
      { value: "grade",   label: "By Grade",   labelAr: "حسب الصف" },
    ],
    examiners: [
      { value: "region",  label: "By Region",  labelAr: "حسب المنطقة" },
      { value: "cluster", label: "By Cluster", labelAr: "حسب المجموعة" },
      { value: "status",  label: "By Status",  labelAr: "حسب الحالة" },
    ],
  };

  /* ── Query URL ───────────────────────────────────── */
  const statisticsUrl = useMemo(() => {
    const params = new URLSearchParams({ category: activeTab, groupBy });
    if (selectedRegion  !== "all") params.set("regionId",   selectedRegion);
    if (selectedCluster !== "all") params.set("clusterId",  selectedCluster);
    if (selectedExamYear !== "all") params.set("examYearId", selectedExamYear);
    if (selectedGrade   !== "all") params.set("grade",      selectedGrade);
    return `/api/public/statistics?${params.toString()}`;
  }, [activeTab, groupBy, selectedRegion, selectedCluster, selectedExamYear, selectedGrade]);

  const { data: statistics, isLoading } = useQuery<StatsResponse>({
    queryKey: [statisticsUrl],
  });

  const examYears = statistics?.meta?.examYears ?? [];
  const isResults = activeTab === "results";

  /* ── Handlers ─────────────────────────────────────── */
  const handleTabChange = (value: string) => {
    setActiveTab(value as StatCategory);
    setGroupBy("region");
    setSelectedRegion("all");
    setSelectedCluster("all");
    setSelectedGrade("all");
  };

  const handleRegionChange = (v: string) => {
    setSelectedRegion(v);
    setSelectedCluster("all");
  };

  /* ── CSV export ───────────────────────────────────── */
  const exportCSV = () => {
    if (!statistics?.results?.length) return;
    const isRes = statistics.meta?.isResultsMode;
    const header = isRes
      ? ["Category", "Students Examined", "Passed", "Pass Rate"]
      : ["Category", "Count", "Percentage"];
    const rows = statistics.results.map(r => {
      const pct = statistics.total > 0
        ? ((r.count / (isRes ? (r.extra?.total ?? r.count) : statistics.total)) * 100).toFixed(1) + "%"
        : "0%";
      return isRes
        ? [r.label, r.extra?.total ?? "", r.count, r.extra?.passRate ?? pct]
        : [r.label, r.count, pct];
    });
    const csv  = [header, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `statistics-${activeTab}-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Tab metadata ─────────────────────────────────── */
  const tabIcons: Record<StatCategory, any> = {
    students:  GraduationCap,
    schools:   School,
    results:   BarChart2,
    examiners: Users,
  };
  const tabLabels: Record<StatCategory, { en: string; ar: string }> = {
    students:  { en: "Students",  ar: "الطلاب" },
    schools:   { en: "Schools",   ar: "المدارس" },
    results:   { en: "Results",   ar: "النتائج" },
    examiners: { en: "Examiners", ar: "المصححون" },
  };

  /* ── Active-filter chips ──────────────────────────── */
  const activeFilters: { label: string; clear: () => void }[] = [];
  if (selectedExamYear !== "all") {
    const y = examYears.find(e => e.id.toString() === selectedExamYear);
    if (y) activeFilters.push({
      label: isRTL ? `السنة: ${y.name}` : `Year: ${y.name}`,
      clear: () => setSelectedExamYear("all"),
    });
  }
  if (selectedGrade !== "all") {
    activeFilters.push({
      label: GRADE_LABELS[parseInt(selectedGrade)] ?? (isRTL ? `الصف ${selectedGrade}` : `Grade ${selectedGrade}`),
      clear: () => setSelectedGrade("all"),
    });
  }
  if (selectedRegion !== "all") {
    const r = regions?.find((r: any) => r.id.toString() === selectedRegion);
    if (r) activeFilters.push({
      label: isRTL ? `المنطقة: ${r.name}` : `Region: ${r.name}`,
      clear: () => { setSelectedRegion("all"); setSelectedCluster("all"); },
    });
  }
  if (selectedCluster !== "all") {
    const c = visibleClusters.find((c: any) => c.id.toString() === selectedCluster);
    if (c) activeFilters.push({
      label: isRTL ? `المجموعة: ${c.name}` : `Cluster: ${c.name}`,
      clear: () => setSelectedCluster("all"),
    });
  }

  /* ── Content renderer ─────────────────────────────── */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    if (!statistics?.availableInEmis) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isRTL ? "البيانات غير متاحة حالياً" : "Data Not Currently Available"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isRTL
                ? "ستتوفر هذه البيانات من نظام EMIS قريباً."
                : "This data will be available from the EMIS system soon."}
            </p>
          </CardContent>
        </Card>
      );
    }
    if (!statistics?.results?.length) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isRTL ? "لا توجد بيانات" : "No Data Available"}
            </h3>
            <p className="text-muted-foreground">
              {isRTL ? "لا توجد بيانات مطابقة للفلاتر المحددة." : "No data matches the selected filters."}
            </p>
          </CardContent>
        </Card>
      );
    }

    const isRes    = statistics.meta?.isResultsMode;
    const maxCount = Math.max(...statistics.results.map(r => isRes ? (r.extra?.total ?? r.count) : r.count));

    return (
      <div className="space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {(() => { const Icon = tabIcons[activeTab]; return <Icon className="w-4 h-4 text-primary" />; })()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {isRes ? (isRTL ? "إجمالي الممتحنين" : "Examined") : (isRTL ? "الإجمالي" : "Total")}
                  </p>
                  <p className="text-xl font-bold text-foreground truncate">{statistics.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{isRTL ? "التصنيفات" : "Categories"}</p>
                  <p className="text-xl font-bold text-foreground">{statistics.results.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{isRTL ? "الأعلى" : "Highest"}</p>
                  <p className="text-xl font-bold text-foreground truncate">
                    {Math.max(...statistics.results.map(r => isRes ? (r.extra?.total ?? 0) : r.count)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {isRes ? (isRTL ? "معدل النجاح" : "Pass Rate") : (isRTL ? "المتوسط" : "Average")}
                  </p>
                  <p className="text-xl font-bold text-foreground truncate">
                    {isRes
                      ? (() => {
                          const totalPassed = statistics.results.reduce((s, r) => s + r.count, 0);
                          const totalExam   = statistics.results.reduce((s, r) => s + (r.extra?.total ?? 0), 0);
                          return totalExam > 0 ? ((totalPassed / totalExam) * 100).toFixed(1) + "%" : "–";
                        })()
                      : statistics.results.length > 0
                        ? Math.round(statistics.total / statistics.results.length).toLocaleString()
                        : "–"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  {isRTL ? "النتائج التفصيلية" : "Detailed Results"}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {isRTL
                    ? `${tabLabels[activeTab].ar} مجمّعة حسب ${groupOptions[activeTab].find(o => o.value === groupBy)?.labelAr ?? groupBy}`
                    : `${tabLabels[activeTab].en} grouped by ${groupBy}`}
                  {isRes ? (isRTL ? " — أعداد الناجحين" : " — pass counts") : ""}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
                <Download className="w-4 h-4 me-1.5" />
                {isRTL ? "تصدير CSV" : "Export CSV"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-muted-foreground font-normal">#</TableHead>
                    <TableHead>{isRTL ? "التصنيف" : "Category"}</TableHead>
                    <TableHead className="text-right">
                      {isRes ? (isRTL ? "الممتحنون" : "Examined") : (isRTL ? "العدد" : "Count")}
                    </TableHead>
                    {isRes && (
                      <TableHead className="text-right">{isRTL ? "الناجحون" : "Passed"}</TableHead>
                    )}
                    <TableHead className="text-right">
                      {isRes ? (isRTL ? "معدل النجاح" : "Pass Rate") : (isRTL ? "النسبة %" : "Share %")}
                    </TableHead>
                    <TableHead className="hidden md:table-cell w-48">
                      {isRTL ? "التوزيع" : "Distribution"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.results.map((result, i) => {
                    const rowTotal = isRes ? (result.extra?.total ?? 0) : result.count;
                    const barWidth = maxCount > 0 ? (rowTotal / maxCount) * 100 : 0;
                    const pct = isRes
                      ? (result.extra?.passRate ?? "–")
                      : statistics.total > 0
                        ? ((result.count / statistics.total) * 100).toFixed(1) + "%"
                        : "0%";
                    return (
                      <TableRow key={i} data-testid={`row-stat-${i}`}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{result.label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rowTotal.toLocaleString()}
                        </TableCell>
                        {isRes && (
                          <TableCell className="text-right tabular-nums">
                            {result.count.toLocaleString()}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <span className={`text-sm font-medium ${
                            isRes
                              ? parseFloat(pct) >= 75 ? "text-emerald-600"
                                : parseFloat(pct) >= 50 ? "text-amber-600"
                                : "text-destructive"
                              : "text-muted-foreground"
                          }`}>
                            {pct}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  /* ── Filter visibility ────────────────────────────── */
  const showRegionFilter   = ["cluster", "school"].includes(groupBy);
  const showClusterFilter  = groupBy === "school" && selectedRegion !== "all";
  const showGradeFilter    = (activeTab === "students" || activeTab === "results") && groupBy !== "grade";
  const showExamYearFilter = activeTab === "students" || activeTab === "results";

  return (
    <PublicLayout>
      {/* ── Hero ────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-10 md:py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-3" data-testid="badge-page-type">
              {isRTL ? "الإحصائيات" : "Statistics"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="heading-page-title">
              {isRTL ? "استعلام الإحصائيات" : "Statistics Query"}
            </h1>
            <p className="text-base text-muted-foreground">
              {isRTL
                ? "استعلام بيانات الامتحانات للطلاب والمدارس والمصححين والنتائج حسب المنطقة والمجموعة والصف والمزيد."
                : "Query examination data for students, schools, examiners, and results by region, cluster, grade, and more."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Main ─────────────────────────────────────── */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>

              {/* ── Controls row ── */}
              <div className="flex flex-col gap-4">
                {/* Row 1: tabs + group-by */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
                  <TabsList className="w-full md:w-auto h-auto flex-wrap gap-0.5 p-1">
                    {(Object.keys(groupOptions) as StatCategory[]).map(tab => {
                      const Icon = tabIcons[tab];
                      return (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="flex items-center gap-1.5 text-sm"
                          data-testid={`tab-${tab}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {isRTL ? tabLabels[tab].ar : tabLabels[tab].en}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Filter className="w-3.5 h-3.5" />
                      <span>{isRTL ? "تجميع حسب:" : "Group by:"}</span>
                    </div>
                    <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                      <SelectTrigger className="w-48" data-testid="select-group-by">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groupOptions[activeTab].map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {isRTL ? opt.labelAr : opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: contextual filters */}
                {(showExamYearFilter || showGradeFilter || showRegionFilter) && (
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-md border">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {isRTL ? "الفلاتر:" : "Filters:"}
                    </span>

                    {showExamYearFilter && examYears.length > 0 && (
                      <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-exam-year">
                          <SelectValue placeholder={isRTL ? "جميع السنوات" : "All Exam Years"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? "جميع السنوات" : "All Exam Years"}</SelectItem>
                          {examYears.map(y => (
                            <SelectItem key={y.id} value={y.id.toString()}>
                              {y.name}{y.status === "active" ? (isRTL ? " (نشط)" : " (Active)") : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {showGradeFilter && (
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-grade">
                          <SelectValue placeholder={isRTL ? "جميع الصفوف" : "All Grades"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? "جميع الصفوف" : "All Grades"}</SelectItem>
                          {[3, 6, 9, 12].map(g => (
                            <SelectItem key={g} value={g.toString()}>{GRADE_LABELS[g]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {showRegionFilter && regions && regions.length > 0 && (
                      <Select value={selectedRegion} onValueChange={handleRegionChange}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-region">
                          <SelectValue placeholder={isRTL ? "جميع المناطق" : "All Regions"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? "جميع المناطق" : "All Regions"}</SelectItem>
                          {regions.map((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {showClusterFilter && visibleClusters.length > 0 && (
                      <Select value={selectedCluster} onValueChange={setSelectedCluster}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-cluster">
                          <SelectValue placeholder={isRTL ? "جميع المجموعات" : "All Clusters"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? "جميع المجموعات" : "All Clusters"}</SelectItem>
                          {visibleClusters.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Active filter chips */}
                {activeFilters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeFilters.map((f, i) => (
                      <button
                        key={i}
                        onClick={f.clear}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 hover-elevate"
                        data-testid={`chip-filter-${i}`}
                      >
                        {f.label}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedRegion("all");
                        setSelectedCluster("all");
                        setSelectedExamYear("all");
                        setSelectedGrade("all");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs text-muted-foreground border border-border hover-elevate"
                      data-testid="button-clear-all-filters"
                    >
                      {isRTL ? "مسح الكل" : "Clear all"}
                    </button>
                  </div>
                )}
              </div>

              {/* Results-tab info banner */}
              {activeTab === "results" && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
                  <CheckSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {isRTL
                      ? `حد النجاح: 50٪. عرض الطلاب الذين حصلوا على نتيجة مقيّمة.${selectedExamYear === "all" && examYears.length > 0 ? " يُستخدم آخر سنة امتحان نشطة افتراضياً." : ""}`
                      : `Pass threshold: 50%. Showing students who received a graded result.${selectedExamYear === "all" && examYears.length > 0 ? " Using the most recent active exam year by default." : ""}`
                    }
                  </span>
                </div>
              )}

              {/* Tab content panels */}
              {(["students", "schools", "results", "examiners"] as StatCategory[]).map(tab => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  {renderContent()}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </section>

      {/* ── Data source note ─────────────────────────── */}
      <section className="py-10 bg-muted/40 border-t">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-sm">
                    {isRTL ? "ملاحظة حول مصادر البيانات" : "Data Source Note"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {isRTL
                      ? "جميع الإحصائيات مستمدة مباشرة من نظام إدارة امتحانات الأمانة وتعكس السجلات المؤكدة والمعتمدة. تتطلب بيانات الانتماء العرقي والفترة والمؤهلات التفصيلية تكاملاً مع نظام EMIS وستكون متاحة في تحديث مستقبلي."
                      : "All statistics are drawn directly from the Amaanah Examination Management System and reflect confirmed and approved records. Ethnicity, shift, and detailed qualification breakdowns require EMIS integration and will be available in a future update."}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {isRTL ? "الطلاب: التسجيلات المعتمدة فقط" : "Students: approved registrations only"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      {isRTL ? "النتائج: سجلات الامتحانات المقيّمة" : "Results: graded exam records"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      {isRTL ? "المدارس: المدارس المعتمدة النشطة" : "Schools: active approved schools"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
