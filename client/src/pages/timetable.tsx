import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Clock,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExamTimetable, ExamYear, Subject } from "@shared/schema";

const timetableSchema = z.object({
  examYearId: z.coerce.number().min(1, "Exam year is required"),
  subjectId: z.coerce.number().min(1, "Subject is required"),
  examDate: z.string().min(1, "Exam date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  venue: z.string().optional(),
  grade: z.number(),
});

type TimetableFormData = z.infer<typeof timetableSchema>;

interface TimetableWithRelations extends ExamTimetable {
  subject?: Subject;
  examYear?: ExamYear;
}

const gradeLabels: Record<number, string> = {
  3: "Grade 3 (LBS)",
  6: "Grade 6 (UBS)",
  9: "Grade 9 (BCS)",
  12: "Grade 12 (SSS)",
};

function TimetableTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function Timetable() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimetableWithRelations | null>(null);

  const form = useForm<TimetableFormData>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      examYearId: 0,
      subjectId: 0,
      examDate: "",
      startTime: "",
      endTime: "",
      venue: "",
      grade: 0,
    },
  });

  const { data: timetable, isLoading: loadingTimetable } = useQuery<TimetableWithRelations[]>({
    queryKey: ["/api/timetable"],
  });

  const { data: examYears } = useQuery<ExamYear[]>({
    queryKey: ["/api/exam-years"],
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const activeExamYear = examYears?.find((ey) => ey.isActive);

  const createMutation = useMutation({
    mutationFn: async (data: TimetableFormData) => {
      return apiRequest("POST", "/api/timetable", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetable"] });
      toast({
        title: t.timetable.entryCreated,
        description: t.timetable.entryCreatedDesc,
      });
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.timetable.failedToCreate,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TimetableFormData }) => {
      return apiRequest("PATCH", `/api/timetable/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetable"] });
      toast({
        title: t.timetable.entryUpdated,
        description: t.timetable.entryUpdatedDesc,
      });
      setShowDialog(false);
      setEditingEntry(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.timetable.failedToUpdate,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/timetable/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetable"] });
      toast({
        title: t.timetable.entryDeleted,
        description: t.timetable.entryDeletedDesc,
      });
      setShowDeleteDialog(false);
      setEntryToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || t.timetable.failedToDelete,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimetableFormData) => {
    // Get the selected subject to extract the grade
    const selectedSubject = subjects?.find(s => s.id === data.subjectId);
    if (!selectedSubject) {
      toast({
        title: t.common.error,
        description: "Selected subject not found",
        variant: "destructive",
      });
      return;
    }

    const dataWithGrade = { ...data, grade: selectedSubject.grade };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: dataWithGrade });
    } else {
      createMutation.mutate(dataWithGrade);
    }
  };

  const openEditDialog = (entry: TimetableWithRelations) => {
    setEditingEntry(entry);
    form.reset({
      examYearId: entry.examYearId,
      subjectId: entry.subjectId,
      examDate: entry.examDate ? format(new Date(entry.examDate), "yyyy-MM-dd") : "",
      startTime: entry.startTime || "",
      endTime: entry.endTime || "",
      venue: entry.venue || "",
      grade: entry.grade || 0,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingEntry(null);
    form.reset({
      examYearId: activeExamYear?.id || 0,
      subjectId: 0,
      examDate: "",
      startTime: "09:00",
      endTime: "11:00",
      venue: "",
      grade: 0,
    });
    setShowDialog(true);
  };

  const filteredTimetable = timetable?.filter((entry) => {
    if (gradeFilter === "all") return true;
    return entry.subject?.grade === parseInt(gradeFilter);
  });

  const sortedTimetable = filteredTimetable?.sort((a, b) => {
    const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
    const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
    return dateA - dateB;
  });

  const timetableByDate = sortedTimetable?.reduce((acc, entry) => {
    const dateKey = entry.examDate
      ? format(new Date(entry.examDate), "yyyy-MM-dd")
      : "unscheduled";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, TimetableWithRelations[]>);

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t.timetable.title}</h1>
          <p className="text-muted-foreground">
            {activeExamYear
              ? `${t.timetable.timetableList} - ${activeExamYear.name}`
              : t.timetable.manageDescription}
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-entry">
          <Plus className="w-4 h-4 me-2" />
          {t.timetable.addEntry}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-grade-filter">
                <SelectValue placeholder={t.subjects.grade} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.timetable.allGrades}</SelectItem>
                <SelectItem value="3">Grade 3 (LBS)</SelectItem>
                <SelectItem value="6">Grade 6 (UBS)</SelectItem>
                <SelectItem value="9">Grade 9 (BCS)</SelectItem>
                <SelectItem value="12">Grade 12 (SSS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTimetable ? (
            <TimetableTableSkeleton />
          ) : !sortedTimetable?.length ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t.timetable.noEntriesFound}</h3>
              <p className="text-muted-foreground mb-4">
                {t.timetable.addFirstEntry}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 me-2" />
                {t.timetable.addEntry}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(timetableByDate || {}).map(([dateKey, entries]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium">
                      {dateKey === "unscheduled"
                        ? t.common.unscheduled
                        : new Date(dateKey).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.timetable.duration}</TableHead>
                        <TableHead>{t.subjects.subject}</TableHead>
                        <TableHead>{t.subjects.grade}</TableHead>
                        <TableHead>{t.timetable.venue}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-timetable-${entry.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {entry.startTime} - {entry.endTime}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {entry.subject?.name || t.common.unknown}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {entry.subject?.code}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entry.subject?.grade
                                ? gradeLabels[entry.subject.grade]
                                : t.common.unknown}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.venue || "-"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-actions-${entry.id}`}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                                  <Edit className="w-4 h-4 me-2" />
                                  {t.common.edit}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setEntryToDelete(entry);
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
              {editingEntry ? t.timetable.editEntry : t.timetable.addNewEntry}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? t.timetable.editEntryDesc
                : t.timetable.addNewEntryDesc}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="examYearId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.sidebar.examYears}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-exam-year">
                          <SelectValue placeholder={t.timetable.selectExamYear} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {examYears?.map((ey) => (
                          <SelectItem key={ey.id} value={ey.id.toString()}>
                            {ey.name} {ey.isActive && `(${t.common.active})`}
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
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.subjects.subject}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-subject">
                          <SelectValue placeholder={t.timetable.selectSubject} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects
                          ?.filter((s) => s.isActive)
                          .map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name} ({gradeLabels[subject.grade]})
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
                name="examDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.timetable.examDate}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-exam-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.timetable.startTime}</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="input-start-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.timetable.endTime}</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="input-end-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.timetable.venue}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Main Hall"
                        {...field}
                        data-testid="input-venue"
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
                  onClick={() => setShowDialog(false)}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-entry"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t.timetable.saving
                    : editingEntry
                    ? t.timetable.editEntry
                    : t.timetable.addEntry}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.timetable.deleteEntry}</DialogTitle>
            <DialogDescription>
              {t.timetable.deleteEntryConfirm}
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
              onClick={() => entryToDelete && deleteMutation.mutate(entryToDelete.id)}
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
