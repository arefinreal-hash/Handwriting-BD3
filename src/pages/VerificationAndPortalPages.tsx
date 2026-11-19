import React, { useEffect, useState, useCallback } from 'react';
import { QrCode, CheckCircle2, AlertTriangle, LogOut, Save, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CertificateTemplate, type CertificateData } from '../components/CertificateTemplate';
import { AWARD_LABELS } from '../types/hcfb';

export function VerifyCertificatePage() {
  const { t, search } = useApp();
  const [code, setCode] = useState(() => new URLSearchParams(search).get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    valid: boolean;
    revoked: boolean;
    certificate: CertificateData;
    qrDataUrl: string;
  } | null>(null);

  const runVerify = useCallback(async (targetCode: string) => {
    const clean = targetCode.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/public/verify-certificate?code=${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Certificate not found.');
        return;
      }
      setResult(json);
    } catch {
      setError('Network error during verification.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = new URLSearchParams(search).get('code');
    if (initial) {
      setCode(initial);
      runVerify(initial);
    }
  }, [search, runVerify]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <div className="text-center space-y-2 max-w-2xl mx-auto no-print">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#EC4899] flex items-center justify-center gap-1.5">
          <QrCode className="w-4 h-4 text-[#7C3AED]" />
          <span>{t('ডিজিটাল সনদ যাচাই', 'QR Certificate Verification')}</span>
        </p>
        <h1 className="text-3xl font-extrabold text-[#4C1D95] font-display">
          {t('সনদপত্রের সত্যতা যাচাই করুন', 'Verify Certificate Authenticity')}
        </h1>
        <p className="text-sm text-[#1E1B4B]/75">
          {t('নমুনা কোড পরীক্ষা করতে লিখুন: HCFB-CERT-2026-00001', 'Sample verification code: HCFB-CERT-2026-00001')}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runVerify(code);
        }}
        className="max-w-xl mx-auto flex gap-2 no-print"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="HCFB-CERT-2026-00001"
          className="flex-1 px-4 py-3 rounded-full border border-[#DDD6FE] bg-white font-mono text-sm focus:outline-2 focus:outline-[#7C3AED]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
        >
          {loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('যাচাই করুন', 'Verify')}
        </button>
      </form>

      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 no-print ${
              result.valid
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {result.valid ? (
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {result.valid
                  ? t('সনদটি বৈধ ও HCFB ডাটাবেসে সংরক্ষিত রয়েছে।', 'Authentic Certificate — Verified in HCFB Registry.')
                  : t('এই সনদটি বাতিল (Revoked) করা হয়েছে।', 'Notice: This certificate has been revoked.')}
              </p>
            </div>
          </div>

          {result.valid && (
            <CertificateTemplate cert={result.certificate} qrDataUrl={result.qrDataUrl} />
          )}
        </div>
      )}
    </div>
  );
}

interface ParticipantData {
  registration: {
    id: number;
    registration_id: string;
    name_bn: string;
    name_en: string;
    father_name: string;
    mother_name: string;
    school_name: string;
    class_level: string;
    mobile: string;
    alt_mobile: string;
    email: string;
    district: string;
    upazila: string;
    additional_info: string;
    status: string;
    award_tier: string;
    total_score: number | null;
    rank_position: number | null;
    competition_title_bn: string;
    competition_title_en: string;
    competition_date: string;
    results_published: number;
    category_name_bn: string;
    category_name_en: string;
  };
  certificate: CertificateData | null;
  qrDataUrl: string;
  evaluations: Array<{ total_score: number; remarks: string; evaluated_at: string }>;
}

