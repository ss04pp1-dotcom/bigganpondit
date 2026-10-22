// Public Landing Page configuration types & defaults for BigganPondit Academy.
// Stored as JSON in the `settings` table under `SETTING_LANDING_PAGE`.
// Schema v3 — navy-blue reference design (hero photo, chips, floating widget,
// colored course cards, dark about section, stats, testimonials, notices, footer).

export const SETTING_LANDING_PAGE = "landing_page_config";

export type CourseHeaderColor =
  | "navy"
  | "teal"
  | "emerald"
  | "violet"
  | "orange"
  | "slate";

export type CourseSymbolType =
  | "atom"
  | "flask"
  | "pi"
  | "dna"
  | "sigma"
  | "book"
  | "monitor"
  | "calculator"
  | "clipboard"
  | "target";

export type WidgetAccentColor =
  | "blue"
  | "cyan"
  | "emerald"
  | "rose"
  | "amber"
  | "violet";

export interface LandingNavItem {
  id: string;
  label: string;
  href: string;
}

export interface LandingHeroChip {
  id: string;
  label: string;
}

export interface LandingHeroWidgetItem {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  color: WidgetAccentColor;
}

export interface LandingStat {
  id: string;
  value: string;
  label: string;
  iconName: string;
  iconColor: WidgetAccentColor;
}

export interface LandingCourse {
  id: string;
  title: string;
  subtitle: string;
  symbol: CourseSymbolType;
  headerColor: CourseHeaderColor;
  subjects: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  buttonText: string;
  imageUrl?: string;
  targetClass: string;
  schedule: string;
  feeLabel: string;
  description: string;
}

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface LandingAboutFeature {
  id: string;
  title: string;
  iconName: string;
}

export interface LandingNotice {
  id: string;
  day: string;
  month: string;
  title: string;
  details: string;
}

export interface LandingTestimonial {
  id: string;
  studentName: string;
  studentBatch: string;
  comment: string;
  rating: number;
  avatarUrl?: string;
}

export interface LandingPageConfig {
  schemaVersion: number;
  // ===== Navbar =====
  loginBtnText: string;
  registerBtnText: string;
  navItems: LandingNavItem[];

  // ===== Hero =====
  heroBadgeText: string;
  heroTagline: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  heroPrimaryBtnText: string;
  heroSecondaryBtnText: string;
  heroImageUrl: string;
  heroDecorText: string;
  heroChips: LandingHeroChip[];
  heroWidget: LandingHeroWidgetItem[];

  // ===== Feature strip =====
  features: LandingFeature[];

  // ===== Courses =====
  coursesSectionTag: string;
  coursesSectionTitle: string;
  coursesViewAllText: string;
  courses: LandingCourse[];

  // ===== About (dark navy section) =====
  aboutSectionTitle: string;
  aboutSectionDescription: string;
  aboutFeatures: LandingAboutFeature[];
  aboutDecorText: string;

  // ===== About + stats (light section) =====
  aboutTag: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutDetails: string;
  aboutBtnText: string;
  aboutImageUrl: string;
  stats: LandingStat[];

  // ===== Notices =====
  noticesSectionTitle: string;
  noticesViewAllText: string;
  notices: LandingNotice[];

  // ===== Testimonials =====
  testimonialsSectionTitle: string;
  testimonialsViewAllText: string;
  testimonials: LandingTestimonial[];

  // ===== Footer =====
  footerTagline: string;
  footerAboutText: string;
  quickLinksTitle: string;
  supportLinksTitle: string;
  supportLinks: LandingNavItem[];
  contactTitle: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  facebookUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  telegramUrl: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  newsletterPlaceholder: string;
  copyrightText: string;
  footerWatermark: string;
  footerMotto: string;
}

