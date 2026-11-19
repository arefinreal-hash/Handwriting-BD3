import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Award,
  Bell,
  Image as ImageIcon,
  BookOpen,
  UserCheck,
  Mail,
  Settings,
  Shield,
  Download,
  Printer,
  Trash2,
  Plus,
  LogOut,
  CheckCircle2,
  Database,
  Search,
  Eye,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HeroSection } from '../components/HeroSection';
import { SiteFooter } from '../components/SiteFooter';
import {
  BANGLADESH_DISTRICTS,
  AWARD_LABELS,
  DEFAULT_HERO_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  type HeroSettings,
  type FooterSettings,
} from '../types/hcfb';

type AdminTab =
  | 'overview'
  | 'registrations'
  | 'competitions'
  | 'certificates'
  | 'notices'
  | 'gallery_hub'
  | 'team_messages'
  | 'settings'
  | 'security';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'content_editor' | 'registration_manager' | 'judge';
  active?: number;
  created_at?: string;
}

interface AdminRegistrationRow {
  id: number;
  registration_id: string;
  competition_id: number;
  category_id: number;
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
  participant_type: string;
  additional_info: string;
  status: string;
  award_tier: string;
  total_score: number | null;
  rank_position: number | null;
  competition_title_bn: string;
  category_name_bn: string;
  certificate_code?: string;
  created_at: string;
}

