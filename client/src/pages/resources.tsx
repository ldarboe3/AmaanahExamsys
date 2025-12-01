import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  BookOpen, 
  FileCheck,
  Library,
  ScrollText,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";

const publications = [
  { title: "Primary Level Syllabus", type: "PDF", size: "2.4 MB", category: "Syllabus" },
  { title: "Secondary Level Syllabus", type: "PDF", size: "3.1 MB", category: "Syllabus" },
  { title: "Teacher's Guide - Arabic", type: "PDF", size: "1.8 MB", category: "Guide" },
  { title: "Teacher's Guide - Islamic Studies", type: "PDF", size: "2.2 MB", category: "Guide" },
  { title: "Assessment Guidelines", type: "PDF", size: "1.5 MB", category: "Policy" },
  { title: "Statistical Yearbook 2023", type: "PDF", size: "4.2 MB", category: "Report" },
];

const documents = [
  { title: "AMAANAH Constitution", description: "The governing document of the Secretariat", icon: ScrollText },
  { title: "Executive Bureau Mandate & TOR", description: "Terms of reference for the Bureau", icon: FileCheck },
  { title: "Membership Application Form", description: "Form for new member institutions", icon: FileText },
  { title: "Institutional Minimum Standards", description: "Quality standards for member schools", icon: BookOpen },
];

export default function Resources() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">Resources</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Publications & Materials
            </h1>
            <p className="text-lg text-muted-foreground">
              Access syllabuses, textbooks, teacher guides, assessment reports, policies, 
              and other educational materials from AMAANAH.
            </p>
          </div>
        </div>
      </section>

      {/* Publications */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Publications</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Educational Materials
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Download syllabuses, teacher guides, and educational resources for Islamic and Arabic education.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publications.map((pub, i) => (
              <Card key={i} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{pub.category}</Badge>
                    <span className="text-xs text-muted-foreground">{pub.size}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{pub.title}</p>
                      <p className="text-xs text-muted-foreground">{pub.type} Document</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Documents Centre */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Documents Centre</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Official Documents
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Access the constitution, policies, forms, and standards documentation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {documents.map((doc, i) => (
              <Card key={i} className="hover-elevate">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <doc.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>
                    <Button variant="link" className="px-0 h-auto">
                      Download PDF <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Libraries */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <Badge variant="outline" className="mb-4">Libraries</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Library Services
              </h2>
              <p className="text-muted-foreground mb-6">
                AMAANAH provides reference libraries and mobile library services to support 
                Islamic and Arabic education across The Gambia.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Reference libraries with Islamic and Arabic texts",
                  "Mobile library services reaching rural areas",
                  "Educational materials and resources",
                  "Research and reference support",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Library className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/contact">
                <Button>
                  Contact for Library Access
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-8 text-center">
                <Library className="w-16 h-16 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-4">Mobile Library</h3>
                <p className="text-primary-foreground/80 mb-6">
                  Our mobile library service brings educational resources directly to schools 
                  in remote areas, ensuring access to quality Islamic education materials.
                </p>
                <Badge variant="secondary">Available Nationwide</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
