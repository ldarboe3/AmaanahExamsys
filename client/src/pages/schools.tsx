import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  School as SchoolIcon,
  MapPin,
  Mail,
  Phone,
  FileText,
  Download,
  Plus,
  Loader2,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { School, Region, Cluster } from "@shared/schema";

const getSchoolTypeLabel = (type: string, isRTL: boolean) => {
  const labels: Record<string, { en: string; ar: string }> = {
    LBS: { en: "Lower Basic School", ar: "ابتدائي" },
    UBS: { en: "Upper Basic School", ar: "إعدادي" },
    BCS: { en: "Basic Cycle School", ar: "ابتدائي وإعدادي" },
    SSS: { en: "Senior Secondary School", ar: "ثانوي" },
    QM: { en: "Quranic Memorization", ar: "تحفيظ القرآن الكريم" },
    ECD: { en: "Early Childhood Development", ar: "روضة" },
  };
  return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
};

const getSchoolTypesDisplay = (school: { schoolTypes?: string[] | null; schoolType?: string | null }, isRTL: boolean) => {
  const types = school.schoolTypes && school.schoolTypes.length > 0 
    ? school.schoolTypes 
    : (school.schoolType ? [school.schoolType] : []);
  return types.map(t => getSchoolTypeLabel(t, isRTL)).join(", ");
};

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  verified: "bg-chart-2/10 text-chart-2",
  approved: "bg-chart-3/10 text-chart-3",
  rejected: "bg-destructive/10 text-destructive",
};

const getStatusLabel = (status: string, isRTL: boolean) => {
  const labels: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    verified: { en: "Verified", ar: "موثق" },
    approved: { en: "Approved", ar: "معتمد" },
    rejected: { en: "Rejected", ar: "مرفوض" },
  };
  return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
};

const SCHOOL_TYPES = ["LBS", "UBS", "BCS", "SSS", "QM", "ECD"] as const;

const addSchoolSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  registrarName: z.string().min(2, "Registrar name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  schoolTypes: z.array(z.string()).min(1, "Please select at least one school type"),
  regionId: z.string().optional(),
  clusterId: z.string().optional(),
});

type AddSchoolFormData = z.infer<typeof addSchoolSchema>;

function SchoolsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

interface SchoolWithRelations extends School {
  region?: { name: string };
  cluster?: { name: string };
  studentCount?: number;
}

