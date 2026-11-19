import React, { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  ArrowUp,
  MessageCircle,
  Globe,
  Sun,
  Moon,
  Bell,
  User,
  ChevronDown,
  GraduationCap,
  Shield,
  ClipboardCheck,
  Search,
  QrCode,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HcfbBrandMark } from './HcfbBrandMark';
import { SiteFooter } from './SiteFooter';
import { DEFAULT_FOOTER_SETTINGS } from '../types/hcfb';

export function Layout({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang, theme, toggleTheme, t, path, navigate, bootstrap } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [preloaderVisible, setPreloaderVisible] = useState(true);

  const headerMenusRef = useRef<HTMLDivElement>(null);

  const identity = bootstrap?.settings?.site_identity;
  const footerCfg = bootstrap?.settings?.footer_settings || DEFAULT_FOOTER_SETTINGS;
  const notices = bootstrap?.notices || [];
  const whatsappNumber = (identity?.whatsapp_number || '8801869970401').replace(/\D/g, '');
  const hasStaffToken = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('hcfb_staff_token'));

  useEffect(() => {
    const timer = setTimeout(() => setPreloaderVisible(false), 320);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (headerMenusRef.current && !headerMenusRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setProfileOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleProgramsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    setMoreOpen(false);
    if (path !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const primaryNav = [
    { to: '/', labelBn: 'হোম', labelEn: 'Home' },
    { to: '/about', labelBn: 'পরিচিতি', labelEn: 'About' },
    { to: '/#programs', labelBn: 'কার্যক্রম', labelEn: 'Programs', isPrograms: true },
    { to: '/portal', labelBn: 'শিক্ষার্থী পোর্টাল', labelEn: 'Student Portal' },
    { to: '/judge', labelBn: 'শিক্ষক পোর্টাল', labelEn: 'Teacher Portal' },
    { to: '/admin', labelBn: 'অ্যাডমিন পোর্টাল', labelEn: 'Admin Portal' },
  ];

  const moreLinks = [
    { to: '/competitions', labelBn: 'প্রতিযোগিতা ও ইভেন্ট', labelEn: 'Competitions & Events' },
    { to: '/register', labelBn: 'অনলাইন রেজিস্ট্রেশন', labelEn: 'Online Registration' },
    { to: '/hub', labelBn: 'লার্নিং ও সৃজনশীলতা হাব', labelEn: 'Learning & Creativity Hub' },
    { to: '/gallery', labelBn: 'গ্যালারি', labelEn: 'Gallery' },
    { to: '/notices', labelBn: 'নোটিশ বোর্ড', labelEn: 'Notices' },
    { to: '/track', labelBn: 'রেজিস্ট্রেশন ট্র্যাক', labelEn: 'Track Registration ID' },
    { to: '/verify', labelBn: 'সনদ যাচাই (QR)', labelEn: 'Verify Certificate' },
    { to: '/team', labelBn: 'আমাদের টিম', labelEn: 'Our Team' },
    { to: '/contact', labelBn: 'যোগাযোগ', labelEn: 'Contact' },
  ];

  const allMobileLinks = [...primaryNav, ...moreLinks];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBF5] text-[#1E1B4B] dark:bg-[#071412] dark:text-[#ECFDF5] transition-colors">
      {/* Subtle Preloader */}
      {preloaderVisible && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#04241D] transition-opacity duration-300 no-print"
        >
          <div className="flex flex-col items-center gap-3">
            <HcfbBrandMark logoUrl={identity?.logo_url} size="lg" />
            <span className="text-xs font-extrabold tracking-[0.25em] uppercase text-[#F3D98B]">
              HCFB
            </span>
          </div>
        </div>
      )}

      {/* Dark Semi-Transparent Emerald Header Navigation */}
      <header
        ref={headerMenusRef}
        className="sticky top-0 z-40 bg-[#051E18]/92 backdrop-blur-md border-b border-[#2DD4BF]/15 text-white shadow-[0_6px_28px_-10px_rgba(0,0,0,0.55)] no-print"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-[72px] flex items-center justify-between gap-3">
          {/* Organization Logo, Name & Bengali Tagline */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-2.5 min-w-0 shrink-0 focus-visible:outline-2 focus-visible:outline-[#E5C158] rounded-lg"
          >
            <HcfbBrandMark logoUrl={identity?.logo_url} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#F3D98B] font-display whitespace-nowrap">
                  {identity?.short_name || 'HCFB'}
                </span>
                <span className="hidden 2xl:inline text-xs font-medium text-white/75 truncate max-w-[180px]">
                  · {t('হ্যান্ডরাইটিং ফাউন্ডেশন', 'Handwriting Foundation')}
                </span>
              </div>
              <p className="hidden sm:block text-[10px] font-medium text-[#5EEAD4] truncate max-w-[230px]">
                {footerCfg.tagline_bn || 'সুন্দর হাতের লেখা ও ক্যালিগ্রাফি চর্চা'}
              </p>
            </div>
          </a>

          {/* Single-Row Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-3 xl:gap-4">
            {primaryNav.map((item) => {
              const active =
                item.to === '/'
                  ? path === '/'
                  : !item.isPrograms && (path === item.to || path.startsWith(item.to + '/'));
              return (
                <a
                  key={item.to}
                  href={item.to}
                  onClick={(e) => {
                    if (item.isPrograms) {
                      handleProgramsClick(e);
                    } else {
                      e.preventDefault();
                      navigate(item.to);
                    }
                  }}
                  className={`text-[13px] font-semibold whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-[#F3D98B] border-[#E5C158]'
                      : 'text-white/85 border-transparent hover:text-[#5EEAD4] hover:border-[#2DD4BF]/50'
                  }`}
                >
                  {lang === 'bn' ? item.labelBn : item.labelEn}
                </a>
              );
            })}

            {/* Explore / More Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen((v) => !v);
                  setNotifOpen(false);
                  setProfileOpen(false);
                }}
                aria-expanded={moreOpen}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/85 hover:text-[#5EEAD4] py-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t('আরও', 'More')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-[#071D18] border border-[#2DD4BF]/25 shadow-2xl p-2 z-50">
                  {moreLinks.map((sub) => (
                    <a
                      key={sub.to}
                      href={sub.to}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(sub.to);
                      }}
                      className={`block px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        path === sub.to
                          ? 'bg-[#0F4C42] text-[#F3D98B]'
                          : 'text-white/85 hover:bg-white/10 hover:text-[#5EEAD4]'
                      }`}
                    >
                      {lang === 'bn' ? sub.labelBn : sub.labelEn}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action & Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLang}
              aria-label={t('ভাষা পরিবর্তন করুন', 'Switch Language')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-[#0A362C] hover:bg-[#0F4C42] border border-[#2DD4BF]/30 text-[#CCFBF1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#E5C158]" />
              <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('লাইট মোড চালু করুন', 'Switch to Light Mode') : t('ডার্ক মোড চালু করুন', 'Switch to Dark Mode')}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#0A362C] hover:bg-[#0F4C42] border border-[#2DD4BF]/30 text-[#F3D98B] transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                  setMoreOpen(false);
                }}
                aria-label={t('নোটিশ ও বিজ্ঞপ্তি', 'Notifications')}
                aria-expanded={notifOpen}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#0A362C] hover:bg-[#0F4C42] border border-[#2DD4BF]/30 text-white/90 transition-colors cursor-pointer shrink-0"
              >
                <Bell className="w-4 h-4 text-[#5EEAD4]" />
                {notices.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#E5C158] text-[#04241D] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                    {notices.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl bg-[#071D18] border border-[#2DD4BF]/25 shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#F3D98B]">
                      {t('সাম্প্রতিক নোটিশ', 'Latest Notices')}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/notices')}
                      className="text-[11px] font-semibold text-[#5EEAD4] hover:underline cursor-pointer"
                    >
                      {t('সব দেখুন', 'View All')}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/10">
                    {notices.length === 0 ? (
                      <p className="p-4 text-xs text-white/70">
                        {t('কোনো সক্রিয় নোটিশ নেই।', 'No active notices.')}
                      </p>
                    ) : (
                      notices.slice(0, 4).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => navigate(`/notices/${n.id}`)}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors space-y-1 cursor-pointer"
                        >
                          <p className="text-xs font-bold text-white line-clamp-1">
                            {t(n.title_bn, n.title_en)}
                          </p>
                          <p className="text-[11px] text-white/65 line-clamp-1">
                            {n.published_at} · {t(n.summary_bn, n.summary_en)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Portals Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                  setMoreOpen(false);
                }}
                aria-label={t('পোর্টাল ও প্রোফাইল মেনু', 'User & Portal Menu')}
                aria-expanded={profileOpen}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-[#0A362C] hover:bg-[#0F4C42] border border-[#E5C158]/35 text-[#F3D98B] transition-colors cursor-pointer shrink-0"
              >
                <User className="w-4 h-4" />
                <span className="hidden xl:inline text-xs font-bold">
                  {hasStaffToken ? t('স্টাফ সেশন', 'Staff Active') : t('পোর্টাল', 'Portals')}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#071D18] border border-[#2DD4BF]/25 shadow-2xl p-2 z-50 space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5EEAD4]">
                    {t('ইউজার ও পোর্টাল অ্যাক্সেস', 'Portals & Quick Access')}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/portal')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/10 cursor-pointer text-left"
                  >
                    <GraduationCap className="w-4 h-4 text-[#5EEAD4]" />
                    <span>{t('শিক্ষার্থী ও অংশগ্রহণকারী পোর্টাল', 'Student / Participant Portal')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/judge')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/10 cursor-pointer text-left"
                  >
                    <ClipboardCheck className="w-4 h-4 text-[#E5C158]" />
                    <span>{t('শিক্ষক ও বিচারক পোর্টাল', 'Teacher / Judge Portal')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/10 cursor-pointer text-left"
                  >
                    <Shield className="w-4 h-4 text-[#F3D98B]" />
                    <span>{t('অ্যাডমিন পোর্টাল', 'Admin Portal')}</span>
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    type="button"
                    onClick={() => navigate('/track')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/10 cursor-pointer text-left"
                  >
                    <Search className="w-4 h-4 text-[#2DD4BF]" />
                    <span>{t('রেজিস্ট্রেশন ট্র্যাকিং', 'Track Registration ID')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/verify')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/10 cursor-pointer text-left"
                  >
                    <QrCode className="w-4 h-4 text-[#2DD4BF]" />
                    <span>{t('সনদ যাচাই (QR)', 'Verify Certificate')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#0A362C] border border-[#2DD4BF]/30 text-[#F3D98B] hover:bg-[#0F4C42] cursor-pointer shrink-0"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[#2DD4BF]/20 bg-[#051B16] px-4 py-4 space-y-3 max-h-[82vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-1">
              {allMobileLinks.map((item) => {
                const active = path === item.to;
                return (
                  <a
                    key={item.to}
                    href={item.to}
                    onClick={(e) => {
                      if ('isPrograms' in item && item.isPrograms) {
                        handleProgramsClick(e);
                      } else {
                        e.preventDefault();
                        navigate(item.to);
                      }
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[#0F4C42] text-[#F3D98B]'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    {lang === 'bn' ? item.labelBn : item.labelEn}
                  </a>
                );
              })}
            </div>
            <div className="pt-3 border-t border-white/10">
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/register');
                }}
                className="flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-[#F3D98B] to-[#E5C158] text-[#04241D] text-sm font-extrabold rounded-full shadow-md"
              >
                {t('প্রতিযোগিতায় নিবন্ধন করুন', 'Register Now')}
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />

      {/* Compact Floating Controls */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2 no-print">
        {showBackTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={t('উপরে ফিরুন', 'Back to top')}
            className="w-10 h-10 rounded-full bg-[#0A362C] border border-[#2DD4BF]/40 text-[#F3D98B] shadow-lg flex items-center justify-center hover:bg-[#0F4C42] transition-colors cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact HCFB on WhatsApp"
          className="h-11 px-4 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg flex items-center gap-2 text-xs font-bold hover:brightness-105 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
