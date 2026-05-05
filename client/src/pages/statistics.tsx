import { useState, useMemo, useEffect, useRef } from "react";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2,
  X,
  BarChart2,
  MapPin,
  Grid3x3,
  Lock,
  ShieldCheck,
  Activity,
  Search,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import logoPath from "@assets/Amana_Logo_1770390631299.jpeg";

const GREEN  = "#006633";
const GREEN2 = "#009A44";
const RED    = "#CE1126";
const AMBER  = "#f59e0b";
const CHART_COLORS = [GREEN, GREEN2, AMBER, "#3B82F6", "#8B5CF6", RED, "#06B6D4", "#F97316"];

// ── Animated count-up ───────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

function AnimatedNumber({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: GREEN }}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${GREEN}18` }}>
            <Icon className="w-4 h-4" style={{ color: GREEN }} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-foreground"><AnimatedNumber value={value} /></p>
            <p className="text-xs font-medium text-foreground/80">{label}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GenderBar({ male, female }: { male: number; female: number }) {
  const total = male + female;
  if (!total) return null;
  const mp = (male / total) * 100, fp = (female / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex h-2.5 rounded-full overflow-hidden w-full">
        <div style={{ width: `${mp}%`, background: GREEN }} />
        <div style={{ width: `${fp}%`, background: "#3B82F6" }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span style={{ color: GREEN }}>Male {mp.toFixed(1)}%</span>
        <span style={{ color: "#3B82F6" }}>Female {fp.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ── Types ───────────────────────────────────────────────────────────────────
type StatCategory = "students" | "schools" | "results" | "examiners";
type GroupBy = "region" | "cluster" | "school" | "grade" | "gender" | "examYear" | "status" | "type";

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
  currentYear: { id: number; name: string } | null;
  schoolTypeBreakdown: { type: string; count: number }[];
  enrolmentTrend: { yearName: string; yearId: number; male: number; female: number; total: number }[];
  qaCompliance: {
    avgCompliancePct: number; inspectedThisYear: number; coveragePctThisYear: number;
    trend: "improving" | "stable" | "declining";
    fullyCompliant: number; partiallyCompliant: number; nonCompliant: number; totalInspected: number;
  };
  dataAsOf: string;
}
interface ExamYear { id: number; name: string; isActive: boolean; }
interface Region    { id: number; name: string; }
interface Cluster   { id: number; name: string; regionId: number; }

const GRADE_LABELS: Record<number, string> = { 3: "Grade 3 — LBS", 6: "Grade 6 — UBS", 9: "Grade 9 — BCS", 12: "Grade 12 — SSS" };
const SCHOOL_TYPE_LABELS: Record<string, string> = { LBS: "Lower Basic (LBS)", UBS: "Upper Basic (UBS)", BCS: "Basic Cycle (BCS)", SSS: "Senior Secondary (SSS)", other: "Other" };

const CAT_LABELS: Record<StatCategory, string> = { students: "Students", schools: "Schools", results: "Exam Results", examiners: "Teaching Staff" };
const CAT_ICONS: Record<StatCategory, React.ElementType> = { students: GraduationCap, schools: School, results: BarChart2, examiners: Users };

const GROUP_OPTIONS: Record<StatCategory, { value: GroupBy; label: string }[]> = {
  students:  [
    { value: "region",   label: "Nationwide — by Region" },
    { value: "cluster",  label: "By Cluster" },
    { value: "school",   label: "By School" },
    { value: "grade",    label: "By Grade" },
    { value: "gender",   label: "By Gender" },
    { value: "examYear", label: "By Academic Year" },
  ],
  schools:   [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
    { value: "type",    label: "By School Type" },
  ],
  results:   [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
    { value: "school",  label: "By School" },
    { value: "grade",   label: "By Grade" },
  ],
  examiners: [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
  ],
};

// ── CSV export ─────────────────────────────────────────────────────────────
function exportToCsv(
  results: StatResult[],
  total: number,
  category: StatCategory,
  groupBy: GroupBy,
  isResultsMode: boolean,
  filters: { year?: string; region?: string; cluster?: string; grade?: string; school?: string }
) {
  if (!results.length) return;

  const metaLines = [
    `"Amaanah Education Statistics Export"`,
    `"Category","${CAT_LABELS[category]}"`,
    `"Breakdown","${GROUP_OPTIONS[category].find(o => o.value === groupBy)?.label ?? groupBy}"`,
    filters.year    ? `"Academic Year","${filters.year}"`    : null,
    filters.region  ? `"Region","${filters.region}"`         : null,
    filters.cluster ? `"Cluster","${filters.cluster}"`       : null,
    filters.grade   ? `"Grade","${filters.grade}"`           : null,
    filters.school  ? `"School Search","${filters.school}"`  : null,
    `"Total","${total.toLocaleString()}"`,
    `"Generated","${new Date().toLocaleString()}"`,
    ``,
  ].filter(l => l !== null);

  const bySchool = groupBy === "school";
  const headers = isResultsMode
    ? bySchool
      ? ["#", "School", "Region", "Cluster", "Type", "Examined", "Passed", "Pass Rate"]
      : ["#", "Category", "Examined", "Passed", "Pass Rate"]
    : bySchool
      ? ["#", "School", "Region", "Cluster", "Type", "Count", "Share %"]
      : ["#", "Category", "Count", "Share %"];

  const rows = results.map((r, i) => {
    const shareNum  = total > 0 ? ((isResultsMode ? (r.extra?.total ?? r.count) : r.count) / (isResultsMode ? (results.reduce((s, x) => s + (x.extra?.total ?? 0), 0) || 1) : total) * 100) : 0;
    const share = shareNum.toFixed(1) + "%";
    const safeLabel = `"${(r.label || "").replace(/"/g, '""')}"`;

    if (isResultsMode && bySchool) return [i + 1, safeLabel, `"${r.extra?.region ?? ""}"`, `"${r.extra?.cluster ?? ""}"`, `"${r.extra?.schoolType ?? ""}"`, r.extra?.total ?? 0, r.count, r.extra?.passRate ?? "–"];
    if (isResultsMode) return [i + 1, safeLabel, r.extra?.total ?? 0, r.count, r.extra?.passRate ?? "–"];
    if (bySchool) return [i + 1, safeLabel, `"${r.extra?.region ?? ""}"`, `"${r.extra?.cluster ?? ""}"`, `"${r.extra?.schoolType ?? ""}"`, r.count, share];
    return [i + 1, safeLabel, r.count, share];
  });

  const csv = [...metaLines, headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv, { type: "text/csv;charset=utf-8;" }] as any, { type: "text/csv;charset=utf-8;" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `amaanah-${category}-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Progress bar mini ───────────────────────────────────────────────────────
function MiniBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="w-24 bg-muted rounded-full h-1.5 flex-shrink-0">
      <div className="h-1.5 rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: GREEN }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Statistics() {
  const { isRTL } = useLanguage();

  // National summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery<NationalSummary>({
    queryKey: ["/api/public/national-summary"],
  });

  // Exam years — loaded independently so filters are always available
  const { data: examYearsData } = useQuery<ExamYear[]>({
    queryKey: ["/api/public/exam-years"],
  });

  const { data: regions }  = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });

  // Main nav tab
  const [mainTab, setMainTab] = useState<"overview" | "qa" | "query">("overview");

  // Data Query state
  const [category,       setCategory]       = useState<StatCategory>("students");
  const [groupBy,        setGroupBy]        = useState<GroupBy>("region");
  const [selectedYear,   setSelectedYear]   = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCluster,setSelectedCluster]= useState("all");
  const [selectedGrade,  setSelectedGrade]  = useState("all");
  const [schoolSearch,   setSchoolSearch]   = useState("");
  const [schoolSearchInput, setSchoolSearchInput] = useState("");

  const visibleClusters = useMemo(() => {
    if (!clusters) return [];
    if (selectedRegion === "all") return clusters;
    return clusters.filter(c => c.regionId === parseInt(selectedRegion));
  }, [clusters, selectedRegion]);

  const activeYear = examYearsData?.find(y => y.isActive) ?? examYearsData?.[0];

  const handleCategoryChange = (cat: StatCategory) => {
    setCategory(cat);
    const opts = GROUP_OPTIONS[cat];
    setGroupBy(opts[0].value);
    setSchoolSearch(""); setSchoolSearchInput("");
  };

  const handleGroupByChange = (gb: GroupBy) => {
    setGroupBy(gb);
    if (gb !== "school") { setSchoolSearch(""); setSchoolSearchInput(""); }
  };

  const handleRegionChange = (rid: string) => {
    setSelectedRegion(rid);
    setSelectedCluster("all");
  };

  const queryUrl = useMemo(() => {
    const p = new URLSearchParams({ category, groupBy });
    if (selectedYear    !== "all") p.set("examYearId", selectedYear);
    if (selectedRegion  !== "all") p.set("regionId",   selectedRegion);
    if (selectedCluster !== "all") p.set("clusterId",  selectedCluster);
    if (selectedGrade   !== "all") p.set("grade",      selectedGrade);
    if (schoolSearch)               p.set("schoolName", schoolSearch);
    return `/api/public/statistics?${p.toString()}`;
  }, [category, groupBy, selectedYear, selectedRegion, selectedCluster, selectedGrade, schoolSearch]);

  const { data: stats, isLoading: isStatsLoading, isFetching } = useQuery<StatsResponse>({
    queryKey: [queryUrl],
    enabled: mainTab === "query",
  });

  const examYears = stats?.meta?.examYears ?? examYearsData?.map(y => ({ id: y.id, name: y.name, status: y.isActive ? "active" : "" })) ?? [];

  const hasFilters = selectedYear !== "all" || selectedRegion !== "all" || selectedCluster !== "all" || selectedGrade !== "all" || !!schoolSearch;

  const clearFilters = () => {
    setSelectedYear("all"); setSelectedRegion("all"); setSelectedCluster("all");
    setSelectedGrade("all"); setSchoolSearch(""); setSchoolSearchInput("");
  };

  // QA
  const qa = summary?.qaCompliance;
  const TrendIcon = qa?.trend === "improving" ? TrendingUp : qa?.trend === "declining" ? TrendingDown : Minus;
  const trendColor = qa?.trend === "improving" ? GREEN : qa?.trend === "declining" ? RED : AMBER;
  const complianceColor = qa ? (qa.avgCompliancePct >= 80 ? GREEN : qa.avgCompliancePct >= 60 ? AMBER : RED) : GREEN;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const isRes = !!stats?.meta?.isResultsMode;
  const maxVal = stats?.results?.length
    ? Math.max(...stats.results.map(r => isRes ? (r.extra?.total ?? r.count) : r.count))
    : 1;

  const regionName  = regions?.find(r => r.id.toString() === selectedRegion)?.name;
  const clusterName = clusters?.find(c => c.id.toString() === selectedCluster)?.name;
  const yearName    = examYears.find(y => y.id.toString() === selectedYear)?.name;
  const gradeName   = selectedGrade !== "all" ? GRADE_LABELS[parseInt(selectedGrade)] : undefined;

  const handleExport = () => {
    if (!stats?.results?.length) return;
    exportToCsv(stats.results, stats.total, category, groupBy, isRes, {
      year:    yearName,
      region:  regionName,
      cluster: clusterName,
      grade:   gradeName,
      school:  schoolSearch || undefined,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PublicLayout>

      {/* ── Dark-green hero ───────────────────────────────────────── */}
      <div style={{ background: GREEN }} className="w-full">
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${RED} 0%, ${RED}00 100%)` }} />
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src={logoPath} alt="Amaanah" className="h-9 w-9 rounded-sm object-contain bg-white p-0.5" />
              <div>
                <p className="text-white font-bold leading-tight text-sm">أمانة</p>
                <p className="text-white/70 text-xs leading-tight">General Secretariat for Islamic &amp; Arabic Education</p>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-white font-bold text-xl md:text-2xl leading-tight">Education Statistics — The Gambia</h1>
              {summary?.currentYear && (
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold" style={{ background: GREEN2, color: "white" }}>
                  {summary.currentYear.name.replace(/^["'"\u201C\u201D]+/, "")}
                </span>
              )}
            </div>
            <a href="/login" className="text-white/80 hover:text-white text-sm underline underline-offset-2 flex-shrink-0">Sign In</a>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${RED} 0%, ${RED}00 100%)` }} />
      </div>

      {/* ── Sticky tab nav ────────────────────────────────────────── */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-1.5 py-2 overflow-x-auto no-scrollbar">
            {(["overview", "qa", "query"] as const).map(tab => {
              const labels = { overview: "Enrolment & Schools", qa: "Quality Assurance", query: "Data Query" };
              const icons  = { overview: BarChart3, qa: ShieldCheck, query: Filter };
              const Icon   = icons[tab];
              const active = mainTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setMainTab(tab)}
                  data-testid={`tab-main-${tab}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
                  style={active
                    ? { background: GREEN, color: "white" }
                    : { background: "transparent", color: GREEN, border: `1px solid ${GREEN}` }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />{labels[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── National KPI strip (always shown) ─────────────────── */}
          {isSummaryLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
          ) : summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard icon={School}        label="Schools"         value={summary.totalSchools} />
              <KpiCard icon={GraduationCap} label="Students"        value={summary.totalStudents} />
              <KpiCard icon={Users}         label="Teaching Staff"  value={summary.totalExaminers} />
              <KpiCard icon={MapPin}        label="Regions"         value={summary.totalRegions} />
              <KpiCard icon={Grid3x3}       label="Clusters"        value={summary.totalClusters} />
              <KpiCard icon={BarChart2}     label="Student:Teacher" value={summary.studentTeacherRatio} sub="ratio" />
            </div>
          )}

          {/* ══ OVERVIEW TAB ════════════════════════════════════════ */}
          {mainTab === "overview" && summary && (
            <div className="space-y-5">
              {/* Enrolment card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" style={{ color: GREEN }} /> Enrolment Summary
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
                      <span className="inline-block px-3 py-1 rounded-full text-lg font-bold"
                        style={{ background: summary.gpi >= 0.95 ? `${GREEN}18` : summary.gpi >= 0.80 ? `${AMBER}18` : `${RED}18`, color: summary.gpi >= 0.95 ? GREEN : summary.gpi >= 0.80 ? AMBER : RED }}>
                        {summary.gpi.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">GPI</p>
                    </div>
                  </div>
                  <GenderBar male={summary.maleStudents} female={summary.femaleStudents} />
                </CardContent>
              </Card>

              {/* Enrolment trend */}
              {summary.enrolmentTrend.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" style={{ color: GREEN }} /> Enrolment Trend by Academic Year
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={summary.enrolmentTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="yearName" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any, n: string) => [Number(v).toLocaleString(), n === "male" ? "Male" : n === "female" ? "Female" : "Total"]} />
                        <Legend />
                        <Line type="monotone" dataKey="male"   name="Male"   stroke={GREEN}   strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="female" name="Female" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="total"  name="Total"  stroke={AMBER}   strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Schools + Staff row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <School className="w-4 h-4" style={{ color: GREEN }} /> Schools by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.schoolTypeBreakdown.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={summary.schoolTypeBreakdown} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={65} innerRadius={28}>
                              {summary.schoolTypeBreakdown.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any, n: string) => [Number(v).toLocaleString(), SCHOOL_TYPE_LABELS[n] || n]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 justify-center mt-1">
                          {summary.schoolTypeBreakdown.map((item, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              {SCHOOL_TYPE_LABELS[item.type] || item.type}: {item.count}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : <p className="text-muted-foreground text-sm text-center py-8">No data available</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: GREEN }} /> Teaching Staff Overview
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
                      <p className="text-xs text-muted-foreground mt-1">{summary.totalStudents.toLocaleString()} students ÷ {summary.totalExaminers.toLocaleString()} staff</p>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Individual staff assignments available via authenticated data request.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ══ QA TAB ══════════════════════════════════════════════ */}
          {mainTab === "qa" && (
            <div className="space-y-5">
              {isSummaryLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
              ) : qa && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6 pb-5 text-center">
                        <p className="text-5xl font-extrabold" style={{ color: complianceColor }}>{qa.avgCompliancePct}%</p>
                        <p className="text-sm font-semibold mt-2">National Compliance Rate</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Network Average</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 pb-5 text-center">
                        <p className="text-3xl font-extrabold" style={{ color: GREEN }}>
                          {qa.inspectedThisYear} <span className="text-xl text-muted-foreground">of</span> {summary?.totalSchools ?? 0}
                        </p>
                        <p className="text-sm font-semibold mt-2">Schools with Multi-Grade Programmes</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Coverage {qa.coveragePctThisYear}% — Current Year</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 pb-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <TrendIcon className="w-9 h-9" style={{ color: trendColor }} />
                          <p className="text-3xl font-extrabold capitalize" style={{ color: trendColor }}>{qa.trend}</p>
                        </div>
                        <p className="text-sm font-semibold mt-2">Year-on-Year Direction</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Trend</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4" style={{ color: GREEN }} /> Compliance Distribution
                      </CardTitle>
                      <CardDescription>All approved schools — current academic year</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="w-full h-7 rounded-full overflow-hidden flex">
                        {(() => {
                          const t = qa.fullyCompliant + qa.partiallyCompliant + qa.nonCompliant;
                          if (!t) return null;
                          return (
                            <>
                              <div style={{ width: `${(qa.fullyCompliant / t) * 100}%`, background: GREEN }} className="flex items-center justify-center text-white text-xs font-semibold">{Math.round((qa.fullyCompliant / t) * 100)}%</div>
                              <div style={{ width: `${(qa.partiallyCompliant / t) * 100}%`, background: AMBER }} className="flex items-center justify-center text-white text-xs font-semibold">{Math.round((qa.partiallyCompliant / t) * 100)}%</div>
                              <div style={{ width: `${(qa.nonCompliant / t) * 100}%`, background: RED }} className="flex items-center justify-center text-white text-xs font-semibold">{Math.round((qa.nonCompliant / t) * 100)}%</div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Fully Compliant",    count: qa.fullyCompliant,    color: GREEN },
                          { label: "Partially Compliant",count: qa.partiallyCompliant,color: AMBER },
                          { label: "Non-Compliant",       count: qa.nonCompliant,      color: RED   },
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
                            <TableRow key={i}><TableCell>{r}</TableCell><TableCell className="text-right">{s}</TableCell><TableCell className="text-right">{c}</TableCell><TableCell className="text-right">{t}</TableCell></TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="text-center p-6 max-w-sm">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${GREEN}18` }}>
                          <Lock className="w-6 h-6" style={{ color: GREEN }} />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Regional &amp; School-Level Detail</h3>
                        <p className="text-sm text-muted-foreground mb-4">Regional compliance rankings, school-level QA scores, and inspection findings are available to approved researchers and policy bodies.</p>
                        <a href="/login">
                          <Button style={{ background: GREEN, color: "white" }}>
                            <Lock className="w-4 h-4 me-2" /> Request Data Access
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ DATA QUERY TAB ═══════════════════════════════════════ */}
          {mainTab === "query" && (
            <div className="space-y-4">

              {/* ── Filter panel ────────────────────────────────── */}
              <Card>
                <CardContent className="p-4 space-y-4">

                  {/* Row 1: Category selector */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data Category</p>
                    <div className="flex flex-wrap gap-2">
                      {(["students", "schools", "results", "examiners"] as StatCategory[]).map(cat => {
                        const Icon = CAT_ICONS[cat];
                        const active = category === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            data-testid={`tab-${cat}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
                            style={active
                              ? { background: GREEN, color: "white", borderColor: GREEN }
                              : { background: "transparent", color: GREEN, borderColor: GREEN }
                            }
                          >
                            <Icon className="w-3.5 h-3.5" />{CAT_LABELS[cat]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 2: Breakdown + filters row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                    {/* Breakdown / groupBy */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breakdown</label>
                      <Select value={groupBy} onValueChange={v => handleGroupByChange(v as GroupBy)}>
                        <SelectTrigger data-testid="select-group-by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GROUP_OPTIONS[category].map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Academic Year */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Academic Year</label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger data-testid="select-exam-year">
                          <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Academic Years</SelectItem>
                          {examYears.map(y => (
                            <SelectItem key={y.id} value={y.id.toString()}>
                              {y.name.replace(/^["'"\u201C\u201D]+/, "")}{y.status === "active" ? " (Active)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Region */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region</label>
                      <Select value={selectedRegion} onValueChange={handleRegionChange}>
                        <SelectTrigger data-testid="select-region">
                          <SelectValue placeholder="All Regions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Regions</SelectItem>
                          {regions?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cluster */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cluster</label>
                      <Select value={selectedCluster} onValueChange={setSelectedCluster} disabled={visibleClusters.length === 0}>
                        <SelectTrigger data-testid="select-cluster">
                          <SelectValue placeholder="All Clusters" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Clusters</SelectItem>
                          {visibleClusters.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 3: Grade + School search (contextual) */}
                  <div className="flex flex-wrap items-end gap-3">
                    {(category === "students" || category === "results") && groupBy !== "grade" && (
                      <div className="space-y-1 w-48">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</label>
                        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                          <SelectTrigger data-testid="select-grade">
                            <SelectValue placeholder="All Grades" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Grades</SelectItem>
                            {[3, 6, 9, 12].map(g => <SelectItem key={g} value={g.toString()}>{GRADE_LABELS[g]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {groupBy === "school" && (
                      <div className="space-y-1 flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search School Name</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              value={schoolSearchInput}
                              onChange={e => setSchoolSearchInput(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") setSchoolSearch(schoolSearchInput); }}
                              placeholder="Type school name and press Enter…"
                              className="pl-8"
                              data-testid="input-school-search"
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setSchoolSearch(schoolSearchInput)}
                            data-testid="button-school-search"
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                          {schoolSearch && (
                            <Button
                              variant="ghost"
                              onClick={() => { setSchoolSearch(""); setSchoolSearchInput(""); }}
                              data-testid="button-clear-school-search"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Clear & active filter chips */}
                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                      {hasFilters && (
                        <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover-elevate border">
                          <X className="w-3 h-3" /> Clear all filters
                        </button>
                      )}
                      {isFetching && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Active filter badges */}
                  {hasFilters && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                      {yearName    && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>Year: {yearName.replace(/^["'"\u201C\u201D]+/, "")}</span>}
                      {regionName  && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>Region: {regionName}</span>}
                      {clusterName && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>Cluster: {clusterName}</span>}
                      {gradeName   && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>{gradeName}</span>}
                      {schoolSearch && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>School: "{schoolSearch}"</span>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Results area ─────────────────────────────────── */}
              {isStatsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} />
                  <p className="text-sm text-muted-foreground">Loading data…</p>
                </div>
              ) : !stats ? (
                <Card className="border-dashed">
                  <CardContent className="py-14 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium text-foreground">Select filters above to query data</p>
                    <p className="text-sm text-muted-foreground mt-1">Choose a category and breakdown to see national education statistics.</p>
                  </CardContent>
                </Card>
              ) : !stats.results?.length ? (
                <Card className="border-dashed">
                  <CardContent className="py-14 text-center">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium text-foreground">No results found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search term.</p>
                  </CardContent>
                </Card>
              ) : (() => {
                const totalExamined = isRes ? stats.results.reduce((s, r) => s + (r.extra?.total ?? 0), 0) : stats.total;
                const totalPassed   = isRes ? stats.results.reduce((s, r) => s + r.count, 0) : 0;
                const overallPassRate = isRes && totalExamined > 0 ? ((totalPassed / totalExamined) * 100).toFixed(1) + "%" : null;
                const bySchool = groupBy === "school";

                return (
                  <div className="space-y-4">
                    {/* Summary strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: isRes ? "Total Examined" : "Total",    val: (isRes ? totalExamined : stats.total).toLocaleString() },
                        { label: "Rows",                                  val: stats.results.length.toLocaleString() },
                        { label: isRes ? "Passed" : "Highest",           val: isRes ? totalPassed.toLocaleString() : maxVal.toLocaleString() },
                        { label: isRes ? "Overall Pass Rate" : "Avg / Row", val: overallPassRate ?? (stats.results.length > 0 ? Math.round(stats.total / stats.results.length).toLocaleString() : "–") },
                      ].map(({ label, val }) => (
                        <Card key={label}>
                          <CardContent className="pt-4 pb-3">
                            <p className="text-xl font-bold" style={{ color: GREEN }}>{val}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Bar chart — for non-school breakdown with ≤20 rows */}
                    {!bySchool && stats.results.length <= 20 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" style={{ color: GREEN }} />
                            {CAT_LABELS[category]} — {GROUP_OPTIONS[category].find(o => o.value === groupBy)?.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={Math.max(180, stats.results.length * 28)}>
                            <BarChart data={stats.results} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={100} />
                              <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), isRes ? "Passed" : "Count"]} />
                              <Bar dataKey={isRes ? "count" : "count"} name={isRes ? "Passed" : "Count"} radius={[0, 3, 3, 0]}>
                                {stats.results.map((_, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Table */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <CardTitle className="text-sm">
                            {stats.results.length} {bySchool ? "schools" : "rows"} — {isRes ? `${totalExamined.toLocaleString()} examined` : `${stats.total.toLocaleString()} total`}
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            data-testid="button-export-csv"
                            disabled={!stats.results.length}
                          >
                            <Download className="w-3.5 h-3.5 me-1.5" /> Download CSV
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8 text-muted-foreground font-normal text-xs">#</TableHead>
                                <TableHead>{bySchool ? "School" : "Category"}</TableHead>
                                {bySchool && <TableHead className="hidden md:table-cell">Region</TableHead>}
                                {bySchool && <TableHead className="hidden lg:table-cell">Cluster</TableHead>}
                                {bySchool && <TableHead className="hidden lg:table-cell">Type</TableHead>}
                                <TableHead className="text-right">{isRes ? "Examined" : "Count"}</TableHead>
                                {isRes && <TableHead className="text-right">Passed</TableHead>}
                                <TableHead className="text-right">{isRes ? "Pass Rate" : "Share"}</TableHead>
                                {!bySchool && <TableHead className="hidden md:table-cell w-32">Bar</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats.results.map((r, i) => {
                                const rowTotal = isRes ? (r.extra?.total ?? r.count) : r.count;
                                const denominator = isRes ? totalExamined : stats.total;
                                const sharePct = denominator > 0 ? ((rowTotal / denominator) * 100).toFixed(1) + "%" : "0%";
                                const passRate  = r.extra?.passRate as string | undefined;
                                const passNum   = passRate ? parseFloat(passRate) : 0;
                                const passColor = isRes ? (passNum >= 75 ? GREEN : passNum >= 50 ? AMBER : RED) : undefined;

                                return (
                                  <TableRow key={i} data-testid={`row-stat-${i}`} className="hover:bg-muted/40">
                                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                    <TableCell className="font-medium max-w-[180px] truncate" title={r.label}>{r.label}</TableCell>
                                    {bySchool && <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.extra?.region ?? ""}</TableCell>}
                                    {bySchool && <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{r.extra?.cluster ?? ""}</TableCell>}
                                    {bySchool && <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{r.extra?.schoolType ? (SCHOOL_TYPE_LABELS[r.extra.schoolType] || r.extra.schoolType) : ""}</TableCell>}
                                    <TableCell className="text-right tabular-nums">{rowTotal.toLocaleString()}</TableCell>
                                    {isRes && <TableCell className="text-right tabular-nums">{r.count.toLocaleString()}</TableCell>}
                                    <TableCell className="text-right">
                                      <span className="text-sm font-medium" style={{ color: passColor }}>{isRes ? (passRate ?? "–") : sharePct}</span>
                                    </TableCell>
                                    {!bySchool && (
                                      <TableCell className="hidden md:table-cell">
                                        <MiniBar value={rowTotal} max={maxVal} />
                                      </TableCell>
                                    )}
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

          {/* ── Footer ────────────────────────────────────────────── */}
          {summary && (
            <div className="rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4" style={{ background: GREEN }}>
              <div className="flex items-center gap-2">
                <img src={logoPath} alt="Amaanah" className="h-6 w-6 rounded-sm object-contain bg-white p-0.5" />
                <span className="text-white/90 text-xs">General Secretariat for Islamic &amp; Arabic Education, Republic of The Gambia</span>
              </div>
              <p className="text-white/70 text-xs">Data as of: {formatDate(summary.dataAsOf)}</p>
              {mainTab === "query" && stats?.results?.length ? (
                <Button size="sm" variant="outline" onClick={handleExport} className="text-xs border-white/30 text-white" style={{ background: "transparent" }}>
                  <Download className="w-3.5 h-3.5 me-1" /> Export Current View
                </Button>
              ) : null}
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
