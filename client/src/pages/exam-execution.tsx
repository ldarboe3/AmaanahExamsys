import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Square,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  BookOpen,
  Timer,
  Volume2,
  Loader2,
  Hourglass,
  CircleStop,
  Calendar,
} from "lucide-react";

const LATE_THRESHOLD_MINUTES = 5;

const LATE_REASON_CODES = [
  { value: "transport_delay", label: "Transport Delay" },
  { value: "weather", label: "Weather Conditions" },
  { value: "security_incident", label: "Security Incident" },
  { value: "materials_late", label: "Materials Arrived Late" },
  { value: "staff_absence", label: "Staff Absence" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "venue_issue", label: "Venue Issue" },
  { value: "student_delay", label: "Student Delay" },
  { value: "communication_gap", label: "Communication Gap" },
  { value: "other", label: "Other" },
] as const;

type ExamPhase = "waiting" | "ready" | "late_start" | "running" | "ended" | "completed";

interface ScheduleWithSubject {
  id: number;
  subjectId: number;
  grade: number;
  examDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  durationMinutes: number;
  subject?: { id: number; name: string; nameAr?: string } | null;
}

interface SessionLog {
  id: number;
  scheduleId: number;
  centerId: number;
  status: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  startedLate?: boolean;
  lateStartMinutes?: number;
  endedLate?: boolean;
  lateEndMinutes?: number;
}

function useGeoLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords(null)
      );
    }
  }, []);
  return coords;
}

function playAlertSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playBeep = (startTime: number, freq: number, dur: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur);
    };

    const now = audioCtx.currentTime;
    playBeep(now, 880, 0.3);
    playBeep(now + 0.35, 880, 0.3);
    playBeep(now + 0.7, 1100, 0.5);
    playBeep(now + 1.3, 880, 0.3);
    playBeep(now + 1.65, 880, 0.3);
    playBeep(now + 2.0, 1100, 0.5);
  } catch {
    // Fallback: silent
  }
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimeUntilSchedule(scheduledStartTime: string): { minutes: number; seconds: number; totalMs: number } {
  const now = new Date();
  const [h, m] = scheduledStartTime.split(":").map(Number);
  const scheduledDate = new Date(now);
  scheduledDate.setHours(h, m, 0, 0);
  const diffMs = scheduledDate.getTime() - now.getTime();
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  return { minutes: Math.floor(totalSec / 60), seconds: totalSec % 60, totalMs: diffMs };
}

function getLateness(scheduledStartTime: string): number {
  const now = new Date();
  const [h, m] = scheduledStartTime.split(":").map(Number);
  const scheduledDate = new Date(now);
  scheduledDate.setHours(h, m, 0, 0);
  const diffMs = now.getTime() - scheduledDate.getTime();
  return Math.ceil(diffMs / 60000);
}

