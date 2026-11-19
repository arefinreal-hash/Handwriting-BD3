import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Search,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Upload,
  ShieldCheck,
  Download,
  QrCode,
  Home,
  Clock,
  FileCheck2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BANGLADESH_DISTRICTS, AWARD_LABELS } from '../types/hcfb';
import { PaymentMethodLogo, type MobilePaymentMethod } from '../components/PaymentLogos';

const DRAFT_STORAGE_KEY = 'hcfb_reg_draft_v1';

interface ConfirmationPayload {
  tran_id: string;
  payment_method: string;
  amount: number;
  currency: string;
  gateway_mode: string;
  is_test: number;
  txn_status: string;
  verified_at?: string;
  registration_id: string;
  name_bn: string;
  name_en: string;
  school_name: string;
  class_level: string;
  district: string;
  payment_status: string;
  qr_token: string;
  qr_revoked: number;
  created_at: string;
  email_dispatch_status?: string;
  competition_title_bn: string;
  competition_title_en: string;
  competition_date: string;
  category_name_bn: string;
  category_name_en: string;
  verify_url: string;
  qr_data_url: string;
}

interface InitiateSession {
  registration_id: string;
  tran_id: string;
  amount: number;
  currency: string;
  payment_method: MobilePaymentMethod | 'free';
  gateway_mode: 'live' | 'sandbox' | 'free';
  gateway_configured: boolean;
  is_live_gateway: boolean;
  otp_delivery_mode: 'sms_gateway' | 'sandbox_log';
  sandbox_otp_preview?: string;
}

interface Step1FormState {
  name_en: string;
  name_bn: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  school_name: string;
  class_level: string;
  mobile: string;
  email: string;
  full_address: string;
  district: string;
  competition_id: string;
  category_id: string;
  sample_file_url: string;
  sample_file_name: string;
  privacy_consent: boolean;
}

const DEFAULT_FORM: Step1FormState = {
  name_en: '',
  name_bn: '',
  father_name: '',
  mother_name: '',
  date_of_birth: '',
  gender: '',
  school_name: '',
  class_level: '',
  mobile: '',
  email: '',
  full_address: '',
  district: 'Dhaka',
  competition_id: '',
  category_id: '',
  sample_file_url: '',
  sample_file_name: '',
  privacy_consent: false,
};

