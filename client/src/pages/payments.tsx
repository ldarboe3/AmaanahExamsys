import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Invoice } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-chart-5/10 text-chart-5",
  processing: "bg-chart-2/10 text-chart-2",
  paid: "bg-chart-3/10 text-chart-3",
  failed: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  processing: AlertCircle,
  paid: CheckCircle,
  failed: XCircle,
};

const getPaymentStatusLabel = (status: string, isRTL: boolean) => {
  const labels: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    processing: { en: "Processing", ar: "قيد المعالجة" },
    paid: { en: "Paid", ar: "مدفوع" },
    failed: { en: "Failed", ar: "فشل" },
  };
  return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
};

interface InvoiceWithRelations extends Invoice {
  school?: { name: string };
  examYear?: { name: string };
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { data: invoices, isLoading } = useQuery<InvoiceWithRelations[]>({
    queryKey: ["/api/invoices", statusFilter],
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/pay`, { paymentMethod: 'bank_slip' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: isRTL ? "تم تأكيد الدفع" : "Payment Confirmed",
        description: isRTL ? "تم تأكيد الدفع بنجاح." : "The payment has been confirmed successfully.",
      });
    },
    onError: () => {
      toast({
        title: t.common.error,
        description: isRTL ? "فشل تأكيد الدفع. يرجى المحاولة مرة أخرى." : "Failed to confirm payment. Please try again.",
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

  const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.paidAmount?.toString() || '0'), 0) || 0;
  const pendingAmount = invoices?.filter(i => i.status === 'pending').reduce((sum, inv) => sum + parseFloat(inv.totalAmount?.toString() || '0'), 0) || 0;

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
            {t.common.exportReport}
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
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 me-2" />
                                {isRTL ? "تحميل الفاتورة" : "Download Invoice"}
                              </DropdownMenuItem>
                              {invoice.bankSlipUrl && (
                                <DropdownMenuItem>
                                  <FileText className="w-4 h-4 me-2" />
                                  {isRTL ? "عرض إيصال البنك" : "View Bank Slip"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {(invoice.status === 'pending' || invoice.status === 'processing') && (
                                <DropdownMenuItem
                                  onClick={() => confirmPaymentMutation.mutate(invoice.id)}
                                  className="text-chart-3"
                                >
                                  <CheckCircle className="w-4 h-4 me-2" />
                                  {isRTL ? "تأكيد الدفع" : "Confirm Payment"}
                                </DropdownMenuItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الطلاب" : "Total Students"}</p>
                    <p className="font-medium">{selectedInvoice.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "الرسوم لكل طالب" : "Fee per Student"}</p>
                    <p className="font-medium">{formatCurrency(selectedInvoice.feePerStudent)}</p>
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
            <Button variant="outline">
              <Download className="w-4 h-4 me-2" />
              {t.common.download}
            </Button>
            {selectedInvoice && (selectedInvoice.status === 'pending' || selectedInvoice.status === 'processing') && (
              <Button
                onClick={() => {
                  confirmPaymentMutation.mutate(selectedInvoice.id);
                  setShowDetailsDialog(false);
                }}
              >
                {isRTL ? "تأكيد الدفع" : "Confirm Payment"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
