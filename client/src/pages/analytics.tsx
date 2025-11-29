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
import { useState } from "react";

interface AnalyticsData {
  overview: {
    totalStudents: number;
    totalSchools: number;
    passRate: number;
    avgScore: number;
    trends: {
      students: number;
      passRate: number;
    };
  };
  byRegion: Array<{
    name: string;
    students: number;
    passRate: number;
    avgScore: number;
  }>;
  byGrade: Array<{
    grade: number;
    students: number;
    passRate: number;
    avgScore: number;
  }>;
  bySubject: Array<{
    name: string;
    avgScore: number;
    passRate: number;
  }>;
  byGender: {
    male: { count: number; passRate: number };
    female: { count: number; passRate: number };
  };
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

function RegionPerformanceBar({ name, passRate, students }: { name: string; passRate: number; students: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">{passRate.toFixed(1)}% pass rate</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={passRate} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-16 text-right">{students} students</span>
      </div>
    </div>
  );
}

function SubjectCard({ name, avgScore, passRate }: { name: string; avgScore: number; passRate: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-chart-3";
    if (score >= 50) return "text-chart-2";
    return "text-chart-5";
  };

  return (
    <div className="p-4 border rounded-md">
      <h4 className="font-medium text-sm mb-2">{name}</h4>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className={`text-xl font-semibold ${getScoreColor(avgScore)}`}>{avgScore.toFixed(1)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Pass Rate</p>
          <p className="text-sm font-medium">{passRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [yearFilter, setYearFilter] = useState<string>("current");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", yearFilter, gradeFilter],
  });

  const mockData: AnalyticsData = {
    overview: {
      totalStudents: 12450,
      totalSchools: 387,
      passRate: 78.5,
      avgScore: 64.2,
      trends: {
        students: 8.5,
        passRate: 2.3,
      },
    },
    byRegion: [
      { name: "Western Region", students: 4520, passRate: 82.3, avgScore: 68.5 },
      { name: "Central Region", students: 3280, passRate: 76.8, avgScore: 62.1 },
      { name: "Northern Region", students: 2450, passRate: 79.1, avgScore: 65.3 },
      { name: "Eastern Region", students: 2200, passRate: 74.5, avgScore: 61.8 },
    ],
    byGrade: [
      { grade: 3, students: 3200, passRate: 85.2, avgScore: 72.1 },
      { grade: 6, students: 3800, passRate: 79.8, avgScore: 65.4 },
      { grade: 9, students: 3150, passRate: 74.3, avgScore: 60.2 },
      { grade: 12, students: 2300, passRate: 71.5, avgScore: 58.7 },
    ],
    bySubject: [
      { name: "Arabic Reading", avgScore: 72.5, passRate: 85.2 },
      { name: "Arabic Writing", avgScore: 68.3, passRate: 79.8 },
      { name: "Quran", avgScore: 78.9, passRate: 88.5 },
      { name: "Islamic Studies", avgScore: 65.4, passRate: 76.3 },
      { name: "Fiqh", avgScore: 62.1, passRate: 72.5 },
      { name: "Hadith", avgScore: 70.8, passRate: 82.1 },
    ],
    byGender: {
      male: { count: 6120, passRate: 75.8 },
      female: { count: 6330, passRate: 81.2 },
    },
  };

  const data = analytics || mockData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Performance insights and examination statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-year-filter">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Year</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-grade-filter">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="3">Grade 3</SelectItem>
              <SelectItem value="6">Grade 6</SelectItem>
              <SelectItem value="9">Grade 9</SelectItem>
              <SelectItem value="12">Grade 12</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={data.overview.totalStudents.toLocaleString()}
          icon={Users}
          color="bg-primary/10 text-primary"
          trend="up"
          trendValue={`+${data.overview.trends.students}% from last year`}
        />
        <StatCard
          title="Registered Schools"
          value={data.overview.totalSchools}
          icon={School}
          color="bg-chart-2/10 text-chart-2"
        />
        <StatCard
          title="Pass Rate"
          value={`${data.overview.passRate}%`}
          icon={Award}
          color="bg-chart-3/10 text-chart-3"
          trend="up"
          trendValue={`+${data.overview.trends.passRate}% from last year`}
        />
        <StatCard
          title="Average Score"
          value={data.overview.avgScore.toFixed(1)}
          subtitle="out of 100"
          icon={BarChart3}
          color="bg-chart-4/10 text-chart-4"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Region</CardTitle>
            <CardDescription>
              Pass rates and student counts across regions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.byRegion.map((region) => (
                <RegionPerformanceBar
                  key={region.name}
                  name={region.name}
                  passRate={region.passRate}
                  students={region.students}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance by Grade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Grade</CardTitle>
            <CardDescription>
              Breakdown of results by grade level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {data.byGrade.map((grade) => (
                <div key={grade.grade} className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold">Grade {grade.grade}</span>
                    <span className="text-sm text-muted-foreground">{grade.students} students</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pass Rate</span>
                      <span className="font-medium text-chart-3">{grade.passRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Score</span>
                      <span className="font-medium">{grade.avgScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subject Performance</CardTitle>
          <CardDescription>
            Average scores and pass rates by subject
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.bySubject.map((subject) => (
              <SubjectCard
                key={subject.name}
                name={subject.name}
                avgScore={subject.avgScore}
                passRate={subject.passRate}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gender Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance by Gender</CardTitle>
          <CardDescription>
            Comparison of male and female student performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 border rounded-md bg-chart-2/5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Male Students</h4>
                <span className="text-2xl font-semibold">{data.byGender.male.count.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pass Rate</span>
                  <span className="font-medium">{data.byGender.male.passRate}%</span>
                </div>
                <Progress value={data.byGender.male.passRate} className="h-2" />
              </div>
            </div>
            <div className="p-6 border rounded-md bg-chart-4/5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Female Students</h4>
                <span className="text-2xl font-semibold">{data.byGender.female.count.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pass Rate</span>
                  <span className="font-medium">{data.byGender.female.passRate}%</span>
                </div>
                <Progress value={data.byGender.female.passRate} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
