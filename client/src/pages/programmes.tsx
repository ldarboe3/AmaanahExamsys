import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  Shield, 
  Building2,
  Users,
  FileCheck,
  Database,
  Award,
  Globe,
  Heart,
  CheckCircle
} from "lucide-react";
import teacherImage from "@assets/generated_images/islamic_teacher_teaching_students.png";

const programmes = [
  {
    id: "curriculum",
    title: "Curriculum Development & Teacher Training",
    icon: BookOpen,
    color: "primary",
    features: [
      "Lead curriculum design and review (syllabuses, textbooks)",
      "Commission writing workshops and teacher orientation",
      "Maintain electronic/hard-copy repositories of curriculum materials",
      "Conduct training needs assessments",
      "Plan and monitor in-service training programs",
    ],
  },
  {
    id: "examinations",
    title: "Examinations, Assessment & Certification",
    icon: Award,
    color: "chart-2",
    features: [
      "Develop and validate exam papers and marking schemes",
      "Oversee conduct of examinations, marking, tabulation, validation",
      "Issue certificates and maintain results archives",
      "Analyse results to inform curriculum improvements",
      "National certification framework",
    ],
  },
  {
    id: "quality",
    title: "Quality Assurance & Monitoring (QAM)",
    icon: Shield,
    color: "chart-3",
    features: [
      "Coordinate national/regional monitoring through QALO and cluster monitors",
      "Collect and analyse institutional data and monitoring reports",
      "Identify gaps and best practices; liaise with regions and MoBSE",
      "Issue Certificates of Recognition",
      "Maintain statistical databases",
    ],
  },
  {
    id: "endowment",
    title: "Endowment & Projects",
    icon: Building2,
    color: "chart-4",
    features: [
      "Coordinate endowment contributions and special accounts",
      "Resource mobilisation (infrastructure, materials, maintenance)",
      "Lease and manage AMAANAH properties and assets",
      "Develop proposals; supervise implementation",
      "Maintain project registers",
    ],
  },
];

const bureauUnits = [
  {
    title: "Administration Unit",
    roles: ["Records/Secretariat", "HR", "Finance", "Public Relations", "IT"],
    icon: Database,
  },
  {
    title: "Programmes & Operations Unit",
    roles: ["Curriculum Development & Training", "Assessment/Examinations", "Quality Assurance & Monitoring", "Data and Certification"],
    icon: GraduationCap,
  },
  {
    title: "Endowment & Projects Unit",
    roles: ["Endowment Coordination", "Resource Mobilisation", "Project Development", "Project Supervision"],
    icon: Building2,
  },
];

const keyRoles = [
  "Administrative Secretary (Executive Secretary)",
  "Secretary/Records Manager",
  "Human Resources Officer",
  "Treasurer/Accounting Officer",
  "Public Relations Officer",
  "IT Officer",
  "Head of Programmes/Operations",
  "Curriculum Development & Training Officer",
  "Assessment/Examinations Officer",
  "Quality Assurance & Monitoring Officer",
  "Quality Assurance Liaison Officers (regional)",
  "Head of Endowment & Projects",
];

export default function Programmes() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">Our Work</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Programmes & Services
            </h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive educational services supporting Madrassah and Islamic institutions 
              across The Gambia through curriculum development, examinations, quality assurance, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Main Programmes */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="space-y-12">
            {programmes.map((programme, i) => (
              <div 
                key={programme.id} 
                id={programme.id}
                className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className={`w-14 h-14 rounded-md bg-${programme.color}/10 flex items-center justify-center mb-4`}>
                    <programme.icon className={`w-7 h-7 text-${programme.color}`} />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    {programme.title}
                  </h2>
                  <ul className="space-y-3">
                    {programme.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`bg-muted/30 rounded-xl p-8 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  <Card className="hover-elevate">
                    <CardHeader className="text-center">
                      <programme.icon className="w-16 h-16 text-primary mx-auto mb-4" />
                      <CardTitle>{programme.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        Supporting excellence in Islamic and Arabic education through professional 
                        coordination and quality assurance.
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Welfare */}
      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img 
                src={teacherImage} 
                alt="Community engagement" 
                className="rounded-lg shadow-xl"
              />
            </div>
            <div>
              <Badge variant="outline" className="mb-4">Community</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Social Welfare & Propagation
              </h2>
              <ul className="space-y-4">
                {[
                  "Promote Islamic culture and community engagement",
                  "Support staff welfare and student welfare programmes",
                  "Public information, sensitisation, and da'wa activities",
                  "Community outreach and partnerships",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Bureau */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Administration</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Executive Bureau
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The Bureau is the management hub of AMAANAH, ensuring policy execution, educational 
              planning, staff management, budgeting and reporting, data systems, public relations, 
              regional coordination, and reconciliation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {bureauUnits.map((unit, i) => (
              <Card key={i} className="hover-elevate">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <unit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{unit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {unit.roles.map((role, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {role}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-muted/30 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">Key Roles</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {keyRoles.map((role, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
