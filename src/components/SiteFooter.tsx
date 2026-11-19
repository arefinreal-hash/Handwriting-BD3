import { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Facebook,
  Youtube,
  Instagram,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HcfbBrandMark } from './HcfbBrandMark';
import {
  DEFAULT_FOOTER_SETTINGS,
  type FooterPaymentMethod,
  type FooterSettings,
  type SiteSettings,
} from '../types/hcfb';

const PAYMENT_STYLES: Record<
  FooterPaymentMethod['id'],
  { label: string; bg: string; accent: string; sub: string }
> = {
  bkash: {
    label: 'bKash',
    bg: 'bg-[#E2136E]/15 border-[#E2136E]/40 text-[#FF66A8]',
    accent: 'bg-[#E2136E] text-white',
    sub: 'MFS',
  },
  nagad: {
    label: 'Nagad',
    bg: 'bg-[#F7941D]/15 border-[#F7941D]/40 text-[#FDBA74]',
    accent: 'bg-[#F7941D] text-white',
    sub: 'MFS',
  },
  rocket: {
    label: 'Rocket',
    bg: 'bg-[#8C3494]/20 border-[#A855F7]/40 text-[#E9D5FF]',
    accent: 'bg-[#8C3494] text-white',
    sub: 'DBBL',
  },
  upay: {
    label: 'Upay',
    bg: 'bg-[#0080C9]/15 border-[#38BDF8]/40 text-[#7DD3FC]',
    accent: 'bg-[#0080C9] text-white',
    sub: 'UCB',
  },
  cellfin: {
    label: 'CellFin',
    bg: 'bg-[#006837]/25 border-[#10B981]/40 text-[#6EE7B7]',
    accent: 'bg-[#006837] text-white',
    sub: 'IBBL',
  },
  islami_bank: {
    label: 'Islami Bank',
    bg: 'bg-[#006A4E]/25 border-[#14B8A6]/40 text-[#5EEAD4]',
    accent: 'bg-[#006A4E] text-white',
    sub: 'Bank',
  },
};

