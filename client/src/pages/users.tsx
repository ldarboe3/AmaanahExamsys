import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  Users,
  Shield,
  MoreHorizontal,
  Edit,
  Key,
  Loader2,
  UserX,
  UserCheck,
  Trash2,
  ArrowRight,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  examination_admin: "Exam Admin",
  logistics_admin: "Logistics Admin",
  school_admin: "School Admin",
  examiner: "Examiner",
  candidate: "Candidate",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  examination_admin: "bg-chart-2/10 text-chart-2",
  logistics_admin: "bg-chart-4/10 text-chart-4",
  school_admin: "bg-chart-3/10 text-chart-3",
  examiner: "bg-chart-5/10 text-chart-5",
  candidate: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  active: "bg-chart-3/10 text-chart-3",
  pending: "bg-chart-2/10 text-chart-2",
  suspended: "bg-destructive/10 text-destructive",
};

function UsersSkeleton() {
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

export default function UsersPage() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });
  
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            {isRTL ? "إدارة المستخدمين" : "User Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة مستخدمي النظام" : "Manage system users"}
          </p>
        </div>
        <Button onClick={() => setLocation("/staff-identity")} data-testid="button-go-to-staff-identity">
          <ArrowRight className="w-4 h-4 mr-2" />
          {isRTL ? "تسجيل من هوية الموظفين" : "Register via Staff Identity"}
        </Button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-md bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          {isRTL
            ? "يتم إنشاء مستخدمي النظام (المسؤولون، موظفو اللوجستيات، إلخ) من خلال قسم هوية الموظفين. استخدم قائمة أدناه لإدارة الصلاحيات وحالة المستخدمين الحاليين."
            : "System users (admins, logistics staff, etc.) are created through Staff Identity. Use the table below to manage roles and status of existing users."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRTL ? "إجمالي المستخدمين" : "Total Users"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "جميع المستخدمين المسجلين" : "All registered users"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRTL ? "المسؤولون" : "Admins"}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => ["super_admin", "examination_admin", "logistics_admin"].includes(u.role || "")).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "المستخدمون ذوو صلاحيات إدارية" : "Users with admin privileges"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRTL ? "النشطون" : "Active"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(u => u.status === "active").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "المستخدمون النشطون حالياً" : "Currently active users"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "قائمة المستخدمين" : "Users List"}</CardTitle>
          <CardDescription>
            {isRTL ? "عرض وإدارة جميع مستخدمي النظام" : "View and manage all system users"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "البحث عن المستخدمين..." : "Search users..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder={isRTL ? "تصفية حسب الدور" : "Filter by role"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "جميع الأدوار" : "All Roles"}</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="examination_admin">Exam Admin</SelectItem>
                <SelectItem value="logistics_admin">Logistics Admin</SelectItem>
                <SelectItem value="school_admin">School Admin</SelectItem>
                <SelectItem value="examiner">Examiner</SelectItem>
                <SelectItem value="candidate">Candidate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <UsersSkeleton />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "المستخدم" : "User"}</TableHead>
                    <TableHead>{isRTL ? "البريد الإلكتروني" : "Email"}</TableHead>
                    <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
                    <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "تاريخ الإنشاء" : "Created"}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role || "candidate"]}>
                          {roleLabels[user.role || "candidate"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.status || "pending"]}>
                          {user.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-user-menu-${user.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                const newRole = prompt("Enter new role (super_admin, examination_admin, logistics_admin, school_admin, examiner, candidate):");
                                if (newRole && Object.keys(roleLabels).includes(newRole)) {
                                  updateRoleMutation.mutate({ userId: user.id, role: newRole });
                                }
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {isRTL ? "تغيير الدور" : "Change Role"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Key className="w-4 h-4 mr-2" />
                              {isRTL ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                            </DropdownMenuItem>
                            {user.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'suspended' })}
                                data-testid={`button-deactivate-${user.id}`}
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                {isRTL ? "تعليق الحساب" : "Deactivate"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ userId: user.id, status: 'active' })}
                                data-testid={`button-activate-${user.id}`}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                {isRTL ? "تفعيل الحساب" : "Activate"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setUserToDelete(user)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {isRTL ? "حذف المستخدم" : "Delete User"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {isRTL ? "لم يتم العثور على مستخدمين" : "No users found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "تأكيد حذف المستخدم" : "Confirm User Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? `هل أنت متأكد من حذف المستخدم "${userToDelete?.username}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
