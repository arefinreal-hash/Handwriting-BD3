import React, { useEffect, useState } from 'react';
import {
  X,
  Search,
  Download,
  Calendar,
  BookOpen,
  Printer,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Facebook,
  Youtube,
  Instagram,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';
import type { GalleryItem, HubResource, Notice } from '../types/hcfb';

const GALLERY_CATEGORIES = [
  'All',
  'Handwriting Competition',
  'Calligraphy',
  'Workshops & Training',
  'Award Ceremonies',
  'Educational Activities',
  'Other Events',
];

export function GalleryPage() {
  const { t } = useApp();
  const [category, setCategory] = useState('All');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/gallery?category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <header className="space-y-3 border-b border-[#EDE9FE] pb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#EC4899]">
          {t('দৃশ্যমান আর্কাইভ', 'Visual Archive')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">{t('গ্যালারি', 'Gallery')}</h1>
      </header>

      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#F5F3FF] rounded-2xl border border-[#DDD6FE]">
        {GALLERY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              category === cat ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-[#4C1D95]/75 hover:text-[#4C1D95]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] bg-[#F5F3FF] rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#EDE9FE] rounded-3xl p-12 text-center text-sm text-[#1E1B4B]/70">
          {t('এই বিভাগে এখনো কোনো ছবি যুক্ত করা হয়নি।', 'No gallery items in this category yet.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(item)}
              className="group bg-white border border-[#EDE9FE] rounded-3xl overflow-hidden text-left shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#F5F3FF]">
                <ResilientImage
                  src={item.image_url}
                  alt={t(item.title_bn, item.title_en)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="p-5 space-y-1.5">
                <p className="text-[11px] font-semibold text-[#7C3AED]">
                  {item.category}
                  {item.is_sample === 1 && (
                    <span className="text-[#EC4899]"> · {t('নমুনা', 'Sample')}</span>
                  )}
                </p>
                <h2 className="text-sm font-bold text-[#1E1B4B]">{t(item.title_bn, item.title_en)}</h2>
                <p className="text-xs text-[#1E1B4B]/75 line-clamp-2">
                  {t(item.description_bn, item.description_en)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9FE]">
              <div>
                <h3 className="text-base font-bold text-[#4C1D95]">{t(lightbox.title_bn, lightbox.title_en)}</h3>
                <p className="text-xs text-[#1E1B4B]/60">{lightbox.category} · {lightbox.event_name}</p>
              </div>
              <button type="button" onClick={() => setLightbox(null)} className="p-2 rounded-full hover:bg-[#F5F3FF] cursor-pointer">
                <X className="w-5 h-5 text-[#4C1D95]" />
              </button>
            </div>
            <div className="bg-[#F5F3FF] max-h-[70vh] flex items-center justify-center overflow-hidden">
              <ResilientImage
                src={lightbox.image_url}
                alt={t(lightbox.title_bn, lightbox.title_en)}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="p-5 text-sm text-[#1E1B4B]/80">
              {t(lightbox.description_bn, lightbox.description_en)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NoticesPage() {
  const { t, navigate } = useApp();
  const [query, setQuery] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/notices?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setNotices(d.notices || []))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EDE9FE] pb-6">
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#EC4899]">
            {t('ঘোষণা ও বিজ্ঞপ্তি', 'Official Announcements')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">{t('নোটিশ বোর্ড', 'Notice Board')}</h1>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#7C3AED] absolute left-3.5 top-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('নোটিশ খুঁজুন...', 'Search notices...')}
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[#DDD6FE] bg-white text-sm focus:outline-2 focus:outline-[#7C3AED]"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-[#F5F3FF] animate-pulse" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white border border-[#EDE9FE] rounded-3xl p-10 text-center text-sm text-[#1E1B4B]/70">
          {t('কোনো নোটিশ পাওয়া যায়নি।', 'No notices matched your search.')}
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <article
              key={n.id}
              className="bg-white border border-[#EDE9FE] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-[#C4B5FD] transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#1E1B4B]/65">
                  <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span className="tabular-nums font-medium">{n.published_at}</span>
                  {n.is_important === 1 && (
                    <span className="font-bold text-[#EC4899]">· {t('গুরুত্বপূর্ণ', 'Important')}</span>
                  )}
                  {n.is_sample === 1 && <span>· {t('নমুনা', 'Sample')}</span>}
                </div>
                <h2 className="text-lg font-bold text-[#1E1B4B]">{t(n.title_bn, n.title_en)}</h2>
                <p className="text-sm text-[#1E1B4B]/75">{t(n.summary_bn, n.summary_en)}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/notices/${n.id}`)}
                className="px-5 py-2.5 bg-[#4C1D95] text-white text-xs font-bold rounded-full hover:bg-[#7C3AED] shrink-0 self-start sm:self-center cursor-pointer transition-colors"
              >
                {t('বিস্তারিত পড়ুন', 'Read Notice')}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function NoticeDetailPage({ id }: { id: string }) {
  const { t, navigate } = useApp();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/notices/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotice(d?.notice || null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto p-12"><div className="h-48 bg-[#F5F3FF] rounded-3xl animate-pulse" /></div>;
  if (!notice) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#4C1D95]">{t('নোটিশ পাওয়া যায়নি', 'Notice Not Found')}</h1>
        <button type="button" onClick={() => navigate('/notices')} className="px-5 py-2.5 bg-[#4C1D95] text-white text-sm font-bold rounded-full cursor-pointer">
          {t('নোটিশ বোর্ডে ফিরুন', 'Back to Notices')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-6">
      <button type="button" onClick={() => navigate('/notices')} className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer">
        ← {t('সকল নোটিশ', 'All Notices')}
      </button>
      <article className="bg-white border border-[#EDE9FE] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
        <div className="space-y-2 border-b border-[#EDE9FE] pb-5">
          <p className="text-xs text-[#7C3AED] font-semibold tabular-nums">
            {t('প্রকাশের তারিখ:', 'Published:')} {notice.published_at}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4C1D95] font-display">{t(notice.title_bn, notice.title_en)}</h1>
        </div>
        <div className="text-base text-[#1E1B4B]/85 leading-relaxed whitespace-pre-line">
          {t(notice.content_bn, notice.content_en)}
        </div>
        {notice.attachment_url && (
          <a
            href={notice.attachment_url}
            download={notice.attachment_name || 'hcfb-notice-attachment'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-xs font-bold rounded-full hover:brightness-105"
          >
            <Download className="w-4 h-4" />
            <span>{notice.attachment_name || t('সংযুক্তি ডাউনলোড করুন', 'Download Attachment')}</span>
          </a>
        )}
      </article>
    </div>
  );
}

export function LearningHubPage() {
  const { t } = useApp();
  const [filter, setFilter] = useState('All');
  const [resources, setResources] = useState<HubResource[]>([]);
  const [selected, setSelected] = useState<HubResource | null>(null);
  const [printingSheet, setPrintingSheet] = useState<HubResource | null>(null);

  useEffect(() => {
    fetch(`/api/public/hub?type=${encodeURIComponent(filter)}`)
      .then((r) => r.json())
      .then((d) => setResources(d.resources || []));
  }, [filter]);

  const downloadPrintableGrid = (res: HubResource) => {
    setPrintingSheet(res);
    setTimeout(() => window.print(), 150);
  };

  if (printingSheet) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white space-y-6">
        <div className="flex items-center justify-between border-b pb-4 no-print">
          <h2 className="text-lg font-bold text-[#4C1D95]">{t(printingSheet.title_bn, printingSheet.title_en)}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-bold rounded-full cursor-pointer">
              <Printer className="w-4 h-4 inline mr-1" /> Print / Save PDF
            </button>
            <button type="button" onClick={() => setPrintingSheet(null)} className="px-4 py-2 border border-[#DDD6FE] text-xs font-bold rounded-full cursor-pointer">
              Close
            </button>
          </div>
        </div>
        <div className="border-2 border-[#4C1D95] p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-[#4C1D95]/20 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">HCFB Learning &amp; Creativity Hub</p>
              <h1 className="text-xl font-bold text-[#4C1D95]">{t(printingSheet.title_bn, printingSheet.title_en)}</h1>
            </div>
            <p className="text-xs text-[#1E1B4B]/60">Name: ______________________ Date: ___________</p>
          </div>
          <p className="text-xs text-[#1E1B4B]/75">
            {t('অ-আ-ই-ঈ · স্বরবর্ণ ও ব্যঞ্জনবর্ণের মাত্রা ও সমান উচ্চতা অনুশীলন শিট', 'Practice steady letter height, baseline alignment, and consistent spacing.')}
          </p>
          <div className="space-y-5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className="space-y-2.5 pt-2">
                <div className="border-b border-dashed border-[#4C1D95]/30 h-5" />
                <div className="border-b border-[#4C1D95]/65 h-5" />
                <div className="border-b border-dashed border-[#4C1D95]/25 h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <header className="space-y-3 border-b border-[#EDE9FE] pb-6">
        <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#EC4899]">
          {t('শিক্ষা ও অনুশীলন কেন্দ্র', 'Educational Resources')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
          {t('লার্নিং ও সৃজনশীলতা হাব', 'Learning & Creativity Hub')}
        </h1>
        <p className="text-sm sm:text-base text-[#1E1B4B]/75 max-w-2xl">
          {t(
            'হাতের লেখা অনুশীলন শিট, ক্যালিগ্রাফি গাইডলাইন, শিক্ষামূলক প্রবন্ধ ও মাসিক শিল্পকর্ম প্রদর্শনী।',
            'Articles, printable practice grid sheets, reed-pen calligraphy guides, and curated student showcase.'
          )}
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#F5F3FF] rounded-2xl border border-[#DDD6FE]">
        {[
          { k: 'All', bn: 'সকল উপকরণ', en: 'All Resources' },
          { k: 'article', bn: 'শিক্ষামূলক প্রবন্ধ', en: 'Articles' },
          { k: 'practice_sheet', bn: 'অনুশীলন শিট (PDF)', en: 'Practice Sheets' },
          { k: 'calligraphy_guide', bn: 'ক্যালিগ্রাফি গাইড', en: 'Calligraphy Guides' },
          { k: 'artwork_of_month', bn: 'মাসের সেরা শিল্পকর্ম', en: 'Artwork of the Month' },
          { k: 'student_showcase', bn: 'শিক্ষার্থী প্রদর্শনী', en: 'Student Showcase' },
        ].map((tab) => (
          <button
            key={tab.k}
            type="button"
            onClick={() => setFilter(tab.k)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filter === tab.k ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-[#4C1D95]/75 hover:text-[#4C1D95]'
            }`}
          >
            {t(tab.bn, tab.en)}
          </button>
        ))}
      </div>

      {/* Featured Artwork of the Month Spotlight */}
      {filter === 'All' &&
        resources.some((r) => r.type === 'artwork_of_month') &&
        (() => {
          const featured = resources.find((r) => r.type === 'artwork_of_month')!;
          return (
            <section className="bg-gradient-to-r from-[#F5F3FF] to-[#FDF2F8] border border-[#DDD6FE] rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm">
              <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto bg-white">
                <ResilientImage
                  src={featured.image_url}
                  alt={t(featured.title_bn, featured.title_en)}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#7C3AED]">
                  {t('মাসের নির্বাচিত শিল্পকর্ম', 'Featured Artwork of the Month')}
                  {featured.is_sample === 1 && (
                    <span className="text-[#EC4899] ml-2">· {t('নমুনা', 'Sample')}</span>
                  )}
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4C1D95] font-display">
                  {t(featured.title_bn, featured.title_en)}
                </h2>
                <p className="text-sm sm:text-base text-[#1E1B4B]/80 leading-relaxed">
                  {t(featured.summary_bn, featured.summary_en)}
                </p>
                <p className="text-xs text-[#4C1D95]/70 font-semibold">{featured.author_or_artist}</p>
                <div>
                  <button
                    type="button"
                    onClick={() => setSelected(featured)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4C1D95] text-white text-xs font-bold rounded-full hover:bg-[#7C3AED] cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('বিস্তারিত দেখুন', 'View Curatorial Note')}</span>
                  </button>
                </div>
              </div>
            </section>
          );
        })()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((res) => (
          <article key={res.id} className="bg-white border border-[#EDE9FE] rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm">
            <div>
              {res.image_url && (
                <div className="aspect-[4/3] bg-[#F5F3FF] border-b border-[#EDE9FE] overflow-hidden">
                  <ResilientImage
                    src={res.image_url}
                    alt={t(res.title_bn, res.title_en)}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 space-y-2.5">
                <p className="text-[11px] text-[#1E1B4B]/60">
                  <span className="font-bold text-[#7C3AED] uppercase">{res.type.replace(/_/g, ' ')}</span>
                  {res.is_sample === 1 && <span className="text-[#EC4899] font-semibold"> · {t('নমুনা', 'Sample')}</span>}
                </p>
                <h2 className="text-lg font-bold text-[#1E1B4B]">{t(res.title_bn, res.title_en)}</h2>
                <p className="text-sm text-[#1E1B4B]/75 leading-relaxed">{t(res.summary_bn, res.summary_en)}</p>
              </div>
            </div>
            <div className="px-6 pb-6 pt-3 border-t border-[#EDE9FE] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelected(res)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4C1D95] text-white text-xs font-bold rounded-full hover:bg-[#5B21B6] cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t('পড়ুন', 'Read Guide')}</span>
              </button>
              <a
                href={`/api/public/hub/${res.id}/pdf`}
                download={`hcfb-resource-${res.id}.pdf`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-xs font-bold rounded-full hover:brightness-105"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('PDF ডাউনলোড', 'Download PDF')}</span>
              </a>
              {(res.type === 'practice_sheet' || res.download_template_key) && (
                <button
                  type="button"
                  onClick={() => downloadPrintableGrid(res)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#DDD6FE] text-[#4C1D95] text-xs font-bold rounded-full hover:bg-[#F5F3FF] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('প্রিন্ট গ্রিড', 'Print Grid')}</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#EDE9FE] pb-4">
              <div>
                <p className="text-xs font-bold text-[#7C3AED]">{selected.author_or_artist}</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#4C1D95] mt-1 font-display">{t(selected.title_bn, selected.title_en)}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-[#F5F3FF] cursor-pointer">
                <X className="w-5 h-5 text-[#4C1D95]" />
              </button>
            </div>
            <div className="text-sm sm:text-base text-[#1E1B4B]/85 leading-relaxed whitespace-pre-line">
              {t(selected.content_bn, selected.content_en)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactPage() {
  const { t, bootstrap } = useApp();
  const idn = bootstrap?.settings?.site_identity;
  const whatsapp = idn?.whatsapp_number || '8801869970401';

  const [form, setForm] = useState({ name: '', email: '', mobile: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ ok: false, text: json.error || 'Could not send message.' });
      } else {
        setStatus({ ok: true, text: json.message });
        setForm({ name: '', email: '', mobile: '', subject: '', message: '' });
      }
    } catch {
      setStatus({ ok: false, text: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <header className="space-y-2 border-b border-[#EDE9FE] pb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#EC4899]">
          {t('যোগাযোগ', 'Get In Touch')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
          {t('আমাদের সাথে যোগাযোগ করুন', 'Contact Us')}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-[#F5F3FF] to-[#FDF2F8] border border-[#DDD6FE] rounded-3xl p-7 space-y-5 shadow-sm">
            <div>
              <h2 className="text-base font-extrabold text-[#4C1D95] font-display">
                HANDWRITING &amp; CALLIGRAPHY FOUNDATION OF BANGLADESH
              </h2>
              <p className="text-xs font-semibold text-[#7C3AED] mt-0.5">
                হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ
              </p>
            </div>

            <div className="space-y-3 text-sm text-[#1E1B4B]/85">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#EC4899] mt-1 shrink-0" />
                <div className="tabular-nums">
                  <p className="font-bold text-[#4C1D95]">{idn?.primary_mobile || '+880 1869-970401'}</p>
                  <p>{idn?.secondary_mobile || '01605278615'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#7C3AED] mt-1 shrink-0" />
                <p>{idn?.email || 'hcfb2026@gmail.com'}</p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#2563EB] mt-1 shrink-0" />
                <p>
                  {t(
                    idn?.address_bn || 'অফিসিয়াল ঠিকানা: পরবর্তীতে সংযুক্ত করা হবে',
                    idn?.address_en || 'Official Address: To be updated later'
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#DDD6FE]">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#059669] text-white text-xs font-bold rounded-full hover:bg-[#047857]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('হোয়াটসঅ্যাপে বার্তা দিন', 'WhatsApp')}</span>
              </a>
              <a
                href={idn?.facebook_url || 'https://www.facebook.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#DDD6FE] text-[#4C1D95] text-xs font-bold rounded-full hover:bg-[#F5F3FF]"
              >
                <Facebook className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#DDD6FE] text-[#4C1D95] text-xs font-bold rounded-full hover:bg-[#F5F3FF]"
              >
                <Youtube className="w-3.5 h-3.5 text-[#EC4899]" />
                <span>YouTube</span>
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#DDD6FE] text-[#4C1D95] text-xs font-bold rounded-full hover:bg-[#F5F3FF]"
              >
                <Instagram className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-[#EDE9FE] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#4C1D95] font-display">{t('বার্তা পাঠান', 'Send a Message')}</h2>
          {status && (
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${status.ok ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {status.ok && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{status.text}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#4C1D95] mb-1">{t('আপনার নাম *', 'Name *')}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4C1D95] mb-1">{t('মোবাইল নম্বর *', 'Mobile Number *')}</label>
              <input
                type="tel"
                required
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#4C1D95] mb-1">{t('ইমেইল', 'Email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4C1D95] mb-1">{t('বিষয় *', 'Subject *')}</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">{t('বার্তা *', 'Message *')}</label>
            <textarea
              rows={4}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="px-7 py-3 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
          >
            {sending ? t('পাঠানো হচ্ছে...', 'Sending...') : t('বার্তা প্রেরণ করুন', 'Send Message')}
          </button>
        </form>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { t, navigate } = useApp();
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
      <p className="text-lg font-mono font-extrabold text-[#EC4899]">404</p>
      <h1 className="text-3xl font-extrabold text-[#4C1D95] font-display">{t('পাতাটি পাওয়া যায়নি', 'Page Not Found')}</h1>
      <p className="text-sm text-[#1E1B4B]/75">
        {t(
          'আপনি যে পাতাটি খুঁজছেন তা সরানো হয়েছে অথবা ঠিকানাটি সঠিক নয়।',
          'The page you requested could not be found on the HCFB portal.'
        )}
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="px-7 py-3 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
      >
        {t('হোমপেইজে ফিরে যান', 'Return Home')}
      </button>
    </div>
  );
}
