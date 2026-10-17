// Shared constants — নম্বর সংগ্রহক ও রিপোর্ট সফটওয়্যার
// UI text is Bangla; identifiers stay English.

export const APP_TITLE = "নম্বর সংগ্রহক ও রিপোর্ট সফটওয়্যার";
export const DEFAULT_ACADEMY_NAME = "বিজ্ঞান পণ্ডিত একাডেমি";
export const SETTING_ACADEMY_NAME = "academy_name";
export const SETTING_ACADEMY_LOGO = "academy_logo_key";
export const SETTING_SCHEMA_VERSION = "schema_version";
export const SETTING_BACKUP_REGISTRY = "backup_registry";
export const SETTING_ADMIN_EMAIL = "admin_recovery_email";
export const SETTING_RESEND_API_KEY = "resend_api_key";
export const SETTING_RESEND_FROM = "resend_from_email";
export const SETTING_BANNER_IMAGE = "banner_image_key";
export const SETTING_BANNER_TITLE = "banner_title";
export const SETTING_BANNER_SUBTITLE = "banner_subtitle";
export const SETTING_BANNER_LINK = "banner_link";
export const SETTING_BANNER_ACTIVE = "banner_active";
export const SETTING_DIRECTOR_SIGNATURE = "director_default_signature_key";
export const SETTING_CARD_COVER_BG = "card_cover_bg_url";
export const SETTING_CARD_BG_KEY = "card_bg_image_key";

export const DEFAULT_PUBLICATION_NAME = "বিজ্ঞান পণ্ডিত প্রকাশনী";
export const SETTING_PUBLICATION_NAME = "publication_name";
export const SETTING_PUBLICATION_LOGO = "publication_logo_key";
export const SETTING_PUBLICATION_DESCRIPTION = "publication_description";

export function cleanCardBgUrl(val: string | null | undefined): string | null {
  if (!val || !val.trim()) return null;
  let str = val.trim();
  while (str.startsWith("/api/files//api/files/")) {
    str = str.replace("/api/files//api/files/", "/api/files/");
  }
  while (str.startsWith("/api/files/api/files/")) {
    str = str.replace("/api/files/api/files/", "/api/files/");
  }
  if (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:") ||
    str.startsWith("blob:")
  ) {
    return str;
  }
  if (str.startsWith("/")) {
    return str;
  }
  return `/api/files/${str}`;
}

/**
 * Today's date as YYYY-MM-DD in the academy's local timezone (Asia/Dhaka,
 * UTC+6). Using raw UTC meant that between 00:00–05:59 local time the server
 * considered the current local date a "future date".
 */
export function todayISODateDhaka(): string {
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

/** Alias for todayISODateDhaka */
export function todayYmdDhaka(): string {
  return todayISODateDhaka();
}

// ---- Bangladesh phone-number helpers --------------------------------
// (toEnDigits already exists below — Bangla->ASCII numeral conversion.)

/** Valid BD mobile number: 01XXXXXXXXX (also accepts +880/880 prefixes). */
export const BD_PHONE_RE = /^(?:\+?880|0)1[3-9]\d{8}$/;

/**
 * Normalize a phone entry to the canonical `01XXXXXXXXX` form: converts
 * Bengali digits, strips separators, and folds +88/880 prefixes. A phone
 * entered as ০১৭১… previously stripped to "" in the SMS route and the
 * guardian silently never received anything.
 */
export function normalizeBdPhone(raw: string): string {
  const p = toEnDigits(String(raw ?? "")).replace(/[^0-9+]/g, "");
  if (p.startsWith("+880")) return "0" + p.slice(4);
  if (p.startsWith("880")) return "0" + p.slice(3);
  return p;
}

export type Role = "ADMIN" | "TEACHER" | "STUDENT" | "DIRECTOR";
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "প্রশাসক",
  DIRECTOR: "পরিচালক",
  TEACHER: "শিক্ষক",
  STUDENT: "শিক্ষার্থী",
};

export type Division = "SCIENCE" | "HUMANITIES";
export const DIVISIONS: { value: Division; label: string }[] = [
  { value: "SCIENCE", label: "বিজ্ঞান" },
  { value: "HUMANITIES", label: "মানবিক" },
];
export function divisionLabel(d: string | null | undefined): string {
  return DIVISIONS.find((x) => x.value === d)?.label ?? "";
}