export function RegisterPage() {
  const { t, bootstrap, search, navigate, refreshBootstrap } = useApp();
  const openComps = (bootstrap?.competitions || []).filter((c) => c.status === 'published');

  const urlParams = new URLSearchParams(search);
  const preselectedComp = urlParams.get('competition');
  const paymentResultParam = urlParams.get('payment_result');
  const tranIdParam = urlParams.get('tran_id');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<Step1FormState>(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { form?: Partial<Step1FormState> };
        if (parsed.form) return { ...DEFAULT_FORM, ...parsed.form };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_FORM;
  });

  const [paymentMethod, setPaymentMethod] = useState<MobilePaymentMethod>(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { paymentMethod?: MobilePaymentMethod };
        if (parsed.paymentMethod && ['bkash', 'nagad', 'rocket'].includes(parsed.paymentMethod)) {
          return parsed.paymentMethod;
        }
      }
    } catch {
      // ignore
    }
    return 'bkash';
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadingSample, setUploadingSample] = useState(false);

  // Step 2 & 3 state
  const [submitting, setSubmitting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<InitiateSession | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sandboxGateReady, setSandboxGateReady] = useState(false);
  const [gatewayRedirectUrl, setGatewayRedirectUrl] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationPayload | null>(null);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Persist draft across steps 1-2
  useEffect(() => {
    if (step < 4) {
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, paymentMethod }));
      } catch {
        // ignore
      }
    }
  }, [form, paymentMethod, step]);

  // Select default competition once bootstrap loads
  useEffect(() => {
    if (openComps.length > 0 && !form.competition_id) {
      const target =
        (preselectedComp && openComps.find((c) => String(c.id) === preselectedComp)) || openComps[0];
      setForm((prev) => ({
        ...prev,
        competition_id: String(target.id),
        category_id: target.categories && target.categories[0] ? String(target.categories[0].id) : '',
      }));
    }
  }, [openComps, preselectedComp, form.competition_id]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const loadPaymentConfirmation = useCallback(
    async (tranId: string) => {
      try {
        const res = await fetch(`/api/public/payment-status/${encodeURIComponent(tranId)}`);
        const json = await res.json();
        if (res.ok && json.confirmation) {
          setConfirmation(json.confirmation);
          if (json.confirmation.payment_status === 'PAID') {
            setStep(4);
            try {
              sessionStorage.removeItem(DRAFT_STORAGE_KEY);
            } catch {
              // ignore
            }
            refreshBootstrap();
          } else {
            setServerError(
              t(
                'পেমেন্ট এখনো সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
                'Payment has not been completed yet. Please try again.'
              )
            );
          }
        }
      } catch {
        setServerError('Unable to verify transaction status from server.');
      }
    },
    [refreshBootstrap, t]
  );

  // Handle SSLCOMMERZ gateway return query parameters
  useEffect(() => {
    if (!paymentResultParam) return;
    if (paymentResultParam === 'success' && tranIdParam) {
      loadPaymentConfirmation(tranIdParam);
    } else if (paymentResultParam === 'failed') {
      setServerError(
        t(
          'পেমেন্ট গেটওয়েতে লেনদেন ব্যর্থ হয়েছে। আপনি পুনরায় পেমেন্ট চেষ্টা করতে পারেন।',
          'Payment could not be completed at the gateway. You can select a payment method and try again.'
        )
      );
      setStep(2);
    } else if (paymentResultParam === 'cancelled') {
      setServerError(
        t(
          'পেমেন্ট বাতিল করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
          'Payment was cancelled. Please select your payment method to continue.'
        )
      );
      setStep(2);
    }
  }, [paymentResultParam, tranIdParam, loadPaymentConfirmation, t]);

  const selectedComp = openComps.find((c) => String(c.id) === form.competition_id) || openComps[0];
  const categories = selectedComp?.categories || [];
  const selectedCat = categories.find((cat) => String(cat.id) === form.category_id) || categories[0];
  const competitionFee = Number(selectedComp?.registration_fee ?? 200);

  const handleCompChange = (compId: string) => {
    const comp = openComps.find((c) => String(c.id) === compId);
    setForm((prev) => ({
      ...prev,
      competition_id: compId,
      category_id: comp?.categories && comp.categories[0] ? String(comp.categories[0].id) : '',
    }));
  };

  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSample(true);
    setServerError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/public/upload-sample', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || 'Could not upload handwriting sample.');
        return;
      }
      setForm((prev) => ({
        ...prev,
        sample_file_url: json.url,
        sample_file_name: json.filename || file.name,
      }));
    } catch {
      setServerError('Network error while uploading handwriting sample.');
    } finally {
      setUploadingSample(false);
    }
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.name_en.trim().length < 2) {
      errs.name_en = t('অংশগ্রহণকারীর পূর্ণ নাম (ইংরেজি) আবশ্যক।', "Participant's full name is required.");
    }
    if (form.father_name.trim().length < 2) {
      errs.father_name = t('পিতার নাম আবশ্যক।', "Father's name is required.");
    }
    if (form.mother_name.trim().length < 2) {
      errs.mother_name = t('মাতার নাম আবশ্যক।', "Mother's name is required.");
    }
    if (!form.date_of_birth) {
      errs.date_of_birth = t('জন্ম তারিখ আবশ্যক।', 'Date of birth is required.');
    }
    if (!form.gender) {
      errs.gender = t('লিঙ্গ নির্বাচন করুন।', 'Please select gender.');
    }
    if (form.school_name.trim().length < 2) {
      errs.school_name = t('শিক্ষা প্রতিষ্ঠান / বিদ্যালয়ের নাম আবশ্যক।', 'Institution / school name is required.');
    }
    if (form.class_level.trim().length < 1) {
      errs.class_level = t('শ্রেণি / স্তর আবশ্যক।', 'Class / grade is required.');
    }
    const cleanMob = form.mobile.replace(/[\s-]/g, '').replace(/^\+?88/, '');
    if (!/^01[3-9]\d{8}$/.test(cleanMob)) {
      errs.mobile = t(
        'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)।',
        'Enter a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX).'
      );
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = t('সঠিক ইমেইল ঠিকানা দিন।', 'Enter a valid email address.');
    }
    if (form.full_address.trim().length < 5) {
      errs.full_address = t('পূর্ণ ঠিকানা আবশ্যক।', 'Full address is required.');
    }
    if (!form.competition_id) {
      errs.competition_id = t('প্রতিযোগিতা নির্বাচন করুন।', 'Select a competition.');
    }
    if (!form.category_id) {
      errs.category_id = t('বিভাগ নির্বাচন করুন।', 'Select a category.');
    }
    if (!form.privacy_consent) {
      errs.privacy_consent = t('শর্তাবলীতে সম্মতি আবশ্যক।', 'Consent to terms & privacy policy is required.');
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setServerError(
        t('অনুগ্রহ করে লাল চিহ্নিত ঘরগুলো সঠিকভাবে পূরণ করুন।', 'Please fix the highlighted fields before continuing.')
      );
      return false;
    }
    setServerError(null);
    return true;
  };

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProceedToPayment = async () => {
    setSubmitting(true);
    setServerError(null);
    setOtpVerified(false);
    setSandboxGateReady(false);
    setGatewayRedirectUrl(null);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const res = await fetch('/api/public/registrations/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          competition_id: Number(form.competition_id),
          category_id: Number(form.category_id),
          payment_method: paymentMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.fields) setFieldErrors(json.fields);
        setServerError(json.error || 'Could not initiate registration.');
        return;
      }
      setSessionInfo(json as InitiateSession);
      setOtpCountdown(Number(json.resend_cooldown || 60));
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setServerError(t('সার্ভারে সংযোগ করা যায়নি।', 'Network error initiating payment session.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpDigitChange = (index: number, rawVal: string) => {
    const clean = rawVal.replace(/\D/g, '');
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const next = [...otpDigits];
      chars.forEach((ch, idx) => {
        if (index + idx < 6) next[index + idx] = ch;
      });
      setOtpDigits(next);
      const focusIdx = Math.min(5, index + chars.length);
      otpInputRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionInfo) return;
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setServerError(t('৬ ডিজিটের OTP কোড দিন।', 'Please enter all 6 digits of the verification OTP.'));
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/public/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tran_id: sessionInfo.tran_id, otp: code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || 'OTP verification failed.');
        return;
      }

      setOtpVerified(true);

      if (json.next_action === 'confirmed') {
        await loadPaymentConfirmation(sessionInfo.tran_id);
        return;
      }

      if (json.next_action === 'gateway_redirect' && json.gateway_url) {
        setGatewayRedirectUrl(json.gateway_url);
        window.location.href = json.gateway_url;
        return;
      }

      if (json.next_action === 'sandbox_gateway') {
        setSandboxGateReady(true);
      }
    } catch {
      setServerError(t('OTP যাচাইয়ের সময় নেটওয়ার্ক ত্রুটি হয়েছে।', 'Network error verifying OTP.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!sessionInfo || otpCountdown > 0) return;
    setServerError(null);
    try {
      const res = await fetch('/api/public/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tran_id: sessionInfo.tran_id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || 'Could not resend OTP yet.');
        if (json.retry_after) setOtpCountdown(Number(json.retry_after));
        return;
      }
      setOtpCountdown(Number(json.resend_cooldown || 60));
      setOtpDigits(['', '', '', '', '', '']);
      if (json.sandbox_otp_preview) {
        setSessionInfo((prev) =>
          prev ? { ...prev, sandbox_otp_preview: json.sandbox_otp_preview } : prev
        );
      }
    } catch {
      setServerError('Network error requesting new OTP.');
    }
  };

  const handleSandboxVerify = async (outcome: 'success' | 'fail') => {
    if (!sessionInfo) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/payments/sandbox/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tran_id: sessionInfo.tran_id, outcome }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || 'Payment verification failed.');
        return;
      }
      await loadPaymentConfirmation(sessionInfo.tran_id);
    } catch {
      setServerError('Network error completing sandbox payment verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepItems = [
    { num: 1, titleBn: 'অংশগ্রহণকারীর তথ্য', titleEn: 'Participant Information' },
    { num: 2, titleBn: 'পেমেন্ট মাধ্যম', titleEn: 'Payment Method' },
    { num: 3, titleBn: 'পেমেন্ট ও OTP যাচাই', titleEn: 'Payment Verification' },
    { num: 4, titleBn: 'নিবন্ধন নিশ্চিতকরণ', titleEn: 'Registration Confirmation' },
  ];

  const methodNames: Record<string, string> = {
    bkash: 'bKash',
    nagad: 'Nagad',
    rocket: 'Rocket',
    free: 'Fee Waived',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
      {/* Header */}
      <header className="text-center space-y-2 no-print">
        <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0D9488] dark:text-[#5EEAD4]">
          {t('জাতীয় হ্যান্ডরাইটিং কম্পিটিশন ২০২৬', 'Handwriting Competition 2026 Registration')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
          {t('অনলাইন প্রতিযোগিতা নিবন্ধন ও পেমেন্ট', 'Competition Registration & Checkout')}
        </h1>
        <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75 max-w-2xl mx-auto">
          {t(
            'ধাপে ধাপে তথ্য পূরণ করুন, নিরাপদ পেমেন্ট মাধ্যম নির্বাচন করুন এবং অফিসিয়াল QR এন্ট্রি পাস সংগ্রহ করুন।',
            'Follow the 4-step ticketed registration track below to submit your entry, verify mobile payment, and download your official QR Entry Pass.'
          )}
        </p>
      </header>

      {/* Train-Ticket-Style Horizontal Step Progress Bar */}
      <nav
        aria-label="Registration Progress"
        className="bg-white dark:bg-[#0B221D] border border-[#05241D]/12 dark:border-[#2DD4BF]/25 rounded-2xl p-4 sm:p-6 shadow-sm no-print"
      >
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
          {stepItems.map((item, idx) => {
            const isCompleted = step > item.num || (step === 4 && item.num === 4);
            const isActive = step === item.num;
            return (
              <li key={item.num} className="relative flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-extrabold shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-[#059669] text-white shadow-sm'
                      : isActive
                        ? 'bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] ring-4 ring-[#059669]/20 dark:ring-[#E5C158]/25'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : item.num}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/55">
                    Step {item.num}
                  </p>
                  <p
                    className={`text-xs sm:text-sm font-bold truncate ${
                      isActive || isCompleted
                        ? 'text-[#04241D] dark:text-[#F3D98B]'
                        : 'text-slate-500 dark:text-white/50'
                    }`}
                  >
                    {t(item.titleBn, item.titleEn)}
                  </p>
                </div>
                {idx < stepItems.length - 1 && (
                  <div
                    aria-hidden="true"
                    className={`hidden md:block h-0.5 w-6 shrink-0 rounded-full ${
                      step > item.num ? 'bg-[#059669]' : 'bg-slate-200 dark:bg-white/15'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {serverError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-200 text-sm flex items-start gap-2.5 no-print"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {openComps.length === 0 && step !== 4 ? (
        <div className="bg-white dark:bg-[#0B221D] border border-[#05241D]/15 dark:border-[#2DD4BF]/25 rounded-3xl p-10 text-center space-y-4 shadow-sm">
          <p className="text-base font-bold text-[#04241D] dark:text-white">
            {t('এই মুহূর্তে কোনো প্রতিযোগিতার নিবন্ধন চালু নেই।', 'No competitions are currently open for registration.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="px-6 py-2.5 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-sm font-bold rounded-xl cursor-pointer"
          >
            {t('প্রতিযোগিতা তালিকা দেখুন', 'Browse Competitions')}
          </button>
        </div>
      ) : (
        <>
          {/* ==================== STEP 1: PARTICIPANT INFORMATION ==================== */}
          {step === 1 && (
            <form
              onSubmit={handleGoToStep2}
              className="bg-white dark:bg-[#0B221D] border border-[#05241D]/12 dark:border-[#2DD4BF]/25 rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
                    {t('ধাপ ১: অংশগ্রহণকারীর তথ্য', 'Step 1: Participant Information')}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-white/70">
                    {t('তারকাচিহ্নিত (*) ঘরগুলো পূরণ করা বাধ্যতামূলক।', 'Fields marked with (*) are required.')}
                  </p>
                </div>
                {selectedComp && (
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                      {t('নিবন্ধন ফি', 'Competition Fee')}
                    </p>
                    <p className="text-lg font-extrabold font-mono text-[#059669] dark:text-[#5EEAD4]">
                      ৳{competitionFee} BDT
                    </p>
                  </div>
                )}
              </div>

              {/* Competition & Category Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-5 border-b border-slate-200 dark:border-white/10">
                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('প্রতিযোগিতা *', 'Competition *')}
                  </label>
                  <select
                    required
                    value={form.competition_id}
                    onChange={(e) => handleCompChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  >
                    {openComps.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t(c.title_bn, c.title_en)} (৳{c.registration_fee ?? 200} BDT)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('প্রতিযোগিতার বিভাগ (Category) *', 'Competition Category *')}
                  </label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {t(cat.name_bn, cat.name_en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Participant & Parent Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('পূর্ণ নাম (ইংরেজিতে - এন্ট্রি পাসের জন্য) *', 'Full Name (English - for Entry Pass) *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="e.g., Tanvir Ahmed"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.name_en && <p className="text-xs text-red-600 mt-1">{fieldErrors.name_en}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('পূর্ণ নাম (বাংলায় - ঐচ্ছিক)', 'Full Name (Bangla - Optional)')}
                  </label>
                  <input
                    type="text"
                    value={form.name_bn}
                    onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('পিতার নাম *', "Father's Name *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.father_name}
                    onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                    placeholder={t('পিতার পূর্ণ নাম', "Father's full name")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.father_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.father_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('মাতার নাম *', "Mother's Name *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.mother_name}
                    onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                    placeholder={t('মাতার পূর্ণ নাম', "Mother's full name")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.mother_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.mother_name}</p>}
                </div>
              </div>

              {/* DOB, Gender, Institution, Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('জন্ম তারিখ *', 'Date of Birth *')}
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.date_of_birth && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.date_of_birth}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('লিঙ্গ *', 'Gender *')}
                  </label>
                  <select
                    required
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value as 'Male' | 'Female' | 'Other' | '' })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  >
                    <option value="">{t('নির্বাচন করুন', 'Select Gender')}</option>
                    <option value="Male">{t('পুরুষ / ছাত্র (Male)', 'Male')}</option>
                    <option value="Female">{t('নারী / ছাত্রী (Female)', 'Female')}</option>
                    <option value="Other">{t('অন্যান্য (Other)', 'Other')}</option>
                  </select>
                  {fieldErrors.gender && <p className="text-xs text-red-600 mt-1">{fieldErrors.gender}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('প্রতিষ্ঠান / বিদ্যালয়ের নাম *', 'Institution / School Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.school_name}
                    onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                    placeholder={t('বিদ্যালয় / কলেজের নাম', 'School / College / Institution')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.school_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.school_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('শ্রেণি / গ্রেড *', 'Class / Grade *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.class_level}
                    onChange={(e) => setForm({ ...form, class_level: e.target.value })}
                    placeholder="e.g., Class 8 / HSC / Open"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.class_level && <p className="text-xs text-red-600 mt-1">{fieldErrors.class_level}</p>}
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('মোবাইল নম্বর (OTP ও যোগাযোগ) *', 'Mobile Number *')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm font-mono dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.mobile && <p className="text-xs text-red-600 mt-1">{fieldErrors.mobile}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('ইমেইল ঠিকানা (এন্ট্রি পাস PDF পেতে)', 'Email Address (Optional)')}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  />
                  {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                    {t('জেলা *', 'District *')}
                  </label>
                  <select
                    required
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                  >
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#04241D] dark:text-white mb-1.5">
                  {t('পূর্ণ বর্তমান ঠিকানা *', 'Full Address *')}
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.full_address}
                  onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                  placeholder={t('বাড়ি নং, সড়ক, এলাকা/গ্রাম, উপজেলা ও জেলা', 'House, Road, Area/Village, Upazila & District')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071915] text-sm dark:text-white focus:outline-2 focus:outline-[#0D9488]"
                />
                {fieldErrors.full_address && <p className="text-xs text-red-600 mt-1">{fieldErrors.full_address}</p>}
              </div>

              {/* Optional Handwriting Sample Upload */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FBF9F5] dark:bg-[#071915] border border-dashed border-[#0D9488]/40 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#04241D] dark:text-[#F3D98B] flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#0D9488]" />
                      <span>
                        {t(
                          'হাতের লেখার নমুনা আপলোড (ঐচ্ছিক - JPG, PNG, WEBP বা PDF)',
                          'Upload Handwriting Sample (Optional - JPG, PNG, WEBP, PDF)'
                        )}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-white/65">
                      {t('সর্বোচ্চ ফাইল সাইজ ৫ মেগাবাইট।', 'Max file size 5MB. You may submit a photo or scan of your handwriting.')}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0B221D] border border-[#0D9488]/40 rounded-xl text-xs font-bold text-[#04241D] dark:text-[#5EEAD4] hover:bg-[#ECFDF5] dark:hover:bg-white/10 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingSample ? t('আপলোড হচ্ছে...', 'Uploading...') : t('ফাইল নির্বাচন করুন', 'Choose File')}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={handleSampleUpload}
                      disabled={uploadingSample}
                      className="sr-only"
                    />
                  </label>
                </div>
                {form.sample_file_url && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <FileCheck2 className="w-4 h-4" />
                    <span>
                      {t('আপলোড সম্পন্ন:', 'Uploaded:')} {form.sample_file_name || 'handwriting-sample'}
                    </span>
                  </div>
                )}
              </div>

              {/* Privacy & Terms Consent */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                <label className="flex items-start gap-2.5 text-sm text-[#1E1B4B]/85 dark:text-white/85 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.privacy_consent}
                    onChange={(e) => setForm({ ...form, privacy_consent: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-[#059669]"
                  />
                  <span>
                    {t(
                      'আমি HCFB-এর গোপনীয়তা নীতি, অভিভাবক সম্মতি ও প্রতিযোগিতার নিয়মাবলী পড়েছি এবং প্রদত্ত তথ্য সঠিক বলে প্রত্যয়ন করছি। *',
                      'I agree to the HCFB Privacy Policy & Terms, confirm guardian permission if under 18, and certify that all submitted information is accurate. *'
                    )}
                  </span>
                </label>
                {fieldErrors.privacy_consent && (
                  <p className="text-xs text-red-600">{fieldErrors.privacy_consent}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/competitions')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-white/20 text-sm font-bold text-[#04241D] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('ফিরে যান', 'Back')}</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#05241D] to-[#0D9488] dark:from-[#F3D98B] dark:to-[#E5C158] text-white dark:text-[#04241D] text-sm font-extrabold rounded-xl shadow-md hover:brightness-105 cursor-pointer"
                >
                  <span>{t('পরবর্তী: পেমেন্ট মাধ্যম নির্বাচন', 'Next: Select Payment Method')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ==================== STEP 2: SELECT PAYMENT METHOD ==================== */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white dark:bg-[#0B221D] border border-[#05241D]/12 dark:border-[#2DD4BF]/25 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
                    {t('ধাপ ২: আপনার পেমেন্ট মাধ্যম নির্বাচন করুন', 'Step 2: Select Your Payment Method')}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-white/70 mt-1">
                    {t(
                      'বাংলাদেশের জনপ্রিয় মোবাইল ব্যাংকিংয়ের মাধ্যমে দ্রুত ও নিরাপদে নিবন্ধন ফি পরিশোধ করুন।',
                      'Select one of the official Bangladeshi mobile financial services below to complete your entry pass registration.'
                    )}
                  </p>
                </div>

                <div className="space-y-3.5">
                  {(
                    [
                      {
                        id: 'bkash',
                        title: 'bKash Mobile Banking',
                        subBn: 'বিকাশ মার্চেন্ট / SSLCOMMERZ পেমেন্ট গেটওয়ে',
                        subEn: 'Fast checkout via bKash MFS gateway',
                        ring: 'border-[#E2136E] bg-[#FDF2F8] dark:bg-[#E2136E]/10',
                      },
                      {
                        id: 'nagad',
                        title: 'Nagad Digital Payment',
                        subBn: 'নগদ মোবাইল ওয়ালেট পেমেন্ট',
                        subEn: 'Instant settlement via Nagad wallet',
                        ring: 'border-[#F25C19] bg-[#FFF7ED] dark:bg-[#F25C19]/10',
                      },
                      {
                        id: 'rocket',
                        title: 'Rocket (DBBL Mobile Banking)',
                        subBn: 'ডাচ্-বাংলা ব্যাংক রকেট পেমেন্ট',
                        subEn: 'Secure payment via DBBL Rocket',
                        ring: 'border-[#8C3494] bg-[#FAF5FF] dark:bg-[#8C3494]/10',
                      },
                    ] as const
                  ).map((opt) => {
                    const active = paymentMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                          active
                            ? `${opt.ring} shadow-sm`
                            : 'border-slate-200 dark:border-white/15 hover:border-slate-300 dark:hover:border-white/30 bg-white dark:bg-[#071915]'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <PaymentMethodLogo method={opt.id} className="h-9 w-auto shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-extrabold text-[#04241D] dark:text-white">
                              {opt.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-white/70">
                              {t(opt.subBn, opt.subEn)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            active
                              ? 'border-[#059669] bg-[#059669] text-white'
                              : 'border-slate-300 dark:border-white/30'
                          }`}
                        >
                          {active && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-white/20 text-sm font-bold text-[#04241D] dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('পূর্ববর্তী ধাপ', 'Back to Participant Info')}</span>
                  </button>
                </div>
              </div>

              {/* Payment Summary Card */}
              <aside className="lg:col-span-5 bg-gradient-to-br from-[#05241D] to-[#0A3A2F] text-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl h-fit">
                <div className="border-b border-white/15 pb-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#F3D98B]">
                    {t('পেমেন্ট সারসংক্ষেপ', 'Payment Summary')}
                  </p>
                  <h3 className="text-lg font-extrabold mt-1">
                    {selectedComp ? t(selectedComp.title_bn, selectedComp.title_en) : 'Handwriting Competition 2026'}
                  </h3>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/70">{t('অংশগ্রহণকারী', 'Participant Name')}</dt>
                    <dd className="font-bold text-right">{form.name_en}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/70">{t('মোবাইল নম্বর', 'Mobile Number')}</dt>
                    <dd className="font-mono">{form.mobile}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/70">{t('বিভাগ', 'Category')}</dt>
                    <dd className="font-semibold text-right">
                      {selectedCat ? t(selectedCat.name_bn, selectedCat.name_en) : '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/70">{t('নির্বাচিত মাধ্যম', 'Selected Method')}</dt>
                    <dd className="font-bold text-[#5EEAD4]">{methodNames[paymentMethod]}</dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-3 border-t border-white/15">
                    <dt className="text-white/80">{t('কম্পিটিশন ফি', 'Competition Fee')}</dt>
                    <dd className="font-mono font-bold">৳{competitionFee} BDT</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-base pt-2">
                    <dt className="font-extrabold text-[#F3D98B]">{t('মোট পরিশোধযোগ্য', 'Total Payable Amount')}</dt>
                    <dd className="font-mono text-xl font-extrabold text-[#F3D98B]">৳{competitionFee} BDT</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleProceedToPayment}
                  className="w-full py-4 px-6 bg-gradient-to-r from-[#F3D98B] to-[#E5C158] text-[#04241D] font-extrabold text-sm rounded-2xl shadow-lg hover:brightness-105 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {submitting
                      ? t('সেশন তৈরি হচ্ছে...', 'Initiating Payment...')
                      : t('পেমেন্ট করতে এগিয়ে যান', 'Proceed to Payment')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-white/70 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#5EEAD4] shrink-0 mt-0.5" />
                  <span>
                    {t(
                      'পরবর্তী ধাপে আপনার মোবাইল নম্বর যাচাইয়ের জন্য একটি OTP পাঠানো হবে এবং এরপর গেটওয়ে ভেরিফিকেশন সম্পন্ন হবে।',
                      'In the next step, a 6-digit registration verification OTP will confirm your mobile number before payment gateway settlement.'
                    )}
                  </span>
                </p>
              </aside>
            </div>
          )}

          {/* ==================== STEP 3: SECURE OTP & GATEWAY PAYMENT VERIFICATION ==================== */}
          {step === 3 && sessionInfo && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-[#0B221D] border border-[#05241D]/12 dark:border-[#2DD4BF]/25 rounded-3xl p-6 sm:p-10 space-y-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#0D9488] dark:text-[#5EEAD4]">
                    {t('ধাপ ৩: নিরাপদ যাচাইকরণ', 'Step 3: Secure Payment & Mobile Verification')}
                  </p>
                  <h2 className="text-xl font-extrabold text-[#04241D] dark:text-white font-display mt-0.5">
                    {otpVerified
                      ? t('পেমেন্ট গেটওয়ে ভেরিফিকেশন', 'Payment Gateway Settlement')
                      : t('মোবাইল নম্বরে পাঠানো OTP কোড দিন', 'Enter 6-Digit Registration OTP')}
                  </h2>
                </div>
                <PaymentMethodLogo method={sessionInfo.payment_method} className="h-8 w-auto" />
              </div>

              {/* Transaction Reference Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FBF9F5] dark:bg-[#071915] border border-slate-200 dark:border-white/15 rounded-2xl p-4 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-white/60">Registration ID</p>
                  <p className="font-mono font-bold text-[#04241D] dark:text-[#F3D98B]">
                    {sessionInfo.registration_id}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-white/60">Transaction ID</p>
                  <p className="font-mono font-bold text-[#04241D] dark:text-white">{sessionInfo.tran_id}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-slate-500 dark:text-white/60">Amount Payable</p>
                  <p className="font-mono font-extrabold text-[#059669] dark:text-[#5EEAD4]">
                    ৳{sessionInfo.amount} BDT
                  </p>
                </div>
              </div>

              {!otpVerified ? (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-700/40 text-xs text-[#065F46] dark:text-emerald-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {t(
                          `আপনার ${form.mobile} নম্বরে ৬ ডিজিটের নিবন্ধন যাচাইকরণ OTP পাঠানো হয়েছে।`,
                          `A 6-digit registration verification OTP has been dispatched to ${form.mobile}.`
                        )}
                      </span>
                    </p>
                    <p>
                      {t(
                        'নিরাপত্তা সতর্কতা: এটি কেবল HCFB নিবন্ধনের মোবাইল যাচাই কোড — কখনোই আপনার bKash/Nagad/Rocket ওয়ালেট পিন (PIN) বা ওয়ালেট OTP এখানে দেবেন না।',
                        'Security Notice: This code verifies your HCFB registration mobile number only — never enter your bKash/Nagad/Rocket wallet PIN or wallet OTP here.'
                      )}
                    </p>
                  </div>

                  {sessionInfo.sandbox_otp_preview && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
                      <span>
                        <strong>Development Sandbox Mode:</strong> SMS gateway not configured — Test OTP:
                      </span>
                      <span className="font-mono text-base font-extrabold tracking-widest px-2.5 py-1 rounded-lg bg-white dark:bg-black/40 border border-amber-300">
                        {sessionInfo.sandbox_otp_preview}
                      </span>
                    </div>
                  )}

                  {/* 6-Digit Split OTP Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-center text-slate-600 dark:text-white/75">
                      {t('৬ ডিজিটের OTP কোড লিখুন', 'Enter 6-Digit Verification Code')}
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          aria-label={`OTP digit ${idx + 1}`}
                          className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-extrabold rounded-xl border-2 border-slate-300 dark:border-white/25 bg-white dark:bg-[#071915] text-[#04241D] dark:text-[#F3D98B] focus:border-[#0D9488] focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      disabled={otpCountdown > 0}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1.5 font-bold text-[#0D9488] dark:text-[#5EEAD4] disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {otpCountdown > 0
                          ? t(`পুনরায় পাঠান (${otpCountdown} সেকেন্ড)`, `Resend OTP in ${otpCountdown}s`)
                          : t('নতুন OTP পাঠান', 'Resend OTP')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-slate-600 dark:text-white/65 hover:underline cursor-pointer"
                    >
                      {t('পেমেন্ট মাধ্যম পরিবর্তন করুন', 'Change Payment Method')}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-gradient-to-r from-[#05241D] to-[#0D9488] dark:from-[#F3D98B] dark:to-[#E5C158] text-white dark:text-[#04241D] font-extrabold text-sm rounded-xl shadow-md hover:brightness-105 disabled:opacity-60 cursor-pointer"
                  >
                    {submitting
                      ? t('যাচাই করা হচ্ছে...', 'Verifying OTP...')
                      : t('OTP যাচাই ও পেমেন্ট সম্পন্ন করুন', 'Verify OTP & Proceed to Payment')}
                  </button>
                </form>
              ) : gatewayRedirectUrl ? (
                <div className="p-6 rounded-2xl bg-[#FBF9F5] dark:bg-[#071915] border border-slate-200 dark:border-white/15 text-center space-y-4">
                  <Clock className="w-8 h-8 text-[#0D9488] mx-auto animate-spin" />
                  <p className="text-sm font-bold text-[#04241D] dark:text-white">
                    {t(
                      'নিরাপদ SSLCOMMERZ পেমেন্ট গেটওয়েতে নেওয়া হচ্ছে...',
                      'Redirecting to SSLCOMMERZ Secure Payment Gateway...'
                    )}
                  </p>
                  <a
                    href={gatewayRedirectUrl}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#05241D] text-white text-xs font-bold rounded-xl"
                  >
                    <span>{t('স্বয়ংক্রিয়ভাবে না খুললে এখানে ক্লিক করুন', 'Click here if not redirected automatically')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              ) : sandboxGateReady ? (
                <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-400/70 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-200 text-amber-950">
                        Development Sandbox Gateway
                      </span>
                      <h3 className="text-base font-extrabold text-[#04241D] dark:text-[#F3D98B] mt-2">
                        {t(
                          `${methodNames[sessionInfo.payment_method]} স্যান্ডবক্স পেমেন্ট ভেরিফিকেশন`,
                          `${methodNames[sessionInfo.payment_method]} Sandbox Payment Verification`
                        )}
                      </h3>
                      <p className="text-xs text-slate-700 dark:text-white/75 mt-1">
                        {t(
                          'লাইভ SSLCOMMERZ মার্চেন্ট কী সংযুক্ত না থাকায় বর্তমানে ডেভেলপমেন্ট স্যান্ডবক্স মোড চালু রয়েছে। পেমেন্ট নিশ্চিত করতে নিচের বাটনে ক্লিক করুন।',
                          'Live SSLCOMMERZ merchant keys are not configured in this environment. Complete this test checkout using Development Sandbox verification.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxVerify('success')}
                      className="flex-1 py-3.5 px-5 bg-[#059669] hover:bg-[#047857] text-white text-sm font-extrabold rounded-xl shadow cursor-pointer disabled:opacity-60"
                    >
                      {submitting
                        ? t('নিশ্চিত করা হচ্ছে...', 'Processing...')
                        : t(`৳${sessionInfo.amount} পেমেন্ট সফল হিসেবে নিশ্চিত করুন`, `Verify & Complete ৳${sessionInfo.amount} Test Payment`)}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxVerify('fail')}
                      className="py-3.5 px-5 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      {t('ব্যর্থ পেমেন্ট টেস্ট', 'Simulate Failed')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ==================== STEP 4: REGISTRATION CONFIRMATION & OFFICIAL QR ENTRY PASS ==================== */}
          {step === 4 && confirmation && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="print-only-card bg-white dark:bg-[#0B221D] border-2 border-[#059669] dark:border-[#2DD4BF] rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                  <div className="flex items-start gap-3.5">
                    <CheckCircle2 className="w-10 h-10 text-[#059669] shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-[#0D9488] dark:text-[#5EEAD4]">
                        {t('অফিসিয়াল নিবন্ধন ও এন্ট্রি পাস', 'Official HCFB Registration & Entry Pass')}
                      </p>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
                        {t(
                          'অভিনন্দন! আপনার হ্যান্ডরাইটিং কম্পিটিশনের নিবন্ধন সফলভাবে সম্পন্ন হয়েছে।',
                          'Congratulations! Your Handwriting Competition registration has been successfully completed.'
                        )}
                      </h2>
                    </div>
                  </div>
                  <PaymentMethodLogo method={confirmation.payment_method} className="h-8 w-auto" />
                </div>

                {/* Registration ID + Payment Status Hero Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gradient-to-r from-[#ECFDF5] to-[#FBF9F5] dark:from-[#071915] dark:to-[#0F3129] border border-[#A7F3D0] dark:border-[#2DD4BF]/30 rounded-2xl p-5">
                  <div>
                    <p className="text-xs font-bold text-slate-600 dark:text-white/70">
                      {t('ইউনিক রেজিস্ট্রেশন নম্বর (Registration ID)', 'Registration ID')}
                    </p>
                    <p className="text-2xl font-extrabold font-mono text-[#04241D] dark:text-[#F3D98B] mt-0.5">
                      {confirmation.registration_id}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-bold text-slate-600 dark:text-white/70">
                      {t('পেমেন্ট স্ট্যাটাস', 'Payment Status')}
                    </p>
                    <p className="text-lg font-extrabold text-[#059669] dark:text-[#5EEAD4] mt-0.5 inline-flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {confirmation.payment_status}
                        {confirmation.is_test === 1 ? ' (Sandbox Test)' : ''}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Slip Metadata */}
                  <dl className="md:col-span-7 divide-y divide-slate-200 dark:divide-white/10 text-sm">
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-slate-600 dark:text-white/70">{t('অংশগ্রহণকারীর নাম', 'Participant Name')}</dt>
                      <dd className="font-bold text-[#04241D] dark:text-white text-right">
                        {confirmation.name_en}
                        {confirmation.name_bn && confirmation.name_bn !== confirmation.name_en
                          ? ` (${confirmation.name_bn})`
                          : ''}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-slate-600 dark:text-white/70">{t('ট্রানজেকশন আইডি', 'Transaction ID')}</dt>
                      <dd className="font-mono font-bold text-[#04241D] dark:text-[#F3D98B] text-right">
                        {confirmation.tran_id}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-slate-600 dark:text-white/70">{t('প্রতিযোগিতা ও বিভাগ', 'Competition Category')}</dt>
                      <dd className="font-bold text-right text-[#04241D] dark:text-white">
                        {t(confirmation.category_name_bn, confirmation.category_name_en)}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-slate-600 dark:text-white/70">{t('পেমেন্ট মাধ্যম ও ফি', 'Payment Method & Fee')}</dt>
                      <dd className="font-bold text-right text-[#04241D] dark:text-white">
                        {methodNames[confirmation.payment_method] || confirmation.payment_method} · ৳{confirmation.amount} BDT
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-slate-600 dark:text-white/70">{t('নিবন্ধনের তারিখ', 'Registration Date')}</dt>
                      <dd className="font-mono text-[#04241D] dark:text-white">
                        {confirmation.created_at.slice(0, 10)}
                      </dd>
                    </div>
                  </dl>

                  {/* Official Cryptographic QR Entry Pass Box */}
                  {confirmation.qr_data_url && (
                    <div className="md:col-span-5 bg-[#FBF9F5] dark:bg-[#071915] border border-[#05241D]/20 dark:border-[#2DD4BF]/30 rounded-2xl p-4 text-center space-y-2.5">
                      <img
                        src={confirmation.qr_data_url}
                        alt="Official Entry Pass QR Code"
                        className="w-40 h-40 mx-auto rounded-xl border border-slate-200 bg-white p-1.5"
                      />
                      <p className="text-[11px] font-bold text-[#04241D] dark:text-[#F3D98B] leading-snug">
                        Scan this QR Code to verify the authenticity of your official competition entry pass.
                      </p>
                      {confirmation.verify_url && (
                        <button
                          type="button"
                          onClick={() => navigate(`/verify/${encodeURIComponent(confirmation.qr_token)}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D9488] dark:text-[#5EEAD4] hover:underline cursor-pointer no-print"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{t('লাইভ যাচাই পেজ দেখুন', 'Open Live Verification Page')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-white/10 no-print">
                  <a
                    href={`/api/public/registrations/${encodeURIComponent(
                      confirmation.registration_id
                    )}/entry-pass.pdf?token=${encodeURIComponent(confirmation.qr_token)}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-sm font-extrabold rounded-xl shadow hover:brightness-105 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('এন্ট্রি পাস ও নিশ্চিতকরণ (PDF) ডাউনলোড করুন', 'Download Registration Confirmation (PDF)')}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-5 py-3 border border-slate-300 dark:border-white/25 text-[#04241D] dark:text-white text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Home className="w-4 h-4" />
                    <span>{t('হোমপেজে ফিরে যান', 'Return to Homepage')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0D9488] dark:text-[#5EEAD4]">
          {t('আবেদন যাচাই', 'Registration Tracking')}
        </p>
        <h1 className="text-3xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
          {t('রেজিস্ট্রেশন নম্বর ট্র্যাক করুন', 'Track Your Registration')}
        </h1>
        <p className="text-sm text-[#1E1B4B]/75 dark:text-white/75">
          {t('উদাহরণ: HCFB-2026-00001 (নমুনা রেকর্ড)', 'Example sample ID: HCFB-2026-00001')}
        </p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-2">
        <input
          type="text"
          value={regId}
          onChange={(e) => setRegId(e.target.value)}
          placeholder="HCFB-2026-00001"
          className="flex-1 px-4 py-3 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0B221D] dark:text-white font-mono text-sm focus:outline-2 focus:outline-[#0D9488]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-sm font-bold rounded-full hover:brightness-105 cursor-pointer"
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
        <div className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-[#2DD4BF]/25 rounded-3xl p-7 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <span className="font-mono font-bold text-[#04241D] dark:text-[#F3D98B]">
              {String(record.registration_id)}
            </span>
            <span className="text-xs font-bold text-[#059669] dark:text-[#5EEAD4] uppercase">
              {String(record.payment_status || record.status)}
            </span>
          </div>
          <dl className="divide-y divide-slate-200 dark:divide-white/10 text-sm">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65 dark:text-white/65">{t('অংশগ্রহণকারী', 'Participant')}</dt>
              <dd className="font-bold text-[#1E1B4B] dark:text-white">
                {t(String(record.name_bn), String(record.name_en))}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65 dark:text-white/65">{t('প্রতিযোগিতা', 'Competition')}</dt>
              <dd className="text-right font-semibold text-[#1E1B4B] dark:text-white">
                {t(String(record.competition_title_bn), String(record.competition_title_en))}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65 dark:text-white/65">{t('বিভাগ', 'Category')}</dt>
              <dd className="text-right text-[#1E1B4B] dark:text-white">
                {t(String(record.category_name_bn), String(record.category_name_en))}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-[#1E1B4B]/65 dark:text-white/65">{t('জেলা', 'District')}</dt>
              <dd className="text-[#1E1B4B] dark:text-white">{String(record.district)}</dd>
            </div>
            {record.results_published === 1 && record.award_tier !== 'none' && (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-[#1E1B4B]/65 dark:text-white/65">{t('ফলাফল', 'Award')}</dt>
                <dd className="font-bold text-[#0D9488] dark:text-[#5EEAD4]">
                  {t(
                    (AWARD_LABELS[String(record.award_tier)] || AWARD_LABELS.merit).bn,
                    (AWARD_LABELS[String(record.award_tier)] || AWARD_LABELS.merit).en
                  )}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {record.payment_status === 'PAID' && Boolean(record.qr_token) && record.qr_revoked !== 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/verify/${encodeURIComponent(String(record.qr_token))}`)}
                  className="flex-1 py-2.5 px-4 bg-[#059669] text-white text-xs font-bold rounded-xl hover:bg-[#047857] cursor-pointer"
                >
                  {t('QR এন্ট্রি পাস যাচাই করুন', 'Verify Entry Pass')}
                </button>
                <a
                  href={`/api/public/registrations/${encodeURIComponent(
                    String(record.registration_id)
                  )}/entry-pass.pdf?token=${encodeURIComponent(String(record.qr_token))}`}
                  className="flex-1 text-center py-2.5 px-4 bg-[#05241D] text-white text-xs font-bold rounded-xl hover:brightness-110"
                >
                  {t('এন্ট্রি পাস PDF ডাউনলোড', 'Download Entry Pass PDF')}
                </a>
              </>
            )}
            {Boolean(record.certificate_code) && (
              <button
                type="button"
                onClick={() => navigate(`/verify?code=${record.certificate_code}`)}
                className="w-full py-2.5 px-4 border border-[#05241D]/20 dark:border-white/25 text-[#04241D] dark:text-[#F3D98B] text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              >
                {t('যাচাইকৃত সনদ দেখুন', 'View Verified Certificate')} ({String(record.certificate_code)})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
