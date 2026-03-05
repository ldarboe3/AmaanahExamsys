import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function OfflineSyncBanner() {
  const { isOnline, pendingCount, isSyncing, lastSyncedAt, syncError, triggerManualSync } = useOnlineStatus();
  const { isRTL } = useLanguage();

  const isVisible = !isOnline || pendingCount > 0 || isSyncing || !!syncError;
  if (!isVisible) return null;

  const formatTime = (date: Date) => date.toLocaleTimeString(isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' });

  if (!isOnline) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500 text-white text-sm"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid="banner-offline"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {isRTL ? 'أنت غير متصل بالإنترنت' : 'You are offline'}
          </span>
          {pendingCount > 0 && (
            <span className="opacity-90">
              {isRTL
                ? `— ${pendingCount} عملية في انتظار المزامنة`
                : `— ${pendingCount} item${pendingCount !== 1 ? 's' : ''} queued for sync`}
            </span>
          )}
        </div>
        <span className="text-xs opacity-75 shrink-0">
          {isRTL ? 'البيانات محفوظة محلياً' : 'Data saved locally'}
        </span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2 bg-primary text-primary-foreground text-sm"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid="banner-syncing"
      >
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        <span className="font-medium">
          {isRTL
            ? `جارٍ مزامنة ${pendingCount} عنصر...`
            : `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}...`}
        </span>
      </div>
    );
  }

  if (syncError) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 bg-destructive text-destructive-foreground text-sm"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid="banner-sync-error"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{isRTL ? 'فشلت المزامنة لبعض العناصر' : syncError}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 border-destructive-foreground/40 bg-transparent text-destructive-foreground hover:bg-destructive-foreground/10"
          onClick={triggerManualSync}
          data-testid="button-retry-sync"
        >
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </div>
    );
  }

  if (pendingCount > 0 && isOnline) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 bg-chart-3/90 text-white text-sm"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid="banner-pending-sync"
      >
        <div className="flex items-center gap-2">
          <CloudUpload className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {isRTL
              ? `${pendingCount} عنصر في انتظار المزامنة`
              : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`}
          </span>
          {lastSyncedAt && (
            <span className="opacity-75 text-xs">
              {isRTL ? `آخر مزامنة: ${formatTime(lastSyncedAt)}` : `Last synced: ${formatTime(lastSyncedAt)}`}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 border-white/40 bg-transparent text-white hover:bg-white/10"
          onClick={triggerManualSync}
          disabled={isSyncing}
          data-testid="button-sync-now"
        >
          <Wifi className="w-3 h-3 me-1" />
          {isRTL ? 'مزامنة الآن' : 'Sync now'}
        </Button>
      </div>
    );
  }

  return null;
}
