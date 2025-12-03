import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
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
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  CreditCard,
  Download,
  Upload,
  Receipt,
  DollarSign,
  Clock,
  AlertCircle,
  FileText,
  School,
  GraduationCap,
  Loader2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Invoice, InvoiceItem } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  processing: "bg-chart-2/10 text-chart-2",
  paid: "bg-chart-3/10 text-chart-3",
  failed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  processing: AlertCircle,
  paid: CheckCircle,
  failed: XCircle,
  rejected: XCircle,
};

const getPaymentStatusLabel = (status: string, isRTL: boolean) => {
  const labels: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    processing: { en: "Processing", ar: "قيد المعالجة" },
    paid: { en: "Paid", ar: "مدفوع" },
    failed: { en: "Failed", ar: "فشل" },
    rejected: { en: "Rejected", ar: "مرفوض" },
  };
  return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
};

interface InvoiceWithRelations extends Invoice {
  school?: { name: string };
  examYear?: { name: string };
}

interface SchoolInvoiceData {
  invoice: Invoice | null;
  items: InvoiceItem[];
  examYear?: { name: string; id?: number };
  message?: string;
}

interface SchoolInvoiceWithExamYear extends Invoice {
  examYear?: {
    id: number;
    name: string;
    isActive: boolean;
  } | null;
  isCurrentYear: boolean;
}

const getGradeLabel = (grade: number, isRTL: boolean) => {
  const gradeLabels: Record<number, { en: string; ar: string }> = {
    3: { en: "Grade 3", ar: "الصف 3" },
    6: { en: "Grade 6", ar: "الصف 6" },
    9: { en: "Grade 9", ar: "الصف 9" },
    12: { en: "Grade 12", ar: "الصف 12" },
  };
  return isRTL ? gradeLabels[grade]?.ar || `الصف ${grade}` : gradeLabels[grade]?.en || `Grade ${grade}`;
};

