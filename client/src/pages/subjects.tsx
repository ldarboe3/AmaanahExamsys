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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  BookOpen,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Subject } from "@shared/schema";

const subjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  arabicName: z.string().optional(),
  code: z.string().min(2, "Code must be at least 2 characters"),
  grade: z.coerce.number().min(1, "Grade is required").max(12),
  maxScore: z.coerce.number().min(1).default(100),
  passingScore: z.coerce.number().min(1).default(50),
  isActive: z.boolean().default(true),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

const gradeLabels: Record<number, string> = {
  3: "Grade 3 (LBS)",
  6: "Grade 6 (UBS)",
  9: "Grade 9 (BCS)",
  12: "Grade 12 (SSS)",
};

function SubjectsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function Subjects() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      arabicName: "",
      code: "",
      grade: 3,
      maxScore: 100,
      passingScore: 50,
      isActive: true,
    },
  });

  const { data: subjects, isLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SubjectFormData) => {
      return apiRequest("POST", "/api/subjects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: t.subjects.subjectCreated,
        description: t.subjects.subjectCreatedDesc,
      });
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.subjects.failedToCreate,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SubjectFormData }) => {
      return apiRequest("POST", `/api/subjects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: t.subjects.subjectUpdated,
        description: t.subjects.subjectUpdatedDesc,
      });
      setShowDialog(false);
      setEditingSubject(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.subjects.failedToUpdate,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: t.subjects.subjectDeleted,
        description: t.subjects.subjectDeletedDesc,
      });
      setShowDeleteDialog(false);
      setSubjectToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.subjects.failedToDelete,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("POST", `/api/subjects/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: t.subjects.subjectUpdated,
        description: t.subjects.subjectUpdatedDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.subjects.failedToUpdate,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubjectFormData) => {
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    form.reset({
      name: subject.name,
      arabicName: subject.arabicName || "",
      code: subject.code,
      grade: subject.grade,
      maxScore: subject.maxScore || 100,
      passingScore: subject.passingScore || 50,
      isActive: subject.isActive ?? true,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingSubject(null);
    form.reset({
      name: "",
      arabicName: "",
      code: "",
      grade: 3,
      maxScore: 100,
      passingScore: 50,
      isActive: true,
    });
    setShowDialog(true);
  };

  const filteredSubjects = subjects?.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.arabicName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesGrade = gradeFilter === "all" || subject.grade === parseInt(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  const subjectsByGrade = filteredSubjects?.reduce((acc, subject) => {
    const grade = subject.grade;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(subject);
    return acc;
  }, {} as Record<number, Subject[]>);

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t.subjects.title}</h1>
          <p className="text-muted-foreground">
            {t.subjects.manageDescription}
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-subject">
          <Plus className="w-4 h-4 me-2" />
          {t.subjects.addSubject}
        </Button>
      </div>

      {/* Statistics Board */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-foreground" data-testid="text-total-subjects">
              {filteredSubjects?.length ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {gradeFilter === "all" ? t.subjects.totalSubjects || "Total Subjects" : `${gradeLabels[parseInt(gradeFilter)] || `Grade ${gradeFilter}`}`}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-chart-3" data-testid="text-active-subjects">
              {filteredSubjects?.filter(s => s.isActive)?.length ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {t.common.active || "Active"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-muted-foreground" data-testid="text-inactive-subjects">
              {filteredSubjects?.filter(s => !s.isActive)?.length ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {t.common.inactive || "Inactive"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.subjects.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
                data-testid="input-search-subjects"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-grade-filter">
                <SelectValue placeholder={t.subjects.grade} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.subjects.allGrades}</SelectItem>
                <SelectItem value="3">Grade 3 (LBS)</SelectItem>
                <SelectItem value="6">Grade 6 (UBS)</SelectItem>
                <SelectItem value="9">Grade 9 (BCS)</SelectItem>
                <SelectItem value="12">Grade 12 (SSS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SubjectsTableSkeleton />
          ) : !filteredSubjects?.length ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t.subjects.noSubjectsFound}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || gradeFilter !== "all"
                  ? t.subjects.tryAdjustSearch
                  : t.subjects.addFirstSubject}
              </p>
              {!searchQuery && gradeFilter === "all" && (
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 me-2" />
                  {t.subjects.addSubject}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(subjectsByGrade || {})
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([grade, gradeSubjects]) => (
                  <div key={grade}>
                    <h3 className="text-lg font-medium mb-3">
                      {gradeLabels[parseInt(grade)] || `Grade ${grade}`}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.subjects.subjectCode}</TableHead>
                          <TableHead>{t.subjects.subjectName}</TableHead>
                          <TableHead>{t.subjects.arabicName}</TableHead>
                          <TableHead>{t.subjects.maxScore}</TableHead>
                          <TableHead>{t.subjects.passingScore}</TableHead>
                          <TableHead>{t.common.status}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradeSubjects.map((subject) => (
                          <TableRow key={subject.id} data-testid={`row-subject-${subject.id}`}>
                            <TableCell className="font-mono">{subject.code}</TableCell>
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell dir="rtl" className="font-arabic">
                              {subject.arabicName || "-"}
                            </TableCell>
                            <TableCell>{(subject.maxScore || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</TableCell>
                            <TableCell>{(subject.passingScore || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  subject.isActive
                                    ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                                    : "bg-muted text-muted-foreground"
                                }
                              >
                                {subject.isActive ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 me-1" />
                                    {t.common.active}
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 me-1" />
                                    {t.common.inactive}
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-actions-${subject.id}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                  <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                                    <Edit className="w-4 h-4 me-2" />
                                    {t.common.edit}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleStatusMutation.mutate({
                                        id: subject.id,
                                        isActive: !subject.isActive,
                                      })
                                    }
                                  >
                                    {subject.isActive ? (
                                      <>
                                        <XCircle className="w-4 h-4 me-2" />
                                        {t.common.deactivate}
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 me-2" />
                                        {t.common.activate}
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSubjectToDelete(subject);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 me-2" />
                                    {t.common.delete}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? t.subjects.editSubject : t.subjects.addNewSubject}
            </DialogTitle>
            <DialogDescription>
              {editingSubject
                ? t.subjects.editSubjectDesc
                : t.subjects.addNewSubjectDesc}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.subjects.subjectCode}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., ARA01"
                          {...field}
                          data-testid="input-subject-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.subjects.grade}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-grade">
                            <SelectValue placeholder={t.subjects.grade} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">Grade 3 (LBS)</SelectItem>
                          <SelectItem value="6">Grade 6 (UBS)</SelectItem>
                          <SelectItem value="9">Grade 9 (BCS)</SelectItem>
                          <SelectItem value="12">Grade 12 (SSS)</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormLabel>{t.subjects.subjectName}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Arabic Language"
                        {...field}
                        data-testid="input-subject-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="arabicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.subjects.arabicName}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="اللغة العربية"
                        dir="rtl"
                        className="font-arabic"
                        {...field}
                        data-testid="input-subject-arabic-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.subjects.maxScore}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          data-testid="input-max-score"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="passingScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.subjects.passingScore}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          data-testid="input-passing-score"
                        />
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
                      <FormLabel className="text-base">{t.common.active}</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t.subjects.manageDescription}
                      </p>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-subject"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t.subjects.saving
                    : editingSubject
                    ? t.subjects.editSubject
                    : t.subjects.createSubject}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.subjects.deleteSubject}</DialogTitle>
            <DialogDescription>
              {t.subjects.deleteSubjectConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => subjectToDelete && deleteMutation.mutate(subjectToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t.common.deleting : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
