import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Eye, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Building2,
  Award,
  Heart,
  Globe,
  CheckCircle
} from "lucide-react";
import amaanahLogo from "@assets/amaanah-logo-BXDbf4ee_1764613882774.png";
import libraryImage from "@assets/generated_images/islamic_library_with_students.png";

const objectives = [
  "Strengthen unity among Madrassah and Islamic schools",
  "Coordinate and standardize curriculum, syllabi, teacher training, examinations, and certification",
  "Partner with Government in national education development",
  "Improve quality and standards across institutions",
  "Promote girls' education and fight illiteracy",
  "Expand Islamic/Arabic education into technical, vocational, and skills tracks",
  "Enhance access to reference materials and libraries including mobile units",
];

const foundingInstitutions = [
  "Talinding Islamic Institute",
  "Tadamun Islamic Studies Centre",
  "Bun Jeng Islamic Schools",
  "Omar Quraise Islamic School",
  "Brikama Islamic Institute",
  "Scientific Islamic School",
  "Muslim High School",
  "Sheikh Mass Kah Islamic Institute",
];

const governanceStructure = [
  {
    title: "General Assembly",
    description: "Representative body of member schools and Secretariat officials; meets annually",
    icon: Users,
  },
  {
    title: "Executive Committee",
    description: "Elected leadership with two-year terms; with advisory members from partner Islamic organizations",
    icon: Award,
  },
  {
    title: "Executive Bureau",
    description: "Professional Secretariat that manages day-to-day operations",
    icon: Building2,
  },
  {
    title: "Sub-Committees",
    description: "Technical groups supporting training & curriculum, examinations & scholarships, quality assurance, socio-cultural activities",
    icon: BookOpen,
  },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">About AMAANAH</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Who We Are
            </h1>
            <p className="text-lg text-muted-foreground">
              The General Secretariat for Islamic/Arabic Education (AMAANAH) is a national coordinating body 
              founded in April 1996 by leading Madrassah institutions to unify, standardize, and elevate 
              Islamic and Arabic education across The Gambia.
            </p>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="hover-elevate">
              <CardHeader>
                <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Eye className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  A unified, high-quality Islamic and Arabic education ecosystem that nurtures knowledge, 
                  character, and national development.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="w-14 h-14 rounded-md bg-chart-2/10 flex items-center justify-center mb-4">
                  <Target className="w-7 h-7 text-chart-2" />
                </div>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  To coordinate curricula, assessments, teacher training, and quality assurance across Madrassah 
                  and Tahfiz institutions; strengthen partnerships with Government and stakeholders; and broaden 
                  learning opportunities including technical, vocational, and scientific fields.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Objectives */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Our Goals</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Core Objectives
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {objectives.map((objective, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-background rounded-lg">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90">{objective}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={libraryImage} 
                alt="Islamic library and learning" 
                className="rounded-lg shadow-xl"
              />
            </div>
            <div>
              <Badge variant="outline" className="mb-4">Our Heritage</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Motto & Emblem
              </h2>
              <p className="text-muted-foreground mb-6">
                <strong className="text-foreground">Motto:</strong> Education for Development
              </p>
              <p className="text-muted-foreground mb-6">
                The emblem features a Qur'an/book and pen signifying education, with a computer 
                symbolizing the transformation of knowledge into development; colors reflect the 
                Gambian flag representing our national identity and commitment.
              </p>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <img src={amaanahLogo} alt="AMAANAH Emblem" className="w-20 h-20 object-contain" />
                <div>
                  <p className="font-semibold text-foreground">GSIAE / AMAANAH</p>
                  <p className="text-sm text-muted-foreground">
                    General Secretariat for Islamic & Arabic Education in The Gambia
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Governance Structure */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Organization</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Governance Structure
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AMAANAH operates through a well-defined governance structure ensuring democratic 
              representation and professional management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {governanceStructure.map((item, i) => (
              <Card key={i} className="text-center hover-elevate">
                <CardHeader>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Founding Institutions */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Our Founders</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Founding Institutions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AMAANAH was founded in April 1996 by these pioneering Islamic educational institutions.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {foundingInstitutions.map((institution, i) => (
              <div key={i} className="p-4 bg-muted/50 rounded-lg text-center hover-elevate">
                <GraduationCap className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{institution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