function PaymentsTableSkeleton() {
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
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function Payments() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showBankSlipDialog, setShowBankSlipDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSchoolAdmin = user?.role === 'school_admin';
  const canConfirmPayments = user?.role === 'super_admin' || user?.role === 'examination_admin';

  // For admin users: fetch all invoices
  const { data: invoices, isLoading } = useQuery<InvoiceWithRelations[]>({
    queryKey: ["/api/invoices", { status: statusFilter }],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== "all" 
        ? `/api/invoices?status=${statusFilter}` 
        : "/api/invoices";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to fetch invoices");
      }
      return response.json();
    },
    enabled: !isSchoolAdmin,
  });

  // For school admins: fetch only their current invoice
  const { data: schoolInvoiceData, isLoading: isSchoolInvoiceLoading, refetch: refetchSchoolInvoice } = useQuery<SchoolInvoiceData>({
    queryKey: ["/api/school/invoice"],
    enabled: isSchoolAdmin,
  });

  // For school admins: fetch all invoices including past ones
  const { data: allSchoolInvoices, isLoading: isAllInvoicesLoading } = useQuery<SchoolInvoiceWithExamYear[]>({
    queryKey: ["/api/school/invoices/all"],
    enabled: isSchoolAdmin,
  });

  // Filter past invoices (not current year, excluding current invoice if it exists)
  const currentInvoiceId = schoolInvoiceData?.invoice?.id;
  const pastInvoices = allSchoolInvoices?.filter(inv => 
    !inv.isCurrentYear && inv.id !== currentInvoiceId
  ) || [];

  // Generate invoice mutation for school admins
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/invoices/auto-generate", {});
    },
    onSuccess: () => {
      refetchSchoolInvoice();
      toast({
        title: isRTL ? "تم إنشاء الفاتورة" : "Invoice Generated",
        description: isRTL ? "تم إنشاء الفاتورة بناءً على الطلاب المسجلين" : "Invoice created based on registered students",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل إنشاء الفاتورة" : "Failed to generate invoice"),
        variant: "destructive",
      });
    },
  });

  // Bank slip upload mutation
  const uploadBankSlipMutation = useMutation({
    mutationFn: async ({ invoiceId, file }: { invoiceId: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('invoiceId', invoiceId.toString());
      
      setUploadProgress(20);
      const response = await fetch('/api/invoices/bank-slip', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      setUploadProgress(80);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      setUploadProgress(100);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      refetchSchoolInvoice();
      setShowUploadDialog(false);
      setBankSlipFile(null);
      setUploadProgress(0);
      toast({
        title: isRTL ? "تم رفع الإيصال" : "Bank Slip Uploaded",
        description: isRTL ? "تم رفع إيصال البنك بنجاح. في انتظار المراجعة." : "Bank slip uploaded successfully. Awaiting review.",
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل رفع الإيصال" : "Failed to upload bank slip"),
        variant: "destructive",
      });
    },
  });

  // Confirm payment mutation (only confirms payment, does not approve students)
  const confirmPaymentMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/confirm-payment`, {});
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/students');
        }
      });
      const description = data.approvedCount > 0
        ? (isRTL 
            ? `تم تأكيد الدفع. تمت الموافقة على ${data.approvedCount} طالب وتم تعيين أرقام الفهرس.`
            : `Payment confirmed. ${data.approvedCount} students approved and assigned index numbers.`)
        : (isRTL ? "تم تأكيد الدفع بنجاح." : "Payment confirmed successfully.");
      toast({
        title: isRTL ? "تم تأكيد الدفع" : "Payment Confirmed",
        description,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تأكيد الدفع. يرجى المحاولة مرة أخرى." : "Failed to confirm payment. Please try again."),
        variant: "destructive",
      });
    },
  });

  // Bulk approve students mutation (approves all pending students and generates index numbers)
  const bulkApproveStudentsMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/bulk-approve-students`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      const count = data?.approvedCount ?? 0;
      const schoolName = data?.school?.name || '';
      toast({
        title: isRTL ? "تمت الموافقة على الطلاب" : "Students Approved",
        description: isRTL 
          ? `تمت الموافقة على ${count} طالب من ${schoolName} وتم إنشاء أرقام الفهرس` 
          : `Approved ${count} students from ${schoolName} and generated index numbers`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشلت الموافقة على الطلاب. يرجى المحاولة مرة أخرى." : "Failed to approve students. Please try again."),
        variant: "destructive",
      });
    },
  });

  // Reject payment mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: number; reason: string }) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/reject-payment`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setShowRejectDialog(false);
      setShowBankSlipDialog(false);
      setRejectionReason("");
      toast({
        title: isRTL ? "تم رفض الدفع" : "Payment Rejected",
        description: isRTL ? "تم رفض الدفع وإخطار المدرسة" : "Payment rejected and school has been notified",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل رفض الدفع" : "Failed to reject payment"),
        variant: "destructive",
      });
    },
  });

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.school?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'GMD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  
  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      setDownloadingInvoice(true);
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: isRTL ? "تم التحميل" : "Downloaded",
        description: isRTL ? "تم تحميل الفاتورة بنجاح" : "Invoice downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || (isRTL ? "فشل تحميل الفاتورة" : "Failed to download invoice"),
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.paidAmount?.toString() || '0'), 0) || 0;
  const pendingAmount = invoices?.filter(i => i.status === 'pending').reduce((sum, inv) => sum + parseFloat(inv.totalAmount?.toString() || '0'), 0) || 0;

  // School admin view - show their single invoice
  if (isSchoolAdmin) {
    const invoice = schoolInvoiceData?.invoice;
    const items = schoolInvoiceData?.items || [];
    const StatusIcon = statusIcons[invoice?.status || 'pending'];

    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.payments.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "عرض الفاتورة وإتمام الدفع" : "View your invoice and complete payment"}
          </p>
        </div>

        {isSchoolInvoiceLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !invoice ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "لا توجد فاتورة" : "No Invoice Yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL 
                  ? "يرجى تسجيل الطلاب أولاً لإنشاء فاتورة تلقائياً" 
                  : "Please register students first to generate an invoice automatically"}
              </p>
              <Button onClick={() => generateInvoiceMutation.mutate()} disabled={generateInvoiceMutation.isPending}>
                {generateInvoiceMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {isRTL ? "إنشاء فاتورة" : "Generate Invoice"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Invoice Status Card */}
            <Card className={invoice.status === 'paid' ? 'border-chart-3' : invoice.status === 'pending' ? 'border-chart-5' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-primary" />
                      {isRTL ? "فاتورة رسوم التسجيل" : "Registration Fee Invoice"}
                    </CardTitle>
                    <CardDescription className="font-mono">{invoice.invoiceNumber}</CardDescription>
                    {schoolInvoiceData?.examYear && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <GraduationCap className="w-3 h-3 me-1" />
                          {schoolInvoiceData.examYear.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Badge className={`${statusColors[invoice.status || 'pending']} text-sm`}>
                    <StatusIcon className="w-4 h-4 me-1" />
                    {getPaymentStatusLabel(invoice.status || 'pending', isRTL)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invoice Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{isRTL ? "إجمالي الطلاب" : "Total Students"}</span>
                    </div>
                    <p className="text-2xl font-semibold">{invoice.totalStudents}</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.totalAmount)}</p>
                  </div>
                </div>

                {/* Fee Breakdown - Three Fee Types */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{isRTL ? "تفاصيل الرسوم لكل طالب" : "Fee Breakdown per Student"}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "رسوم التسجيل" : "Registration Fee"}</span>
                      <span className="font-medium">{formatCurrency(invoice.feePerStudent)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "رسوم الشهادة" : "Certificate Fee"}</span>
                      <span className="font-medium">{formatCurrency((invoice as any).certificateFee || '50.00')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isRTL ? "رسوم كشف الدرجات" : "Transcript Fee"}</span>
                      <span className="font-medium">{formatCurrency((invoice as any).transcriptFee || '25.00')}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex items-center justify-between">
                      <span className="font-medium">{isRTL ? "إجمالي لكل طالب" : "Total per Student"}</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(
                          (parseFloat(invoice.feePerStudent || '0') + 
                           parseFloat((invoice as any).certificateFee || '50') + 
                           parseFloat((invoice as any).transcriptFee || '25')).toString()
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grade Breakdown */}
                {items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">{isRTL ? "تفاصيل حسب الصف" : "Breakdown by Grade"}</h4>
                    <div className="border rounded-lg divide-y">
                      {items.map((item: any) => (
                        <div key={item.grade} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span>{getGradeLabel(item.grade, isRTL)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{item.studentCount}</span> 
                            {' '}{isRTL ? "طالب" : "students"} × {formatCurrency(item.feePerStudent)} = 
                            <span className="font-semibold text-foreground ms-1">{formatCurrency(item.subtotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Instructions */}
                {invoice.status === 'pending' && (
                  <div className="bg-chart-5/10 border border-chart-5/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-chart-5 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-chart-5">{isRTL ? "في انتظار الدفع" : "Payment Required"}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isRTL 
                            ? "يرجى دفع المبلغ إلى الحساب البنكي أدناه ورفع إيصال البنك"
                            : "Please pay the amount to the bank account below and upload your bank slip"}
                        </p>
                        <div className="mt-3 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">{isRTL ? "البنك:" : "Bank:"}</span> Guaranty Trust Bank (Gambia) Ltd</p>
                          <p><span className="text-muted-foreground">{isRTL ? "اسم الحساب:" : "Account Name:"}</span> Amaanah Islamic Education Trust</p>
                          <p><span className="text-muted-foreground">{isRTL ? "رقم الحساب:" : "Account Number:"}</span> 211-123456789-01</p>
                          <p><span className="text-muted-foreground">{isRTL ? "المبلغ:" : "Amount:"}</span> <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Rejected Notice */}
                {invoice.status === 'rejected' && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-destructive">{isRTL ? "تم رفض الدفع" : "Payment Rejected"}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isRTL 
                            ? "تم رفض إيصال البنك الذي قمت برفعه. يرجى مراجعة السبب أدناه ورفع إيصال جديد."
                            : "Your uploaded bank slip was rejected. Please review the reason below and upload a new receipt."}
                        </p>
                        {(invoice as any).rejectionReason && (
                          <div className="mt-3 p-3 bg-background/50 rounded-md border">
                            <p className="text-xs text-muted-foreground mb-1">{isRTL ? "سبب الرفض:" : "Rejection Reason:"}</p>
                            <p className="text-sm font-medium">{(invoice as any).rejectionReason}</p>
                          </div>
                        )}
                        <div className="mt-3 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">{isRTL ? "البنك:" : "Bank:"}</span> Guaranty Trust Bank (Gambia) Ltd</p>
                          <p><span className="text-muted-foreground">{isRTL ? "اسم الحساب:" : "Account Name:"}</span> Amaanah Islamic Education Trust</p>
                          <p><span className="text-muted-foreground">{isRTL ? "رقم الحساب:" : "Account Number:"}</span> 211-123456789-01</p>
                          <p><span className="text-muted-foreground">{isRTL ? "المبلغ:" : "Amount:"}</span> <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Notice */}
                {invoice.status === 'processing' && (
                  <div className="bg-chart-2/10 border border-chart-2/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-chart-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-chart-2">{isRTL ? "قيد المراجعة" : "Under Review"}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isRTL 
                            ? "تم استلام إيصال البنك الخاص بك وهو قيد المراجعة من قبل فريق الإدارة."
                            : "Your bank slip has been received and is being reviewed by the administration team."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => generateInvoiceMutation.mutate()} disabled={generateInvoiceMutation.isPending}>
                    {generateInvoiceMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    {isRTL ? "تحديث الفاتورة" : "Refresh Invoice"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDownloadInvoice(invoice.id)}
                    disabled={downloadingInvoice}
                    data-testid="button-download-invoice"
                  >
                    {downloadingInvoice ? (
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 me-2" />
                    )}
                    {isRTL ? "تحميل الفاتورة" : "Download Invoice"}
                  </Button>
                  {(invoice.status === 'pending' || invoice.status === 'rejected') && (
                    <Button onClick={() => setShowUploadDialog(true)} data-testid="button-upload-bank-slip">
                      <Upload className="w-4 h-4 me-2" />
                      {invoice.status === 'rejected' 
                        ? (isRTL ? "رفع إيصال جديد" : "Upload New Receipt")
                        : (isRTL ? "رفع إيصال البنك" : "Upload Bank Slip")}
                    </Button>
                  )}
                  {invoice.status === 'paid' && (
                    <Button disabled variant="outline" className="text-chart-3 border-chart-3">
                      <CheckCircle className="w-4 h-4 me-2" />
                      {isRTL ? "تم الدفع" : "Payment Complete"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bank Slip Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{isRTL ? "رفع إيصال البنك" : "Upload Bank Slip"}</DialogTitle>
              <DialogDescription>
                {isRTL ? "قم برفع صورة أو PDF لإيصال الدفع البنكي" : "Upload an image or PDF of your bank payment receipt"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  {bankSlipFile ? bankSlipFile.name : (isRTL ? "اسحب وأفلت الملف هنا، أو انقر للتصفح" : "Drag and drop your file here, or click to browse")}
                </p>
                <Button variant="outline" size="sm" type="button">
                  {isRTL ? "اختر ملف" : "Choose File"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hidden
                  onChange={(e) => setBankSlipFile(e.target.files?.[0] || null)}
                />
              </div>
              {uploadBankSlipMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "جاري الرفع" : "Uploading"}</span>
                    <span className="font-semibold">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowUploadDialog(false); setBankSlipFile(null); }}>
                {t.common.cancel}
              </Button>
              <Button 
                disabled={!bankSlipFile || uploadBankSlipMutation.isPending || !invoice}
                onClick={() => invoice && bankSlipFile && uploadBankSlipMutation.mutate({ invoiceId: invoice.id, file: bankSlipFile })}
                data-testid="button-submit-bank-slip"
              >
                {uploadBankSlipMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 me-2 animate-spin" />{isRTL ? "جاري الرفع..." : "Uploading..."}</>
                ) : (
                  <>{isRTL ? "رفع الإيصال" : "Upload Receipt"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Past Invoices Section */}
        {pastInvoices.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-muted-foreground" />
                {isRTL ? "الفواتير السابقة" : "Past Invoices"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "سجل الفواتير من سنوات الامتحانات السابقة" : "Invoice history from previous examination years"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRTL ? "رقم الفاتورة" : "Invoice Number"}</TableHead>
                      <TableHead>{isRTL ? "سنة الامتحان" : "Examination Year"}</TableHead>
                      <TableHead className="text-right">{isRTL ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="text-right">{isRTL ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAllInvoicesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      pastInvoices.map((pastInvoice) => {
                        const PastStatusIcon = statusIcons[pastInvoice.status || 'pending'];
                        return (
                          <TableRow key={pastInvoice.id} data-testid={`past-invoice-row-${pastInvoice.id}`}>
                            <TableCell className="font-mono text-sm">{pastInvoice.invoiceNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                <GraduationCap className="w-3 h-3 me-1" />
                                {pastInvoice.examYear?.name || (isRTL ? "غير معروف" : "Unknown")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(pastInvoice.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[pastInvoice.status || 'pending']} text-xs`}>
                                <PastStatusIcon className="w-3 h-3 me-1" />
                                {getPaymentStatusLabel(pastInvoice.status || 'pending', isRTL)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadInvoice(pastInvoice.id)}
                                disabled={downloadingInvoice}
                                data-testid={`button-download-past-invoice-${pastInvoice.id}`}
                              >
                                {downloadingInvoice ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                <span className="ms-1 hidden sm:inline">{isRTL ? "تحميل" : "Download"}</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin view - show all invoices
  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{t.payments.title}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة الفواتير ومعالجة المدفوعات" : "Manage invoices and payment processing"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-payments">
            <Download className="w-4 h-4 me-2" />
            {t.common.export}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</p>
                <p className="text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "قيد الانتظار" : "Pending"}</p>
                <p className="text-2xl font-semibold">{formatCurrency(pendingAmount)}</p>
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
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الفواتير" : "Total Invoices"}</p>
                <p className="text-2xl font-semibold">{invoices?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "مدفوع" : "Paid"}</p>
                <p className="text-2xl font-semibold">
                  {invoices?.filter(i => i.status === 'paid').length || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-chart-3" />
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
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                placeholder={isRTL ? "البحث برقم الفاتورة أو المدرسة..." : "Search by invoice number or school..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? "pr-9" : "pl-9"}
                data-testid="input-search-payments"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder={t.common.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value="pending">{isRTL ? "قيد الانتظار" : "Pending"}</SelectItem>
                <SelectItem value="processing">{isRTL ? "قيد المعالجة" : "Processing"}</SelectItem>
                <SelectItem value="paid">{isRTL ? "مدفوع" : "Paid"}</SelectItem>
                <SelectItem value="failed">{isRTL ? "فشل" : "Failed"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{isRTL ? "قائمة الفواتير" : "Invoice List"}</CardTitle>
              <CardDescription>
                {filteredInvoices?.length || 0} {isRTL ? "فاتورة" : "invoices found"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PaymentsTableSkeleton />
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "الفاتورة" : "Invoice"}</TableHead>
                    <TableHead>{isRTL ? "المدرسة" : "School"}</TableHead>
                    <TableHead>{t.common.students}</TableHead>
                    <TableHead>{isRTL ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead className={isRTL ? "text-left" : "text-right"}>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const StatusIcon = statusIcons[invoice.status || 'pending'];
                    return (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                              <Receipt className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium font-mono text-sm">{invoice.invoiceNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.examYear?.name || (isRTL ? "سنة غير معروفة" : "Unknown Year")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{invoice.school?.name || (isRTL ? "غير معروف" : "Unknown")}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{invoice.totalStudents}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                            {invoice.paidAmount && parseFloat(invoice.paidAmount.toString()) > 0 && (
                              <p className="text-xs text-chart-3">
                                {isRTL ? "مدفوع:" : "Paid:"} {formatCurrency(invoice.paidAmount)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[invoice.status || 'pending']} text-xs`}>
                            <StatusIcon className="w-3 h-3 me-1" />
                            {getPaymentStatusLabel(invoice.status || 'pending', isRTL)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${invoice.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 me-2" />
                                {t.common.viewDetails}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice.id)}>
                                <Download className="w-4 h-4 me-2" />
                                {isRTL ? "تحميل الفاتورة" : "Download Invoice"}
                              </DropdownMenuItem>
                              {invoice.bankSlipUrl && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setShowBankSlipDialog(true);
                                  }}
                                >
                                  <FileText className="w-4 h-4 me-2" />
                                  {isRTL ? "عرض إيصال البنك" : "View Bank Slip"}
                                </DropdownMenuItem>
                              )}
                              {/* Show Approve All Students only for paid invoices */}
                              {canConfirmPayments && invoice.status === 'paid' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => bulkApproveStudentsMutation.mutate(invoice.id)}
                                    className="text-primary"
                                    disabled={bulkApproveStudentsMutation.isPending}
                                  >
                                    <Users className="w-4 h-4 me-2" />
                                    {bulkApproveStudentsMutation.isPending 
                                      ? (isRTL ? "جاري الموافقة..." : "Approving...") 
                                      : (isRTL ? "الموافقة على جميع الطلاب" : "Approve All Students")}
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
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t.common.noResults}</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? t.common.tryAdjusting
                  : isRTL ? "ستظهر الفواتير عند الموافقة على الطلاب" : "Invoices will appear when students are approved"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تفاصيل الفاتورة" : "Invoice Details"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "معلومات الفاتورة الكاملة" : "Complete invoice information"}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "رقم الفاتورة" : "Invoice Number"}</p>
                  <p className="font-mono font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <Badge className={statusColors[selectedInvoice.status || 'pending']}>
                  {getPaymentStatusLabel(selectedInvoice.status || 'pending', isRTL)}
                </Badge>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "المدرسة" : "School"}</p>
                    <p className="font-medium">{selectedInvoice.school?.name || (isRTL ? "غير معروف" : "Unknown")}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الطلاب" : "Total Students"}</p>
                  <p className="font-medium">{selectedInvoice.totalStudents}</p>
                </div>

                {/* Fee Breakdown per Student */}
                <div className="p-3 border rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">{isRTL ? "تفاصيل الرسوم لكل طالب" : "Fee Breakdown per Student"}</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isRTL ? "رسوم التسجيل" : "Registration"}</span>
                      <span>{formatCurrency(selectedInvoice.feePerStudent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isRTL ? "الشهادة" : "Certificate"}</span>
                      <span>{formatCurrency((selectedInvoice as any).certificateFee || '50.00')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isRTL ? "كشف الدرجات" : "Transcript"}</span>
                      <span>{formatCurrency((selectedInvoice as any).transcriptFee || '25.00')}</span>
                    </div>
                    <div className="border-t pt-1.5 mt-1.5 flex justify-between font-medium">
                      <span>{isRTL ? "المجموع" : "Total"}</span>
                      <span className="text-primary">
                        {formatCurrency(
                          (parseFloat(selectedInvoice.feePerStudent || '0') + 
                           parseFloat((selectedInvoice as any).certificateFee || '50') + 
                           parseFloat((selectedInvoice as any).transcriptFee || '25')).toString()
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</span>
                    <span className="text-lg font-semibold">{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{isRTL ? "المبلغ المدفوع" : "Paid Amount"}</span>
                    <span className="font-medium text-chart-3">
                      {formatCurrency(selectedInvoice.paidAmount || 0)}
                    </span>
                  </div>
                </div>

                {selectedInvoice.paymentDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "تاريخ الدفع" : "Payment Date"}</p>
                    <p className="font-medium">
                      {new Date(selectedInvoice.paymentDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                )}

                {selectedInvoice.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "ملاحظات" : "Notes"}</p>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              {t.common.close}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => selectedInvoice && handleDownloadInvoice(selectedInvoice.id)}
              disabled={downloadingInvoice || !selectedInvoice}
            >
              {downloadingInvoice ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 me-2" />
              )}
              {t.common.download}
            </Button>
            {selectedInvoice?.bankSlipUrl && selectedInvoice.status === 'processing' && (
              <Button
                onClick={() => {
                  setShowDetailsDialog(false);
                  setShowBankSlipDialog(true);
                }}
              >
                <FileText className="w-4 h-4 me-2" />
                {isRTL ? "عرض إيصال البنك" : "View Bank Slip"}
              </Button>
            )}
            {canConfirmPayments && selectedInvoice && selectedInvoice.status === 'paid' && (
              <Button
                onClick={() => {
                  bulkApproveStudentsMutation.mutate(selectedInvoice.id);
                  setShowDetailsDialog(false);
                }}
                disabled={bulkApproveStudentsMutation.isPending}
              >
                {bulkApproveStudentsMutation.isPending 
                  ? (isRTL ? "جاري الموافقة..." : "Approving...") 
                  : (isRTL ? "الموافقة على جميع الطلاب" : "Approve All Students")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Slip Preview Dialog */}
      <Dialog open={showBankSlipDialog} onOpenChange={setShowBankSlipDialog}>
        <DialogContent className="max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "إيصال البنك" : "Bank Slip"}</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber} - {selectedInvoice?.school?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice?.bankSlipUrl && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                {/* Handle data URLs, http URLs, and relative /objects/ paths */}
                {(() => {
                  const url = selectedInvoice.bankSlipUrl;
                  const isImage = url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || 
                                  url.startsWith('data:image');
                  const isPdf = url.includes('.pdf') || url.startsWith('data:application/pdf');
                  
                  if (isImage) {
                    return (
                      <img 
                        src={url} 
                        alt="Bank Slip" 
                        className="w-full h-auto max-h-[500px] object-contain"
                      />
                    );
                  } else if (isPdf) {
                    return (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {isRTL ? "ملف PDF - انقر لفتحه أو تحميله" : "PDF File - Click to open or download"}
                        </p>
                        <div className="flex gap-2">
                          <a 
                            href={url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <Button variant="outline">
                              <Eye className="w-4 h-4 me-2" />
                              {isRTL ? "عرض PDF" : "View PDF"}
                            </Button>
                          </a>
                          <a 
                            href={url} 
                            download={`bank-slip-${selectedInvoice.invoiceNumber}.pdf`}
                            className="inline-flex items-center gap-2"
                          >
                            <Button variant="outline">
                              <Download className="w-4 h-4 me-2" />
                              {isRTL ? "تحميل PDF" : "Download PDF"}
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center justify-center p-8 text-muted-foreground">
                        {isRTL ? "تنسيق الملف غير مدعوم" : "Unsupported file format"}
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Invoice Info Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الطلاب" : "Total Students"}</p>
                  <p className="font-medium">{selectedInvoice.totalStudents}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</p>
                  <p className="font-medium">{formatCurrency(selectedInvoice.totalAmount)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowBankSlipDialog(false)}>
              {t.common.close}
            </Button>
            {canConfirmPayments && selectedInvoice?.status === 'processing' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectPaymentMutation.isPending}
                >
                  <XCircle className="w-4 h-4 me-2" />
                  {isRTL ? "رفض الدفع" : "Reject Payment"}
                </Button>
                <Button
                  onClick={() => {
                    confirmPaymentMutation.mutate(selectedInvoice.id);
                    setShowBankSlipDialog(false);
                  }}
                  disabled={confirmPaymentMutation.isPending}
                  className="bg-chart-3 hover:bg-chart-3/90"
                >
                  <CheckCircle className="w-4 h-4 me-2" />
                  {confirmPaymentMutation.isPending 
                    ? (isRTL ? "جاري التأكيد..." : "Confirming...") 
                    : (isRTL ? "تأكيد الدفع" : "Confirm Payment")}
                </Button>
              </>
            )}
            {canConfirmPayments && selectedInvoice?.status === 'paid' && (
              <Button
                onClick={() => {
                  bulkApproveStudentsMutation.mutate(selectedInvoice.id);
                  setShowBankSlipDialog(false);
                }}
                disabled={bulkApproveStudentsMutation.isPending}
              >
                <Users className="w-4 h-4 me-2" />
                {bulkApproveStudentsMutation.isPending 
                  ? (isRTL ? "جاري الموافقة..." : "Approving...") 
                  : (isRTL ? "الموافقة على جميع الطلاب" : "Approve All Students")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {isRTL ? "رفض الدفع" : "Reject Payment"}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "يرجى تقديم سبب رفض هذا الإيصال البنكي. سيتم إخطار المدرسة ويمكنها تحميل إيصال جديد."
                : "Please provide a reason for rejecting this bank slip. The school will be notified and can upload a new receipt."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isRTL ? "سبب الرفض" : "Rejection Reason"}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isRTL ? "أدخل سبب رفض هذا الإيصال..." : "Enter reason for rejecting this receipt..."}
                className="w-full min-h-[100px] p-3 border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
            }}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedInvoice && rejectionReason.trim()) {
                  rejectPaymentMutation.mutate({
                    invoiceId: selectedInvoice.id,
                    reason: rejectionReason.trim()
                  });
                }
              }}
              disabled={!rejectionReason.trim() || rejectPaymentMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {isRTL ? "جاري الرفض..." : "Rejecting..."}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 me-2" />
                  {isRTL ? "تأكيد الرفض" : "Confirm Rejection"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
