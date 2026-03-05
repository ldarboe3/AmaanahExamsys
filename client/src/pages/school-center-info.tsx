import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Phone,
  Mail,
  Users,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Building2,
  Hash,
  User,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Center {
  id: number;
  name: string;
  code: string;
  address?: string;
  regionId: number;
  clusterId: number;
  capacity: number;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive: boolean;
  assignedSchoolsCount?: number;
  assignedStudentsCount?: number;
}

export default function SchoolCenterInfo() {
  const { isRTL } = useLanguage();

  const { data: centers, isLoading } = useQuery<Center[]>({
    queryKey: ["/api/centers"],
  });

  const center = centers?.[0] ?? null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-semibold mb-1">Exam Center</h1>
        <p className="text-muted-foreground mb-6">Your assigned examination center</p>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">No Center Assigned</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your school has not been assigned to an examination center yet.
              Please contact the examination authority for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const infoRows = [
    { icon: Hash, label: "Center Code", value: center.code },
    { icon: MapPin, label: "Address", value: center.address || "Not specified" },
    { icon: User, label: "Contact Person", value: center.contactPerson || "Not specified" },
    { icon: Phone, label: "Phone", value: center.contactPhone || "Not specified" },
    { icon: Mail, label: "Email", value: center.contactEmail || "Not specified" },
    { icon: Users, label: "Capacity", value: `${center.capacity} candidates` },
  ];

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold">Exam Center</h1>
        <p className="text-muted-foreground">Your assigned examination center</p>
      </div>

      {/* Center header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{center.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{center.code}</span>
                  {center.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {center.address}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={center.isActive
                  ? "border-chart-2 text-chart-2"
                  : "border-destructive text-destructive"}
              >
                {center.isActive ? (
                  <CheckCircle2 className="w-3 h-3 me-1" />
                ) : (
                  <XCircle className="w-3 h-3 me-1" />
                )}
                {center.isActive ? "Active" : "Inactive"}
              </Badge>
              <Link href={`/centers/${center.id}`}>
                <Button size="sm" data-testid="button-view-dashboard">
                  <LayoutDashboard className="w-4 h-4 me-2" />
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Schools at Center</p>
                <p className="text-2xl font-semibold">{center.assignedSchoolsCount ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
                <p className="text-2xl font-semibold">{center.assignedStudentsCount ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center details card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Center Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex items-center gap-2 min-w-0">
                  <dt className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</dt>
                  <dd className="text-sm font-medium truncate">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
