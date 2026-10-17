import { classLabel, divisionLabel } from "@/lib/constants";
import { RoutineItem } from "@/components/app/today-routine-modal";

/**
 * Parses time string (e.g. "09:00 AM", "2:30 PM", "14:00") into minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/(\d+):(\d+)\s*(AM|PM)?/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Returns current minutes in Bangladesh time (Asia/Dhaka, UTC+6).
 */
export function getCurrentDhakaMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());

    let hour = 0;
    let minute = 0;
    for (const part of parts) {
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    }
    // Handle midnight 24
    if (hour === 24) hour = 0;
    return hour * 60 + minute;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

/**
 * Returns today's ISO date string in Asia/Dhaka (YYYY-MM-DD).
 */
export function getDhakaDateString(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export interface RoutineMessageContext {
  subject: string;
  class_name: string;
  start_time: string;
  end_time: string;
  room_no: string;
  teacher_name: string;
  period: string;
  division: string;
}

/**
 * Formats notification title/body using placeholder template variables.
 */
export function formatRoutineMessage(
  template: string,
  routine: RoutineItem | RoutineMessageContext
): string {
  if (!template) return "";

  const subject = "subject_name" in routine ? (routine as RoutineItem).subject_name : routine.subject;
  const classNameRaw = (routine as any).class_name || "";
  const className = classLabel(classNameRaw);
  const startTime = routine.start_time || "";
  const endTime = routine.end_time || "";
  const roomNo = routine.room_no ? `রুম ${routine.room_no}` : "অনির্ধারিত";
  const teacherName = routine.teacher_name || "";
  const period = routine.period || "";
  const division = routine.division ? divisionLabel(routine.division) : "";
  const batch = (routine as any).batch_name || "";

  return template
    .replace(/\{subject\}/g, subject || "")
    .replace(/\{class_name\}/g, className || "")
    .replace(/\{start_time\}/g, startTime || "")
    .replace(/\{end_time\}/g, endTime || "")
    .replace(/\{room_no\}/g, roomNo || "")
    .replace(/\{teacher_name\}/g, teacherName || "")
    .replace(/\{period\}/g, period || "")
    .replace(/\{division\}/g, division || "")
    .replace(/\{batch\}/g, batch || "");
}

/**
 * Synthesizes an audio chime using Web Audio API (100% free, no external MP3 asset needed).
 */
export function playNotificationChime(type: "10min" | "start" = "start"): void {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "10min") {
      // Pleasant double bell (C5 -> G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.18); // G5
      gain2.gain.setValueAtTime(0.22, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);
    } else {
      // Energetic triple fanfare chime (E5 -> G5 -> C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1046.5, now + 0.3); // C6
      gain3.gain.setValueAtTime(0.25, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.8);
    }
  } catch (err) {
    console.warn("Failed to play audio chime:", err);
  }
}
