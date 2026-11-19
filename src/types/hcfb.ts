export type Language = 'bn' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface CompetitionCategory {
  id: number;
  competition_id: number;
  name_bn: string;
  name_en: string;
  age_or_class_range: string;
  max_score: number;
  participant_count?: number;
}

export interface ScoringCriterion {
  id: number;
  competition_id: number;
  name_bn: string;
  name_en: string;
  weight_percent: number;
  max_points: number;
}

export interface Competition {
  id: number;
  slug: string;
  title_bn: string;
  title_en: string;
  description_bn: string;
  description_en: string;
  banner_url: string;
  registration_open_date: string;
  registration_deadline: string;
  competition_date: string;
  eligibility_bn: string;
  eligibility_en: string;
  rules_bn: string;
  rules_en: string;
  status: 'draft' | 'published' | 'closed';
  is_featured: number;
  results_published: number;
  is_sample: number;
  participant_count?: number;
  categories?: CompetitionCategory[];
}

export interface Notice {
  id: number;
  title_bn: string;
  title_en: string;
  summary_bn: string;
  summary_en: string;
  content_bn: string;
  content_en: string;
  attachment_url: string;
  attachment_name: string;
  is_important: number;
  published_at: string;
  is_published: number;
  is_sample: number;
}

export interface GalleryItem {
  id: number;
  title_bn: string;
  title_en: string;
  description_bn: string;
  description_en: string;
  category:
    | 'Handwriting Competition'
    | 'Calligraphy'
    | 'Workshops & Training'
    | 'Award Ceremonies'
    | 'Educational Activities'
    | 'Other Events';
  image_url: string;
  event_name: string;
  is_featured_artwork: number;
  is_sample: number;
  created_at: string;
}

export interface HubResource {
  id: number;
  type: 'article' | 'practice_sheet' | 'calligraphy_guide' | 'artwork_of_month' | 'student_showcase';
  title_bn: string;
  title_en: string;
  summary_bn: string;
  summary_en: string;
  content_bn: string;
  content_en: string;
  author_or_artist: string;
  image_url: string;
  download_template_key: string;
  is_sample: number;
  published_at: string;
}

export interface TeamMember {
  id: number;
  name_bn: string;
  name_en: string;
  designation_bn: string;
  designation_en: string;
  bio_bn: string;
  bio_en: string;
  photo_url: string;
  social_link: string;
  display_order: number;
  is_placeholder: number;
}

export interface Testimonial {
  id: number;
  author_name_bn: string;
  author_name_en: string;
  role_bn: string;
  role_en: string;
  organization: string;
  quote_bn: string;
  quote_en: string;
  is_verified: number;
  is_sample: number;
}

export interface WinnerRecord {
  registration_id: string;
  name_bn: string;
  name_en: string;
  school_name: string;
  district: string;
  award_tier: string;
  rank_position: number | null;
  is_sample: number;
  competition_title_bn: string;
  competition_title_en: string;
  category_name_bn: string;
  category_name_en: string;
}

export interface HeroSettings {
  badge_bn: string;
  badge_en: string;
  headline_bn: string;
  headline_en: string;
  subheadline_bn: string;
  subheadline_en: string;
  description_bn: string;
  description_en: string;
  cta1_text_bn: string;
  cta1_text_en: string;
  cta1_url: string;
  cta2_text_bn: string;
  cta2_text_en: string;
  cta2_url: string;
  hero_bg_image_url: string;
  featured_competition_id: number;
  phone_title_bn: string;
  phone_title_en: string;
  phone_thumbnail_url: string;
  phone_offer_bn: string;
  phone_offer_en: string;
  phone_fee: string;
  phone_previous_fee: string;
  phone_discount: string;
  phone_rating: string;
  phone_review_count: string;
  phone_video_url: string;
  show_badge: boolean;
  show_phone_mockup: boolean;
  show_video_preview: boolean;
  show_enrollments: boolean;
  show_cta2: boolean;
}

export interface FooterLinkItem {
  label_bn: string;
  label_en: string;
  url: string;
  enabled: boolean;
}

export interface FooterPaymentMethod {
  id: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin' | 'islami_bank';
  name: string;
  enabled: boolean;
}