export const DEFAULT_HERO_IMAGE = "/landing/hero-student.jpg";
export const DEFAULT_CAMPUS_IMAGE = "/landing/campus.jpg";

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  schemaVersion: 3,

  // ===== Navbar =====
  loginBtnText: "লগইন",
  registerBtnText: "রেজিস্ট্রেশন",
  navItems: [
    { id: "nav-1", label: "হোম", href: "#home" },
    { id: "nav-2", label: "কোর্সসমূহ", href: "#courses" },
    { id: "nav-3", label: "মডেল টেস্ট", href: "#courses" },
    { id: "nav-4", label: "আমাদের সম্পর্কে", href: "#about" },
    { id: "nav-5", label: "নোটিশ", href: "#notices" },
    { id: "nav-6", label: "যোগাযোগ", href: "#contact" },
  ],

  // ===== Hero =====
  heroBadgeText: "বিজ্ঞান পণ্ডিত একাডেমি, বরিশাল",
  heroTagline: "স্বপ্ন দেখো • প্রস্তুতি নাও • সফল হও",
  heroTitleLine1: "ভালো শেখা,",
  heroTitleLine2: "উজ্জ্বল ভবিষ্যৎ",
  heroDescription:
    "মাধ্যমিক ও উচ্চমাধ্যমিক বিজ্ঞান বিভাগের শিক্ষার্থীদের জন্য বরিশালের অন্যতম সেরা কোচিং ও অনলাইন লার্নিং প্ল্যাটফর্ম। অভিজ্ঞ শিক্ষকমণ্ডলী, আধুনিক ক্লাসরুম ও নিয়মিত মূল্যায়নের মাধ্যমে গড়ে তুলুন আত্মবিশ্বাসী ভবিষ্যৎ।",
  heroPrimaryBtnText: "কোর্সসমূহ দেখুন",
  heroSecondaryBtnText: "আমাদের সম্পর্কে",
  heroImageUrl: DEFAULT_HERO_IMAGE,
  heroDecorText: "Better Study, Brighter Future",
  heroChips: [
    { id: "chip-1", label: "HSC 2026" },
    { id: "chip-2", label: "SSC 2026" },
    { id: "chip-3", label: "মডেল টেস্ট" },
    { id: "chip-4", label: "ফ্রি ক্লাস" },
  ],
  heroWidget: [
    {
      id: "hw-1",
      title: "এসএসসি ও এইচএসসি প্রস্তুতি",
      subtitle: "বিজ্ঞান বিভাগ • সম্পূর্ণ সিলেবাস",
      iconName: "graduation",
      color: "blue",
    },
    {
      id: "hw-2",
      title: "মডেল টেস্ট প্রোগ্রাম",
      subtitle: "অধ্যায়ভিত্তিক • পূর্ণাঙ্গ টেস্ট",
      iconName: "clipboard",
      color: "emerald",
    },
    {
      id: "hw-3",
      title: "লাইভ ও রেকর্ডেড ক্লাস",
      subtitle: "যেকোনো সময় দেখুন",
      iconName: "play",
      color: "rose",
    },
    {
      id: "hw-4",
      title: "বিগত বছরের প্রশ্ন ও সমাধান",
      subtitle: "বোর্ড প্রশ্নব্যাংক",
      iconName: "file",
      color: "violet",
    },
  ],

  // ===== Feature strip =====
  features: [
    {
      id: "feat-1",
      title: "বিশেষজ্ঞ শিক্ষক মণ্ডলী",
      description: "অভিজ্ঞ ও দক্ষ শিক্ষকদের দ্বারা পাঠদান",
      iconName: "graduation",
    },
    {
      id: "feat-2",
      title: "আধুনিক স্মার্ট ক্লাস",
      description: "অনলাইন + অফলাইন উভয় মাধ্যমে ক্লাস",
      iconName: "monitor",
    },
    {
      id: "feat-3",
      title: "ব্যক্তিগত গাইডেন্স",
      description: "প্রতিটি শিক্ষার্থীর জন্য বিশেষ সহায়তা",
      iconName: "users",
    },
    {
      id: "feat-4",
      title: "নিয়মিত মূল্যায়ন",
      description: "মডেল টেস্ট ও পরীক্ষার প্রস্তুতি",
      iconName: "chart",
    },
    {
      id: "feat-5",
      title: "ডিজিটাল নোটস",
      description: "নোট, সাজেশন ও প্রশ্নব্যাংক",
      iconName: "book",
    },
    {
      id: "feat-6",
      title: "নির্ভরযোগ্য প্রতিষ্ঠান",
      description: "৩০ বছরের ওপরে শিক্ষার অঙ্গীকার",
      iconName: "shield",
    },
  ],

  // ===== Courses =====
  coursesSectionTag: "আমাদের কোর্সসমূহ",
  coursesSectionTitle: "জনপ্রিয় কোর্স প্রোগ্রামসমূহ",
  coursesViewAllText: "সব কোর্স দেখুন",
  courses: [
    {
      id: "crs-hsc",
      title: "HSC বিজ্ঞান বিভাগ",
      subtitle: "একাদশ-দ্বাদশ শ্রেণির পূর্ণাঙ্গ প্রস্তুতি",
      symbol: "atom",
      headerColor: "navy",
      subjects: "পদার্থবিজ্ঞান • রসায়ন • উচ্চতর গণিত • জীববিজ্ঞান",
      bullet1: "ক্লাস: ৪৫+",
      bullet2: "মডেল টেস্ট: ২৫+",
      bullet3: "বোর্ড পরীক্ষার প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "একাদশ-দ্বাদশ শ্রেণি (HSC)",
      schedule: "সপ্তাহে ৫ দিন ক্লাস • অধ্যায়ভিত্তিক মডেল টেস্ট",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "এইচএসসি বিজ্ঞান বিভাগের পদার্থবিজ্ঞান, রসায়ন, উচ্চতর গণিত ও জীববিজ্ঞান — প্রতিটি অধ্যায়ের মৌলিক ধারণা, সূত্রের প্রমাণ, গাণিতিক সমস্যার সহজ সমাধান এবং বোর্ড পরীক্ষার সৃজনশীল ও এমসিকিউ প্রস্তুতি।",
    },
    {
      id: "crs-ssc",
      title: "SSC বিজ্ঞান বিভাগ",
      subtitle: "নবম-দশম শ্রেণির ধারাবাহিক প্রস্তুতি",
      symbol: "book",
      headerColor: "teal",
      subjects: "পদার্থবিজ্ঞান • রসায়ন • গণিত • জীববিজ্ঞান",
      bullet1: "ক্লাস: ৪০+",
      bullet2: "মডেল টেস্ট: ২০+",
      bullet3: "বোর্ড পরীক্ষার প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "নবম-দশম শ্রেণি (SSC)",
      schedule: "সপ্তাহে ৪ দিন ক্লাস • সাপ্তাহিক পরীক্ষা",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "এসএসসি বিজ্ঞান বিভাগের সব বিষয়ের পূর্ণাঙ্গ প্রস্তুতি — বেসিক কনসেপ্ট ক্লিয়ার, অধ্যায়ভিত্তিক নোটশিট, নিয়মিত পরীক্ষা ও অভিভাবকদের কাছে ডিজিটাল রিপোর্ট প্রেরণ।",
    },
    {
      id: "crs-bio",
      title: "জীববিজ্ঞান",
      subtitle: "চিত্রসহ সহজ অ্যানাটমি ও ফিজিওলজি",
      symbol: "dna",
      headerColor: "emerald",
      subjects: "উদ্ভিদবিজ্ঞান • প্রাণিবিজ্ঞান • জেনেটিক্স",
      bullet1: "ক্লাস: ৩৫+",
      bullet2: "মডেল টেস্ট: ২০+",
      bullet3: "মেডিকেল ফাউন্ডেশন",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "নবম-দ্বাদশ শ্রেণি ও মেডিকেল প্রস্তুতি",
      schedule: "সপ্তাহে ৩ দিন ক্লাস • চিত্রসহ বিশেষ ক্লাস",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "চিত্র ও ডায়াগ্রামের সাহায্যে উদ্ভিদবিজ্ঞান ও প্রাণিবিজ্ঞানের প্রতিটি টপিক সহজভাবে উপস্থাপন এবং বোর্ড ও মেডিকেল ভর্তি প্রস্তুতির পূর্ণাঙ্গ গাইডলাইন।",
    },
    {
      id: "crs-math",
      title: "উচ্চতর গণিত",
      subtitle: "জটিল গাণিতিক সমস্যার সহজ সমাধান",
      symbol: "sigma",
      headerColor: "violet",
      subjects: "বীজগণিত • ত্রিকোণমিতি • ক্যালকুলাস",
      bullet1: "ক্লাস: ৪৫+",
      bullet2: "মডেল টেস্ট: ২৫+",
      bullet3: "বিশ্ববিদ্যালয় প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "নবম-দ্বাদশ শ্রেণি",
      schedule: "সপ্তাহে ৪ দিন ক্লাস • প্রবলেম সলভিং সেশন",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "ক্যালকুলাস, ভেক্টর, স্থানাঙ্ক জ্যামিতি, সম্ভাবনা ও অসীম ধারার মতো জটিল অধ্যায়গুলো ধাপে ধাপে অনুশীলন এবং ইঞ্জিনিয়ারিং ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির মজবুত ভিত্তি।",
    },
    {
      id: "crs-ict",
      title: "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)",
      subtitle: "হাতে-কলমে প্র্যাকটিক্যাল শেখা",
      symbol: "monitor",
      headerColor: "orange",
      subjects: "প্রোগ্রামিং • ডেটাবেজ • নেটওয়ার্কিং",
      bullet1: "ক্লাস: ৩০+",
      bullet2: "প্র্যাকটিক্যাল: ১৫+",
      bullet3: "বোর্ড পরীক্ষার প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "নবম-দ্বাদশ শ্রেণি",
      schedule: "সপ্তাহে ২ দিন ক্লাস • ল্যাব প্র্যাকটিক্যাল",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "প্রোগ্রামিং বেসিক, ডেটাবেজ ম্যানেজমেন্ট, নেটওয়ার্কিং ও সাইবার সিকিউরিটির হাতে-কলমে প্র্যাকটিক্যাল ক্লাস — বোর্ড পরীক্ষায় এ+ পাওয়ার নিশ্চয়তা।",
    },
    {
      id: "crs-model",
      title: "মডেল টেস্ট প্রোগ্রাম",
      subtitle: "পূর্ণাঙ্গ সিলেবাসভিত্তিক অ্যাসেসমেন্ট",
      symbol: "clipboard",
      headerColor: "slate",
      subjects: "এমসিকিউ • সৃজনশীল • লিখিত পরীক্ষা",
      bullet1: "মডেল টেস্ট: ৪০+",
      bullet2: "উত্তরপত্র বিশ্লেষণ",
      bullet3: "মেধা তালিকা ও রিপোর্ট",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "এসএসসি ও এইচএসসি পরীক্ষার্থী",
      schedule: "সপ্তাহে ১টি পূর্ণাঙ্গ মডেল টেস্ট",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "বোর্ড পরীক্ষার প্যাটার্ন অনুযায়ী পূর্ণাঙ্গ মডেল টেস্ট, প্রশ্ন বিশ্লেষণ, উত্তরপত্র পরীক্ষা ও সময় ব্যবস্থাপনার বিশেষ ট্রেনিং — পরীক্ষার হলে আত্মবিশ্বাস নিয়ে লেখার দক্ষতা তৈরি।",
    },
  ],

  // ===== About (dark navy section) =====
  aboutSectionTitle: "কেন বিজ্ঞান পণ্ডিত একাডেমি?",
  aboutSectionDescription:
    "৩০ বছরেরও বেশি সময় ধরে আমরা বিজ্ঞান শিক্ষার্থীদের স্বপ্ন পূরণে কাজ করে যাচ্ছি। অভিজ্ঞ শিক্ষকমণ্ডলী, আধুনিক প্রযুক্তি ও প্রতিটি শিক্ষার্থীর প্রতি ব্যক্তিগত যত্নই আমাদের সাফল্যের মূল চাবিকাঠি।",
  aboutFeatures: [
    { id: "af-1", title: "অভিজ্ঞ শিক্ষক", iconName: "graduation" },
    { id: "af-2", title: "স্মার্ট ক্লাসরুম", iconName: "monitor" },
    { id: "af-3", title: "ডিজিটাল মূল্যায়ন", iconName: "chart" },
    { id: "af-4", title: "নোটস ও রিসোর্স", iconName: "book" },
    { id: "af-5", title: "অভিভাবক রিপোর্ট", iconName: "users" },
  ],
  aboutDecorText: "Dream • Plan • Achieve",

  // ===== About + stats (light section) =====
  aboutTag: "আমাদের সম্পর্কে",
  aboutTitle: "বিজ্ঞান পণ্ডিত একাডেমি",
  aboutDescription:
    "আমরা বিশ্বাস করি, সঠিক দিকনির্দেশনা ও মানসম্পন্ন শিক্ষার মাধ্যমে প্রতিটি শিক্ষার্থী তার স্বপ্ন পূরণ করতে পারে। আমাদের একাডেমিতে অভিজ্ঞ শিক্ষকমণ্ডলী, আধুনিক প্রযুক্তি এবং নিয়মিত মূল্যায়নের মাধ্যমে শিক্ষার্থীদের সর্বোচ্চ প্রস্তুতি নিশ্চিত করা হয়।",
  aboutDetails:
    "প্রতিটি শিক্ষার্থীর উপস্থিতি ডিজিটালভাবে ট্র্যাক করা হয় এবং অভিভাবকদের কাছে নিয়মিত এসএমএস ও অনলাইন পোর্টালের মাধ্যমে ফলাফল পৌঁছে দেওয়া হয়। আমাদের রয়েছে নিজস্ব ডিজিটাল প্রকাশনী, অধ্যায়ভিত্তিক লেকচার শিট, সাপ্তাহিক ও মাসিক মডেল টেস্ট এবং দুর্বল শিক্ষার্থীদের জন্য ওয়ান-টু-ওয়ান কেয়ার সেশন।",
  aboutBtnText: "আরও জানুন",
  aboutImageUrl: DEFAULT_CAMPUS_IMAGE,
  stats: [
    {
      id: "st-1",
      value: "৩০+",
      label: "বছরের অভিজ্ঞতা",
      iconName: "award",
      iconColor: "amber",
    },
    {
      id: "st-2",
      value: "৬০,০০০+",
      label: "শিক্ষার্থী",
      iconName: "users",
      iconColor: "blue",
    },
    {
      id: "st-3",
      value: "২০০+",
      label: "মেধাবী শিক্ষক",
      iconName: "graduation",
      iconColor: "emerald",
    },
    {
      id: "st-4",
      value: "৯৬%",
      label: "সাফল্যের হার",
      iconName: "target",
      iconColor: "rose",
    },
  ],

  // ===== Notices =====
  noticesSectionTitle: "সর্বশেষ নোটিশ",
  noticesViewAllText: "সব নোটিশ দেখুন",
  notices: [
    {
      id: "nt-1",
      day: "২৫",
      month: "অক্টোবর",
      title: "HSC 2026 ব্যাচে ভর্তি চলছে",
      details:
        "এইচএসসি ২০২৬ শিক্ষাবর্ষের পদার্থবিজ্ঞান, রসায়ন, উচ্চতর গণিত ও জীববিজ্ঞান বিষয়ের ভর্তি কার্যক্রম শুরু হয়েছে। সীমিত আসনে ভর্তি নিশ্চিত করতে দ্রুত অফিসে যোগাযোগ করুন।",
    },
    {
      id: "nt-2",
      day: "২০",
      month: "অক্টোবর",
      title: "SSC ২০২৬ স্পেশাল কেয়ার প্রোগ্রাম চালু",
      details:
        "এসএসসি ২০২৬ ব্যাচের জন্য দুর্বল শিক্ষার্থীদের বিশেষ ওয়ান-টু-ওয়ান কেয়ার সেশন চালু হয়েছে। নিজ নিজ ক্লাস শিক্ষকের সাথে সময় নির্ধারণ করে অংশ নিতে পারবে।",
    },
    {
      id: "nt-3",
      day: "১৬",
      month: "অক্টোবর",
      title: "মাসিক পরীক্ষার সময়সূচি প্রকাশ",
      details:
        "সকল চলমান ব্যাচের মাসিক মূল্যায়ন পরীক্ষার রুটিন ও সিলেবাস প্রকাশ করা হয়েছে। নির্ধারিত সময়ে সকল শিক্ষার্থীকে পরীক্ষায় অংশগ্রহণের নির্দেশ দেওয়া হলো।",
    },
  ],

  // ===== Testimonials =====
  testimonialsSectionTitle: "শিক্ষার্থীদের মতামত",
  testimonialsViewAllText: "সব মতামত",
  testimonials: [
    {
      id: "tm-1",
      studentName: "আব্দুল্লাহ খান",
      studentBatch: "HSC 2025, বিজ্ঞান বিভাগ",
      comment:
        "বিজ্ঞান পণ্ডিত একাডেমিতে পড়ে আমার পদার্থবিজ্ঞান ও রসায়নের প্রতি ভয় কেটে গেছে। শিক্ষকদের গাইডলাইন সত্যি অসাধারণ!",
      rating: 5,
      avatarUrl: "",
    },
    {
      id: "tm-2",
      studentName: "তাসনিম জাহান সারা",
      studentBatch: "SSC 2025, বিজ্ঞান বিভাগ",
      comment:
        "নিয়মিত মডেল টেস্ট, ডিজিটাল নোটবুক এবং প্রতিটি অধ্যায়ের বেসিক ক্লিয়ার ক্লাসের কারণে বোর্ড পরীক্ষায় আমার আত্মবিশ্বাস অনেক বেড়েছে।",
      rating: 5,
      avatarUrl: "",
    },
    {
      id: "tm-3",
      studentName: "মাহমুদুল হাসান রাহাত",
      studentBatch: "১০ম শ্রেণি, বিজ্ঞান বিভাগ",
      comment:
        "উচ্চতর গণিত ও পদার্থবিজ্ঞানের জটিল গাণিতিক সমস্যাগুলো স্যাররা এত সহজভাবে বুঝিয়ে দেন যা আগে কখনো পাইনি।",
      rating: 5,
      avatarUrl: "",
    },
  ],

  // ===== Footer =====
  footerTagline: "জ্ঞান • চর্চা • সাফল্য",
  footerAboutText:
    "বরিশালের অন্যতম সেরা বিজ্ঞানভিত্তিক শিক্ষা প্রতিষ্ঠান — মাধ্যমিক থেকে উচ্চমাধ্যমিক পর্যন্ত সর্বোচ্চ মানের শিক্ষা ও গাইডলাইন নিশ্চিত করতে আমাদের নিরলস প্রচেষ্টা।",
  quickLinksTitle: "দ্রুত লিংক",
  supportLinksTitle: "সহায়তা",
  supportLinks: [
    { id: "sl-1", label: "সচরাচর জিজ্ঞাসা", href: "#notices" },
    { id: "sl-2", label: "শিক্ষার্থী পোর্টাল", href: "/login" },
    { id: "sl-3", label: "নোটিশ বোর্ড", href: "#notices" },
    { id: "sl-4", label: "কোর্সসমূহ", href: "#courses" },
  ],
  contactTitle: "যোগাযোগ",
  contactAddress: "সদর রোড, বরিশাল, বাংলাদেশ",
  contactPhone: "+880 1712-345678",
  contactEmail: "info@bigyanpandit.com",
  facebookUrl: "",
  youtubeUrl: "",
  instagramUrl: "",
  telegramUrl: "",
  newsletterTitle: "নিউজলেটার",
  newsletterSubtitle: "নতুন কোর্স ও আপডেট পেতে সাবস্ক্রাইব করুন",
  newsletterPlaceholder: "আপনার ইমেইল লিখুন",
  copyrightText: "© ২০২৫ বিজ্ঞান পণ্ডিত একাডেমি। সর্বস্বত্ব সংরক্ষিত।",
  footerWatermark: "Better Study, Brighter Future",
  footerMotto: "শিক্ষায় জয়ে, জীবনে জয়ে",
};

