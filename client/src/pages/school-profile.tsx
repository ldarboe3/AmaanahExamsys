import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { 
  School, 
  Loader2, 
  Save, 
  Upload, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Edit,
  X,
  Trash2,
  Eye,
  UserPlus,
  Users,
  Clock,
  Send,
  Image as ImageIcon
} from "lucide-react";
import type { School as SchoolType, Region, Cluster, SchoolInvitation } from "@shared/schema";

const schoolTypes = [
  { value: "LBS", label: "Lower Basic School", arabicLabel: "ابتدائي" },
  { value: "UBS", label: "Upper Basic School", arabicLabel: "إعدادي" },
  { value: "BCS", label: "Basic Cycle School", arabicLabel: "ابتدائي وإعدادي" },
  { value: "SSS", label: "Senior Secondary School", arabicLabel: "ثانوي" },
  { value: "ECD", label: "Early Childhood Development", arabicLabel: "روضة" },
  { value: "QM", label: "Quranic Memorization", arabicLabel: "تحفيظ القرآن الكريم" },
];

const profileSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  registrarName: z.string().min(2, "Registrar name is required"),
  phone: z.string().min(7, "Phone number is required"),
  address: z.string().min(5, "Address is required"),
  schoolTypes: z.array(z.string()).min(1, "Please select at least one school type"),
  regionId: z.number().optional().nullable(),
  clusterId: z.number().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const invitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name is required"),
});

type InvitationFormData = z.infer<typeof invitationSchema>;

