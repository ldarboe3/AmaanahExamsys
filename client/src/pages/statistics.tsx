import { useState } from "react";
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
  BarChart3, 
  Users, 
  GraduationCap, 
  School, 
  MapPin, 
  Building2,
  Filter,
  Download,
  TrendingUp,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatCategory = "students" | "teachers" | "schools";
type GroupBy = "region" | "cluster" | "school" | "ethnicity" | "shift" | "gender" | "qualification";

interface StatResult {
  label: string;
  count: number;
  percentage?: number;
}

export default function Statistics() {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<StatCategory>("students");
  const [groupBy, setGroupBy] = useState<GroupBy>("region");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const { data: regions } = useQuery<any[]>({
    queryKey: ['/api/regions'],
  });

  const { data: statistics, isLoading, error } = useQuery<{
    results: StatResult[];
    total: number;
    groupBy: string;
    category: string;
    availableInEmis: boolean;
  }>({
    queryKey: ['/api/public/statistics', activeTab, groupBy, selectedRegion],
  });

  const studentGroupOptions: { value: GroupBy; label: string; labelAr: string }[] = [
    { value: "region", label: "By Region", labelAr: "حسب المنطقة" },
    { value: "cluster", label: "By Cluster", labelAr: "حسب الكتلة" },
    { value: "school", label: "By School", labelAr: "حسب المدرسة" },
    { value: "ethnicity", label: "By Ethnicity", labelAr: "حسب العرق" },
    { value: "shift", label: "By Shift", labelAr: "حسب الوردية" },
    { value: "gender", label: "By Gender", labelAr: "حسب الجنس" },
  ];

  const teacherGroupOptions: { value: GroupBy; label: string; labelAr: string }[] = [
    { value: "region", label: "By Region", labelAr: "حسب المنطقة" },
    { value: "cluster", label: "By Cluster", labelAr: "حسب الكتلة" },
    { value: "school", label: "By School", labelAr: "حسب المدرسة" },
    { value: "qualification", label: "By Qualification", labelAr: "حسب المؤهل" },
  ];

  const getGroupOptions = () => {
    if (activeTab === "teachers") return teacherGroupOptions;
    return studentGroupOptions;
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as StatCategory);
    setGroupBy("region");
  };

  const renderStatCards = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!statistics?.availableInEmis) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isRTL ? "البيانات غير متوفرة حالياً" : "Data Not Currently Available"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isRTL 
                ? "سيتم جلب هذه البيانات من نظام معلومات إدارة التعليم (EMIS) قريباً. يرجى التحقق مرة أخرى لاحقاً."
                : "This data will be fetched from the Education Management Information System (EMIS) soon. Please check back later."}
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
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isRTL ? "لا توجد بيانات" : "No Data Available"}
            </h3>
            <p className="text-muted-foreground">
              {isRTL 
                ? "لا توجد بيانات متاحة للفلتر المحدد."
                : "No data available for the selected filter."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  {activeTab === "students" ? (
                    <GraduationCap className="w-5 h-5 text-primary" />
                  ) : activeTab === "teachers" ? (
                    <Users className="w-5 h-5 text-primary" />
                  ) : (
                    <School className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "الإجمالي" : "Total"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statistics.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "الفئات" : "Categories"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {statistics.results.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "الأعلى" : "Highest"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.max(...statistics.results.map(r => r.count)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "المتوسط" : "Average"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(statistics.total / statistics.results.length).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>
                  {isRTL ? "نتائج التفصيل" : "Detailed Results"}
                </CardTitle>
                <CardDescription>
                  {isRTL 
                    ? `${statistics.category} مجمعة ${statistics.groupBy}`
                    : `${statistics.category} grouped ${statistics.groupBy}`}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" data-testid="button-export-stats">
                <Download className="w-4 h-4 me-2" />
                {isRTL ? "تصدير CSV" : "Export CSV"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الفئة" : "Category"}</TableHead>
                    <TableHead className="text-right">{isRTL ? "العدد" : "Count"}</TableHead>
                    <TableHead className="text-right">{isRTL ? "النسبة" : "Percentage"}</TableHead>
                    <TableHead className="hidden md:table-cell">{isRTL ? "التمثيل" : "Distribution"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.results.map((result, i) => (
                    <TableRow key={i} data-testid={`row-stat-${i}`}>
                      <TableCell className="font-medium">{result.label}</TableCell>
                      <TableCell className="text-right">{result.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((result.count / statistics.total) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(result.count / statistics.total) * 100}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" data-testid="badge-page-type">
              {isRTL ? "الإحصائيات" : "Statistics"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="heading-page-title">
              {isRTL ? "استعلام الإحصائيات" : "Statistics Query"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL 
                ? "استعلم عن البيانات الإحصائية للطلاب والمعلمين والمدارس حسب المنطقة والكتلة والمدرسة والمزيد."
                : "Query statistical data for students, teachers, and schools by region, cluster, school, and more."}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="students" className="flex items-center gap-2" data-testid="tab-students">
                    <GraduationCap className="w-4 h-4" />
                    {isRTL ? "الطلاب" : "Students"}
                  </TabsTrigger>
                  <TabsTrigger value="teachers" className="flex items-center gap-2" data-testid="tab-teachers">
                    <Users className="w-4 h-4" />
                    {isRTL ? "المعلمون" : "Teachers"}
                  </TabsTrigger>
                  <TabsTrigger value="schools" className="flex items-center gap-2" data-testid="tab-schools">
                    <School className="w-4 h-4" />
                    {isRTL ? "المدارس" : "Schools"}
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isRTL ? "تجميع:" : "Group by:"}
                    </span>
                  </div>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-group-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getGroupOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {isRTL ? option.labelAr : option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {regions && regions.length > 0 && (groupBy === "cluster" || groupBy === "school") && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isRTL ? "المنطقة:" : "Region:"}
                  </span>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-[200px]" data-testid="select-region">
                      <SelectValue placeholder={isRTL ? "جميع المناطق" : "All Regions"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? "جميع المناطق" : "All Regions"}</SelectItem>
                      {regions.map((region: any) => (
                        <SelectItem key={region.id} value={region.id.toString()}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <TabsContent value="students" className="mt-0">
                {renderStatCards()}
              </TabsContent>
              <TabsContent value="teachers" className="mt-0">
                {renderStatCards()}
              </TabsContent>
              <TabsContent value="schools" className="mt-0">
                {renderStatCards()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                {isRTL ? "ملاحظة" : "Note"}
              </Badge>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {isRTL ? "مصادر البيانات" : "Data Sources"}
              </h2>
            </div>

            <Card>
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {isRTL ? "تكامل نظام EMIS" : "EMIS Integration"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {isRTL 
                        ? "بعض البيانات الإحصائية غير متوفرة حالياً وسيتم جلبها من نظام معلومات إدارة التعليم (EMIS) لاحقاً. يشمل ذلك:"
                        : "Some statistical data is not currently available and will be fetched from the Education Management Information System (EMIS) later. This includes:"}
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {isRTL ? "إجمالي عدد الطلاب حسب العرق والوردية" : "Total students by ethnicity and shift"}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {isRTL ? "عدد المعلمين حسب المؤهل" : "Number of teachers by qualification"}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {isRTL ? "المعلمين المؤهلين ومؤهلاتهم" : "Qualified teachers and their qualifications"}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {isRTL ? "بيانات المدارس التفصيلية حسب الكتلة" : "Detailed school data by cluster"}
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