// ---------------------------------------------------------------------------
// Sanitizer helpers
// ---------------------------------------------------------------------------

function sanitizeNavItems(
  items: unknown,
  fallback: LandingNavItem[]
): LandingNavItem[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingNavItem => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `nav-${Date.now()}-${i}`,
      label: typeof it.label === "string" ? it.label : "",
      href: typeof it.href === "string" ? it.href : "#",
    }))
    .filter((it) => it.label.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeHeroChips(
  items: unknown,
  fallback: LandingHeroChip[]
): LandingHeroChip[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingHeroChip => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `chip-${Date.now()}-${i}`,
      label: typeof it.label === "string" ? it.label : "",
    }))
    .filter((it) => it.label.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeHeroWidget(
  items: unknown,
  fallback: LandingHeroWidgetItem[]
): LandingHeroWidgetItem[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingHeroWidgetItem => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `hw-${Date.now()}-${i}`,
      title: typeof it.title === "string" ? it.title : "",
      subtitle: typeof it.subtitle === "string" ? it.subtitle : "",
      iconName: typeof it.iconName === "string" ? it.iconName : "award",
      color: (typeof it.color === "string" &&
        ["blue", "cyan", "emerald", "rose", "amber", "violet"].includes(it.color)
        ? it.color
        : "blue") as WidgetAccentColor,
    }))
    .filter((it) => it.title.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeFeatures(
  items: unknown,
  fallback: LandingFeature[]
): LandingFeature[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingFeature => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `feat-${Date.now()}-${i}`,
      title: typeof it.title === "string" ? it.title : "",
      description: typeof it.description === "string" ? it.description : "",
      iconName: typeof it.iconName === "string" ? it.iconName : "graduation",
    }))
    .filter((it) => it.title.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeAboutFeatures(
  items: unknown,
  fallback: LandingAboutFeature[]
): LandingAboutFeature[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingAboutFeature => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `af-${Date.now()}-${i}`,
      title: typeof it.title === "string" ? it.title : "",
      iconName: typeof it.iconName === "string" ? it.iconName : "graduation",
    }))
    .filter((it) => it.title.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeCourses(
  items: unknown,
  fallback: LandingCourse[]
): LandingCourse[] {
  if (!Array.isArray(items)) return fallback;
  const headerColors: CourseHeaderColor[] = [
    "navy",
    "teal",
    "emerald",
    "violet",
    "orange",
    "slate",
  ];
  const symbols: CourseSymbolType[] = [
    "atom",
    "flask",
    "pi",
    "dna",
    "sigma",
    "book",
    "monitor",
    "calculator",
    "clipboard",
    "target",
  ];
  const cleaned = items
    .filter((it): it is LandingCourse => !!it && typeof it === "object")
    .map((it, i) => ({
      id:
        typeof it.id === "string" && it.id ? it.id : `crs-${Date.now()}-${i}`,
      title: typeof it.title === "string" ? it.title : "",
      subtitle: typeof it.subtitle === "string" ? it.subtitle : "",
      symbol: (symbols.includes(it.symbol as CourseSymbolType)
        ? it.symbol
        : "book") as CourseSymbolType,
      headerColor: (headerColors.includes(it.headerColor as CourseHeaderColor)
        ? it.headerColor
        : "navy") as CourseHeaderColor,
      subjects: typeof it.subjects === "string" ? it.subjects : "",
      bullet1: typeof it.bullet1 === "string" ? it.bullet1 : "",
      bullet2: typeof it.bullet2 === "string" ? it.bullet2 : "",
      bullet3: typeof it.bullet3 === "string" ? it.bullet3 : "",
      buttonText: typeof it.buttonText === "string" ? it.buttonText : "বিস্তারিত দেখুন",
      imageUrl: typeof it.imageUrl === "string" ? it.imageUrl : "",
      targetClass: typeof it.targetClass === "string" ? it.targetClass : "",
      schedule: typeof it.schedule === "string" ? it.schedule : "",
      feeLabel: typeof it.feeLabel === "string" ? it.feeLabel : "",
      description: typeof it.description === "string" ? it.description : "",
    }))
    .filter((it) => it.title.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeStats(
  items: unknown,
  fallback: LandingStat[]
): LandingStat[] {
  if (!Array.isArray(items)) return fallback;
  const accents: WidgetAccentColor[] = [
    "blue",
    "cyan",
    "emerald",
    "rose",
    "amber",
    "violet",
  ];
  const cleaned = items
    .filter((it): it is LandingStat => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `st-${Date.now()}-${i}`,
      value: typeof it.value === "string" ? it.value : "",
      label: typeof it.label === "string" ? it.label : "",
      iconName: typeof it.iconName === "string" ? it.iconName : "award",
      iconColor: (accents.includes(it.iconColor as WidgetAccentColor)
        ? it.iconColor
        : "blue") as WidgetAccentColor,
    }))
    .filter((it) => it.value.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeNotices(
  items: unknown,
  fallback: LandingNotice[]
): LandingNotice[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingNotice => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `nt-${Date.now()}-${i}`,
      day: typeof it.day === "string" ? it.day : "",
      month: typeof it.month === "string" ? it.month : "",
      title: typeof it.title === "string" ? it.title : "",
      details: typeof it.details === "string" ? it.details : "",
    }))
    .filter((it) => it.title.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function sanitizeTestimonials(
  items: unknown,
  fallback: LandingTestimonial[]
): LandingTestimonial[] {
  if (!Array.isArray(items)) return fallback;
  const cleaned = items
    .filter((it): it is LandingTestimonial => !!it && typeof it === "object")
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `tm-${Date.now()}-${i}`,
      studentName: typeof it.studentName === "string" ? it.studentName : "",
      studentBatch: typeof it.studentBatch === "string" ? it.studentBatch : "",
      comment: typeof it.comment === "string" ? it.comment : "",
      rating:
        typeof it.rating === "number" && it.rating >= 1 && it.rating <= 5
          ? Math.round(it.rating)
          : 5,
      avatarUrl: typeof it.avatarUrl === "string" ? it.avatarUrl : "",
    }))
    .filter((it) => it.studentName.trim() !== "");
  return cleaned.length ? cleaned : fallback;
}

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v : fb;
}

