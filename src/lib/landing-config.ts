// Public Landing Page configuration types & defaults for BigganPondit Academy.
// Stored as JSON in the `settings` table under `SETTING_LANDING_PAGE`.

export const SETTING_LANDING_PAGE = "landing_page_config";

export interface LandingStat {
  id: string;
  value: string;
  label: string;
}

export interface LandingCourse {
  id: string;
  title: string;
  badge: string;
  targetClass: string;
  subjects: string;
  schedule: string;
  feeLabel: string;
  description: string;
  highlight?: boolean;
}

export interface LandingFeature {
  id: string;
  title: string;
  badge: string;
  description: string;
  iconName: string; // "book" | "award" | "bell" | "users" | "shield" | "laptop" | "clock" | "check"
}

export interface LandingPageConfig {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  admissionBanner: string;
  coursesSectionTitle: string;
  coursesSectionSubtitle: string;
  featuresSectionTitle: string;
  featuresSectionSubtitle: string;
  stats: LandingStat[];
  courses: LandingCourse[];
  features: LandingFeature[];
  contactPhone: string;
  contactPhoneAlt: string;
  contactEmail: string;
  contactAddress: string;
  officeHours: string;
  facebookUrl: string;
}

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  heroBadge: "ভর্তি চলছে • একাডেমিক ও স্পেশাল ব্যাচ",
  heroTitle: "বিজ্ঞান ও গণিতের ভীতি দূর করে কাঙ্ক্ষিত সাফল্যের বিশ্বস্ত ঠিকানা",
  heroSubtitle:
    "ষষ্ঠ থেকে দশম শ্রেণি এবং এসএসসি পরীক্ষার্থীদের জন্য আধুনিক ও সম্পূর্ণ ডিজিটাল মনিটরিং সমৃদ্ধ কোচিং ও একাডেমিক কেয়ার। নিয়মিত পরীক্ষা, ডিজিটাল হাজিরা, অনলাইন মার্কশিট ও অভিজ্ঞ শিক্ষকমণ্ডলীর নিবিড় তত্ত্বাবধান।",
  admissionBanner:
    "নতুন শিক্ষাবর্ষে ৬ষ্ঠ থেকে ১০ম শ্রেণি এবং এসএসসি স্পেশাল মডেল টেস্ট ব্যাচে সীমিত আসনে ভর্তি চলছে! আজই যোগাযোগ করুন।",
  coursesSectionTitle: "আমাদের চলমান কোর্স ও ব্যাচসমূহ",
  coursesSectionSubtitle:
    "শিক্ষার্থীদের মেধা ও শ্রেণি অনুযায়ী বিশেষভাবে সাজানো আমাদের একাডেমিক কোর্সগুলো দেখে নিন",
  featuresSectionTitle: "আমাদের বিশেষ বৈশিষ্ট্য ও ডিজিটাল সুবিধাসমূহ",
  featuresSectionSubtitle:
    "পড়াশোনার পাশাপাশি আধুনিক প্রযুক্তির সাহায্যে প্রতিটি শিক্ষার্থীর শতভাগ অগ্রগতি নিশ্চিত করা হয়",
  stats: [
    { id: "st-1", value: "৬ষ্ঠ–১০ম", label: "শ্রেণির পূর্ণাঙ্গ একাডেমিক ব্যাচ" },
    { id: "st-2", value: "১০০%", label: "ডিজিটাল হাজিরা ও রেজাল্ট ট্র্যাকিং" },
    { id: "st-3", value: "সাপ্তাহিক", label: "অধ্যায়ভিত্তিক ও মাসিক মডেল টেস্ট" },
    { id: "st-4", value: "২৪/৭", label: "অনলাইন স্টুডেন্ট ও অভিভাবক পোর্টাল" },
  ],
  courses: [
    {
      id: "crs-1",
      title: "নবম ও দশম শ্রেণি — বিজ্ঞান বিভাগ (পূর্ণাঙ্গ কোর্স)",
      badge: "সবচেয়ে জনপ্রিয়",
      targetClass: "৯ম ও ১০ম শ্রেণি (বিজ্ঞান)",
      subjects: "পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, উচ্চতর গণিত ও সাধারণ গণিত",
      schedule: "সপ্তাহে ৬ দিন ক্লাস • সাপ্তাহিক ও মাসিক পরীক্ষা",
      feeLabel: "ভর্তি ও মাসিক বেতন: অফিসে যোগাযোগ করুন",
      description:
        "এসএসসি বোর্ড পরীক্ষার সিলেবাস অনুযায়ী প্রতিটি অধ্যায়ের বেসিক ক্লিয়ার, সৃজনশীল ও এমসিকিউ অনুশীলন এবং এক্সক্লুসিভ লেকচার শিট প্রদান।",
      highlight: true,
    },
    {
      id: "crs-2",
      title: "এসএসসি (SSC) ফাইনাল মডেল টেস্ট ও রিভিশন ব্যাচ",
      badge: "এসএসসি স্পেশাল",
      targetClass: "এসএসসি পরীক্ষার্থী",
      subjects: "বিজ্ঞান বিভাগের সকল আবশ্যিক ও নৈর্বাচনিক বিষয়",
      schedule: "নিয়মিত অধ্যায়ভিত্তিক ও পূর্ণাঙ্গ বোর্ড স্ট্যান্ডার্ড মডেল টেস্ট",
      feeLabel: "স্পেশাল প্যাকেজ ফি",
      description:
        "বোর্ড পরীক্ষার পূর্বে সম্পূর্ণ সিলেবাস রিভিশন, বিগত বছরের প্রশ্ন বিশ্লেষণ, উত্তরপত্র মূল্যায়ন ও মেধা তালিকা প্রকাশ।",
      highlight: false,
    },
    {
      id: "crs-3",
      title: "অষ্টম শ্রেণি — জুনিয়র সায়েন্স ও গণিত ফাউন্ডেশন",
      badge: "ফাউন্ডেশন ব্যাচ",
      targetClass: "৮ম শ্রেণি",
      subjects: "বিজ্ঞান, গণিত, ইংরেজি ও আইসিটি",
      schedule: "সপ্তাহে ৫/৬ দিন ক্লাস • নিয়মিত ক্লাস টেস্ট",
      feeLabel: "মাসিক বেতন: সুলভ মূল্যে",
      description:
        "নবম শ্রেণিতে বিজ্ঞান বিভাগে পড়ার মজবুত ভিত্তি তৈরি করতে গণিত ও বিজ্ঞানের প্রতিটি টপিক হাতে-কলমে সহজবোধ্য উপায়ে পাঠদান।",
      highlight: false,
    },
    {
      id: "crs-4",
      title: "ষষ্ঠ ও সপ্তম শ্রেণি — বেসিক বিল্ডিং একাডেমিক কেয়ার",
      badge: "জুনিয়র ব্যাচ",
      targetClass: "৬ষ্ঠ ও ৭ম শ্রেণি",
      subjects: "গণিত, বিজ্ঞান ও ইংরেজি গ্রামার",
      schedule: "সপ্তাহে ৫ দিন ক্লাস • ডেইলি ওয়ার্কশিট ও মূল্যায়ন",
      feeLabel: "মাসিক বেতন: সুলভ মূল্যে",
      description:
        "ছোটবেলা থেকেই গণিত ও বিজ্ঞানের ভীতি দূর করে আনন্দের সাথে শেখা এবং স্কুলের পরীক্ষায় শীর্ষ ফলাফল নিশ্চিত করার বিশেষ যত্ন।",
      highlight: false,
    },
    {
      id: "crs-5",
      title: "নবম ও দশম শ্রেণি — মানবিক ও সাধারণ গণিত/ইংরেজি ব্যাচ",
      badge: "জেনারেল ব্যাচ",
      targetClass: "৯ম ও ১০ম শ্রেণি",
      subjects: "সাধারণ গণিত, সাধারণ বিজ্ঞান, ইংরেজি ও আবশ্যিক বিষয়",
      schedule: "সপ্তাহে ৫ দিন ক্লাস • নিয়মিত মডেল টেস্ট",
      feeLabel: "ভর্তি চলছে",
      description:
        "গণিত, ইংরেজি ও সাধারণ বিজ্ঞানে দুর্বল শিক্ষার্থীদের জন্য আলাদা যত্ন এবং অতিরিক্ত সলভ ক্লাসের বিশেষ ব্যবস্থা।",
      highlight: false,
    },
    {
      id: "crs-6",
      title: "বিজ্ঞান পণ্ডিত প্রকাশনী — এক্সক্লুসিভ নোটবুক ও লেকচার শিট",
      badge: "ডিজিটাল লাইব্রেরি",
      targetClass: "৬ষ্ঠ থেকে ১০ম শ্রেণি",
      subjects: "সকল বিষয়ের অধ্যায়ভিত্তিক হ্যান্ডনোট ও সাজেশন",
      schedule: "অনলাইন রিড-অনলি অ্যাক্সেস ও প্রিন্টেড শিট",
      feeLabel: "ভর্তিকৃত শিক্ষার্থীদের জন্য বিশেষ সুবিধা",
      description:
        "আমাদের নিজস্ব প্রকাশনীর তৈরি সহজবোধ্য নোটবুক, সূত্রাবলী ও বোর্ড স্ট্যান্ডার্ড প্রশ্ন ব্যাংক যা অ্যাপ ও ওয়েবসাইটে যেকোনো সময় পড়া যায়।",
      highlight: false,
    },
  ],
  features: [
    {
      id: "feat-1",
      title: "ডিজিটাল হাজিরা ও অভিভাবকের ফোনে SMS অ্যালার্ট",
      badge: "স্মার্ট ট্র্যাকিং",
      description:
        "প্রতিদিন ক্লাসে উপস্থিতি বা অনুপস্থিতির তথ্য ডিজিটাল হাজিরা শিটে সংরক্ষণ এবং সরাসরি অভিভাবকের মোবাইলে SMS বার্তার মাধ্যমে অবহিতকরণ।",
      iconName: "bell",
    },
    {
      id: "feat-2",
      title: "অনলাইন মার্কশিট, রেজাল্ট কার্ড ও মেধা তালিকা",
      badge: "তাৎক্ষণিক ফলাফল",
      description:
        "ক্লাস টেস্ট, মাসিক ও বার্ষিক পরীক্ষার নম্বর অনলাইনে প্রকাশ। শিক্ষার্থীরা নিজেদের আইডি দিয়ে লগইন করে পূর্ণাঙ্গ গ্রেড শিট ও মেরিট পজিশন দেখতে পারে।",
      iconName: "award",
    },
    {
      id: "feat-3",
      title: "অভিজ্ঞ ও যত্নশীল শিক্ষক মণ্ডলী",
      badge: "সেরা পাঠদান",
      description:
        "প্রতিটি বিষয়ের জন্য রয়েছেন অভিজ্ঞ ও দক্ষ শিক্ষক, যাঁরা মুখস্থবিদ্যার পরিবর্তে বিষয়বস্তু বুঝে পড়ার ওপর সর্বোচ্চ গুরুত্ব দেন।",
      iconName: "users",
    },
    {
      id: "feat-4",
      title: "ডিজিটাল প্রকাশনী ও অনলাইন লেকচার শিট",
      badge: "ই-লাইব্রেরি",
      description:
        "বিজ্ঞান পণ্ডিত প্রকাশনীর বিশেষ নোটবুক ও লেকচার শিট শিক্ষার্থীরা যেকোনো সময় আমাদের ওয়েবসাইট বা অ্যাপে লগইন করে পড়তে পারে।",
      iconName: "book",
    },
    {
      id: "feat-5",
      title: "ডেইলি ক্লাস রুটিন ও পুশ নোটিফিকেশন রিমাইন্ডার",
      badge: "অটো রিমাইন্ডার",
      description:
        "ক্লাস শুরু হওয়ার ১০ মিনিট আগে এবং ক্লাস শুরুর সময় স্বয়ংক্রিয়ভাবে মোবাইলে নোটিফিকেশন ও রুটিন অ্যালার্ট পৌঁছে যায়।",
      iconName: "clock",
    },
    {
      id: "feat-6",
      title: "স্বচ্ছ ফি পরিশোধ ও ডিজিটাল মানি রিসিপ্ট",
      badge: "ডিজিটাল হিসাব",
      description:
        "মাসিক বেতন ও পরীক্ষার ফি পরিশোধের সম্পূর্ণ ইতিহাস, বকেয়া হিসাব এবং অনলাইন পেমেন্ট রশিদ পোর্টাল থেকেই দেখা ও ডাউনলোড করা যায়।",
      iconName: "shield",
    },
  ],
  contactPhone: "01700-000000",
  contactPhoneAlt: "",
  contactEmail: "info@bigganpondit.com",
  contactAddress: "বিজ্ঞান পণ্ডিত একাডেমি ক্যাম্পাস, মেইন রোড, বাংলাদেশ",
  officeHours: "শনিবার – বৃহস্পতিবার (সকাল ৮:০০টা – রাত ৮:০০টা)",
  facebookUrl: "",
};

