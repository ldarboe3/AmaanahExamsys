import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  School, 
  Users, 
  FileCheck, 
  Award, 
  ClipboardList,
  Shield,
  TrendingUp,
  BookOpen
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Amaanah</h1>
              <p className="text-xs text-muted-foreground">Examination Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/verify" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-verify-result"
            >
              Verify Result
            </a>
            <Button 
              variant="default" 
              onClick={() => window.location.href = '/api/auth/login'}
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-md bg-primary/10 text-primary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Trusted by 400+ Schools Nationwide
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-tight">
              Comprehensive Examination <br className="hidden md:block" />
              Management System
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Streamline Arabic & Islamic education examinations with our end-to-end platform. 
              From school registration to certificate generation, we handle it all.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/api/auth/login'}
                data-testid="button-get-started"
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = '/verify'}
                data-testid="button-check-results"
              >
                Check Results
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Everything You Need to Manage Examinations
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools designed for education administrators, schools, and students.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <School className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">School Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Seamless registration workflow with email verification, document upload, and profile management.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-chart-2" />
                </div>
                <CardTitle className="text-lg">Student Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Bulk CSV upload, grade-based filtering, and automated index number generation for all students.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center mb-3">
                  <FileCheck className="w-5 h-5 text-chart-3" />
                </div>
                <CardTitle className="text-lg">Payment Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automated invoice generation, payment status tracking, and comprehensive financial reporting.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center mb-3">
                  <ClipboardList className="w-5 h-5 text-chart-4" />
                </div>
                <CardTitle className="text-lg">Center Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Assign schools to examination centers, manage capacity, and track attendance efficiently.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center mb-3">
                  <Award className="w-5 h-5 text-chart-5" />
                </div>
                <CardTitle className="text-lg">Results & Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Process results with validation workflows, generate certificates and transcripts in bulk.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Comprehensive performance analytics by school, region, gender, and subject with year-over-year trends.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-primary mb-2">400+</div>
              <div className="text-sm text-muted-foreground">Registered Schools</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-chart-2 mb-2">50K+</div>
              <div className="text-sm text-muted-foreground">Students Examined</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-chart-3 mb-2">100+</div>
              <div className="text-sm text-muted-foreground">Exam Centers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-chart-4 mb-2">15+</div>
              <div className="text-sm text-muted-foreground">Regions Covered</div>
            </div>
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Designed for Every User
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Role-based access ensures everyone gets exactly what they need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  System Administrators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Manage examination years
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Approve schools and students
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Process and publish results
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Generate certificates
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="w-4 h-4 text-chart-2" />
                  School Administrators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                    Register and manage students
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                    Upload CSV student lists
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                    View invoices and payments
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-2" />
                    Download results
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-chart-3" />
                  Students & Parents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-3" />
                    View exam center details
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-3" />
                    Print exam cards
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-3" />
                    Check timetable
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-chart-3" />
                    View and print results
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to Transform Your Examination Process?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join hundreds of schools already using Amaanah for seamless examination management.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/auth/login'}
            data-testid="button-join-now"
          >
            Join Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">Amaanah</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear()} Amaanah Examination Management System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
