// Public Landing Page configuration types & defaults for BigganPondit Academy.
// Stored as JSON in the `settings` table under `SETTING_LANDING_PAGE`.

export const SETTING_LANDING_PAGE = "landing_page_config";

export type CourseColorTheme = "blue" | "green" | "purple" | "emerald" | "orange";
export type CourseSymbolType = "atom" | "flask" | "pi" | "dna" | "sigma" | "book";

export interface LandingStat {
  id: string;
  value: string;
  label: string;
  iconName: string; // "users" | "graduation" | "book" | "award"
}

export interface LandingCourse {
  id: string;
  title: string;
  subtitle: string;
  symbol: CourseSymbolType;
  colorTheme: CourseColorTheme;
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
  iconName: string; // "graduation" | "monitor" | "users" | "chart" | "book" | "shield"
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
  // Header & Hero
  loginBtnText: string;
  heroTagline: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitleHeading: string;
  heroDescription: string;
  heroQuote: string;
  heroPrimaryBtnText: string;
  heroSecondaryBtnText: string;
  heroImageUrl: string;

  // 6 Feature Strip Items
  features: LandingFeature[];

  // Subject-Wise Courses Section
  coursesSectionTag: string;
  coursesSectionTitle: string;
  coursesViewAllText: string;
  courses: LandingCourse[];

  // About Us + 2x2 Stats Section
  aboutTag: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutDetails: string;
  aboutBtnText: string;
  aboutImageUrl: string;
  stats: LandingStat[];

  // Recent Notices & Testimonials Section
  noticesSectionTitle: string;
  noticesViewAllText: string;
  notices: LandingNotice[];

  testimonialsSectionTitle: string;
  testimonialsViewAllText: string;
  testimonials: LandingTestimonial[];