export function parseLandingConfig(rawJson: string | null | undefined): LandingPageConfig {
  if (!rawJson || !rawJson.trim()) {
    return DEFAULT_LANDING_CONFIG;
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<LandingPageConfig>;
    return {
      heroBadge: parsed.heroBadge ?? DEFAULT_LANDING_CONFIG.heroBadge,
      heroTitle: parsed.heroTitle ?? DEFAULT_LANDING_CONFIG.heroTitle,
      heroSubtitle: parsed.heroSubtitle ?? DEFAULT_LANDING_CONFIG.heroSubtitle,
      admissionBanner: parsed.admissionBanner ?? DEFAULT_LANDING_CONFIG.admissionBanner,
      coursesSectionTitle: parsed.coursesSectionTitle ?? DEFAULT_LANDING_CONFIG.coursesSectionTitle,
      coursesSectionSubtitle:
        parsed.coursesSectionSubtitle ?? DEFAULT_LANDING_CONFIG.coursesSectionSubtitle,
      featuresSectionTitle:
        parsed.featuresSectionTitle ?? DEFAULT_LANDING_CONFIG.featuresSectionTitle,
      featuresSectionSubtitle:
        parsed.featuresSectionSubtitle ?? DEFAULT_LANDING_CONFIG.featuresSectionSubtitle,
      stats: Array.isArray(parsed.stats) ? parsed.stats : DEFAULT_LANDING_CONFIG.stats,
      courses: Array.isArray(parsed.courses) ? parsed.courses : DEFAULT_LANDING_CONFIG.courses,
      features: Array.isArray(parsed.features) ? parsed.features : DEFAULT_LANDING_CONFIG.features,
      contactPhone: parsed.contactPhone ?? DEFAULT_LANDING_CONFIG.contactPhone,
      contactPhoneAlt: parsed.contactPhoneAlt ?? DEFAULT_LANDING_CONFIG.contactPhoneAlt,
      contactEmail: parsed.contactEmail ?? DEFAULT_LANDING_CONFIG.contactEmail,
      contactAddress: parsed.contactAddress ?? DEFAULT_LANDING_CONFIG.contactAddress,
      officeHours: parsed.officeHours ?? DEFAULT_LANDING_CONFIG.officeHours,
      facebookUrl: parsed.facebookUrl ?? DEFAULT_LANDING_CONFIG.facebookUrl,
    };
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}