export function parseLandingConfig(rawJson: string | null | undefined): LandingPageConfig {
  if (!rawJson || !rawJson.trim()) {
    return DEFAULT_LANDING_CONFIG;
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<LandingPageConfig>;
    // Older schema versions (v1/v2) are upgraded seamlessly to v3 defaults
    if (parsed.schemaVersion !== 3) {
      return DEFAULT_LANDING_CONFIG;
    }
    const D = DEFAULT_LANDING_CONFIG;
    return {
      schemaVersion: 3,
      loginBtnText: str(parsed.loginBtnText, D.loginBtnText),
      registerBtnText: str(parsed.registerBtnText, D.registerBtnText),
      navItems: sanitizeNavItems(parsed.navItems, D.navItems),

      heroBadgeText: str(parsed.heroBadgeText, D.heroBadgeText),
      heroTagline: str(parsed.heroTagline, D.heroTagline),
      heroTitleLine1: str(parsed.heroTitleLine1, D.heroTitleLine1),
      heroTitleLine2: str(parsed.heroTitleLine2, D.heroTitleLine2),
      heroDescription: str(parsed.heroDescription, D.heroDescription),
      heroPrimaryBtnText: str(parsed.heroPrimaryBtnText, D.heroPrimaryBtnText),
      heroSecondaryBtnText: str(parsed.heroSecondaryBtnText, D.heroSecondaryBtnText),
      heroImageUrl: str(parsed.heroImageUrl, D.heroImageUrl),
      heroDecorText: str(parsed.heroDecorText, D.heroDecorText),
      heroChips: sanitizeHeroChips(parsed.heroChips, D.heroChips),
      heroWidget: sanitizeHeroWidget(parsed.heroWidget, D.heroWidget),

      features: sanitizeFeatures(parsed.features, D.features),

      coursesSectionTag: str(parsed.coursesSectionTag, D.coursesSectionTag),
      coursesSectionTitle: str(parsed.coursesSectionTitle, D.coursesSectionTitle),
      coursesViewAllText: str(parsed.coursesViewAllText, D.coursesViewAllText),
      courses: sanitizeCourses(parsed.courses, D.courses),

      aboutSectionTitle: str(parsed.aboutSectionTitle, D.aboutSectionTitle),
      aboutSectionDescription: str(parsed.aboutSectionDescription, D.aboutSectionDescription),
      aboutFeatures: sanitizeAboutFeatures(parsed.aboutFeatures, D.aboutFeatures),
      aboutDecorText: str(parsed.aboutDecorText, D.aboutDecorText),

      aboutTag: str(parsed.aboutTag, D.aboutTag),
      aboutTitle: str(parsed.aboutTitle, D.aboutTitle),
      aboutDescription: str(parsed.aboutDescription, D.aboutDescription),
      aboutDetails: str(parsed.aboutDetails, D.aboutDetails),
      aboutBtnText: str(parsed.aboutBtnText, D.aboutBtnText),
      aboutImageUrl: str(parsed.aboutImageUrl, D.aboutImageUrl),
      stats: sanitizeStats(parsed.stats, D.stats),

      noticesSectionTitle: str(parsed.noticesSectionTitle, D.noticesSectionTitle),
      noticesViewAllText: str(parsed.noticesViewAllText, D.noticesViewAllText),
      notices: sanitizeNotices(parsed.notices, D.notices),

      testimonialsSectionTitle: str(parsed.testimonialsSectionTitle, D.testimonialsSectionTitle),
      testimonialsViewAllText: str(parsed.testimonialsViewAllText, D.testimonialsViewAllText),
      testimonials: sanitizeTestimonials(parsed.testimonials, D.testimonials),

      footerTagline: str(parsed.footerTagline, D.footerTagline),
      footerAboutText: str(parsed.footerAboutText, D.footerAboutText),
      quickLinksTitle: str(parsed.quickLinksTitle, D.quickLinksTitle),
      supportLinksTitle: str(parsed.supportLinksTitle, D.supportLinksTitle),
      supportLinks: sanitizeNavItems(parsed.supportLinks, D.supportLinks),
      contactTitle: str(parsed.contactTitle, D.contactTitle),
      contactAddress: str(parsed.contactAddress, D.contactAddress),
      contactPhone: str(parsed.contactPhone, D.contactPhone),
      contactEmail: str(parsed.contactEmail, D.contactEmail),
      facebookUrl: str(parsed.facebookUrl, D.facebookUrl),
      youtubeUrl: str(parsed.youtubeUrl, D.youtubeUrl),
      instagramUrl: str(parsed.instagramUrl, D.instagramUrl),
      telegramUrl: str(parsed.telegramUrl, D.telegramUrl),
      newsletterTitle: str(parsed.newsletterTitle, D.newsletterTitle),
      newsletterSubtitle: str(parsed.newsletterSubtitle, D.newsletterSubtitle),
      newsletterPlaceholder: str(parsed.newsletterPlaceholder, D.newsletterPlaceholder),
      copyrightText: str(parsed.copyrightText, D.copyrightText),
      footerWatermark: str(parsed.footerWatermark, D.footerWatermark),
      footerMotto: str(parsed.footerMotto, D.footerMotto),
    };
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}
