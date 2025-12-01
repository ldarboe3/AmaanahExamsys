import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, 
  Search,
  ChevronRight,
  Newspaper,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { NewsArticle, NewsCategory } from "@shared/schema";

interface NewsApiResponse {
  articles: NewsArticle[];
  categories: NewsCategory[];
}

export default function News() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: newsData, isLoading: articlesLoading } = useQuery<NewsApiResponse>({
    queryKey: ["/api/public/news"],
  });

  const articles = newsData?.articles || [];
  const categories = newsData?.categories || [];

  const categoryList = ["All", ...(categories.map(c => c.name) || [])];

  const filteredNews = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (article.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || 
      categories.find(c => c.id === article.categoryId)?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles.filter(a => a.isFeatured);

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "General";
    return categories.find(c => c.id === categoryId)?.name || "General";
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    try {
      return format(new Date(date), "MMMM d, yyyy");
    } catch {
      return "";
    }
  };

  return (
    <PublicLayout>
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

      {featuredArticles.length > 0 && (
        <section className="py-12 md:py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8">Featured Stories</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.map((article) => (
                <Card key={article.id} className="hover-elevate overflow-hidden">
                  <div className="h-2 bg-primary" />
                  {article.featuredImage && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={article.featuredImage} 
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{getCategoryName(article.categoryId)}</Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(article.publishedAt)}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base mb-4">
                      {article.excerpt}
                    </CardDescription>
                    <Button variant="ghost" className="px-0 text-primary hover:text-primary/80">
                      Read Full Article <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
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
              {categoryList.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {articlesLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="flex gap-6 p-6">
                    <Skeleton className="w-14 h-14 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNews.length > 0 ? (
            <div className="space-y-6">
              {filteredNews.map((article) => (
                <Card key={article.id} className="hover-elevate" data-testid={`card-news-${article.id}`}>
                  <CardContent className="flex gap-6 p-6">
                    {article.featuredImage ? (
                      <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={article.featuredImage} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Newspaper className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{getCategoryName(article.categoryId)}</Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{article.title}</h3>
                      <p className="text-muted-foreground mb-3">{article.excerpt}</p>
                      <Button variant="ghost" className="px-0 h-auto text-primary hover:text-primary/80">
                        Read More <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No articles found</h3>
                <p className="text-muted-foreground">
                  {articles?.length === 0 
                    ? "Check back later for news and updates."
                    : "Try adjusting your search or filter criteria."}
                </p>
              </CardContent>
            </Card>
          )}

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