// Class numbers stored as text: '6'..'10'
export const CLASS_NUMBERS = ["6", "7", "8", "9", "10"] as const;
const CLASS_NAMES: Record<string, string> = {
  "1": "প্রথম",
  "2": "দ্বিতীয়",
  "3": "তৃতীয়",
  "4": "চতুর্থ",
  "5": "পঞ্চম",
  "6": "ষষ্ঠ",
  "7": "সপ্তম",
  "8": "অষ্টম",
  "9": "নবম",
  "10": "দশম",
  "11": "একাদশ",
  "12": "দ্বাদশ",
  "ALUMNI": "উত্তীর্ণ / প্রাক্তন",
};
export function classNameLabel(n: string): string {
  return CLASS_NAMES[n] ?? n;
}
export function classLabel(n: string): string {
  if (n === "ALUMNI") return "উত্তীর্ণ / প্রাক্তন ব্যাচ";
  if (CLASS_NAMES[n]) return `${CLASS_NAMES[n]} শ্রেণি`;
  if (n.endsWith("শ্রেণি") || n.endsWith("শ্রেণী")) return n;
  return `${n} শ্রেণি`;
}
/** e.g. groupLabel('9','SCIENCE') -> '৯ম বিজ্ঞান' (used by list filters) */
export function groupLabel(classNum: string, division: string | null): string {
  const ord: Record<string, string> = {
    "6": "৬ষ্ঠ",
    "7": "৭ম",
    "8": "৮ম",
    "9": "৯ম",
    "10": "১০ম",
    "ALUMNI": "উত্তীর্ণ",
  };
  const base = `${ord[classNum] ?? classNum}`;
  return division ? `${base} ${divisionLabel(division)}` : base;
}

export const SECTION_SUGGESTIONS = ["ক", "খ", "গ", "ঘ"];

export const MONTHS_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;
export function monthLabel(m: number | string): string {
  const num = typeof m === "string" ? parseInt(m, 10) : m;
  if (!num || isNaN(num) || num < 1 || num > 12) return String(m ?? "");
  return MONTHS_BN[num - 1] ?? String(m);
}

/**
 * Returns current 1-based month (1 = Jan, 10 = Oct, 12 = Dec) in Asia/Dhaka time.
 */
export function currentMonthDhaka(): number {
  try {
    const iso = todayISODateDhaka(); // "YYYY-MM-DD"
    const parts = iso.split("-");
    const m = parseInt(parts[1], 10);
    return !isNaN(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  } catch {
    return new Date().getMonth() + 1;
  }
}

/**
 * Returns current 4-digit year in Asia/Dhaka time.
 */
export function currentYearDhaka(): number {
  try {
    const iso = todayISODateDhaka();
    const parts = iso.split("-");
    const y = parseInt(parts[0], 10);
    return !isNaN(y) && y >= 2020 ? y : new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

export function currentMonthNameBn(): string {
  const m = currentMonthDhaka();
  return MONTHS_BN[m - 1] ?? "অক্টোবর";
}

export const EXAM_TITLE_SUGGESTIONS = [
  "ক্লাস টেস্ট ১",
  "ক্লাস টেস্ট ২",
  "মাসিক পরীক্ষা",
  "অধ্যায় টেস্ট",
  "সাপ্তাহিক পরীক্ষা",
  "মডেল টেস্ট",
];

// ---- Grade & GPA (spec section 26) ----
export interface GradeInfo {
  grade: string;
  gpa: number;
}
export function gradeFromPercentage(pct: number): GradeInfo {
  if (pct >= 80) return { grade: "A+", gpa: 5.0 };
  if (pct >= 70) return { grade: "A", gpa: 4.0 };
  if (pct >= 60) return { grade: "A-", gpa: 3.5 };
  if (pct >= 50) return { grade: "B", gpa: 3.0 };
  if (pct >= 40) return { grade: "C", gpa: 2.0 };
  if (pct >= 33) return { grade: "D", gpa: 1.0 };
  return { grade: "F", gpa: 0.0 };
}
export const GRADE_TABLE: { range: string; grade: string; gpa: string }[] = [
  { range: "৮০–১০০", grade: "A+", gpa: "৫.০০" },
  { range: "৭০–৭৯", grade: "A", gpa: "৪.০০" },
  { range: "৬০–৬৯", grade: "A-", gpa: "৩.৫০" },
  { range: "৫০–৫৯", grade: "B", gpa: "৩.০০" },
  { range: "৪০–৪৯", grade: "C", gpa: "২.০০" },
  { range: "৩৩–৩৯", grade: "D", gpa: "১.০০" },
  { range: "০–৩২", grade: "F", gpa: "০.০০" },
];

// ---- Bangla numerals for display surfaces (reference image style) ----
const BN_DIGITS: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
};
const EN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};
export function toEnDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[০-৯]/g, (d) => EN_DIGITS[d] ?? d);
}
export function bn(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[d] ?? d);
}
/** Format a number for display: 2 decimal places max, no trailing zeros. */
export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "০";
  const rounded = Math.round(n * 100) / 100;
  const s = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return bn(s);
}
export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "০%";
  return `${fmtNum(Math.round(n * 100) / 100)}%`;
}
export function fmtGpa(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0.00";
  return Number(n).toFixed(2);
}