  // Footer & Contact
  footerTagline: string;
  footerMotto: string;
  copyrightText: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  newsletterPlaceholder: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  facebookUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  telegramUrl: string;
}

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  schemaVersion: 2,
  loginBtnText: "লগইন / রেজিস্ট্রেশন",
  heroTagline: "স্বপ্ন দেখো  •  প্রস্তুতি নাও  •  সফল হও",
  heroTitleLine1: "বিজ্ঞান পণ্ডিত",
  heroTitleLine2: "একাডেমি",
  heroSubtitleHeading: "বিজ্ঞানভিত্তিক শিক্ষা, উজ্জ্বল ভবিষ্যৎ",
  heroDescription:
    "মাধ্যমিক ও উচ্চমাধ্যমিকের বিজ্ঞান বিভাগসহ সকল শিক্ষার্থীদের জন্য মানসম্মত ও আধুনিক পদ্ধতিতে প্রস্তুতিমূলক কোচিং ও অনলাইন লার্নিং প্ল্যাটফর্ম।",
  heroQuote: "“জ্ঞানই সফলতার চাবিকাঠি”",
  heroPrimaryBtnText: "কোর্সসমূহ দেখুন",
  heroSecondaryBtnText: "আমাদের সম্পর্কে",
  heroImageUrl: "",

  features: [
    {
      id: "feat-1",
      title: "বিশেষজ্ঞ শিক্ষক মণ্ডলী",
      description: "অভিজ্ঞ ও দক্ষ শিক্ষকদের দ্বারা পাঠদান",
      iconName: "graduation",
    },
    {
      id: "feat-2",
      title: "আধুনিক ও স্মার্ট ক্লাস",
      description: "অনলাইন + অফলাইন উভয় মাধ্যমেই ক্লাস",
      iconName: "monitor",
    },
    {
      id: "feat-3",
      title: "ব্যক্তিগত গাইডেন্স",
      description: "প্রতিটি শিক্ষার্থীর জন্য বিশেষ সহায়তা",
      iconName: "users",
    },
    {
      id: "feat-4",
      title: "নিয়মিত মূল্যায়ন",
      description: "মডেল টেস্ট ও পরীক্ষার প্রস্তুতি",
      iconName: "chart",
    },
    {
      id: "feat-5",
      title: "ডিজিটাল রিসোর্স",
      description: "নোট, সাজেশন, প্রশ্নব্যাংক ও ভিডিও লেকচার",
      iconName: "book",
    },
    {
      id: "feat-6",
      title: "নির্ভরযোগ্য প্রতিষ্ঠান",
      description: "সফলতার দিকনির্দেশনায় আমাদের অঙ্গীকার",
      iconName: "shield",
    },
  ],

  coursesSectionTag: "আমাদের কোর্সসমূহ",
  coursesSectionTitle: "বিষয়ভিত্তিক কোর্স প্রোগ্রাম",
  coursesViewAllText: "সব কোর্স দেখুন",
  courses: [
    {
      id: "crs-physics",
      title: "পদার্থবিজ্ঞান",
      subtitle: "ধারণা থেকে প্রয়োগ, পদার্থবিজ্ঞানে সফলতা",
      symbol: "atom",
      colorTheme: "blue",
      bullet1: "ক্লাস: ৪০+",
      bullet2: "মডেল টেস্ট: ২০+",
      bullet3: "বোর্ড/এডমিশন প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "৯ম-১০ম শ্রেণি, এসএসসি ও এইচএসসি",
      schedule: "সপ্তাহে ৩/৪ দিন ক্লাস • অধ্যায়ভিত্তিক মডেল টেস্ট",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "পদার্থবিজ্ঞানের প্রতিটি অধ্যায়ের মৌলিক ধারণা (Basic Concept), সূত্রের প্রমাণ, গাণিতিক সমস্যার সহজ সমাধান এবং বোর্ড ও ভর্তি পরীক্ষার সৃজনশীল/এমসিকিউ প্রস্তুতি।",
    },
    {
      id: "crs-chemistry",
      title: "রসায়ন",
      subtitle: "রাসায়নিক বিক্রিয়া ও তত্ত্বের সহজ সমাধান",
      symbol: "flask",
      colorTheme: "green",
      bullet1: "ক্লাস: ৪০+",
      bullet2: "মডেল টেস্ট: ২০+",
      bullet3: "বোর্ড/এডমিশন প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "৯ম-১০ম শ্রেণি, এসএসসি ও এইচএসসি",
      schedule: "সপ্তাহে ৩/৪ দিন ক্লাস • নিয়মিত ল্যাব ও তত্ত্ব বিশ্লেষণ",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "জৈব ও অজৈব রসায়ন, পর্যায় সারণি, রাসায়নিক বন্ধন ও বিক্রিয়ার কৌশল মুখস্থ না করে বুঝে শেখার বিশেষ পদ্ধতি এবং এক্সক্লুসিভ নোটবুক সুবিধা।",
    },
    {
      id: "crs-math",
      title: "গণিত",
      subtitle: "গাণিতিক যুক্তি ও সমস্যার সহজ সমাধান",
      symbol: "pi",
      colorTheme: "purple",
      bullet1: "ক্লাস: ৪৫+",
      bullet2: "মডেল টেস্ট: ২৫+",
      bullet3: "বোর্ড/এডমিশন প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "৬ষ্ঠ থেকে ১০ম শ্রেণি ও এসএসসি",
      schedule: "সপ্তাহে ৪ দিন ক্লাস • সাপ্তাহিক সলভ ক্লাস",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "বীজগণিত, জ্যামিতি, ত্রিকোণমিতি ও পরিমিতির ভীতি দূর করে শর্টকাট ও বিস্তারিত উভয় পদ্ধতিতে গাণিতিক সমস্যা সমাধানের দক্ষতা অর্জন।",
    },
    {
      id: "crs-biology",
      title: "জীববিজ্ঞান",
      subtitle: "জীবজগতের রহস্য ও আধুনিক জীববিজ্ঞান",
      symbol: "dna",
      colorTheme: "emerald",
      bullet1: "ক্লাস: ৩৫+",
      bullet2: "মডেল টেস্ট: ২০+",
      bullet3: "বোর্ড/এডমিশন প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "৯ম-১০ম শ্রেণি, এসএসসি ও মেডিকেল ফাউন্ডেশন",
      schedule: "সপ্তাহে ৩ দিন ক্লাস • চিত্রসহ অ্যানাটমি ও ফিজিওলজি",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "চিত্র ও ডায়াগ্রামের সাহায্যে উদ্ভিদবিজ্ঞান ও প্রাণিবিজ্ঞানের প্রতিটি টপিক সহজভাবে উপস্থাপন এবং বোর্ড ও মেডিকেল ভর্তি প্রস্তুতির পূর্ণাঙ্গ গাইডলাইন।",
    },
    {
      id: "crs-higher-math",
      title: "উচ্চতর গণিত",
      subtitle: "জটিল গাণিতিক সমস্যার সহজ সমাধান",
      symbol: "sigma",
      colorTheme: "orange",
      bullet1: "ক্লাস: ৪৫+",
      bullet2: "মডেল টেস্ট: ২৫+",
      bullet3: "বিশ্ববিদ্যালয় প্রস্তুতি",
      buttonText: "বিস্তারিত দেখুন",
      imageUrl: "",
      targetClass: "৯ম-১০ম শ্রেণি, এসএসসি ও এইচএসসি",
      schedule: "সপ্তাহে ৪ দিন ক্লাস • স্পেশাল প্রবলেম সলভিং সেশন",
      feeLabel: "ভর্তি ও কোর্স ফি: অফিসে যোগাযোগ করুন",
      description:
        "ক্যালকুলাস, ভেক্টর, স্থানাঙ্ক জ্যামিতি, সম্ভাবনা ও অসীম ধারার মতো জটিল অধ্যায়গুলো ধাপে ধাপে অনুশীলন এবং ইঞ্জিনিয়ারিং/বিশ্ববিদ্যালয় প্রস্তুতির মজবুত ভিত্তি।",
    },
  ],

  aboutTag: "আমাদের সম্পর্কে",
  aboutTitle: "বিজ্ঞান পণ্ডিত একাডেমি",
  aboutDescription:
    "আমরা বিশ্বাস করি, সঠিক দিকনির্দেশনা ও মানসম্পন্ন শিক্ষার মাধ্যমে প্রতিটি শিক্ষার্থী তার স্বপ্ন পূরণ করতে পারে। আমাদের একাডেমিতে অভিজ্ঞ শিক্ষকমণ্ডলী, আধুনিক প্রযুক্তি এবং নিয়মিত মূল্যায়নের মাধ্যমে শিক্ষার্থীদের সর্বোচ্চ প্রস্তুতি নিশ্চিত করা হয়।",
  aboutDetails:
    "বিজ্ঞান পণ্ডিত একাডেমিতে প্রতিটি শিক্ষার্থীর উপস্থিতি ডিজিটালভাবে ট্র্যাক করা হয় এবং অভিভাবকদের কাছে নিয়মিত এসএমএস ও অনলাইন পোর্টালের মাধ্যমে ফলাফল পৌঁছে দেওয়া হয়। আমাদের রয়েছে নিজস্ব ডিজিটাল প্রকাশনী, অধ্যায়ভিত্তিক লেকচার শিট, সাপ্তাহিক ও মাসিক মডেল টেস্ট এবং দুর্বল শিক্ষার্থীদের জন্য ওয়ান-টু-ওয়ান কেয়ার সেশন।",
  aboutBtnText: "আরও জানুন",
  aboutImageUrl: "",
  stats: [
    { id: "st-1", value: "৫,০০০+", label: "সন্তুষ্ট শিক্ষার্থী", iconName: "users" },
    { id: "st-2", value: "৫০+", label: "অভিজ্ঞ শিক্ষক", iconName: "graduation" },
    { id: "st-3", value: "২০+", label: "বিষয়ভিত্তিক কোর্স", iconName: "book" },
    { id: "st-4", value: "৯৮%", label: "সফলতার হার", iconName: "award" },
  ],

  noticesSectionTitle: "সাম্প্রতিক নোটিশ",
  noticesViewAllText: "সব নোটিশ দেখুন",
  notices: [
    {
      id: "nt-1",
      day: "২৫",
      month: "জুলাই",
      title: "HSC 2026 ব্যাচের নতুন ক্লাস রুটিন প্রকাশ",
      details:
        "এইচএসসি ২০২৬ শিক্ষাবর্ষের পদার্থবিজ্ঞান, রসায়ন, উচ্চতর গণিত ও জীববিজ্ঞান বিষয়ের নতুন সাপ্তাহিক ক্লাস রুটিন প্রকাশ করা হয়েছে। শিক্ষার্থীরা পোর্টালে লগইন করে রুটিন দেখতে পারবে।",
    },
    {
      id: "nt-2",
      day: "২০",
      month: "জুলাই",
      title: "ভর্তি পরীক্ষার প্রস্তুতি কোর্সের রেজিস্ট্রেশন শুরু হয়েছে",
      details:
        "নতুন শিক্ষাবর্ষের একাডেমিক ও ভর্তি পরীক্ষার প্রস্তুতি কোর্সের রেজিস্ট্রেশন শুরু হয়েছে। সীমিত আসনে ভর্তি নিশ্চিত করতে দ্রুত অফিসে যোগাযোগ করুন।",
    },
    {
      id: "nt-3",
      day: "১৬",
      month: "জুলাই",
      title: "মাসিক পরীক্ষার সময়সূচী প্রকাশ",
      details:
        "সকল চলমান ব্যাচের মাসিক মূল্যায়ন পরীক্ষার রুটিন ও সিলেবাস প্রকাশ করা হয়েছে। নির্ধারিত সময়ে সকল শিক্ষার্থীকে পরীক্ষায় অংশগ্রহণের নির্দেশ দেওয়া হলো।",
    },
  ],

  testimonialsSectionTitle: "শিক্ষার্থীদের মতামত",
  testimonialsViewAllText: "সব মতামত দেখুন",
  testimonials: [
    {
      id: "tm-1",
      studentName: "আব্দুল্লাহ খান",
      studentBatch: "HSC 2025, বিজ্ঞান বিভাগ",
      comment:
        "বিজ্ঞান পণ্ডিত একাডেমিতে পড়ে আমার পদার্থবিজ্ঞান ও রসায়নের প্রতি ভয় কেটে গেছে। শিক্ষকদের গাইডলাইন সত্যি অসাধারণ!",
      rating: 5,
      avatarUrl: "",
    },
    {
      id: "tm-2",
      studentName: "তাসনিম জাহান সারা",
      studentBatch: "SSC 2025, বিজ্ঞান বিভাগ",
      comment:
        "নিয়মিত মডেল টেস্ট, ডিজিটাল নোটবুক এবং প্রতিটি অধ্যায়ের বেসিক ক্লিয়ার ক্লাসের কারণে বোর্ড পরীক্ষায় আমার আত্মবিশ্বাস অনেক বেড়েছে।",
      rating: 5,
      avatarUrl: "",
    },
    {
      id: "tm-3",
      studentName: "মাহমুদুল হাসান রাহাত",
      studentBatch: "১০ম শ্রেণি, বিজ্ঞান বিভাগ",
      comment:
        "উচ্চতর গণিত ও পদার্থবিজ্ঞানের জটিল গাণিতিক সমস্যাগুলো স্যাররা এত সহজভাবে বুঝিয়ে দেন যা আগে কখনো পাইনি।",
      rating: 5,
      avatarUrl: "",
    },
  ],

  footerTagline: "জ্ঞান  |  চর্চা  |  সাফল্য",
  footerMotto: "শিক্ষায় জয়ে, জীবনে জয়ে",
  copyrightText: "© 2025 বিজ্ঞান পণ্ডিত একাডেমি. সর্বস্বত্ব সংরক্ষিত।",
  newsletterTitle: "নিউজলেটার",
  newsletterSubtitle: "নতুন কোর্স ও আপডেট পেতে সাবস্ক্রাইব করুন",
  newsletterPlaceholder: "আপনার ইমেইল লিখুন",
  contactAddress: "ঢাকা, বাংলাদেশ",
  contactPhone: "+880 1700-000000",
  contactEmail: "info@bigganpandit.com",
  facebookUrl: "",
  youtubeUrl: "",
  instagramUrl: "",
  telegramUrl: "",
};

