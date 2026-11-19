import { useState } from 'react';
import {
  ArrowRight,
  Feather,
  Play,
  Users,
  Calendar,
  Star,
  Sparkles,
  X,
  Trophy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResilientImage } from './ResilientImage';
import { HcfbBrandMark } from './HcfbBrandMark';
import { DEFAULT_HERO_SETTINGS, type HeroSettings } from '../types/hcfb';

function getEmbedUrl(rawUrl: string): { type: 'iframe' | 'video'; src: string } | null {
  const url = rawUrl.trim();
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/
  );
  if (ytMatch) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  }
  return { type: 'video', src: url };
}

export function HeroSection({
  overrideHero,
  isPreview = false,
}: {
  overrideHero?: HeroSettings;
  isPreview?: boolean;
}) {
  const { t, navigate, bootstrap } = useApp();
  const [videoOpen, setVideoOpen] = useState(false);

  const identity = bootstrap?.settings?.site_identity;
  const hero: HeroSettings = {
    ...DEFAULT_HERO_SETTINGS,
    ...(bootstrap?.settings?.hero_settings || {}),
    ...(overrideHero || {}),
  };

  const competitions = bootstrap?.competitions || [];
  const selectedComp =
    (hero.featured_competition_id > 0
      ? competitions.find((c) => c.id === hero.featured_competition_id)
      : undefined) ||
    competitions.find((c) => c.is_featured === 1) ||
    competitions[0];

  const cardTitle =
    hero.phone_title_bn || hero.phone_title_en
      ? t(hero.phone_title_bn, hero.phone_title_en)
      : selectedComp
        ? t(selectedComp.title_bn, selectedComp.title_en)
        : t(
            'জাতীয় সুন্দর হাতের লেখা ও ক্যালিগ্রাফি কর্মসূচি',
            'National Handwriting & Calligraphy Program'
          );

  const cardThumbnail =
    hero.phone_thumbnail_url ||
    selectedComp?.banner_url ||
    '/src/assets/images/comp_handwriting_banner_1795055013781.jpg';

  const offerText = t(hero.phone_offer_bn, hero.phone_offer_en);
  const embedVideo = getEmbedUrl(hero.phone_video_url);

  const handleLink = (url: string) => {
    if (isPreview || !url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  const phoneActionUrl = selectedComp
    ? `/register?competition=${selectedComp.id}`
    : hero.cta1_url || '/register';

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#04241D] via-[#09342B] to-[#0B1014] text-white pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Subtle Background Image Texture */}
      {hero.hero_bg_image_url && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] mix-blend-luminosity pointer-events-none"
        >
          <ResilientImage
            src={hero.hero_bg_image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Atmospheric Emerald, Aqua & Golden Champagne Lighting Glows */}
      <div
        aria-hidden="true"
        className="absolute -top-24 left-1/4 w-[460px] h-[460px] rounded-full bg-[#14B8A6]/18 blur-[110px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 right-12 w-[420px] h-[420px] rounded-full bg-[#E5C158]/14 blur-[110px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(rgba(45,212,191,0.08)_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT SIDE: Typography, Supporting Bengali Narrative & Rounded CTAs */}
          <div className={`${hero.show_phone_mockup ? 'lg:col-span-7' : 'lg:col-span-12 max-w-3xl'} space-y-6`}>
            {hero.show_badge && (hero.badge_bn || hero.badge_en) && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0B3B32]/85 border border-[#2DD4BF]/30 text-xs font-semibold text-[#5EEAD4]">
                <Feather className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />
                <span>{t(hero.badge_bn, hero.badge_en)}</span>
              </div>
            )}

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold leading-[1.14] tracking-tight font-display bg-gradient-to-r from-[#FFF2BF] via-[#E5C158] to-[#F3D98B] bg-clip-text text-transparent">
              {t(hero.headline_bn, hero.headline_en)}
            </h1>

            {(hero.subheadline_bn || hero.subheadline_en) && (
              <p className="text-base sm:text-xl font-bold text-[#5EEAD4] leading-snug">
                {t(hero.subheadline_bn, hero.subheadline_en)}
              </p>
            )}

            {(hero.description_bn || hero.description_en) && (
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                {t(hero.description_bn, hero.description_en)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a
                href={hero.cta1_url || '/register'}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(hero.cta1_url || '/register');
                }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#F3D98B] via-[#E5C158] to-[#D4A838] hover:brightness-105 text-[#04241D] text-sm font-extrabold shadow-lg shadow-[#E5C158]/20 transition-all whitespace-nowrap shrink-0"
              >
                <span>{t(hero.cta1_text_bn, hero.cta1_text_en)}</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {hero.show_cta2 && (hero.cta2_text_bn || hero.cta2_text_en) && (
                <a
                  href={hero.cta2_url || '/hub'}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLink(hero.cta2_url || '/hub');
                  }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#0A362C]/75 hover:bg-[#0F4C42] border border-[#2DD4BF]/40 text-[#CCFBF1] text-sm font-bold transition-all whitespace-nowrap shrink-0"
                >
                  <span>{t(hero.cta2_text_bn, hero.cta2_text_en)}</span>
                </a>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Realistic Dark Glass Smartphone Mockup */}
          {hero.show_phone_mockup && (
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[345px]">
                {/* Ambient Halo behind phone */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-[3rem] bg-gradient-to-tr from-[#14B8A6]/30 via-[#0F4C42]/20 to-[#E5C158]/25 blur-2xl pointer-events-none"
                />

                {/* Smartphone Chassis */}
                <div className="relative rounded-[2.6rem] p-2.5 bg-gradient-to-b from-[#1E3A34] via-[#0B1C18] to-[#0D1117] border border-[#2DD4BF]/35 shadow-[0_28px_70px_-15px_rgba(0,0,0,0.75)]">
                  {/* Top Notch / Speaker */}
                  <div className="flex items-center justify-center pt-1 pb-2.5">
                    <div className="w-20 h-4 rounded-full bg-[#040B0A] border border-white/10 flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]/70" />
                      <span className="w-8 h-1 rounded-full bg-white/15" />
                    </div>
                  </div>

                  {/* Phone Inner Screen */}
                  <div className="rounded-[2rem] bg-gradient-to-b from-[#071D18] to-[#0B1115] border border-white/10 overflow-hidden">
                    {/* App Header inside Phone */}
                    <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-white/10 bg-[#051713]/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <HcfbBrandMark logoUrl={identity?.logo_url} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[#F3D98B] tracking-tight truncate">
                            {identity?.short_name || 'HCFB'}
                          </p>
                          <p className="text-[10px] text-[#5EEAD4] truncate">
                            {t('অফিসিয়াল পোর্টাল', 'Official Program')}
                          </p>
                        </div>
                      </div>

                      {offerText && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E5C158]/15 border border-[#E5C158]/35 text-[#F3D98B] text-[10px] font-bold shrink-0">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{offerText}</span>
                        </span>
                      )}
                    </div>

                    {/* Thumbnail / Video Preview */}
                    <div className="relative aspect-[16/10] bg-[#041410] overflow-hidden group">
                      <ResilientImage
                        src={cardThumbnail}
                        alt={cardTitle}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071D18] via-black/20 to-transparent" />

                      {hero.show_video_preview && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isPreview) return;
                            if (embedVideo) {
                              setVideoOpen(true);
                            } else if (selectedComp) {
                              navigate(`/competitions/${selectedComp.slug}`);
                            } else {
                              navigate('/hub');
                            }
                          }}
                          aria-label={
                            embedVideo
                              ? t('ভিডিও প্রিভিউ দেখুন', 'Play Video Preview')
                              : t('বিস্তারিত দেখুন', 'View Program Details')
                          }
                          className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        >
                          <span className="w-12 h-12 rounded-full bg-[#E5C158]/95 hover:bg-[#F3D98B] text-[#04241D] flex items-center justify-center shadow-lg shadow-black/40 transition-transform group-hover:scale-105">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-4 space-y-3.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF] mb-1">
                          {selectedComp
                            ? t('চলমান জাতীয় আয়োজন', 'Featured Competition')
                            : t('ফাউন্ডেশন কার্যক্রম', 'Foundation Initiative')}
                        </p>
                        <h2 className="text-sm font-bold text-white leading-snug line-clamp-2 font-display">
                          {cardTitle}
                        </h2>
                      </div>

                      {/* Real Metrics Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/80">
                        {hero.show_enrollments && selectedComp && (
                          <span className="inline-flex items-center gap-1 tabular-nums text-[#5EEAD4] font-semibold">
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {selectedComp.participant_count ?? 0}{' '}
                              {t('জন নিবন্ধিত', 'Registered')}
                            </span>
                          </span>
                        )}

                        {selectedComp?.registration_deadline && (
                          <span className="inline-flex items-center gap-1 tabular-nums text-white/70">
                            <Calendar className="w-3 h-3 text-[#E5C158]" />
                            <span>{selectedComp.registration_deadline}</span>
                          </span>
                        )}

                        {hero.phone_rating && hero.phone_rating.trim() !== '' && (
                          <span className="inline-flex items-center gap-1 tabular-nums text-[#F3D98B] font-semibold">
                            <Star className="w-3 h-3 fill-[#E5C158] text-[#E5C158]" />
                            <span>{hero.phone_rating}</span>
                            {hero.phone_review_count && (
                              <span className="text-white/60">({hero.phone_review_count})</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Optional Admin-Configured Fee / Discount */}
                      {hero.phone_fee && hero.phone_fee.trim() !== '' && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-baseline gap-2 tabular-nums">
                            <span className="text-base font-extrabold text-[#F3D98B]">
                              {hero.phone_fee}
                            </span>
                            {hero.phone_previous_fee && (
                              <span className="text-xs text-white/45 line-through">
                                {hero.phone_previous_fee}
                              </span>
                            )}
                          </div>
                          {hero.phone_discount && (
                            <span className="text-[11px] font-bold text-[#5EEAD4]">
                              {hero.phone_discount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom CTA inside Phone */}
                      <div className="pt-1 flex items-center gap-2">
                        <a
                          href={phoneActionUrl}
                          onClick={(e) => {
                            e.preventDefault();
                            handleLink(phoneActionUrl);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:brightness-110 text-white text-xs font-extrabold shadow-md shadow-[#14B8A6]/25 transition-all"
                        >
                          <Trophy className="w-3.5 h-3.5 text-[#F3D98B]" />
                          <span>{t(hero.cta1_text_bn, hero.cta1_text_en)}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Home Indicator */}
                  <div className="flex justify-center pt-2.5 pb-0.5">
                    <div className="w-24 h-1 rounded-full bg-white/25" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Modal (Only active if Admin configured a valid video URL) */}
      {videoOpen && embedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="bg-[#071D18] border border-[#2DD4BF]/30 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h3 className="text-sm font-bold text-[#F3D98B]">{cardTitle}</h3>
              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                aria-label="Close video"
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {embedVideo.type === 'iframe' ? (
                <iframe
                  src={embedVideo.src}
                  title={cardTitle}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={embedVideo.src} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