export interface FooterSettings {
  tagline_bn: string;
  tagline_en: string;
  intro_bn: string;
  intro_en: string;
  registration_number: string;
  google_maps_url: string;
  youtube_url: string;
  instagram_url: string;
  verified_credentials_bn: string;
  verified_credentials_en: string;
  important_links: FooterLinkItem[];
  payment_methods: FooterPaymentMethod[];
  payment_number: string;
  payment_account_type: string;
  payment_instructions_bn: string;
  payment_instructions_en: string;
}

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  badge_bn: 'জাতীয় হাতের লেখা ও ক্যালিগ্রাফি চর্চা প্ল্যাটফর্ম',
  badge_en: 'National Handwriting & Calligraphy Platform',
  headline_bn: 'সুন্দর হাতের লেখা ও ক্যালিগ্রাফির শিল্প চর্চায় উৎকর্ষ অর্জন করুন',
  headline_en: 'Master the Art of Beautiful Handwriting',
  subheadline_bn: 'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ (HCFB)',
  subheadline_en: 'Handwriting & Calligraphy Foundation of Bangladesh (HCFB)',
  description_bn:
    'শিক্ষার্থী, শিক্ষক ও শিল্পপ্রেমীদের মাঝে সুন্দর হাতের লেখা, ক্যালিগ্রাফি এবং নান্দনিক বর্ণশিল্পের চর্চা ছড়িয়ে দিতে আমরা কাজ করছি সারাদেশে।',
  description_en:
    'A non-profit educational foundation dedicated to nurturing beautiful handwriting, disciplined calligraphy, and creative learning across Bangladesh.',
  cta1_text_bn: 'এখনই এনরোল করুন',
  cta1_text_en: 'Register Now',
  cta1_url: '/register',
  cta2_text_bn: 'অনুশীলন ও হাব দেখুন',
  cta2_text_en: 'Explore Practice Hub',
  cta2_url: '/hub',
  hero_bg_image_url: '/src/assets/images/hero_calligraphy_desk_1795055013122.jpg',
  featured_competition_id: 0,
  phone_title_bn: '',
  phone_title_en: '',
  phone_thumbnail_url: '',
  phone_offer_bn: 'নিবন্ধন চলছে',
  phone_offer_en: 'Registration Open',
  phone_fee: '',
  phone_previous_fee: '',
  phone_discount: '',
  phone_rating: '',
  phone_review_count: '',
  phone_video_url: '',
  show_badge: true,
  show_phone_mockup: true,
  show_video_preview: true,
  show_enrollments: true,
  show_cta2: true,
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  tagline_bn: 'সুন্দর হাতের লেখা ও ক্যালিগ্রাফি চর্চায় অলাভজনক জাতীয় শিক্ষামূলক ফাউন্ডেশন',
  tagline_en: 'Non-Profit National Educational Foundation for Handwriting & Calligraphy',
  intro_bn:
    'বাংলাদেশের শিক্ষার্থী, শিক্ষক ও শিল্পানুরাগীদের মাঝে পরিচ্ছন্ন হস্তলিপি, ঐতিহ্যবাহী ক্যালিগ্রাফি এবং সৃজনশীল দক্ষতা বিকাশে নিবেদিত একটি অলাভজনক শিক্ষামূলক ফাউন্ডেশন।',
  intro_en:
    'A non-profit educational foundation dedicated to nurturing neat handwriting, traditional calligraphy, and creative learning across Bangladesh.',
  registration_number: '',
  google_maps_url: '',
  youtube_url: '',
  instagram_url: '',
  verified_credentials_bn: '',
  verified_credentials_en: '',
  important_links: [
    { label_bn: 'আমাদের সম্পর্কে', label_en: 'About Foundation', url: '/about', enabled: true },
    { label_bn: 'প্রতিযোগিতা ও ইভেন্ট', label_en: 'Competitions & Events', url: '/competitions', enabled: true },
    { label_bn: 'অনলাইন রেজিস্ট্রেশন', label_en: 'Online Registration', url: '/register', enabled: true },
    { label_bn: 'শিক্ষার্থী ও অংশগ্রহণকারী পোর্টাল', label_en: 'Student Portal', url: '/portal', enabled: true },
    { label_bn: 'বিচারক ও শিক্ষক পোর্টাল', label_en: 'Teacher / Judge Portal', url: '/judge', enabled: true },
    { label_bn: 'লার্নিং ও সৃজনশীলতা হাব', label_en: 'Learning & Creativity Hub', url: '/hub', enabled: true },
    { label_bn: 'গ্যালারি ও শিল্পকর্ম', label_en: 'Art Gallery', url: '/gallery', enabled: true },
    { label_bn: 'নোটিশ বোর্ড', label_en: 'Notice Board', url: '/notices', enabled: true },
    { label_bn: 'সনদ যাচাই (QR)', label_en: 'Verify Certificate', url: '/verify', enabled: true },
    { label_bn: 'যোগাযোগ ও হেল্পলাইন', label_en: 'Contact & Helpline', url: '/contact', enabled: true },
  ],
  payment_methods: [
    { id: 'bkash', name: 'bKash', enabled: false },
    { id: 'nagad', name: 'Nagad', enabled: false },
    { id: 'rocket', name: 'Rocket', enabled: false },
    { id: 'upay', name: 'Upay', enabled: false },
    { id: 'cellfin', name: 'CellFin', enabled: false },
    { id: 'islami_bank', name: 'Islami Bank', enabled: false },
  ],
  payment_number: '',
  payment_account_type: '',
  payment_instructions_bn: '',
  payment_instructions_en: '',
};