export default function ExamExecutionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const gps = useGeoLocation();

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [phase, setPhase] = useState<ExamPhase>("waiting");
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdownText, setCountdownText] = useState("");

  const [lateReasonCode, setLateReasonCode] = useState("");
  const [lateReasonDetails, setLateReasonDetails] = useState("");
  const [candidateCount, setCandidateCount] = useState("");
  const [notes, setNotes] = useState("");

  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopNotes, setStopNotes] = useState("");
  const [alertPlayed, setAlertPlayed] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const examStartTimeRef = useRef<Date | null>(null);
  const durationSecsRef = useRef(0);

  const { data: ctx, isLoading: ctxLoading } = useQuery<{
    center: any;
    schedules: ScheduleWithSubject[];
    sessions: SessionLog[];
    subjects: any[];
  }>({
    queryKey: ["/api/exam-execution/my-context"],
    refetchInterval: 60000,
  });

  const selectedSchedule = ctx?.schedules?.find((s) => s.id === selectedScheduleId) ?? null;

  const existingSession = ctx?.sessions?.find(
    (s) => s.scheduleId === selectedScheduleId && !["cancelled"].includes(s.status)
  );

  useEffect(() => {
    if (!selectedSchedule) return;
    if (existingSession) {
      if (["started_on_time", "started_late", "in_progress"].includes(existingSession.status)) {
        setPhase("running");
        setSessionId(existingSession.id);
        if (existingSession.actualStartTime) {
          examStartTimeRef.current = new Date(existingSession.actualStartTime);
          durationSecsRef.current = selectedSchedule.durationMinutes * 60;
        }
      } else if (["ended_on_time", "ended_late", "completed"].includes(existingSession.status)) {
        setPhase("completed");
        setSessionId(existingSession.id);
      }
      return;
    }

    const { totalMs } = getTimeUntilSchedule(selectedSchedule.scheduledStartTime);
    if (totalMs > 0) {
      setPhase("waiting");
    } else {
      const lateMin = getLateness(selectedSchedule.scheduledStartTime);
      if (lateMin > LATE_THRESHOLD_MINUTES) {
        setPhase("late_start");
      } else {
        setPhase("ready");
      }
    }
  }, [selectedSchedule, existingSession]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!selectedSchedule || (phase !== "waiting" && phase !== "ready")) {
      setCountdownText("");
      return;
    }

    const tick = () => {
      const { minutes, seconds, totalMs } = getTimeUntilSchedule(selectedSchedule.scheduledStartTime);
      if (totalMs <= 0) {
        setCountdownText("00:00");
        const lateMin = getLateness(selectedSchedule.scheduledStartTime);
        if (lateMin > LATE_THRESHOLD_MINUTES) {
          setPhase("late_start");
        } else if (phase === "waiting") {
          setPhase("ready");
        }
        return;
      }
      setCountdownText(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [selectedSchedule, phase]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phase !== "running" || !examStartTimeRef.current) return;

    const tick = () => {
      if (!examStartTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - examStartTimeRef.current.getTime()) / 1000);
      setElapsedSeconds(elapsed);
      const remaining = Math.max(0, durationSecsRef.current - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !alertPlayed) {
        playAlertSound();
        setAlertPlayed(true);
        setPhase("ended");
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, alertPlayed]);

  const startMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/exam-sessions/record-start", data);
      return res.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      examStartTimeRef.current = new Date(session.actualStartTime);
      durationSecsRef.current = selectedSchedule!.durationMinutes * 60;
      setPhase("running");
      setAlertPlayed(false);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-execution/my-context"] });
      toast({ title: "Exam started", description: session.startedLate ? "Late start recorded" : "Exam started on time" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    },
  });

  const endMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/exam-sessions/${sessionId}/record-end`, data);
      return res.json();
    },
    onSuccess: (session) => {
      setPhase("completed");
      setShowStopDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-execution/my-context"] });
      const msg = session.endedLate ? `Ended late by ${session.lateEndMinutes} minutes` : "Exam ended on time";
      toast({ title: "Exam ended", description: msg });
    },
    onError: (err: any) => {
      toast({ title: "Failed to end exam", description: err.message, variant: "destructive" });
    },
  });

  const handleStartExam = () => {
    if (!selectedSchedule) return;
    const lateMin = getLateness(selectedSchedule.scheduledStartTime);
    const isLate = lateMin > LATE_THRESHOLD_MINUTES;

    if (isLate && phase !== "late_start") {
      setPhase("late_start");
      toast({ title: "Late start detected", description: "You are more than 5 minutes past the scheduled time. Please select a reason.", variant: "destructive" });
      return;
    }

    if (isLate && !lateReasonCode) {
      toast({ title: "Reason required", description: "Please select a late start reason", variant: "destructive" });
      return;
    }

    startMutation.mutate({
      scheduleId: selectedSchedule.id,
      centerId: ctx!.center.id,
      actualStartTime: new Date().toISOString(),
      candidateCount: candidateCount ? parseInt(candidateCount) : undefined,
      lateStartReasonCode: isLate ? lateReasonCode : null,
      lateStartReasonDetails: isLate ? lateReasonDetails || null : null,
      gpsLatitude: gps?.lat?.toString() || null,
      gpsLongitude: gps?.lng?.toString() || null,
      deviceInfo: navigator.userAgent,
      notes: notes || null,
    });
  };

  const handleStopExam = () => {
    endMutation.mutate({
      actualEndTime: new Date().toISOString(),
      lateEndReasonDetails: stopNotes || null,
      notes: stopNotes || null,
    });
  };

  const timerProgress = durationSecsRef.current > 0 ? Math.min(100, (elapsedSeconds / durationSecsRef.current) * 100) : 0;
  const isTimerCritical = remainingSeconds > 0 && remainingSeconds <= 300;

  if (ctxLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ctx?.center) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h2 className="text-lg font-semibold mb-2">No Exam Center Assigned</h2>
            <p className="text-sm text-muted-foreground">
              You do not have an exam center assignment. Please contact the examination office.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ctx.schedules || ctx.schedules.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h2 className="text-lg font-semibold mb-2">No Exams Scheduled Today</h2>
            <p className="text-sm text-muted-foreground">
              There are no published exams for today at {ctx.center.name}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">Exam Execution</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.center.name} &mdash; {new Date().toLocaleDateString()}
        </p>
      </div>

      {!selectedScheduleId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Select Today's Exam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ctx.schedules.map((sch) => {
              const sess = ctx.sessions?.find((s) => s.scheduleId === sch.id && !["cancelled"].includes(s.status));
              const isDone = sess && ["ended_on_time", "ended_late", "completed"].includes(sess.status);
              const isRunning = sess && ["started_on_time", "started_late", "in_progress"].includes(sess.status);
              return (
                <button
                  key={sch.id}
                  className="w-full text-left p-3 rounded-md border hover-elevate flex items-center justify-between gap-2"
                  onClick={() => setSelectedScheduleId(sch.id)}
                  data-testid={`button-schedule-${sch.id}`}
                >
                  <div>
                    <div className="font-medium">{sch.subject?.name || `Subject #${sch.subjectId}`}</div>
                    <div className="text-xs text-muted-foreground">
                      Grade {sch.grade} | {sch.scheduledStartTime} – {sch.scheduledEndTime} ({sch.durationMinutes} min)
                    </div>
                  </div>
                  <div>
                    {isDone && <Badge variant="secondary" className="text-green-700 dark:text-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>}
                    {isRunning && <Badge variant="destructive"><Play className="w-3 h-3 mr-1" /> Running</Badge>}
                    {!isDone && !isRunning && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {selectedSchedule && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {selectedSchedule.subject?.name || `Subject #${selectedSchedule.subjectId}`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedScheduleId(null);
                    setPhase("waiting");
                    setSessionId(null);
                    setLateReasonCode("");
                    setLateReasonDetails("");
                    setCandidateCount("");
                    setNotes("");
                    setAlertPlayed(false);
                  }}
                  data-testid="button-back-to-list"
                >
                  Change
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground block">Grade</span>
                  <span data-testid="text-schedule-grade">{selectedSchedule.grade}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Start Time</span>
                  <span data-testid="text-schedule-start">{selectedSchedule.scheduledStartTime}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Duration</span>
                  <span data-testid="text-schedule-duration">{selectedSchedule.durationMinutes} min</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">End Time</span>
                  <span data-testid="text-schedule-end">{selectedSchedule.scheduledEndTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {phase === "waiting" && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-6 text-center space-y-4">
                <Hourglass className="w-12 h-12 mx-auto text-amber-500 animate-pulse" />
                <div>
                  <h3 className="font-semibold text-lg" data-testid="text-waiting-label">Waiting for HQ Start Time</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The exam is scheduled to start at {selectedSchedule.scheduledStartTime}
                  </p>
                </div>
                <div className="text-4xl font-mono font-bold tracking-wider" data-testid="text-countdown">
                  {countdownText || "--:--"}
                </div>
                <p className="text-xs text-muted-foreground">
                  The start button will be enabled at the scheduled time
                </p>
                <Button disabled className="w-full" data-testid="button-start-disabled">
                  <Play className="w-4 h-4 mr-1" /> Start Exam
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === "ready" && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
                  <h3 className="font-semibold text-lg" data-testid="text-ready-label">Ready to Start</h3>
                  <p className="text-sm text-muted-foreground mt-1">You are within the start time window</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Number of Candidates (optional)</label>
                  <Input
                    type="number"
                    min="0"
                    value={candidateCount}
                    onChange={(e) => setCandidateCount(e.target.value)}
                    placeholder="e.g. 45"
                    data-testid="input-candidate-count"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any observations before starting..."
                    data-testid="input-start-notes"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleStartExam}
                  disabled={startMutation.isPending}
                  data-testid="button-start-exam"
                >
                  {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                  Start Exam
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === "late_start" && (
            <Card className="border-destructive/50">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-2" />
                  <h3 className="font-semibold text-lg" data-testid="text-late-label">Late Start</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The exam is {getLateness(selectedSchedule.scheduledStartTime)} minutes past the scheduled start time
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Reason for Late Start <span className="text-destructive">*</span>
                  </label>
                  <Select value={lateReasonCode} onValueChange={setLateReasonCode}>
                    <SelectTrigger data-testid="select-late-reason">
                      <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LATE_REASON_CODES.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Additional Details (optional)</label>
                  <Textarea
                    value={lateReasonDetails}
                    onChange={(e) => setLateReasonDetails(e.target.value)}
                    placeholder="Provide more details about the delay..."
                    data-testid="input-late-details"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Number of Candidates (optional)</label>
                  <Input
                    type="number"
                    min="0"
                    value={candidateCount}
                    onChange={(e) => setCandidateCount(e.target.value)}
                    placeholder="e.g. 45"
                    data-testid="input-candidate-count-late"
                  />
                </div>

                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={handleStartExam}
                  disabled={startMutation.isPending || !lateReasonCode}
                  data-testid="button-start-late"
                >
                  {startMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                  Start Exam (Late)
                </Button>
              </CardContent>
            </Card>
          )}

          {(phase === "running" || phase === "ended") && (
            <Card className={phase === "ended" ? "border-destructive/50" : ""}>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  {phase === "running" && (
                    <>
                      <Timer className="w-10 h-10 mx-auto text-primary mb-2" />
                      <h3 className="font-semibold text-lg" data-testid="text-running-label">Exam in Progress</h3>
                    </>
                  )}
                  {phase === "ended" && (
                    <>
                      <Volume2 className="w-10 h-10 mx-auto text-destructive mb-2 animate-pulse" />
                      <h3 className="font-semibold text-lg text-destructive" data-testid="text-ended-label">Time is Up!</h3>
                    </>
                  )}
                </div>

                <div className="relative pt-2">
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        phase === "ended" ? "bg-destructive" : isTimerCritical ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, timerProgress)}%` }}
                      data-testid="progress-exam"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Elapsed</div>
                    <div className="text-2xl font-mono font-bold" data-testid="text-elapsed">
                      {formatTimer(elapsedSeconds)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Remaining</div>
                    <div
                      className={`text-2xl font-mono font-bold ${
                        phase === "ended" ? "text-destructive" : isTimerCritical ? "text-amber-500" : ""
                      }`}
                      data-testid="text-remaining"
                    >
                      {remainingSeconds > 0 ? formatTimer(remainingSeconds) : "00:00"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span>Started: {examStartTimeRef.current?.toLocaleTimeString() || "—"}</span>
                  <span>Duration: {selectedSchedule.durationMinutes} min</span>
                </div>

                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => setShowStopDialog(true)}
                  data-testid="button-stop-exam"
                >
                  <CircleStop className="w-4 h-4 mr-1" /> Stop Exam
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === "completed" && existingSession && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-lg" data-testid="text-completed-label">Exam Completed</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Started</span>
                    <span data-testid="text-completed-start">
                      {existingSession.actualStartTime ? new Date(existingSession.actualStartTime).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Ended</span>
                    <span data-testid="text-completed-end">
                      {existingSession.actualEndTime ? new Date(existingSession.actualEndTime).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Status</span>
                    <span data-testid="text-completed-status">
                      {existingSession.startedLate ? (
                        <Badge variant="destructive">Late Start ({existingSession.lateStartMinutes} min)</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-green-700 dark:text-green-300">On Time</Badge>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">End Status</span>
                    <span data-testid="text-completed-end-status">
                      {existingSession.endedLate ? (
                        <Badge variant="destructive">Late End ({existingSession.lateEndMinutes} min)</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-green-700 dark:text-green-300">On Time</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {gps && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span data-testid="text-gps">GPS: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</span>
        </div>
      )}

      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleStop className="w-5 h-5 text-destructive" /> Stop Exam
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to stop this exam? This action will record the end time.
              {remainingSeconds > 0 && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  There are still {formatTimer(remainingSeconds)} remaining.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium">Notes / Reason for Stopping (optional)</label>
            <Textarea
              value={stopNotes}
              onChange={(e) => setStopNotes(e.target.value)}
              placeholder="Any remarks about the exam session..."
              data-testid="input-stop-notes"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowStopDialog(false)} data-testid="button-cancel-stop">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopExam}
              disabled={endMutation.isPending}
              data-testid="button-confirm-stop"
            >
              {endMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Square className="w-4 h-4 mr-1" />}
              Confirm Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
