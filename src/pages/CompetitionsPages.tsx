import { useEffect, useState } from 'react';
import { Calendar, Users, ArrowRight, Award, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';
import { AWARD_LABELS, type Competition, type CompetitionCategory, type ScoringCriterion } from '../types/hcfb';

export function CompetitionsListPage() {
  const { t, bootstrap, loading, navigate } = useApp();
  const [filter, setFilter] = useState<'all' | 'published' | 'closed'>('all');
  const competitions = bootstrap?.competitions || [];

  const filtered = competitions.filter((c) => (filter === 'all' ? true : c.status === filter));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EDE9FE] pb-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#EC4899]">
            {t('জাতীয় ও আঞ্চলিক আয়োজন', 'Events & Contests')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
            {t('প্রতিযোগিতা ও ইভেন্টসমূহ', 'Competitions & Events')}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1.5 bg-[#F5F3FF] rounded-full border border-[#DDD6FE] self-start">
          {[
            { key: 'all', bn: 'সকল', en: 'All' },
            { key: 'published', bn: 'চলমান', en: 'Open' },
            { key: 'closed', bn: 'সমাপ্ত', en: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as 'all' | 'published' | 'closed')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.key
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-[#4C1D95]/75 hover:text-[#4C1D95]'
              }`}
            >
              {t(tab.bn, tab.en)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-[#F5F3FF] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#EDE9FE] rounded-3xl p-12 text-center text-sm text-[#1E1B4B]/70">
          {t('এই মুহূর্তে কোনো প্রতিযোগিতা পাওয়া যায়নি।', 'No competitions found in this filter.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filtered.map((comp) => (
            <article
              key={comp.id}
              className="bg-white border border-[#EDE9FE] rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="aspect-[16/9] bg-[#F5F3FF] overflow-hidden border-b border-[#EDE9FE]">
                  <ResilientImage
                    src={comp.banner_url}
                    alt={t(comp.title_bn, comp.title_en)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#1E1B4B]/70">
                    <span className={comp.status === 'published' ? 'text-[#059669] font-bold' : 'text-[#4C1D95]/60 font-bold'}>
                      {comp.status === 'published'
                        ? t('নিবন্ধন চলছে', 'Registration Open')
                        : t('সমাপ্ত', 'Closed')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {t('শেষ তারিখ:', 'Deadline:')} {comp.registration_deadline}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-semibold text-[#7C3AED]">
                      {t('নিবন্ধন:', 'Registered:')} {comp.participant_count ?? 0}
                    </span>
                  </div>

                  <h2 className="text-xl font-extrabold text-[#4C1D95] font-display">
                    {t(comp.title_bn, comp.title_en)}
                  </h2>

                  <p className="text-sm text-[#1E1B4B]/75 leading-relaxed line-clamp-3">
                    {t(comp.description_bn, comp.description_en)}
                  </p>
                </div>
              </div>

              <div className="px-7 pb-7 pt-4 border-t border-[#EDE9FE] flex flex-wrap items-center gap-3">
                {comp.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/register?competition=${comp.id}`)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-xs font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm"
                  >
                    <span>{t('রেজিস্ট্রেশন করুন', 'Register Now')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/competitions/${comp.slug}`)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-[#DDD6FE] text-[#4C1D95] text-xs font-bold rounded-full hover:bg-[#F5F3FF] cursor-pointer"
                >
                  <span>{t('বিস্তারিত ও ফলাফল', 'Details & Merit List')}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

interface CompetitionDetailResponse {
  competition: Competition;
  categories: CompetitionCategory[];
  criteria: ScoringCriterion[];
  districtStats: Array<{ district: string; count: number }>;
  meritList: Array<{
    registration_id: string;
    name_bn: string;
    name_en: string;
    school_name: string;
    district: string;
    award_tier: string;
    total_score: number | null;
    rank_position: number | null;
    is_sample: number;
    category_name_bn: string;
    category_name_en: string;
  }>;
}

export function CompetitionDetailPage({ slug }: { slug: string }) {
  const { t, navigate } = useApp();
  const [data, setData] = useState<CompetitionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public/competitions/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Competition not found');
        return res.json();
      })
      .then((json: CompetitionDetailResponse) => {
        if (active) setData(json);
      })
      .catch((e) => {
        if (active) setErr(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-6">
        <div className="h-64 rounded-3xl bg-[#F5F3FF] animate-pulse" />
        <div className="h-32 rounded-3xl bg-[#F5F3FF] animate-pulse" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#4C1D95]">{t('প্রতিযোগিতা পাওয়া যায়নি', 'Competition Not Found')}</h1>
        <button
          type="button"
          onClick={() => navigate('/competitions')}
          className="px-6 py-2.5 bg-[#4C1D95] text-white text-sm font-bold rounded-full cursor-pointer"
        >
          {t('সকল প্রতিযোগিতায় ফিরুন', 'Back to Competitions')}
        </button>
      </div>
    );
  }

  const { competition: comp, categories, criteria, districtStats, meritList } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
      <div className="bg-white border border-[#EDE9FE] rounded-3xl overflow-hidden shadow-sm">
        <div className="aspect-[21/9] max-h-[380px] w-full bg-[#F5F3FF] overflow-hidden border-b border-[#EDE9FE]">
          <ResilientImage
            src={comp.banner_url}
            alt={t(comp.title_bn, comp.title_en)}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#1E1B4B]/70">
            <span className="font-bold text-[#059669]">
              {comp.status === 'published' ? t('নিবন্ধন চলছে', 'Open for Registration') : t('সমাপ্ত', 'Closed')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
              {t('নিবন্ধন শুরু:', 'Opens:')} {comp.registration_open_date}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {t('শেষ তারিখ:', 'Deadline:')} {comp.registration_deadline}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {t('প্রতিযোগিতার তারিখ:', 'Event Date:')} {comp.competition_date}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#4C1D95] tabular-nums">
              <Users className="w-3.5 h-3.5 text-[#EC4899]" />
              {comp.participant_count ?? 0} {t('নিবন্ধিত', 'Registered')}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#4C1D95] font-display">
              {t(comp.title_bn, comp.title_en)}
            </h1>
            {comp.status === 'published' && (
              <button
                type="button"
                onClick={() => navigate(`/register?competition=${comp.id}`)}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 shrink-0 cursor-pointer shadow-md"
              >
                <span>{t('অনলাইনে রেজিস্ট্রেশন করুন', 'Register Online')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-base text-[#1E1B4B]/80 leading-relaxed max-w-3xl">
            {t(comp.description_bn, comp.description_en)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#EDE9FE] rounded-3xl p-6 space-y-3 shadow-sm">
            <h2 className="text-lg font-bold text-[#4C1D95] font-display">{t('অংশগ্রহণের যোগ্যতা', 'Eligibility Criteria')}</h2>
            <p className="text-sm text-[#1E1B4B]/80 leading-relaxed">
              {t(comp.eligibility_bn, comp.eligibility_en)}
            </p>
          </div>

          <div className="bg-white border border-[#EDE9FE] rounded-3xl p-6 space-y-3 shadow-sm">
            <h2 className="text-lg font-bold text-[#4C1D95] font-display">{t('নিয়মাবলী ও নির্দেশিকা', 'Rules & Guidelines')}</h2>
            <p className="text-sm text-[#1E1B4B]/80 leading-relaxed whitespace-pre-line">
              {t(comp.rules_bn, comp.rules_en)}
            </p>
          </div>

          {criteria.length > 0 && (
            <div className="bg-white border border-[#EDE9FE] rounded-3xl p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-[#4C1D95] font-display">{t('বিচার ও মূল্যায়ন মানদণ্ড', 'Evaluation Criteria')}</h2>
              <div className="divide-y divide-[#EDE9FE]">
                {criteria.map((cr) => (
                  <div key={cr.id} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#1E1B4B]">{t(cr.name_bn, cr.name_en)}</span>
                    <span className="font-mono tabular-nums text-xs font-bold text-[#7C3AED]">
                      {cr.max_points} pts ({cr.weight_percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#EDE9FE] rounded-3xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-[#4C1D95] font-display">{t('বিভাগ ও অংশগ্রহণ পরিসংখ্যান', 'Categories & Statistics')}</h2>
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 bg-[#F5F3FF]/70 border border-[#DDD6FE] rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#1E1B4B]">{t(cat.name_bn, cat.name_en)}</p>
                    {cat.age_or_class_range && (
                      <p className="text-xs text-[#1E1B4B]/65">{cat.age_or_class_range}</p>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-xs font-bold text-[#7C3AED]">
                    {cat.participant_count ?? 0} {t('জন', 'entries')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {districtStats.length > 0 && (
            <div className="bg-white border border-[#EDE9FE] rounded-3xl p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-[#4C1D95] flex items-center gap-2 font-display">
                <MapPin className="w-4 h-4 text-[#EC4899]" />
                <span>{t('জেলাভিত্তিক অংশগ্রহণ', 'District Distribution')}</span>
              </h2>
              <div className="space-y-2">
                {districtStats.map((d) => (
                  <div key={d.district} className="flex items-center justify-between text-xs">
                    <span className="text-[#1E1B4B]/80 font-medium">{d.district}</span>
                    <span className="font-mono tabular-nums font-bold text-[#4C1D95]">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {comp.results_published === 1 && meritList.length > 0 && (
        <section className="bg-white border border-[#EDE9FE] rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#059669] flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>{t('প্রকাশিত ফলাফল', 'Published Merit List')}</span>
              </p>
              <h2 className="text-2xl font-extrabold text-[#4C1D95] mt-1 font-display">
                {t('মেধাতালিকা ও বিজয়ী বৃন্দ', 'Official Results & Merit Standings')}
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#EDE9FE] text-xs text-[#4C1D95]/70">
                  <th className="py-3 pr-4">{t('অবস্থান', 'Rank')}</th>
                  <th className="py-3 pr-4">{t('রেজিস্ট্রেশন নং', 'Reg ID')}</th>
                  <th className="py-3 pr-4">{t('অংশগ্রহণকারী', 'Participant')}</th>
                  <th className="py-3 pr-4">{t('বিভাগ', 'Category')}</th>
                  <th className="py-3 pr-4">{t('জেলা', 'District')}</th>
                  <th className="py-3 pr-4">{t('পুরস্কার', 'Award')}</th>
                  <th className="py-3 text-right">{t('নম্বর', 'Score')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE9FE]">
                {meritList.map((row) => {
                  const award = AWARD_LABELS[row.award_tier] || AWARD_LABELS.merit;
                  return (
                    <tr key={row.registration_id}>
                      <td className="py-3 pr-4 font-mono tabular-nums font-bold text-[#4C1D95]">
                        {row.rank_position ?? '—'}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums text-xs text-[#7C3AED] font-bold">
                        {row.registration_id}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-[#1E1B4B]">{t(row.name_bn, row.name_en)}</p>
                        <p className="text-xs text-[#1E1B4B]/60">{row.school_name}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#1E1B4B]/80">
                        {t(row.category_name_bn, row.category_name_en)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#1E1B4B]/80">{row.district}</td>
                      <td className="py-3 pr-4 text-xs font-bold text-[#059669]">
                        {t(award.bn, award.en)}
                        {row.is_sample === 1 && <span className="text-[#EC4899] ml-1">({t('নমুনা', 'Sample')})</span>}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums font-bold text-[#4C1D95]">
                        {row.total_score ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
