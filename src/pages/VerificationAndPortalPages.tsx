import React, { useEffect, useState, useCallback } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  LogOut,
  Save,
  User,
  Download,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CertificateTemplate, type CertificateData } from '../components/CertificateTemplate';
import { AWARD_LABELS, type EntryPassVerifyResponse } from '../types/hcfb';
import { PaymentMethodLogo } from '../components/PaymentLogos';

export function VerifyCertificatePage({ passToken }: { passToken?: string }) {
  const { t, search, navigate } = useApp();
  const initialQueryCode = new URLSearchParams(search).get('code') || '';
  const [inputVal, setInputVal] = useState(passToken || initialQueryCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entry Pass Verification State
  const [passResult, setPassResult] = useState<EntryPassVerifyResponse | null>(null);

  // Certificate Verification State
  const [certResult, setCertResult] = useState<{
    valid: boolean;
    revoked: boolean;
    certificate: CertificateData;
    qrDataUrl: string;
  } | null>(null);

  const runPassVerify = useCallback(async (token: string) => {
    const clean = token.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setCertResult(null);
    setPassResult(null);
    try {
      const res = await fetch(`/api/public/verify-pass/${encodeURIComponent(clean)}`);
      const json = (await res.json()) as EntryPassVerifyResponse & { error?: string };
      if (!json.result_status && json.error) {
        setError(json.error);
        return;
      }
      setPassResult(json);
    } catch {
      setError('Network error during Entry Pass verification.');
    } finally {
      setLoading(false);
    }
  }, []);

  const runCertVerify = useCallback(async (targetCode: string) => {
    const clean = targetCode.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setPassResult(null);
    setCertResult(null);
    try {
      const res = await fetch(`/api/public/verify-certificate?code=${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Certificate not found.');
        return;
      }
      setCertResult(json);
    } catch {
      setError('Network error during verification.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (passToken) {
      setInputVal(passToken);
      runPassVerify(passToken);
      return;
    }
    const queryCode = new URLSearchParams(search).get('code');
    if (queryCode) {
      setInputVal(queryCode);
      runCertVerify(queryCode);
    }
  }, [passToken, search, runPassVerify, runCertVerify]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inputVal.trim();
    if (!raw) return;

    const urlMatch = raw.match(/\/verify\/([A-Za-z0-9_-]+)/);
    if (urlMatch) {
      navigate(`/verify/${encodeURIComponent(urlMatch[1])}`);
      return;
    }
    if (raw.toUpperCase().startsWith('HCFB-CERT')) {
      runCertVerify(raw);
      return;
    }
    runPassVerify(raw);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <div className="text-center space-y-2 max-w-2xl mx-auto no-print">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0D9488] dark:text-[#5EEAD4] flex items-center justify-center gap-1.5">
          <QrCode className="w-4 h-4" />
          <span>{t('অফিসিয়াল QR যাচাইকরণ কেন্দ্র', 'Official HCFB QR Verification Portal')}</span>
        </p>
        <h1 className="text-3xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
          {passToken
            ? t('প্রতিযোগিতা এন্ট্রি পাস যাচাইকরণ', 'Official Entry Pass Verification')
            : t('এন্ট্রি পাস ও সনদপত্র যাচাই করুন', 'Verify Entry Pass or Certificate')}
        </h1>
        <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75">
          {t(
            'এন্ট্রি পাসের QR কোড স্ক্যান করুন অথবা এন্ট্রি পাস টোকেন / সনদ নম্বর (যেমন HCFB-CERT-2026-00001) দিয়ে যাচাই করুন।',
            'Scan an Entry Pass QR code directly or enter an Entry Pass verification token or Certificate Code (e.g. HCFB-CERT-2026-00001).'
          )}
        </p>
      </div>

      <form onSubmit={handleManualSubmit} className="max-w-xl mx-auto flex gap-2 no-print">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={t('এন্ট্রি পাস টোকেন বা সনদ কোড...', 'Entry Pass token or HCFB-CERT-2026-00001')}
          className="flex-1 px-4 py-3 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0B221D] dark:text-white font-mono text-sm focus:outline-2 focus:outline-[#0D9488]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('যাচাই করুন', 'Verify')}</span>
        </button>
      </form>

      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-200 text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ==================== ANTI-FRAUD ENTRY PASS RESULT ==================== */}
      {passResult && (
        <div className="max-w-2xl mx-auto">
          {(() => {
            const st = passResult.result_status;
            const isAuth = st === 'AUTHENTIC';
            const isPending = st === 'PENDING';

            const bannerCls = isAuth
              ? 'bg-emerald-600 text-white'
              : isPending
                ? 'bg-amber-500 text-white'
                : 'bg-rose-600 text-white';

            const borderCls = isAuth
              ? 'border-emerald-500'
              : isPending
                ? 'border-amber-500'
                : 'border-rose-500';

            const StatusIcon = isAuth ? CheckCircle2 : isPending ? Clock : XCircle;

            return (
              <div
                className={`bg-white dark:bg-[#0B221D] border-2 ${borderCls} rounded-3xl overflow-hidden shadow-xl`}
              >
                <div className={`${bannerCls} px-6 py-5 flex items-center gap-4`}>
                  <StatusIcon className="w-10 h-10 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-90">
                      {passResult.organization}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                      {passResult.headline}
                    </h2>
                    <p className="text-xs font-semibold opacity-95 mt-0.5">{passResult.headline_bn}</p>
                  </div>
                </div>

                {passResult.pass ? (
                  <div className="p-6 sm:p-8 space-y-5">
                    {st === 'REVOKED' && passResult.pass.revoked_reason && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-700/50 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                        Revocation Notice: {passResult.pass.revoked_reason}
                      </div>
                    )}

                    <dl className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('অংশগ্রহণকারীর নাম', 'Participant Name')}</dt>
                        <dd className="font-extrabold text-[#04241D] dark:text-white text-right">
                          {passResult.pass.participant_name_en}
                          {passResult.pass.participant_name_bn &&
                          passResult.pass.participant_name_bn !== passResult.pass.participant_name_en
                            ? ` (${passResult.pass.participant_name_bn})`
                            : ''}
                        </dd>
                      </div>
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('রেজিস্ট্রেশন আইডি', 'Registration ID')}</dt>
                        <dd className="font-mono font-extrabold text-[#05241D] dark:text-[#F3D98B]">
                          {passResult.pass.registration_id}
                        </dd>
                      </div>
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('প্রতিযোগিতা ও বছর', 'Competition & Year')}</dt>
                        <dd className="font-semibold text-right text-[#04241D] dark:text-white">
                          {t(passResult.pass.competition_title_bn, passResult.pass.competition_title_en)} (
                          {passResult.pass.competition_year})
                        </dd>
                      </div>
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('প্রতিযোগিতার বিভাগ', 'Category')}</dt>
                        <dd className="font-semibold text-right text-[#04241D] dark:text-white">
                          {t(passResult.pass.category_name_bn, passResult.pass.category_name_en)}
                        </dd>
                      </div>
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('প্রতিষ্ঠান ও শ্রেণি', 'Institution & Class')}</dt>
                        <dd className="text-right text-[#04241D] dark:text-white">
                          {passResult.pass.institution_name}
                          {passResult.pass.class_level ? ` (${passResult.pass.class_level})` : ''}
                        </dd>
                      </div>
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('পেমেন্ট স্ট্যাটাস', 'Payment Status')}</dt>
                        <dd
                          className={`font-extrabold ${
                            passResult.pass.payment_status === 'PAID'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {passResult.pass.payment_status}
                          {passResult.pass.is_test_payment ? ' (Sandbox)' : ''}
                        </dd>
                      </div>
                      <div className="py-3 flex justify-between gap-4">
                        <dt className="text-slate-600 dark:text-white/70">{t('নিবন্ধন অবস্থা', 'Registration Status')}</dt>
                        <dd className="font-bold uppercase text-[#04241D] dark:text-[#5EEAD4]">
                          {passResult.pass.registration_status}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/60">
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified live against HCFB database</span>
                      </span>
                      <span className="font-mono">{passResult.verified_at.slice(0, 19).replace('T', ' ')} UTC</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 text-center space-y-2">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                      {t(
                        'এই QR টোকেনটি HCFB অফিসিয়াল ডাটাবেসে পাওয়া যায়নি। এটি ভুয়া, পরিবর্তিত অথবা মেয়াদোত্তীর্ণ হতে পারে।',
                        'No matching official pass exists for this verification token. This entry pass may be forged, altered, or superseded.'
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================== LEGACY CERTIFICATE VERIFICATION RESULT ==================== */}
      {certResult && (
        <div className="space-y-6">
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 no-print ${
              certResult.valid
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {certResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {certResult.valid
                  ? t('সনদটি বৈধ ও HCFB ডাটাবেসে সংরক্ষিত রয়েছে।', 'Authentic Certificate — Verified in HCFB Registry.')
                  : t('এই সনদটি বাতিল (Revoked) করা হয়েছে।', 'Notice: This certificate has been revoked.')}
              </p>
            </div>
          </div>

          {certResult.valid && (
            <CertificateTemplate cert={certResult.certificate} qrDataUrl={certResult.qrDataUrl} />
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
    payment_method?: string;
    payment_status?: string;
    payment_amount?: number;
    transaction_id?: string;
    is_test_payment?: number;
    qr_token?: string;
    qr_revoked?: number;
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
  entryPassQrDataUrl?: string;
  entryPassVerifyUrl?: string;
  evaluations: Array<{ total_score: number; remarks: string; evaluated_at: string }>;
}

export function ParticipantPortalPage() {
  const { t, navigate } = useApp();
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#05241D] to-[#0D9488] text-[#F3D98B] mx-auto flex items-center justify-center shadow-md">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
            {t('অংশগ্রহণকারী পোর্টাল', 'Participant Portal')}
          </h1>
          <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75">
            {t(
              'আপনার রেজিস্ট্রেশন নম্বর ও নিবন্ধিত মোবাইল নম্বর দিয়ে লগইন করুন।',
              'Sign in using your Registration ID and registered mobile number.'
            )}
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-[#2DD4BF]/25 rounded-3xl p-7 space-y-4 shadow-sm">
          {authError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
              {authError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('রেজিস্ট্রেশন নম্বর', 'Registration ID')}
            </label>
            <input
              type="text"
              required
              value={regId}
              onChange={(e) => setRegId(e.target.value)}
              placeholder="HCFB-2026-00001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('নিবন্ধিত মোবাইল নম্বর', 'Registered Mobile Number')}
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="01700000001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
          >
            {loading ? t('যাচাই হচ্ছে...', 'Signing In...') : t('প্রবেশ করুন', 'Sign In')}
          </button>
          <p className="text-[11px] text-slate-500 dark:text-white/60 text-center">
            {t('নমুনা পরীক্ষা: HCFB-2026-00001 / 01700000001', 'Sample credentials: HCFB-2026-00001 / 01700000001')}
          </p>
        </form>
      </div>
    );
  }

  const reg = data.registration;
  const award = AWARD_LABELS[reg.award_tier] || AWARD_LABELS.none;
  const canDownloadPass = reg.payment_status === 'PAID' && reg.qr_revoked !== 1 && Boolean(reg.qr_token);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/15 pb-6 no-print">
        <div>
          <p className="text-xs font-mono text-[#0D9488] dark:text-[#5EEAD4] font-bold">{reg.registration_id}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
            {t(reg.name_bn, reg.name_en)}
          </h1>
          <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75">
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
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-white/25 rounded-full text-xs font-bold text-[#04241D] dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('লগআউট', 'Sign Out')}</span>
        </button>
      </div>

      {/* Status, Payment & Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print">
        <div className="bg-[#F5F3FF] dark:bg-[#0B221D] border border-[#DDD6FE] dark:border-white/15 rounded-3xl p-5 space-y-1">
          <p className="text-xs font-semibold text-[#7C3AED] dark:text-[#5EEAD4]">
            {t('নিবন্ধন অবস্থা', 'Registration Status')}
          </p>
          <p className="text-lg font-extrabold text-[#4C1D95] dark:text-white uppercase">{reg.status}</p>
        </div>
        <div className="bg-[#ECFDF5] dark:bg-[#0B221D] border border-[#A7F3D0] dark:border-white/15 rounded-3xl p-5 space-y-1">
          <p className="text-xs font-semibold text-[#059669] dark:text-[#5EEAD4]">
            {t('পেমেন্ট স্ট্যাটাস', 'Payment Status')}
          </p>
          <p className="text-lg font-extrabold text-[#065F46] dark:text-[#F3D98B] uppercase">
            {reg.payment_status || 'PENDING'}
          </p>
          {reg.transaction_id && <p className="text-[11px] font-mono text-slate-600 dark:text-white/65">{reg.transaction_id}</p>}
        </div>
        <div className="bg-[#EFF6FF] dark:bg-[#0B221D] border border-[#BFDBFE] dark:border-white/15 rounded-3xl p-5 space-y-1">
          <p className="text-xs font-semibold text-[#2563EB] dark:text-[#5EEAD4]">
            {t('প্রতিযোগিতার তারিখ', 'Event Date')}
          </p>
          <p className="text-lg font-extrabold font-mono tabular-nums text-[#1E1B4B] dark:text-white">
            {reg.competition_date}
          </p>
        </div>
        <div className="bg-[#FEF9EE] dark:bg-[#0B221D] border border-[#FDE68A] dark:border-white/15 rounded-3xl p-5 space-y-1">
          <p className="text-xs font-semibold text-[#92400E] dark:text-[#F3D98B]">
            {t('ফলাফল ও স্বীকৃতি', 'Result & Standing')}
          </p>
          {reg.results_published === 1 ? (
            <p className="text-lg font-extrabold text-[#065F46] dark:text-white">
              {t(award.bn, award.en)} {reg.total_score !== null ? `(${reg.total_score})` : ''}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[#1E1B4B]/70 dark:text-white/70">
              {t('ফলাফল প্রকাশিত হয়নি', 'Pending Publication')}
            </p>
          )}
        </div>
      </div>

      {/* Official Competition Entry Pass Card */}
      <div className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-[#2DD4BF]/25 rounded-3xl p-6 sm:p-8 shadow-sm no-print">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0D9488] dark:text-[#5EEAD4]">
                {t('অফিসিয়াল প্রতিযোগিতা এন্ট্রি পাস', 'Official Competition Entry Pass')}
              </span>
              {reg.payment_method && reg.payment_method !== 'none' && (
                <PaymentMethodLogo method={reg.payment_method} className="h-6 w-auto" />
              )}
            </div>
            <h2 className="text-xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
              {canDownloadPass
                ? t('আপনার QR যাচাইকৃত এন্ট্রি পাস প্রস্তুত', 'Your QR-Verified Entry Pass is Active')
                : reg.qr_revoked === 1
                  ? t('এই এন্ট্রি পাসটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে', 'This Entry Pass Has Been Revoked')
                  : t('পেমেন্ট সম্পন্ন হলে আপনার এন্ট্রি পাস সক্রিয় হবে', 'Complete Payment to Activate Your Entry Pass')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-white/75 leading-relaxed">
              {t(
                'প্রতিযোগিতার দিনে ভেন্যুতে প্রবেশের সময় এই PDF এন্ট্রি পাস অথবা ডিজিটাল QR কোড প্রদর্শন করুন।',
                'Present this official PDF Entry Pass or digital QR code at the competition venue check-in counter.'
              )}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {canDownloadPass ? (
                <>
                  <a
                    href={`/api/public/registrations/${encodeURIComponent(
                      reg.registration_id
                    )}/entry-pass.pdf?token=${encodeURIComponent(reg.qr_token || '')}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-xs font-extrabold rounded-xl shadow hover:brightness-105"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('এন্ট্রি পাস (PDF) ডাউনলোড করুন', 'Download Entry Pass (PDF)')}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => navigate(`/verify/${encodeURIComponent(reg.qr_token || '')}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-white/25 text-xs font-bold rounded-xl text-[#04241D] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{t('লাইভ সত্যতা যাচাই', 'Verify Live Status')}</span>
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {reg.qr_revoked === 1
                    ? 'Revoked Entry Passes cannot be downloaded or used for entry.'
                    : 'PDF Entry Pass unlocks automatically once payment status is PAID.'}
                </span>
              )}
            </div>
          </div>

          <div className="md:col-span-4 text-center">
            {canDownloadPass && data.entryPassQrDataUrl ? (
              <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
                <img src={data.entryPassQrDataUrl} alt="Participant Entry Pass QR" className="w-36 h-36 mx-auto" />
                <p className="text-[10px] font-bold text-slate-700 max-w-[160px] mx-auto">
                  Scan this QR Code to verify authenticity
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#071915] border border-dashed border-slate-300 dark:border-white/20 text-xs text-slate-500 dark:text-white/60">
                QR Pass Unavailable
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Registration Details & Jury Remarks */}
      <div className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-[#2DD4BF]/25 rounded-3xl p-7 space-y-4 no-print shadow-sm">
        <h2 className="text-lg font-bold text-[#04241D] dark:text-[#F3D98B] font-display">
          {t('আপনার নিবন্ধনের বিস্তারিত তথ্য', 'Registration Record Details')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500 dark:text-white/60">{t('বাংলা নাম', 'Bangla Name')}</dt>
            <dd className="font-bold text-[#1E1B4B] dark:text-white">{reg.name_bn}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-white/60">{t('ইংরেজি নাম', 'English Name')}</dt>
            <dd className="font-bold text-[#1E1B4B] dark:text-white">{reg.name_en}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-white/60">{t('পিতা ও মাতার নাম', 'Parents')}</dt>
            <dd className="text-[#1E1B4B] dark:text-white">{reg.father_name} / {reg.mother_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-white/60">{t('মোবাইল নম্বর', 'Mobile')}</dt>
            <dd className="font-mono tabular-nums text-[#04241D] dark:text-[#F3D98B]">{reg.mobile}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-white/60">{t('জেলা ও উপজেলা', 'District & Upazila')}</dt>
            <dd className="text-[#1E1B4B] dark:text-white">{reg.district}{reg.upazila ? `, ${reg.upazila}` : ''}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-white/60">{t('বিভাগ', 'Category')}</dt>
            <dd className="text-[#1E1B4B] dark:text-white">{t(reg.category_name_bn, reg.category_name_en)}</dd>
          </div>
        </dl>

        {reg.results_published === 1 && data.evaluations.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-white/15 space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#0D9488] dark:text-[#5EEAD4]">
              {t('বিচারকমণ্ডলীর মূল্যায়ন ও মন্তব্য', 'Jury Evaluation & Remarks')}
            </h3>
            {data.evaluations.map((ev, i) => (
              <p key={i} className="text-sm text-[#1E1B4B]/80 dark:text-white/85 bg-[#F5F3FF] dark:bg-[#071915] p-3.5 rounded-2xl border border-[#DDD6FE] dark:border-white/15">
                <strong className="font-mono tabular-nums mr-2 text-[#4C1D95] dark:text-[#F3D98B]">{ev.total_score} pts</strong>
                {ev.remarks || t('মূল্যায়ন সম্পন্ন।', 'Evaluated.')}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Update Permitted Info */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-[#2DD4BF]/25 rounded-3xl p-7 space-y-5 no-print shadow-sm">
        <h2 className="text-lg font-bold text-[#04241D] dark:text-[#F3D98B] font-display">
          {t('অনুমোদিত ব্যক্তিগত তথ্য হালনাগাদ', 'Update Permitted Information')}
        </h2>
        {saveMsg && <p className="text-xs font-bold text-[#059669] dark:text-[#5EEAD4]">{saveMsg}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('শিক্ষা প্রতিষ্ঠান', 'School / Institution')}
            </label>
            <input
              type="text"
              value={editForm.school_name}
              onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('শ্রেণি / স্তর', 'Class / Level')}
            </label>
            <input
              type="text"
              value={editForm.class_level}
              onChange={(e) => setEditForm({ ...editForm, class_level: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('বিকল্প মোবাইল', 'Alternative Mobile')}
            </label>
            <input
              type="tel"
              value={editForm.alt_mobile}
              onChange={(e) => setEditForm({ ...editForm, alt_mobile: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('ইমেইল', 'Email')}
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('উপজেলা', 'Upazila')}
            </label>
            <input
              type="text"
              value={editForm.upazila}
              onChange={(e) => setEditForm({ ...editForm, upazila: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#04241D] dark:text-white mb-1">
              {t('অতিরিক্ত তথ্য', 'Additional Notes')}
            </label>
            <input
              type="text"
              value={editForm.additional_info}
              onChange={(e) => setEditForm({ ...editForm, additional_info: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-xs font-bold rounded-full hover:brightness-105 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t('তথ্য সংরক্ষণ করুন', 'Save Changes')}</span>
        </button>
      </form>

      {/* Issued Certificate */}
      {data.certificate && (
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#04241D] dark:text-[#F3D98B] no-print font-display">
            {t('আপনার অফিসিয়াল সনদপত্র', 'Your Official Certificate')}
          </h2>
          <CertificateTemplate cert={data.certificate} qrDataUrl={data.qrDataUrl} />
        </section>
      )}
    </div>
  );
}