export function AdminDashboardPage() {
  const { navigate, bootstrap, refreshBootstrap } = useApp();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('hcfb_staff_token'));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [toast, setToast] = useState<string | null>(null);

  // Overview state
  const [overview, setOverview] = useState<{
    metrics: Record<string, number>;
    recentRegistrations: AdminRegistrationRow[];
    districtAnalytics: Array<{ district: string; count: number }>;
    competitionStats: Array<{ id: number; title_bn: string; title_en: string; status: string; total: number; verified_count: number }>;
    statusBreakdown?: Array<{ status: string; count: number }>;
  } | null>(null);

  // Registrations state
  const [regs, setRegs] = useState<AdminRegistrationRow[]>([]);
  const [regPage, setRegPage] = useState(1);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [regTotal, setRegTotal] = useState(0);
  const [regSearch, setRegSearch] = useState('');
  const [regCompFilter, setRegCompFilter] = useState('');
  const [regDistrictFilter, setRegDistrictFilter] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('');
  const [editingReg, setEditingReg] = useState<AdminRegistrationRow | null>(null);
  const [confirmDeleteReg, setConfirmDeleteReg] = useState<AdminRegistrationRow | null>(null);

  // Competitions state
  const [adminComps, setAdminComps] = useState<Array<Record<string, unknown>>>([]);
  const [editingCriteriaComp, setEditingCriteriaComp] = useState<{
    id: number;
    title: string;
    criteria: Array<{ name_bn: string; name_en: string; weight_percent: number; max_points: number }>;
  } | null>(null);
  const [newComp, setNewComp] = useState({
    title_bn: '',
    title_en: '',
    description_bn: '',
    description_en: '',
    banner_url: '',
    registration_open_date: new Date().toISOString().slice(0, 10),
    registration_deadline: '2026-12-31',
    competition_date: '2027-01-20',
    eligibility_bn: '',
    eligibility_en: '',
    rules_bn: '',
    rules_en: '',
    cat_bn: 'সাধারণ বিভাগ',
    cat_en: 'Open Category',
    is_featured: false,
  });

  // Certificates state
  const [certs, setCerts] = useState<Array<Record<string, unknown>>>([]);
  const [bulkCertCompId, setBulkCertCompId] = useState<string>('');

  // Notices state
  const [adminNotices, setAdminNotices] = useState<Array<Record<string, unknown>>>([]);
  const [newNotice, setNewNotice] = useState({
    title_bn: '',
    title_en: '',
    summary_bn: '',
    summary_en: '',
    content_bn: '',
    content_en: '',
    attachment_url: '',
    attachment_name: '',
    is_important: false,
  });

  // Gallery & Hub state
  const [newGal, setNewGal] = useState({
    title_bn: '',
    title_en: '',
    description_bn: '',
    description_en: '',
    category: 'Handwriting Competition',
    image_url: '',
    event_name: '',
    is_featured_artwork: false,
  });
  const [newHub, setNewHub] = useState({
    type: 'article',
    title_bn: '',
    title_en: '',
    summary_bn: '',
    summary_en: '',
    content_bn: '',
    content_en: '',
    author_or_artist: '',
    image_url: '',
  });

  // Team & Messages state
  const [newTeam, setNewTeam] = useState({
    name_bn: '',
    name_en: '',
    designation_bn: '',
    designation_en: '',
    bio_bn: '',
    bio_en: '',
    photo_url: '',
    social_link: '',
    display_order: 1,
  });
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [adminTestimonials, setAdminTestimonials] = useState<Array<Record<string, unknown>>>([]);
  const [newTestimonial, setNewTestimonial] = useState({
    author_name_bn: '',
    author_name_en: '',
    role_bn: '',
    role_en: '',
    organization: '',
    quote_bn: '',
    quote_en: '',
    is_verified: true,
  });

  // Settings state
  const [siteIdentity, setSiteIdentity] = useState<Record<string, unknown>>({});
  const [homeContent, setHomeContent] = useState<Record<string, unknown>>({});
  const [heroForm, setHeroForm] = useState<HeroSettings>(DEFAULT_HERO_SETTINGS);
  const [footerForm, setFooterForm] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [regFieldCfg, setRegFieldCfg] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState<'hero' | 'footer' | null>(null);
  const [confirmClearSamples, setConfirmClearSamples] = useState(false);

  // Security & Audit
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'content_editor' });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = useCallback(
    (extra?: Record<string, string>) => ({
      ...(extra || {}),
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const verifySession = useCallback(async (tok: string) => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) {
      sessionStorage.removeItem('hcfb_staff_token');
      setToken(null);
      setUser(null);
      return;
    }
    const json = await res.json();
    if (json.user.role === 'judge') {
      setAuthError('Judge accounts should access /judge.');
      return;
    }
    setUser(json.user);
  }, []);

  useEffect(() => {
    if (token) verifySession(token);
  }, [token, verifySession]);

  useEffect(() => {
    if (bootstrap?.settings) {
      setSiteIdentity({ ...bootstrap.settings.site_identity });
      setHomeContent({ ...bootstrap.settings.homepage_content });
      setHeroForm({ ...DEFAULT_HERO_SETTINGS, ...(bootstrap.settings.hero_settings || {}) });
      setFooterForm({ ...DEFAULT_FOOTER_SETTINGS, ...(bootstrap.settings.footer_settings || {}) });
      setRegFieldCfg({ ...bootstrap.settings.registration_field_config });
    }
  }, [bootstrap]);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/overview', { headers: authHeaders() });
    if (res.ok) setOverview(await res.json());
  }, [token, authHeaders]);

  const loadRegistrations = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams({
      page: String(regPage),
      limit: '15',
      q: regSearch,
      competition_id: regCompFilter,
      district: regDistrictFilter,
      status: regStatusFilter,
    });
    const res = await fetch(`/api/admin/registrations?${params.toString()}`, { headers: authHeaders() });
    if (res.ok) {
      const json = await res.json();
      setRegs(json.registrations || []);
      setRegTotalPages(json.totalPages || 1);
      setRegTotal(json.total || 0);
    }
  }, [token, authHeaders, regPage, regSearch, regCompFilter, regDistrictFilter, regStatusFilter]);

  const loadCompetitions = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/competitions', { headers: authHeaders() });
    if (res.ok) setAdminComps((await res.json()).competitions || []);
  }, [token, authHeaders]);

  const loadCertificates = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/certificates', { headers: authHeaders() });
    if (res.ok) setCerts((await res.json()).certificates || []);
  }, [token, authHeaders]);

  const loadNotices = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/notices', { headers: authHeaders() });
    if (res.ok) setAdminNotices((await res.json()).notices || []);
  }, [token, authHeaders]);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    const [mRes, tRes] = await Promise.all([
      fetch('/api/admin/messages', { headers: authHeaders() }),
      fetch('/api/admin/testimonials', { headers: authHeaders() }),
    ]);
    if (mRes.ok) setMessages((await mRes.json()).messages || []);
    if (tRes.ok) setAdminTestimonials((await tRes.json()).testimonials || []);
  }, [token, authHeaders]);

  const loadSecurity = useCallback(async () => {
    if (!token || user?.role !== 'super_admin') return;
    const [uRes, lRes] = await Promise.all([
      fetch('/api/admin/users', { headers: authHeaders() }),
      fetch('/api/admin/audit-logs', { headers: authHeaders() }),
    ]);
    if (uRes.ok) setStaffUsers((await uRes.json()).users || []);
    if (lRes.ok) setAuditLogs((await lRes.json()).logs || []);
  }, [token, user?.role, authHeaders]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'overview') loadOverview();
    if (tab === 'registrations') {
      loadRegistrations();
      loadCompetitions();
    }
    if (tab === 'competitions') loadCompetitions();
    if (tab === 'certificates') {
      loadCertificates();
      loadCompetitions();
    }
    if (tab === 'notices') loadNotices();
    if (tab === 'team_messages') loadMessages();
    if (tab === 'security') loadSecurity();
  }, [tab, user, loadOverview, loadRegistrations, loadCompetitions, loadCertificates, loadNotices, loadMessages, loadSecurity]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAuthError(json.error || 'Invalid login credentials.');
      return;
    }
    if (json.user.role === 'judge') {
      setAuthError('Judge account detected. Redirecting to /judge...');
      sessionStorage.setItem('hcfb_staff_token', json.token);
      navigate('/judge');
      return;
    }
    sessionStorage.setItem('hcfb_staff_token', json.token);
    setToken(json.token);
    setUser(json.user);
  };

  const handleUploadFile = async (file: File): Promise<string | null> => {
    if (!token) return null;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Upload failed');
      return null;
    }
    showToast('File uploaded successfully');
    return json.url;
  };

  const downloadAuthenticatedFile = async (endpoint: string, filename: string) => {
    if (!token) return;
    const res = await fetch(endpoint, { headers: authHeaders() });
    if (!res.ok) {
      showToast('Download failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!token || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 lg:py-24 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#4C1D95] text-white mx-auto flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#4C1D95]">HCFB Admin Dashboard</h1>
          <p className="text-xs text-[#4C1D95]/70">
            Protected Foundation Administration &amp; Content Management
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4 shadow-sm">
          {authError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">{authError}</div>}
          <div>
            <label className="block text-xs font-semibold text-[#4C1D95] mb-1">Admin Email</label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#4C1D95]/20 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#4C1D95] mb-1">Password</label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#4C1D95]/20 text-sm"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#4C1D95] text-white text-sm font-semibold rounded-lg hover:bg-[#5B21B6] cursor-pointer">
            Sign In to Admin
          </button>
        </form>
      </div>
    );
  }

  const navButtons: Array<{ id: AdminTab; label: string; icon: React.ElementType; roles: string[] }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['super_admin', 'content_editor', 'registration_manager'] },
    { id: 'registrations', label: 'Registrations', icon: Users, roles: ['super_admin', 'registration_manager'] },
    { id: 'competitions', label: 'Competitions', icon: Trophy, roles: ['super_admin', 'content_editor'] },
    { id: 'certificates', label: 'Certificates', icon: Award, roles: ['super_admin', 'registration_manager'] },
    { id: 'notices', label: 'Notices', icon: Bell, roles: ['super_admin', 'content_editor'] },
    { id: 'gallery_hub', label: 'Gallery & Hub', icon: ImageIcon, roles: ['super_admin', 'content_editor'] },
    { id: 'team_messages', label: 'Team, Testimonials & Inbox', icon: Mail, roles: ['super_admin', 'content_editor', 'registration_manager'] },
    { id: 'settings', label: 'Website Content', icon: Settings, roles: ['super_admin', 'content_editor'] },
    { id: 'security', label: 'Roles, Logs & Backup', icon: Database, roles: ['super_admin'] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-[#4C1D95] text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#D8B56A]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <p className="text-xs font-mono text-[#7C3AED] font-semibold uppercase">
            {user.role.replace('_', ' ')} · {user.email}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#4C1D95]">HCFB Admin Control Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/judge')}
            className="px-3.5 py-2 border border-[#4C1D95]/20 rounded-lg text-xs font-semibold text-[#4C1D95] hover:bg-[#F5F3FF] cursor-pointer"
          >
            Judge Portal
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('hcfb_staff_token');
              setToken(null);
              setUser(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#4C1D95] text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#F5F3FF] rounded-xl border border-[#4C1D95]/10 no-print">
        {navButtons
          .filter((b) => b.roles.includes(user.role))
          .map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setTab(btn.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === btn.id ? 'bg-white text-[#4C1D95] shadow-sm' : 'text-[#4C1D95]/70 hover:text-[#4C1D95]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{btn.label}</span>
              </button>
            );
          })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && overview && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Registrations', val: overview.metrics.totalRegistrations },
              { label: 'Total Competitions', val: overview.metrics.totalCompetitions },
              { label: 'Active Contests', val: overview.metrics.activeCompetitions },
              { label: 'Published Notices', val: overview.metrics.publishedNotices },
              { label: 'Issued Certificates', val: overview.metrics.totalCertificates },
              { label: 'Unread Messages', val: overview.metrics.unreadMessages },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-[#4C1D95]/12 rounded-xl p-4 space-y-1">
                <p className="text-[11px] font-medium text-[#4C1D95]/65">{card.label}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#4C1D95]">{card.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* District Chart */}
            <div className="lg:col-span-5 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#4C1D95]">District-wise Registrations</h2>
              <div className="space-y-3">
                {overview.districtAnalytics.map((d) => {
                  const max = Math.max(1, ...overview.districtAnalytics.map((x) => x.count));
                  const pct = Math.round((d.count / max) * 100);
                  return (
                    <div key={d.district} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#4C1D95]">{d.district}</span>
                        <span className="font-mono tabular-nums font-bold">{d.count}</span>
                      </div>
                      <div className="h-2 bg-[#F5F3FF] rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C3AED]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competition Performance */}
            <div className="lg:col-span-7 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#4C1D95]">Competition Performance</h2>
                <button
                  type="button"
                  onClick={() => downloadAuthenticatedFile('/api/admin/reports/competitions', 'hcfb-competition-report.csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4C1D95] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report CSV</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#4C1D95]/12 text-[#4C1D95]/65">
                      <th className="py-2 pr-3">Competition</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Total</th>
                      <th className="py-2 text-right">Verified / Scored</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#4C1D95]/10">
                    {overview.competitionStats.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 pr-3 font-semibold text-[#4C1D95]">{c.title_en || c.title_bn}</td>
                        <td className="py-2.5 pr-3 uppercase text-[#7C3AED] font-semibold">{c.status}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{c.total}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums">{c.verified_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {overview.statusBreakdown && overview.statusBreakdown.length > 0 && (
                <div className="pt-3 border-t border-[#4C1D95]/10 flex flex-wrap gap-4 text-xs">
                  {overview.statusBreakdown.map((s) => (
                    <span key={s.status} className="text-[#4C1D95]/80">
                      <strong className="uppercase">{s.status}:</strong>{' '}
                      <span className="font-mono tabular-nums">{s.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRATIONS */}
      {tab === 'registrations' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative">
                <Search className="w-4 h-4 text-[#4C1D95]/45 absolute left-3 top-2.5" />
                <input
                  type="search"
                  value={regSearch}
                  onChange={(e) => {
                    setRegSearch(e.target.value);
                    setRegPage(1);
                  }}
                  placeholder="Search Name / ID / Mobile..."
                  className="pl-9 pr-3 py-2 rounded-lg border border-[#4C1D95]/20 text-xs w-56"
                />
              </div>
              <select
                value={regCompFilter}
                onChange={(e) => {
                  setRegCompFilter(e.target.value);
                  setRegPage(1);
                }}
                className="px-3 py-2 rounded-lg border border-[#4C1D95]/20 text-xs"
              >
                <option value="">All Competitions</option>
                {adminComps.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.title_en || c.title_bn)}
                  </option>
                ))}
              </select>
              <select
                value={regDistrictFilter}
                onChange={(e) => {
                  setRegDistrictFilter(e.target.value);
                  setRegPage(1);
                }}
                className="px-3 py-2 rounded-lg border border-[#4C1D95]/20 text-xs"
              >
                <option value="">All Districts</option>
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={regStatusFilter}
                onChange={(e) => {
                  setRegStatusFilter(e.target.value);
                  setRegPage(1);
                }}
                className="px-3 py-2 rounded-lg border border-[#4C1D95]/20 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="evaluated">Evaluated</option>
                <option value="winner">Winner</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadAuthenticatedFile('/api/admin/registrations/export/csv', 'hcfb-registrations.csv')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#4C1D95]/20 text-[#4C1D95] text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print List</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#4C1D95]/12 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F3FF] text-[#4C1D95]/75">
                  <tr>
                    <th className="py-3 px-4">Reg ID</th>
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Mobile &amp; District</th>
                    <th className="py-3 px-4">Competition / Category</th>
                    <th className="py-3 px-4">Status / Award</th>
                    <th className="py-3 px-4 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4C1D95]/10">
                  {regs.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-mono font-bold text-[#7C3AED]">{r.registration_id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#4C1D95]">{r.name_bn}</p>
                        <p className="text-[#4C1D95]/70">{r.name_en} · {r.school_name} ({r.class_level})</p>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <p>{r.mobile}</p>
                        <p className="text-[#4C1D95]/65 font-sans">{r.district}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{r.competition_title_bn}</p>
                        <p className="text-[#4C1D95]/65">{r.category_name_bn}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold uppercase text-[#4C1D95]">{r.status}</p>
                        {r.award_tier !== 'none' && (
                          <p className="text-[#7C3AED] font-semibold">
                            {(AWARD_LABELS[r.award_tier] || AWARD_LABELS.merit).en}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap no-print">
                        <button
                          type="button"
                          onClick={() => setEditingReg(r)}
                          className="px-2.5 py-1 border border-[#4C1D95]/20 rounded hover:bg-[#F5F3FF] font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        {!r.certificate_code && (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch('/api/admin/certificates/issue', {
                                method: 'POST',
                                headers: authHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ registration_pk: r.id }),
                              });
                              if (res.ok) {
                                showToast('Certificate issued with QR verification code');
                                loadRegistrations();
                              }
                            }}
                            className="px-2.5 py-1 bg-[#7C3AED] text-white rounded font-semibold cursor-pointer"
                          >
                            Issue Cert
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteReg(r)}
                          className="p-1 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#4C1D95]/10 flex items-center justify-between text-xs text-[#4C1D95]/70 no-print">
              <span className="tabular-nums">Total: {regTotal} records · Page {regPage} of {regTotalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={regPage <= 1}
                  onClick={() => setRegPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={regPage >= regTotalPages}
                  onClick={() => setRegPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPETITIONS */}
      {tab === 'competitions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {adminComps.map((c) => (
              <div key={String(c.id)} className="bg-white border border-[#4C1D95]/12 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-[#7C3AED] uppercase font-semibold">
                      {String(c.status)} · {String(c.participant_count ?? 0)} participants
                    </p>
                    <h3 className="text-base font-bold text-[#4C1D95]">{String(c.title_bn)}</h3>
                    <p className="text-xs text-[#4C1D95]/70">{String(c.title_en)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#4C1D95]/10">
                  {(['published', 'closed', 'draft'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/competitions/${c.id}`, {
                          method: 'PATCH',
                          headers: authHeaders({ 'Content-Type': 'application/json' }),
                          body: JSON.stringify({ status: st }),
                        });
                        showToast(`Competition marked ${st}`);
                        loadCompetitions();
                        refreshBootstrap();
                      }}
                      className={`px-3 py-1 text-xs rounded border cursor-pointer ${
                        c.status === st ? 'bg-[#4C1D95] text-white' : 'border-[#4C1D95]/20'
                      }`}
                    >
                      Set {st}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/competitions/${c.id}`, {
                        method: 'PATCH',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ is_featured: true }),
                      });
                      showToast('Set as Featured Competition');
                      loadCompetitions();
                      refreshBootstrap();
                    }}
                    className="px-3 py-1 text-xs rounded border border-[#7C3AED] text-[#7C3AED] cursor-pointer"
                  >
                    {c.is_featured === 1 ? 'Featured Active' : 'Make Featured'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/competitions/${c.id}`, {
                        method: 'PATCH',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ results_published: c.results_published !== 1 }),
                      });
                      showToast('Toggled Results Publication');
                      loadCompetitions();
                      refreshBootstrap();
                    }}
                    className="px-3 py-1 text-xs rounded bg-[#7C3AED] text-white cursor-pointer"
                  >
                    {c.results_published === 1 ? 'Hide Results' : 'Publish Merit List'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCriteriaComp({
                        id: Number(c.id),
                        title: String(c.title_en || c.title_bn),
                        criteria: Array.isArray(c.criteria) && c.criteria.length > 0
                          ? (c.criteria as Array<{ name_bn: string; name_en: string; weight_percent: number; max_points: number }>)
                          : [{ name_bn: 'বর্ণের গঠন', name_en: 'Letterform', weight_percent: 100, max_points: 100 }],
                      })
                    }
                    className="px-3 py-1 text-xs rounded border border-[#4C1D95]/20 text-[#4C1D95] cursor-pointer"
                  >
                    Scoring Criteria
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/competitions', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                  ...newComp,
                  categories: [{ name_bn: newComp.cat_bn, name_en: newComp.cat_en, max_score: 100 }],
                }),
              });
              if (res.ok) {
                showToast('New competition created');
                loadCompetitions();
                refreshBootstrap();
              }
            }}
            className="lg:col-span-5 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-base font-bold text-[#4C1D95] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#7C3AED]" /> Create Competition
            </h2>
            <input type="text" required placeholder="Title (Bangla)" value={newComp.title_bn} onChange={(e) => setNewComp({ ...newComp, title_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Title (English)" value={newComp.title_en} onChange={(e) => setNewComp({ ...newComp, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={2} required placeholder="Description (Bangla)" value={newComp.description_bn} onChange={(e) => setNewComp({ ...newComp, description_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={2} required placeholder="Description (English)" value={newComp.description_en} onChange={(e) => setNewComp({ ...newComp, description_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <input type="date" value={newComp.registration_open_date} onChange={(e) => setNewComp({ ...newComp, registration_open_date: e.target.value })} className="px-2 py-2 border rounded-lg text-xs" />
              <input type="date" value={newComp.registration_deadline} onChange={(e) => setNewComp({ ...newComp, registration_deadline: e.target.value })} className="px-2 py-2 border rounded-lg text-xs" />
              <input type="date" value={newComp.competition_date} onChange={(e) => setNewComp({ ...newComp, competition_date: e.target.value })} className="px-2 py-2 border rounded-lg text-xs" />
            </div>
            <input type="text" placeholder="Initial Category (Bangla)" value={newComp.cat_bn} onChange={(e) => setNewComp({ ...newComp, cat_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" placeholder="Initial Category (English)" value={newComp.cat_en} onChange={(e) => setNewComp({ ...newComp, cat_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <div className="text-xs space-y-1">
              <label className="block font-semibold">Upload Banner Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await handleUploadFile(f);
                    if (url) setNewComp({ ...newComp, banner_url: url });
                  }
                }}
                className="text-xs"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer">
              Publish Competition
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: CERTIFICATES */}
      {tab === 'certificates' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#4C1D95]">Automated Bulk Certificate Generation</h2>
              <p className="text-xs text-[#4C1D95]/70">
                Automatically issue QR-verified certificates for all verified, evaluated, and winner participants in a competition.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bulkCertCompId}
                onChange={(e) => setBulkCertCompId(e.target.value)}
                className="px-3 py-2 border border-[#4C1D95]/20 rounded-lg text-xs"
              >
                <option value="">Select Competition...</option>
                {adminComps.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.title_en || c.title_bn)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!bulkCertCompId}
                onClick={async () => {
                  const res = await fetch('/api/admin/certificates/bulk-issue', {
                    method: 'POST',
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ competition_id: Number(bulkCertCompId) }),
                  });
                  const json = await res.json();
                  if (res.ok) {
                    showToast(`Auto-issued ${json.issuedCount} new certificates`);
                    loadCertificates();
                  }
                }}
                className="px-4 py-2 bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Auto-Generate Certificates
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#4C1D95]/12 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F3FF]">
                  <tr>
                    <th className="py-3 px-4">Certificate Code</th>
                    <th className="py-3 px-4">Reg ID</th>
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Competition</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4C1D95]/10">
                  {certs.map((ct) => (
                    <tr key={String(ct.id)}>
                      <td className="py-3 px-4 font-mono font-bold text-[#7C3AED]">{String(ct.certificate_code)}</td>
                      <td className="py-3 px-4 font-mono">{String(ct.registration_id)}</td>
                      <td className="py-3 px-4 font-semibold">{String(ct.participant_name_en)}</td>
                      <td className="py-3 px-4">{String(ct.competition_title_en)}</td>
                      <td className="py-3 px-4 font-semibold">{ct.revoked === 1 ? 'Revoked' : 'Valid'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/verify?code=${ct.certificate_code}`)}
                          className="px-2.5 py-1 border rounded cursor-pointer"
                        >
                          Verify View
                        </button>
                        {user.role === 'super_admin' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/certificates/${ct.id}/revoke`, {
                                method: 'PATCH',
                                headers: authHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({ revoked: ct.revoked !== 1 }),
                              });
                              loadCertificates();
                            }}
                            className="px-2.5 py-1 bg-[#4C1D95] text-white rounded cursor-pointer"
                          >
                            {ct.revoked === 1 ? 'Restore' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NOTICES */}
      {tab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {adminNotices.map((n) => (
              <div key={String(n.id)} className="bg-white border border-[#4C1D95]/12 rounded-xl p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#4C1D95]/60 tabular-nums">{String(n.published_at)}</p>
                  <h3 className="text-sm font-bold text-[#4C1D95]">{String(n.title_bn)}</h3>
                  <p className="text-xs text-[#4C1D95]/75 mt-1">{String(n.summary_bn)}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/notices/${n.id}`, { method: 'DELETE', headers: authHeaders() });
                    loadNotices();
                    refreshBootstrap();
                  }}
                  className="p-2 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/notices', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(newNotice),
              });
              if (res.ok) {
                showToast('Notice published');
                setNewNotice({ title_bn: '', title_en: '', summary_bn: '', summary_en: '', content_bn: '', content_en: '', attachment_url: '', attachment_name: '', is_important: false });
                loadNotices();
                refreshBootstrap();
              }
            }}
            className="lg:col-span-5 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-base font-bold text-[#4C1D95]">Publish New Notice</h2>
            <input type="text" required placeholder="Title (Bangla)" value={newNotice.title_bn} onChange={(e) => setNewNotice({ ...newNotice, title_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Title (English)" value={newNotice.title_en} onChange={(e) => setNewNotice({ ...newNotice, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Summary (Bangla)" value={newNotice.summary_bn} onChange={(e) => setNewNotice({ ...newNotice, summary_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Summary (English)" value={newNotice.summary_en} onChange={(e) => setNewNotice({ ...newNotice, summary_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={3} required placeholder="Full Content (Bangla)" value={newNotice.content_bn} onChange={(e) => setNewNotice({ ...newNotice, content_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={3} required placeholder="Full Content (English)" value={newNotice.content_en} onChange={(e) => setNewNotice({ ...newNotice, content_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <div className="text-xs">
              <label className="block font-semibold mb-1">Optional Attachment (PDF / Image)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await handleUploadFile(f);
                    if (url) setNewNotice({ ...newNotice, attachment_url: url, attachment_name: f.name });
                  }
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={newNotice.is_important} onChange={(e) => setNewNotice({ ...newNotice, is_important: e.target.checked })} />
              <span>Mark as Important Notice</span>
            </label>
            <button type="submit" className="w-full py-2.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer">
              Publish Notice
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: GALLERY & HUB */}
      {tab === 'gallery_hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/gallery', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(newGal),
              });
              if (res.ok) {
                showToast('Gallery item added');
                refreshBootstrap();
              }
            }}
            className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-base font-bold text-[#4C1D95]">Add Gallery Image</h2>
            <input type="text" required placeholder="Title (Bangla)" value={newGal.title_bn} onChange={(e) => setNewGal({ ...newGal, title_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Title (English)" value={newGal.title_en} onChange={(e) => setNewGal({ ...newGal, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <select value={newGal.category} onChange={(e) => setNewGal({ ...newGal, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs">
              <option>Handwriting Competition</option>
              <option>Calligraphy</option>
              <option>Workshops &amp; Training</option>
              <option>Award Ceremonies</option>
              <option>Educational Activities</option>
              <option>Other Events</option>
            </select>
            <input type="text" placeholder="Event Name" value={newGal.event_name} onChange={(e) => setNewGal({ ...newGal, event_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = await handleUploadFile(f);
                  if (url) setNewGal({ ...newGal, image_url: url });
                }
              }}
              className="text-xs"
            />
            <input type="text" required placeholder="Image URL (auto-filled after upload)" value={newGal.image_url} onChange={(e) => setNewGal({ ...newGal, image_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <button type="submit" className="w-full py-2.5 bg-[#4C1D95] text-white text-xs font-semibold rounded-lg cursor-pointer">
              Save to Gallery
            </button>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/hub', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(newHub),
              });
              if (res.ok) {
                showToast('Learning Hub resource added');
                refreshBootstrap();
              }
            }}
            className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-base font-bold text-[#4C1D95] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#7C3AED]" /> Publish Learning Hub Resource
            </h2>
            <select value={newHub.type} onChange={(e) => setNewHub({ ...newHub, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs">
              <option value="article">Educational Article</option>
              <option value="practice_sheet">Practice Sheet</option>
              <option value="calligraphy_guide">Calligraphy Resource</option>
              <option value="artwork_of_month">Artwork of the Month</option>
              <option value="student_showcase">Student Creativity Showcase</option>
            </select>
            <input type="text" required placeholder="Title (Bangla)" value={newHub.title_bn} onChange={(e) => setNewHub({ ...newHub, title_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Title (English)" value={newHub.title_en} onChange={(e) => setNewHub({ ...newHub, title_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Summary (Bangla)" value={newHub.summary_bn} onChange={(e) => setNewHub({ ...newHub, summary_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={3} required placeholder="Content (Bangla)" value={newHub.content_bn} onChange={(e) => setNewHub({ ...newHub, content_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={3} required placeholder="Content (English)" value={newHub.content_en} onChange={(e) => setNewHub({ ...newHub, content_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <button type="submit" className="w-full py-2.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer">
              Publish Resource
            </button>
          </form>

          {/* Existing Gallery & Hub Management */}
          <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#4C1D95]">Published Gallery Items ({bootstrap?.gallery?.length || 0})</h3>
            <div className="divide-y divide-[#4C1D95]/10 max-h-64 overflow-y-auto text-xs">
              {(bootstrap?.gallery || []).map((g) => (
                <div key={g.id} className="py-2 flex items-center justify-between gap-2">
                  <span>{g.title_bn} ({g.category})</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/gallery/${g.id}`, { method: 'DELETE', headers: authHeaders() });
                      showToast('Gallery item removed');
                      refreshBootstrap();
                    }}
                    className="text-red-700 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#4C1D95]">Published Hub Resources ({bootstrap?.hub?.length || 0})</h3>
            <div className="divide-y divide-[#4C1D95]/10 max-h-64 overflow-y-auto text-xs">
              {(bootstrap?.hub || []).map((h) => (
                <div key={h.id} className="py-2 flex items-center justify-between gap-2">
                  <span>{h.title_bn} ({h.type})</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/hub/${h.id}`, { method: 'DELETE', headers: authHeaders() });
                      showToast('Hub resource removed');
                      refreshBootstrap();
                    }}
                    className="text-red-700 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: TEAM & MESSAGES */}
      {tab === 'team_messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/team', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(newTeam),
              });
              if (res.ok) {
                showToast('Team member added');
                refreshBootstrap();
              }
            }}
            className="lg:col-span-5 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3"
          >
            <h2 className="text-base font-bold text-[#4C1D95] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#7C3AED]" /> Add Team Member
            </h2>
            <input type="text" required placeholder="Full Name (Bangla)" value={newTeam.name_bn} onChange={(e) => setNewTeam({ ...newTeam, name_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Full Name (English)" value={newTeam.name_en} onChange={(e) => setNewTeam({ ...newTeam, name_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Designation (Bangla)" value={newTeam.designation_bn} onChange={(e) => setNewTeam({ ...newTeam, designation_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input type="text" required placeholder="Designation (English)" value={newTeam.designation_en} onChange={(e) => setNewTeam({ ...newTeam, designation_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <textarea rows={2} placeholder="Bio (Bangla)" value={newTeam.bio_bn} onChange={(e) => setNewTeam({ ...newTeam, bio_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = await handleUploadFile(f);
                  if (url) setNewTeam({ ...newTeam, photo_url: url });
                }
              }}
              className="text-xs"
            />
            <button type="submit" className="w-full py-2.5 bg-[#4C1D95] text-white text-xs font-semibold rounded-lg cursor-pointer">
              Add Member
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#4C1D95]">Contact Inbox ({messages.length})</h2>
            <div className="divide-y divide-[#4C1D95]/10">
              {messages.map((m) => (
                <div key={String(m.id)} className="py-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#4C1D95]">{String(m.name)} ({String(m.mobile)})</span>
                    <span className="uppercase font-semibold text-[#7C3AED]">{String(m.status)}</span>
                  </div>
                  <p className="text-xs font-semibold">{String(m.subject)}</p>
                  <p className="text-xs text-[#4C1D95]/75">{String(m.message)}</p>
                  {m.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/messages/${m.id}`, {
                          method: 'PATCH',
                          headers: authHeaders({ 'Content-Type': 'application/json' }),
                          body: JSON.stringify({ status: 'resolved' }),
                        });
                        loadMessages();
                      }}
                      className="text-[11px] font-semibold text-[#7C3AED] hover:underline cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team List with Delete */}
          <div className="lg:col-span-5 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-[#4C1D95]">Team Profiles ({bootstrap?.team?.length || 0})</h2>
            <div className="divide-y divide-[#4C1D95]/10 text-xs">
              {(bootstrap?.team || []).map((tm) => (
                <div key={tm.id} className="py-2 flex items-center justify-between gap-2">
                  <span>{tm.name_bn} — {tm.designation_bn}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/team/${tm.id}`, { method: 'DELETE', headers: authHeaders() });
                      showToast('Team profile deleted');
                      refreshBootstrap();
                    }}
                    className="text-red-700 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Testimonials Manager */}
          <div className="lg:col-span-7 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#4C1D95]">Testimonials Management</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/testimonials', {
                  method: 'POST',
                  headers: authHeaders({ 'Content-Type': 'application/json' }),
                  body: JSON.stringify(newTestimonial),
                });
                if (res.ok) {
                  showToast('Testimonial added');
                  setNewTestimonial({ author_name_bn: '', author_name_en: '', role_bn: '', role_en: '', organization: '', quote_bn: '', quote_en: '', is_verified: true });
                  loadMessages();
                  refreshBootstrap();
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-4 border-b border-[#4C1D95]/10"
            >
              <input type="text" required placeholder="Author Name (BN)" value={newTestimonial.author_name_bn} onChange={(e) => setNewTestimonial({ ...newTestimonial, author_name_bn: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
              <input type="text" required placeholder="Author Name (EN)" value={newTestimonial.author_name_en} onChange={(e) => setNewTestimonial({ ...newTestimonial, author_name_en: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
              <input type="text" required placeholder="Role / Organization (BN)" value={newTestimonial.role_bn} onChange={(e) => setNewTestimonial({ ...newTestimonial, role_bn: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
              <input type="text" required placeholder="Role / Organization (EN)" value={newTestimonial.role_en} onChange={(e) => setNewTestimonial({ ...newTestimonial, role_en: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
              <textarea rows={2} required placeholder="Quote (BN)" value={newTestimonial.quote_bn} onChange={(e) => setNewTestimonial({ ...newTestimonial, quote_bn: e.target.value })} className="sm:col-span-2 px-3 py-2 border rounded-lg text-xs" />
              <textarea rows={2} required placeholder="Quote (EN)" value={newTestimonial.quote_en} onChange={(e) => setNewTestimonial({ ...newTestimonial, quote_en: e.target.value })} className="sm:col-span-2 px-3 py-2 border rounded-lg text-xs" />
              <button type="submit" className="sm:col-span-2 py-2 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer">
                Add Verified Testimonial
              </button>
            </form>
            <div className="divide-y divide-[#4C1D95]/10 text-xs">
              {adminTestimonials.map((ts) => (
                <div key={String(ts.id)} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{String(ts.author_name_en)} — {ts.is_verified === 1 ? 'Verified' : 'Hidden'}</p>
                    <p className="text-[#4C1D95]/75">{String(ts.quote_en)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/testimonials/${ts.id}`, {
                          method: 'PATCH',
                          headers: authHeaders({ 'Content-Type': 'application/json' }),
                          body: JSON.stringify({ is_verified: ts.is_verified !== 1 }),
                        });
                        loadMessages();
                        refreshBootstrap();
                      }}
                      className="text-[#7C3AED] font-semibold hover:underline cursor-pointer"
                    >
                      {ts.is_verified === 1 ? 'Hide' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/testimonials/${ts.id}`, { method: 'DELETE', headers: authHeaders() });
                        loadMessages();
                        refreshBootstrap();
                      }}
                      className="text-red-700 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: WEBSITE CONTENT, HERO, FOOTER & SETTINGS */}
      {tab === 'settings' && (
        <div className="space-y-8">
          {/* 8A. HOMEPAGE HERO SETTINGS */}
          <div className="bg-white border border-[#4C1D95]/15 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#4C1D95]/10">
              <div>
                <h2 className="text-lg font-bold text-[#064E3B]">Homepage Hero Settings</h2>
                <p className="text-xs text-[#1E1B4B]/70">
                  Manage the dark emerald Hero headline, bilingual copy, CTAs, background, and dynamic smartphone promo card.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode('hero')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#064E3B]/30 text-[#064E3B] text-xs font-bold rounded-lg hover:bg-[#ECFDF5] cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Hero</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeroForm(DEFAULT_HERO_SETTINGS);
                    showToast('Hero settings reset to defaults (click Save to apply)');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch('/api/admin/settings/hero_settings', {
                      method: 'PUT',
                      headers: authHeaders({ 'Content-Type': 'application/json' }),
                      body: JSON.stringify(heroForm),
                    });
                    if (res.ok) {
                      showToast('Homepage Hero settings saved');
                      refreshBootstrap();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] text-white text-xs font-bold rounded-lg hover:bg-[#047857] cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Hero Settings</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Intro Badge (Bangla)</label>
                <input
                  type="text"
                  value={heroForm.badge_bn}
                  onChange={(e) => setHeroForm({ ...heroForm, badge_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Intro Badge (English)</label>
                <input
                  type="text"
                  value={heroForm.badge_en}
                  onChange={(e) => setHeroForm({ ...heroForm, badge_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Featured Competition for Phone Card</label>
                <select
                  value={heroForm.featured_competition_id}
                  onChange={(e) => setHeroForm({ ...heroForm, featured_competition_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value={0}>Auto-pick Featured Competition</option>
                  {(bootstrap?.competitions || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                <label className="block font-semibold mb-1">Main Golden Headline (English)</label>
                <input
                  type="text"
                  value={heroForm.headline_en}
                  onChange={(e) => setHeroForm({ ...heroForm, headline_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block font-semibold mb-1">Main Golden Headline (Bangla)</label>
                <input
                  type="text"
                  value={heroForm.headline_bn}
                  onChange={(e) => setHeroForm({ ...heroForm, headline_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Supporting Subheadline (Bangla)</label>
                <input
                  type="text"
                  value={heroForm.subheadline_bn}
                  onChange={(e) => setHeroForm({ ...heroForm, subheadline_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Supporting Subheadline (English)</label>
                <input
                  type="text"
                  value={heroForm.subheadline_en}
                  onChange={(e) => setHeroForm({ ...heroForm, subheadline_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hero Background Image URL / Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={heroForm.hero_bg_image_url}
                    onChange={(e) => setHeroForm({ ...heroForm, hero_bg_image_url: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <label className="px-3 py-2 bg-[#ECFDF5] text-[#064E3B] font-semibold rounded-lg border border-[#A7F3D0] cursor-pointer shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await handleUploadFile(f);
                          if (url) setHeroForm({ ...heroForm, hero_bg_image_url: url });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Hero Description (Bangla)</label>
                  <textarea
                    rows={2}
                    value={heroForm.description_bn}
                    onChange={(e) => setHeroForm({ ...heroForm, description_bn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hero Description (English)</label>
                  <textarea
                    rows={2}
                    value={heroForm.description_en}
                    onChange={(e) => setHeroForm({ ...heroForm, description_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Primary CTA Text (BN)</label>
                <input
                  type="text"
                  value={heroForm.cta1_text_bn}
                  onChange={(e) => setHeroForm({ ...heroForm, cta1_text_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary CTA Text (EN)</label>
                <input
                  type="text"
                  value={heroForm.cta1_text_en}
                  onChange={(e) => setHeroForm({ ...heroForm, cta1_text_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary CTA Link</label>
                <input
                  type="text"
                  value={heroForm.cta1_url}
                  onChange={(e) => setHeroForm({ ...heroForm, cta1_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Secondary CTA Text (BN)</label>
                <input
                  type="text"
                  value={heroForm.cta2_text_bn}
                  onChange={(e) => setHeroForm({ ...heroForm, cta2_text_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Secondary CTA Text (EN)</label>
                <input
                  type="text"
                  value={heroForm.cta2_text_en}
                  onChange={(e) => setHeroForm({ ...heroForm, cta2_text_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Secondary CTA Link</label>
                <input
                  type="text"
                  value={heroForm.cta2_url}
                  onChange={(e) => setHeroForm({ ...heroForm, cta2_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Smartphone Promo Card Sub-Settings */}
            <div className="pt-4 border-t border-[#4C1D95]/10 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
                Smartphone Mockup Promo Card Settings (Leave optional fields blank to hide)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Custom Card Title (BN, optional)</label>
                  <input
                    type="text"
                    placeholder="Blank = auto competition title"
                    value={heroForm.phone_title_bn}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_title_bn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Custom Card Title (EN, optional)</label>
                  <input
                    type="text"
                    placeholder="Blank = auto competition title"
                    value={heroForm.phone_title_en}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_title_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Offer Badge (BN)</label>
                  <input
                    type="text"
                    value={heroForm.phone_offer_bn}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_offer_bn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Offer Badge (EN)</label>
                  <input
                    type="text"
                    value={heroForm.phone_offer_en}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_offer_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Fee (optional, e.g. ৳500 or Free)</label>
                  <input
                    type="text"
                    placeholder="Blank = hidden"
                    value={heroForm.phone_fee}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_fee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Previous Fee (optional)</label>
                  <input
                    type="text"
                    placeholder="Blank = hidden"
                    value={heroForm.phone_previous_fee}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_previous_fee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Discount Text (optional)</label>
                  <input
                    type="text"
                    placeholder="Blank = hidden"
                    value={heroForm.phone_discount}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_discount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Video Preview URL (YouTube/MP4)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={heroForm.phone_video_url}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_video_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Verified Rating (optional)</label>
                  <input
                    type="text"
                    placeholder="Blank = hidden"
                    value={heroForm.phone_rating}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_rating: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Review Count (optional)</label>
                  <input
                    type="text"
                    placeholder="Blank = hidden"
                    value={heroForm.phone_review_count}
                    onChange={(e) => setHeroForm({ ...heroForm, phone_review_count: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Phone Thumbnail URL / Upload (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Blank = uses competition banner"
                      value={heroForm.phone_thumbnail_url}
                      onChange={(e) => setHeroForm({ ...heroForm, phone_thumbnail_url: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <label className="px-3 py-2 bg-[#ECFDF5] text-[#064E3B] font-semibold rounded-lg border border-[#A7F3D0] cursor-pointer shrink-0">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const url = await handleUploadFile(f);
                            if (url) setHeroForm({ ...heroForm, phone_thumbnail_url: url });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 pt-2 text-xs">
                {[
                  { key: 'show_badge', label: 'Show Intro Badge' },
                  { key: 'show_cta2', label: 'Show Secondary CTA' },
                  { key: 'show_phone_mockup', label: 'Show Smartphone Promo Card' },
                  { key: 'show_video_preview', label: 'Show Play Button Overlay' },
                  { key: 'show_enrollments', label: 'Show Live Participant Count' },
                ].map((tog) => (
                  <label key={tog.key} className="flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(heroForm[tog.key as keyof HeroSettings])}
                      onChange={(e) => setHeroForm({ ...heroForm, [tog.key]: e.target.checked })}
                    />
                    <span>{tog.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 8B. FOOTER SETTINGS & PAYMENT METHODS */}
          <div className="bg-white border border-[#4C1D95]/15 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#4C1D95]/10">
              <div>
                <h2 className="text-lg font-bold text-[#064E3B]">Footer Settings &amp; Payment Channels</h2>
                <p className="text-xs text-[#1E1B4B]/70">
                  Manage the 4-column dark footer, tagline, registration number, important links, payment gateways, and contact channels.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode('footer')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#064E3B]/30 text-[#064E3B] text-xs font-bold rounded-lg hover:bg-[#ECFDF5] cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Footer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFooterForm(DEFAULT_FOOTER_SETTINGS);
                    showToast('Footer settings reset to defaults (click Save to apply)');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await Promise.all([
                      fetch('/api/admin/settings/footer_settings', {
                        method: 'PUT',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(footerForm),
                      }),
                      fetch('/api/admin/settings/site_identity', {
                        method: 'PUT',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(siteIdentity),
                      }),
                    ]);
                    showToast('Footer & contact settings saved');
                    refreshBootstrap();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064E3B] text-white text-xs font-bold rounded-lg hover:bg-[#047857] cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Footer Settings</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Bengali Tagline</label>
                <input
                  type="text"
                  value={footerForm.tagline_bn}
                  onChange={(e) => setFooterForm({ ...footerForm, tagline_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">English Tagline</label>
                <input
                  type="text"
                  value={footerForm.tagline_en}
                  onChange={(e) => setFooterForm({ ...footerForm, tagline_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Official Registration Number (optional)</label>
                <input
                  type="text"
                  placeholder="Blank = hidden"
                  value={footerForm.registration_number}
                  onChange={(e) => setFooterForm({ ...footerForm, registration_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Footer Intro (Bangla)</label>
                  <textarea
                    rows={2}
                    value={footerForm.intro_bn}
                    onChange={(e) => setFooterForm({ ...footerForm, intro_bn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Footer Intro (English)</label>
                  <textarea
                    rows={2}
                    value={footerForm.intro_en}
                    onChange={(e) => setFooterForm({ ...footerForm, intro_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Verified Bottom Bar Credentials (BN, optional)</label>
                <input
                  type="text"
                  placeholder="Blank = hidden"
                  value={footerForm.verified_credentials_bn}
                  onChange={(e) => setFooterForm({ ...footerForm, verified_credentials_bn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Verified Bottom Bar Credentials (EN, optional)</label>
                <input
                  type="text"
                  placeholder="Blank = hidden"
                  value={footerForm.verified_credentials_en}
                  onChange={(e) => setFooterForm({ ...footerForm, verified_credentials_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Google Maps URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={footerForm.google_maps_url}
                  onChange={(e) => setFooterForm({ ...footerForm, google_maps_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">YouTube Channel URL (optional)</label>
                <input
                  type="url"
                  value={footerForm.youtube_url}
                  onChange={(e) => setFooterForm({ ...footerForm, youtube_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Instagram URL (optional)</label>
                <input
                  type="url"
                  value={footerForm.instagram_url}
                  onChange={(e) => setFooterForm({ ...footerForm, instagram_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Secondary Helpline Mobile</label>
                <input
                  type="text"
                  value={String(siteIdentity.secondary_mobile || '')}
                  onChange={(e) => setSiteIdentity({ ...siteIdentity, secondary_mobile: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Payment Methods Config */}
            <div className="pt-4 border-t border-[#4C1D95]/10 space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[#0D9488]">
                Supported Payment Methods &amp; Official Number
              </h3>
              <div className="flex flex-wrap gap-4">
                {(footerForm.payment_methods || []).map((pm, idx) => (
                  <label key={pm.id} className="flex items-center gap-2 font-semibold cursor-pointer px-3 py-1.5 rounded-lg border bg-[#FFFBF5]">
                    <input
                      type="checkbox"
                      checked={pm.enabled}
                      onChange={(e) => {
                        const next = [...footerForm.payment_methods];
                        next[idx] = { ...pm, enabled: e.target.checked };
                        setFooterForm({ ...footerForm, payment_methods: next });
                      }}
                    />
                    <span>{pm.name}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Official Payment Account Number</label>
                  <input
                    type="text"
                    placeholder="Blank = free notice shown"
                    value={footerForm.payment_number}
                    onChange={(e) => setFooterForm({ ...footerForm, payment_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Account Type (e.g. Merchant / Personal)</label>
                  <input
                    type="text"
                    value={footerForm.payment_account_type}
                    onChange={(e) => setFooterForm({ ...footerForm, payment_account_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Instructions (BN)</label>
                  <input
                    type="text"
                    value={footerForm.payment_instructions_bn}
                    onChange={(e) => setFooterForm({ ...footerForm, payment_instructions_bn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Instructions (EN)</label>
                  <input
                    type="text"
                    value={footerForm.payment_instructions_en}
                    onChange={(e) => setFooterForm({ ...footerForm, payment_instructions_en: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Footer Important Links Manager */}
            <div className="pt-4 border-t border-[#4C1D95]/10 space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-[#0D9488]">
                Footer Important Links ({(footerForm.important_links || []).filter((l) => l.enabled).length} enabled)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(footerForm.important_links || []).map((lnk, idx) => (
                  <div key={lnk.url + idx} className="flex items-center gap-2 p-2 rounded-lg border bg-[#FFFBF5]">
                    <input
                      type="checkbox"
                      checked={lnk.enabled}
                      onChange={(e) => {
                        const next = [...footerForm.important_links];
                        next[idx] = { ...lnk, enabled: e.target.checked };
                        setFooterForm({ ...footerForm, important_links: next });
                      }}
                    />
                    <input
                      type="text"
                      value={lnk.label_bn}
                      onChange={(e) => {
                        const next = [...footerForm.important_links];
                        next[idx] = { ...lnk, label_bn: e.target.value };
                        setFooterForm({ ...footerForm, important_links: next });
                      }}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                    />
                    <input
                      type="text"
                      value={lnk.label_en}
                      onChange={(e) => {
                        const next = [...footerForm.important_links];
                        next[idx] = { ...lnk, label_en: e.target.value };
                        setFooterForm({ ...footerForm, important_links: next });
                      }}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                    />
                    <span className="font-mono text-[10px] text-[#4C1D95]/70 shrink-0">{lnk.url}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3">
              <h2 className="text-base font-bold text-[#4C1D95]">Organization Identity &amp; Social Links</h2>
              <label className="block text-xs font-semibold">Primary Mobile</label>
              <input type="text" value={String(siteIdentity.primary_mobile || '')} onChange={(e) => setSiteIdentity({ ...siteIdentity, primary_mobile: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">WhatsApp Number (digits only, e.g. 8801869970401)</label>
              <input type="text" value={String(siteIdentity.whatsapp_number || '')} onChange={(e) => setSiteIdentity({ ...siteIdentity, whatsapp_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">Official Email</label>
              <input type="email" value={String(siteIdentity.email || '')} onChange={(e) => setSiteIdentity({ ...siteIdentity, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">Official Address (Bangla)</label>
              <input type="text" value={String(siteIdentity.address_bn || '')} onChange={(e) => setSiteIdentity({ ...siteIdentity, address_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">Official Address (English)</label>
              <input type="text" value={String(siteIdentity.address_en || '')} onChange={(e) => setSiteIdentity({ ...siteIdentity, address_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">Facebook Page URL</label>
              <input type="url" value={String(siteIdentity.facebook_url || '')} onChange={(e) => setSiteIdentity({ ...siteIdentity, facebook_url: e.target.value, facebook_page_configured: true })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">Upload Official Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await handleUploadFile(f);
                    if (url) setSiteIdentity({ ...siteIdentity, logo_url: url });
                  }
                }}
                className="text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/admin/settings/site_identity', {
                    method: 'PUT',
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(siteIdentity),
                  });
                  showToast('Site Identity saved');
                  refreshBootstrap();
                }}
                className="px-4 py-2 bg-[#4C1D95] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Identity Settings
              </button>
            </div>

            <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3">
              <h2 className="text-base font-bold text-[#4C1D95]">About Foundation &amp; CTA Content</h2>
              <label className="block text-xs font-semibold">Hero Fallback Headline (Bangla)</label>
              <input type="text" value={String(homeContent.hero_headline_bn || '')} onChange={(e) => setHomeContent({ ...homeContent, hero_headline_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">About Foundation Summary (Bangla)</label>
              <textarea rows={3} value={String(homeContent.about_summary_bn || '')} onChange={(e) => setHomeContent({ ...homeContent, about_summary_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <label className="block text-xs font-semibold">About Foundation Full Text (Bangla)</label>
              <textarea rows={3} value={String(homeContent.about_full_bn || '')} onChange={(e) => setHomeContent({ ...homeContent, about_full_bn: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-xs" />
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/admin/settings/homepage_content', {
                    method: 'PUT',
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(homeContent),
                  });
                  showToast('Homepage & About content updated');
                  refreshBootstrap();
                }}
                className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Content
              </button>
            </div>
          </div>

          {/* Required Fields Configuration */}
          <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#4C1D95]">Registration Form Required Fields Config</h2>
            <div className="flex flex-wrap gap-5 text-xs">
              {Object.entries(regFieldCfg).map(([k, val]) => (
                <label key={k} className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => setRegFieldCfg({ ...regFieldCfg, [k]: e.target.checked })}
                  />
                  <span>Require {k.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/admin/settings/registration_field_config', {
                  method: 'PUT',
                  headers: authHeaders({ 'Content-Type': 'application/json' }),
                  body: JSON.stringify(regFieldCfg),
                });
                showToast('Registration field rules updated');
                refreshBootstrap();
              }}
              className="px-4 py-2 bg-[#4C1D95] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Save Field Rules
            </button>
          </div>

          {/* Live Preview Modal for Hero or Footer */}
          {previewMode && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setPreviewMode(null)}
            >
              <div
                className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-20 bg-[#051E18] text-white px-5 py-3 flex items-center justify-between border-b border-[#2DD4BF]/25">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F3D98B]">
                    Live {previewMode === 'hero' ? 'Hero Section' : 'Footer Section'} Preview (Unsaved Draft)
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                    aria-label="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {previewMode === 'hero' ? (
                  <HeroSection overrideHero={heroForm} isPreview />
                ) : (
                  <SiteFooter
                    overrideFooter={footerForm}
                    overrideIdentity={siteIdentity as Partial<import('../types/hcfb').SiteSettings['site_identity']>}
                    isPreview
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: ROLES, LOGS & BACKUP */}
      {tab === 'security' && user.role === 'super_admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#4C1D95]">Database Backup &amp; Sample Reset</h2>
              <p className="text-xs text-[#4C1D95]/75">
                Download a complete JSON snapshot of all competitions, registrations, certificates, notices, and settings.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => downloadAuthenticatedFile('/api/admin/backup', `hcfb-backup-${new Date().toISOString().slice(0, 10)}.json`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>Download Full Backup (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearSamples(true)}
                  className="px-4 py-2.5 border border-red-300 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-50 cursor-pointer"
                >
                  Clear All Sample Records
                </button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/users', {
                  method: 'POST',
                  headers: authHeaders({ 'Content-Type': 'application/json' }),
                  body: JSON.stringify(newStaff),
                });
                const json = await res.json();
                if (res.ok) {
                  showToast('Staff account created');
                  setNewStaff({ name: '', email: '', password: '', role: 'content_editor' });
                  loadSecurity();
                } else {
                  showToast(json.error || 'Failed');
                }
              }}
              className="lg:col-span-7 bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3"
            >
              <h2 className="text-base font-bold text-[#4C1D95]">Create Staff / Judge Role</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" required placeholder="Full Name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
                <input type="email" required placeholder="Email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
                <input type="password" required minLength={8} placeholder="Password (min 8 chars)" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} className="px-3 py-2 border rounded-lg text-xs" />
                <select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} className="px-3 py-2 border rounded-lg text-xs">
                  <option value="content_editor">Content Editor</option>
                  <option value="registration_manager">Registration Manager</option>
                  <option value="judge">Jury / Judge</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-[#4C1D95] text-white text-xs font-semibold rounded-lg cursor-pointer">
                Add Staff Account
              </button>
              <div className="pt-2 border-t text-xs text-[#4C1D95]/75">
                Active Accounts: {staffUsers.map((u) => `${u.email} (${u.role})`).join(' · ')}
              </div>
            </form>
          </div>

          <div className="bg-white border border-[#4C1D95]/12 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-[#4C1D95]">Recent Activity Audit Logs</h2>
            <div className="max-h-72 overflow-y-auto divide-y divide-[#4C1D95]/10 text-xs">
              {auditLogs.map((log) => (
                <div key={String(log.id)} className="py-2 flex flex-wrap justify-between gap-2">
                  <span>
                    <strong className="text-[#4C1D95]">{String(log.action)}</strong> by {String(log.actor_email || 'system')} ({String(log.actor_role || '')}) — {String(log.details || log.target_id || '')}
                  </span>
                  <span className="font-mono text-[#4C1D95]/60">{String(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Modal */}
      {editingReg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch(`/api/admin/registrations/${editingReg.id}`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(editingReg),
              });
              setEditingReg(null);
              showToast('Registration updated');
              loadRegistrations();
            }}
            className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-[#4C1D95]">Edit {editingReg.registration_id}</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select value={editingReg.status} onChange={(e) => setEditingReg({ ...editingReg, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                  <option value="evaluated">evaluated</option>
                  <option value="winner">winner</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Award Tier</label>
                <select value={editingReg.award_tier} onChange={(e) => setEditingReg({ ...editingReg, award_tier: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="none">none</option>
                  <option value="1st_place">1st_place</option>
                  <option value="2nd_place">2nd_place</option>
                  <option value="3rd_place">3rd_place</option>
                  <option value="honorable_mention">honorable_mention</option>
                  <option value="merit">merit</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Rank Position</label>
                <input type="number" value={editingReg.rank_position ?? ''} onChange={(e) => setEditingReg({ ...editingReg, rank_position: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold mb-1">School</label>
                <input type="text" value={editingReg.school_name} onChange={(e) => setEditingReg({ ...editingReg, school_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingReg(null)} className="px-4 py-2 border rounded-lg text-xs font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-xs font-semibold cursor-pointer">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteReg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#4C1D95]">Confirm Deletion</h3>
            <p className="text-xs text-[#4C1D95]/75">
              Permanently delete registration <strong>{confirmDeleteReg.registration_id}</strong> ({confirmDeleteReg.name_en})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteReg(null)} className="px-4 py-2 border rounded-lg text-xs cursor-pointer">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/admin/registrations/${confirmDeleteReg.id}`, {
                    method: 'DELETE',
                    headers: authHeaders(),
                  });
                  setConfirmDeleteReg(null);
                  showToast('Record deleted');
                  loadRegistrations();
                }}
                className="px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Sample Confirmation Modal */}
      {confirmClearSamples && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#4C1D95]">Remove All Sample Data?</h3>
            <p className="text-xs text-[#4C1D95]/75">
              This removes all clearly marked sample competitions, notices, gallery items, placeholder team members, and demo registrations so you can launch with official records.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClearSamples(false)} className="px-4 py-2 border rounded-lg text-xs cursor-pointer">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/admin/clear-samples', { method: 'POST', headers: authHeaders() });
                  setConfirmClearSamples(false);
                  showToast('Sample records cleared');
                  refreshBootstrap();
                  loadOverview();
                }}
                className="px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirm Clear Samples
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Scoring Criteria Editor Modal */}
      {editingCriteriaComp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch(`/api/admin/competitions/${editingCriteriaComp.id}/criteria`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ criteria: editingCriteriaComp.criteria }),
              });
              if (res.ok) {
                setEditingCriteriaComp(null);
                showToast('Scoring criteria updated');
                loadCompetitions();
              }
            }}
            className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-[#4C1D95]">Scoring Criteria — {editingCriteriaComp.title}</h3>
            <div className="space-y-3">
              {editingCriteriaComp.criteria.map((cr, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center border-b pb-2 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Name (BN)"
                    value={cr.name_bn}
                    onChange={(e) => {
                      const next = [...editingCriteriaComp.criteria];
                      next[idx] = { ...cr, name_bn: e.target.value };
                      setEditingCriteriaComp({ ...editingCriteriaComp, criteria: next });
                    }}
                    className="px-2.5 py-1.5 border rounded"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Name (EN)"
                    value={cr.name_en}
                    onChange={(e) => {
                      const next = [...editingCriteriaComp.criteria];
                      next[idx] = { ...cr, name_en: e.target.value };
                      setEditingCriteriaComp({ ...editingCriteriaComp, criteria: next });
                    }}
                    className="px-2.5 py-1.5 border rounded"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Max Points"
                    value={cr.max_points}
                    onChange={(e) => {
                      const next = [...editingCriteriaComp.criteria];
                      next[idx] = { ...cr, max_points: Number(e.target.value), weight_percent: Number(e.target.value) };
                      setEditingCriteriaComp({ ...editingCriteriaComp, criteria: next });
                    }}
                    className="px-2.5 py-1.5 border rounded font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingCriteriaComp.criteria.length <= 1) return;
                      const next = editingCriteriaComp.criteria.filter((_, i) => i !== idx);
                      setEditingCriteriaComp({ ...editingCriteriaComp, criteria: next });
                    }}
                    className="text-red-700 font-semibold text-left sm:text-right cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingCriteriaComp({
                  ...editingCriteriaComp,
                  criteria: [...editingCriteriaComp.criteria, { name_bn: '', name_en: '', weight_percent: 20, max_points: 20 }],
                })
              }
              className="text-xs font-semibold text-[#7C3AED] hover:underline cursor-pointer"
            >
              + Add Criterion
            </button>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setEditingCriteriaComp(null)} className="px-4 py-2 border rounded-lg text-xs cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-xs font-semibold cursor-pointer">
                Save Scoring Criteria
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
