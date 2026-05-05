import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  FileText,
  Download,
  BookOpen,
  Library,
  ChevronRight,
  FileSpreadsheet,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FolderOpen,
  Layers,
} from "lucide-react";
import { Link } from "wouter";
import type { Resource, ResourceCategory } from "@shared/schema";

function getFileIcon(fileType?: string | null) {
  const t = fileType?.toUpperCase();
  if (!t) return File;
  if (["PDF", "DOC", "DOCX", "TXT"].includes(t)) return FileText;
  if (["XLS", "XLSX", "CSV"].includes(t)) return FileSpreadsheet;
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(t)) return FileImage;
  if (["MP4", "AVI", "MOV", "MKV"].includes(t)) return FileVideo;
  if (["MP3", "WAV", "OGG"].includes(t)) return FileAudio;
  return File;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function ResourceCard({ resource, category }: { resource: Resource; category?: ResourceCategory }) {
  const FileIcon = getFileIcon(resource.fileType);
  const size = formatFileSize(resource.fileSize);

  return (
    <Card className="hover-elevate flex flex-col" data-testid={`card-resource-${resource.id}`}>
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-4">
          {category ? (
            <Badge variant="secondary" className="text-xs">{category.name}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">General</Badge>
          )}
          {size && <span className="text-xs text-muted-foreground">{size}</span>}
        </div>

        <div className="flex items-start gap-3 flex-1 mb-4">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground leading-tight">{resource.title}</p>
            {resource.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {resource.fileType || "Document"}
              {resource.downloadCount ? ` · ${resource.downloadCount} downloads` : ""}
            </p>
          </div>
        </div>

        <a
          href={`/api/public/resources/${resource.id}/download`}
          target="_blank"
          rel="noreferrer"
          data-testid={`button-download-resource-${resource.id}`}
        >
          <Button variant="outline" className="w-full" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

function ResourcesSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex justify-between mb-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Resources() {
  const { data, isLoading } = useQuery<{ resources: Resource[]; categories: ResourceCategory[] }>({
    queryKey: ["/api/public/resources"],
  });

  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  const allResources = data?.resources ?? [];
  const categories = data?.categories ?? [];

  const usedCategoryIds = new Set(allResources.map(r => r.categoryId).filter(Boolean));
  const activeCategories = categories.filter(c => usedCategoryIds.has(c.id));
  const uncategorised = allResources.filter(r => !r.categoryId);

  const filteredResources = activeCategory === "all"
    ? allResources
    : activeCategory === -1
      ? uncategorised
      : allResources.filter(r => r.categoryId === activeCategory);

  const groupedByCategory: { category?: ResourceCategory; resources: Resource[] }[] =
    activeCategory !== "all"
      ? [{ category: categories.find(c => c.id === activeCategory), resources: filteredResources }]
      : [
        ...activeCategories.map(cat => ({
          category: cat,
          resources: allResources.filter(r => r.categoryId === cat.id),
        })),
        ...(uncategorised.length > 0 ? [{ category: undefined, resources: uncategorised }] : []),
      ];

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-14">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4">Publication Centre</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Publications &amp; Materials
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access syllabuses, teacher guides, assessment reports, policies, and other
            educational materials published by AMAANAH.
          </p>
        </div>
      </section>

      {/* ── Publications ── */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">

          {isLoading ? (
            <ResourcesSkeleton />
          ) : allResources.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground">No publications yet</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Publications will appear here once they are added and made available by the administration.
              </p>
            </div>
          ) : (
            <>
              {/* Category filter tabs */}
              {activeCategories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                    style={activeCategory === "all"
                      ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                      : { background: "transparent", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
                    }
                    data-testid="filter-all"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    All
                    <span className="ml-1 text-xs opacity-70">({allResources.length})</span>
                  </button>
                  {activeCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                      style={activeCategory === cat.id
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                        : { background: "transparent", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
                      }
                      data-testid={`filter-cat-${cat.id}`}
                    >
                      {cat.name}
                      <span className="ml-1 text-xs opacity-70">
                        ({allResources.filter(r => r.categoryId === cat.id).length})
                      </span>
                    </button>
                  ))}
                  {uncategorised.length > 0 && (
                    <button
                      onClick={() => setActiveCategory(-1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                      style={activeCategory === -1
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                        : { background: "transparent", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
                      }
                      data-testid="filter-uncategorised"
                    >
                      General
                      <span className="ml-1 text-xs opacity-70">({uncategorised.length})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Publications grouped by category */}
              <div className="space-y-12">
                {groupedByCategory
                  .filter(g => g.resources.length > 0)
                  .map((group, idx) => (
                    <div key={group.category?.id ?? "uncategorised-" + idx}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground">
                            {group.category?.name ?? "General"}
                          </h2>
                          {group.category?.description && (
                            <p className="text-sm text-muted-foreground">{group.category.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {group.resources.length} {group.resources.length === 1 ? "file" : "files"}
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {group.resources.map(resource => (
                          <ResourceCard
                            key={resource.id}
                            resource={resource}
                            category={group.category}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Library Services ── */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="outline" className="mb-4">Libraries</Badge>
              <h2 className="text-3xl font-bold text-foreground mb-4">Library Services</h2>
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
