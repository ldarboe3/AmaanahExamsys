import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyncStatusBar } from "@/components/sync-status-bar";
import {
  useOnlineStatus,
  useGeoLocation,
  useAutoSync,
  appendAuditEvent,
  saveSessionState,
  loadSessionState,
  clearSessionState,
} from "@/lib/offline";
import {
  Search,
  ScanBarcode,
  AlertTriangle,
  CheckCircle2,
  Video,
  VideoOff,
  Upload,
  RefreshCw,
  Package,
  Calendar,
  MapPin,
  BookOpen,
  Clock,
  Shield,
  XCircle,
  Eye,
  WifiOff,
  Flag,
  RotateCcw,
} from "lucide-react";

const DB_NAME = "examDayVideos";
const DB_VERSION = 1;
const STORE_NAME = "videos";

interface VideoQueueItem {
  id: string;
  verificationId: number;
  blob: Blob;
  recordedAt: string;
  recordedBeforeScheduled: boolean;
  videoDurationSec: number;
  syncStatus: "pending" | "uploading" | "synced" | "failed";
}

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveVideoToDB = async (item: VideoQueueItem) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getAllVideos = async (): Promise<VideoQueueItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteVideoFromDB = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const CAMERA_SESSION_KEY = "examday_camera_session";

export default function ExamDayPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const gps = useGeoLocation();
  const { isSyncing: autoSyncing, triggerSync } = useAutoSync();

  const [activeTab, setActiveTab] = useState("scan");
  const [barcode, setBarcode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    getAllVideos().then(setVideoQueue).catch(() => {});
    loadSessionState<{ verificationId: number; packetBarcode: string }>(CAMERA_SESSION_KEY)
      .then((session) => {
        if (session?.verificationId) {
          setVerificationId(session.verificationId);
          setBarcode(session.packetBarcode || "");
          toast({ title: "Session restored", description: "Previous verification session recovered. Please recapture video evidence." });
        }
      })
      .catch(() => {});
  }, []);

  const { data: verifications = [] } = useQuery({
    queryKey: ["/api/exam-day/verifications"],
  });

  const handleLookup = async () => {
    if (!barcode.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setVerificationId(null);
    setVideoBlob(null);
    try {
      const res = await apiRequest("GET", `/api/exam-day/packet-lookup?barcode=${encodeURIComponent(barcode.trim())}`);
      const data = await res.json();
      setLookupResult(data);
    } catch (err: any) {
      toast({ title: "Not found", description: err.message, variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!lookupResult?.packet) return;
    try {
      const res = await apiRequest("POST", "/api/exam-day/verify", {
        packetId: lookupResult.packet.id,
        scheduleId: lookupResult.schedule?.id || null,
        centerId: lookupResult.packet.destinationCenterId,
        isMatch: lookupResult.mismatchReasons.length === 0,
        mismatchReasons: lookupResult.mismatchReasons,
        expectedGrade: lookupResult.schedule?.grade || lookupResult.packet.grade,
        expectedSubjectId: lookupResult.schedule?.subjectId || lookupResult.packet.subjectId,
        expectedCenterId: lookupResult.packet.destinationCenterId,
        expectedExamDate: new Date().toISOString().split("T")[0],
        gpsLatitude: gps?.lat?.toString() || null,
        gpsLongitude: gps?.lng?.toString() || null,
        deviceInfo: navigator.userAgent,
        notes: notes || null,
      });
      const verification = await res.json();
      setVerificationId(verification.id);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-day/verifications"] });
      toast({ title: "Packet verified", description: "Verification recorded. Now capture envelope opening video." });

      appendAuditEvent({
        userId: user?.id || "",
        userRole: user?.role || "",
        action: "packet_verification",
        entityType: "exam_day_verification",
        entityId: String(verification.id),
        data: { packetId: lookupResult.packet.id, isMatch: lookupResult.mismatchReasons.length === 0 },
        clientTimestamp: new Date().toISOString(),
        gpsLatitude: gps?.lat ?? null,
        gpsLongitude: gps?.lng ?? null,
      }).catch(() => {});

      saveSessionState(CAMERA_SESSION_KEY, {
        verificationId: verification.id,
        packetBarcode: barcode,
        startedAt: new Date().toISOString(),
      }).catch(() => {});
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const cameraRetryCountRef = useRef(0);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      cameraRetryCountRef.current = 0;
    } catch (err: any) {
      cameraRetryCountRef.current++;
      if (cameraRetryCountRef.current < 3) {
        setTimeout(() => startCamera(), 1500);
        setCameraError(`Camera access failed. Retrying... (attempt ${cameraRetryCountRef.current}/3)`);
      } else {
        setCameraError("Camera access denied. Please allow camera permissions and try again.");
        toast({ title: "Camera error", description: err.message, variant: "destructive" });
      }
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 9) {
          mediaRecorderRef.current?.stop();
          if (timerRef.current) clearInterval(timerRef.current);
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const saveVideoLocally = useCallback(async () => {
    if (!videoBlob || !verificationId) return;
    const now = new Date().toISOString();
    let recordedBeforeScheduled = false;
    if (lookupResult?.schedule?.scheduledStartTime) {
      const scheduledTime = lookupResult.schedule.scheduledStartTime;
      const todayStr = new Date().toISOString().split("T")[0];
      const scheduledDate = new Date(`${todayStr}T${scheduledTime}:00`);
      if (new Date(now) < scheduledDate) {
        recordedBeforeScheduled = true;
      }
    }

    const item: VideoQueueItem = {
      id: crypto.randomUUID(),
      verificationId,
      blob: videoBlob,
      recordedAt: now,
      recordedBeforeScheduled,
      videoDurationSec: recordingTime,
      syncStatus: "pending",
    };

    await saveVideoToDB(item);
    setVideoQueue((prev) => [...prev, item]);
    setVideoBlob(null);
    stopCamera();

    appendAuditEvent({
      userId: user?.id || "",
      userRole: user?.role || "",
      action: "video_evidence_saved",
      entityType: "exam_day_video",
      entityId: item.id,
      data: { verificationId, recordedBeforeScheduled, durationSec: recordingTime },
      clientTimestamp: now,
      gpsLatitude: gps?.lat ?? null,
      gpsLongitude: gps?.lng ?? null,
    }).catch(() => {});

    clearSessionState(CAMERA_SESSION_KEY).catch(() => {});

    if (recordedBeforeScheduled) {
      toast({ title: "Early recording flagged", description: "Video was recorded before the scheduled exam time", variant: "destructive" });
    } else {
      toast({ title: "Video saved", description: "Envelope opening evidence saved locally" });
    }

    setLookupResult(null);
    setVerificationId(null);
    setBarcode("");
    setNotes("");
  }, [videoBlob, verificationId, lookupResult, recordingTime, stopCamera, toast, user, gps]);

  const syncVideo = useCallback(async (item: VideoQueueItem) => {
    try {
      const urlRes = await apiRequest("POST", "/api/exam-day/video-upload-url");
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": "video/webm" },
        body: item.blob,
      });

      await apiRequest("POST", "/api/exam-day/sync-video", {
        verificationId: item.verificationId,
        videoObjectPath: objectPath,
        videoDurationSec: item.videoDurationSec,
        recordedAt: item.recordedAt,
        recordedBeforeScheduled: item.recordedBeforeScheduled,
      });

      await deleteVideoFromDB(item.id);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleSyncAll = useCallback(async () => {
    const pending = videoQueue.filter((v) => v.syncStatus !== "synced");
    if (pending.length === 0) return;
    setIsSyncing(true);
    let syncedCount = 0;

    for (const item of pending) {
      const ok = await syncVideo(item);
      if (ok) syncedCount++;
    }

    const remaining = await getAllVideos();
    setVideoQueue(remaining);
    queryClient.invalidateQueries({ queryKey: ["/api/exam-day/verifications"] });

    if (syncedCount === pending.length) {
      toast({ title: "Sync complete", description: `${syncedCount} video(s) uploaded` });
    } else if (syncedCount > 0) {
      toast({ title: "Partial sync", description: `${syncedCount} synced, ${pending.length - syncedCount} failed`, variant: "destructive" });
    } else {
      toast({ title: "Sync failed", description: "No videos could be uploaded", variant: "destructive" });
    }
    setIsSyncing(false);
  }, [videoQueue, syncVideo, toast]);

  const pendingVideos = videoQueue.filter((v) => v.syncStatus !== "synced");

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Exam Day Workflow</h1>
          <p className="text-sm text-muted-foreground">Verify packets and capture envelope opening evidence</p>
        </div>
      </div>

      <SyncStatusBar isSyncing={isSyncing || autoSyncing} onSync={handleSyncAll} />

      {pendingVideos.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm">{pendingVideos.length} video{pendingVideos.length !== 1 ? "s" : ""} waiting to sync</span>
            </div>
            <Button size="sm" onClick={handleSyncAll} disabled={isSyncing || !isOnline} data-testid="button-sync-videos">
              <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-exam-day">
          <TabsTrigger value="scan" data-testid="tab-scan">
            <ScanBarcode className="w-4 h-4 mr-1" /> Scan & Verify
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Eye className="w-4 h-4 mr-1" /> History
          </TabsTrigger>
          <TabsTrigger value="flags" data-testid="tab-flags">
            <Flag className="w-4 h-4 mr-1" /> Flags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ScanBarcode className="w-4 h-4" /> Packet Barcode Scan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter packet barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                  className="text-lg"
                  data-testid="input-barcode"
                />
                <Button onClick={handleLookup} disabled={lookupLoading || !barcode.trim()} data-testid="button-lookup">
                  {lookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {lookupResult && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" /> Packet Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block">Barcode</span>
                      <span className="font-mono font-medium" data-testid="text-packet-barcode">{lookupResult.packet.barcode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Subject</span>
                      <span data-testid="text-packet-subject">{lookupResult.subject?.name || "Unknown"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Grade</span>
                      <span data-testid="text-packet-grade">{lookupResult.packet.grade}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Exam Year</span>
                      <span data-testid="text-packet-year">{lookupResult.examYear?.year || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Destination Center</span>
                      <span data-testid="text-packet-center">{lookupResult.center?.name || "Unknown"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Paper Count</span>
                      <span data-testid="text-packet-papers">{lookupResult.packet.paperCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {lookupResult.schedule && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Today's Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Date</span>
                        <span data-testid="text-schedule-date">{lookupResult.schedule.examDate}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Start Time</span>
                        <span data-testid="text-schedule-start">{lookupResult.schedule.scheduledStartTime}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Duration</span>
                        <span data-testid="text-schedule-duration">{lookupResult.schedule.durationMinutes} min</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">End Time</span>
                        <span data-testid="text-schedule-end">{lookupResult.schedule.scheduledEndTime}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {lookupResult.mismatchReasons.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" /> Mismatch Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {lookupResult.mismatchReasons.map((reason: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-destructive" data-testid={`text-mismatch-${i}`}>
                          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {lookupResult.mismatchReasons.length === 0 && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300" data-testid="text-match-ok">
                      Packet matches exam center and today's schedule
                    </span>
                  </CardContent>
                </Card>
              )}

              {!verificationId && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any observations..."
                      data-testid="input-verify-notes"
                    />
                  </div>
                  <Button className="w-full" onClick={handleVerify} data-testid="button-verify">
                    <Shield className="w-4 h-4 mr-1" />
                    {lookupResult.mismatchReasons.length > 0 ? "Verify with Warnings" : "Confirm Verification"}
                  </Button>
                </div>
              )}

              {verificationId && !videoBlob && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Video className="w-4 h-4" /> Envelope Opening Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Record a 10-second video of the envelope being opened. The camera will automatically stop after 10 seconds.
                    </p>

                    {cameraError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <VideoOff className="w-4 h-4" />
                        <span data-testid="text-camera-error">{cameraError}</span>
                      </div>
                    )}

                    <div className="relative rounded-md overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        data-testid="video-preview"
                      />
                      {isRecording && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs text-white bg-black/60 px-1 rounded" data-testid="text-recording-time">
                            {recordingTime}s / 10s
                          </span>
                        </div>
                      )}
                      {!cameraActive && !cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white/60 text-sm">Camera preview</span>
                        </div>
                      )}
                    </div>

                    {isRecording && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${(recordingTime / 10) * 100}%` }}
                          data-testid="progress-recording"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!cameraActive && (
                        <Button className="flex-1" onClick={startCamera} data-testid="button-start-camera">
                          <Video className="w-4 h-4 mr-1" /> Start Camera
                        </Button>
                      )}
                      {cameraActive && !isRecording && (
                        <Button className="flex-1" variant="destructive" onClick={startRecording} data-testid="button-start-recording">
                          <Video className="w-4 h-4 mr-1" /> Record 10s Video
                        </Button>
                      )}
                      {isRecording && (
                        <Button className="flex-1" variant="destructive" onClick={stopRecording} data-testid="button-stop-recording">
                          <VideoOff className="w-4 h-4 mr-1" /> Stop Early ({recordingTime}s)
                        </Button>
                      )}
                      {cameraActive && !isRecording && (
                        <Button variant="outline" onClick={stopCamera} data-testid="button-stop-camera">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {videoBlob && verificationId && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="w-4 h-4" /> Video Captured
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Duration: {recordingTime}s | Size: {(videoBlob.size / 1024).toFixed(0)} KB
                    </div>
                    <Button className="w-full" onClick={saveVideoLocally} data-testid="button-save-video">
                      <Upload className="w-4 h-4 mr-1" /> Save & Continue
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> Today's Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(verifications) && verifications.length > 0 ? (
                <div className="space-y-3">
                  {verifications.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 p-3 rounded-md border" data-testid={`verification-${v.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm" data-testid={`text-verification-packet-${v.id}`}>Packet #{v.packetId}</span>
                          {v.isMatch ? (
                            <Badge variant="secondary" className="text-green-700 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Match
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Mismatch
                            </Badge>
                          )}
                          {v.isVideoMissing ? (
                            <Badge variant="destructive">
                              <VideoOff className="w-3 h-3 mr-1" /> No Video
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-green-700 dark:text-green-300">
                              <Video className="w-3 h-3 mr-1" /> Video
                            </Badge>
                          )}
                          {v.recordedBeforeScheduled && (
                            <Badge variant="destructive">
                              <Clock className="w-3 h-3 mr-1" /> Early
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(v.verifiedAt).toLocaleTimeString()} | Center #{v.centerId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-verifications">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No verifications recorded today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4 mt-4">
          <FlagsPanel />
        </TabsContent>
      </Tabs>

      {gps && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span data-testid="text-gps">GPS: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}

function FlagsPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "examination_admin" || user?.role === "logistics_admin";

  const { data: flags, isLoading } = useQuery<{
    totalVerifications: number;
    missingVideo: any[];
    earlyRecording: any[];
    mismatches: any[];
  }>({
    queryKey: ["/api/exam-day/flags"],
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Flag monitoring is available for administrators only</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
          <p className="text-sm">Loading flags...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="text-flag-total">{flags?.totalVerifications || 0}</div>
            <div className="text-xs text-muted-foreground">Total Verifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive" data-testid="text-flag-missing">{flags?.missingVideo?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Missing Video</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-flag-early">{flags?.earlyRecording?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Early Recording</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive" data-testid="text-flag-mismatch">{flags?.mismatches?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Mismatches</div>
          </CardContent>
        </Card>
      </div>

      {(flags?.missingVideo?.length ?? 0) > 0 && flags && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <VideoOff className="w-4 h-4" /> Missing Video Evidence ({flags.missingVideo.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flags.missingVideo.slice(0, 10).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded border" data-testid={`flag-missing-${v.id}`}>
                  <span>Packet #{v.packetId} | Center #{v.centerId}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.verifiedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(flags?.earlyRecording?.length ?? 0) > 0 && flags && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" /> Early Recordings ({flags.earlyRecording.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flags.earlyRecording.slice(0, 10).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded border" data-testid={`flag-early-${v.id}`}>
                  <span>Packet #{v.packetId} | Center #{v.centerId}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.recordedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
