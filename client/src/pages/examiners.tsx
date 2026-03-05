import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Search,
  MoreVertical,
  Eye,
  Edit,
  UserCheck,
  Mail,
  Phone,
  Briefcase,
  FileCheck,
  DollarSign,
  CheckCircle,
  Clock,
  ArrowRight,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Examiner } from "@shared/schema";

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
  const { t, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedExaminer, setSelectedExaminer] = useState<ExaminerWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: examiners, isLoading } = useQuery<ExaminerWithRelations[]>({
    queryKey: ["/api/examiners", statusFilter],
  });

  const filteredExaminers = examiners?.filter((examiner) => {
    const fullName = `${examiner.firstName} ${examiner.lastName}`.toLowerCase();
    const email = examiner.email || '';
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeCount = examiners?.filter(e => e.status === 'active').length || 0;
  const pendingCount = examiners?.filter(e => e.status === 'pending').length || 0;

  const formatCurrency = (amount: string | number | null) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat(isRTL ? 'ar-GM' : 'en-GM', {
      style: 'currency',
      currency: 'GMD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.examiners.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.examiners.manageDescription}
          </p>
        </div>
        <Button onClick={() => setLocation("/staff-identity")} data-testid="button-go-to-staff-identity">
          <ArrowRight className="w-4 h-4 me-2" />
          {isRTL ? "إضافة في هوية الموظفين" : "Register via Staff Identity"}
        </Button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-md bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          {isRTL
            ? "يتم تسجيل المحكّمين من خلال قسم هوية الموظفين. أي موظف بدور \"محكّم\" يظهر تلقائياً هنا."
            : "Examiners are registered through Staff Identity. Any staff member with the Examiner role automatically appears here."}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.examiners.totalExaminers}</p>
                <p className="text-2xl font-semibold">{(examiners?.length || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
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
                <p className="text-sm text-muted-foreground">{t.common.active}</p>
                <p className="text-2xl font-semibold">{activeCount.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
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
                <p className="text-sm text-muted-foreground">{t.examiners.pendingVerification}</p>
                <p className="text-2xl font-semibold">{pendingCount.toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
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
                <p className="text-sm text-muted-foreground">{t.examiners.totalScriptsMarked}</p>
                <p className="text-2xl font-semibold">
                  {(examiners?.reduce((sum, e) => sum + (e.totalScriptsMarked || 0), 0) || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
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
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={t.examiners.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
                data-testid="input-search-examiners"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder={t.common.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.examiners.allStatus}</SelectItem>
                <SelectItem value="pending">{t.common.pending}</SelectItem>
                <SelectItem value="verified">{t.examiners.verified}</SelectItem>
                <SelectItem value="active">{t.common.active}</SelectItem>
                <SelectItem value="inactive">{t.common.inactive}</SelectItem>
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
              <CardTitle className="text-lg">{t.examiners.examinerList}</CardTitle>
              <CardDescription>
                {(filteredExaminers?.length || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {t.examiners.examinersFound}
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
                    <TableHead>{t.examiners.examiner}</TableHead>
                    <TableHead>{t.examiners.specialization}</TableHead>
                    <TableHead>{t.schools.region}</TableHead>
                    <TableHead>{t.examiners.scripts}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
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
                          {examiner.region?.name || t.examiners.notAssigned}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{(examiner.totalScriptsMarked || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[examiner.status || 'pending']} text-xs capitalize`}>
                          {examiner.status === 'pending' ? t.common.pending :
                           examiner.status === 'verified' ? t.examiners.verified :
                           examiner.status === 'active' ? t.common.active :
                           t.common.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className={isRTL ? "text-left" : "text-right"}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${examiner.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRTL ? "start" : "end"}>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedExaminer(examiner);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 me-2" />
                              {t.examiners.viewDetails}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 me-2" />
                              {t.common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <FileCheck className="w-4 h-4 me-2" />
                              {t.examiners.viewAssignments}
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
              <h3 className="text-lg font-medium mb-2">{t.examiners.noExaminersFound}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t.examiners.tryAdjustSearch : (isRTL ? "أضف موظفين بدور محكّم من خلال قسم هوية الموظفين." : "Add staff with the Examiner role through Staff Identity.")}
              </p>
              <Button onClick={() => setLocation("/staff-identity")} data-testid="button-go-to-staff-identity-empty">
                <ArrowRight className="w-4 h-4 me-2" />
                {isRTL ? "الذهاب إلى هوية الموظفين" : "Go to Staff Identity"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Examiner Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.examiners.examinerDetails}</DialogTitle>
            <DialogDescription>
              {t.examiners.completeInfo}
            </DialogDescription>
          </DialogHeader>
          {selectedExaminer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedExaminer.firstName} {selectedExaminer.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedExaminer.specialization || t.examiners.noSpecialization}
                  </p>
                  <Badge className={`${statusColors[selectedExaminer.status || 'pending']} mt-2`}>
                    {selectedExaminer.status === 'pending' ? t.common.pending :
                     selectedExaminer.status === 'verified' ? t.examiners.verified :
                     selectedExaminer.status === 'active' ? t.common.active :
                     t.common.inactive}
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
                    <p className="text-2xl font-semibold">{(selectedExaminer.totalScriptsMarked || 0).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                    <p className="text-xs text-muted-foreground">{t.examiners.scriptsMarked}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-chart-3">
                      {formatCurrency(selectedExaminer.totalAllowance)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.examiners.totalAllowance}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t.common.close}
            </Button>
            <Button variant="outline">
              <FileCheck className="w-4 h-4 me-2" />
              {t.examiners.viewAssignments}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
