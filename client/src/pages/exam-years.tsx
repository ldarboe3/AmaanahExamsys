import { useLanguage } from "@/lib/i18n/LanguageContext";
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
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
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
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  Clock,
  Users,
  School,
  FileCheck,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExamYear } from "@shared/schema";

const examYearSchema = z.object({
  year: z.coerce.number().min(2020).max(2100),
  name: z.string().min(3, "Name must be at least 3 characters"),
  hijriYear: z.string().optional(),
  grades: z.array(z.coerce.number()).default([]),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  examStartDate: z.string().optional(),
  examEndDate: z.string().optional(),
  isActive: z.boolean().default(false),
});

type ExamYearFormData = z.infer<typeof examYearSchema>;

function ExamYearCard({ 
  examYear, 
  onEdit, 
  onViewDetails,
  onDelete 
}: { 
  examYear: ExamYear; 
  onEdit: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
}) {
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className={examYear.isActive ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              examYear.isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{examYear.name}</CardTitle>
              <CardDescription className="text-sm">
                {examYear.year} {examYear.hijriYear && `/ ${examYear.hijriYear}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {examYear.isActive && (
              <Badge className="bg-primary/10 text-primary">Active</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-actions-${examYear.id}`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Registration</p>
            <p className="font-medium">
              {formatDate(examYear.registrationStartDate)} - {formatDate(examYear.registrationEndDate)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Examination</p>
            <p className="font-medium">
              {formatDate(examYear.examStartDate)} - {formatDate(examYear.examEndDate)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Schools</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">0%</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExamYearCardSkeleton() {
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
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExamYears() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExamYear, setSelectedExamYear] = useState<ExamYear | null>(null);

  const { data: examYears, isLoading } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const form = useForm<ExamYearFormData>({
    resolver: zodResolver(examYearSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      name: "",
      hijriYear: "",
      isActive: false,
    },
  });

  const formatDateForInput = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const openEditDialog = (examYear: ExamYear) => {
    setSelectedExamYear(examYear);
    form.reset({
      year: examYear.year,
      name: examYear.name,
      hijriYear: examYear.hijriYear || "",
      registrationStartDate: formatDateForInput(examYear.registrationStartDate),
      registrationEndDate: formatDateForInput(examYear.registrationEndDate),
      examStartDate: formatDateForInput(examYear.examStartDate),
      examEndDate: formatDateForInput(examYear.examEndDate),
      isActive: examYear.isActive ?? false,
    });
    setShowEditDialog(true);
  };

  const openViewDetails = (examYear: ExamYear) => {
    setSelectedExamYear(examYear);
    setShowDetailsDialog(true);
  };

  const openDeleteDialog = (examYear: ExamYear) => {
    setSelectedExamYear(examYear);
    setShowDeleteDialog(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ExamYearFormData) => {
      const payload = {
        ...data,
        registrationStartDate: data.registrationStartDate ? new Date(data.registrationStartDate) : undefined,
        registrationEndDate: data.registrationEndDate ? new Date(data.registrationEndDate) : undefined,
        examStartDate: data.examStartDate ? new Date(data.examStartDate) : undefined,
        examEndDate: data.examEndDate ? new Date(data.examEndDate) : undefined,
      };
      return apiRequest("POST", "/api/exam-years", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-years"] });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Exam Year Created",
        description: "The examination year has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create exam year. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ExamYearFormData }) => {
      const payload = {
        ...data,
        registrationStartDate: data.registrationStartDate ? new Date(data.registrationStartDate) : undefined,
        registrationEndDate: data.registrationEndDate ? new Date(data.registrationEndDate) : undefined,
        examStartDate: data.examStartDate ? new Date(data.examStartDate) : undefined,
        examEndDate: data.examEndDate ? new Date(data.examEndDate) : undefined,
      };
      return apiRequest("PATCH", `/api/exam-years/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-years"] });
      setShowEditDialog(false);
      setSelectedExamYear(null);
      form.reset();
      toast({
        title: "Exam Year Updated",
        description: "The examination year has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update exam year. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/exam-years/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-years"] });
      setShowDeleteDialog(false);
      setSelectedExamYear(null);
      toast({
        title: "Exam Year Deleted",
        description: "The examination year has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete exam year. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ExamYearFormData) => {
    if (showEditDialog && selectedExamYear) {
      updateMutation.mutate({ id: selectedExamYear.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const activeYear = examYears?.find(ey => ey.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Examination Years</h1>
          <p className="text-muted-foreground mt-1">
            Manage examination periods and schedules
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-exam-year">
          <Plus className="w-4 h-4 mr-2" />
          Create Exam Year
        </Button>
      </div>

      {/* Active Year Banner */}
      {activeYear && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{activeYear.name}</h3>
                  <p className="text-sm text-muted-foreground">Currently active examination year</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Registered Schools</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-chart-2">0</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Years Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <ExamYearCardSkeleton />
            <ExamYearCardSkeleton />
            <ExamYearCardSkeleton />
          </>
        ) : examYears && examYears.length > 0 ? (
          examYears.map((examYear) => (
            <ExamYearCard
              key={examYear.id}
              examYear={examYear}
              onEdit={() => openEditDialog(examYear)}
              onViewDetails={() => openViewDetails(examYear)}
              onDelete={() => openDeleteDialog(examYear)}
            />
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No examination years</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first examination year to get started
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Exam Year
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Examination Year</DialogTitle>
            <DialogDescription>
              Set up a new examination period with dates and details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-year" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hijriYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hijri Year</FormLabel>
                      <FormControl>
                        <Input placeholder="1446" {...field} data-testid="input-hijri-year" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="2024/2025 Academic Year" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classes</FormLabel>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {[3, 6, 9, 12].map(grade => (
                        <label key={grade} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value?.includes(grade) || false}
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? [...(field.value || []), grade]
                                : (field.value || []).filter(g => g !== grade);
                              field.onChange(newValue);
                            }}
                            data-testid={`checkbox-grade-${grade}`}
                          />
                          <span className="text-sm">Class {grade}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-reg-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-reg-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-exam-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-exam-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Set as Active</FormLabel>
                      <FormDescription>
                        Make this the current examination year
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Exam Year"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setSelectedExamYear(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Examination Year</DialogTitle>
            <DialogDescription>
              Update the examination year details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hijriYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hijri Year</FormLabel>
                      <FormControl>
                        <Input placeholder="1446" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="2024/2025 Academic Year" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registrationEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="examStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Start</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam End</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Set as Active</FormLabel>
                      <FormDescription>
                        Make this the current examination year
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : "Update Exam Year"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedExamYear?.name}</DialogTitle>
            <DialogDescription>
              Examination year details and statistics
            </DialogDescription>
          </DialogHeader>
          {selectedExamYear && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{selectedExamYear.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hijri Year</p>
                  <p className="font-medium">{selectedExamYear.hijriYear || "Not set"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registration Period</p>
                  <p className="font-medium text-sm">
                    {selectedExamYear.registrationStartDate 
                      ? new Date(selectedExamYear.registrationStartDate).toLocaleDateString() 
                      : "Not set"} - {selectedExamYear.registrationEndDate 
                      ? new Date(selectedExamYear.registrationEndDate).toLocaleDateString() 
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Examination Period</p>
                  <p className="font-medium text-sm">
                    {selectedExamYear.examStartDate 
                      ? new Date(selectedExamYear.examStartDate).toLocaleDateString() 
                      : "Not set"} - {selectedExamYear.examEndDate 
                      ? new Date(selectedExamYear.examEndDate).toLocaleDateString() 
                      : "Not set"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={selectedExamYear.isActive ? "bg-primary/10 text-primary" : ""}>
                  {selectedExamYear.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowDetailsDialog(false);
              if (selectedExamYear) openEditDialog(selectedExamYear);
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Examination Year</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedExamYear?.name}"? This action cannot be undone.
              All associated data may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedExamYear && deleteMutation.mutate(selectedExamYear.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