export function ParticipantPortalPage() {
  const { t } = useApp();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('hcfb_participant_token'));
  const [regId, setRegId] = useState('');
  const [mobile, setMobile] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ParticipantData | null>(null);
  const [editForm, setEditForm] = useState({
    school_name: '',
    class_level: '',
    alt_mobile: '',
    email: '',
    upazila: '',
    additional_info: '',
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async (tok: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/participant/me', {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) {
        sessionStorage.removeItem('hcfb_participant_token');
        setToken(null);
        return;
      }
      const json = (await res.json()) as ParticipantData;
      setData(json);
      setEditForm({
        school_name: json.registration.school_name || '',
        class_level: json.registration.class_level || '',
        alt_mobile: json.registration.alt_mobile || '',
        email: json.registration.email || '',
        upazila: json.registration.upazila || '',
        additional_info: json.registration.additional_info || '',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchProfile(token);
  }, [token, fetchProfile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/participant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: regId, mobile }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || 'Login failed');
        return;
      }
      sessionStorage.setItem('hcfb_participant_token', json.token);
      setToken(json.token);
    } catch {
      setAuthError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaveMsg(null);
    const res = await fetch('/api/participant/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editForm),
    });
    const json = await res.json();
    if (res.ok) {
      setSaveMsg(t('তথ্য সফলভাবে হালনাগাদ হয়েছে।', 'Permitted information updated successfully.'));
      fetchProfile(token);
    } else {
      setSaveMsg(json.error || 'Update failed');
    }
  };

  if (!token || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 lg:py-20 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white mx-auto flex items-center justify-center shadow-md">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4C1D95] font-display">
            {t('অংশগ্রহণকারী পোর্টাল', 'Participant Portal')}
          </h1>
          <p className="text-sm text-[#1E1B4B]/75">
            {t(
              'আপনার রেজিস্ট্রেশন নম্বর ও নিবন্ধিত মোবাইল নম্বর দিয়ে লগইন করুন।',
              'Sign in using your Registration ID and registered mobile number.'
            )}
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-[#EDE9FE] rounded-3xl p-7 space-y-4 shadow-sm">
          {authError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
              {authError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('রেজিস্ট্রেশন নম্বর', 'Registration ID')}
            </label>
            <input
              type="text"
              required
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
              placeholder="HCFB-2026-00001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('নিবন্ধিত মোবাইল নম্বর', 'Registered Mobile Number')}
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="01700000001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
          >
            {loading ? t('যাচাই হচ্ছে...', 'Signing In...') : t('প্রবেশ করুন', 'Sign In')}
          </button>
          <p className="text-[11px] text-[#4C1D95]/65 text-center">
            {t('নমুনা পরীক্ষা: HCFB-2026-00001 / 01700000001', 'Sample credentials: HCFB-2026-00001 / 01700000001')}
          </p>
        </form>
      </div>
    );
  }

  const reg = data.registration;
  const award = AWARD_LABELS[reg.award_tier] || AWARD_LABELS.none;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDE9FE] pb-6 no-print">
        <div>
          <p className="text-xs font-mono text-[#EC4899] font-bold">{reg.registration_id}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4C1D95] font-display">
            {t(reg.name_bn, reg.name_en)}
          </h1>
          <p className="text-sm text-[#1E1B4B]/75">
            {t(reg.competition_title_bn, reg.competition_title_en)} · {t(reg.category_name_bn, reg.category_name_en)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('hcfb_participant_token');
            setToken(null);
            setData(null);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#DDD6FE] rounded-full text-xs font-bold text-[#4C1D95] hover:bg-[#F5F3FF] cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('লগআউট', 'Sign Out')}</span>
        </button>
      </div>

      {/* Status & Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
        <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-3xl p-6 space-y-1">
          <p className="text-xs font-semibold text-[#7C3AED]">{t('বর্তমান অবস্থা', 'Registration Status')}</p>
          <p className="text-lg font-extrabold text-[#4C1D95] uppercase">{reg.status}</p>
        </div>
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-3xl p-6 space-y-1">
          <p className="text-xs font-semibold text-[#2563EB]">{t('প্রতিযোগিতার তারিখ', 'Event Date')}</p>
          <p className="text-lg font-extrabold font-mono tabular-nums text-[#1E1B4B]">{reg.competition_date}</p>
        </div>
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-3xl p-6 space-y-1">
          <p className="text-xs font-semibold text-[#059669]">{t('ফলাফল ও স্বীকৃতি', 'Result & Standing')}</p>
          {reg.results_published === 1 ? (
            <p className="text-lg font-extrabold text-[#065F46]">
              {t(award.bn, award.en)} {reg.total_score !== null ? `(${reg.total_score})` : ''}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[#1E1B4B]/70">{t('ফলাফল প্রকাশিত হয়নি', 'Pending Publication')}</p>
          )}
        </div>
      </div>

      {/* Full Registration Details & Jury Remarks */}
      <div className="bg-white border border-[#EDE9FE] rounded-3xl p-7 space-y-4 no-print shadow-sm">
        <h2 className="text-lg font-bold text-[#4C1D95] font-display">
          {t('আপনার নিবন্ধনের বিস্তারিত তথ্য', 'Registration Record Details')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[#1E1B4B]/60">{t('বাংলা নাম', 'Bangla Name')}</dt>
            <dd className="font-bold text-[#1E1B4B]">{reg.name_bn}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#1E1B4B]/60">{t('ইংরেজি নাম', 'English Name')}</dt>
            <dd className="font-bold text-[#1E1B4B]">{reg.name_en}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#1E1B4B]/60">{t('পিতা ও মাতার নাম', 'Parents')}</dt>
            <dd className="text-[#1E1B4B]">{reg.father_name} / {reg.mother_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#1E1B4B]/60">{t('মোবাইল নম্বর', 'Mobile')}</dt>
            <dd className="font-mono tabular-nums text-[#4C1D95]">{reg.mobile}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#1E1B4B]/60">{t('জেলা ও উপজেলা', 'District & Upazila')}</dt>
            <dd className="text-[#1E1B4B]">{reg.district}{reg.upazila ? `, ${reg.upazila}` : ''}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#1E1B4B]/60">{t('বিভাগ', 'Category')}</dt>
            <dd className="text-[#1E1B4B]">{t(reg.category_name_bn, reg.category_name_en)}</dd>
          </div>
        </dl>

        {reg.results_published === 1 && data.evaluations.length > 0 && (
          <div className="pt-4 border-t border-[#EDE9FE] space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#7C3AED]">
              {t('বিচারকমণ্ডলীর মূল্যায়ন ও মন্তব্য', 'Jury Evaluation & Remarks')}
            </h3>
            {data.evaluations.map((ev, i) => (
              <p key={i} className="text-sm text-[#1E1B4B]/80 bg-[#F5F3FF] p-3.5 rounded-2xl border border-[#DDD6FE]">
                <strong className="font-mono tabular-nums mr-2 text-[#4C1D95]">{ev.total_score} pts</strong>
                {ev.remarks || t('মূল্যায়ন সম্পন্ন।', 'Evaluated.')}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Update Permitted Info */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-[#EDE9FE] rounded-3xl p-7 space-y-5 no-print shadow-sm">
        <h2 className="text-lg font-bold text-[#4C1D95] font-display">
          {t('অনুমোদিত ব্যক্তিগত তথ্য হালনাগাদ', 'Update Permitted Information')}
        </h2>
        {saveMsg && <p className="text-xs font-bold text-[#059669]">{saveMsg}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('শিক্ষা প্রতিষ্ঠান', 'School / Institution')}
            </label>
            <input
              type="text"
              value={editForm.school_name}
              onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('শ্রেণি / স্তর', 'Class / Level')}
            </label>
            <input
              type="text"
              value={editForm.class_level}
              onChange={(e) => setEditForm({ ...editForm, class_level: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('বিকল্প মোবাইল', 'Alternative Mobile')}
            </label>
            <input
              type="tel"
              value={editForm.alt_mobile}
              onChange={(e) => setEditForm({ ...editForm, alt_mobile: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('ইমেইল', 'Email')}
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('উপজেলা', 'Upazila')}
            </label>
            <input
              type="text"
              value={editForm.upazila}
              onChange={(e) => setEditForm({ ...editForm, upazila: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">
              {t('অতিরিক্ত তথ্য', 'Additional Notes')}
            </label>
            <input
              type="text"
              value={editForm.additional_info}
              onChange={(e) => setEditForm({ ...editForm, additional_info: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4C1D95] text-white text-xs font-bold rounded-full hover:bg-[#7C3AED] cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t('তথ্য সংরক্ষণ করুন', 'Save Changes')}</span>
        </button>
      </form>

      {/* Issued Certificate */}
      {data.certificate && (
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#4C1D95] no-print font-display">
            {t('আপনার অফিসিয়াল সনদপত্র', 'Your Official Certificate')}
          </h2>
          <CertificateTemplate cert={data.certificate} qrDataUrl={data.qrDataUrl} />
        </section>
      )}
    </div>
  );
}