export default function SchoolProfile() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const fileInputRefs = {
    registrationCertificate: useRef<HTMLInputElement>(null),
    landOwnership: useRef<HTMLInputElement>(null),
    operationalLicense: useRef<HTMLInputElement>(null),
  };
  
  const badgeInputRef = useRef<HTMLInputElement>(null);

  const { data: school, isLoading: schoolLoading } = useQuery<SchoolType>({
    queryKey: ["/api/school/profile"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<SchoolInvitation[]>({
    queryKey: ["/api/school/invitations"],
  });

  const inviteForm = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      registrarName: "",
      phone: "",
      address: "",
      schoolTypes: [],
      regionId: null,
      clusterId: null,
    },
    values: school ? {
      name: school.name || "",
      registrarName: school.registrarName || "",
      phone: school.phone || "",
      address: school.address || "",
      schoolTypes: school.schoolTypes?.length ? school.schoolTypes : (school.schoolType ? [school.schoolType] : []),
      regionId: school.regionId || null,
      clusterId: school.clusterId || null,
    } : undefined,
  });

  const selectedRegionId = form.watch("regionId");
  const filteredClusters = clusters?.filter(c => c.regionId === selectedRegionId) || [];

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("POST", "/api/school/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/profile"] });
      setIsEditing(false);
      toast({
        title: isRTL ? "تم التحديث" : "Profile Updated",
        description: isRTL ? "تم تحديث ملف المدرسة بنجاح" : "Your school profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message || (isRTL ? "فشل في تحديث الملف" : "Failed to update profile"),
        variant: "destructive",
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ docType, file }: { docType: string; file: File }) => {
      setUploadingDoc(docType);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await fetch("/api/school/documents/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Upload failed");
        }

        return response.json();
      } finally {
        clearInterval(progressInterval);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/profile"] });
      toast({
        title: isRTL ? "تم الرفع" : "Document Uploaded",
        description: isRTL ? "تم رفع المستند بنجاح" : "Your document has been uploaded successfully.",
      });
      setTimeout(() => {
        setUploadingDoc(null);
        setUploadProgress(0);
      }, 500);
    },
    onError: (error: any) => {
      setUploadingDoc(null);
      setUploadProgress(0);
      toast({
        title: isRTL ? "خطأ في الرفع" : "Upload Error",
        description: error.message || (isRTL ? "فشل في رفع المستند" : "Failed to upload document"),
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docType: string) => {
      return apiRequest("POST", "/api/school/documents/delete", { docType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/profile"] });
      toast({
        title: isRTL ? "تم الحذف" : "Document Deleted",
        description: isRTL ? "تم حذف المستند بنجاح" : "Document has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message || (isRTL ? "فشل في حذف المستند" : "Failed to delete document"),
        variant: "destructive",
      });
    },
  });

  const uploadBadgeMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingDoc("schoolBadge");
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", "schoolBadge");

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await fetch("/api/school/documents/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Upload failed");
        }

        return response.json();
      } finally {
        clearInterval(progressInterval);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/profile"] });
      toast({
        title: isRTL ? "تم الرفع" : "Badge Uploaded",
        description: isRTL ? "تم رفع شعار المدرسة بنجاح" : "Your school badge has been uploaded successfully.",
      });
      setTimeout(() => {
        setUploadingDoc(null);
        setUploadProgress(0);
      }, 500);
    },
    onError: (error: any) => {
      setUploadingDoc(null);
      setUploadProgress(0);
      toast({
        title: isRTL ? "خطأ في الرفع" : "Upload Error",
        description: error.message || (isRTL ? "فشل في رفع الشعار" : "Failed to upload badge"),
        variant: "destructive",
      });
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: InvitationFormData) => {
      return apiRequest("POST", "/api/school/invitations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/invitations"] });
      setInviteDialogOpen(false);
      inviteForm.reset();
      toast({
        title: isRTL ? "تم إرسال الدعوة" : "Invitation Sent",
        description: isRTL ? "تم إرسال دعوة المسؤول بنجاح" : "Admin invitation has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message || (isRTL ? "فشل في إرسال الدعوة" : "Failed to send invitation"),
        variant: "destructive",
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return apiRequest("POST", `/api/school/invitations/${invitationId}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/school/invitations"] });
      toast({
        title: isRTL ? "تم إعادة الإرسال" : "Invitation Resent",
        description: isRTL ? "تم إعادة إرسال الدعوة بنجاح" : "Invitation has been resent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error.message || (isRTL ? "فشل في إعادة الإرسال" : "Failed to resend invitation"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleFileChange = (docType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: isRTL ? "الملف كبير جداً" : "File Too Large",
          description: isRTL ? "الحد الأقصى للملف 10 ميجابايت" : "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      uploadDocumentMutation.mutate({ docType, file });
    }
  };

  const handleBadgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: isRTL ? "الملف كبير جداً" : "File Too Large",
          description: isRTL ? "الحد الأقصى للملف 10 ميجابايت" : "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: isRTL ? "نوع ملف غير صالح" : "Invalid File Type",
          description: isRTL ? "يجب أن يكون الشعار صورة (JPEG أو PNG)" : "Badge must be an image (JPEG or PNG)",
          variant: "destructive",
        });
        return;
      }
      uploadBadgeMutation.mutate(file);
    }
  };

  const onInviteSubmit = (data: InvitationFormData) => {
    createInvitationMutation.mutate(data);
  };

  const getInvitationStatusBadge = (invitation: SchoolInvitation) => {
    if (invitation.status === "completed") {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 me-1" />
          {isRTL ? "مكتمل" : "Completed"}
        </Badge>
      );
    }
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 me-1" />
          {isRTL ? "منتهي الصلاحية" : "Expired"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 me-1" />
        {isRTL ? "قيد الانتظار" : "Pending"}
      </Badge>
    );
  };

  const getDocumentUrl = (docType: string) => {
    if (!school) return null;
    switch (docType) {
      case "registrationCertificate":
        return school.registrationCertificate;
      case "landOwnership":
        return school.landOwnership;
      case "operationalLicense":
        return school.operationalLicense;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 me-1" />{isRTL ? "موافق عليه" : "Approved"}</Badge>;
      case "pending":
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 me-1" />{isRTL ? "قيد المراجعة" : "Pending"}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 me-1" />{isRTL ? "مرفوض" : "Rejected"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSchoolTypeLabel = (type: string) => {
    const found = schoolTypes.find(t => t.value === type);
    if (!found) return type;
    return isRTL ? found.arabicLabel : found.label;
  };

  if (schoolLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{isRTL ? "لم يتم العثور على المدرسة" : "School Not Found"}</h2>
          <p className="text-muted-foreground">
            {isRTL ? "لم نتمكن من العثور على ملف مدرستك" : "We couldn't find your school profile"}
          </p>
        </div>
      </div>
    );
  }

  const documents = [
    { 
      key: "registrationCertificate", 
      label: isRTL ? "شهادة التسجيل" : "Registration Certificate",
      description: isRTL ? "شهادة تسجيل المدرسة الرسمية" : "Official school registration certificate"
    },
    { 
      key: "landOwnership", 
      label: isRTL ? "وثيقة ملكية الأرض" : "Land Ownership Document",
      description: isRTL ? "إثبات ملكية أو استئجار موقع المدرسة" : "Proof of ownership or lease of school premises"
    },
    { 
      key: "operationalLicense", 
      label: isRTL ? "رخصة التشغيل" : "Operational License",
      description: isRTL ? "رخصة التشغيل من وزارة التعليم" : "Operating license from Ministry of Education"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isRTL ? "ملف المدرسة" : "School Profile"}</h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? "إدارة معلومات ووثائق مدرستك" : "Manage your school information and documents"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(school.status || "pending")}
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
              <Edit className="w-4 h-4 me-2" />
              {isRTL ? "تعديل" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* School Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              {school.schoolBadge ? (
                <Avatar className="w-24 h-24">
                  <AvatarImage src={school.schoolBadge} alt={school.name} className="object-cover" />
                  <AvatarFallback className="bg-primary/10">
                    <School className="w-10 h-10 text-primary" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <School className="w-10 h-10 text-primary" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                   onClick={() => badgeInputRef.current?.click()}>
                {uploadingDoc === "schoolBadge" ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-white" />
                )}
              </div>
              <input
                type="file"
                ref={badgeInputRef}
                className="hidden"
                accept="image/jpeg,image/png"
                onChange={handleBadgeChange}
                data-testid="input-school-badge"
              />
            </div>
            {uploadingDoc === "schoolBadge" && (
              <Progress value={uploadProgress} className="h-1 w-24 mx-auto mb-2" />
            )}
            <CardTitle>{school.name}</CardTitle>
            <CardDescription>{school.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{school.registrarName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{school.email}</span>
              </div>
              {school.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{school.phone}</span>
                </div>
              )}
              {school.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{school.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{getSchoolTypeLabel(school.schoolType)}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">{isRTL ? "أنواع المدرسة" : "School Types"}</p>
              <div className="flex flex-wrap gap-1">
                {(school.schoolTypes || [school.schoolType]).map(type => (
                  <Badge key={type} variant="outline">{getSchoolTypeLabel(type)}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {isRTL ? "معلومات المدرسة" : "School Information"}
              </CardTitle>
              <CardDescription>
                {isEditing 
                  ? (isRTL ? "تعديل معلومات المدرسة" : "Edit your school details")
                  : (isRTL ? "عرض معلومات المدرسة" : "View your school details")
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? "اسم المدرسة" : "School Name"}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-school-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrarName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? "اسم المسجل" : "Registrar Name"}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-registrar-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? "رقم الهاتف" : "Phone Number"}</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schoolTypes"
                    render={() => (
                      <FormItem>
                        <FormLabel>{isRTL ? "أنواع المدرسة" : "School Types"}</FormLabel>
                        <FormDescription>
                          {isRTL ? "اختر جميع الأنواع التي تنطبق على مدرستك" : "Select all types that apply to your school"}
                        </FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {schoolTypes.map((type) => (
                            <FormField
                              key={type.value}
                              control={form.control}
                              name="schoolTypes"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      disabled={!isEditing}
                                      checked={field.value?.includes(type.value)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, type.value]);
                                        } else {
                                          field.onChange(current.filter(v => v !== type.value));
                                        }
                                      }}
                                      data-testid={`checkbox-type-${type.value}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {isRTL ? type.arabicLabel : type.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isRTL ? "العنوان" : "Address"}</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={!isEditing} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="regionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? "إقليم" : "Region"}</FormLabel>
                          <Select
                            disabled={!isEditing}
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => {
                              field.onChange(val ? parseInt(val) : null);
                              form.setValue("clusterId", null);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-region">
                                <SelectValue placeholder={isRTL ? "اختر إقليم" : "Select region"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions?.map(region => (
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
                    <FormField
                      control={form.control}
                      name="clusterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? "المجموعة" : "Cluster"}</FormLabel>
                          <Select
                            disabled={!isEditing || !selectedRegionId}
                            value={field.value?.toString() || ""}
                            onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-cluster">
                                <SelectValue placeholder={isRTL ? "اختر المجموعة" : "Select cluster"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredClusters.map(cluster => (
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

                  {isEditing && (
                    <div className="flex gap-2 justify-end pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        data-testid="button-cancel-edit"
                      >
                        <X className="w-4 h-4 me-2" />
                        {isRTL ? "إلغاء" : "Cancel"}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="w-4 h-4 me-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 me-2" />
                        )}
                        {isRTL ? "حفظ التغييرات" : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {isRTL ? "وثائق المدرسة" : "School Documents"}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? "رفع الوثائق المطلوبة للتسجيل (PDF, JPG, PNG - الحد الأقصى 10 ميجابايت)"
                  : "Upload required documents for registration (PDF, JPG, PNG - Max 10MB)"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((doc) => {
                  const existingUrl = getDocumentUrl(doc.key);
                  const isUploading = uploadingDoc === doc.key;

                  return (
                    <div key={doc.key} className="border rounded-md p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{doc.label}</h4>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {existingUrl ? (
                            <>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="w-3 h-3 me-1" />
                                {isRTL ? "تم الرفع" : "Uploaded"}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(existingUrl, "_blank")}
                                data-testid={`button-view-${doc.key}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteDocumentMutation.mutate(doc.key)}
                                disabled={deleteDocumentMutation.isPending}
                                data-testid={`button-delete-${doc.key}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="w-3 h-3 me-1" />
                              {isRTL ? "مطلوب" : "Required"}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isUploading && (
                        <div className="mt-3">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {isRTL ? "جاري الرفع..." : "Uploading..."} {uploadProgress}%
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <input
                          type="file"
                          ref={fileInputRefs[doc.key as keyof typeof fileInputRefs]}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(doc.key, e)}
                          data-testid={`input-file-${doc.key}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => fileInputRefs[doc.key as keyof typeof fileInputRefs].current?.click()}
                          data-testid={`button-upload-${doc.key}`}
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 me-2" />
                          )}
                          {existingUrl 
                            ? (isRTL ? "استبدال الملف" : "Replace File") 
                            : (isRTL ? "رفع ملف" : "Upload File")
                          }
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* School Administrators */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {isRTL ? "مسؤولي المدرسة" : "School Administrators"}
                  </CardTitle>
                  <CardDescription>
                    {isRTL 
                      ? "إدارة مسؤولي المدرسة ودعوة أعضاء جدد"
                      : "Manage school administrators and invite new members"
                    }
                  </CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-invite-admin">
                      <UserPlus className="w-4 h-4 me-2" />
                      {isRTL ? "دعوة مسؤول" : "Invite Admin"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isRTL ? "دعوة مسؤول جديد" : "Invite New Administrator"}</DialogTitle>
                      <DialogDescription>
                        {isRTL 
                          ? "سيتلقى المدعو بريدًا إلكترونيًا لإعداد حسابه"
                          : "The invitee will receive an email to set up their account"
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...inviteForm}>
                      <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                        <FormField
                          control={inviteForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{isRTL ? "الاسم" : "Name"}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={isRTL ? "أدخل اسم المسؤول" : "Enter admin's name"} 
                                  {...field} 
                                  data-testid="input-invite-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={inviteForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{isRTL ? "البريد الإلكتروني" : "Email"}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder={isRTL ? "أدخل البريد الإلكتروني" : "Enter email address"} 
                                  {...field} 
                                  data-testid="input-invite-email"
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
                            onClick={() => setInviteDialogOpen(false)}
                            data-testid="button-cancel-invite"
                          >
                            {isRTL ? "إلغاء" : "Cancel"}
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createInvitationMutation.isPending}
                            data-testid="button-send-invite"
                          >
                            {createInvitationMutation.isPending ? (
                              <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 me-2" />
                            )}
                            {isRTL ? "إرسال الدعوة" : "Send Invitation"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : invitations && invitations.length > 0 ? (
                <div className="space-y-3">
                  {invitations.map((invitation) => {
                    const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
                    const canResend = invitation.status === "pending" && isExpired;
                    
                    return (
                      <div 
                        key={invitation.id} 
                        className="flex items-center justify-between gap-4 p-3 border rounded-md"
                        data-testid={`invitation-${invitation.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-muted">
                              <User className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{invitation.invitedName}</p>
                            <p className="text-sm text-muted-foreground">{invitation.invitedEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getInvitationStatusBadge(invitation)}
                          {canResend && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resendInvitationMutation.mutate(invitation.id)}
                              disabled={resendInvitationMutation.isPending}
                              data-testid={`button-resend-${invitation.id}`}
                            >
                              {resendInvitationMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{isRTL ? "لا توجد دعوات حتى الآن" : "No invitations yet"}</p>
                  <p className="text-sm mt-1">
                    {isRTL 
                      ? "انقر على 'دعوة مسؤول' لإضافة مسؤولين آخرين"
                      : "Click 'Invite Admin' to add other administrators"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