export interface SiteSettings {
  site_identity: {
    org_name_bn: string;
    org_name_en: string;
    short_name: string;
    logo_url: string;
    primary_mobile: string;
    secondary_mobile: string;
    whatsapp_number: string;
    email: string;
    address_bn: string;
    address_en: string;
    facebook_url: string;
    facebook_page_configured: boolean;
  };
  homepage_content: {
    hero_headline_bn: string;
    hero_headline_en: string;
    hero_subtext_bn: string;
    hero_subtext_en: string;
    about_title_bn: string;
    about_title_en: string;
    about_summary_bn: string;
    about_summary_en: string;
    about_full_bn: string;
    about_full_en: string;
    cta_headline_bn: string;
    cta_headline_en: string;
    cta_subtext_bn: string;
    cta_subtext_en: string;
  };
  hero_settings?: HeroSettings;
  footer_settings?: FooterSettings;
  registration_field_config: {
    school_name: boolean;
    class_level: boolean;
    email: boolean;
    alt_mobile: boolean;
    upazila: boolean;
    additional_info: boolean;
  };
  annual_timeline: Array<{
    phase_bn: string;
    phase_en: string;
    title_bn: string;
    title_en: string;
    desc_bn: string;
    desc_en: string;
  }>;
}

export interface BootstrapData {
  settings: SiteSettings;
  stats: {
    total_registrations: number;
    sample_registrations: number;
    active_competitions: number;
    districts_represented: number;
    published_resources: number;
    published_notices: number;
  };
  competitions: Competition[];
  notices: Notice[];
  gallery: GalleryItem[];
  team: TeamMember[];
  testimonials: Testimonial[];
  hub: HubResource[];
  winners: WinnerRecord[];
}

export const BANGLADESH_DISTRICTS: string[] = [
  'Bagerhat', 'Bandarban', 'Barguna', 'Barishal', 'Bhola', 'Bogura', 'Brahmanbaria', 'Chandpur',
  'Chapainawabganj', 'Chattogram', 'Chuadanga', 'Comilla', "Cox's Bazar", 'Dhaka', 'Dinajpur',
  'Faridpur', 'Feni', 'Gaibandha', 'Gazipur', 'Gopalganj', 'Habiganj', 'Jamalpur', 'Jashore',
  'Jhalokati', 'Jhenaidah', 'Joypurhat', 'Khagrachari', 'Khulna', 'Kishoreganj', 'Kurigram',
  'Kushtia', 'Lakshmipur', 'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj', 'Meherpur',
  'Moulvibazar', 'Munshiganj', 'Mymensingh', 'Naogaon', 'Narail', 'Narayanganj', 'Narsingdi',
  'Natore', 'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna', 'Panchagarh', 'Patuakhali',
  'Pirojpur', 'Rajbari', 'Rajshahi', 'Rangamati', 'Rangpur', 'Satkhira', 'Shariatpur',
  'Sherpur', 'Sirajganj', 'Sunamganj', 'Sylhet', 'Tangail', 'Thakurgaon',
];

export const AWARD_LABELS: Record<string, { bn: string; en: string }> = {
  '1st_place': { bn: 'প্রথম স্থান', en: '1st Place' },
  '2nd_place': { bn: 'দ্বিতীয় স্থান', en: '2nd Place' },
  '3rd_place': { bn: 'তৃতীয় স্থান', en: '3rd Place' },
  honorable_mention: { bn: 'সম্মাননা পুরস্কার', en: 'Honorable Mention' },
  merit: { bn: 'মেধা ও অংশগ্রহণ সনদ', en: 'Merit & Participation' },
  none: { bn: 'অংশগ্রহণকারী', en: 'Participant' },
};
