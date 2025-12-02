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
  File,
  Trash2,
  Eye
} from "lucide-react";
import type { School as SchoolType, Region, Cluster } from "@shared/schema";

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
  schoolType: z.string().min(1, "Please select a primary school type"),
  schoolTypes: z.array(z.string()).optional(),
  regionId: z.number().optional().nullable(),
  clusterId: z.number().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SchoolProfile() {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRefs = {
    registrationCertificate: useRef<HTMLInputElement>(null),
    landOwnership: useRef<HTMLInputElement>(null),
    operationalLicense: useRef<HTMLInputElement>(null),
  };

  const { data: school, isLoading: schoolLoading } = useQuery<SchoolType>({
    queryKey: ["/api/school/profile"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: clusters } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      registrarName: "",
      phone: "",
      address: "",
      schoolType: "",
      schoolTypes: [],
      regionId: null,
      clusterId: null,
    },
    values: school ? {
      name: school.name || "",
      registrarName: school.registrarName || "",
      phone: school.phone || "",
      address: school.address || "",
      schoolType: school.schoolType || "",
      schoolTypes: school.schoolTypes || [],
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
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <School className="w-10 h-10 text-primary" />
            </div>
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

                  <div className="grid gap-4 md:grid-cols-2">
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
                      name="schoolType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isRTL ? "نوع المدرسة الرئيسي" : "Primary School Type"}</FormLabel>
                          <Select
                            disabled={!isEditing}
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-school-type">
                                <SelectValue placeholder={isRTL ? "اختر نوع المدرسة" : "Select school type"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {schoolTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {isRTL ? type.arabicLabel : type.label}
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
                    <FormField
                      control={form.control}
                      name="schoolTypes"
                      render={() => (
                        <FormItem>
                          <FormLabel>{isRTL ? "أنواع المدرسة الإضافية" : "Additional School Types"}</FormLabel>
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
                        </FormItem>
                      )}
                    />
                  )}

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
        </div>
      </div>
    </div>
  );
}
