import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Manage system configuration</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">System Settings</h3>
          <p className="text-muted-foreground">Settings management coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
