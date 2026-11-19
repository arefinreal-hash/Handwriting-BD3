import React, { useEffect, useState } from 'react';
import { CheckCircle2, Printer, Search, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BANGLADESH_DISTRICTS, AWARD_LABELS } from '../types/hcfb';

interface ConfirmationResult {
  registration_id: string;
  name_bn: string;
  name_en: string;
  competition_title_bn: string;
  competition_title_en: string;
  category_name_bn: string;
  category_name_en: string;
  submitted_at: string;
  email_status: string;
}

export function RegisterPage() {
  const { t, bootstrap, search, navigate, refreshBootstrap } = useApp();
  const openComps = (bootstrap?.competitions || []).filter((c) => c.status === 'published');
  const fieldCfg = bootstrap?.settings?.registration_field_config || {
    school_name: true,
    class_level: true,
    email: false,
    alt_mobile: false,
    upazila: false,
    additional_info: false,
  };

  const urlParams = new URLSearchParams(search);
  const preselectedComp = urlParams.get('competition');

  const [form, setForm] = useState({
    name_bn: '',
    name_en: '',
    father_name: '',
    mother_name: '',
    school_name: '',
    class_level: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    district: '',
    upazila: '',
    competition_id: preselectedComp || '',
    category_id: '',
    participant_type: 'Student' as 'Student' | 'Other',
    additional_info: '',
    guardian_consent: false,
    privacy_consent: false,
  });

  useEffect(() => {
    if (!form.competition_id && openComps.length > 0) {
      const target = openComps.find((c) => String(c.id) === preselectedComp) || openComps[0];
      setForm((prev) => ({
        ...prev,
        competition_id: String(target.id),
        category_id: target.categories && target.categories[0] ? String(target.categories[0].id) : '',
      }));
    }
  }, [openComps, preselectedComp, form.competition_id]);

  const selectedComp = openComps.find((c) => String(c.id) === form.competition_id);
  const categories = selectedComp?.categories || [];

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const handleCompChange = (compId: string) => {
    const comp = openComps.find((c) => String(c.id) === compId);
    setForm((prev) => ({
      ...prev,
      competition_id: compId,
      category_id: comp?.categories && comp.categories[0] ? String(comp.categories[0].id) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setServerError(null);

    try {
      const res = await fetch('/api/public/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          competition_id: Number(form.competition_id),
          category_id: Number(form.category_id),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.fields) setFieldErrors(json.fields);
        setServerError(json.error || 'Registration could not be completed.');
        return;
      }
      setConfirmation(json.registration);
      refreshBootstrap();
    } catch {
      setServerError(t('সার্ভারে সংযোগ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'Network error while submitting registration.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-6">
        <div className="print-only-card bg-white border-2 border-[#7C3AED] rounded-3xl p-6 sm:p-10 space-y-6 shadow-lg shadow-[#4C1D95]/10">
          <div className="flex items-start gap-4 border-b border-[#EDE9FE] pb-6">
            <CheckCircle2 className="w-10 h-10 text-[#059669] shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#EC4899]">
                HCFB Official Registration Slip
              </p>
              <h1 className="text-2xl font-extrabold text-[#4C1D95] font-display">
                {t('রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে', 'Registration Confirmed')}
              </h1>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#F5F3FF] to-[#FDF2F8] border border-[#DDD6FE] rounded-2xl p-6 text-center space-y-1">
            <p className="text-xs font-semibold text-[#4C1D95]/75">
              {t('আপনার ইউনিক রেজিস্ট্রেশন নম্বর', 'Your Unique Registration ID')}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#4C1D95] tracking-wider">
              {confirmation.registration_id}
            </p>
          </div>

          <dl className="divide-y divide-[#EDE9FE] text-sm">
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('অংশগ্রহণকারীর নাম', 'Participant Name')}</dt>
              <dd className="font-bold text-[#1E1B4B] text-right">
                {confirmation.name_bn} ({confirmation.name_en})
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('প্রতিযোগিতা', 'Competition')}</dt>
              <dd className="font-bold text-[#1E1B4B] text-right">
                {t(confirmation.competition_title_bn, confirmation.competition_title_en)}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('নির্বাচিত বিভাগ', 'Selected Category')}</dt>
              <dd className="font-bold text-[#1E1B4B] text-right">
                {t(confirmation.category_name_bn, confirmation.category_name_en)}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('জমাদানের তারিখ', 'Submission Date')}</dt>
              <dd className="font-mono tabular-nums text-[#4C1D95]">
                {confirmation.submitted_at.slice(0, 10)}
              </dd>
            </div>
          </dl>

          <p className="text-sm text-[#1E1B4B]/85 bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 leading-relaxed">
            আপনার রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে। আপনার রেজিস্ট্রেশন নম্বরটি সংরক্ষণ করুন। প্রতিযোগিতা সংক্রান্ত পরবর্তী তথ্য ওয়েবসাইট ও অফিসিয়াল ফেসবুক পেজে প্রকাশ করা হবে।
          </p>

          <div className="flex flex-wrap gap-3 pt-2 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4C1D95] text-white text-sm font-bold rounded-full hover:bg-[#5B21B6] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('প্রিন্ট / PDF সংরক্ষণ করুন', 'Print / Download Confirmation')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="px-6 py-2.5 border border-[#DDD6FE] text-[#4C1D95] text-sm font-bold rounded-full hover:bg-[#F5F3FF] cursor-pointer"
            >
              {t('অংশগ্রহণকারী পোর্টালে যান', 'Open Participant Portal')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <header className="space-y-2 border-b border-[#EDE9FE] pb-6">
        <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#EC4899]">
          {t('অনলাইন আবেদন ফরম', 'Online Competition Registration')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
          {t('প্রতিযোগিতায় নিবন্ধন করুন', 'Register for Competition')}
        </h1>
        <p className="text-sm text-[#1E1B4B]/75">
          {t(
            'সঠিক তথ্য দিয়ে নিচের ফরমটি পূরণ করুন। তারকাচিহ্নিত (*) ঘরগুলো পূরণ করা বাধ্যতামূলক।',
            'Please complete the form accurately. Fields marked with (*) are required.'
          )}
        </p>
      </header>

      {openComps.length === 0 ? (
        <div className="bg-white border border-[#EDE9FE] rounded-3xl p-10 text-center space-y-3 shadow-sm">
          <p className="text-base font-bold text-[#4C1D95]">
            {t('এই মুহূর্তে কোনো প্রতিযোগিতার নিবন্ধন চালু নেই।', 'No competitions are currently open for registration.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="px-6 py-2.5 bg-[#4C1D95] text-white text-sm font-bold rounded-full cursor-pointer"
          >
            {t('প্রতিযোগিতা তালিকা দেখুন', 'Browse Competitions')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-[#EDE9FE] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
          {serverError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Competition Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-5 border-b border-[#EDE9FE]">
            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('প্রতিযোগিতার নাম *', 'Competition Name *')}
              </label>
              <select
                required
                value={form.competition_id}
                onChange={(e) => handleCompChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF]/60 text-sm focus:outline-2 focus:outline-[#7C3AED]"
              >
                {openComps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.title_bn, c.title_en)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('প্রতিযোগিতার বিভাগ/ক্যাটাগরি *', 'Competition Category *')}
              </label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF]/60 text-sm focus:outline-2 focus:outline-[#7C3AED]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {t(cat.name_bn, cat.name_en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('অংশগ্রহণকারীর পূর্ণ নাম (বাংলায়) *', "Participant's Full Name (Bangla) *")}
              </label>
              <input
                type="text"
                required
                value={form.name_bn}
                onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm focus:outline-2 focus:outline-[#7C3AED]"
              />
              {fieldErrors.name_bn && <p className="text-xs text-red-600 mt-1">{fieldErrors.name_bn}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('অংশগ্রহণকারীর পূর্ণ নাম (ইংরেজিতে) *', "Participant's Full Name (English) *")}
              </label>
              <input
                type="text"
                required
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="e.g., Tanvir Ahmed"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm focus:outline-2 focus:outline-[#7C3AED]"
              />
              {fieldErrors.name_en && <p className="text-xs text-red-600 mt-1">{fieldErrors.name_en}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('পিতার নাম *', "Father's Name *")}
              </label>
              <input
                type="text"
                required
                value={form.father_name}
                onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm focus:outline-2 focus:outline-[#7C3AED]"
              />
              {fieldErrors.father_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.father_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('মাতার নাম *', "Mother's Name *")}
              </label>
              <input
                type="text"
                required
                value={form.mother_name}
                onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm focus:outline-2 focus:outline-[#7C3AED]"
              />
              {fieldErrors.mother_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.mother_name}</p>}
            </div>
          </div>

          {/* Academic & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('অংশগ্রহণকারীর ধরন *', 'Participant Type *')}
              </label>
              <select
                value={form.participant_type}
                onChange={(e) => setForm({ ...form, participant_type: e.target.value as 'Student' | 'Other' })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              >
                <option value="Student">{t('শিক্ষার্থী (Student)', 'Student')}</option>
                <option value="Other">{t('অন্যান্য (Other)', 'Other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('শিক্ষা প্রতিষ্ঠান / বিদ্যালয়ের নাম', 'School / Institution Name')} {fieldCfg.school_name ? '*' : ''}
              </label>
              <input
                type="text"
                required={fieldCfg.school_name}
                value={form.school_name}
                onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
              {fieldErrors.school_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.school_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('শ্রেণি / একাডেমিক স্তর', 'Class / Academic Level')} {fieldCfg.class_level ? '*' : ''}
              </label>
              <input
                type="text"
                required={fieldCfg.class_level}
                value={form.class_level}
                onChange={(e) => setForm({ ...form, class_level: e.target.value })}
                placeholder="e.g., Class 8 / HSC / Open"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
              {fieldErrors.class_level && <p className="text-xs text-red-600 mt-1">{fieldErrors.class_level}</p>}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('মোবাইল নম্বর (বাংলাদেশি) *', 'Mobile Number *')}
              </label>
              <input
                type="tel"
                required
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm font-mono"
              />
              {fieldErrors.mobile && <p className="text-xs text-red-600 mt-1">{fieldErrors.mobile}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('বিকল্প মোবাইল নম্বর', 'Alternative Mobile')} {fieldCfg.alt_mobile ? '*' : t('(ঐচ্ছিক)', '(Optional)')}
              </label>
              <input
                type="tel"
                required={fieldCfg.alt_mobile}
                value={form.alt_mobile}
                onChange={(e) => setForm({ ...form, alt_mobile: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm font-mono"
              />
              {fieldErrors.alt_mobile && <p className="text-xs text-red-600 mt-1">{fieldErrors.alt_mobile}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('ইমেইল ঠিকানা', 'Email Address')} {fieldCfg.email ? '*' : t('(ঐচ্ছিক)', '(Optional)')}
              </label>
              <input
                type="email"
                required={fieldCfg.email}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
              {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('জেলা *', 'District *')}
              </label>
              <select
                required
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              >
                <option value="">{t('জেলা নির্বাচন করুন', 'Select District')}</option>
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {fieldErrors.district && <p className="text-xs text-red-600 mt-1">{fieldErrors.district}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
                {t('উপজেলা / থানা', 'Upazila')} {fieldCfg.upazila ? '*' : t('(ঐচ্ছিক)', '(Optional)')}
              </label>
              <input
                type="text"
                required={fieldCfg.upazila}
                value={form.upazila}
                onChange={(e) => setForm({ ...form, upazila: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4C1D95] mb-1.5">
              {t('অতিরিক্ত তথ্য', 'Additional Information')} {fieldCfg.additional_info ? '*' : t('(ঐচ্ছিক)', '(Optional)')}
            </label>
            <textarea
              rows={2}
              required={fieldCfg.additional_info}
              value={form.additional_info}
              onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-[#EDE9FE]">
            {form.participant_type === 'Student' && (
              <label className="flex items-start gap-2.5 text-sm text-[#1E1B4B]/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.guardian_consent}
                  onChange={(e) => setForm({ ...form, guardian_consent: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#7C3AED]"
                />
                <span>
                  {t(
                    'অপ্রাপ্তবয়স্ক/শিক্ষার্থী অংশগ্রহণকারীর পিতা-মাতা বা অভিভাবকের পূর্ণ সম্মতি সাপেক্ষে এই আবেদন জমা দেওয়া হচ্ছে। *',
                    'I confirm parental/guardian consent for this student/minor participant to join the competition. *'
                  )}
                </span>
              </label>
            )}
            {fieldErrors.guardian_consent && <p className="text-xs text-red-600">{fieldErrors.guardian_consent}</p>}

            <label className="flex items-start gap-2.5 text-sm text-[#1E1B4B]/85 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacy_consent}
                onChange={(e) => setForm({ ...form, privacy_consent: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#7C3AED]"
              />
              <span>
                {t(
                  'আমি HCFB-এর গোপনীয়তা নীতি ও প্রতিযোগিতার শর্তাবলী পড়েছি এবং প্রদত্ত তথ্য সঠিক বলে প্রত্যয়ন করছি। *',
                  'I agree to the HCFB Privacy Policy and Terms & Conditions, and certify that all submitted information is accurate. *'
                )}
              </span>
            </label>
            {fieldErrors.privacy_consent && <p className="text-xs text-red-600">{fieldErrors.privacy_consent}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] hover:brightness-105 disabled:opacity-60 text-white text-sm font-bold rounded-full shadow-md transition-all cursor-pointer"
          >
            {submitting
              ? t('সংরক্ষণ করা হচ্ছে...', 'Submitting Registration...')
              : t('নিবন্ধন জমা দিন', 'Submit Registration')}
          </button>
        </form>
      )}
    </div>
  );
}

export function TrackRegistrationPage() {
  const { t, navigate } = useApp();
  const [regId, setRegId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regId.trim()) return;
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      const res = await fetch(`/api/public/track/${encodeURIComponent(regId.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Registration ID not found.');
        return;
      }
      setRecord(json.record);
    } catch {
      setError('Network error while checking status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#EC4899]">
          {t('আবেদন যাচাই', 'Registration Tracking')}
        </p>
        <h1 className="text-3xl font-extrabold text-[#4C1D95] font-display">
          {t('রেজিস্ট্রেশন নম্বর ট্র্যাক করুন', 'Track Your Registration')}
        </h1>
        <p className="text-sm text-[#1E1B4B]/75">
          {t('উদাহরণ: HCFB-2026-00001 (নমুনা রেকর্ড)', 'Example sample ID: HCFB-2026-00001')}
        </p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-2">
        <input
          type="text"
          value={regId}
          onChange={(e) => setRegId(e.target.value)}
          placeholder="HCFB-2026-00001"
          className="flex-1 px-4 py-3 rounded-full border border-[#DDD6FE] bg-white font-mono text-sm focus:outline-2 focus:outline-[#7C3AED]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? t('খুঁজছে...', 'Checking...') : t('অনুসন্ধান', 'Track')}</span>
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {record && (
        <div className="bg-white border border-[#EDE9FE] rounded-3xl p-7 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EDE9FE] pb-3">
            <span className="font-mono font-bold text-[#4C1D95]">{String(record.registration_id)}</span>
            <span className="text-xs font-bold text-[#059669] uppercase">
              {String(record.status)}
            </span>
          </div>
          <dl className="divide-y divide-[#EDE9FE] text-sm">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('অংশগ্রহণকারী', 'Participant')}</dt>
              <dd className="font-bold text-[#1E1B4B]">
                {t(String(record.name_bn), String(record.name_en))}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('প্রতিযোগিতা', 'Competition')}</dt>
              <dd className="text-right font-semibold text-[#1E1B4B]">
                {t(String(record.competition_title_bn), String(record.competition_title_en))}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('বিভাগ', 'Category')}</dt>
              <dd className="text-right text-[#1E1B4B]">
                {t(String(record.category_name_bn), String(record.category_name_en))}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65">{t('জেলা', 'District')}</dt>
              <dd className="text-[#1E1B4B]">{String(record.district)}</dd>
            </div>
            {record.results_published === 1 && record.award_tier !== 'none' && (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#1E1B4B]/65">{t('ফলাফল', 'Award')}</dt>
                <dd className="font-bold text-[#7C3AED]">
                  {t(
                    (AWARD_LABELS[String(record.award_tier)] || AWARD_LABELS.merit).bn,
                    (AWARD_LABELS[String(record.award_tier)] || AWARD_LABELS.merit).en
                  )}
                </dd>
              </div>
            )}
          </dl>
          {Boolean(record.certificate_code) && (
            <button
              type="button"
              onClick={() => navigate(`/verify?code=${record.certificate_code}`)}
              className="w-full py-3 bg-[#4C1D95] text-white text-xs font-bold rounded-full hover:bg-[#5B21B6] cursor-pointer"
            >
              {t('যাচাইকৃত সনদ দেখুন', 'View Verified Certificate')} ({String(record.certificate_code)})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
