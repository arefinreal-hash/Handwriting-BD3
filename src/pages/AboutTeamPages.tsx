import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';
import { ShieldCheck, ExternalLink, UserCheck } from 'lucide-react';

export function AboutPage() {
  const { t, bootstrap, navigate } = useApp();
  const hc = bootstrap?.settings?.homepage_content;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
      <header className="space-y-4 border-b border-[#EDE9FE] pb-8">
        <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#EC4899]">
          {t('প্রতিষ্ঠানের পরিচিতি', 'About the Foundation')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
          {t(
            'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ (HCFB)',
            'Handwriting & Calligraphy Foundation of Bangladesh (HCFB)'
          )}
        </h1>
        <p className="text-sm text-[#1E1B4B]/70">
          {t('অলাভজনক শিক্ষামূলক ও সৃজনশীল ফাউন্ডেশন', 'Non-profit Educational Foundation')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <article className="lg:col-span-8 space-y-6 max-w-2xl">
          <p className="text-lg text-[#1E1B4B]/90 leading-relaxed font-semibold">
            {t(
              hc?.about_summary_bn ||
                'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ একটি অলাভজনক শিক্ষামূলক প্রতিষ্ঠান। সুন্দর হাতের লেখা ও ক্যালিগ্রাফির চর্চা সারাদেশে ছড়িয়ে দেওয়া এবং এ বিষয়ে শিক্ষার্থী ও আগ্রহীদের দক্ষতা বিকাশে কাজ করাই আমাদের মূল লক্ষ্য।',
              hc?.about_summary_en ||
                'Handwriting & Calligraphy Foundation of Bangladesh (HCFB) is a non-profit educational foundation dedicated to nurturing neat handwriting and expressive calligraphy nationwide.'
            )}
          </p>
          <p className="text-base text-[#1E1B4B]/80 leading-relaxed whitespace-pre-line">
            {t(hc?.about_full_bn || '', hc?.about_full_en || '')}
          </p>

          <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-3xl p-7 space-y-3">
            <h2 className="text-lg font-bold text-[#4C1D95] font-display">
              {t('আমাদের মূল লক্ষ্যসমূহ', 'Core Educational Objectives')}
            </h2>
            <ul className="space-y-2 text-sm text-[#1E1B4B]/85 list-disc pl-5">
              <li>{t('প্রাথমিক থেকে উচ্চমাধ্যমিক শিক্ষার্থীদের মাঝে সুন্দর ও পরিচ্ছন্ন হাতের লেখার অভ্যাস গড়ে তোলা।', 'Cultivate legible, disciplined handwriting habits among primary to higher-secondary students.')}</li>
              <li>{t('বাংলা, ইংরেজি ও ঐতিহ্যবাহী ক্যালিগ্রাফি চর্চার জাতীয় ও আঞ্চলিক মঞ্চ তৈরি করা।', 'Build national and regional platforms for Bangla, English, and traditional calligraphy.')}</li>
              <li>{t('শিক্ষক ও প্রশিক্ষকদের জন্য নিয়মিত কর্মশালা ও প্রশিক্ষণ সহায়িকা প্রণয়ন।', 'Organize educator orientation workshops and printable practice curricula.')}</li>
              <li>{t('স্বচ্ছ বিচার প্রক্রিয়া ও কিউআর-যাচাইকৃত সনদপত্রের মাধ্যমে অংশগ্রহণকারীদের স্বীকৃতি প্রদান।', 'Ensure transparent jury scoring and QR-verified digital certification.')}</li>
            </ul>
          </div>
        </article>

        <aside className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl overflow-hidden border border-[#EDE9FE] bg-white shadow-sm">
            <ResilientImage
              src="/src/assets/images/training_teacher_workshop_1795066349436.jpg"
              alt={t('শিক্ষার্থীদের হাতের লেখা কর্মশালা (নমুনা দৃশ্য)', 'Student handwriting workshop scene')}
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="p-5 text-xs text-[#1E1B4B]/70">
              {t(
                'নমুনা আলোকচিত্র — অফিসিয়াল গঠনতন্ত্র ও অনুমোদিত তথ্য অ্যাডমিন প্যানেল থেকে হালনাগাদযোগ্য।',
                'Illustrative photo — Official constitutional details can be updated anytime via the Admin Dashboard.'
              )}
            </div>
          </div>

          <div className="bg-white border border-[#EDE9FE] rounded-3xl p-6 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-[#4C1D95]">
              {t('দ্রুত সংযোগ', 'Quick Actions')}
            </h3>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/competitions')}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-xs font-bold rounded-full hover:brightness-105 cursor-pointer"
              >
                {t('চলমান প্রতিযোগিতা দেখুন', 'Explore Competitions')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/team')}
                className="w-full py-2.5 px-4 border border-[#DDD6FE] text-[#4C1D95] text-xs font-bold rounded-full hover:bg-[#F5F3FF] cursor-pointer"
              >
                {t('আমাদের টিম দেখুন', 'Meet Our Team')}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function TeamPage() {
  const { t, bootstrap } = useApp();
  const team = bootstrap?.team || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <header className="max-w-2xl space-y-3">
        <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#7C3AED]">
          {t('সাংগঠনিক কাঠামো', 'Leadership & Coordination')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
          {t('আমাদের টিম', 'Our Team')}
        </h1>
        <p className="text-sm sm:text-base text-[#1E1B4B]/75">
          {t(
            'ফাউন্ডেশনের নির্বাহী পরিষদ, বিচারকমণ্ডলী ও সমন্বয়কদের তথ্য এখানে প্রদর্শিত হয়। আনুষ্ঠানিক তালিকা যুক্ত না হওয়া পর্যন্ত নিচে স্পষ্টভাবে চিহ্নিত প্লেসহোল্ডার প্রোফাইল রাখা হয়েছে।',
            'Executive committee, jury panel, and coordinators of HCFB. Clearly marked placeholder entries are shown below until official appointments are published via the Admin Panel.'
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-[#EDE9FE] rounded-3xl overflow-hidden flex flex-col shadow-sm"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-[#F5F3FF] to-[#FDF2F8] border-b border-[#EDE9FE] flex items-center justify-center overflow-hidden">
              {member.photo_url ? (
                <ResilientImage
                  src={member.photo_url}
                  alt={t(member.name_bn, member.name_en)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-[#7C3AED]/60 p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                    <UserCheck className="w-8 h-8 text-[#7C3AED]" />
                  </div>
                  <span className="text-xs font-semibold text-[#4C1D95]/70">
                    {t('ছবি পরবর্তীতে যুক্ত করা হবে', 'Photo Pending Official Update')}
                  </span>
                </div>
              )}
            </div>
            <div className="p-6 space-y-2.5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {member.is_placeholder === 1 && (
                  <p className="text-[11px] font-bold text-[#EC4899]">
                    {t('প্লেসহোল্ডার প্রোফাইল · তথ্য যুক্ত করা হবে', 'Placeholder Profile · Pending Official Info')}
                  </p>
                )}
                <h2 className="text-lg font-bold text-[#1E1B4B]">
                  {t(member.name_bn, member.name_en)}
                </h2>
                <p className="text-xs font-bold text-[#7C3AED]">
                  {t(member.designation_bn, member.designation_en)}
                </p>
                <p className="text-sm text-[#1E1B4B]/75 leading-relaxed">
                  {t(member.bio_bn, member.bio_en)}
                </p>
              </div>
              {member.social_link && (
                <a
                  href={member.social_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#4C1D95] hover:underline pt-2"
                >
                  <span>Profile Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  const { t } = useApp();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <div className="space-y-2 border-b border-[#EDE9FE] pb-6">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#7C3AED]">
          <ShieldCheck className="w-4 h-4" />
          <span>{t('তথ্য সুরক্ষা ও গোপনীয়তা', 'Data Governance & Trust')}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#4C1D95] font-display">
          {t('গোপনীয়তা নীতি (Privacy Policy)', 'Privacy Policy')}
        </h1>
      </div>

      <div className="space-y-5 text-sm sm:text-base text-[#1E1B4B]/85 leading-relaxed bg-white border border-[#EDE9FE] rounded-3xl p-7 sm:p-10 shadow-sm">
        <p>
          {t(
            'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ (HCFB) অংশগ্রহণকারী শিক্ষার্থী, অভিভাবক এবং শিক্ষকদের ব্যক্তিগত তথ্যের সর্বোচ্চ সুরক্ষা নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ।',
            'Handwriting & Calligraphy Foundation of Bangladesh (HCFB) is committed to safeguarding the personal data of all participating students, guardians, and educators.'
          )}
        </p>
        <h2 className="text-lg font-bold text-[#4C1D95] pt-2">
          {t('১. তথ্য সংগ্রহ ও ব্যবহার', '1. Information Collection & Purpose')}
        </h2>
        <p>
          {t(
            'প্রতিযোগিতায় নিবন্ধনের সময় সংগৃহীত নাম, পিতা-মাতার নাম, শিক্ষা প্রতিষ্ঠানের নাম, মোবাইল নম্বর এবং জেলা সম্পর্কিত তথ্য শুধুমাত্র প্রতিযোগিতা পরিচালনা, যোগাযোগ, মূল্যায়ন ও সনদপত্র যাচাইয়ের কাজে ব্যবহৃত হয়।',
            'Details collected during registration (names, parents names, institution, mobile contact, and district) are strictly used for competition administration, participant communication, evaluation, and QR certificate verification.'
          )}
        </p>
        <h2 className="text-lg font-bold text-[#4C1D95] pt-2">
          {t('২. অপ্রাপ্তবয়স্ক অংশগ্রহণকারীর সুরক্ষা', '2. Protection of Minor Participants')}
        </h2>
        <p>
          {t(
            '১৮ বছরের কম বয়সী সকল শিক্ষার্থীর নিবন্ধনের জন্য পিতা-মাতা বা বৈধ অভিভাবকের সম্মতি বাধ্যতামূলক। অংশগ্রহণকারীর ব্যক্তিগত মোবাইল নম্বর, ইমেইল বা পারিবারিক তথ্য কখনোই জনসম্মুখে প্রকাশ করা হয় না।',
            'Guardian consent is mandatory for all minor participants. Private phone numbers, email addresses, and family details are never exposed on public endpoints.'
          )}
        </p>
        <h2 className="text-lg font-bold text-[#4C1D95] pt-2">
          {t('৩. সনদ ও ফলাফল প্রকাশ', '3. Results & Certificate Verification')}
        </h2>
        <p>
          {t(
            'বিজয়ী ও মেধাতালিকায় কেবল অংশগ্রহণকারীর নাম, রেজিস্ট্রেশন নম্বর, প্রতিষ্ঠান ও জেলা প্রদর্শিত হতে পারে। কিউআর সনদ যাচাই ব্যবস্থায় শুধুমাত্র সনদের সত্যতা নিশ্চিতকারী তথ্য প্রদর্শিত হয়।',
            'Published merit lists display only participant name, registration ID, institution, and district. QR verification returns only certificate authenticity details.'
          )}
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  const { t } = useApp();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <div className="space-y-2 border-b border-[#EDE9FE] pb-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#7C3AED]">
          {t('নীতিমালা', 'Institutional Terms')}
        </p>
        <h1 className="text-3xl font-extrabold text-[#4C1D95] font-display">
          {t('ব্যবহারের শর্তাবলী (Terms & Conditions)', 'Terms & Conditions')}
        </h1>
      </div>

      <div className="space-y-5 text-sm sm:text-base text-[#1E1B4B]/85 leading-relaxed bg-white border border-[#EDE9FE] rounded-3xl p-7 sm:p-10 shadow-sm">
        <p>
          {t(
            '১. প্রতিযোগিতায় অংশগ্রহণের জন্য প্রদত্ত সকল তথ্য নির্ভুল ও সত্য হতে হবে। ভুল বা অসত্য তথ্য প্রদান করলে নিবন্ধন বাতিল বলে গণ্য হতে পারে।',
            '1. All registration information submitted must be accurate. Falsified entries may result in disqualification.'
          )}
        </p>
        <p>
          {t(
            '২. জমা দেওয়া সকল হাতের লেখা ও ক্যালিগ্রাফি শিল্পকর্ম সম্পূর্ণ মৌলিক ও অংশগ্রহণকারীর নিজ হাতে রচিত হতে হবে।',
            '2. All handwriting specimens and calligraphy artworks must be original work created solely by the registered participant.'
          )}
        </p>
        <p>
          {t(
            '৩. বিচারকমণ্ডলীর মূল্যায়ন ও ফলাফল চূড়ান্ত বলে বিবেচিত হবে।',
            '3. Evaluations and merit rankings finalized by the HCFB Jury Board are final.'
          )}
        </p>
        <p>
          {t(
            '৪. যেকোনো অনিবার্য কারণে প্রতিযোগিতার তারিখ বা নিয়মাবলী পরিবর্তন করার অধিকার ফাউন্ডেশন কর্তৃপক্ষ সংরক্ষণ করে এবং তা অফিসিয়াল নোটিশ বোর্ডে জানানো হবে।',
            '4. HCFB reserves the right to update schedules or rules when necessary, with official announcements published on the Notice Board.'
          )}
        </p>
      </div>
    </div>
  );
}
