import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  MapPin,
  School,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Region, Cluster } from "@shared/schema";

const regionSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code is required").max(10),
});

const clusterSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code is required").max(10),
  regionId: z.number(),
});

type RegionFormData = z.infer<typeof regionSchema>;
type ClusterFormData = z.infer<typeof clusterSchema>;

interface RegionWithClusters extends Region {
  clusters?: Cluster[];
  schoolsCount?: number;
  studentsCount?: number;
}

function RegionCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Regions() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [showRegionDialog, setShowRegionDialog] = useState(false);
  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  const { data: regions, isLoading } = useQuery<RegionWithClusters[]>({
    queryKey: ["/api/regions"],
  });

  const regionForm = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const clusterForm = useForm<ClusterFormData>({
    resolver: zodResolver(clusterSchema),
    defaultValues: {
      name: "",
      code: "",
      regionId: 0,
    },
  });

  const createRegionMutation = useMutation({
    mutationFn: async (data: RegionFormData) => {
      return apiRequest("POST", "/api/regions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setShowRegionDialog(false);
      regionForm.reset();
      toast({
        title: "Region Created",
        description: "The region has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create region. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createClusterMutation = useMutation({
    mutationFn: async (data: ClusterFormData) => {
      return apiRequest("POST", "/api/clusters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      setShowClusterDialog(false);
      clusterForm.reset();
      toast({
        title: "Cluster Created",
        description: "The cluster has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create cluster. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRegionSubmit = (data: RegionFormData) => {
    createRegionMutation.mutate(data);
  };

  const handleClusterSubmit = (data: ClusterFormData) => {
    if (selectedRegionId) {
      createClusterMutation.mutate({ ...data, regionId: selectedRegionId });
    }
  };

  const openClusterDialog = (regionId: number) => {
    setSelectedRegionId(regionId);
    setShowClusterDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Regions & Clusters</h1>
          <p className="text-muted-foreground mt-1">
            Manage geographical regions and clusters for school organization
          </p>
        </div>
        <Button onClick={() => setShowRegionDialog(true)} data-testid="button-add-region">
          <Plus className="w-4 h-4 mr-2" />
          Add Region
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Regions</p>
                <p className="text-2xl font-semibold">{regions?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clusters</p>
                <p className="text-2xl font-semibold">
                  {regions?.reduce((sum, r) => sum + (r.clusters?.length || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Schools Covered</p>
                <p className="text-2xl font-semibold">
                  {regions?.reduce((sum, r) => sum + (r.schoolsCount || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <School className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regions List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <RegionCardSkeleton />
          <RegionCardSkeleton />
          <RegionCardSkeleton />
          <RegionCardSkeleton />
        </div>
      ) : regions && regions.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {regions.map((region) => (
            <Card key={region.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{region.name}</CardTitle>
                      <CardDescription>Code: {region.code}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-actions-${region.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openClusterDialog(region.id)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Cluster
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Region
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{region.clusters?.length || 0} clusters</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <School className="w-4 h-4" />
                    <span>{region.schoolsCount || 0} schools</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{region.studentsCount || 0} students</span>
                  </div>
                </div>

                {region.clusters && region.clusters.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="clusters" className="border-none">
                      <AccordionTrigger className="py-2 text-sm">
                        View Clusters
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {region.clusters.map((cluster) => (
                            <div
                              key={cluster.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{cluster.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {cluster.code}
                                </Badge>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground">No clusters added yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No regions found</h3>
            <p className="text-muted-foreground mb-4">
              Add your first region to organize schools geographically
            </p>
            <Button onClick={() => setShowRegionDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Region
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Region Dialog */}
      <Dialog open={showRegionDialog} onOpenChange={setShowRegionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Region</DialogTitle>
            <DialogDescription>
              Create a new geographical region
            </DialogDescription>
          </DialogHeader>
          <Form {...regionForm}>
            <form onSubmit={regionForm.handleSubmit(handleRegionSubmit)} className="space-y-4">
              <FormField
                control={regionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Western Region" {...field} data-testid="input-region-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region Code</FormLabel>
                    <FormControl>
                      <Input placeholder="WR" {...field} data-testid="input-region-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowRegionDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRegionMutation.isPending}>
                  {createRegionMutation.isPending ? "Creating..." : "Create Region"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Cluster Dialog */}
      <Dialog open={showClusterDialog} onOpenChange={setShowClusterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Cluster</DialogTitle>
            <DialogDescription>
              Add a cluster to the selected region
            </DialogDescription>
          </DialogHeader>
          <Form {...clusterForm}>
            <form onSubmit={clusterForm.handleSubmit(handleClusterSubmit)} className="space-y-4">
              <FormField
                control={clusterForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Brikama Cluster" {...field} data-testid="input-cluster-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={clusterForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster Code</FormLabel>
                    <FormControl>
                      <Input placeholder="BRK" {...field} data-testid="input-cluster-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowClusterDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClusterMutation.isPending}>
                  {createClusterMutation.isPending ? "Creating..." : "Create Cluster"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
