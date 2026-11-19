import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  PenTool,
  Feather,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calendar,
  X,
  ExternalLink,
  Share2,
  Compass,
  Layers,
  Trophy,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';
import { HeroSection } from '../components/HeroSection';
import { AWARD_LABELS, type GalleryItem } from '../types/hcfb';

function useCountdown(targetDateStr?: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr + 'T23:59:59').getTime();
    const diff = target - now;
    if (Number.isNaN(target) || diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { expired: false, days, hours, minutes, seconds };
  }, [targetDateStr, now]);
}

export function HomePage() {
  const { t, bootstrap, loading, navigate } = useApp();
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const settings = bootstrap?.settings;
  const hc = settings?.homepage_content;
  const identity = settings?.site_identity;
  const stats = bootstrap?.stats;
  const competitions = bootstrap?.competitions || [];
  const featuredComp = competitions.find((c) => c.is_featured === 1) || competitions[0];
  const upcomingComp = competitions.find((c) => c.status === 'published');
  const countdown = useCountdown(upcomingComp?.registration_deadline);
  const notices = bootstrap?.notices || [];
  const gallery = bootstrap?.gallery || [];
  const winners = bootstrap?.winners || [];
  const testimonials = bootstrap?.testimonials || [];
  const timeline = settings?.annual_timeline || [];
  const featuredArtworks = gallery.filter((g) => g.is_featured_artwork === 1);

  const programs = [
    {
      icon: PenTool,
      cardBg: 'bg-[#F5F3FF]',
      borderColor: 'border-[#DDD6FE]',
      iconBg: 'bg-[#7C3AED] text-white',
      accentText: 'text-[#6D28D9]',
      titleBn: 'বাংলা হাতের লেখা',
      titleEn: 'Bangla Handwriting',
      descBn: 'স্বরবর্ণ, ব্যঞ্জনবর্ণ, সঠিক মাত্রা ও পরিচ্ছন্ন বাংলা হস্তলিপি চর্চার অনুশীলন শিট ও দিকনির্দেশনা।',
      descEn: 'Structured Bangla letterforms, matra proportions, and neat penmanship practice guides.',
      to: '/hub',
    },
    {
      icon: BookOpen,
      cardBg: 'bg-[#EFF6FF]',
      borderColor: 'border-[#BFDBFE]',
      iconBg: 'bg-[#2563EB] text-white',
      accentText: 'text-[#1D4ED8]',
      titleBn: 'ইংরেজি হাতের লেখা',
      titleEn: 'English Handwriting',
      descBn: 'ইংরেজি প্রিন্ট ও কার্সিভ লেখার ছন্দ, সমান উচ্চতা ও দ্রুত সুন্দর লেখার অনুশীলন কার্যক্রম।',
      descEn: 'English print and cursive rhythm, baseline balance, and legible writing practice.',
      to: '/hub',
    },
    {
      icon: Compass,
      cardBg: 'bg-[#ECFDF5]',
      borderColor: 'border-[#A7F3D0]',
      iconBg: 'bg-[#059669] text-white',
      accentText: 'text-[#047857]',
      titleBn: 'আরবি হাতের লেখা',
      titleEn: 'Arabic Handwriting',
      descBn: 'ঐতিহ্যবাহী নসখ ও রুকআহ শৈলীতে আরবি হরফের সঠিক গঠন ও সুন্দর হস্তলিপি শিক্ষা।',
      descEn: 'Foundational Arabic script proportions, stroke order, and disciplined hand practice.',
      to: '/hub',
    },
    {
      icon: Feather,
      cardBg: 'bg-[#FDF2F8]',
      borderColor: 'border-[#FBCFE8]',
      iconBg: 'bg-[#EC4899] text-white',
      accentText: 'text-[#DB2777]',
      titleBn: 'ক্যালিগ্রাফি চর্চা',
      titleEn: 'Calligraphy',
      descBn: 'বাঁশের কলম, ব্রাশ ও কালি ব্যবহার করে বাংলা, আরবি ও আধুনিক ক্যালিগ্রাফি শিল্পের সৃজনশীল বিকাশ।',
      descEn: 'Creative mastery of bamboo qalam, brush lettering, and expressive calligraphic art.',
      to: '/gallery',
    },
    {
      icon: GraduationCap,
      cardBg: 'bg-[#FFF7ED]',
      borderColor: 'border-[#FED7AA]',
      iconBg: 'bg-[#EA580C] text-white',
      accentText: 'text-[#C2410C]',
      titleBn: 'হাতের লেখা প্রশিক্ষণ',
      titleEn: 'Handwriting Training',
      descBn: 'শিক্ষার্থী ও বিদ্যালয়ের শিক্ষকদের জন্য বসার ভঙ্গি, কলম ধরা ও শ্রেণিকক্ষ প্রশিক্ষণ কর্মশালা।',
      descEn: 'Posture clinics, pen-grip coaching, and educator workshops for classroom instruction.',
      to: '/about',
    },
    {
      icon: Trophy,
      cardBg: 'bg-[#FEF9EE]',
      borderColor: 'border-[#FDE68A]',
      iconBg: 'bg-[#5B21B6] text-white',
      accentText: 'text-[#5B21B6]',
      titleBn: 'প্রতিযোগিতা ও ইভেন্ট',
      titleEn: 'Competitions & Events',
      descBn: 'সারাদেশের শিক্ষার্থীদের অংশগ্রহণে জাতীয় হাতের লেখা ও ক্যালিগ্রাফি প্রতিযোগিতা এবং সনদ প্রদান।',
      descEn: 'Nationwide handwriting and calligraphy contests, jury evaluations, and QR certificates.',
      to: '/competitions',
    },
  ];

  const reasons = [
    {
      num: '01',
      titleBn: 'মানসম্মত হাতের লেখা শিক্ষা',
      titleEn: 'Quality Handwriting Education',
      descBn: 'শিশু-কিশোর থেকে শুরু করে সকল বয়সের শিক্ষার্থীদের জন্য বৈজ্ঞানিক ও সহজবোধ্য হস্তলিপি অনুশীলন পদ্ধতি।',
      descEn: 'Clear, structured penmanship guidance crafted for learners across school and college tiers.',
      cardBg: 'bg-[#F5F3FF]',
      badgeBg: 'bg-[#7C3AED] text-white',
      icon: CheckCircle2,
    },
    {
      num: '02',
      titleBn: 'দক্ষ প্রশিক্ষণ ও দিকনির্দেশনা',
      titleEn: 'Professional Training & Guidance',
      descBn: 'অভিজ্ঞ প্রশিক্ষক ও ক্যালিগ্রাফি শিল্পীদের তত্ত্বাবধানে হাতে-কলমে কর্মশালা ও শিক্ষক ওরিয়েন্টেশন।',
      descEn: 'Practical workshops and teacher orientations led by dedicated penmanship mentors.',
      cardBg: 'bg-[#EFF6FF]',
      badgeBg: 'bg-[#2563EB] text-white',
      icon: GraduationCap,
    },
    {
      num: '03',
      titleBn: 'সৃজনশীলতা ও শিল্পবোধ বিকাশ',
      titleEn: 'Creativity & Artistic Development',
      descBn: 'নান্দনিক বর্ণশিল্প, ক্যালিগ্রাফি ও পরিচ্ছন্ন উপস্থাপনার মাধ্যমে শিক্ষার্থীদের সৃজনশীল মনন গঠন।',
      descEn: 'Encouraging patience, aesthetic sensitivity, and expressive lettering beyond rote writing.',
      cardBg: 'bg-[#FDF2F8]',
      badgeBg: 'bg-[#EC4899] text-white',
      icon: Sparkles,
    },
    {
      num: '04',
      titleBn: 'জাতীয় পর্যায়ের কার্যক্রম ও প্রতিযোগিতা',
      titleEn: 'National-Level Activities & Competitions',
      descBn: 'বাংলাদেশের ৬৪ জেলা থেকে স্বচ্ছ অনলাইন নিবন্ধন, নিরপেক্ষ বিচার ও কিউআর-যাচাইকৃত সনদপত্র।',
      descEn: 'Accessible nationwide registration, rubric-based jury review, and QR-verified awards.',
      cardBg: 'bg-[#ECFDF5]',
      badgeBg: 'bg-[#059669] text-white',
      icon: Layers,
    },
  ];

  return (
    <div>
      {/* 1. PREMIUM DARK EMERALD HERO SECTION */}
      <HeroSection />

      {/* 2. FOUNDATION AT A GLANCE & LIVE DEADLINE COUNTDOWN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12 relative z-10">
        <div className="bg-gradient-to-r from-[#072B23] via-[#0B3D32] to-[#0E4A3E] border border-[#2DD4BF]/25 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/20">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 items-center">
            <div className="space-y-1">
              <p className="text-xs text-[#F9A8D4] font-semibold">
                {t('সক্রিয় প্রতিযোগিতা', 'Active Competitions')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums font-mono">
                {loading ? '—' : stats?.active_competitions ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#F9A8D4] font-semibold">
                {t('ডাটাবেসে মোট নিবন্ধন', 'Recorded Registrations')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums font-mono">
                {loading ? '—' : stats?.total_registrations ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#F9A8D4] font-semibold">
                {t('অংশগ্রহণকারী জেলা', 'Districts Represented')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums font-mono">
                {loading ? '—' : stats?.districts_represented ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#F9A8D4] font-semibold">
                {t('শিক্ষামূলক উপকরণ', 'Learning Resources')}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums font-mono">
                {loading ? '—' : stats?.published_resources ?? 0}
              </p>
            </div>

            <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-white/20 pt-4 lg:pt-0 lg:pl-6">
              <p className="text-xs text-[#F9A8D4] font-semibold mb-1">
                {t('আসন্ন নিবন্ধন সময়সীমা', 'Next Registration Deadline')}
              </p>
              {countdown && !countdown.expired ? (
                <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-white">
                  {countdown.days}d : {String(countdown.hours).padStart(2, '0')}h :{' '}
                  {String(countdown.minutes).padStart(2, '0')}m : {String(countdown.seconds).padStart(2, '0')}s
                </div>
              ) : (
                <p className="text-sm text-white/85">{t('সময়সূচি শীঘ্রই আসছে', 'Schedule Updating')}</p>
              )}
            </div>
          </div>
          {stats && stats.sample_registrations > 0 && (
            <p className="mt-4 pt-3 border-t border-white/15 text-[11px] text-white/75">
              {t(
                'তথ্যসূত্র: উপরের পরিসংখ্যান সরাসরি লাইভ ডাটাবেস থেকে প্রদর্শিত (বর্তমানে সিস্টেম প্রদর্শনের জন্য নমুনা রেকর্ড অন্তর্ভুক্ত রয়েছে)।',
                'Live Database Telemetry: Counts reflect actual records stored in the foundation database (currently includes clearly marked sample records for evaluation).'
              )}
            </p>
          )}
        </div>
      </section>

      {/* 3. PROGRAMS & ACTIVITIES SECTION (ZemeZ Pastel Rounded Cards) */}
      <section id="programs" className="py-14 lg:py-20 bg-white dark:bg-[#0A1C18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
              {t('আমাদের কার্যক্রমসমূহ', 'Our Programs & Activities')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] font-display">
              {t('হস্তলিপি ও ক্যালিগ্রাফি শিক্ষার বহুমুখী উদ্যোগ', 'Our Programs & Creative Initiatives')}
            </h2>
            <p className="text-sm sm:text-base text-[#1E1B4B]/75 dark:text-white/75">
              {t(
                'বাংলা, ইংরেজি ও আরবি সুন্দর হাতের লেখা, ক্যালিগ্রাফি এবং জাতীয় পর্যায়ের প্রতিযোগিতার মাধ্যমে সৃজনশীল দক্ষতা বিকাশ।',
                'Dedicated initiatives promoting Bangla, English, and Arabic penmanship, calligraphy artistry, and educational workshops.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((prog, idx) => {
              const Icon = prog.icon;
              return (
                <motion.div
                  key={prog.titleEn}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className={`${prog.cardBg} dark:bg-[#0E2621] border ${prog.borderColor} dark:border-[#2DD4BF]/20 rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
                >
                  <div>
                    <div className={`w-14 h-14 rounded-2xl ${prog.iconBg} flex items-center justify-center mb-5 shadow-sm`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1E1B4B] dark:text-white mb-2.5 font-display">
                      {t(prog.titleBn, prog.titleEn)}
                    </h3>
                    <p className="text-sm text-[#1E1B4B]/80 dark:text-white/75 leading-relaxed mb-6">
                      {t(prog.descBn, prog.descEn)}
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(prog.to)}
                      className={`inline-flex items-center gap-1.5 text-sm font-bold ${prog.accentText} dark:text-[#5EEAD4] hover:underline cursor-pointer`}
                    >
                      <span>{t('বিস্তারিত দেখুন', 'Learn More')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ABOUT US SECTION (Creative Overlapping Image Collage + Intro) */}
      <section className="py-16 lg:py-24 bg-[#FFFBF5] dark:bg-[#071412]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Creative Image Collage */}
            <div className="lg:col-span-6 relative pb-10 sm:pb-12">
              <div
                aria-hidden="true"
                className="absolute -top-6 -left-6 w-56 h-56 rounded-full bg-[#EDE9FE] opacity-70 pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute bottom-0 right-4 w-44 h-44 rounded-full bg-[#FCE7F3] opacity-80 pointer-events-none"
              />

              <div className="relative grid grid-cols-12 gap-4 items-center">
                <div className="col-span-8 rounded-3xl overflow-hidden border-4 border-white shadow-xl aspect-[4/3] bg-white z-10">
                  <ResilientImage
                    src="/src/assets/images/collage_cursive_pen_1795066349284.jpg"
                    alt={t('ইংরেজি কার্সিভ হাতের লেখা ও ফাউন্টেন পেন', 'English cursive handwriting and fountain pen')}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="col-span-4 space-y-4 -ml-6 sm:-ml-10 z-20 mt-8">
                  <div className="rounded-3xl overflow-hidden border-4 border-white shadow-lg aspect-[4/3] bg-white">
                    <ResilientImage
                      src="/src/assets/images/collage_arabic_calligraphy_1795066348244.jpg"
                      alt={t('আরবি ও বাংলা ক্যালিগ্রাফি শিল্পকর্ম', 'Arabic and Bangla calligraphy artwork')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="rounded-3xl overflow-hidden border-4 border-white shadow-lg aspect-[4/3] bg-white">
                    <ResilientImage
                      src="/src/assets/images/training_teacher_workshop_1795066349436.jpg"
                      alt={t('শিক্ষক পরিচালিত হাতের লেখা কর্মশালা', 'Teacher guiding students in handwriting workshop')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* About Copy */}
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                {t('ফাউন্ডেশন পরিচিতি', 'About Our Foundation')}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] leading-tight font-display">
                Discover the Art of Beautiful Handwriting
              </h2>
              <p className="text-sm font-bold text-[#B45309] dark:text-[#E5C158]">
                {t(hc?.about_title_bn || 'আমাদের সম্পর্কে', hc?.about_title_en || 'About HCFB')}
              </p>
              <p className="text-base text-[#1E1B4B]/80 dark:text-white/80 leading-relaxed">
                {t(
                  hc?.about_summary_bn ||
                    'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ একটি অলাভজনক শিক্ষামূলক প্রতিষ্ঠান। সুন্দর হাতের লেখা ও ক্যালিগ্রাফির চর্চা সারাদেশে ছড়িয়ে দেওয়া এবং এ বিষয়ে শিক্ষার্থী ও আগ্রহীদের দক্ষতা বিকাশে কাজ করাই আমাদের মূল লক্ষ্য।',
                  hc?.about_summary_en ||
                    'Handwriting & Calligraphy Foundation of Bangladesh (HCFB) is a non-profit educational foundation dedicated to nurturing neat handwriting and expressive calligraphy nationwide.'
                )}
              </p>
              <p className="text-sm text-[#1E1B4B]/70 dark:text-white/70 leading-relaxed">
                {t(hc?.about_full_bn || '', hc?.about_full_en || '')}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/about');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#064E3B] hover:bg-[#047857] dark:bg-[#E5C158] dark:text-[#04241D] text-white text-sm font-bold rounded-full shadow-md transition-colors"
                >
                  <span>{t('বিস্তারিত জানুন', 'Learn More')}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/track"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/track');
                  }}
                  className="text-sm font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline transition-colors"
                >
                  {t('রেজিস্ট্রেশন নম্বর ট্র্যাক করুন', 'Track Registration ID')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE OUR FOUNDATION (4 Pastel Numbered Cards) */}
      <section className="py-16 lg:py-20 bg-white dark:bg-[#0A1C18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
              {t('আমাদের বিশেষত্ব', 'Why Choose Us')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] font-display">
              {t('কেন আমাদের ফাউন্ডেশনে যুক্ত হবেন', 'Why Students, Parents & Educators Choose HCFB')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reasons.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.num}
                  className={`${item.cardBg} dark:bg-[#0E2621] rounded-3xl p-6 space-y-4 border border-black/5 dark:border-[#2DD4BF]/20 shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-11 h-11 rounded-2xl ${item.badgeBg} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="font-mono font-extrabold text-xl text-[#064E3B]/25 dark:text-[#F3D98B]/35 tabular-nums">
                      {item.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1E1B4B] dark:text-white font-display">
                    {t(item.titleBn, item.titleEn)}
                  </h3>
                  <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75 leading-relaxed">
                    {t(item.descBn, item.descEn)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. COMPETITIONS & EVENTS */}
      {featuredComp && (
        <section className="py-16 lg:py-20 bg-[#ECFDF5]/60 dark:bg-[#071412]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                  {t('প্রতিযোগিতা ও ইভেন্ট', 'Competitions & Events')}
                </p>
                <h2 className="text-3xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                  {t('চলমান ও আসন্ন আয়োজনসমূহ', 'Featured Competition & National Events')}
                </h2>
              </div>
              <a
                href="/competitions"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/competitions');
                }}
                className="text-sm font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline whitespace-nowrap shrink-0"
              >
                {t('সকল প্রতিযোগিতা দেখুন →', 'View All Competitions →')}
              </a>
            </div>

            <div className="bg-white dark:bg-[#0D211D] rounded-3xl overflow-hidden border border-[#A7F3D0]/60 dark:border-[#2DD4BF]/20 shadow-lg grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-5 min-h-[260px]">
                <ResilientImage
                  src={featuredComp.banner_url}
                  alt={t(featuredComp.title_bn, featuredComp.title_en)}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#1E1B4B]/70 dark:text-white/70">
                    <span className="font-bold text-[#059669] dark:text-[#5EEAD4]">
                      {featuredComp.status === 'published'
                        ? t('নিবন্ধন চলছে', 'Registration Open')
                        : t('সমাপ্ত', 'Closed')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {t('শেষ তারিখ:', 'Deadline:')} {featuredComp.registration_deadline}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-semibold text-[#0D9488] dark:text-[#F3D98B]">
                      {t('অংশগ্রহণকারী:', 'Participants:')} {featuredComp.participant_count ?? 0}
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-[#064E3B] dark:text-white font-display">
                    {t(featuredComp.title_bn, featuredComp.title_en)}
                  </h3>

                  <p className="text-sm sm:text-base text-[#1E1B4B]/80 dark:text-white/80 leading-relaxed">
                    {t(featuredComp.description_bn, featuredComp.description_en)}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#A7F3D0]/50 dark:border-white/10 text-sm">
                    <div>
                      <p className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] mb-1">
                        {t('যোগ্যতা', 'Eligibility')}
                      </p>
                      <p className="text-[#1E1B4B]/85 dark:text-white/80 leading-snug">
                        {t(featuredComp.eligibility_bn, featuredComp.eligibility_en)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#B45309] dark:text-[#E5C158] mb-1">
                        {t('বিভাগসমূহ', 'Categories')}
                      </p>
                      <ul className="space-y-1 text-[#1E1B4B]/85 dark:text-white/80">
                        {(featuredComp.categories || []).slice(0, 3).map((cat) => (
                          <li key={cat.id} className="text-xs">
                            • {t(cat.name_bn, cat.name_en)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={`/register?competition=${featuredComp.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/register?competition=${featuredComp.id}`);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#064E3B] to-[#0D9488] dark:from-[#E5C158] dark:to-[#D4A838] dark:text-[#04241D] hover:brightness-110 text-white text-sm font-bold rounded-full shadow-md transition-all"
                  >
                    <span>{t('এখনই রেজিস্ট্রেশন করুন', 'Register Now')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`/competitions/${featuredComp.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/competitions/${featuredComp.slug}`);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#0D9488]/30 dark:border-[#2DD4BF]/30 text-[#064E3B] dark:text-[#CCFBF1] text-sm font-bold rounded-full hover:bg-[#ECFDF5] dark:hover:bg-white/10 transition-colors"
                  >
                    <span>{t('বিস্তারিত ও নিয়মাবলী', 'View Details')}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. FEATURED ARTWORK & PUBLISHED WINNERS */}
      {(featuredArtworks.length > 0 || winners.length > 0) && (
        <section className="py-16 lg:py-20 bg-white dark:bg-[#0A1C18]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            {featuredArtworks.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                      {t('শিল্পকর্ম প্রদর্শনী', 'Curated Calligraphy')}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                      {t('নির্বাচিত হাতের লেখা ও ক্যালিগ্রাফি', 'Featured Handwriting & Calligraphy')}
                    </h2>
                  </div>
                  <a
                    href="/hub"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/hub');
                    }}
                    className="text-sm font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline"
                  >
                    {t('লার্নিং ও সৃজনশীলতা হাব দেখুন →', 'Open Learning & Creativity Hub →')}
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredArtworks.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLightboxItem(item)}
                      className="cursor-pointer group bg-[#FFFBF5] dark:bg-[#0E2621] border border-[#EDE9FE] dark:border-[#2DD4BF]/20 rounded-3xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-stretch hover:shadow-md transition-all"
                    >
                      <div className="sm:col-span-5 aspect-[4/3] sm:aspect-auto overflow-hidden">
                        <ResilientImage
                          src={item.image_url}
                          alt={t(item.title_bn, item.title_en)}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                        />
                      </div>
                      <div className="sm:col-span-7 p-6 flex flex-col justify-center space-y-2">
                        <div className="text-xs text-[#0D9488] dark:text-[#5EEAD4] font-semibold">
                          <span>{item.category}</span>
                          {item.is_sample === 1 && (
                            <span className="text-[#B45309] dark:text-[#E5C158]">
                              {' · '}{t('নমুনা প্রদর্শনী', 'Sample Showcase')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-[#1E1B4B] dark:text-white font-display">
                          {t(item.title_bn, item.title_en)}
                        </h3>
                        <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75 leading-relaxed">
                          {t(item.description_bn, item.description_en)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {winners.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#059669] dark:text-[#5EEAD4]">
                      {t('মেধা ও সম্মাননা', 'Published Merit Records')}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                      {t('প্রকাশিত ফলাফল ও বিজয়ী তালিকা', 'Published Winners & Merit Showcase')}
                    </h2>
                  </div>
                  <a
                    href="/verify"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/verify');
                    }}
                    className="text-sm font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline"
                  >
                    {t('কিউআর সনদ যাচাই করুন →', 'Verify QR Certificate →')}
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {winners.slice(0, 6).map((w) => {
                    const award = AWARD_LABELS[w.award_tier] || AWARD_LABELS.merit;
                    return (
                      <div
                        key={w.registration_id}
                        className="bg-[#ECFDF5]/60 dark:bg-[#0E2621] border border-[#A7F3D0] dark:border-[#2DD4BF]/20 rounded-3xl p-6 space-y-2"
                      >
                        <div className="text-xs text-[#1E1B4B]/70 dark:text-white/70 flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#064E3B] dark:text-[#F3D98B]">{t(award.bn, award.en)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{w.registration_id}</span>
                          {w.is_sample === 1 && (
                            <span className="text-[#B45309] dark:text-[#E5C158] font-semibold">· {t('নমুনা', 'Sample')}</span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-[#1E1B4B] dark:text-white">
                          {t(w.name_bn, w.name_en)}
                        </h3>
                        <p className="text-xs text-[#1E1B4B]/75 dark:text-white/70">
                          {w.school_name} · {w.district}
                        </p>
                        <p className="text-xs text-[#064E3B]/80 dark:text-[#5EEAD4] pt-2 border-t border-[#A7F3D0]/70 dark:border-white/10">
                          {t(w.competition_title_bn, w.competition_title_en)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8. ANNUAL ACTIVITIES TIMELINE */}
      {timeline.length > 0 && (
        <section className="py-16 lg:py-20 bg-[#FFFBF5] dark:bg-[#071412]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                {t('বার্ষিক কর্মপরিকল্পনা', 'Annual Calendar')}
              </p>
              <h2 className="text-3xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                {t('বার্ষিক কার্যক্রমের ধারাবাহিক রূপরেখা', 'Annual Activities Timeline')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {timeline.map((step, i) => {
                const bgTones = ['bg-[#F5F3FF]', 'bg-[#EFF6FF]', 'bg-[#FDF2F8]', 'bg-[#ECFDF5]'];
                const numTones = ['text-[#064E3B]', 'text-[#0D9488]', 'text-[#B45309]', 'text-[#059669]'];
                return (
                  <div
                    key={step.phase_en}
                    className={`${bgTones[i % 4]} dark:bg-[#0E2621] rounded-3xl p-6 space-y-2 border border-black/5 dark:border-[#2DD4BF]/20`}
                  >
                    <div className={`text-xs font-mono font-bold ${numTones[i % 4]} dark:text-[#F3D98B]`}>
                      0{i + 1}. {t(step.phase_bn, step.phase_en)}
                    </div>
                    <h3 className="text-base font-bold text-[#1E1B4B] dark:text-white">
                      {t(step.title_bn, step.title_en)}
                    </h3>
                    <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75 leading-relaxed">
                      {t(step.desc_bn, step.desc_en)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 9. LATEST NOTICES & GALLERY PREVIEW */}
      <section className="py-16 lg:py-20 bg-white dark:bg-[#0A1C18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Latest News & Announcements */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                  {t('ঘোষণা ও আপডেট', 'Notices & Updates')}
                </p>
                <h2 className="text-2xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                  {t('সাম্প্রতিক সংবাদ ও বিজ্ঞপ্তি', 'Latest News & Announcements')}
                </h2>
              </div>
              <a
                href="/notices"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/notices');
                }}
                className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline"
              >
                {t('সব দেখুন →', 'View All →')}
              </a>
            </div>

            <div className="space-y-4">
              {notices.slice(0, 4).map((notice) => (
                <div
                  key={notice.id}
                  className="bg-[#FFFBF5] dark:bg-[#0E2621] border border-[#EDE9FE] dark:border-[#2DD4BF]/20 rounded-2xl p-5 space-y-2 hover:border-[#14B8A6] transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-[#1E1B4B]/65 dark:text-white/65">
                    <Calendar className="w-3.5 h-3.5 text-[#0D9488] dark:text-[#5EEAD4]" />
                    <span className="tabular-nums font-medium">{notice.published_at}</span>
                    {notice.is_important === 1 && (
                      <span className="text-[#B45309] dark:text-[#E5C158] font-bold">
                        · {t('জরুরি', 'Important')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#1E1B4B] dark:text-white">
                    {t(notice.title_bn, notice.title_en)}
                  </h3>
                  <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75 line-clamp-2">
                    {t(notice.summary_bn, notice.summary_en)}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/notices/${notice.id}`)}
                    className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline cursor-pointer"
                  >
                    {t('বিস্তারিত দেখুন →', 'Read Notice →')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Gallery Preview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                  {t('দৃশ্যমান আর্কাইভ', 'Visual Gallery')}
                </p>
                <h2 className="text-2xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                  {t('গ্যালারি প্রিভিউ', 'Handwriting & Calligraphy Gallery')}
                </h2>
              </div>
              <a
                href="/gallery"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/gallery');
                }}
                className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline"
              >
                {t('পূর্ণ গ্যালারি →', 'Full Gallery →')}
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gallery.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLightboxItem(item)}
                  className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-[#EDE9FE] dark:border-[#2DD4BF]/20 bg-[#F5F3FF] dark:bg-[#0E2621] text-left cursor-pointer shadow-sm hover:shadow-md transition-all"
                >
                  <ResilientImage
                    src={item.image_url}
                    alt={t(item.title_bn, item.title_en)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04241D]/90 via-[#04241D]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                    <span className="text-xs font-bold text-white line-clamp-2">
                      {t(item.title_bn, item.title_en)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. TESTIMONIALS & FACEBOOK INTEGRATION */}
      <section className="py-16 lg:py-20 bg-[#ECFDF5]/50 dark:bg-[#071412]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
                {t('শিক্ষক ও অংশগ্রহণকারীদের মতামত', 'Educator Perspectives')}
              </p>
              <h2 className="text-2xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] mt-1 font-display">
                {t('অভিজ্ঞতা ও মূল্যায়ন', 'Verified Reflections')}
              </h2>
            </div>

            {testimonials.map((item) => (
              <blockquote
                key={item.id}
                className="bg-white dark:bg-[#0E2621] border border-[#A7F3D0] dark:border-[#2DD4BF]/20 rounded-3xl p-7 space-y-4 shadow-sm"
              >
                <p className="text-base sm:text-lg text-[#1E1B4B]/85 dark:text-white/85 leading-relaxed italic">
                  "{t(item.quote_bn, item.quote_en)}"
                </p>
                <footer className="pt-3 border-t border-[#A7F3D0]/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#1E1B4B]/70 dark:text-white/70">
                  <div>
                    <span className="font-bold text-[#064E3B] dark:text-[#F3D98B]">{t(item.author_name_bn, item.author_name_en)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{t(item.role_bn, item.role_en)}</span>
                  </div>
                  {item.is_sample === 1 && (
                    <span className="text-[#B45309] dark:text-[#E5C158] font-semibold">
                      {t('নমুনা মতামত', 'Sample Placeholder')}
                    </span>
                  )}
                </footer>
              </blockquote>
            ))}
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-[#0E2621] border border-[#A7F3D0] dark:border-[#2DD4BF]/20 rounded-3xl p-7 h-full flex flex-col justify-between space-y-5 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0D9488] dark:text-[#5EEAD4]">
                  <Share2 className="w-4 h-4" />
                  <span>{t('অফিসিয়াল ফেসবুক পেজ', 'Official Facebook Channel')}</span>
                </div>
                <h3 className="text-xl font-extrabold text-[#064E3B] dark:text-[#F3D98B] font-display">
                  HANDWRITING &amp; CALLIGRAPHY FOUNDATION OF BANGLADESH
                </h3>
                <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75 leading-relaxed">
                  {identity?.facebook_page_configured
                    ? t(
                        'আমাদের অফিসিয়াল ফেসবুক পেজে নিয়মিত প্রতিযোগিতার আপডেট, লাইভ সেশন ও ফলাফল অনুসরণ করুন।',
                        'Follow our official Facebook page for live competition announcements and updates.'
                      )
                    : t(
                        'অফিসিয়াল ফেসবুক পেজের লিংক শীঘ্রই সংযুক্ত করা হবে। অ্যাডমিন প্যানেল থেকে যেকোনো সময় অফিসিয়াল পেজ URL যুক্ত করা যাবে।',
                        'Official Facebook Page URL will be linked soon and is directly configurable from the Admin Settings panel.'
                      )}
                </p>
              </div>

              <div className="bg-[#ECFDF5] dark:bg-[#071D18] border border-[#A7F3D0] dark:border-[#2DD4BF]/25 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#0D9488] text-[#F3D98B] flex items-center justify-center font-bold text-xs shadow-sm">
                    HCFB
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#064E3B] dark:text-white">HCFB Official</p>
                    <p className="text-xs text-[#1E1B4B]/65 dark:text-white/65">
                      {identity?.facebook_page_configured
                        ? t('যাচাইকৃত পেজ সংযুক্ত', 'Configured Page')
                        : t('কনফিগারেবল প্লেসহোল্ডার', 'Configurable Placeholder')}
                    </p>
                  </div>
                </div>
                <a
                  href={identity?.facebook_url || 'https://www.facebook.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] dark:bg-[#E5C158] dark:text-[#04241D] text-white text-xs font-bold rounded-full hover:brightness-110 transition-all whitespace-nowrap shrink-0"
                >
                  <span>{t('অনুসরণ করুন', 'Follow Page')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10B. EVENT PHOTO GALLERY SHOWCASE (All 14 Ceremony Photos Together) */}
      <section className="py-16 lg:py-20 bg-white dark:bg-[#0A1C18]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#064E3B] dark:text-[#F3D98B] font-display">
                {t('গ্যালারি.', 'Gallery.')}
              </h2>
              <p className="text-sm sm:text-base text-[#1E1B4B]/75 dark:text-white/75">
                {t(
                  'নবগঠিত কার্যকরী পরিষদের অভিষেক ও শপথ অনুষ্ঠান — ২৯ আগস্ট ২০২৬, প্রশাসনিক ভবন, ঢাকা বিশ্ববিদ্যালয়',
                  'Executive Committee Inauguration & Oath Ceremony — 29 August 2026, Administrative Building, University of Dhaka'
                )}
              </p>
            </div>
            <a
              href="/gallery"
              onClick={(e) => {
                e.preventDefault();
                navigate('/gallery');
              }}
              className="text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline whitespace-nowrap shrink-0"
            >
              {t('সকল গ্যালারি দেখুন →', 'Open Full Gallery →')}
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                id: 901,
                image_url: '/assets/aistudio/d06d1923-af1b-4a97-98cf-a6ff4279ab84_77d3dec6.jfif',
                title_bn: 'অভিষেক ও শপথ অনুষ্ঠানে বক্তব্য প্রদান',
                title_en: 'Keynote Address at the Inauguration & Oath Ceremony',
              },
              {
                id: 902,
                image_url: '/assets/aistudio/71d5957e-bc97-41ac-b0ea-27ff7097d58c_328a840e.jfif',
                title_bn: 'কার্যকরী পরিষদের সম্মিলিত সভা',
                title_en: 'Executive Committee Joint Session at Dhaka University',
              },
              {
                id: 903,
                image_url: '/assets/aistudio/9d831d73-aaa9-4f00-b8e0-9e7f1b90c680_e02cdff8.jfif',
                title_bn: 'নবগঠিত কমিটির ফুলেল শুভেচ্ছা বিনিময়',
                title_en: 'Floral Reception for Newly Inducted Committee Leaders',
              },
              {
                id: 904,
                image_url: '/assets/aistudio/23f16514-4112-4c78-8b47-cdc82e83e658_92bc6c8a.jfif',
                title_bn: 'নেতৃবৃন্দের অভিনন্দন ও শুভেচ্ছা পর্ব',
                title_en: 'Committee Leaders Greeting & Bouquet Presentation',
              },
              {
                id: 905,
                image_url: '/assets/aistudio/99aa5cb4-7658-402b-8a76-182a9b27c0a0_d5f9645e.jfif',
                title_bn: 'নবগঠিত কার্যকরী পরিষদের সনদ প্রদান',
                title_en: 'Executive Appointment Certificate Presentation',
              },
              {
                id: 906,
                image_url: '/assets/aistudio/20a4e1dc-aebb-4c11-94ad-e24b75b8e283_08eedfef.jfif',
                title_bn: 'অভিষেক অনুষ্ঠানে ফুলেল সংবর্ধনা',
                title_en: 'Inauguration Ceremony Floral Reception',
              },
              {
                id: 907,
                image_url: '/assets/aistudio/17ef6091-033c-4687-b025-9e00830ac13f_7d9d74d1.jfif',
                title_bn: 'কেন্দ্রীয় নেতৃবৃন্দের শুভেচ্ছা বিনিময়',
                title_en: 'Central Committee Welcome & Bouquet Exchange',
              },
              {
                id: 908,
                image_url: '/assets/aistudio/eebed8ae-2413-480f-978b-120f874e0bee_5eafd922.jfif',
                title_bn: 'কার্যকরী সদস্যদের ফুলেল বরণ',
                title_en: 'Welcoming Executive Committee Members',
              },
              {
                id: 909,
                image_url: '/assets/aistudio/49caa75c-b2a9-45ef-9116-da861c11b760_e72be33a.jfif',
                title_bn: 'শপথ অনুষ্ঠানের সম্মাননা ও শুভেচ্ছা',
                title_en: 'Oath Ceremony Greeting & Recognition',
              },
              {
                id: 910,
                image_url: '/assets/aistudio/4d9c82be-4b1a-4279-933b-c1c7288701e2_66176432.jfif',
                title_bn: 'অতিথি ও সদস্যদের সংবর্ধনা মুহূর্ত',
                title_en: 'Guests & Committee Members Celebration Moment',
              },
              {
                id: 911,
                image_url: '/assets/aistudio/74894efc-e286-4d4a-9468-1e82445d8d2d_b3c02445.jfif',
                title_bn: 'অভিষেক পর্বের শুভেচ্ছা বিনিময়',
                title_en: 'Committee Induction Bouquet Presentation',
              },
              {
                id: 912,
                image_url: '/assets/aistudio/3d6b490a-c057-44b1-a23a-9d21e98a029a_4aa19bde.jfif',
                title_bn: 'কার্যকরী পরিষদের একত্রিত শুভেচ্ছা ছবি',
                title_en: 'Joint Celebration with Committee Leaders',
              },
              {
                id: 913,
                image_url: '/assets/aistudio/3c21ac66-7454-4354-87c3-04a32c67e27d_5d0acb50.jfif',
                title_bn: 'সহ-সাংগঠনিক সম্পাদক সনদ হস্তান্তর',
                title_en: 'Co-Organizing Secretary Certificate Handover',
              },
              {
                id: 914,
                image_url: '/assets/aistudio/cced5b96-18a0-41cc-b41a-b8df4c1ede39_8b9d8afc.jfif',
                title_bn: 'ঢাকা বিশ্ববিদ্যালয় অফিসার্স অ্যাসোসিয়েশনে দলীয় ছবি',
                title_en: 'Executive Team Group Photo at Dhaka University',
              },
            ].map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() =>
                  setLightboxItem({
                    id: photo.id,
                    title_bn: photo.title_bn,
                    title_en: photo.title_en,
                    description_bn:
                      'নবগঠিত কার্যকরী পরিষদের অভিষেক ও শপথ অনুষ্ঠান — ২৯ আগস্ট ২০২৬, প্রশাসনিক ভবন, ঢাকা বিশ্ববিদ্যালয়।',
                    description_en:
                      'Executive Committee Inauguration & Oath Ceremony — 29 August 2026, Administrative Building, University of Dhaka.',
                    category: 'Other Events',
                    image_url: photo.image_url,
                    event_name: 'অভিষেক ও শপথ অনুষ্ঠান ২০২৬',
                    is_featured_artwork: 0,
                    is_sample: 0,
                    created_at: '2026-08-29',
                  })
                }
                className="group relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#ECFDF5] dark:bg-[#0E2621] border border-[#A7F3D0]/70 dark:border-[#2DD4BF]/25 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer text-left"
              >
                <ResilientImage
                  src={photo.image_url}
                  alt={t(photo.title_bn, photo.title_en)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04241D]/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3.5 sm:p-4 flex items-end">
                  <span className="text-xs font-bold text-white line-clamp-2">
                    {t(photo.title_bn, photo.title_en)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 11. DEEP EMERALD & CHAMPAGNE FINAL CALL-TO-ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#04241D] via-[#0B3B32] to-[#0F4C42] border border-[#2DD4BF]/25 text-white px-6 py-14 sm:px-12 sm:py-16 text-center shadow-xl">
          <div className="relative max-w-3xl mx-auto space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight font-display text-[#F3D98B]">
              Let's Build a Beautiful Handwriting Culture in Bangladesh!
            </h2>
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
              {t(
                'হাতের লেখা ও ক্যালিগ্রাফির জাতীয় আন্দোলনে যুক্ত হোন — আপনার প্রতিভা ও সৃজনশীলতাকে বিকশিত করুন।',
                'Join us in promoting handwriting excellence, creativity, and calligraphy across the nation.'
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/register');
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#F3D98B] to-[#E5C158] hover:brightness-105 text-[#04241D] text-sm font-extrabold rounded-full shadow-lg shadow-black/25 transition-all"
              >
                <span>{t('এখনই নিবন্ধন করুন', 'Register Now')}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/portal"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/portal');
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 border border-[#2DD4BF]/40 text-[#CCFBF1] hover:bg-white/20 text-sm font-bold rounded-full transition-colors"
              >
                <span>{t('অংশগ্রহণকারী পোর্টাল', 'Participant Portal')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Lightbox Modal */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="bg-white dark:bg-[#0D211D] dark:border dark:border-[#2DD4BF]/30 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9FE] dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-[#064E3B] dark:text-[#F3D98B]">
                  {t(lightboxItem.title_bn, lightboxItem.title_en)}
                </h3>
                <p className="text-xs text-[#1E1B4B]/60 dark:text-white/60">
                  {lightboxItem.category}
                  {lightboxItem.event_name ? ` · ${lightboxItem.event_name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                aria-label="Close modal"
                className="p-2 rounded-full hover:bg-[#ECFDF5] dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5 text-[#064E3B] dark:text-white" />
              </button>
            </div>
            <div className="bg-[#ECFDF5] dark:bg-[#071412] flex items-center justify-center max-h-[70vh] overflow-hidden">
              <ResilientImage
                src={lightboxItem.image_url}
                alt={t(lightboxItem.title_bn, lightboxItem.title_en)}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="p-5 text-sm text-[#1E1B4B]/80 dark:text-white/80">
              {t(lightboxItem.description_bn, lightboxItem.description_en)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