/**
 * Format a stored UTC payment/timestamp value (either ISO "2026-10-15T11:13:41.446Z"
 * or SQLite "2026-10-15 11:13:41") as a clean Bengali Dhaka date:
 * "১৫ অক্টোবর ২০২৬". Falls back to the raw string when unparseable.
 */
export function fmtDateBnFromUtc(v: string | null | undefined): string {
  if (!v) return "";
  const raw = String(v).trim();
  if (!raw) return "";
  // Normalize SQLite "YYYY-MM-DD HH:MM:SS" (implicit UTC) to ISO
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return raw;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const monthEn = get("month");
    const monthBn: Record<string, string> = {
      January: "জানুয়ারি", February: "ফেব্রুয়ারি", March: "মার্চ",
      April: "এপ্রিল", May: "মে", June: "জুন", July: "জুলাই",
      August: "আগস্ট", September: "সেপ্টেম্বর", October: "অক্টোবর",
      November: "নভেম্বর", December: "ডিসেম্বর",
    };
    return `${bn(get("day"))} ${monthBn[monthEn] ?? monthEn} ${bn(get("year"))}`;
  } catch {
    return raw;
  }
}

/**
 * Same as fmtDateBnFromUtc but with Dhaka time: "১৫ অক্টোবর ২০২৬, ৫:১৩ PM".
 */
export function fmtDateTimeBnFromUtc(v: string | null | undefined): string {
  if (!v) return "";
  const raw = String(v).trim();
  if (!raw) return "";
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return raw;
  const dateBn = fmtDateBnFromUtc(raw);
  try {
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return `${dateBn}, ${bn(time.replace(" ", " "))}`;
  } catch {
    return dateBn;
  }
}

/** Payment-method code → Bengali label (receipts, ledgers, history). */
export function paymentMethodLabelBn(m: string | null | undefined): string {
  const code = String(m ?? "").trim().toUpperCase();
  const map: Record<string, string> = {
    CASH: "নগদ (ক্যাশ)",
    BKASH: "বিকাশ",
    NAGAD: "নগদ (নাগাদ)",
    CARD: "কার্ড",
    BANK: "ব্যাংক ট্রান্সফার",
    ONLINE: "অনলাইন",
    CHEQUE: "চেক",
  };
  return map[code] || String(m ?? "");
}

// ---- Friendly Bangla messages (spec section 68) ----
export const MSG = {
  saved: "সফলভাবে সংরক্ষণ করা হয়েছে।",
  updated: "তথ্য আপডেট করা হয়েছে।",
  deleted: "তথ্য মুছে ফেলা হয়েছে।",
  notFound: "এই তথ্য পাওয়া যায়নি।",
  noPermissionSubject: "আপনার এই বিষয়টির অনুমতি নেই।",
  duplicateMark:
    "এই পরীক্ষার নম্বর ইতোমধ্যে দেওয়া হয়েছে। আপনি কি আপডেট করতে চান?",
  invalidNumber: "ভুল নম্বর প্রদান করা হয়েছে।",
  invalidFileType: "ফাইলের ধরন অনুমোদিত নয়।",
  noPermissionView: "আপনার এই তথ্য দেখার অনুমতি নেই।",
  loginFailed: "ভুল ইউজারনেম বা পাসওয়ার্ড।",
  loginRequired: "লগইন করা আবশ্যক।",
  loggedOut: "সফলভাবে লগআউট হয়েছে।",
  nameRequired: "নাম লিখুন।",
  usernameRequired: "ইউজারনেম লিখুন।",
  passwordRequired: "পাসওয়ার্ড লিখুন।",
  fileTooLarge: "ফাইলটি অনেক বড় (সর্বোচ্চ ৫ MB)।",
  confirmDelete: "আপনি কি নিশ্চিত? এই তথ্য মুছে ফেলা হবে।",
  confirmRestore: "ব্যাকআপ রিস্টোর করলে বর্তমান সব তথ্য পরিবর্তিত হবে। আপনি কি নিশ্চিত?",
} as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];

