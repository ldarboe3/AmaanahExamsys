import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";
import studentsBg from "@assets/generated_images/african_islamic_students_in_classroom.png";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response as { mustChangePassword?: boolean };
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (user?.mustChangePassword) {
        setLocation("/change-password");
      } else {
        setLocation("/");
      }
    },
    onError: (err: any) => {
      setError(err.message || "Invalid username or password");
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Background Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${studentsBg})` }}
      >
        {/* Dark overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        
        {/* Content over the image */}
        <div className="relative z-10 flex flex-col justify-end p-8 lg:p-12 text-white h-full">
          {/* Tagline */}
          <div className="max-w-md mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Education for Development
            </h2>
            <p className="text-lg text-white/90">
              Empowering the next generation through quality Islamic and Arabic education across The Gambia.
            </p>
          </div>
          
          {/* Footer */}
          <div className="text-sm text-white/70">
            <p>Examination Management System</p>
            <p className="mt-1">The Gambia</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col bg-background">
        {/* Mobile Header with Logo */}
        <div className="lg:hidden flex items-center justify-center gap-3 p-6 border-b bg-primary/5">
          <img 
            src={amaanahLogo} 
            alt="Amaanah Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Amaanah</h1>
            <p className="text-xs text-muted-foreground">Examination System</p>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Desktop Logo above form */}
            <div className="hidden lg:flex flex-col items-center mb-8">
              <img 
                src={amaanahLogo} 
                alt="Amaanah Logo" 
                className="w-24 h-24 object-contain mb-4"
              />
              <h1 className="text-xl font-semibold text-foreground">Welcome Back</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to continue to Amaanah
              </p>
            </div>

            <Card className="border-0 shadow-none lg:border lg:shadow-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl lg:hidden">Sign In</CardTitle>
                <CardDescription className="lg:hidden">
                  Enter your credentials to access the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username or Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username or email"
                              autoComplete="username"
                              className="h-11"
                              {...field}
                              data-testid="input-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                className="h-11 pr-10"
                                {...field}
                                data-testid="input-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-11"
                      disabled={loginMutation.isPending}
                      data-testid="button-login-submit"
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      )}
                      Sign In
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Test Credentials (for demonstration)
                  </p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-md">
                      <div>
                        <p className="font-medium text-foreground">Super Admin</p>
                        <p>superadmin / Admin@123</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Exam Admin</p>
                        <p>examinationadmin / Admin@123</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Logistics Admin</p>
                        <p>logisticsadmin / Admin@123</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">School Admin</p>
                        <p>schooladmin / Admin@123</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Examiner</p>
                        <p>examiner / Admin@123</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Candidate</p>
                        <p>candidate / Admin@123</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} GSIAE/Amaanah. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
