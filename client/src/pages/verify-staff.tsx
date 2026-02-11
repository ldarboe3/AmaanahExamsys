import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShieldCheck, ShieldAlert, ShieldOff, Search, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import amanahLogo from "@assets/Amana_Logo_1770390631299.jpeg";

const statusDisplay: Record<string, { label: string; color: string; icon: typeof ShieldCheck; description: string }> = {
  activated: { label: "Active", color: "bg-chart-2/10 text-chart-2", icon: CheckCircle, description: "This staff member is currently active and authorized." },
  suspended: { label: "Suspended", color: "bg-chart-5/10 text-chart-5", icon: ShieldAlert, description: "This staff member's credentials have been suspended." },
  revoked: { label: "Revoked", color: "bg-destructive/10 text-destructive", icon: XCircle, description: "This staff member's credentials have been revoked." },
  created: { label: "Pending", color: "bg-muted text-muted-foreground", icon: AlertTriangle, description: "This staff member's ID has not yet been activated." },
  printed: { label: "Printed", color: "bg-chart-4/10 text-chart-4", icon: AlertTriangle, description: "This staff member's ID card has been printed but not yet issued." },
  issued: { label: "Issued", color: "bg-chart-1/10 text-chart-1", icon: AlertTriangle, description: "This staff member's ID card has been issued but not yet activated." },
};

const roleLabels: Record<string, string> = {
  hq_director: "HQ Director",
  hq_staff: "HQ Staff",
  regional_coordinator: "Regional Coordinator",
  regional_staff: "Regional Staff",
  cluster_officer: "Cluster Officer",
  examiner: "Examiner",
  invigilator: "Invigilator",
  supervisor: "Supervisor",
  monitor: "Monitor",
  temporary_staff: "Temporary Staff",
};

export default function VerifyStaffPage() {
  const [, params] = useRoute("/verify-staff/:staffId");
  const [searchId, setSearchId] = useState(params?.staffId || "");
  const [queryId, setQueryId] = useState(params?.staffId || "");

  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ["/api/staff-verify", queryId],
    queryFn: async () => {
      if (!queryId) return null;
      const res = await fetch(`/api/public/staff-verify/${queryId}`);
      if (!res.ok) {
        if (res.status === 404) return { notFound: true };
        throw new Error("Verification failed");
      }
      return res.json();
    },
    enabled: !!queryId,
  });

  const handleSearch = () => {
    if (searchId.trim()) {
      setQueryId(searchId.trim());
    }
  };

  const status = staffData?.status;
  const sDisplay = status ? statusDisplay[status] || statusDisplay.created : null;
  const StatusIcon = sDisplay?.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4" data-testid="verify-staff-page">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <img src={amanahLogo} alt="AMAANAH Logo" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="text-2xl font-bold" data-testid="text-verify-title">Staff Identity Verification</h1>
          <p className="text-muted-foreground text-sm">
            Enter a Staff ID number or scan the QR code to verify staff credentials
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Staff ID (e.g., AMS-00001)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="input-verify-staff-id"
              />
              <Button onClick={handleSearch} disabled={isLoading} data-testid="button-verify-search">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Verifying...
            </CardContent>
          </Card>
        )}

        {staffData?.notFound && (
          <Card>
            <CardContent className="py-8 text-center">
              <XCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
              <p className="text-lg font-medium">Staff Not Found</p>
              <p className="text-sm text-muted-foreground mt-1">
                No staff member found with ID "{queryId}". Please check the ID and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {staffData && !staffData.notFound && sDisplay && StatusIcon && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Verification Result</CardTitle>
                <Badge variant="secondary" className={sDisplay.color}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {sDisplay.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-md p-3 ${
                status === "activated" ? "bg-chart-2/5 border border-chart-2/20" :
                status === "suspended" ? "bg-chart-5/5 border border-chart-5/20" :
                status === "revoked" ? "bg-destructive/5 border border-destructive/20" :
                "bg-muted/50 border border-border"
              }`}>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 ${
                    status === "activated" ? "text-chart-2" :
                    status === "suspended" ? "text-chart-5" :
                    status === "revoked" ? "text-destructive" :
                    "text-muted-foreground"
                  }`} />
                  <p className="text-sm font-medium">{sDisplay.description}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={staffData.photoUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {staffData.firstName?.[0]}{staffData.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {staffData.firstName} {staffData.middleName ? `${staffData.middleName} ` : ""}{staffData.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{roleLabels[staffData.role] || staffData.role}</p>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">{staffData.staffIdNumber}</code>
                </div>
              </div>

              {staffData.issueDate && (
                <div className="text-xs text-muted-foreground">
                  Issued: {new Date(staffData.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-chart-5 mb-3" />
              <p className="text-lg font-medium">Verification Error</p>
              <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