export const SESSION_COOKIE = "sid";
export const SESSION_TTL_DAYS = 7;

// R2 key prefixes
export const R2_PREFIX = {
  logos: "academy/logos",
  signatures: "academy/signatures",
  students: "academy/students",
  backups: "academy/backups",
};

export interface DayOption {
  id: number;
  name: string;
  short: string;
  isWeekend?: boolean;
}

export const DAYS_OF_WEEK: DayOption[] = [
  { id: 6, name: "শনিবার", short: "শনি", isWeekend: false },
  { id: 0, name: "রবিবার", short: "রবি", isWeekend: false },
  { id: 1, name: "সোমবার", short: "সোম", isWeekend: false },
  { id: 2, name: "মঙ্গলবার", short: "মঙ্গল", isWeekend: false },
  { id: 3, name: "বুধবার", short: "বুধ", isWeekend: false },
  { id: 4, name: "বৃহস্পতিবার", short: "বৃহস্পতি", isWeekend: false },
  { id: 5, name: "শুক্রবার", short: "শুক্র", isWeekend: true },
];

export function getBangladeshDayOfWeek(): number {
  try {
    const bdStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    return new Date(bdStr).getDay();
  } catch {
    return new Date().getDay();
  }
}

export function getDayNameBn(dayNum: number): string {
  const d = DAYS_OF_WEEK.find((item) => item.id === dayNum);
  return d ? d.name : "শনিবার";
}

// ---- Routine Push Notification Constants & Defaults ----
export const SETTING_ROUTINE_NOTIF_ENABLED = "routine_notif_enabled";
export const SETTING_ROUTINE_NOTIF_10MIN_ENABLED = "routine_notif_10min_enabled";
export const SETTING_ROUTINE_NOTIF_START_ENABLED = "routine_notif_start_enabled";
export const SETTING_ROUTINE_NOTIF_SOUND_ENABLED = "routine_notif_sound_enabled";
export const SETTING_ROUTINE_NOTIF_10MIN_TITLE = "routine_notif_10min_title";
export const SETTING_ROUTINE_NOTIF_10MIN_MSG = "routine_notif_10min_msg";
export const SETTING_ROUTINE_NOTIF_START_TITLE = "routine_notif_start_title";
export const SETTING_ROUTINE_NOTIF_START_MSG = "routine_notif_start_msg";

export const DEFAULT_NOTIF_10MIN_TITLE = "🔔 আসন্ন ক্লাস: ১০ মিনিট পর শুরু হবে";
export const DEFAULT_NOTIF_10MIN_MSG = "{subject} ({class_name}) ক্লাস ১০ মিনিট পর {start_time}-এ শুরু হবে। রুম: {room_no}, শিক্ষক: {teacher_name}।";

export const DEFAULT_NOTIF_START_TITLE = "🚀 ক্লাস শুরুর সময় হয়েছে!";
export const DEFAULT_NOTIF_START_MSG = "{subject} ({class_name}) ক্লাস এখনই {start_time}-এ শুরু হচ্ছে। রুম: {room_no}, শিক্ষক: {teacher_name}।";

// ---- Developer Signature & Branding ----
export const DEVELOPER_INFO = {
  name: "MD SALAH UDDIN",
  company: "SONEXDEV",
  email: "mdsalahuddin6a7@gmail.com",
  creditText: "Developed by MD SALAH UDDIN • SONEXDEV",
  contactText: "Gmail: mdsalahuddin6a7@gmail.com",
  fullCredit: "Developed by MD SALAH UDDIN • SONEXDEV | Gmail: mdsalahuddin6a7@gmail.com",
} as const;