export function SiteFooter({
  overrideFooter,
  overrideIdentity,
  isPreview = false,
}: {
  overrideFooter?: FooterSettings;
  overrideIdentity?: Partial<SiteSettings['site_identity']>;
  isPreview?: boolean;
}) {
  const { t, navigate, bootstrap } = useApp();
  const [copied, setCopied] = useState(false);

  const identity = {
    ...(bootstrap?.settings?.site_identity || {}),
    ...(overrideIdentity || {}),
  };

  const footer: FooterSettings = {
    ...DEFAULT_FOOTER_SETTINGS,
    ...(bootstrap?.settings?.footer_settings || {}),
    ...(overrideFooter || {}),
  };

  const whatsappDigits = (identity.whatsapp_number || '8801869970401').replace(/\D/g, '');
  const primaryMobile = identity.primary_mobile || '+880 1869-970401';
  const secondaryMobile = identity.secondary_mobile || '01605278615';
  const email = identity.email || 'hcfb2026@gmail.com';
  const activeLinks = (footer.important_links || []).filter((l) => l.enabled && l.url);
  const enabledPayments = (footer.payment_methods || []).filter((m) => m.enabled);

  const handleNav = (url: string) => {
    if (isPreview) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const handleCopyNumber = async () => {
    if (!footer.payment_number) return;
    try {
      await navigator.clipboard.writeText(footer.payment_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#05241D] via-[#061815] to-[#0B0F13] text-white border-t border-[#2DD4BF]/20 no-print">
      {/* Subtle Ambient Glows */}
      <div
        aria-hidden="true"
        className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-[#14B8A6]/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-[#E5C158]/10 blur-3xl pointer-events-none"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Column 1: Organization Identity */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-3">
              <HcfbBrandMark logoUrl={identity.logo_url} size="lg" />
              <div>
                <p className="text-lg font-extrabold tracking-tight font-display text-[#F3D98B]">
                  {identity.short_name || 'HCFB'}
                </p>
                <p className="text-[11px] font-medium text-[#5EEAD4]">
                  {t(footer.tagline_bn, footer.tagline_en)}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-white leading-snug">
                {identity.org_name_en || 'HANDWRITING & CALLIGRAPHY FOUNDATION OF BANGLADESH'}
              </p>
              <p className="text-xs font-medium text-[#CCFBF1]/80">
                {identity.org_name_bn || 'হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ'}
              </p>
            </div>

            <p className="text-xs text-white/75 leading-relaxed">
              {t(footer.intro_bn, footer.intro_en)}
            </p>

            {footer.registration_number && footer.registration_number.trim() !== '' && (
              <div className="pt-2 border-t border-white/10 text-xs text-[#F3D98B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#2DD4BF]" />
                <span className="tabular-nums">
                  {t('রেজিস্ট্রেশন নম্বর:', 'Reg. No:')} {footer.registration_number}
                </span>
              </div>
            )}
          </div>

          {/* Column 2: Pages & Important Links */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F3D98B] mb-4">
              {t('পেজসমূহ ও গুরুত্বপূর্ণ লিংক', 'Pages & Important Links')}
            </h3>
            <ul className="grid grid-cols-1 gap-2 text-xs sm:text-[13px] text-white/80">
              {activeLinks.map((link) => (
                <li key={link.url + link.label_en}>
                  <a
                    href={link.url}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNav(link.url);
                    }}
                    className="inline-flex items-center gap-2 hover:text-[#5EEAD4] transition-colors py-0.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#E5C158]/70 shrink-0" aria-hidden="true" />
                    <span>{t(link.label_bn, link.label_en)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Payment Methods */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F3D98B]">
              {t('পেমেন্ট মেথডসমূহ', 'Payment Methods')}
            </h3>

            {enabledPayments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                {enabledPayments.map((pm) => {
                  const st = PAYMENT_STYLES[pm.id];
                  return (
                    <div
                      key={pm.id}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${st.bg}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg ${st.accent} flex items-center justify-center text-[10px] font-extrabold shrink-0`}
                      >
                        {st.label.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate">{pm.name || st.label}</p>
                        <p className="text-[10px] opacity-75 leading-tight">{st.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl bg-[#0A2E26]/80 border border-[#2DD4BF]/25 p-4 space-y-2.5">
              {footer.payment_number && footer.payment_number.trim() !== '' ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5EEAD4]">
                      {t('অফিসিয়াল পেমেন্ট নম্বর', 'Official Payment Number')}
                    </span>
                    {footer.payment_account_type && (
                      <span className="text-[11px] font-semibold text-[#F3D98B]">
                        {footer.payment_account_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-[#041713] border border-white/10 rounded-xl px-3 py-2">
                    <span className="font-mono text-sm font-bold text-white tabular-nums tracking-wide">
                      {footer.payment_number}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      aria-label={t('নম্বর কপি করুন', 'Copy payment number')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#14B8A6]/20 hover:bg-[#14B8A6]/35 text-[#5EEAD4] text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? t('কপি হয়েছে', 'Copied') : t('কপি', 'Copy')}</span>
                    </button>
                  </div>
                  {(footer.payment_instructions_bn || footer.payment_instructions_en) && (
                    <p className="text-[11px] text-white/75 leading-relaxed">
                      {t(footer.payment_instructions_bn, footer.payment_instructions_en)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                  <CreditCard className="w-4 h-4 text-[#E5C158] shrink-0 mt-0.5" />
                  <p>
                    {t(
                      'বর্তমানে ফাউন্ডেশনের নিবন্ধন ও অনুশীলন কার্যক্রম বিনামূল্যে পরিচালিত হচ্ছে। অফিসিয়াল পেমেন্ট নম্বর নির্ধারিত হলে এখানে প্রদর্শিত হবে।',
                      'Foundation programs and registrations are currently free of charge. Official payment numbers and channels will appear here once configured.'
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Contact & Helpline */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F3D98B]">
              {t('যোগাযোগ ও হেল্পলাইন', 'Contact & Helpline')}
            </h3>

            <div className="space-y-2.5 text-xs sm:text-[13px] text-white/85">
              <a
                href={`tel:${primaryMobile.replace(/\s+/g, '')}`}
                className="flex items-center gap-2.5 hover:text-[#5EEAD4] transition-colors tabular-nums"
              >
                <Phone className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                <span>{primaryMobile}</span>
              </a>
              {secondaryMobile && (
                <a
                  href={`tel:${secondaryMobile.replace(/\s+/g, '')}`}
                  className="flex items-center gap-2.5 hover:text-[#5EEAD4] transition-colors tabular-nums"
                >
                  <Phone className="w-4 h-4 text-[#E5C158] shrink-0" />
                  <span>{secondaryMobile}</span>
                </a>
              )}
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 hover:text-[#5EEAD4] transition-colors break-all"
              >
                <Mail className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                <span>{email}</span>
              </a>
              <div className="flex items-start gap-2.5 text-white/75 leading-relaxed">
                <MapPin className="w-4 h-4 text-[#E5C158] shrink-0 mt-0.5" />
                <span>
                  {t(
                    identity.address_bn || 'অফিসিয়াল ঠিকানা: পরবর্তীতে সংযুক্ত করা হবে',
                    identity.address_en || 'Official Address: To be updated later'
                  )}
                </span>
              </div>
              {footer.google_maps_url && footer.google_maps_url.trim() !== '' && (
                <a
                  href={footer.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EEAD4] hover:underline pl-6"
                >
                  <span>{t('গুগল ম্যাপে দেখুন', 'View on Google Maps')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-sm transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={identity.facebook_url || 'https://www.facebook.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="HCFB Facebook"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-[#14B8A6]/30 text-white text-xs font-semibold transition-colors"
              >
                <Facebook className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Facebook</span>
              </a>
              {footer.youtube_url && footer.youtube_url.trim() !== '' && (
                <a
                  href={footer.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="HCFB YouTube"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#EF4444]/80 flex items-center justify-center transition-colors"
                >
                  <Youtube className="w-3.5 h-3.5" />
                </a>
              )}
              {footer.instagram_url && footer.instagram_url.trim() !== '' && (
                <a
                  href={footer.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="HCFB Instagram"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#EC4899]/80 flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Legal & Verified Credentials Bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
            <p>
              © {new Date().getFullYear()} Handwriting &amp; Calligraphy Foundation of Bangladesh (HCFB).{' '}
              {t('সর্বস্বত্ব সংরক্ষিত।', 'All rights reserved.')}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/privacy');
                }}
                className="hover:text-[#5EEAD4] transition-colors"
              >
                {t('গোপনীয়তা নীতি', 'Privacy Policy')}
              </a>
              <span aria-hidden="true" className="text-white/25">·</span>
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/terms');
                }}
                className="hover:text-[#5EEAD4] transition-colors"
              >
                {t('শর্তাবলী', 'Terms & Conditions')}
              </a>
            </div>
          </div>

          {(footer.verified_credentials_bn || footer.verified_credentials_en) && (
            <div className="flex items-center gap-1.5 text-[#F3D98B] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
              <span>{t(footer.verified_credentials_bn, footer.verified_credentials_en)}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
