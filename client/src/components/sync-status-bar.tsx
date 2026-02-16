import { useOnlineStatus, useSyncStatus, type SyncCounts } from "@/lib/offline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Clock, Loader2 } from "lucide-react";

interface SyncStatusBarProps {
  queueType?: string;
  isSyncing?: boolean;
  onSync?: () => void;
  className?: string;
}

export function SyncStatusBar({ queueType, isSyncing, onSync, className }: SyncStatusBarProps) {
  const isOnline = useOnlineStatus();
  const { counts, lastSyncTime } = useSyncStatus(queueType);

  const pendingTotal = counts.pending + counts.error;
  const hasPending = pendingTotal > 0;

  const formatTime = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap text-xs ${className || ""}`} data-testid="sync-status-bar">
      <Badge variant={isOnline ? "default" : "destructive"} data-testid="badge-online-status">
        {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
        {isOnline ? "Online" : "Offline"}
      </Badge>

      {hasPending && (
        <Badge variant="secondary" data-testid="badge-pending-count">
          <Clock className="w-3 h-3 mr-1" />
          {pendingTotal} pending
        </Badge>
      )}

      {counts.error > 0 && (
        <Badge variant="destructive" data-testid="badge-sync-errors">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {counts.error} failed
        </Badge>
      )}

      {!hasPending && counts.total > 0 && (
        <Badge variant="secondary" data-testid="badge-all-synced">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          All synced
        </Badge>
      )}

      <span className="text-muted-foreground" data-testid="text-last-sync">
        Last sync: {formatTime(lastSyncTime)}
      </span>

      {onSync && isOnline && hasPending && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onSync}
          disabled={isSyncing}
          data-testid="button-manual-sync"
        >
          {isSyncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      )}

      {isSyncing && (
        <span className="text-muted-foreground flex items-center gap-1" data-testid="text-syncing">
          <Loader2 className="w-3 h-3 animate-spin" />
          Syncing...
        </span>
      )}
    </div>
  );
}
