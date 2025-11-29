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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Search,
  MoreVertical,
  Eye,
  Edit,
  Plus,
  UserCheck,
  Mail,
  Phone,
  Briefcase,
  FileCheck,
  DollarSign,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Examiner, Region } from "@shared/schema";

const examinerSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  regionId: z.coerce.number().optional(),
});

type ExaminerFormData = z.infer<typeof examinerSchema>;

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  verified: "bg-chart-2/10 text-chart-2",
  active: "bg-chart-3/10 text-chart-3",
  inactive: "bg-muted text-muted-foreground",
};

interface ExaminerWithRelations extends Examiner {
  region?: { name: string };
  assignmentsCount?: number;
}

function ExaminersTableSkeleton() {
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
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function Examiners() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedExaminer, setSelectedExaminer] = useState<ExaminerWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: examiners, isLoading } = useQuery<ExaminerWithRelations[]>({
    queryKey: ["/api/examiners", statusFilter],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const form = useForm<ExaminerFormData>({
    resolver: zodResolver(examinerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      qualification: "",
      specialization: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExaminerFormData) => {
      return apiRequest("POST", "/api/examiners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/examiners"] });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Examiner Added",
        description: "The examiner has been added and will receive a verification email.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add examiner. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ExaminerFormData) => {
    createMutation.mutate(data);
  };

  const filteredExaminers = examiners?.filter((examiner) => {
    const fullName = `${examiner.firstName} ${examiner.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      examiner.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeCount = examiners?.filter(e => e.status === 'active').length || 0;
  const pendingCount = examiners?.filter(e => e.status === 'pending').length || 0;

  const formatCurrency = (amount: string | number | null) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GMD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Examiners</h1>
          <p className="text-muted-foreground mt-1">
            Manage examiners and marking assignments
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-add-examiner">
          <Plus className="w-4 h-4 mr-2" />
          Add Examiner
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Examiners</p>
                <p className="text-2xl font-semibold">{examiners?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-semibold">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-semibold">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scripts Marked</p>
                <p className="text-2xl font-semibold">
                  {examiners?.reduce((sum, e) => sum + (e.totalScriptsMarked || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-examiners"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Examiners Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Examiner List</CardTitle>
              <CardDescription>
                {filteredExaminers?.length || 0} examiners found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ExaminersTableSkeleton />
          ) : filteredExaminers && filteredExaminers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Examiner</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Scripts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExaminers.map((examiner) => (
                    <TableRow key={examiner.id} data-testid={`row-examiner-${examiner.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {examiner.firstName} {examiner.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{examiner.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{examiner.specialization || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {examiner.region?.name || "Not assigned"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{examiner.totalScriptsMarked || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[examiner.status || 'pending']} text-xs capitalize`}>
                          {examiner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${examiner.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedExaminer(examiner);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <FileCheck className="w-4 h-4 mr-2" />
                              View Assignments
                            </DropdownMenuItem>
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
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No examiners found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first examiner to get started"}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Examiner
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Examiner Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Examiner</DialogTitle>
            <DialogDescription>
              Add a new examiner to the system. They will receive a verification email.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="examiner@example.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+220 1234567" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="M.A. Islamic Studies" {...field} data-testid="input-qualification" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input placeholder="Arabic Language" {...field} data-testid="input-specialization" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Examiner"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Examiner Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Examiner Details</DialogTitle>
            <DialogDescription>
              Complete information about the examiner
            </DialogDescription>
          </DialogHeader>
          {selectedExaminer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedExaminer.firstName} {selectedExaminer.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedExaminer.specialization || "No specialization"}
                  </p>
                  <Badge className={`${statusColors[selectedExaminer.status || 'pending']} mt-2`}>
                    {selectedExaminer.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedExaminer.email}</span>
                </div>
                {selectedExaminer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedExaminer.phone}</span>
                  </div>
                )}
                {selectedExaminer.qualification && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedExaminer.qualification}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{selectedExaminer.totalScriptsMarked || 0}</p>
                    <p className="text-xs text-muted-foreground">Scripts Marked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-chart-3">
                      {formatCurrency(selectedExaminer.totalAllowance)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Allowance</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Button variant="outline">
              <FileCheck className="w-4 h-4 mr-2" />
              View Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