export function parseLandingConfig(rawJson: string | null | undefined): LandingPageConfig {
  if (!rawJson || !rawJson.trim()) {
    return DEFAULT_LANDING_CONFIG;
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<LandingPageConfig>;
    // If stored config is from older schemaVersion, upgrade seamlessly to v2 defaults
    if (parsed.schemaVersion !== 2) {
      return DEFAULT_LANDING_CONFIG;
    }

    return {
      schemaVersion: 2,
      loginBtnText: parsed.loginBtnText ?? DEFAULT_LANDING_CONFIG.loginBtnText,
      heroTagline: parsed.heroTagline ?? DEFAULT_LANDING_CONFIG.heroTagline,
      heroTitleLine1: parsed.heroTitleLine1 ?? DEFAULT_LANDING_CONFIG.heroTitleLine1,
      heroTitleLine2: parsed.heroTitleLine2 ?? DEFAULT_LANDING_CONFIG.heroTitleLine2,
      heroSubtitleHeading:
        parsed.heroSubtitleHeading ?? DEFAULT_LANDING_CONFIG.heroSubtitleHeading,
      heroDescription: parsed.heroDescription ?? DEFAULT_LANDING_CONFIG.heroDescription,
      heroQuote: parsed.heroQuote ?? DEFAULT_LANDING_CONFIG.heroQuote,
      heroPrimaryBtnText:
        parsed.heroPrimaryBtnText ?? DEFAULT_LANDING_CONFIG.heroPrimaryBtnText,
      heroSecondaryBtnText:
        parsed.heroSecondaryBtnText ?? DEFAULT_LANDING_CONFIG.heroSecondaryBtnText,
      heroImageUrl: parsed.heroImageUrl ?? DEFAULT_LANDING_CONFIG.heroImageUrl,

      features:
        Array.isArray(parsed.features) && parsed.features.length > 0
          ? parsed.features
          : DEFAULT_LANDING_CONFIG.features,

      coursesSectionTag:
        parsed.coursesSectionTag ?? DEFAULT_LANDING_CONFIG.coursesSectionTag,
      coursesSectionTitle:
        parsed.coursesSectionTitle ?? DEFAULT_LANDING_CONFIG.coursesSectionTitle,
      coursesViewAllText:
        parsed.coursesViewAllText ?? DEFAULT_LANDING_CONFIG.coursesViewAllText,
      courses:
        Array.isArray(parsed.courses) && parsed.courses.length > 0
          ? parsed.courses
          : DEFAULT_LANDING_CONFIG.courses,

      aboutTag: parsed.aboutTag ?? DEFAULT_LANDING_CONFIG.aboutTag,
      aboutTitle: parsed.aboutTitle ?? DEFAULT_LANDING_CONFIG.aboutTitle,
      aboutDescription: parsed.aboutDescription ?? DEFAULT_LANDING_CONFIG.aboutDescription,
      aboutDetails: parsed.aboutDetails ?? DEFAULT_LANDING_CONFIG.aboutDetails,
      aboutBtnText: parsed.aboutBtnText ?? DEFAULT_LANDING_CONFIG.aboutBtnText,
      aboutImageUrl: parsed.aboutImageUrl ?? DEFAULT_LANDING_CONFIG.aboutImageUrl,
      stats:
        Array.isArray(parsed.stats) && parsed.stats.length > 0
          ? parsed.stats
          : DEFAULT_LANDING_CONFIG.stats,

      noticesSectionTitle:
        parsed.noticesSectionTitle ?? DEFAULT_LANDING_CONFIG.noticesSectionTitle,
      noticesViewAllText:
        parsed.noticesViewAllText ?? DEFAULT_LANDING_CONFIG.noticesViewAllText,
      notices:
        Array.isArray(parsed.notices) && parsed.notices.length > 0
          ? parsed.notices
          : DEFAULT_LANDING_CONFIG.notices,

      testimonialsSectionTitle:
        parsed.testimonialsSectionTitle ??
        DEFAULT_LANDING_CONFIG.testimonialsSectionTitle,
      testimonialsViewAllText:
        parsed.testimonialsViewAllText ?? DEFAULT_LANDING_CONFIG.testimonialsViewAllText,
      testimonials:
        Array.isArray(parsed.testimonials) && parsed.testimonials.length > 0
          ? parsed.testimonials
          : DEFAULT_LANDING_CONFIG.testimonials,

      footerTagline: parsed.footerTagline ?? DEFAULT_LANDING_CONFIG.footerTagline,
      footerMotto: parsed.footerMotto ?? DEFAULT_LANDING_CONFIG.footerMotto,
      copyrightText: parsed.copyrightText ?? DEFAULT_LANDING_CONFIG.copyrightText,
      newsletterTitle: parsed.newsletterTitle ?? DEFAULT_LANDING_CONFIG.newsletterTitle,
      newsletterSubtitle:
        parsed.newsletterSubtitle ?? DEFAULT_LANDING_CONFIG.newsletterSubtitle,
      newsletterPlaceholder:
        parsed.newsletterPlaceholder ?? DEFAULT_LANDING_CONFIG.newsletterPlaceholder,
      contactAddress: parsed.contactAddress ?? DEFAULT_LANDING_CONFIG.contactAddress,
      contactPhone: parsed.contactPhone ?? DEFAULT_LANDING_CONFIG.contactPhone,
      contactEmail: parsed.contactEmail ?? DEFAULT_LANDING_CONFIG.contactEmail,
      facebookUrl: parsed.facebookUrl ?? DEFAULT_LANDING_CONFIG.facebookUrl,
      youtubeUrl: parsed.youtubeUrl ?? DEFAULT_LANDING_CONFIG.youtubeUrl,
      instagramUrl: parsed.instagramUrl ?? DEFAULT_LANDING_CONFIG.instagramUrl,
      telegramUrl: parsed.telegramUrl ?? DEFAULT_LANDING_CONFIG.telegramUrl,
    };
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}