export default function Schools() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const form = useForm<AddSchoolFormData>({
    resolver: zodResolver(addSchoolSchema),
    defaultValues: {
      name: "",
      registrarName: "",
      email: "",
      phone: "",
      address: "",
      schoolTypes: [],
      regionId: "",
      clusterId: "",
    },
  });

  const editForm = useForm<AddSchoolFormData>({
    resolver: zodResolver(addSchoolSchema),
    defaultValues: {
      name: "",
      registrarName: "",
      email: "",
      phone: "",
      address: "",
      schoolTypes: [],
      regionId: "",
      clusterId: "",
    },
  });

  const selectedRegionId = form.watch("regionId");
  const editSelectedRegionId = editForm.watch("regionId");

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (typeFilter !== "all") queryParams.set("schoolType", typeFilter);
  if (regionFilter !== "all") queryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") queryParams.set("clusterId", clusterFilter);
  const queryString = queryParams.toString();
  const schoolsUrl = queryString ? `/api/schools?${queryString}` : "/api/schools";

  const { data: schools, isLoading } = useQuery<SchoolWithRelations[]>({
    queryKey: [schoolsUrl],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const filteredClusters = clusters?.filter(
    (cluster) => !selectedRegionId || cluster.regionId === parseInt(selectedRegionId)
  );

  const editFilteredClusters = clusters?.filter(
    (cluster) => !editSelectedRegionId || cluster.regionId === parseInt(editSelectedRegionId)
  );

  // Clusters filtered by selected region filter (for the filter dropdown)
  const clustersForFilter = clusters?.filter(
    (cluster) => regionFilter === "all" || cluster.regionId === parseInt(regionFilter)
  );

  // Helper function to get region name by ID
  const getRegionName = (regionId: number | null | undefined): string => {
    if (!regionId || !regions) return t.common.notAssigned;
    const region = regions.find(r => r.id === regionId);
    return region?.name || t.common.notAssigned;
  };

  // Helper function to get cluster name by ID
  const getClusterName = (clusterId: number | null | undefined): string => {
    if (!clusterId || !clusters) return t.common.notAssigned;
    const cluster = clusters.find(c => c.id === clusterId);
    return cluster?.name || t.common.notAssigned;
  };

  // Helper to invalidate all school queries (including filtered variants)
  const invalidateSchoolQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/schools');
      },
    });
  };

  const createSchoolMutation = useMutation({
    mutationFn: async (data: AddSchoolFormData) => {
      return apiRequest("POST", "/api/schools", {
        ...data,
        schoolType: data.schoolTypes[0] || "LBS",
        schoolTypes: data.schoolTypes,
        regionId: data.regionId ? parseInt(data.regionId) : null,
        clusterId: data.clusterId ? parseInt(data.clusterId) : null,
      });
    },
    onSuccess: () => {
      invalidateSchoolQueries();
      toast({
        title: t.common.success,
        description: t.common.schoolAdded,
      });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.common.failedToAdd,
        variant: "destructive",
      });
    },
  });

  const approveSchoolMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      return apiRequest("POST", `/api/schools/${schoolId}/approve`);
    },
    onSuccess: () => {
      invalidateSchoolQueries();
      toast({
        title: t.common.success,
        description: t.common.schoolApproved,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.common.failedToApprove,
        variant: "destructive",
      });
    },
  });

  const rejectSchoolMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      return apiRequest("POST", `/api/schools/${schoolId}/reject`);
    },
    onSuccess: () => {
      invalidateSchoolQueries();
      toast({
        title: t.common.success,
        description: t.common.schoolRejected,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.common.failedToReject,
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      return apiRequest("POST", `/api/schools/${schoolId}/resend-verification`);
    },
    onSuccess: () => {
      invalidateSchoolQueries();
      toast({
        title: t.common.success,
        description: isRTL ? "تم إرسال رسالة التحقق بنجاح" : "Verification email sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل في إرسال البريد" : "Failed to send email"),
        variant: "destructive",
      });
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async (data: AddSchoolFormData & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest("PATCH", `/api/schools/${id}`, {
        ...updateData,
        schoolType: updateData.schoolTypes[0] || "LBS",
        schoolTypes: updateData.schoolTypes,
        regionId: updateData.regionId ? parseInt(updateData.regionId) : null,
        clusterId: updateData.clusterId ? parseInt(updateData.clusterId) : null,
      });
    },
    onSuccess: () => {
      invalidateSchoolQueries();
      toast({
        title: t.common.success,
        description: isRTL ? "تم تحديث المدرسة بنجاح" : "School updated successfully",
      });
      setShowEditDialog(false);
      editForm.reset();
      setSelectedSchool(null);
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل في تحديث المدرسة" : "Failed to update school"),
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (school: SchoolWithRelations) => {
    setSelectedSchool(school);
    const schoolTypes = school.schoolTypes && school.schoolTypes.length > 0 
      ? school.schoolTypes 
      : (school.schoolType ? [school.schoolType] : []);
    editForm.reset({
      name: school.name,
      registrarName: school.registrarName,
      email: school.email,
      phone: school.phone || "",
      address: school.address || "",
      schoolTypes: schoolTypes,
      regionId: school.regionId?.toString() || "",
      clusterId: school.clusterId?.toString() || "",
    });
    setShowEditDialog(true);
  };

  const onEditSubmit = (data: AddSchoolFormData) => {
    if (selectedSchool) {
      updateSchoolMutation.mutate({ ...data, id: selectedSchool.id });
    }
  };

  const filteredSchools = schools?.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const onSubmit = (data: AddSchoolFormData) => {
    createSchoolMutation.mutate(data);
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.schools.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة تسجيلات المدارس والموافقات" : "Manage school registrations and approvals"}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-school">
          <Plus className="w-4 h-4 me-2" />
          {t.schools.addSchool}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                placeholder={t.common.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pe-9" : "ps-9"}
                data-testid="input-search-schools"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={regionFilter} onValueChange={(value) => {
                setRegionFilter(value);
                setClusterFilter("all");
              }}>
                <SelectTrigger className="w-[160px]" data-testid="select-region-filter">
                  <SelectValue placeholder={t.schools.region} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allRegions}</SelectItem>
                  {regions?.map((region) => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clusterFilter} onValueChange={setClusterFilter} disabled={regionFilter === "all"}>
                <SelectTrigger className="w-[160px]" data-testid="select-cluster-filter">
                  <SelectValue placeholder={regionFilter === "all" ? t.common.selectRegionFirst : t.schools.cluster} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allClusters}</SelectItem>
                  {clustersForFilter?.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>
                      {cluster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                  <SelectValue placeholder={t.schools.schoolType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allTypes}</SelectItem>
                  <SelectItem value="LBS">LBS</SelectItem>
                  <SelectItem value="UBS">UBS</SelectItem>
                  <SelectItem value="BCS">BCS</SelectItem>
                  <SelectItem value="SSS">SSS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder={t.common.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allStatus}</SelectItem>
                  <SelectItem value="pending">{t.common.pending}</SelectItem>
                  <SelectItem value="verified">{t.common.verified}</SelectItem>
                  <SelectItem value="approved">{t.common.approved}</SelectItem>
                  <SelectItem value="rejected">{t.common.rejected}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schools Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-lg">{t.common.registeredSchools}</CardTitle>
              <CardDescription>
                {filteredSchools?.length || 0} {t.schools.title.toLowerCase()} {t.common.found}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 me-2" />
              {t.common.export}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SchoolsTableSkeleton />
          ) : filteredSchools && filteredSchools.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.schools.title}</TableHead>
                    <TableHead>{t.common.type}</TableHead>
                    <TableHead>{t.schools.region}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead>{t.common.students}</TableHead>
                    <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id} data-testid={`row-school-${school.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                            <SchoolIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{school.name}</p>
                            <p className="text-sm text-muted-foreground">{school.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {getSchoolTypesDisplay(school, isRTL)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getRegionName(school.regionId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[school.status || 'pending']} text-xs`}>
                          {getStatusLabel(school.status || 'pending', isRTL)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{school.studentCount || 0}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${school.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchool(school);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 me-2" />
                              {t.common.viewDetails}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(school)}
                              data-testid={`button-edit-${school.id}`}
                            >
                              <Pencil className="w-4 h-4 me-2" />
                              {isRTL ? "تعديل" : "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!school.isEmailVerified && school.status === 'pending' ? (
                              <DropdownMenuItem
                                onClick={() => resendVerificationMutation.mutate(school.id)}
                                className="text-chart-2"
                              >
                                <Mail className="w-4 h-4 me-2" />
                                {isRTL ? "إعادة إرسال البريد" : "Resend Verification Email"}
                              </DropdownMenuItem>
                            ) : null}
                            {school.status === 'pending' || school.status === 'verified' ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => approveSchoolMutation.mutate(school.id)}
                                  className="text-chart-3"
                                >
                                  <CheckCircle className="w-4 h-4 me-2" />
                                  {t.common.approve}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => rejectSchoolMutation.mutate(school.id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="w-4 h-4 me-2" />
                                  {t.common.reject}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <SchoolIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t.common.noResults}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? t.common.tryAdjusting
                  : isRTL ? "لم تسجل أي مدارس بعد" : "No schools have registered yet"}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 me-2" />
                {t.schools.addSchool}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add School Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.schools.addSchool}</DialogTitle>
            <DialogDescription>
              {isRTL ? "تسجيل مدرسة جديدة في نظام الامتحانات" : "Register a new school in the examination system"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRTL ? "اسم المدرسة *" : "School Name *"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isRTL ? "أدخل اسم المدرسة" : "Enter school name"}
                        {...field}
                        data-testid="input-school-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>{isRTL ? "أنواع المدرسة *" : "School Types *"}</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-md">
                      {SCHOOL_TYPES.map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="schoolTypes"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, type]);
                                    } else {
                                      field.onChange(currentValue.filter((v: string) => v !== type));
                                    }
                                  }}
                                  data-testid={`checkbox-school-type-${type.toLowerCase()}`}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {getSchoolTypeLabel(type, isRTL)}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrarName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "اسم المسجل *" : "Registrar Name *"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isRTL ? "أدخل الاسم الكامل للمسجل" : "Enter registrar full name"}
                          {...field}
                          data-testid="input-registrar-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "عنوان البريد الإلكتروني *" : "Email Address *"}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={isRTL ? "school@example.com" : "school@example.com"}
                          {...field}
                          data-testid="input-school-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "رقم الهاتف" : "Phone Number"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+220 XXXXXXX"
                          {...field}
                          data-testid="input-school-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.region}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("clusterId", "");
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder={isRTL ? "اختر المنطقة" : "Select region"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions?.map((region) => (
                            <SelectItem key={region.id} value={region.id.toString()}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clusterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "المجموعة" : "Cluster"}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!selectedRegionId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-cluster">
                            <SelectValue placeholder={selectedRegionId ? (isRTL ? "اختر المجموعة" : "Select cluster") : (isRTL ? "اختر المنطقة أولاً" : "Select region first")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredClusters?.map((cluster) => (
                            <SelectItem key={cluster.id} value={cluster.id.toString()}>
                              {cluster.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRTL ? "العنوان" : "Address"}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={isRTL ? "أدخل عنوان المدرسة" : "Enter school address"}
                        {...field}
                        data-testid="input-school-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddDialog(false);
                    form.reset();
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSchoolMutation.isPending}
                  data-testid="button-submit-school"
                >
                  {createSchoolMutation.isPending && (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  )}
                  {t.schools.addSchool}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          editForm.reset();
          setSelectedSchool(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تعديل المدرسة" : "Edit School"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "تحديث معلومات المدرسة" : "Update school information"}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRTL ? "اسم المدرسة *" : "School Name *"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isRTL ? "أدخل اسم المدرسة" : "Enter school name"}
                        {...field}
                        data-testid="input-edit-school-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="schoolTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>{isRTL ? "أنواع المدرسة *" : "School Types *"}</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-md">
                      {SCHOOL_TYPES.map((type) => (
                        <FormField
                          key={type}
                          control={editForm.control}
                          name="schoolTypes"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, type]);
                                    } else {
                                      field.onChange(currentValue.filter((v: string) => v !== type));
                                    }
                                  }}
                                  data-testid={`checkbox-edit-school-type-${type.toLowerCase()}`}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {getSchoolTypeLabel(type, isRTL)}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="registrarName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "اسم المسجل *" : "Registrar Name *"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isRTL ? "أدخل الاسم الكامل للمسجل" : "Enter registrar full name"}
                          {...field}
                          data-testid="input-edit-registrar-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "عنوان البريد الإلكتروني *" : "Email Address *"}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={isRTL ? "school@example.com" : "school@example.com"}
                          {...field}
                          data-testid="input-edit-school-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "رقم الهاتف" : "Phone Number"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+220 XXXXXXX"
                          {...field}
                          data-testid="input-edit-school-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.region}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          editForm.setValue("clusterId", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-region">
                            <SelectValue placeholder={isRTL ? "اختر المنطقة" : "Select region"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions?.map((region) => (
                            <SelectItem key={region.id} value={region.id.toString()}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="clusterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRTL ? "المجموعة" : "Cluster"}</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!editSelectedRegionId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-cluster">
                            <SelectValue placeholder={editSelectedRegionId ? (isRTL ? "اختر المجموعة" : "Select cluster") : (isRTL ? "اختر المنطقة أولاً" : "Select region first")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {editFilteredClusters?.map((cluster) => (
                            <SelectItem key={cluster.id} value={cluster.id.toString()}>
                              {cluster.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isRTL ? "العنوان" : "Address"}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={isRTL ? "أدخل عنوان المدرسة" : "Enter school address"}
                        {...field}
                        data-testid="input-edit-school-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowEditDialog(false);
                    editForm.reset();
                    setSelectedSchool(null);
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateSchoolMutation.isPending}
                  data-testid="button-submit-edit-school"
                >
                  {updateSchoolMutation.isPending && (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  )}
                  {isRTL ? "حفظ التغييرات" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* School Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل المدرسة" : "School Details"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "معلومات كاملة عن تسجيل المدرسة" : "Complete information about the school registration"}
            </DialogDescription>
          </DialogHeader>
          {selectedSchool && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center">
                  <SchoolIcon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedSchool.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getSchoolTypesDisplay(selectedSchool, isRTL)}
                  </p>
                  <Badge className={`${statusColors[selectedSchool.status || 'pending']} mt-2`}>
                    {getStatusLabel(selectedSchool.status || 'pending', isRTL)}
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedSchool.email}</span>
                  </div>
                  {selectedSchool.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedSchool.phone}</span>
                    </div>
                  )}
                  {selectedSchool.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedSchool.address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t.schools.region}:</span>{" "}
                    <span className="font-medium">{getRegionName(selectedSchool.regionId)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? "المجموعة" : "Cluster"}:</span>{" "}
                    <span className="font-medium">{getClusterName(selectedSchool.clusterId)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? "المسجل" : "Registrar"}:</span>{" "}
                    <span className="font-medium">{selectedSchool.registrarName}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-sm font-medium mb-3">{isRTL ? "المستندات" : "Documents"}</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { label: isRTL ? "شهادة التسجيل" : "Registration Certificate", url: selectedSchool.registrationCertificate },
                    { label: isRTL ? "ملكية الأرض" : "Land Ownership", url: selectedSchool.landOwnership },
                    { label: isRTL ? "رخصة التشغيل" : "Operational License", url: selectedSchool.operationalLicense },
                  ].map((doc) => (
                    <div
                      key={doc.label}
                      className="p-3 border rounded-md flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.url ? (isRTL ? "تم الرفع" : "Uploaded") : (isRTL ? "لم يتم الرفع" : "Not uploaded")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t.common.close}
            </Button>
            {selectedSchool && (selectedSchool.status === 'pending' || selectedSchool.status === 'verified') && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    rejectSchoolMutation.mutate(selectedSchool.id);
                    setShowDetailsDialog(false);
                  }}
                >
                  {t.common.reject}
                </Button>
                <Button
                  onClick={() => {
                    approveSchoolMutation.mutate(selectedSchool.id);
                    setShowDetailsDialog(false);
                  }}
                >
                  {t.common.approve}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
