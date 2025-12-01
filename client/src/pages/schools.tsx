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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { School, Region, Cluster } from "@shared/schema";

const schoolTypeLabels: Record<string, string> = {
  LBS: "Lower Basic School",
  UBS: "Upper Basic School",
  BCS: "Basic Cycle School",
  SSS: "Senior Secondary School",
};

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  verified: "bg-chart-2/10 text-chart-2",
  approved: "bg-chart-3/10 text-chart-3",
  rejected: "bg-destructive/10 text-destructive",
};

const addSchoolSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  registrarName: z.string().min(2, "Registrar name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  schoolType: z.enum(["LBS", "UBS", "BCS", "SSS"], {
    required_error: "Please select a school type",
  }),
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const form = useForm<AddSchoolFormData>({
    resolver: zodResolver(addSchoolSchema),
    defaultValues: {
      name: "",
      registrarName: "",
      email: "",
      phone: "",
      address: "",
      schoolType: undefined,
      regionId: "",
      clusterId: "",
    },
  });

  const selectedRegionId = form.watch("regionId");

  const { data: schools, isLoading } = useQuery<SchoolWithRelations[]>({
    queryKey: ["/api/schools", statusFilter, typeFilter],
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

  const createSchoolMutation = useMutation({
    mutationFn: async (data: AddSchoolFormData) => {
      return apiRequest("POST", "/api/schools", {
        ...data,
        regionId: data.regionId ? parseInt(data.regionId) : null,
        clusterId: data.clusterId ? parseInt(data.clusterId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      toast({
        title: "School Added",
        description: "The school has been registered successfully.",
      });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add school. Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveSchoolMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      return apiRequest("POST", `/api/schools/${schoolId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      toast({
        title: "School Approved",
        description: "The school has been approved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve school. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectSchoolMutation = useMutation({
    mutationFn: async (schoolId: number) => {
      return apiRequest("POST", `/api/schools/${schoolId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      toast({
        title: "School Rejected",
        description: "The school has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject school. Please try again.",
        variant: "destructive",
      });
    },
  });

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Schools</h1>
          <p className="text-muted-foreground mt-1">
            Manage school registrations and approvals
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-school">
          <Plus className="w-4 h-4 me-2" />
          Add School
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search schools by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
                data-testid="input-search-schools"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                  <SelectValue placeholder="School Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="LBS">LBS</SelectItem>
                  <SelectItem value="UBS">UBS</SelectItem>
                  <SelectItem value="BCS">BCS</SelectItem>
                  <SelectItem value="SSS">SSS</SelectItem>
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
              <CardTitle className="text-lg">Registered Schools</CardTitle>
              <CardDescription>
                {filteredSchools?.length || 0} schools found
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 me-2" />
              Export
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
                    <TableHead>School</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                          {school.schoolType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {school.region?.name || "Not assigned"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[school.status || 'pending']} text-xs capitalize`}>
                          {school.status}
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
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {school.status === 'pending' || school.status === 'verified' ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => approveSchoolMutation.mutate(school.id)}
                                  className="text-chart-3"
                                >
                                  <CheckCircle className="w-4 h-4 me-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => rejectSchoolMutation.mutate(school.id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="w-4 h-4 me-2" />
                                  Reject
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
              <h3 className="text-lg font-medium mb-2">No schools found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "No schools have registered yet"}
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 me-2" />
                Add First School
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add School Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>
              Register a new school in the examination system
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter school name"
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
                  name="schoolType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-school-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LBS">Lower Basic School (LBS)</SelectItem>
                          <SelectItem value="UBS">Upper Basic School (UBS)</SelectItem>
                          <SelectItem value="BCS">Basic Cycle School (BCS)</SelectItem>
                          <SelectItem value="SSS">Senior Secondary School (SSS)</SelectItem>
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
                  name="registrarName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registrar Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter registrar full name"
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
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="school@example.com"
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
                      <FormLabel>Phone Number</FormLabel>
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
                      <FormLabel>Region</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("clusterId", "");
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="Select region" />
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
                      <FormLabel>Cluster</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!selectedRegionId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-cluster">
                            <SelectValue placeholder={selectedRegionId ? "Select cluster" : "Select region first"} />
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
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter school address"
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
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSchoolMutation.isPending}
                  data-testid="button-submit-school"
                >
                  {createSchoolMutation.isPending && (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  )}
                  Add School
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* School Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>School Details</DialogTitle>
            <DialogDescription>
              Complete information about the school registration
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
                    {schoolTypeLabels[selectedSchool.schoolType]}
                  </p>
                  <Badge className={`${statusColors[selectedSchool.status || 'pending']} mt-2`}>
                    {selectedSchool.status}
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
                    <span className="text-muted-foreground">Region:</span>{" "}
                    <span className="font-medium">{selectedSchool.region?.name || "Not assigned"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cluster:</span>{" "}
                    <span className="font-medium">{selectedSchool.cluster?.name || "Not assigned"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Registrar:</span>{" "}
                    <span className="font-medium">{selectedSchool.registrarName}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-sm font-medium mb-3">Documents</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { label: "Registration Certificate", url: selectedSchool.registrationCertificate },
                    { label: "Land Ownership", url: selectedSchool.landOwnership },
                    { label: "Operational License", url: selectedSchool.operationalLicense },
                  ].map((doc) => (
                    <div
                      key={doc.label}
                      className="p-3 border rounded-md flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.url ? "Uploaded" : "Not uploaded"}
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
              Close
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
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    approveSchoolMutation.mutate(selectedSchool.id);
                    setShowDetailsDialog(false);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
