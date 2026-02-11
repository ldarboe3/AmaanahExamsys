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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, MoreVertical, Eye, Edit, Plus, UserCheck, Trash2,
  Shield, ShieldAlert, ShieldOff, ShieldCheck, CreditCard,
  Upload, Clock, CheckCircle, XCircle, AlertTriangle, IdCard, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StaffProfile, Region, Cluster } from "@shared/schema";

const staffProfileSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  middleName: z.string().optional(),
  fullNameArabic: z.string().optional(),
  role: z.enum([
    "hq_director", "hq_staff", "regional_coordinator", "regional_staff",
    "cluster_officer", "examiner", "invigilator", "supervisor", "monitor", "temporary_staff",
  ]),
  regionId: z.coerce.number().optional().nullable(),
  clusterId: z.coerce.number().optional().nullable(),
  phone: z.string().optional(),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
});

type StaffFormData = z.infer<typeof staffProfileSchema>;

const statusConfig: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  created: { label: "Created", color: "bg-chart-5/10 text-chart-5", icon: Clock },
  printed: { label: "Printed", color: "bg-chart-4/10 text-chart-4", icon: CreditCard },
  issued: { label: "Issued", color: "bg-chart-1/10 text-chart-1", icon: IdCard },
  activated: { label: "Activated", color: "bg-chart-2/10 text-chart-2", icon: ShieldCheck },
  suspended: { label: "Suspended", color: "bg-chart-5/10 text-chart-5", icon: ShieldAlert },
  revoked: { label: "Revoked", color: "bg-destructive/10 text-destructive", icon: ShieldOff },
};

const roleLabels: Record<string, string> = {
  hq_director: "HQ Director",
  hq_staff: "HQ Staff",
  regional_coordinator: "Regional Coordinator",
  regional_staff: "Regional Staff",
  cluster_officer: "Cluster Officer",
  examiner: "Examiner",
  invigilator: "Invigilator",
  supervisor: "Supervisor",
  monitor: "Monitor",
  temporary_staff: "Temporary Staff",
};

function StaffTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function StaffIdentityPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffProfile | null>(null);
  const [statusChangeStaff, setStatusChangeStaff] = useState<{ staff: StaffProfile; newStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: staffProfiles = [], isLoading } = useQuery<StaffProfile[]>({
    queryKey: ["/api/staff-profiles", { search: searchTerm, status: statusFilter !== "all" ? statusFilter : undefined, role: roleFilter !== "all" ? roleFilter : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/staff-profiles?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff profiles");
      return res.json();
    },
  });

  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"] });
  const { data: clusters = [] } = useQuery<Cluster[]>({ queryKey: ["/api/clusters"] });

  const { data: staffEvents = [] } = useQuery({
    queryKey: ["/api/staff-profiles", viewingStaff?.id, "events"],
    queryFn: async () => {
      if (!viewingStaff) return [];
      const res = await fetch(`/api/staff-profiles/${viewingStaff.id}/events`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    enabled: !!viewingStaff,
  });

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffProfileSchema),
    defaultValues: {
      firstName: "", lastName: "", middleName: "", fullNameArabic: "",
      role: "examiner", regionId: null, clusterId: null, phone: "", email: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const res = await apiRequest("POST", "/api/staff-profiles", data);
      return res.json();
    },
    onSuccess: async (newStaff) => {
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/staff-profiles/${newStaff.id}/photo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/staff-profiles"] });
      setShowCreateDialog(false);
      setPhotoFile(null);
      form.reset();
      toast({ title: "Staff profile created", description: `Staff ID: ${newStaff.staffIdNumber}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StaffFormData> }) => {
      const res = await apiRequest("PATCH", `/api/staff-profiles/${id}`, data);
      return res.json();
    },
    onSuccess: async (updatedStaff) => {
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/staff-profiles/${updatedStaff.id}/photo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/staff-profiles"] });
      setEditingStaff(null);
      setPhotoFile(null);
      form.reset();
      toast({ title: "Staff profile updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason?: string }) => {
      const res = await apiRequest("POST", `/api/staff-profiles/${id}/status`, { status, reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-profiles"] });
      setStatusChangeStaff(null);
      setStatusReason("");
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/staff-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-profiles"] });
      toast({ title: "Staff profile deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    form.reset({
      firstName: "", lastName: "", middleName: "", fullNameArabic: "",
      role: "examiner", regionId: null, clusterId: null, phone: "", email: "",
    });
    setPhotoFile(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (staff: StaffProfile) => {
    form.reset({
      firstName: staff.firstName,
      lastName: staff.lastName,
      middleName: staff.middleName || "",
      fullNameArabic: staff.fullNameArabic || "",
      role: staff.role as StaffFormData["role"],
      regionId: staff.regionId,
      clusterId: staff.clusterId,
      phone: staff.phone || "",
      email: staff.email || "",
    });
    setPhotoFile(null);
    setEditingStaff(staff);
  };

  const onSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getNextStatuses = (current: string): string[] => {
    const transitions: Record<string, string[]> = {
      created: ["printed"],
      printed: ["issued"],
      issued: ["activated"],
      activated: ["suspended", "revoked"],
      suspended: ["activated", "revoked"],
    };
    return transitions[current] || [];
  };

  const filteredRegionClusters = form.watch("regionId")
    ? clusters.filter((c) => c.regionId === form.watch("regionId"))
    : clusters;

  const statusCounts = {
    total: staffProfiles.length,
    activated: staffProfiles.filter((s) => s.status === "activated").length,
    suspended: staffProfiles.filter((s) => s.status === "suspended").length,
    created: staffProfiles.filter((s) => s.status === "created").length,
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6" data-testid="staff-identity-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Staff Identity Management</h1>
          <p className="text-muted-foreground">Manage AIITS staff profiles, ID cards, and verification</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-staff">
          <Plus className="mr-2 h-4 w-4" />
          New Staff Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-staff">{statusCounts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <ShieldCheck className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-staff">{statusCounts.activated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <ShieldAlert className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-suspended-staff">{statusCounts.suspended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-staff">{statusCounts.created}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Profiles</CardTitle>
          <CardDescription>Search, filter, and manage staff identity records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-staff"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <StaffTableSkeleton />
          ) : staffProfiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No staff profiles found</p>
              <p className="text-sm">Create a new staff profile to get started</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffProfiles.map((staff) => {
                    const sConfig = statusConfig[staff.status] || statusConfig.created;
                    const StatusIcon = sConfig.icon;
                    const regionName = regions.find((r) => r.id === staff.regionId)?.name;
                    const clusterName = clusters.find((c) => c.id === staff.clusterId)?.name;
                    return (
                      <TableRow key={staff.id} data-testid={`row-staff-${staff.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={staff.photoUrl || undefined} alt={staff.firstName} />
                              <AvatarFallback>{staff.firstName[0]}{staff.lastName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{staff.firstName} {staff.middleName ? `${staff.middleName} ` : ""}{staff.lastName}</div>
                              {staff.fullNameArabic && (
                                <div className="text-xs text-muted-foreground" dir="rtl">{staff.fullNameArabic}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded" data-testid={`text-staff-id-${staff.id}`}>
                            {staff.staffIdNumber}
                          </code>
                        </TableCell>
                        <TableCell>{roleLabels[staff.role] || staff.role}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {regionName || "—"}
                            {clusterName && <span className="text-muted-foreground"> / {clusterName}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={sConfig.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {sConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {staff.phone && <div>{staff.phone}</div>}
                            {staff.email && <div className="text-muted-foreground text-xs">{staff.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${staff.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingStaff(staff)} data-testid={`menu-view-${staff.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(staff)} data-testid={`menu-edit-${staff.id}`}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  window.open(`/api/staff-profiles/${staff.id}/id-card`, '_blank');
                                }}
                                data-testid={`menu-id-card-${staff.id}`}
                              >
                                <Download className="mr-2 h-4 w-4" /> Generate ID Card
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {getNextStatuses(staff.status).map((ns) => (
                                <DropdownMenuItem
                                  key={ns}
                                  onClick={() => setStatusChangeStaff({ staff, newStatus: ns })}
                                  data-testid={`menu-status-${ns}-${staff.id}`}
                                >
                                  {statusConfig[ns] ? (() => { const I = statusConfig[ns].icon; return <I className="mr-2 h-4 w-4" />; })() : null}
                                  Mark as {statusConfig[ns]?.label || ns}
                                </DropdownMenuItem>
                              ))}
                              {staff.status === "created" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      if (confirm("Delete this staff profile? This cannot be undone.")) {
                                        deleteMutation.mutate(staff.id);
                                      }
                                    }}
                                    data-testid={`menu-delete-${staff.id}`}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog || !!editingStaff} onOpenChange={(open) => {
        if (!open) { setShowCreateDialog(false); setEditingStaff(null); form.reset(); setPhotoFile(null); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Profile" : "Create Staff Profile"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff member details" : "Add a new staff member to the AIITS system"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : editingStaff?.photoUrl || undefined} />
                  <AvatarFallback>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("photo-upload")?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Upload Photo
                    </Button>
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    data-testid="input-photo-upload"
                  />
                  {photoFile && <p className="text-xs text-muted-foreground mt-1">{photoFile.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="middleName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl><Input {...field} data-testid="input-middle-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fullNameArabic" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (Arabic)</FormLabel>
                    <FormControl><Input {...field} dir="rtl" data-testid="input-name-arabic" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="regionId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select
                      value={field.value?.toString() || "none"}
                      onValueChange={(v) => {
                        field.onChange(v === "none" ? null : parseInt(v));
                        form.setValue("clusterId", null);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-region">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="clusterId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster</FormLabel>
                    <Select
                      value={field.value?.toString() || "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-cluster">
                          <SelectValue placeholder="Select cluster" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredRegionClusters.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} type="email" data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowCreateDialog(false); setEditingStaff(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-staff">
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingStaff ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusChangeStaff} onOpenChange={(open) => { if (!open) { setStatusChangeStaff(null); setStatusReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Staff Status</DialogTitle>
            <DialogDescription>
              {statusChangeStaff && (
                <>Change status of <strong>{statusChangeStaff.staff.firstName} {statusChangeStaff.staff.lastName}</strong> to <strong>{statusConfig[statusChangeStaff.newStatus]?.label}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          {statusChangeStaff && (statusChangeStaff.newStatus === "suspended" || statusChangeStaff.newStatus === "revoked") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={`Reason for ${statusChangeStaff.newStatus === "suspended" ? "suspension" : "revocation"}...`}
                data-testid="input-status-reason"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeStaff(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (statusChangeStaff) {
                  statusMutation.mutate({
                    id: statusChangeStaff.staff.id,
                    status: statusChangeStaff.newStatus,
                    reason: statusReason || undefined,
                  });
                }
              }}
              disabled={statusMutation.isPending}
              data-testid="button-confirm-status"
            >
              {statusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingStaff} onOpenChange={(open) => { if (!open) setViewingStaff(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Profile Details</DialogTitle>
          </DialogHeader>
          {viewingStaff && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={viewingStaff.photoUrl || undefined} alt={viewingStaff.firstName} />
                  <AvatarFallback className="text-xl">{viewingStaff.firstName[0]}{viewingStaff.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {viewingStaff.firstName} {viewingStaff.middleName ? `${viewingStaff.middleName} ` : ""}{viewingStaff.lastName}
                  </h3>
                  {viewingStaff.fullNameArabic && (
                    <p className="text-muted-foreground" dir="rtl">{viewingStaff.fullNameArabic}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <code className="text-sm bg-muted px-2 py-0.5 rounded">{viewingStaff.staffIdNumber}</code>
                    <Badge variant="secondary" className={statusConfig[viewingStaff.status]?.color}>
                      {statusConfig[viewingStaff.status]?.label || viewingStaff.status}
                    </Badge>
                    <Badge variant="outline">{roleLabels[viewingStaff.role] || viewingStaff.role}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Region:</span>{" "}
                  {regions.find((r) => r.id === viewingStaff.regionId)?.name || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Cluster:</span>{" "}
                  {clusters.find((c) => c.id === viewingStaff.clusterId)?.name || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span> {viewingStaff.phone || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {viewingStaff.email || "—"}
                </div>
                {viewingStaff.confirmationCode && (
                  <div>
                    <span className="text-muted-foreground">Confirmation Code:</span>{" "}
                    <code className="bg-muted px-2 py-0.5 rounded">{viewingStaff.confirmationCode}</code>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {viewingStaff.createdAt ? new Date(viewingStaff.createdAt).toLocaleDateString() : "—"}
                </div>
              </div>

              {(viewingStaff.suspendReason || viewingStaff.revokeReason) && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {viewingStaff.status === "suspended" ? "Suspension Reason" : "Revocation Reason"}
                  </p>
                  <p className="text-sm mt-1">{viewingStaff.suspendReason || viewingStaff.revokeReason}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-3">Audit Trail</h4>
                {staffEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events recorded</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {staffEvents.map((event: any) => (
                      <div key={event.id} className="flex items-start gap-3 text-sm border-l-2 border-border pl-3">
                        <div className="flex-1">
                          <div className="font-medium capitalize">{event.eventType?.replace(/_/g, " ")}</div>
                          {event.details && <p className="text-muted-foreground">{event.details}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
