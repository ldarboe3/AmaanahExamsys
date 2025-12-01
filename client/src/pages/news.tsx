import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Search,
  ChevronRight,
  Newspaper,
  Award,
  GraduationCap,
  BookOpen,
  Users
} from "lucide-react";
import { useState } from "react";

const newsArticles = [
  {
    id: 1,
    title: "2024 Examination Results Released",
    excerpt: "Results for the 2024 national Islamic and Arabic education examinations are now available for verification. Students can check their results online using their index numbers.",
    date: "December 1, 2024",
    category: "Examinations",
    icon: Award,
    featured: true,
  },
  {
    id: 2,
    title: "National Teacher Training Workshop Concludes",
    excerpt: "AMAANAH successfully conducted training workshops for over 200 teachers from across all seven regions, focusing on modern teaching methodologies and curriculum delivery.",
    date: "November 15, 2024",
    category: "Training",
    icon: GraduationCap,
    featured: true,
  },
  {
    id: 3,
    title: "New Curriculum Standards Announced",
    excerpt: "Updated curriculum guidelines have been released for Madrassah institutions following extensive stakeholder consultations and review processes.",
    date: "October 20, 2024",
    category: "Curriculum",
    icon: BookOpen,
    featured: false,
  },
  {
    id: 4,
    title: "Regional Coordinators Meeting",
    excerpt: "Quality Assurance Liaison Officers from all regions met to discuss monitoring strategies and share best practices for institutional improvement.",
    date: "October 5, 2024",
    category: "Quality Assurance",
    icon: Users,
    featured: false,
  },
  {
    id: 5,
    title: "Partnership with Ministry of Education",
    excerpt: "AMAANAH strengthens collaboration with MoBSE on the integration of Islamic education into the national education framework.",
    date: "September 18, 2024",
    category: "Partnerships",
    icon: Users,
    featured: false,
  },
  {
    id: 6,
    title: "Annual General Assembly 2024",
    excerpt: "Member schools gathered for the annual General Assembly to review progress, elect new leadership, and set priorities for the coming year.",
    date: "August 25, 2024",
    category: "Governance",
    icon: Users,
    featured: false,
  },
];

const categories = ["All", "Examinations", "Training", "Curriculum", "Quality Assurance", "Partnerships", "Governance"];

export default function News() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredNews = newsArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = newsArticles.filter(a => a.featured);

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4">
              <Newspaper className="w-3 h-3 mr-1" />
              News & Updates
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Latest News
            </h1>
            <p className="text-lg text-muted-foreground">
              Stay updated with the latest announcements, events, and opportunities from AMAANAH.
            </p>
          </div>
        </div>
      </section>

      {/* Featured News */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8">Featured Stories</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredArticles.map((article) => (
              <Card key={article.id} className="hover-elevate overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {article.date}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-4">
                    {article.excerpt}
                  </CardDescription>
                  <Button variant="link" className="px-0">
                    Read Full Article <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* All News */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-news"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* News List */}
          <div className="space-y-6">
            {filteredNews.length > 0 ? (
              filteredNews.map((article) => (
                <Card key={article.id} className="hover-elevate">
                  <CardContent className="flex gap-6 p-6">
                    <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <article.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{article.category}</Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {article.date}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{article.title}</h3>
                      <p className="text-muted-foreground mb-3">{article.excerpt}</p>
                      <Button variant="link" className="px-0 h-auto">
                        Read More <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No articles found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filter criteria.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Archive Notice */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Looking for older news articles?
            </p>
            <Button variant="outline">
              Browse Archive by Year
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
