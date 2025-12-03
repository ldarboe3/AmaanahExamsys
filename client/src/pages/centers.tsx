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
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  MapPin,
  Users,
  School,
  Phone,
  Mail,
  Building2,
  Loader2,
  Wand2,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExamCenter, Region, Cluster } from "@shared/schema";

const centerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code is required"),
  address: z.string().optional(),
  regionId: z.coerce.number().min(1, "Region is required"),
  clusterId: z.coerce.number().min(1, "Cluster is required"),
  capacity: z.coerce.number().min(10, "Capacity must be at least 10"),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

type CenterFormData = z.infer<typeof centerSchema>;

interface CenterWithRelations extends ExamCenter {
  region?: { name: string };
  cluster?: { name: string };
  assignedSchoolsCount?: number;
  assignedStudentsCount?: number;
}

function CenterCard({ 
  center, 
  onEdit, 
  onViewDetails, 
  onDelete,
  isRTL,
  t
}: { 
  center: CenterWithRelations; 
  onEdit: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  isRTL: boolean;
  t: any;
}) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{center.name}</CardTitle>
              <CardDescription className="text-sm">
                {t.common.code}: {center.code}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-actions-${center.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 me-2" />
                {t.common.edit}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/centers/${center.id}`}>
                  <Eye className="w-4 h-4 me-2" />
                  {t.centers.viewDetails}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 me-2" />
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span>{center.region?.name || t.centers.noRegion} / {center.cluster?.name || t.centers.noCluster}</span>
          </div>
          {center.address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5" />
              <span className="line-clamp-2">{center.address}</span>
            </div>
          )}
          {center.contactPerson && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{center.contactPerson} {center.contactPhone && `(${center.contactPhone})`}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{center.capacity?.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-xs text-muted-foreground">{t.centers.capacity}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{(center.assignedSchoolsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-xs text-muted-foreground">{t.schools.title}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{(center.assignedStudentsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-xs text-muted-foreground">{t.students.title}</p>
          </div>
        </div>

        <div className="mt-4">
          <Badge variant={center.isActive ? "default" : "secondary"} className="text-xs">
            {center.isActive ? t.common.active : t.common.inactive}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function CenterCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-md" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Centers() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CenterWithRelations | null>(null);

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (regionFilter !== "all") queryParams.set("regionId", regionFilter);
  if (clusterFilter !== "all") queryParams.set("clusterId", clusterFilter);
  const queryString = queryParams.toString();
  const centersUrl = queryString ? `/api/centers?${queryString}` : "/api/centers";

  const { data: centers, isLoading } = useQuery<CenterWithRelations[]>({
    queryKey: [centersUrl],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  // Filter clusters based on selected region
  const clustersForFilter = clusters?.filter(
    (cluster) => regionFilter === "all" || cluster.regionId === parseInt(regionFilter)
  );

  const form = useForm<CenterFormData>({
    resolver: zodResolver(centerSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      regionId: 0,
      clusterId: 0,
      capacity: 500,
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  // Helper to invalidate all center queries (including filtered variants)
  const invalidateCenterQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/centers');
      },
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CenterFormData) => {
      return apiRequest("POST", "/api/centers", data);
    },
    onSuccess: () => {
      invalidateCenterQueries();
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: t.centers.centerCreated,
        description: t.centers.centerCreatedDesc,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.centers.failedToCreate,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CenterFormData }) => {
      return apiRequest("PATCH", `/api/centers/${id}`, data);
    },
    onSuccess: () => {
      invalidateCenterQueries();
      setShowEditDialog(false);
      setSelectedCenter(null);
      form.reset();
      toast({
        title: t.centers.centerUpdated,
        description: t.centers.centerUpdatedDesc,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.centers.failedToUpdate,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/centers/${id}`);
    },
    onSuccess: () => {
      invalidateCenterQueries();
      setShowDeleteDialog(false);
      setSelectedCenter(null);
      toast({
        title: t.centers.centerDeleted,
        description: t.centers.centerDeletedDesc,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: t.centers.failedToDelete,
        variant: "destructive",
      });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/center-assignments/auto-assign", { 
        examYearId: (await fetch("/api/exam-years/active").then(r => r.json())).id 
      });
      return response;
    },
    onSuccess: (data: any) => {
      invalidateCenterQueries();
      setShowAutoAssignDialog(false);
      toast({
        title: "Schools Assigned",
        description: `Successfully assigned ${data.assigned} schools. ${data.skipped > 0 ? `${data.skipped} schools could not be assigned.` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: "Failed to auto-assign schools",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (center: CenterWithRelations) => {
    setSelectedCenter(center);
    form.reset({
      name: center.name,
      code: center.code,
      address: center.address || "",
      regionId: center.regionId || 0,
      clusterId: center.clusterId || 0,
      capacity: center.capacity || 500,
      contactPerson: center.contactPerson || "",
      contactPhone: center.contactPhone || "",
      contactEmail: center.contactEmail || "",
    });
    setShowEditDialog(true);
  };

  const openViewDetails = (center: CenterWithRelations) => {
    setSelectedCenter(center);
    setShowDetailsDialog(true);
  };

  const openDeleteDialog = (center: CenterWithRelations) => {
    setSelectedCenter(center);
    setShowDeleteDialog(true);
  };

  const handleSubmit = (data: CenterFormData) => {
    if (showEditDialog && selectedCenter) {
      updateMutation.mutate({ id: selectedCenter.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCenters = centers?.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCapacity = centers?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0;
  const totalAssigned = centers?.reduce((sum, c) => sum + (c.assignedStudentsCount || 0), 0) || 0;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.centers.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.centers.manageDescription}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutoAssignDialog(true)} data-testid="button-auto-assign">
            <Wand2 className="w-4 h-4 me-2" />
            Auto-Assign Schools
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-add-center">
            <Plus className="w-4 h-4 me-2" />
            {t.centers.addCenter}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.centers.totalCenters}</p>
                <p className="text-2xl font-semibold">{(centers?.length || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.centers.totalCapacity}</p>
                <p className="text-2xl font-semibold">{totalCapacity.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.centers.studentsAssigned}</p>
                <p className="text-2xl font-semibold">{totalAssigned.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.common.active}</p>
                <p className="text-2xl font-semibold">
                  {(centers?.filter(c => c.isActive).length || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.centers.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
                data-testid="input-search-centers"
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
                  <SelectValue placeholder={regionFilter === "all" 
                    ? t.common.selectRegionFirst 
                    : t.schools.cluster} />
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Centers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <CenterCardSkeleton />
            <CenterCardSkeleton />
            <CenterCardSkeleton />
          </>
        ) : filteredCenters && filteredCenters.length > 0 ? (
          filteredCenters.map((center) => (
            <CenterCard
              key={center.id}
              center={center}
              onEdit={() => openEditDialog(center)}
              onViewDetails={() => openViewDetails(center)}
              onDelete={() => openDeleteDialog(center)}
              isRTL={isRTL}
              t={t}
            />
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t.centers.noCentersFound}</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? t.centers.tryAdjustSearch : t.centers.addFirstCenter}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  {t.centers.addCenter}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.centers.addCenter}</DialogTitle>
            <DialogDescription>
              {t.centers.createNewCenter}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t.centers.centerName}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.centers.centerName} {...field} data-testid="input-center-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.code}</FormLabel>
                      <FormControl>
                        <Input placeholder="CHS001" {...field} data-testid="input-center-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.capacity}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-capacity" />
                      </FormControl>
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
                    <FormLabel>{t.common.address}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t.centers.fullAddress} {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.region}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder={t.centers.selectRegion} />
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
                <FormField
                  control={form.control}
                  name="clusterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.schools.cluster}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cluster">
                            <SelectValue placeholder={t.centers.selectCluster} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clusters?.map((cluster) => (
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.contactPerson}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.common.name} {...field} data-testid="input-contact-person" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.phone}</FormLabel>
                      <FormControl>
                        <Input placeholder="+220 1234567" {...field} data-testid="input-contact-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.common.email}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@example.com" {...field} data-testid="input-contact-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t.centers.creating : t.centers.createCenter}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Center Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.centers.editCenter}</DialogTitle>
            <DialogDescription>
              {t.centers.updateDetails}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.centerName}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.centers.centerName} {...field} data-testid="input-edit-center-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.code}</FormLabel>
                      <FormControl>
                        <Input placeholder="CHS001" {...field} data-testid="input-edit-center-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.capacity}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-edit-capacity" />
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
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-region">
                            <SelectValue placeholder={t.centers.selectRegion} />
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

              <FormField
                control={form.control}
                name="clusterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.schools.cluster}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-cluster">
                          <SelectValue placeholder={t.centers.selectCluster} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clusters?.map((cluster) => (
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.common.address}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t.centers.fullAddress} {...field} data-testid="input-edit-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.centers.contactPerson}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.common.name} {...field} data-testid="input-edit-contact-person" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.common.phone}</FormLabel>
                      <FormControl>
                        <Input placeholder="+220 1234567" {...field} data-testid="input-edit-contact-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.common.email}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@example.com" {...field} data-testid="input-edit-contact-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {updateMutation.isPending ? t.centers.saving : t.common.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.centers.centerDetails}</DialogTitle>
            <DialogDescription>
              {t.centers.detailedInfo}
            </DialogDescription>
          </DialogHeader>
          {selectedCenter && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCenter.name}</h3>
                  <p className="text-muted-foreground">{t.common.code}: {selectedCenter.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t.schools.region}</p>
                  <p className="font-medium">{selectedCenter.region?.name || t.centers.noRegion}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t.schools.cluster}</p>
                  <p className="font-medium">{selectedCenter.cluster?.name || t.centers.noCluster}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t.centers.capacity}</p>
                  <p className="font-medium">{selectedCenter.capacity?.toLocaleString(isRTL ? 'ar-EG' : 'en-US') || t.centers.noRegion}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t.common.status}</p>
                  <Badge variant={selectedCenter.isActive ? "default" : "secondary"}>
                    {selectedCenter.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </div>
              </div>

              {selectedCenter.address && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t.common.address}</p>
                  <p className="font-medium">{selectedCenter.address}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t.centers.contactInfo}</p>
                <div className="space-y-2">
                  {selectedCenter.contactPerson && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCenter.contactPerson}</span>
                    </div>
                  )}
                  {selectedCenter.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCenter.contactPhone}</span>
                    </div>
                  )}
                  {selectedCenter.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCenter.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-2xl font-bold">{(selectedCenter.assignedSchoolsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                  <p className="text-sm text-muted-foreground">{t.centers.schoolsAssigned}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-md">
                  <p className="text-2xl font-bold">{(selectedCenter.assignedStudentsCount || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                  <p className="text-sm text-muted-foreground">{t.centers.studentsAssigned}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t.common.close}
            </Button>
            <Button onClick={() => {
              setShowDetailsDialog(false);
              if (selectedCenter) openEditDialog(selectedCenter);
            }}>
              <Edit className="w-4 h-4 me-2" />
              {t.common.edit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.centers.deleteCenter}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.centers.deleteConfirm.replace('this center', `"${selectedCenter?.name}"`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCenter && deleteMutation.mutate(selectedCenter.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Assign Schools Dialog */}
      <AlertDialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Assign Schools to Centers</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically assign unassigned schools to examination centers based on:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Same cluster priority</li>
                <li>Same region as fallback</li>
                <li>Center capacity limits</li>
              </ul>
              <p className="mt-2 font-medium">Schools already assigned will not be affected.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => autoAssignMutation.mutate()}
              disabled={autoAssignMutation.isPending}
            >
              {autoAssignMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <Wand2 className="w-4 h-4 me-2" />
              Run Auto-Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
