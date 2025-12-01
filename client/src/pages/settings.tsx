import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Save,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const organizationSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  organizationNameArabic: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().optional(),
});

const examSettingsSchema = z.object({
  registrationFee: z.coerce.number().min(0),
  lateFee: z.coerce.number().min(0),
  certificateFee: z.coerce.number().min(0),
  transcriptFee: z.coerce.number().min(0),
  currency: z.string().default("GMD"),
  allowLateRegistration: z.boolean().default(false),
  autoGenerateIndexNumbers: z.boolean().default(true),
  requireDocumentVerification: z.boolean().default(true),
});

const notificationSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  paymentReminders: z.boolean().default(true),
  resultNotifications: z.boolean().default(true),
  systemAnnouncements: z.boolean().default(true),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type ExamSettingsFormData = z.infer<typeof examSettingsSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

interface SystemSettings {
  organizationName?: string;
  organizationNameArabic?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  registrationFee?: number;
  lateFee?: number;
  certificateFee?: number;
  transcriptFee?: number;
  currency?: string;
  allowLateRegistration?: boolean;
  autoGenerateIndexNumbers?: boolean;
  requireDocumentVerification?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  paymentReminders?: boolean;
  resultNotifications?: boolean;
  systemAnnouncements?: boolean;
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("organization");

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const organizationForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: settings?.organizationName || "Amaanah Examination Board",
      organizationNameArabic: settings?.organizationNameArabic || "مجلس امتحانات الأمانة",
      email: settings?.email || "",
      phone: settings?.phone || "",
      address: settings?.address || "",
      website: settings?.website || "",
      logoUrl: settings?.logoUrl || "",
    },
  });

  const examSettingsForm = useForm<ExamSettingsFormData>({
    resolver: zodResolver(examSettingsSchema),
    defaultValues: {
      registrationFee: settings?.registrationFee || 150,
      lateFee: settings?.lateFee || 50,
      certificateFee: settings?.certificateFee || 100,
      transcriptFee: settings?.transcriptFee || 75,
      currency: settings?.currency || "GMD",
      allowLateRegistration: settings?.allowLateRegistration ?? false,
      autoGenerateIndexNumbers: settings?.autoGenerateIndexNumbers ?? true,
      requireDocumentVerification: settings?.requireDocumentVerification ?? true,
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: settings?.emailNotifications ?? true,
      smsNotifications: settings?.smsNotifications ?? false,
      paymentReminders: settings?.paymentReminders ?? true,
      resultNotifications: settings?.resultNotifications ?? true,
      systemAnnouncements: settings?.systemAnnouncements ?? true,
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      return apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const onSaveOrganization = (data: OrganizationFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const onSaveExamSettings = (data: ExamSettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const onSaveNotifications = (data: NotificationFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const isAdmin = user?.role === "super_admin" || user?.role === "examination_admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access system settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings for the examination management system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="examination" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Examination</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Fees</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Configure your organization's information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SettingsSkeleton />
              ) : (
                <Form {...organizationForm}>
                  <form
                    onSubmit={organizationForm.handleSubmit(onSaveOrganization)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={organizationForm.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name (English)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Amaanah Examination Board"
                                {...field}
                                data-testid="input-org-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={organizationForm.control}
                        name="organizationNameArabic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name (Arabic)</FormLabel>
                            <FormControl>
                              <Input
                                dir="rtl"
                                placeholder="مجلس امتحانات الأمانة"
                                className="font-arabic"
                                {...field}
                                data-testid="input-org-name-arabic"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={organizationForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="info@amaanah.org"
                                {...field}
                                data-testid="input-org-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={organizationForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+220 123 4567"
                                {...field}
                                data-testid="input-org-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={organizationForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter organization address"
                              {...field}
                              data-testid="input-org-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={organizationForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="https://amaanah.org"
                                {...field}
                                data-testid="input-org-website"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        data-testid="button-save-organization"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examination" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Examination Settings</CardTitle>
              <CardDescription>
                Configure examination-related options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SettingsSkeleton />
              ) : (
                <Form {...examSettingsForm}>
                  <form
                    onSubmit={examSettingsForm.handleSubmit(onSaveExamSettings)}
                    className="space-y-6"
                  >
                    <FormField
                      control={examSettingsForm.control}
                      name="allowLateRegistration"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Allow Late Registration</FormLabel>
                            <FormDescription>
                              Enable registration after the deadline with late fees
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-late-registration"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={examSettingsForm.control}
                      name="autoGenerateIndexNumbers"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Generate Index Numbers</FormLabel>
                            <FormDescription>
                              Automatically generate index numbers for registered students
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-auto-index"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={examSettingsForm.control}
                      name="requireDocumentVerification"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Require Document Verification</FormLabel>
                            <FormDescription>
                              Schools must upload verification documents during registration
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-doc-verification"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        data-testid="button-save-examination"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>
                Set examination fees and payment settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SettingsSkeleton />
              ) : (
                <Form {...examSettingsForm}>
                  <form
                    onSubmit={examSettingsForm.handleSubmit(onSaveExamSettings)}
                    className="space-y-6"
                  >
                    <FormField
                      control={examSettingsForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GMD">GMD (Gambian Dalasi)</SelectItem>
                              <SelectItem value="USD">USD (US Dollar)</SelectItem>
                              <SelectItem value="EUR">EUR (Euro)</SelectItem>
                              <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={examSettingsForm.control}
                        name="registrationFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration Fee (per student)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-registration-fee"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={examSettingsForm.control}
                        name="lateFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Late Registration Fee</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-late-fee"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={examSettingsForm.control}
                        name="certificateFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificate Fee</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-certificate-fee"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={examSettingsForm.control}
                        name="transcriptFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transcript Fee</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-transcript-fee"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        data-testid="button-save-fees"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure system notification settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SettingsSkeleton />
              ) : (
                <Form {...notificationForm}>
                  <form
                    onSubmit={notificationForm.handleSubmit(onSaveNotifications)}
                    className="space-y-6"
                  >
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Send notifications via email
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-email-notifications"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">SMS Notifications</FormLabel>
                            <FormDescription>
                              Send notifications via SMS (requires SMS gateway)
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-sms-notifications"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="paymentReminders"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Payment Reminders</FormLabel>
                            <FormDescription>
                              Send automatic payment reminders to schools
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-payment-reminders"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="resultNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Result Notifications</FormLabel>
                            <FormDescription>
                              Notify schools when results are published
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-result-notifications"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="systemAnnouncements"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">System Announcements</FormLabel>
                            <FormDescription>
                              Receive system-wide announcements and updates
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-system-announcements"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        data-testid="button-save-notifications"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
