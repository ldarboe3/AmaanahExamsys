import { Link } from "wouter";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CheckCircle, 
  Award, 
  BookOpen, 
  Shield,
  FileText,
  Building2,
  ChevronRight,
  Star
} from "lucide-react";
import graduationImage from "@assets/generated_images/islamic_school_graduation_ceremony.png";

const membershipCategories = [
  {
    title: "General Membership",
    description: "Open to all Islamic schools under recognized organizations",
    features: [
      "Access to standardized curriculum",
      "Participation in national examinations",
      "Basic training opportunities",
      "Quality assurance support",
    ],
    icon: Users,
  },
  {
    title: "Executive Membership",
    description: "For institutions with enhanced engagement and leadership roles",
    features: [
      "All General membership benefits",
      "Voting rights in General Assembly",
      "Priority training access",
      "Committee participation opportunities",
    ],
    icon: Star,
  },
  {
    title: "Permanent Executive (Advisory)",
    description: "Senior institutions providing guidance and expertise",
    features: [
      "All Executive membership benefits",
      "Advisory role in policy development",
      "Representation in key decisions",
      "Leadership mentorship opportunities",
    ],
    icon: Award,
  },
  {
    title: "Honorary Membership",
    description: "Recognition for distinguished contributions to Islamic education",
    features: [
      "Special recognition status",
      "Invitation to official events",
      "Advisory consultation",
      "Legacy acknowledgment",
    ],
    icon: Shield,
  },
];

const benefits = [
  { icon: BookOpen, title: "Standardized Curriculum", description: "Access to approved syllabuses, textbooks, and teaching guides" },
  { icon: Award, title: "Examinations & Certification", description: "Participation in national certification frameworks" },
  { icon: Users, title: "Teacher Development", description: "Training workshops and professional development opportunities" },
  { icon: Shield, title: "Quality Assurance", description: "Monitoring, evaluation, and institutional support" },
  { icon: Building2, title: "Data Systems", description: "Inclusion in national educational data systems" },
  { icon: FileText, title: "Resources & Projects", description: "Access to library resources and development projects" },
];

const howToJoin = [
  { step: 1, title: "Submit Application", description: "Submit written application via supervising/affiliated organization" },
  { step: 2, title: "Pay Registration", description: "Pay registration fee and annual subscription by membership level" },
  { step: 3, title: "Accept Guidelines", description: "Agree to use approved curricula and comply with Secretariat regulations" },
  { step: 4, title: "Get Verified", description: "Complete verification process and receive membership confirmation" },
];

export default function Membership() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section 
        className="relative py-12 md:py-12"
        style={{ backgroundImage: `url(${graduationImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/50" />
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/20 text-white border-primary/30">Membership</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Join AMAANAH
            </h1>
            <p className="text-lg text-white/90 mb-8">
              Become part of a unified network of Islamic educational institutions across The Gambia. 
              Access curriculum support, examinations, teacher training, and quality assurance services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/school-registration">
                <Button size="lg" data-testid="button-register-school">
                  Register Your School
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Categories */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Categories</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Membership Levels
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AMAANAH offers different membership categories to accommodate various types of 
              Islamic educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {membershipCategories.map((category, i) => (
              <Card key={i} className="hover-elevate h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <category.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 md:py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Value</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Membership Benefits
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join AMAANAH and access comprehensive support for your institution's educational mission.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-4 p-6 bg-background rounded-lg hover-elevate">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="py-12 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How to Join
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Follow these steps to become a member of AMAANAH.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {howToJoin.map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Card className="inline-block">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">Ready to join?</h3>
                  <p className="text-muted-foreground mb-4">
                    Register your school online and start the membership process.
                  </p>
                  <Link href="/school-registration">
                    <Button>
                      Start Registration
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="py-12 md:py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Award className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Recognition & Certification
          </h2>
          <p className="text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Institutions can receive Certificates of Recognition and participate in national 
            certification frameworks through AMAANAH.
          </p>
          <Link href="/contact">
            <Button variant="secondary" size="lg">
              Learn More About Recognition
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
