import { useState, useMemo, useEffect, useRef } from "react";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  X,
  BarChart2,
  Layers,
  MapPin,
  Grid3x3,
  Lock,
  CheckSquare,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import logoPath from "@assets/Amana_Logo_1770390631299.jpeg";

// Brand colours
const GREEN  = "#006633";
const GREEN2 = "#009A44";
const RED    = "#CE1126";
const AMBER  = "#f59e0b";

const CHART_COLORS = [GREEN, GREEN2, AMBER, "#3B82F6", "#8B5CF6", RED, "#06B6D4", "#F97316"];

// ── Animated count-up ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const v = useCountUp(value);
  return <>{v.toLocaleString()}{suffix}</>;
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: GREEN }}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${GREEN}18` }}>
            <Icon className="w-5 h-5" style={{ color: GREEN }} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground"><AnimatedNumber value={value} /></p>
            <p className="text-sm font-medium text-foreground/80 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Gender bar ─────────────────────────────────────────────────────────────
function GenderBar({ male, female }: { male: number; female: number }) {
  const total = male + female;
  if (!total) return null;
  const malePct  = (male  / total) * 100;
  const femalePct = (female / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded-full overflow-hidden w-full">
        <div style={{ width: `${malePct}%`, background: GREEN }} />
        <div style={{ width: `${femalePct}%`, background: "#3B82F6" }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span style={{ color: GREEN }}>Male {malePct.toFixed(1)}%</span>
        <span style={{ color: "#3B82F6" }}>Female {femalePct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
type StatCategory = "students" | "schools" | "results" | "examiners";
type StudentGroupBy  = "region" | "cluster" | "school" | "grade" | "gender" | "examYear" | "status";
type SchoolGroupBy   = "region" | "cluster" | "type" | "status";
type ResultGroupBy   = "region" | "cluster" | "school" | "grade";
type ExaminerGroupBy = "region" | "cluster" | "status";
type GroupBy = StudentGroupBy | SchoolGroupBy | ResultGroupBy | ExaminerGroupBy;

interface StatResult {
  label: string; count: number; extra?: Record<string, any>;
}
interface StatsResponse {
  results: StatResult[];
  total: number;
  groupBy: string;
  category: string;
  availableInEmis: boolean;
  meta: {
    examYears?: { id: number; name: string; status: string }[];
    grades?: number[];
    isResultsMode?: boolean;
  };
}
interface NationalSummary {
  totalStudents: number; maleStudents: number; femaleStudents: number; gpi: number;
  totalSchools: number; activeSchools: number; totalExaminers: number;
  totalRegions: number; totalClusters: number; studentTeacherRatio: number;
  currentYear: { id: number; name: string; startDate: string } | null;
  schoolTypeBreakdown: { type: string; count: number }[];
  enrolmentTrend: { yearName: string; yearId: number; male: number; female: number; total: number }[];
  qaCompliance: {
    avgCompliancePct: number; inspectedThisYear: number; coveragePctThisYear: number;
    trend: "improving" | "stable" | "declining";
    fullyCompliant: number; partiallyCompliant: number; nonCompliant: number; totalInspected: number;
  };
  dataAsOf: string;
}

const GRADE_LABELS: Record<number, string> = { 3: "Grade 3 — LBS", 6: "Grade 6 — UBS", 9: "Grade 9 — BCS", 12: "Grade 12 — SSS" };
const SCHOOL_TYPE_LABELS: Record<string, string> = { LBS: "Lower Basic (LBS)", UBS: "Upper Basic (UBS)", BCS: "Basic Cycle (BCS)", SSS: "Senior Secondary (SSS)", other: "Other" };

// ── Main component ─────────────────────────────────────────────────────────
export default function Statistics() {
  const { isRTL } = useLanguage();

  // National summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery<NationalSummary>({
    queryKey: ["/api/public/national-summary"],
  });

  // Query tab state
  const [activeTab, setActiveTab] = useState<StatCategory>("students");
  const [groupBy, setGroupBy]     = useState<GroupBy>("region");
  const [selectedRegion, setSelectedRegion]   = useState("all");
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [selectedExamYear, setSelectedExamYear] = useState("all");
  const [selectedGrade, setSelectedGrade]     = useState("all");
  const [mainTab, setMainTab] = useState<"overview" | "qa" | "query">("overview");

  const { data: regions }  = useQuery<any[]>({ queryKey: ["/api/regions"] });
  const { data: clusters } = useQuery<any[]>({ queryKey: ["/api/clusters"] });

  const visibleClusters = useMemo(() => {
    if (!clusters) return [];
    if (selectedRegion === "all") return clusters;
    return clusters.filter((c: any) => c.regionId === parseInt(selectedRegion));
  }, [clusters, selectedRegion]);

  type GroupOption = { value: GroupBy; label: string };
  const groupOptions: Record<StatCategory, GroupOption[]> = {
    students:  [
      { value: "region", label: "By Region" }, { value: "cluster", label: "By Cluster" },
      { value: "school", label: "By School" }, { value: "grade", label: "By Grade" },
      { value: "gender", label: "By Gender" }, { value: "examYear", label: "By Exam Year" },
      { value: "status", label: "By Status" },
    ],
    schools:   [
      { value: "region", label: "By Region" }, { value: "cluster", label: "By Cluster" },
      { value: "type", label: "By School Type" }, { value: "status", label: "By Status" },
    ],
    results:   [
      { value: "region", label: "By Region" }, { value: "cluster", label: "By Cluster" },
      { value: "school", label: "By School" }, { value: "grade", label: "By Grade" },
    ],
    examiners: [
      { value: "region", label: "By Region" }, { value: "cluster", label: "By Cluster" },
      { value: "status", label: "By Status" },
    ],
  };

  const statisticsUrl = useMemo(() => {
    const params = new URLSearchParams({ category: activeTab, groupBy });
    if (selectedRegion   !== "all") params.set("regionId",   selectedRegion);
    if (selectedCluster  !== "all") params.set("clusterId",  selectedCluster);
    if (selectedExamYear !== "all") params.set("examYearId", selectedExamYear);
    if (selectedGrade    !== "all") params.set("grade",      selectedGrade);
    return `/api/public/statistics?${params.toString()}`;
  }, [activeTab, groupBy, selectedRegion, selectedCluster, selectedExamYear, selectedGrade]);

  const { data: statistics, isLoading: isQueryLoading } = useQuery<StatsResponse>({
    queryKey: [statisticsUrl],
    enabled: mainTab === "query",
  });

  const examYears = statistics?.meta?.examYears ?? [];

  const handleTabChange = (value: string) => {
    setActiveTab(value as StatCategory);
    setGroupBy("region");
    setSelectedRegion("all"); setSelectedCluster("all"); setSelectedGrade("all");
  };

  const exportCSV = () => {
    if (!statistics?.results?.length) return;
    const isRes = statistics.meta?.isResultsMode;
    const header = isRes ? ["Category", "Examined", "Passed", "Pass Rate"] : ["Category", "Count", "Percentage"];
    const rows = statistics.results.map(r => {
      const pct = statistics.total > 0 ? ((r.count / (isRes ? (r.extra?.total ?? r.count) : statistics.total)) * 100).toFixed(1) + "%" : "0%";
      return isRes ? [r.label, r.extra?.total ?? "", r.count, r.extra?.passRate ?? pct] : [r.label, r.count, pct];
    });
    const csv  = [header, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `amaanah-stats-${activeTab}-${groupBy}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const showRegionFilter   = ["cluster", "school"].includes(groupBy);
  const showClusterFilter  = groupBy === "school" && selectedRegion !== "all";
  const showGradeFilter    = (activeTab === "students" || activeTab === "results") && groupBy !== "grade";
  const showExamYearFilter = activeTab === "students" || activeTab === "results";

  const qa = summary?.qaCompliance;
  const TrendIcon = qa?.trend === "improving" ? TrendingUp : qa?.trend === "declining" ? TrendingDown : Minus;
  const trendColor = qa?.trend === "improving" ? GREEN : qa?.trend === "declining" ? RED : AMBER;
  const complianceColor = qa ? (qa.avgCompliancePct >= 80 ? GREEN : qa.avgCompliancePct >= 60 ? AMBER : RED) : GREEN;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <PublicLayout>
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div style={{ background: GREEN }} className="w-full">
        {/* thin red divider at top */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${RED}, transparent)` }} />
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: logo + name */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src={logoPath} alt="Amaanah" className="h-9 w-9 rounded-sm object-contain bg-white p-0.5" />
              <div>
                <p className="text-white font-bold leading-tight text-sm">أمانة</p>
                <p className="text-white/70 text-xs leading-tight">General Secretariat for Islamic & Arabic Education</p>
              </div>
            </div>
            {/* Centre: headline */}
            <div className="text-center">
              <h1 className="text-white font-bold text-xl md:text-2xl leading-tight">Education Statistics — The Gambia</h1>
              {summary?.currentYear && (
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold" style={{ background: GREEN2, color: "white" }}>
                  {summary.currentYear.name.replace(/^["'"\u201C\u201D]+/, "")}
                </span>
              )}
            </div>
            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href="/login" className="text-white/80 hover:text-white text-sm underline underline-offset-2">Sign In</a>
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${RED}, transparent)` }} />
      </div>

      {/* ── Tab navigation ──────────────────────────────────────────── */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {(["overview", "qa", "query"] as const).map(tab => {
              const labels: Record<string, string> = { overview: "Enrolment & Schools", qa: "Quality Assurance", query: "Data Query" };
              const icons: Record<string, React.ElementType> = { overview: BarChart3, qa: ShieldCheck, query: Filter };
              const Icon = icons[tab];
              const active = mainTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setMainTab(tab)}
                  data-testid={`tab-main-${tab}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={active
                    ? { background: GREEN, color: "white" }
                    : { background: "transparent", color: GREEN, border: `1px solid ${GREEN}` }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ── National KPI row (always visible) ───────────────────── */}
          {isSummaryLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
          ) : summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard icon={School}       label="Schools"       value={summary.totalSchools} />
              <KpiCard icon={GraduationCap} label="Students"     value={summary.totalStudents} />
              <KpiCard icon={Users}        label="Teaching Staff" value={summary.totalExaminers} />
              <KpiCard icon={MapPin}       label="Regions"       value={summary.totalRegions} />
              <KpiCard icon={Grid3x3}      label="Clusters"      value={summary.totalClusters} />
              <KpiCard icon={BarChart2}    label="Student:Teacher" value={summary.studentTeacherRatio} sub="ratio" />
            </div>
          )}

          {/* ══ OVERVIEW TAB ══════════════════════════════════════════ */}
          {mainTab === "overview" && summary && (
            <div className="space-y-6">

              {/* Enrolment sub-KPIs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" style={{ color: GREEN }} />
                    Enrolment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: GREEN }}>{summary.totalStudents.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total Enrolled</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: GREEN }}>{summary.maleStudents.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Male</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{summary.femaleStudents.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Female</p>
                    </div>
                    <div className="text-center">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-lg font-bold"
                        style={{
                          background: summary.gpi >= 0.95 ? `${GREEN}18` : summary.gpi >= 0.80 ? `${AMBER}18` : `${RED}18`,
                          color: summary.gpi >= 0.95 ? GREEN : summary.gpi >= 0.80 ? AMBER : RED,
                        }}
                      >
                        {summary.gpi.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">GPI</p>
                    </div>
                  </div>
                  <GenderBar male={summary.maleStudents} female={summary.femaleStudents} />
                </CardContent>
              </Card>

              {/* Enrolment trend chart */}
              {summary.enrolmentTrend.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" style={{ color: GREEN }} />
                      Enrolment Trend by Academic Year
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={summary.enrolmentTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="yearName" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(val: any, name: string) => [val.toLocaleString(), name === "male" ? "Male" : name === "female" ? "Female" : "Total"]} />
                        <Legend />
                        <Line type="monotone" dataKey="male"   name="Male"   stroke={GREEN}     strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="female" name="Female" stroke="#3B82F6"   strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="total"  name="Total"  stroke={AMBER}     strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Schools by type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <School className="w-4 h-4" style={{ color: GREEN }} />
                      Schools by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.schoolTypeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={summary.schoolTypeBreakdown} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70} label={({ type, percent }) => `${SCHOOL_TYPE_LABELS[type] || type} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {summary.schoolTypeBreakdown.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any, name: string) => [val.toLocaleString(), SCHOOL_TYPE_LABELS[name] || name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                    )}
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                      {summary.schoolTypeBreakdown.map((item, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {SCHOOL_TYPE_LABELS[item.type] || item.type}: {item.count.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: GREEN }} />
                      Teaching Staff
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold" style={{ color: GREEN }}>{summary.totalExaminers.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Teaching Staff</p>
                    </div>
                    <div className="p-3 rounded-md border bg-muted/30">
                      <p className="text-sm font-medium mb-1">Student : Teacher Ratio</p>
                      <p className="text-2xl font-bold" style={{ color: GREEN }}>{summary.studentTeacherRatio} : 1</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary.totalStudents.toLocaleString()} students ÷ {summary.totalExaminers.toLocaleString()} staff
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Teacher data is aggregate only. Individual qualifications and assignments are available via data request.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ══ QA TAB ════════════════════════════════════════════════ */}
          {mainTab === "qa" && (
            <div className="space-y-6">
              {isSummaryLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
              ) : qa && (
                <>
                  {/* 3 large stat cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Compliance rate */}
                    <Card>
                      <CardContent className="pt-6 pb-5 text-center">
                        <p className="text-5xl font-extrabold" style={{ color: complianceColor }}>{qa.avgCompliancePct}%</p>
                        <p className="text-sm font-semibold mt-2 text-foreground">National Compliance Rate</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Network Average</p>
                      </CardContent>
                    </Card>

                    {/* Schools inspected */}
                    <Card>
                      <CardContent className="pt-6 pb-5 text-center">
                        <p className="text-4xl font-extrabold" style={{ color: GREEN }}>
                          {qa.inspectedThisYear} <span className="text-2xl text-muted-foreground">of</span> {summary?.totalSchools ?? 0}
                        </p>
                        <p className="text-sm font-semibold mt-2 text-foreground">Schools with Multi-Grade Programmes</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Coverage — Current Academic Year ({qa.coveragePctThisYear}%)</p>
                      </CardContent>
                    </Card>

                    {/* Trend */}
                    <Card>
                      <CardContent className="pt-6 pb-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <TrendIcon className="w-10 h-10" style={{ color: trendColor }} />
                          <p className="text-3xl font-extrabold capitalize" style={{ color: trendColor }}>{qa.trend}</p>
                        </div>
                        <p className="text-sm font-semibold mt-2 text-foreground">Year-on-Year Direction</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Trend Direction</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Compliance distribution stacked bar */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4" style={{ color: GREEN }} />
                        Compliance Distribution — National
                      </CardTitle>
                      <CardDescription>All approved schools — current academic year</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Stacked bar */}
                      <div className="w-full h-8 rounded-full overflow-hidden flex">
                        {(() => {
                          const total = qa.fullyCompliant + qa.partiallyCompliant + qa.nonCompliant;
                          if (!total) return null;
                          return (
                            <>
                              <div title="Fully Compliant" style={{ width: `${(qa.fullyCompliant / total) * 100}%`, background: GREEN }} className="flex items-center justify-center text-white text-xs font-semibold overflow-hidden whitespace-nowrap px-1">
                                {qa.fullyCompliant > 0 && `${Math.round((qa.fullyCompliant / total) * 100)}%`}
                              </div>
                              <div title="Partially Compliant" style={{ width: `${(qa.partiallyCompliant / total) * 100}%`, background: AMBER }} className="flex items-center justify-center text-white text-xs font-semibold overflow-hidden whitespace-nowrap px-1">
                                {qa.partiallyCompliant > 0 && `${Math.round((qa.partiallyCompliant / total) * 100)}%`}
                              </div>
                              <div title="Non-Compliant" style={{ width: `${(qa.nonCompliant / total) * 100}%`, background: RED }} className="flex items-center justify-center text-white text-xs font-semibold overflow-hidden whitespace-nowrap px-1">
                                {qa.nonCompliant > 0 && `${Math.round((qa.nonCompliant / total) * 100)}%`}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Three count cards */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Fully Compliant",    count: qa.fullyCompliant,      color: GREEN },
                          { label: "Partially Compliant", count: qa.partiallyCompliant, color: AMBER },
                          { label: "Non-Compliant",       count: qa.nonCompliant,        color: RED   },
                        ].map(({ label, count, color }) => (
                          <div key={label} className="p-3 rounded-md border text-center" style={{ borderColor: `${color}40` }}>
                            <p className="text-2xl font-bold" style={{ color }}>{count.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gated teaser */}
                  <div className="relative rounded-lg overflow-hidden border">
                    {/* Blurred fake content behind overlay */}
                    <div className="filter blur-sm pointer-events-none select-none" aria-hidden>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead className="text-right">Schools Inspected</TableHead>
                            <TableHead className="text-right">Compliance Score</TableHead>
                            <TableHead className="text-right">Trend</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[["Region A", "24 / 30", "87%", "↑"], ["Region B", "18 / 22", "74%", "→"], ["Region C", "11 / 19", "58%", "↓"], ["Region D", "29 / 31", "92%", "↑"]].map(([r, s, c, t], i) => (
                            <TableRow key={i}>
                              <TableCell>{r}</TableCell>
                              <TableCell className="text-right">{s}</TableCell>
                              <TableCell className="text-right">{c}</TableCell>
                              <TableCell className="text-right">{t}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="text-center p-6 max-w-sm">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${GREEN}18` }}>
                          <Lock className="w-6 h-6" style={{ color: GREEN }} />
                        </div>
                        <h3 className="font-bold text-foreground text-lg mb-1">Regional &amp; School-Level Detail</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Regional compliance rankings, school-level QA scores, per-term data, and inspection findings are available to approved researchers, policy bodies, and donors.
                        </p>
                        <a href="/login">
                          <Button style={{ background: GREEN, color: "white" }}>
                            <Lock className="w-4 h-4 me-2" />
                            Request Data Access
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ QUERY TAB ═════════════════════════════════════════════ */}
          {mainTab === "query" && (
            <div className="space-y-4">
              {/* Tab selector */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-1.5">
                      {(["students", "schools", "results", "examiners"] as StatCategory[]).map(tab => {
                        const labels: Record<string, string> = { students: "Students", schools: "Schools", results: "Results", examiners: "Examiners" };
                        const icons: Record<string, React.ElementType> = { students: GraduationCap, schools: School, results: BarChart2, examiners: Users };
                        const Icon = icons[tab];
                        const active = activeTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            data-testid={`tab-${tab}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                            style={active
                              ? { background: GREEN, color: "white", borderColor: GREEN }
                              : { background: "transparent", color: GREEN, borderColor: GREEN }
                            }
                          >
                            <Icon className="w-3 h-3" />
                            {labels[tab]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Group by:</span>
                      <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                        <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-group-by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {groupOptions[activeTab].map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contextual filters */}
                  {(showExamYearFilter || showGradeFilter || showRegionFilter) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                      {showExamYearFilter && examYears.length > 0 && (
                        <Select value={selectedExamYear} onValueChange={setSelectedExamYear}>
                          <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-exam-year">
                            <SelectValue placeholder="All Exam Years" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Exam Years</SelectItem>
                            {examYears.map(y => (
                              <SelectItem key={y.id} value={y.id.toString()}>{y.name}{y.status === "active" ? " (Active)" : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {showGradeFilter && (
                        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                          <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-grade">
                            <SelectValue placeholder="All Grades" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Grades</SelectItem>
                            {[3, 6, 9, 12].map(g => <SelectItem key={g} value={g.toString()}>{GRADE_LABELS[g]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {showRegionFilter && regions && (
                        <Select value={selectedRegion} onValueChange={(v) => { setSelectedRegion(v); setSelectedCluster("all"); }}>
                          <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-region">
                            <SelectValue placeholder="All Regions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            {regions.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {showClusterFilter && visibleClusters.length > 0 && (
                        <Select value={selectedCluster} onValueChange={setSelectedCluster}>
                          <SelectTrigger className="w-44 h-8 text-xs" data-testid="select-cluster">
                            <SelectValue placeholder="All Clusters" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Clusters</SelectItem>
                            {visibleClusters.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {(selectedExamYear !== "all" || selectedGrade !== "all" || selectedRegion !== "all" || selectedCluster !== "all") && (
                        <button
                          onClick={() => { setSelectedExamYear("all"); setSelectedGrade("all"); setSelectedRegion("all"); setSelectedCluster("all"); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground hover-elevate"
                        >
                          <X className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              {isQueryLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
              ) : !statistics?.results?.length ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No data matches the selected filters.</p>
                  </CardContent>
                </Card>
              ) : (() => {
                const isRes = statistics.meta?.isResultsMode;
                const maxCount = Math.max(...statistics.results.map(r => isRes ? (r.extra?.total ?? r.count) : r.count));
                const totalPassed = isRes ? statistics.results.reduce((s, r) => s + r.count, 0) : 0;
                const totalExam   = isRes ? statistics.results.reduce((s, r) => s + (r.extra?.total ?? 0), 0) : 0;

                return (
                  <div className="space-y-4">
                    {/* KPI strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: isRes ? "Examined" : "Total", value: statistics.total },
                        { label: "Categories", value: statistics.results.length },
                        { label: "Highest", value: Math.max(...statistics.results.map(r => isRes ? (r.extra?.total ?? 0) : r.count)) },
                        { label: isRes ? "Pass Rate" : "Average",
                          value: isRes
                            ? (totalExam > 0 ? ((totalPassed / totalExam) * 100).toFixed(1) + "%" : "–")
                            : (statistics.results.length > 0 ? Math.round(statistics.total / statistics.results.length).toLocaleString() : "–")
                        },
                      ].map(({ label, value }) => (
                        <Card key={label}>
                          <CardContent className="pt-4 pb-3">
                            <p className="text-xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Table */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-base">Detailed Results</CardTitle>
                          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
                            <Download className="w-4 h-4 me-1.5" /> Export CSV
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8 text-muted-foreground font-normal">#</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">{isRes ? "Examined" : "Count"}</TableHead>
                                {isRes && <TableHead className="text-right">Passed</TableHead>}
                                <TableHead className="text-right">{isRes ? "Pass Rate" : "Share %"}</TableHead>
                                <TableHead className="hidden md:table-cell w-40">Distribution</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {statistics.results.map((result, i) => {
                                const rowTotal = isRes ? (result.extra?.total ?? 0) : result.count;
                                const barWidth = maxCount > 0 ? (rowTotal / maxCount) * 100 : 0;
                                const pct = isRes
                                  ? (result.extra?.passRate ?? "–")
                                  : statistics.total > 0 ? ((result.count / statistics.total) * 100).toFixed(1) + "%" : "0%";
                                const pctNum = parseFloat(String(pct));
                                return (
                                  <TableRow key={i} data-testid={`row-stat-${i}`}>
                                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                    <TableCell className="font-medium">{result.label}</TableCell>
                                    <TableCell className="text-right tabular-nums">{rowTotal.toLocaleString()}</TableCell>
                                    {isRes && <TableCell className="text-right tabular-nums">{result.count.toLocaleString()}</TableCell>}
                                    <TableCell className="text-right">
                                      <span className="text-sm font-medium" style={{
                                        color: isRes ? (pctNum >= 75 ? GREEN : pctNum >= 50 ? AMBER : RED) : undefined
                                      }}>{pct}</span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      <div className="w-full bg-muted rounded-full h-2">
                                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, background: GREEN }} />
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
              })()}
            </div>
          )}

          {/* ── Footer strip ────────────────────────────────────────── */}
          {summary && (
            <div className="rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-3" style={{ background: GREEN }}>
              <div className="flex items-center gap-2">
                <img src={logoPath} alt="Amaanah" className="h-6 w-6 rounded-sm object-contain bg-white p-0.5" />
                <span className="text-white/90 text-xs">General Secretariat for Islamic &amp; Arabic Education, Republic of The Gambia</span>
              </div>
              <p className="text-white/70 text-xs">Data last updated: {formatDate(summary.dataAsOf)}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs border-white/30 text-white hover:bg-white/10">
                  <Download className="w-3.5 h-3.5 me-1" /> Download CSV
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
