import { useState, useMemo, useRef, useEffect } from "react";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart3, Users, GraduationCap, School, Download, TrendingUp, TrendingDown,
  Minus, Loader2, BarChart2, MapPin, Grid3x3, Lock, ShieldCheck, Activity,
  Search, X, Play,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, LineChart, Line, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPath from "@assets/Amana_Logo_1770390631299.jpeg";

// ── Brand colours ─────────────────────────────────────────────────────────────
const GREEN  = "#006633";
const GREEN2 = "#009A44";
const RED    = "#CE1126";
const AMBER  = "#f59e0b";
const CHART_COLORS = [GREEN, GREEN2, AMBER, "#3B82F6", "#8B5CF6", RED, "#06B6D4", "#F97316"];

// ── Animated count-up ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef<number>(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    const t0 = performance.now();
    const go = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      setValue(Math.round((1 - (1 - t) ** 3) * target));
      if (t < 1) frame.current = requestAnimationFrame(go);
    };
    frame.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);
  return value;
}
function AnimatedNumber({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
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

function MiniBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="w-20 bg-muted rounded-full h-1.5 flex-shrink-0">
      <div className="h-1.5 rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: GREEN }} />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type StatCategory = "students" | "schools" | "results" | "examiners";
type GroupBy = "region" | "cluster" | "school" | "grade" | "gender" | "examYear" | "type";

interface StatResult { label: string; count: number; extra?: Record<string, any>; }
interface StatsResponse {
  results: StatResult[]; total: number; groupBy: string; category: string;
  meta: { examYears?: { id: number; name: string; status?: string }[]; isResultsMode?: boolean; };
}
interface NationalSummary {
  totalStudents: number; maleStudents: number; femaleStudents: number; gpi: number;
  totalSchools: number; activeSchools: number;
  totalSchoolStaff: number; totalCandidates: number;
  totalSubjects: number; studentsPerSchool: number;
  totalRegions: number; totalClusters: number;
  currentYear: { id: number; name: string } | null;
  schoolTypeBreakdown: { type: string; count: number }[];
  enrolmentTrend: { yearName: string; male: number; female: number; total: number }[];
  qaCompliance: {
    avgCompliancePct: number; inspectedThisYear: number; coveragePctThisYear: number;
    trend: "improving" | "stable" | "declining";
    fullyCompliant: number; partiallyCompliant: number; nonCompliant: number;
  };
  dataAsOf: string;
}
interface ExamYear { id: number; name: string; isActive: boolean; }
interface Region  { id: number; name: string; }
interface Cluster { id: number; name: string; regionId: number; }

const GRADE_LABELS: Record<number, string> = {
  3: "Grade 3 — LBS", 6: "Grade 6 — UBS", 9: "Grade 9 — BCS", 12: "Grade 12 — SSS",
};
const TYPE_LABELS: Record<string, string> = {
  LBS: "Lower Basic (LBS)", UBS: "Upper Basic (UBS)", BCS: "Basic Cycle (BCS)", SSS: "Senior Secondary (SSS)",
};
const CAT_LABELS: Record<StatCategory, string> = {
  students: "Students", schools: "Schools", results: "Exam Results", examiners: "School Staff",
};

const GROUP_OPTIONS: Record<string, { value: GroupBy; label: string }[]> = {
  students:  [
    { value: "region",   label: "Nationwide — by Region" },
    { value: "cluster",  label: "By Cluster" },
    { value: "school",   label: "By School" },
    { value: "grade",    label: "By Grade" },
    { value: "gender",   label: "By Gender" },
    { value: "examYear", label: "By Academic Year" },
  ],
  schools: [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
    { value: "type",    label: "By School Type" },
  ],
  examiners: [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
  ],
  results: [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
    { value: "school",  label: "By School" },
    { value: "grade",   label: "By Grade" },
  ],
  qa: [
    { value: "region",  label: "Nationwide — by Region" },
    { value: "cluster", label: "By Cluster" },
    { value: "type",    label: "By School Type" },
  ],
};

// ── Shared filter state type ──────────────────────────────────────────────────
interface FilterState {
  groupBy: GroupBy;
  examYearId: string;
  regionId: string;
  clusterId: string;
  grade: string;
  schoolSearch: string;
  schoolSearchInput: string;
  category: StatCategory;
}

function defaultFilter(cat: StatCategory): FilterState {
  return { groupBy: "region", examYearId: "all", regionId: "all", clusterId: "all", grade: "all", schoolSearch: "", schoolSearchInput: "", category: cat };
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function buildRows(results: StatResult[], total: number, isRes: boolean, bySchool: boolean) {
  const totalExamined = isRes ? results.reduce((s, r) => s + (r.extra?.total ?? 0), 0) : total;
  return results.map((r, i) => {
    const rowBase = isRes ? (r.extra?.total ?? r.count) : r.count;
    const share = totalExamined > 0 ? ((rowBase / totalExamined) * 100).toFixed(1) + "%" : "0%";
    if (isRes && bySchool) return [i + 1, r.label, r.extra?.region ?? "", r.extra?.cluster ?? "", r.extra?.schoolType ?? "", r.extra?.total ?? 0, r.count, r.extra?.passRate ?? "–"];
    if (isRes) return [i + 1, r.label, r.extra?.total ?? 0, r.count, r.extra?.passRate ?? "–"];
    if (bySchool) return [i + 1, r.label, r.extra?.region ?? "", r.extra?.cluster ?? "", r.extra?.schoolType ?? "", r.count, share];
    return [i + 1, r.label, r.count, share];
  });
}

function getHeaders(isRes: boolean, bySchool: boolean): string[] {
  if (isRes && bySchool) return ["#", "School", "Region", "Cluster", "Type", "Examined", "Passed", "Pass Rate"];
  if (isRes) return ["#", "Category", "Examined", "Passed", "Pass Rate"];
  if (bySchool) return ["#", "School", "Region", "Cluster", "Type", "Count", "Share %"];
  return ["#", "Category", "Count", "Share %"];
}

function exportCSV(
  results: StatResult[], total: number, category: StatCategory,
  groupBy: GroupBy, isRes: boolean,
  meta: { year?: string; region?: string; cluster?: string; grade?: string; school?: string; tabLabel: string }
) {
  if (!results.length) return;
  const bySchool = groupBy === "school";
  const headers = getHeaders(isRes, bySchool);
  const rows = buildRows(results, total, isRes, bySchool);
  const metaLines = [
    `"Amaanah Education Statistics — ${meta.tabLabel}"`,
    `"Category","${CAT_LABELS[category]}"`,
    meta.year    ? `"Academic Year","${meta.year}"` : null,
    meta.region  ? `"Region","${meta.region}"`      : null,
    meta.cluster ? `"Cluster","${meta.cluster}"`    : null,
    meta.grade   ? `"Grade","${meta.grade}"`        : null,
    meta.school  ? `"School Search","${meta.school}"` : null,
    `"Total","${total.toLocaleString()}"`,
    `"Generated","${new Date().toLocaleString()}"`,
    ``,
  ].filter(Boolean);

  const csv = [
    ...metaLines,
    headers.join(","),
    ...rows.map(r => r.map(v => typeof v === "string" && (v.includes(",") || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `amaanah-${category}-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

async function exportPDF(
  results: StatResult[], total: number, category: StatCategory,
  groupBy: GroupBy, isRes: boolean,
  meta: { year?: string; region?: string; cluster?: string; grade?: string; school?: string; tabLabel: string },
  summary?: NationalSummary,
  qa?: NationalSummary["qaCompliance"],
  queryMeta?: { totalExamined: number; totalPassed: number; overallPassRate: string | null }
) {
  if (!results.length) return;
  const bySchool = groupBy === "school";
  const doc = new jsPDF({ orientation: bySchool ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const rgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
  ];
  const fill   = (hex: string) => { const [r,g,b] = rgb(hex); doc.setFillColor(r,g,b); };
  const stroke = (hex: string) => { const [r,g,b] = rgb(hex); doc.setDrawColor(r,g,b); };
  const tColor = (hex: string) => { const [r,g,b] = rgb(hex); doc.setTextColor(r,g,b); };

  // Load logo
  let logoB64: string | null = null;
  try {
    const resp = await fetch(logoPath);
    const blob = await resp.blob();
    logoB64 = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch { /* skip logo if fails */ }

  // ── Footer renderer ────────────────────────────────────────────────────────
  const drawFooter = (page: number, total: number) => {
    fill(GREEN); doc.rect(0, H - 9, W, 9, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text("General Secretariat for Islamic & Arabic Education — Republic of The Gambia", 12, H - 3.5);
    doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, H - 3.5, { align: "center" });
    doc.text(`Page ${page} of ${total}`, W - 12, H - 3.5, { align: "right" });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER
  // ══════════════════════════════════════════════════════════════════════════
  fill(GREEN); doc.rect(0, 0, W, 30, "F");

  if (logoB64) {
    try { doc.addImage(logoB64, "JPEG", 10, 5, 18, 18); } catch { /* skip */ }
  }
  const logoOffset = logoB64 ? 32 : 12;

  // Org name (left)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("AMAANAH", logoOffset, 12);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.text("General Secretariat for Islamic & Arabic Education", logoOffset, 18);
  doc.text("Republic of The Gambia", logoOffset, 23);

  // Report title (right)
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("EDUCATION STATISTICS REPORT", W - 12, 11, { align: "right" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(meta.tabLabel + " — " + CAT_LABELS[category], W - 12, 18, { align: "right" });
  doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), W - 12, 25, { align: "right" });

  // Red accent line
  fill(RED); doc.rect(0, 30, W, 2, "F");

  let curY = 36;

  // ══════════════════════════════════════════════════════════════════════════
  // 2. FILTER SUMMARY BAND
  // ══════════════════════════════════════════════════════════════════════════
  const breakdownLabel = GROUP_OPTIONS[category]?.find(g => g.value === groupBy)?.label ?? groupBy;
  const filters: string[] = [];
  if (meta.year)    filters.push(`Academic Year: ${meta.year}`);
  if (meta.region)  filters.push(`Region: ${meta.region}`);
  if (meta.cluster) filters.push(`Cluster: ${meta.cluster}`);
  if (meta.grade)   filters.push(`Grade: ${meta.grade}`);
  if (meta.school)  filters.push(`School: "${meta.school}"`);
  const filterText = filters.length ? filters.join("   •   ") : "All data — no filters applied";

  doc.setFillColor(245, 252, 247); doc.rect(0, curY - 2, W, 16, "F");
  fill(GREEN); doc.rect(0, curY - 2, 3, 16, "F"); // green left bar
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); tColor(GREEN);
  doc.text("QUERY FILTERS", 12, curY + 3);
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text(`Breakdown: ${breakdownLabel}`, 12, curY + 8.5);
  doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text(filterText, 12, curY + 13);
  curY += 20;

  // ══════════════════════════════════════════════════════════════════════════
  // 3. NATIONAL OVERVIEW KPI STRIP
  // ══════════════════════════════════════════════════════════════════════════
  if (summary) {
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); tColor(GREEN);
    doc.text("NATIONAL OVERVIEW", 12, curY);
    stroke(GREEN); doc.setLineWidth(0.3);
    doc.line(12, curY + 1.5, W - 12, curY + 1.5);
    curY += 5;

    const kpis = [
      { label: "Schools",           value: summary.totalSchools.toLocaleString() },
      { label: "Students Enrolled", value: summary.totalStudents.toLocaleString() },
      { label: "Candidates Examined", value: summary.totalCandidates.toLocaleString() },
      { label: "Regions",           value: summary.totalRegions.toLocaleString() },
      { label: "Clusters",          value: summary.totalClusters.toLocaleString() },
      { label: "Students/School",   value: summary.studentsPerSchool.toLocaleString() },
    ];
    const bW = (W - 24) / 6;
    const bH = 17;
    kpis.forEach((kpi, i) => {
      const bx = 12 + i * bW; const by = curY;
      doc.setFillColor(248, 253, 249); stroke("#c8e6d0"); doc.setLineWidth(0.3);
      doc.roundedRect(bx, by, bW - 2, bH, 1.5, 1.5, "FD");
      fill(GREEN); doc.roundedRect(bx, by, 2.5, bH, 0.5, 0.5, "F");
      tColor(GREEN); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text(kpi.value, bx + bW / 2, by + 9.5, { align: "center" });
      doc.setTextColor(90, 90, 90); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      doc.text(kpi.label, bx + bW / 2, by + 14.5, { align: "center" });
    });
    curY += bH + 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. QUERY RESULTS SUMMARY STRIP
  // ══════════════════════════════════════════════════════════════════════════
  {
    const tEx = queryMeta?.totalExamined ?? (isRes ? results.reduce((s, r) => s + (r.extra?.total ?? 0), 0) : total);
    const tPa = queryMeta?.totalPassed   ?? (isRes ? results.reduce((s, r) => s + r.count, 0) : 0);
    const maxV = results.length ? Math.max(...results.map(r => isRes ? (r.extra?.total ?? r.count) : r.count)) : 0;
    const opr  = queryMeta?.overallPassRate ?? (isRes && tEx > 0 ? ((tPa / tEx) * 100).toFixed(1) + "%" : null);
    const oprColor = opr ? (parseFloat(opr) >= 75 ? GREEN : parseFloat(opr) >= 50 ? AMBER : RED) : GREEN;

    doc.setFontSize(8); doc.setFont("helvetica", "bold"); tColor(GREEN);
    doc.text("QUERY RESULTS SUMMARY", 12, curY);
    stroke(GREEN); doc.setLineWidth(0.3); doc.line(12, curY + 1.5, W - 12, curY + 1.5);
    curY += 5;

    const cards = [
      { label: isRes ? "Total Examined" : "Grand Total", value: (isRes ? tEx : total).toLocaleString(), color: GREEN },
      { label: "Breakdown Rows",                          value: results.length.toString(),              color: GREEN },
      { label: isRes ? "Total Passed" : "Highest Count",  value: (isRes ? tPa : maxV).toLocaleString(), color: GREEN },
      { label: isRes ? "Overall Pass Rate" : "Avg / Row", value: opr ?? (results.length > 0 ? Math.round(total / results.length).toLocaleString() : "–"), color: oprColor },
    ];
    const cW = (W - 24) / 4; const cH = 17;
    cards.forEach((card, i) => {
      const bx = 12 + i * cW; const by = curY;
      doc.setFillColor(248, 253, 249); stroke("#c8e6d0"); doc.setLineWidth(0.3);
      doc.roundedRect(bx, by, cW - 2, cH, 1.5, 1.5, "FD");
      const [cr, cg, cb] = rgb(card.color); doc.setTextColor(cr, cg, cb);
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text(card.value, bx + cW / 2, by + 9.5, { align: "center" });
      doc.setTextColor(90, 90, 90); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(card.label, bx + cW / 2, by + 14.5, { align: "center" });
    });
    curY += cH + 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. QA COMPLIANCE SECTION (Quality Assurance tab only)
  // ══════════════════════════════════════════════════════════════════════════
  if (qa && meta.tabLabel === "Quality Assurance") {
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); tColor(GREEN);
    doc.text("QUALITY ASSURANCE METRICS", 12, curY);
    stroke(GREEN); doc.setLineWidth(0.3); doc.line(12, curY + 1.5, W - 12, curY + 1.5);
    curY += 5;

    const compColor = qa.avgCompliancePct >= 80 ? GREEN : qa.avgCompliancePct >= 60 ? AMBER : RED;
    const trendColor2 = qa.trend === "improving" ? GREEN : qa.trend === "declining" ? RED : AMBER;
    const qaW = (W - 24) / 3; const qaH = 22;

    [[qa.avgCompliancePct + "%", "National Compliance Rate", "Network Average", compColor],
     [`${qa.inspectedThisYear} / ${summary?.totalSchools ?? 0}`, "Schools Inspected", `${qa.coveragePctThisYear}% coverage this year`, GREEN],
     [qa.trend.toUpperCase(), "Year-on-Year Trend", "Quality Direction", trendColor2],
    ].forEach(([val, title, sub, color], i) => {
      const bx = 12 + i * qaW; const by = curY;
      doc.setFillColor(248, 253, 249); stroke("#c8e6d0"); doc.setLineWidth(0.3);
      doc.roundedRect(bx, by, qaW - 2, qaH, 1.5, 1.5, "FD");
      const [cr, cg, cb] = rgb(color as string); doc.setTextColor(cr, cg, cb);
      doc.setFontSize(i === 0 ? 16 : 13); doc.setFont("helvetica", "bold");
      doc.text(val as string, bx + qaW / 2, by + 12, { align: "center" });
      doc.setTextColor(50, 50, 50); doc.setFontSize(7); doc.setFont("helvetica", "bold");
      doc.text(title as string, bx + qaW / 2, by + 17, { align: "center" });
      doc.setTextColor(100, 100, 100); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      doc.text(sub as string, bx + qaW / 2, by + 21, { align: "center" });
    });
    curY += qaH + 4;

    // Compliance distribution bar
    const t = qa.fullyCompliant + qa.partiallyCompliant + qa.nonCompliant;
    if (t > 0) {
      const barW = W - 24; const barH = 8; const bX = 12;
      const fc = (qa.fullyCompliant / t) * barW;
      const pc = (qa.partiallyCompliant / t) * barW;
      const nc = barW - fc - pc;
      fill(GREEN);  doc.rect(bX,          curY, fc, barH, "F");
      fill(AMBER);  doc.rect(bX + fc,     curY, pc, barH, "F");
      fill(RED);    doc.rect(bX + fc + pc, curY, nc, barH, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
      if (fc > 12) doc.text(`${Math.round((qa.fullyCompliant / t) * 100)}%`,       bX + fc / 2,          curY + 5.5, { align: "center" });
      if (pc > 12) doc.text(`${Math.round((qa.partiallyCompliant / t) * 100)}%`,   bX + fc + pc / 2,     curY + 5.5, { align: "center" });
      if (nc > 12) doc.text(`${Math.round((qa.nonCompliant / t) * 100)}%`,         bX + fc + pc + nc / 2, curY + 5.5, { align: "center" });
      curY += barH + 3;

      const legW = (W - 24) / 3;
      [{ label: `Fully Compliant: ${qa.fullyCompliant.toLocaleString()}`, color: GREEN },
       { label: `Partially Compliant: ${qa.partiallyCompliant.toLocaleString()}`, color: AMBER },
       { label: `Non-Compliant: ${qa.nonCompliant.toLocaleString()}`, color: RED },
      ].forEach((l, i) => {
        fill(l.color); doc.rect(12 + i * legW, curY, 4, 3, "F");
        doc.setTextColor(60, 60, 60); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
        doc.text(l.label, 12 + i * legW + 6, curY + 2.5);
      });
      curY += 8;
    }
    curY += 3;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. HORIZONTAL BAR CHART (≤20 rows, not by school)
  // ══════════════════════════════════════════════════════════════════════════
  if (!bySchool && results.length <= 20) {
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); tColor(GREEN);
    doc.text("DISTRIBUTION CHART", 12, curY);
    stroke(GREEN); doc.setLineWidth(0.3); doc.line(12, curY + 1.5, W - 12, curY + 1.5);
    curY += 5;

    const chartColors = [GREEN, GREEN2, AMBER, "#3B82F6", "#8B5CF6", RED, "#06B6D4", "#F97316"];
    const maxVal = Math.max(...results.map(r => isRes ? (r.extra?.total ?? r.count) : r.count), 1);
    const rowH = 5.5; const gap = 1.5;
    const labelW = 48; const valueW = 22;
    const chartW = W - 24 - labelW - valueW;

    results.forEach((r, i) => {
      const val = isRes ? (r.extra?.total ?? r.count) : r.count;
      const barW = (val / maxVal) * chartW;
      const rowY = curY + i * (rowH + gap);
      const [cr, cg, cb] = rgb(chartColors[i % chartColors.length]);

      // Label
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
      const label = r.label.length > 22 ? r.label.slice(0, 21) + "…" : r.label;
      doc.text(label, 12 + labelW - 2, rowY + rowH - 1, { align: "right" });

      // Background track
      doc.setFillColor(238, 245, 240);
      doc.roundedRect(12 + labelW, rowY, chartW, rowH, 0.5, 0.5, "F");

      // Bar fill
      doc.setFillColor(cr, cg, cb);
      if (barW > 0.5) doc.roundedRect(12 + labelW, rowY, barW, rowH, 0.5, 0.5, "F");

      // Value text
      doc.setTextColor(50, 50, 50); doc.setFontSize(6);
      doc.text(val.toLocaleString(), 12 + labelW + chartW + 2, rowY + rowH - 1);

      // Pass rate for results mode
      if (isRes && r.extra?.passRate) {
        const pr = r.extra.passRate as string;
        const prColor = parseFloat(pr) >= 75 ? GREEN : parseFloat(pr) >= 50 ? AMBER : RED;
        tColor(prColor); doc.setFontSize(5.5); doc.setFont("helvetica", "bold");
        doc.text(pr, 12 + labelW + chartW + valueW - 1, rowY + rowH - 1, { align: "right" });
      }
    });
    curY += results.length * (rowH + gap) + 7;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. DATA TABLE
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); tColor(GREEN);
  doc.text("DETAILED DATA TABLE", 12, curY);
  stroke(GREEN); doc.setLineWidth(0.3); doc.line(12, curY + 1.5, W - 12, curY + 1.5);
  curY += 5;

  const headers = getHeaders(isRes, bySchool);
  const rows = buildRows(results, total, isRes, bySchool);

  autoTable(doc, {
    startY: curY,
    head: [headers],
    body: rows.map(r => r.map(String)),
    styles: { fontSize: 7.5, cellPadding: 2.8, textColor: [40, 40, 40] },
    headStyles: { fillColor: rgb(GREEN), textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 251, 247] },
    columnStyles: { 0: { cellWidth: 9, halign: "center", textColor: [140, 140, 140] } },
    margin: { left: 12, right: 12, bottom: 14 },
    didDrawPage: () => { /* footer added after */ },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Add footers to all pages
  // ══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) { doc.setPage(p); drawFooter(p, totalPages); }

  doc.save(`amaanah-${meta.tabLabel.replace(/\s+/g, "-").toLowerCase()}-${groupBy}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Query Filter Bar component ────────────────────────────────────────────────
interface FilterBarProps {
  f: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onRun: () => void;
  isLoading: boolean;
  examYears: { id: number; name: string; isActive: boolean }[];
  regions: Region[];
  clusters: Cluster[];
  groupOptions: { value: GroupBy; label: string }[];
  showGrade?: boolean;
  showSchoolSearch?: boolean;
}

function FilterBar({ f, onChange, onRun, isLoading, examYears, regions, clusters, groupOptions, showGrade, showSchoolSearch }: FilterBarProps) {
  const visibleClusters = f.regionId === "all" ? clusters : clusters.filter(c => c.regionId === parseInt(f.regionId));

  const handleRegion = (v: string) => onChange({ regionId: v, clusterId: "all" });
  const handleGroup  = (v: string) => {
    onChange({ groupBy: v as GroupBy, schoolSearch: "", schoolSearchInput: "" });
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Filter row matching screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Breakdown</label>
            <Select value={f.groupBy} onValueChange={handleGroup}>
              <SelectTrigger data-testid="select-breakdown">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Academic Year</label>
            <Select value={f.examYearId} onValueChange={v => onChange({ examYearId: v })}>
              <SelectTrigger data-testid="select-year">
                <SelectValue placeholder="All Academic Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Years</SelectItem>
                {examYears.map(y => (
                  <SelectItem key={y.id} value={y.id.toString()}>
                    {y.name.replace(/^["'\u201C\u201D]+/, "")}{y.isActive ? " (Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Region</label>
            <Select value={f.regionId} onValueChange={handleRegion}>
              <SelectTrigger data-testid="select-region">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cluster</label>
            <Select value={f.clusterId} onValueChange={v => onChange({ clusterId: v })} disabled={!visibleClusters.length}>
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

        {/* Optional secondary row: grade + school search */}
        {(showGrade || showSchoolSearch) && (
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t">
            {showGrade && f.groupBy !== "grade" && (
              <div className="space-y-1.5 w-52">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Grade</label>
                <Select value={f.grade} onValueChange={v => onChange({ grade: v })}>
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

            {showSchoolSearch && f.groupBy === "school" && (
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Search School Name</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={f.schoolSearchInput}
                      onChange={e => onChange({ schoolSearchInput: e.target.value })}
                      onKeyDown={e => { if (e.key === "Enter") onChange({ schoolSearch: f.schoolSearchInput }); }}
                      placeholder="Type school name and press Enter…"
                      className="pl-8"
                      data-testid="input-school-search"
                    />
                  </div>
                  <Button variant="outline" onClick={() => onChange({ schoolSearch: f.schoolSearchInput })} data-testid="button-school-search">
                    <Search className="w-4 h-4" />
                  </Button>
                  {f.schoolSearch && (
                    <Button variant="ghost" onClick={() => onChange({ schoolSearch: "", schoolSearchInput: "" })}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Run Query button */}
        <div className="flex items-center justify-between pt-1 border-t gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {f.examYearId !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>
                {examYears.find(y => y.id.toString() === f.examYearId)?.name?.replace(/^["'\u201C\u201D]+/, "") ?? f.examYearId}
              </span>
            )}
            {f.regionId !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>
                {regions.find(r => r.id.toString() === f.regionId)?.name}
              </span>
            )}
            {f.clusterId !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>
                {[...clusters].find(c => c.id.toString() === f.clusterId)?.name}
              </span>
            )}
            {f.grade !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>
                {GRADE_LABELS[parseInt(f.grade)]}
              </span>
            )}
            {f.schoolSearch && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>
                School: "{f.schoolSearch}"
              </span>
            )}
          </div>

          <Button
            onClick={onRun}
            disabled={isLoading}
            data-testid="button-run-query"
            style={{ background: GREEN, color: "white" }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Play className="w-4 h-4 me-2" />}
            Run Query
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Results Table + Chart ────────────────────────────────────────────────────
interface ResultsPanelProps {
  stats: StatsResponse;
  tabLabel: string;
  f: FilterState;
  regions: Region[];
  clusters: Cluster[];
  examYears: { id: number; name: string; isActive: boolean }[];
  summary?: NationalSummary;
  qa?: NationalSummary["qaCompliance"];
}

function ResultsPanel({ stats, tabLabel, f, regions, clusters, examYears, summary, qa }: ResultsPanelProps) {
  const isRes = !!stats.meta?.isResultsMode;
  const bySchool = f.groupBy === "school";
  const results = stats.results ?? [];
  const total = stats.total ?? 0;
  const totalExamined = isRes ? results.reduce((s, r) => s + (r.extra?.total ?? 0), 0) : total;
  const totalPassed   = isRes ? results.reduce((s, r) => s + r.count, 0) : 0;
  const maxVal = results.length ? Math.max(...results.map(r => isRes ? (r.extra?.total ?? r.count) : r.count)) : 1;

  const yearName    = f.examYearId !== "all" ? examYears.find(y => y.id.toString() === f.examYearId)?.name?.replace(/^["'\u201C\u201D]+/, "") : undefined;
  const regionName  = f.regionId  !== "all" ? regions.find(r => r.id.toString() === f.regionId)?.name   : undefined;
  const clusterName = f.clusterId !== "all" ? clusters.find(c => c.id.toString() === f.clusterId)?.name : undefined;
  const gradeName   = f.grade     !== "all" ? GRADE_LABELS[parseInt(f.grade)] : undefined;

  const meta = { year: yearName, region: regionName, cluster: clusterName, grade: gradeName, school: f.schoolSearch || undefined, tabLabel };

  const overallPassRate = isRes && totalExamined > 0 ? ((totalPassed / totalExamined) * 100).toFixed(1) + "%" : null;
  const passColor = isRes && overallPassRate ? (parseFloat(overallPassRate) >= 75 ? GREEN : parseFloat(overallPassRate) >= 50 ? AMBER : RED) : GREEN;

  if (!results.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-14 text-center">
          <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium">No results for the selected filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your breakdown or filter criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xl font-bold" style={{ color: GREEN }}>{(isRes ? totalExamined : total).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isRes ? "Total Examined" : "Grand Total"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xl font-bold" style={{ color: GREEN }}>{results.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xl font-bold" style={{ color: GREEN }}>{isRes ? totalPassed.toLocaleString() : maxVal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isRes ? "Total Passed" : "Highest Count"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xl font-bold" style={{ color: passColor }}>{overallPassRate ?? (results.length > 0 ? Math.round(total / results.length).toLocaleString() : "–")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isRes ? "Overall Pass Rate" : "Avg / Row"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart for small result sets */}
      {!bySchool && results.length <= 20 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: GREEN }} />
              {CAT_LABELS[f.category]} — {results.length} groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, results.length * 30)}>
              <BarChart data={results} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={110} />
                <Tooltip formatter={(v: any) => [Number(v).toLocaleString(), isRes ? "Passed" : "Count"]} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {results.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
              {results.length} {bySchool ? "schools" : "entries"} — {isRes ? `${totalExamined.toLocaleString()} examined` : `${total.toLocaleString()} total`}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => exportCSV(results, total, f.category, f.groupBy, isRes, meta)}
                data-testid="button-export-csv"
              >
                <Download className="w-3.5 h-3.5 me-1.5" /> CSV
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => exportPDF(results, total, f.category, f.groupBy, isRes, meta, summary, qa, { totalExamined, totalPassed, overallPassRate })}
                data-testid="button-export-pdf"
                style={{ borderColor: RED, color: RED }}
              >
                <Download className="w-3.5 h-3.5 me-1.5" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs text-muted-foreground font-normal">#</TableHead>
                  <TableHead>{bySchool ? "School" : "Category"}</TableHead>
                  {bySchool && <TableHead className="hidden md:table-cell">Region</TableHead>}
                  {bySchool && <TableHead className="hidden lg:table-cell">Cluster</TableHead>}
                  {bySchool && <TableHead className="hidden lg:table-cell">Type</TableHead>}
                  <TableHead className="text-right">{isRes ? "Examined" : "Count"}</TableHead>
                  {isRes && <TableHead className="text-right">Passed</TableHead>}
                  <TableHead className="text-right">{isRes ? "Pass Rate" : "Share %"}</TableHead>
                  {!bySchool && <TableHead className="hidden sm:table-cell w-24">Bar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => {
                  const rowCount = isRes ? (r.extra?.total ?? r.count) : r.count;
                  const denom    = isRes ? totalExamined : total;
                  const share    = denom > 0 ? ((rowCount / denom) * 100).toFixed(1) + "%" : "0%";
                  const pr       = r.extra?.passRate as string | undefined;
                  const prNum    = pr ? parseFloat(pr) : 0;
                  const prColor  = isRes ? (prNum >= 75 ? GREEN : prNum >= 50 ? AMBER : RED) : undefined;

                  return (
                    <TableRow key={i} data-testid={`row-result-${i}`} className="hover:bg-muted/40">
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={r.label}>{r.label}</TableCell>
                      {bySchool && <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.extra?.region ?? ""}</TableCell>}
                      {bySchool && <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{r.extra?.cluster ?? ""}</TableCell>}
                      {bySchool && <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{r.extra?.schoolType ? (TYPE_LABELS[r.extra.schoolType] || r.extra.schoolType) : ""}</TableCell>}
                      <TableCell className="text-right tabular-nums">{rowCount.toLocaleString()}</TableCell>
                      {isRes && <TableCell className="text-right tabular-nums">{r.count.toLocaleString()}</TableCell>}
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold" style={{ color: prColor }}>{isRes ? (pr ?? "–") : share}</span>
                      </TableCell>
                      {!bySchool && (
                        <TableCell className="hidden sm:table-cell">
                          <MiniBar value={rowCount} max={maxVal} />
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
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center space-y-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: `${GREEN}12` }}>
          <Play className="w-6 h-6" style={{ color: GREEN }} />
        </div>
        <p className="font-semibold text-foreground">Select your filters and click "Run Query"</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Choose a breakdown, academic year, region, and cluster, then run the query to view {label} data with CSV and PDF export.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Shared query hook that only fetches when triggered ────────────────────────
function useTriggeredQuery(category: StatCategory, f: FilterState, enabled: boolean) {
  const url = useMemo(() => {
    const p = new URLSearchParams({ category, groupBy: f.groupBy });
    if (f.examYearId !== "all") p.set("examYearId", f.examYearId);
    if (f.regionId   !== "all") p.set("regionId",   f.regionId);
    if (f.clusterId  !== "all") p.set("clusterId",  f.clusterId);
    if (f.grade      !== "all") p.set("grade",       f.grade);
    if (f.schoolSearch)          p.set("schoolName",  f.schoolSearch);
    return `/api/public/statistics?${p.toString()}`;
  }, [category, f]);

  return useQuery<StatsResponse>({ queryKey: [url], enabled });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main page ─────────────────────────────────────────────────────────────────
export default function Statistics() {
  useLanguage();

  // Shared reference data
  const { data: summary, isLoading: isSummaryLoading } = useQuery<NationalSummary>({ queryKey: ["/api/public/national-summary"] });
  const { data: examYearsData = [] } = useQuery<ExamYear[]>({ queryKey: ["/api/public/exam-years"] });
  const { data: regions  = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters = [] } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });

  const examYears = examYearsData ?? [];

  // Active tab
  const [tab, setTab] = useState<"enrolment" | "qa" | "examination">("enrolment");

  // ── Enrolment & Schools tab state ─────────────────────────────────────────
  const [enrolCat,   setEnrolCat]   = useState<"students" | "schools" | "examiners">("students");
  const [enrolF,     setEnrolF]     = useState<FilterState>(defaultFilter("students"));
  const [enrolUrl,   setEnrolUrl]   = useState<string | null>(null);
  const { data: enrolStats, isLoading: enrolLoading } = useQuery<StatsResponse>({
    queryKey: [enrolUrl ?? "__disabled__enrol"],
    enabled: !!enrolUrl,
  });

  const runEnrol = () => {
    const p = new URLSearchParams({ category: enrolCat, groupBy: enrolF.groupBy });
    if (enrolF.examYearId !== "all") p.set("examYearId", enrolF.examYearId);
    if (enrolF.regionId   !== "all") p.set("regionId",   enrolF.regionId);
    if (enrolF.clusterId  !== "all") p.set("clusterId",  enrolF.clusterId);
    if (enrolF.grade      !== "all") p.set("grade",       enrolF.grade);
    if (enrolF.schoolSearch)          p.set("schoolName",  enrolF.schoolSearch);
    setEnrolUrl(`/api/public/statistics?${p.toString()}`);
  };

  // Reset query when category changes
  const handleEnrolCat = (cat: "students" | "schools" | "examiners") => {
    setEnrolCat(cat);
    setEnrolF(prev => ({ ...prev, groupBy: GROUP_OPTIONS[cat][0].value, grade: "all", schoolSearch: "", schoolSearchInput: "" }));
    setEnrolUrl(null);
  };

  // ── QA tab state ──────────────────────────────────────────────────────────
  const [qaF,   setQaF]   = useState<FilterState>(defaultFilter("schools"));
  const [qaUrl, setQaUrl] = useState<string | null>(null);
  const { data: qaStats, isLoading: qaLoading } = useQuery<StatsResponse>({
    queryKey: [qaUrl ?? "__disabled__qa"],
    enabled: !!qaUrl,
  });

  const runQa = () => {
    const p = new URLSearchParams({ category: "schools", groupBy: qaF.groupBy });
    if (qaF.examYearId !== "all") p.set("examYearId", qaF.examYearId);
    if (qaF.regionId   !== "all") p.set("regionId",   qaF.regionId);
    if (qaF.clusterId  !== "all") p.set("clusterId",  qaF.clusterId);
    setQaUrl(`/api/public/statistics?${p.toString()}`);
  };

  // ── Examination tab state ─────────────────────────────────────────────────
  const [examF,   setExamF]   = useState<FilterState>(defaultFilter("results"));
  const [examUrl, setExamUrl] = useState<string | null>(null);
  const { data: examStats, isLoading: examLoading } = useQuery<StatsResponse>({
    queryKey: [examUrl ?? "__disabled__exam"],
    enabled: !!examUrl,
  });

  const runExam = () => {
    const p = new URLSearchParams({ category: "results", groupBy: examF.groupBy });
    if (examF.examYearId !== "all") p.set("examYearId", examF.examYearId);
    if (examF.regionId   !== "all") p.set("regionId",   examF.regionId);
    if (examF.clusterId  !== "all") p.set("clusterId",  examF.clusterId);
    if (examF.grade      !== "all") p.set("grade",       examF.grade);
    if (examF.schoolSearch)          p.set("schoolName",  examF.schoolSearch);
    setExamUrl(`/api/public/statistics?${p.toString()}`);
  };

  const qa = summary?.qaCompliance;
  const TrendIcon = qa?.trend === "improving" ? TrendingUp : qa?.trend === "declining" ? TrendingDown : Minus;
  const trendColor = qa?.trend === "improving" ? GREEN : qa?.trend === "declining" ? RED : AMBER;
  const complianceColor = qa ? (qa.avgCompliancePct >= 80 ? GREEN : qa.avgCompliancePct >= 60 ? AMBER : RED) : GREEN;

  const TAB_CONFIG = [
    { key: "enrolment",  label: "Enrolment & Schools",  icon: BarChart3 },
    { key: "qa",         label: "Quality Assurance",     icon: ShieldCheck },
    { key: "examination",label: "Examination",           icon: BarChart2 },
  ] as const;

  return (
    <PublicLayout>

      {/* ── Hero banner ─────────────────────────────────────────────── */}
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
                  {summary.currentYear.name.replace(/^["'\u201C\u201D]+/, "")}
                </span>
              )}
            </div>
            <a href="/login" className="text-white/80 hover:text-white text-sm underline underline-offset-2 flex-shrink-0">Sign In</a>
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${RED} 0%, ${RED}00 100%)` }} />
      </div>

      {/* ── Sticky tab nav ──────────────────────────────────────────── */}
      <div className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-1.5 py-2 overflow-x-auto">
            {TAB_CONFIG.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  data-testid={`tab-${key}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
                  style={active
                    ? { background: GREEN, color: "white" }
                    : { background: "transparent", color: GREEN, border: `1px solid ${GREEN}` }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* ══════════════════════════════════════════════════════════════
              TAB: ENROLMENT & SCHOOLS
          ══════════════════════════════════════════════════════════════ */}
          {tab === "enrolment" && (
            <div className="space-y-4">
              {/* Category selector */}
              <div className="flex flex-wrap gap-2">
                {(["students", "schools", "examiners"] as const).map(cat => {
                  const icons: Record<string, React.ElementType> = { students: GraduationCap, schools: School, examiners: Users };
                  const Icon = icons[cat];
                  const active = enrolCat === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleEnrolCat(cat)}
                      data-testid={`cat-${cat}`}
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

              <FilterBar
                f={enrolF}
                onChange={patch => setEnrolF(prev => ({ ...prev, ...patch }))}
                onRun={runEnrol}
                isLoading={enrolLoading}
                examYears={examYears}
                regions={regions}
                clusters={clusters}
                groupOptions={GROUP_OPTIONS[enrolCat]}
                showGrade={enrolCat === "students"}
                showSchoolSearch={enrolCat === "students"}
              />

              {enrolLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} />
                  <p className="text-sm text-muted-foreground">Running query…</p>
                </div>
              ) : enrolStats ? (
                <div className="space-y-4">
                  {summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <KpiCard icon={School}        label="Schools"             value={summary.totalSchools} />
                      <KpiCard icon={GraduationCap} label="Students Enrolled"   value={summary.totalStudents} />
                      <KpiCard icon={Users}         label="Candidates Examined"  value={summary.totalCandidates} />
                      <KpiCard icon={MapPin}        label="Regions"              value={summary.totalRegions} />
                      <KpiCard icon={Grid3x3}       label="Clusters"             value={summary.totalClusters} />
                      <KpiCard icon={BarChart2}     label="Students / School"    value={summary.studentsPerSchool} sub="avg per school" />
                    </div>
                  )}
                  <ResultsPanel stats={enrolStats} tabLabel="Enrolment & Schools" f={{ ...enrolF, category: enrolCat }} regions={regions} clusters={clusters} examYears={examYears} summary={summary} />
                </div>
              ) : (
                <EmptyState label="enrolment and schools" />
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: QUALITY ASSURANCE
          ══════════════════════════════════════════════════════════════ */}
          {tab === "qa" && (
            <div className="space-y-4">
              {/* Filter bar — always shown first */}
              <FilterBar
                f={qaF}
                onChange={patch => { setQaF(prev => ({ ...prev, ...patch })); setQaUrl(null); }}
                onRun={runQa}
                isLoading={qaLoading}
                examYears={examYears}
                regions={regions}
                clusters={clusters}
                groupOptions={GROUP_OPTIONS["qa"]}
              />

              {/* Results only appear after Run Query */}
              {qaLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} />
                  <p className="text-sm text-muted-foreground">Running query…</p>
                </div>
              ) : qaStats ? (
                <div className="space-y-4">
                  {/* National KPI strip */}
                  {summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <KpiCard icon={School}        label="Schools"             value={summary.totalSchools} />
                      <KpiCard icon={GraduationCap} label="Students Enrolled"   value={summary.totalStudents} />
                      <KpiCard icon={Users}         label="Candidates Examined"  value={summary.totalCandidates} />
                      <KpiCard icon={MapPin}        label="Regions"              value={summary.totalRegions} />
                      <KpiCard icon={Grid3x3}       label="Clusters"             value={summary.totalClusters} />
                      <KpiCard icon={BarChart2}     label="Students / School"    value={summary.studentsPerSchool} sub="avg per school" />
                    </div>
                  )}
                  {/* QA summary cards */}
                  {qa && (
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
                            {qa.inspectedThisYear}<span className="text-xl text-muted-foreground mx-1">of</span>{summary?.totalSchools ?? 0}
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
                  )}

                  {/* Compliance distribution bar */}
                  {qa && (() => {
                    const t = qa.fullyCompliant + qa.partiallyCompliant + qa.nonCompliant;
                    if (!t) return null;
                    return (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="w-4 h-4" style={{ color: GREEN }} /> Compliance Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="w-full h-7 rounded-full overflow-hidden flex">
                            <div style={{ width: `${(qa.fullyCompliant / t) * 100}%`, background: GREEN }} className="flex items-center justify-center text-white text-xs font-semibold">
                              {Math.round((qa.fullyCompliant / t) * 100)}%
                            </div>
                            <div style={{ width: `${(qa.partiallyCompliant / t) * 100}%`, background: AMBER }} className="flex items-center justify-center text-white text-xs font-semibold">
                              {Math.round((qa.partiallyCompliant / t) * 100)}%
                            </div>
                            <div style={{ width: `${(qa.nonCompliant / t) * 100}%`, background: RED }} className="flex items-center justify-center text-white text-xs font-semibold">
                              {Math.round((qa.nonCompliant / t) * 100)}%
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "Fully Compliant",     count: qa.fullyCompliant,     color: GREEN },
                              { label: "Partially Compliant", count: qa.partiallyCompliant, color: AMBER },
                              { label: "Non-Compliant",        count: qa.nonCompliant,       color: RED },
                            ].map(({ label, count, color }) => (
                              <div key={label} className="p-3 rounded-md border text-center" style={{ borderColor: `${color}40` }}>
                                <p className="text-2xl font-bold" style={{ color }}>{count.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* School distribution table */}
                  <ResultsPanel stats={qaStats} tabLabel="Quality Assurance" f={{ ...qaF, category: "schools" }} regions={regions} clusters={clusters} examYears={examYears} summary={summary} qa={qa} />
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                      <p className="font-semibold text-foreground">School Distribution Query</p>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Select breakdown, filters, and click "Run Query" to view school distribution data by region, cluster, or type. Detailed per-school QA inspection reports require authenticated access.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: EXAMINATION
          ══════════════════════════════════════════════════════════════ */}
          {tab === "examination" && (
            <div className="space-y-4">
              <FilterBar
                f={examF}
                onChange={patch => { setExamF(prev => ({ ...prev, ...patch })); setExamUrl(null); }}
                onRun={runExam}
                isLoading={examLoading}
                examYears={examYears}
                regions={regions}
                clusters={clusters}
                groupOptions={GROUP_OPTIONS["results"]}
                showGrade
                showSchoolSearch
              />

              {examLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} />
                  <p className="text-sm text-muted-foreground">Running query…</p>
                </div>
              ) : examStats ? (
                <div className="space-y-4">
                  {summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <KpiCard icon={School}        label="Schools"             value={summary.totalSchools} />
                      <KpiCard icon={GraduationCap} label="Students Enrolled"   value={summary.totalStudents} />
                      <KpiCard icon={Users}         label="Candidates Examined"  value={summary.totalCandidates} />
                      <KpiCard icon={MapPin}        label="Regions"              value={summary.totalRegions} />
                      <KpiCard icon={Grid3x3}       label="Clusters"             value={summary.totalClusters} />
                      <KpiCard icon={BarChart2}     label="Students / School"    value={summary.studentsPerSchool} sub="avg per school" />
                    </div>
                  )}
                  <ResultsPanel stats={examStats} tabLabel="Examination" f={{ ...examF, category: "results" }} regions={regions} clusters={clusters} examYears={examYears} summary={summary} />
                </div>
              ) : (
                <EmptyState label="examination results" />
              )}
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────── */}
          {summary && (
            <div className="rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ background: GREEN }}>
              <div className="flex items-center gap-2">
                <img src={logoPath} alt="Amaanah" className="h-6 w-6 rounded-sm object-contain bg-white p-0.5" />
                <span className="text-white/90 text-xs">General Secretariat for Islamic &amp; Arabic Education, Republic of The Gambia</span>
              </div>
              <p className="text-white/70 text-xs">Data as of: {new Date(summary.dataAsOf).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              <a href="/login" className="text-white/80 hover:text-white text-xs underline underline-offset-2">Sign In for Full Access</a>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
