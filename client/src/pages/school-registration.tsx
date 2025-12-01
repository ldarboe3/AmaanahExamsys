import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  School, 
  Mail, 
  CheckCircle,
  Loader2,
  AlertCircle,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  Shield,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const registrationSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  schoolType: z.string().min(1, "Please select school type"),
  region: z.string().min(1, "Please select region"),
  address: z.string().min(5, "Address is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Phone number is required"),
  principalName: z.string().min(2, "Principal name is required"),
  principalEmail: z.string().email("Please enter a valid principal email"),
  principalPhone: z.string().min(7, "Principal phone is required"),
  studentCount: z.string().min(1, "Approximate student count is required"),
  affiliatedOrganization: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const regions = [
  "Banjul",
  "Kanifing",
  "West Coast Region",
  "North Bank Region",
  "Lower River Region",
  "Central River Region",
  "Upper River Region",
];

const schoolTypes = [
  "Madrassah",
  "Tahfiz School",
  "Islamic Secondary School",
  "Islamic Primary School",
  "Mixed (Islamic/Arabic)",
];

const steps = [
  { icon: FileText, title: "Submit Application", description: "Fill out the registration form" },
  { icon: Mail, title: "Email Verification", description: "Verify your school email address" },
  { icon: Shield, title: "Document Review", description: "AMAANAH reviews your application" },
  { icon: CheckCircle, title: "Approval", description: "Receive membership confirmation" },
];

export default function SchoolRegistration() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      schoolName: "",
      schoolType: "",
      region: "",
      address: "",
      email: "",
      phone: "",
      principalName: "",
      principalEmail: "",
      principalPhone: "",
      studentCount: "",
      affiliatedOrganization: "",
      additionalInfo: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      return apiRequest("POST", "/api/public/school-registration", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      setSubmittedEmail(form.getValues("email"));
      toast({
        title: "Registration Submitted!",
        description: "Please check your email to verify your registration.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    registerMutation.mutate(data);
  };

  if (submitted) {
    return (
      <PublicLayout>
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <Card className="max-w-lg mx-auto text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Check Your Email
                </h2>
                <p className="text-muted-foreground mb-6">
                  We've sent a verification link to:
                </p>
                <p className="font-semibold text-foreground mb-6">
                  {submittedEmail}
                </p>
                <Alert className="text-left mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Click the verification link in your email to complete your registration. 
                    The link will expire in 24 hours.
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => registerMutation.mutate(form.getValues())}
                    disabled={registerMutation.isPending}
                  >
                    Resend Verification Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">
              <School className="w-3 h-3 mr-1" />
              School Registration
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Register Your School
            </h1>
            <p className="text-lg text-muted-foreground">
              Join AMAANAH and access curriculum support, national examinations, teacher training, 
              and quality assurance services for your Islamic/Arabic institution.
            </p>
          </div>
        </div>
      </section>

      {/* Registration Steps */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>School Registration Form</CardTitle>
              <CardDescription>
                Please fill out all required fields. You will receive a verification email after submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* School Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      School Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="schoolName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Talinding Islamic Institute" {...field} data-testid="input-school-name" />
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
                            <FormLabel>School Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-school-type">
                                  <SelectValue placeholder="Select school type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {schoolTypes.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-region">
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regions.map((region) => (
                                  <SelectItem key={region} value={region}>{region}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="studentCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Approximate Student Count *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 250" {...field} data-testid="input-student-count" />
                            </FormControl>
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
                          <FormLabel>School Address *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Full address of the school" {...field} data-testid="input-school-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="school@example.com" {...field} data-testid="input-school-email" />
                            </FormControl>
                            <FormDescription>
                              Verification link will be sent to this email
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="+220 123 4567" {...field} data-testid="input-school-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Principal Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Principal/Head Teacher Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="principalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Principal's name" {...field} data-testid="input-principal-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="principalEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="principal@example.com" {...field} data-testid="input-principal-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="principalPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="+220 123 4567" {...field} data-testid="input-principal-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Additional Information
                    </h3>
                    <FormField
                      control={form.control}
                      name="affiliatedOrganization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Affiliated Organization (if any)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Supreme Islamic Council" {...field} data-testid="input-affiliated-org" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="additionalInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional information about your school..." 
                              {...field} 
                              data-testid="input-additional-info"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                      data-testid="button-submit-registration"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <School className="w-4 h-4 mr-2" />
                          Submit Registration
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      By submitting, you agree to use approved AMAANAH curricula and comply with Secretariat regulations.
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Already Registered */}
          <div className="max-w-3xl mx-auto mt-8 text-center">
            <p className="text-muted-foreground">
              Already registered?{" "}
              <Link href="/login">
                <span className="text-primary hover:underline cursor-pointer">Sign in to the portal</span>
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
