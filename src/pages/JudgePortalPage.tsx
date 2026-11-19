import React, { useEffect, useState, useCallback } from 'react';
import { Award, CheckCircle2, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Competition, ScoringCriterion } from '../types/hcfb';

interface JudgeCompetition extends Competition {
  criteria: ScoringCriterion[];
}

interface JudgeSubmission {
  id: number;
  registration_id: string;
  name_bn: string;
  name_en: string;
  school_name: string;
  class_level: string;
  district: string;
  status: string;
  total_score: number | null;
  category_name_bn: string;
  criteria_scores_json: string | null;
  my_score: number | null;
  my_remarks: string | null;
}

export function JudgePortalPage() {
  const { t } = useApp();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('hcfb_staff_token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<JudgeCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<JudgeSubmission[]>([]);
  const [activeSub, setActiveSub] = useState<JudgeSubmission | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const loadCompetitions = useCallback(async (tok: string) => {
    const res = await fetch('/api/judge/competitions', {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) {
      sessionStorage.removeItem('hcfb_staff_token');
      setToken(null);
      return;
    }
    const json = await res.json();
    setCompetitions(json.competitions || []);
    if (json.competitions?.[0]) setSelectedCompId(json.competitions[0].id);
  }, []);

  const loadSubmissions = useCallback(async (tok: string, compId: number) => {
    const res = await fetch(`/api/judge/submissions/${compId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.ok) {
      const json = await res.json();
      setSubmissions(json.submissions || []);
    }
  }, []);

  useEffect(() => {
    if (token) loadCompetitions(token);
  }, [token, loadCompetitions]);

  useEffect(() => {
    if (token && selectedCompId) loadSubmissions(token, selectedCompId);
  }, [token, selectedCompId, loadSubmissions]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAuthError(json.error || 'Authentication failed');
      return;
    }
    if (!['judge', 'super_admin'].includes(json.user.role)) {
      setAuthError('This account does not have Judge evaluation permissions.');
      return;
    }
    sessionStorage.setItem('hcfb_staff_token', json.token);
    setToken(json.token);
  };

  const activeComp = competitions.find((c) => c.id === selectedCompId);

  const openEvaluation = (sub: JudgeSubmission) => {
    setActiveSub(sub);
    setSavedNotice(null);
    const initial: Record<string, number> = {};
    if (sub.criteria_scores_json) {
      try {
        Object.assign(initial, JSON.parse(sub.criteria_scores_json));
      } catch {
        // ignore
      }
    }
    if (activeComp) {
      for (const cr of activeComp.criteria) {
        if (initial[String(cr.id)] === undefined) initial[String(cr.id)] = 0;
      }
    }
    setScores(initial);
    setRemarks(sub.my_remarks || '');
  };

  const submitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeSub || !selectedCompId) return;
    const res = await fetch('/api/judge/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        registration_pk: activeSub.id,
        criteria_scores: scores,
        remarks,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setSavedNotice(`Score recorded: ${json.totalScore}`);
      loadSubmissions(token, selectedCompId);
    } else {
      setSavedNotice(json.error || 'Failed to save score');
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white mx-auto flex items-center justify-center shadow-md">
            <Award className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#4C1D95] font-display">
            {t('বিচারক মূল্যায়ন পোর্টাল', 'Judge Evaluation Portal')}
          </h1>
          <p className="text-xs text-[#1E1B4B]/70">
            {t('অফিসিয়াল বিচারক বা অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।', 'Sign in with your authorized Judge or Admin credentials.')}
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-[#EDE9FE] rounded-3xl p-7 space-y-4 shadow-sm">
          {authError && <div className="p-3 rounded-2xl bg-red-50 text-red-800 text-xs">{authError}</div>}
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#4C1D95] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6FE] text-sm"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-sm font-bold rounded-full hover:brightness-105 cursor-pointer shadow-sm">
            {t('প্রবেশ করুন', 'Sign In')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDE9FE] pb-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#EC4899]">Jury Rubric Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#4C1D95] font-display">
            {t('বিচারক মূল্যায়ন পোর্টাল', 'Judge Evaluation Portal')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompId ?? ''}
            onChange={(e) => setSelectedCompId(Number(e.target.value))}
            className="px-4 py-2 rounded-full border border-[#DDD6FE] bg-white text-sm font-medium"
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>{t(c.title_bn, c.title_en)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('hcfb_staff_token');
              setToken(null);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#DDD6FE] rounded-full text-xs font-bold text-[#4C1D95] hover:bg-[#F5F3FF] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-[#EDE9FE] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F3FF] text-xs text-[#4C1D95]">
                <tr>
                  <th className="py-3.5 px-4">Reg ID</th>
                  <th className="py-3.5 px-4">Participant</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">My Score</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE9FE]">
                {submissions.map((sub) => (
                  <tr key={sub.id} className={activeSub?.id === sub.id ? 'bg-[#F5F3FF]' : ''}>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#7C3AED]">{sub.registration_id}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#1E1B4B]">{t(sub.name_bn, sub.name_en)}</p>
                      <p className="text-xs text-[#1E1B4B]/60">{sub.district}</p>
                    </td>
                    <td className="py-3 px-4 text-xs">{sub.category_name_bn}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#4C1D95]">
                      {sub.my_score ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEvaluation(sub)}
                        className="px-4 py-1.5 bg-[#4C1D95] text-white text-xs font-bold rounded-full hover:bg-[#7C3AED] cursor-pointer"
                      >
                        Score
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5">
          {activeSub && activeComp ? (
            <form onSubmit={submitEvaluation} className="bg-white border border-[#EDE9FE] rounded-3xl p-7 space-y-5 shadow-sm">
              <div className="border-b border-[#EDE9FE] pb-3">
                <p className="text-xs font-mono font-bold text-[#EC4899]">{activeSub.registration_id}</p>
                <h2 className="text-lg font-extrabold text-[#4C1D95]">{t(activeSub.name_bn, activeSub.name_en)}</h2>
                <p className="text-xs text-[#1E1B4B]/70">{activeSub.school_name} · {activeSub.class_level}</p>
              </div>

              {savedNotice && (
                <div className="p-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savedNotice}</span>
                </div>
              )}

              <div className="space-y-4">
                {activeComp.criteria.map((cr) => (
                  <div key={cr.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#4C1D95]">
                      <span>{t(cr.name_bn, cr.name_en)}</span>
                      <span className="font-mono tabular-nums text-[#7C3AED]">Max {cr.max_points}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={cr.max_points}
                      step="0.5"
                      value={scores[String(cr.id)] ?? 0}
                      onChange={(e) =>
                        setScores({ ...scores, [String(cr.id)]: Math.min(cr.max_points, Math.max(0, Number(e.target.value))) })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DDD6FE] font-mono text-sm"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-bold text-[#4C1D95] mb-1">Jury Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DDD6FE] text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#EDE9FE]">
                <span className="text-sm font-extrabold text-[#4C1D95] font-mono tabular-nums">
                  Total: {Object.values(scores).reduce((a, b) => a + Number(b || 0), 0)}
                </span>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#EC4899] to-[#7C3AED] text-white text-xs font-bold rounded-full hover:brightness-105 cursor-pointer">
                  Submit Evaluation
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white border border-[#EDE9FE] rounded-3xl p-8 text-center text-sm text-[#1E1B4B]/65">
              {t('মূল্যায়নের জন্য তালিকা থেকে একজন অংশগ্রহণকারী নির্বাচন করুন।', 'Select a participant from the list to score against competition criteria.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
