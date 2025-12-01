import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Newspaper,
  FileText,
  Bell,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  BarChart3,
  FolderOpen,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  NewsArticle, NewsCategory, 
  Resource, ResourceCategory,
  Announcement, NewsletterSubscriber, ImpactStat
} from "@shared/schema";
import { format } from "date-fns";

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function NewsArticlesTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    categoryId: "",
    isPublished: false,
    isFeatured: false,
  });

  const { data: articles, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/cms/news-articles"],
  });

  const { data: categories } = useQuery<NewsCategory[]>({
    queryKey: ["/api/cms/news-categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/cms/news-articles", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/news-articles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Article created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/cms/news-articles/${selectedArticle?.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/news-articles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Article updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/cms/news-articles/${selectedArticle?.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/news-articles"] });
      setDeleteDialogOpen(false);
      setSelectedArticle(null);
      toast({ title: "Article deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featuredImage: "",
      categoryId: "",
      isPublished: false,
      isFeatured: false,
    });
    setSelectedArticle(null);
  };

  const openEditDialog = (article: NewsArticle) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || "",
      content: article.content,
      featuredImage: article.featuredImage || "",
      categoryId: article.categoryId?.toString() || "",
      isPublished: article.isPublished ?? false,
      isFeatured: article.isFeatured ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
    };
    if (selectedArticle) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">News Articles</h3>
          <p className="text-sm text-muted-foreground">Manage news and announcements for the website</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-article">
          <Plus className="h-4 w-4 mr-2" />
          Add Article
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No articles found. Create your first article.
              </TableCell>
            </TableRow>
          )}
          {articles?.map((article) => {
            const category = categories?.find(c => c.id === article.categoryId);
            return (
              <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {article.isFeatured && <Star className="h-4 w-4 text-yellow-500" />}
                    <span className="font-medium">{article.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {category ? (
                    <Badge variant="outline">{category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={article.isPublished ? "default" : "secondary"}>
                    {article.isPublished ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>{article.viewCount || 0}</TableCell>
                <TableCell>
                  {article.createdAt ? format(new Date(article.createdAt), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(article)} data-testid={`button-edit-article-${article.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedArticle(article); setDeleteDialogOpen(true); }} data-testid={`button-delete-article-${article.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle ? "Edit Article" : "Create Article"}</DialogTitle>
            <DialogDescription>
              {selectedArticle ? "Update the article details" : "Add a new news article to the website"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    title: e.target.value,
                    slug: selectedArticle ? formData.slug : generateSlug(e.target.value)
                  });
                }}
                placeholder="Article title"
                data-testid="input-article-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="article-slug"
                data-testid="input-article-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger data-testid="select-article-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief summary of the article"
                rows={2}
                data-testid="input-article-excerpt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article content"
                rows={8}
                data-testid="input-article-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input
                id="featuredImage"
                value={formData.featuredImage}
                onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-article-image"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: !!checked })}
                  data-testid="checkbox-article-published"
                />
                <Label htmlFor="isPublished">Published</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: !!checked })}
                  data-testid="checkbox-article-featured"
                />
                <Label htmlFor="isFeatured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-article"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedArticle?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResourcesTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileType: "",
    fileSize: 0,
    categoryId: "",
    isPublished: false,
  });

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/cms/resources"],
  });

  const { data: categories } = useQuery<ResourceCategory[]>({
    queryKey: ["/api/cms/resource-categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/cms/resources", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/resources"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Resource created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/cms/resources/${selectedResource?.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/resources"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Resource updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/cms/resources/${selectedResource?.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/resources"] });
      setDeleteDialogOpen(false);
      setSelectedResource(null);
      toast({ title: "Resource deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      fileUrl: "",
      fileType: "",
      fileSize: 0,
      categoryId: "",
      isPublished: false,
    });
    setSelectedResource(null);
  };

  const openEditDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || "",
      fileUrl: resource.fileUrl || "",
      fileType: resource.fileType || "",
      fileSize: resource.fileSize || 0,
      categoryId: resource.categoryId?.toString() || "",
      isPublished: resource.isPublished ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
    };
    if (selectedResource) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Resources</h3>
          <p className="text-sm text-muted-foreground">Manage downloadable resources for schools and students</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-resource">
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Downloads</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No resources found. Add your first resource.
              </TableCell>
            </TableRow>
          )}
          {resources?.map((resource) => {
            const category = categories?.find(c => c.id === resource.categoryId);
            return (
              <TableRow key={resource.id} data-testid={`row-resource-${resource.id}`}>
                <TableCell className="font-medium">{resource.title}</TableCell>
                <TableCell>
                  {category ? (
                    <Badge variant="outline">{category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{resource.fileType || "Unknown"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={resource.isPublished ? "default" : "secondary"}>
                    {resource.isPublished ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>{resource.downloadCount || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(resource)} data-testid={`button-edit-resource-${resource.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedResource(resource); setDeleteDialogOpen(true); }} data-testid={`button-delete-resource-${resource.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
            <DialogDescription>
              {selectedResource ? "Update the resource details" : "Add a new downloadable resource"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Resource title"
                data-testid="input-resource-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                rows={3}
                data-testid="input-resource-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileUrl">File URL</Label>
              <Input
                id="fileUrl"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://example.com/file.pdf"
                data-testid="input-resource-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fileType">File Type</Label>
                <Select
                  value={formData.fileType}
                  onValueChange={(value) => setFormData({ ...formData, fileType: value })}
                >
                  <SelectTrigger data-testid="select-resource-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="DOC">DOC</SelectItem>
                    <SelectItem value="DOCX">DOCX</SelectItem>
                    <SelectItem value="XLS">XLS</SelectItem>
                    <SelectItem value="XLSX">XLSX</SelectItem>
                    <SelectItem value="PPT">PPT</SelectItem>
                    <SelectItem value="ZIP">ZIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger data-testid="select-resource-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: !!checked })}
                data-testid="checkbox-resource-published"
              />
              <Label htmlFor="isPublished">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-resource"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedResource?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AnnouncementsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as const,
    priority: 0,
    displayOnHomepage: true,
    isActive: true,
    linkUrl: "",
    linkText: "",
  });

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/cms/announcements"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/cms/announcements", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/announcements"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Announcement created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/cms/announcements/${selectedAnnouncement?.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/announcements"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Announcement updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/cms/announcements/${selectedAnnouncement?.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/announcements"] });
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      toast({ title: "Announcement deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "info",
      priority: 0,
      displayOnHomepage: true,
      isActive: true,
      linkUrl: "",
      linkText: "",
    });
    setSelectedAnnouncement(null);
  };

  const openEditDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content || "",
      type: announcement.type as any || "info",
      priority: announcement.priority || 0,
      displayOnHomepage: announcement.displayOnHomepage ?? true,
      isActive: announcement.isActive ?? true,
      linkUrl: announcement.linkUrl || "",
      linkText: announcement.linkText || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedAnnouncement) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "success": return "default";
      case "warning": return "secondary";
      case "error": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Announcements</h3>
          <p className="text-sm text-muted-foreground">Manage homepage banners and important notices</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-announcement">
          <Plus className="h-4 w-4 mr-2" />
          Add Announcement
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Homepage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No announcements found. Create your first announcement.
              </TableCell>
            </TableRow>
          )}
          {announcements?.map((announcement) => (
            <TableRow key={announcement.id} data-testid={`row-announcement-${announcement.id}`}>
              <TableCell className="font-medium">{announcement.title}</TableCell>
              <TableCell>
                <Badge variant={getTypeBadgeVariant(announcement.type || "info")}>
                  {announcement.type || "info"}
                </Badge>
              </TableCell>
              <TableCell>{announcement.priority || 0}</TableCell>
              <TableCell>
                {announcement.displayOnHomepage ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={announcement.isActive ? "default" : "secondary"}>
                  {announcement.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(announcement)} data-testid={`button-edit-announcement-${announcement.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedAnnouncement(announcement); setDeleteDialogOpen(true); }} data-testid={`button-delete-announcement-${announcement.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
            <DialogDescription>
              {selectedAnnouncement ? "Update the announcement details" : "Add a new announcement to the website"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
                data-testid="input-announcement-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Announcement content"
                rows={3}
                data-testid="input-announcement-content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="select-announcement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-announcement-priority"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkUrl">Link URL (optional)</Label>
                <Input
                  id="linkUrl"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://..."
                  data-testid="input-announcement-link-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkText">Link Text</Label>
                <Input
                  id="linkText"
                  value={formData.linkText}
                  onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                  placeholder="Learn more"
                  data-testid="input-announcement-link-text"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="displayOnHomepage"
                  checked={formData.displayOnHomepage}
                  onCheckedChange={(checked) => setFormData({ ...formData, displayOnHomepage: !!checked })}
                  data-testid="checkbox-announcement-homepage"
                />
                <Label htmlFor="displayOnHomepage">Show on Homepage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                  data-testid="checkbox-announcement-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-announcement"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAnnouncement?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NewsletterTab() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<NewsletterSubscriber | null>(null);

  const { data: subscribers, isLoading } = useQuery<NewsletterSubscriber[]>({
    queryKey: ["/api/cms/newsletter-subscribers"],
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/cms/newsletter-subscribers/${selectedSubscriber?.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/newsletter-subscribers"] });
      setDeleteDialogOpen(false);
      setSelectedSubscriber(null);
      toast({ title: "Subscriber removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <TableSkeleton />;

  const activeCount = subscribers?.filter(s => s.isActive).length || 0;
  const totalCount = subscribers?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Newsletter Subscribers</h3>
          <p className="text-sm text-muted-foreground">
            {activeCount} active / {totalCount} total subscribers
          </p>
        </div>
        <Button variant="outline" disabled data-testid="button-export-subscribers">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Subscribed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscribers?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No subscribers yet.
              </TableCell>
            </TableRow>
          )}
          {subscribers?.map((subscriber) => (
            <TableRow key={subscriber.id} data-testid={`row-subscriber-${subscriber.id}`}>
              <TableCell className="font-medium">{subscriber.email}</TableCell>
              <TableCell>{subscriber.name || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{subscriber.source || "website"}</Badge>
              </TableCell>
              <TableCell>
                {subscriber.subscribedAt ? format(new Date(subscriber.subscribedAt), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={subscriber.isActive ? "default" : "secondary"}>
                  {subscriber.isActive ? "Active" : "Unsubscribed"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setSelectedSubscriber(subscriber); setDeleteDialogOpen(true); }}
                  data-testid={`button-delete-subscriber-${subscriber.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{selectedSubscriber?.email}" from the newsletter list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImpactStatsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStat, setSelectedStat] = useState<ImpactStat | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    value: "",
    icon: "",
    displayOrder: 0,
    isActive: true,
  });

  const { data: stats, isLoading } = useQuery<ImpactStat[]>({
    queryKey: ["/api/cms/impact-stats"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/cms/impact-stats", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/impact-stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Stat created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/cms/impact-stats/${selectedStat?.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/impact-stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Stat updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/cms/impact-stats/${selectedStat?.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/impact-stats"] });
      setDeleteDialogOpen(false);
      setSelectedStat(null);
      toast({ title: "Stat deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      label: "",
      value: "",
      icon: "",
      displayOrder: 0,
      isActive: true,
    });
    setSelectedStat(null);
  };

  const openEditDialog = (stat: ImpactStat) => {
    setSelectedStat(stat);
    setFormData({
      label: stat.label,
      value: stat.value,
      icon: stat.icon || "",
      displayOrder: stat.displayOrder || 0,
      isActive: stat.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedStat) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Impact Statistics</h3>
          <p className="text-sm text-muted-foreground">Manage homepage impact numbers (e.g., "500+ Schools")</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-stat">
          <Plus className="h-4 w-4 mr-2" />
          Add Stat
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Icon</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No stats found. Add your first impact stat.
              </TableCell>
            </TableRow>
          )}
          {stats?.map((stat) => (
            <TableRow key={stat.id} data-testid={`row-stat-${stat.id}`}>
              <TableCell className="font-medium">{stat.label}</TableCell>
              <TableCell>{stat.value}</TableCell>
              <TableCell>{stat.icon || "—"}</TableCell>
              <TableCell>{stat.displayOrder || 0}</TableCell>
              <TableCell>
                <Badge variant={stat.isActive ? "default" : "secondary"}>
                  {stat.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(stat)} data-testid={`button-edit-stat-${stat.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedStat(stat); setDeleteDialogOpen(true); }} data-testid={`button-delete-stat-${stat.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedStat ? "Edit Stat" : "Add Impact Stat"}</DialogTitle>
            <DialogDescription>
              {selectedStat ? "Update the stat details" : "Add a new impact statistic to the homepage"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Schools Registered"
                data-testid="input-stat-label"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., 500+"
                data-testid="input-stat-value"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (optional)</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger data-testid="select-stat-icon">
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="award">Award</SelectItem>
                    <SelectItem value="map">Map</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-stat-order"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                data-testid="checkbox-stat-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-stat"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStat?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<NewsCategory | null>(null);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<ResourceCategory | null>(null);
  const [newsFormData, setNewsFormData] = useState({ name: "", slug: "", description: "" });
  const [resourceFormData, setResourceFormData] = useState({ name: "", slug: "", description: "" });

  const { data: newsCategories, isLoading: loadingNews } = useQuery<NewsCategory[]>({
    queryKey: ["/api/cms/news-categories"],
  });

  const { data: resourceCategories, isLoading: loadingResources } = useQuery<ResourceCategory[]>({
    queryKey: ["/api/cms/resource-categories"],
  });

  const createNewsCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/cms/news-categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/news-categories"] });
      setIsNewsDialogOpen(false);
      setNewsFormData({ name: "", slug: "", description: "" });
      toast({ title: "News category created" });
    },
  });

  const createResourceCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/cms/resource-categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/resource-categories"] });
      setIsResourceDialogOpen(false);
      setResourceFormData({ name: "", slug: "", description: "" });
      toast({ title: "Resource category created" });
    },
  });

  const deleteNewsCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/cms/news-categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/news-categories"] });
      toast({ title: "News category deleted" });
    },
  });

  const deleteResourceCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/cms/resource-categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/resource-categories"] });
      toast({ title: "Resource category deleted" });
    },
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  if (loadingNews || loadingResources) return <TableSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">News Categories</h3>
            <p className="text-sm text-muted-foreground">Organize news articles by category</p>
          </div>
          <Button onClick={() => setIsNewsDialogOpen(true)} data-testid="button-add-news-category">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newsCategories?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                  No news categories found.
                </TableCell>
              </TableRow>
            )}
            {newsCategories?.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>{cat.slug}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteNewsCategoryMutation.mutate(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Resource Categories</h3>
            <p className="text-sm text-muted-foreground">Organize downloadable resources by category</p>
          </div>
          <Button onClick={() => setIsResourceDialogOpen(true)} data-testid="button-add-resource-category">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resourceCategories?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                  No resource categories found.
                </TableCell>
              </TableRow>
            )}
            {resourceCategories?.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>{cat.slug}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteResourceCategoryMutation.mutate(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add News Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newsFormData.name}
                onChange={(e) => setNewsFormData({ 
                  ...newsFormData, 
                  name: e.target.value,
                  slug: generateSlug(e.target.value)
                })}
                placeholder="Category name"
                data-testid="input-news-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={newsFormData.slug}
                onChange={(e) => setNewsFormData({ ...newsFormData, slug: e.target.value })}
                placeholder="category-slug"
                data-testid="input-news-category-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createNewsCategoryMutation.mutate(newsFormData)}
              disabled={createNewsCategoryMutation.isPending}
              data-testid="button-save-news-category"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resource Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={resourceFormData.name}
                onChange={(e) => setResourceFormData({ 
                  ...resourceFormData, 
                  name: e.target.value,
                  slug: generateSlug(e.target.value)
                })}
                placeholder="Category name"
                data-testid="input-resource-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={resourceFormData.slug}
                onChange={(e) => setResourceFormData({ ...resourceFormData, slug: e.target.value })}
                placeholder="category-slug"
                data-testid="input-resource-category-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResourceDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createResourceCategoryMutation.mutate(resourceFormData)}
              disabled={createResourceCategoryMutation.isPending}
              data-testid="button-save-resource-category"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WebsiteManagement() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Website Management</h1>
        <p className="text-muted-foreground">Manage public website content, news, resources, and announcements</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="news" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
              <TabsTrigger value="news" className="gap-2" data-testid="tab-news">
                <Newspaper className="h-4 w-4" />
                <span className="hidden sm:inline">News</span>
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2" data-testid="tab-resources">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Resources</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="gap-2" data-testid="tab-announcements">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Announcements</span>
              </TabsTrigger>
              <TabsTrigger value="newsletter" className="gap-2" data-testid="tab-newsletter">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Newsletter</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2" data-testid="tab-stats">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Impact</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Categories</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="news">
              <NewsArticlesTab />
            </TabsContent>

            <TabsContent value="resources">
              <ResourcesTab />
            </TabsContent>

            <TabsContent value="announcements">
              <AnnouncementsTab />
            </TabsContent>

            <TabsContent value="newsletter">
              <NewsletterTab />
            </TabsContent>

            <TabsContent value="stats">
              <ImpactStatsTab />
            </TabsContent>

            <TabsContent value="categories">
              <CategoriesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
