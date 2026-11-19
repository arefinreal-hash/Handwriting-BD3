import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Search,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ScannedPass {
  id: number;
  registration_id: string;
  competition_id: number;
  name_en: string;
  name_bn: string;
  school_name: string;
  class_level: string;
  district: string;
  competition_title_en: string;
  competition_title_bn: string;
  competition_year: string;
  category_name_en: string;
  category_name_bn: string;
  status: string;
  payment_status: string;
  payment_method: string;
  transaction_id: string;
  is_test_payment: boolean;
  qr_revoked: boolean;
  qr_revoked_reason?: string;
  attendance_marked: boolean;
  attendance_marked_at: string | null;
  attendance_marked_by: string | null;
}

interface ScanResponse {
  result_status: 'AUTHENTIC' | 'INVALID' | 'REVOKED' | 'PENDING';
  headline: string;
  headline_bn: string;
  pass: ScannedPass | null;
}

interface AttendanceRecord {
  id: number;
  registration_id: string;
  name_en: string;
  name_bn: string;
  school_name: string;
  category_name_en: string;
  marked_by_name: string;
  marked_at: string;
}

export function OrganizerScannerPage() {
  const { t } = useApp();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('hcfb_staff_token'));
  const [staffUser, setStaffUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [manualInput, setManualInput] = useState('');
  const [scanningCamera, setScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDecodedRef = useRef<{ val: string; ts: number }>({ val: '', ts: 0 });

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setScanningCamera(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const loadAttendance = useCallback(async (tok: string) => {
    const res = await fetch('/api/organizer/attendance', {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.ok) {
      const json = await res.json();
      setAttendanceList(json.attendance || []);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          sessionStorage.removeItem('hcfb_staff_token');
          setToken(null);
          return;
        }
        const json = await res.json();
        setStaffUser(json.user);
        loadAttendance(token);
      })
      .catch(() => setToken(null));
  }, [token, loadAttendance]);

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
      setAuthError(json.error || 'Invalid credentials');
      return;
    }
    sessionStorage.setItem('hcfb_staff_token', json.token);
    setToken(json.token);
    setStaffUser(json.user);
  };

  const verifyQrValue = useCallback(
    async (raw: string) => {
      if (!token || !raw.trim()) return;
      setBusy(true);
      setStatusMsg(null);
      try {
        const res = await fetch('/api/organizer/scan-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qr_input: raw.trim() }),
        });
        const json = (await res.json()) as ScanResponse & { error?: string };
        if (json.result_status) {
          setScanResult(json);
        } else if (json.error) {
          setStatusMsg(json.error);
        }
      } catch {
        setStatusMsg('Network error verifying entry pass.');
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Use manual / handheld QR input below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setScanningCamera(true);

      setTimeout(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
          detect: (img: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
        };
        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

        let lastTick = 0;
        const tick = async (ts: number) => {
          if (!streamRef.current) return;
          if (ts - lastTick >= 220 && video.readyState >= 2) {
            lastTick = ts;
            let decoded: string | null = null;
            if (detector) {
              try {
                const found = await detector.detect(video);
                if (found.length > 0 && found[0].rawValue) decoded = found[0].rawValue;
              } catch {
                // fallback below
              }
            }
            if (!decoded && ctx && video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imgData.data, imgData.width, imgData.height);
              if (qr?.data) decoded = qr.data;
            }
            if (decoded) {
              const now = Date.now();
              if (decoded !== lastDecodedRef.current.val || now - lastDecodedRef.current.ts > 3000) {
                lastDecodedRef.current = { val: decoded, ts: now };
                setManualInput(decoded);
                verifyQrValue(decoded);
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }, 80);
    } catch {
      setCameraError('Camera permission denied or unavailable. Please allow camera access or enter token/Reg ID manually.');
      stopCamera();
    }
  };

  const handleMarkAttendance = async () => {
    if (!token || !scanResult?.pass) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/organizer/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ registration_pk: scanResult.pass.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMsg(json.error || 'Could not mark attendance.');
        return;
      }
      setStatusMsg(`Attendance recorded for ${scanResult.pass.registration_id}.`);
      setScanResult((prev) =>
        prev && prev.pass
          ? {
              ...prev,
              pass: {
                ...prev.pass,
                attendance_marked: true,
                attendance_marked_at: json.attendance?.marked_at || new Date().toISOString(),
                attendance_marked_by: staffUser?.name || 'Organizer',
              },
            }
          : prev
      );
      loadAttendance(token);
    } finally {
      setBusy(false);
    }
  };

  if (!token || !staffUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#05241D] text-[#F3D98B] mx-auto flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
            {t('আয়োজক QR স্ক্যানার লগইন', 'Organizer QR Scanner Sign In')}
          </h1>
          <p className="text-xs text-slate-600 dark:text-white/70">
            Authorized HCFB staff / organizer credentials required for competition-day check-in.
          </p>
        </div>
        <form onSubmit={handleLogin} className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-white/15 rounded-3xl p-6 space-y-4 shadow-sm">
          {authError && <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl">{authError}</p>}
          <input
            type="email"
            required
            placeholder="Staff Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white text-sm"
          />
          <button
            type="submit"
            className="w-full py-3 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] font-bold text-sm rounded-xl cursor-pointer"
          >
            Sign In to Venue Scanner
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/15 pb-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0D9488] dark:text-[#5EEAD4]">
            Competition-Day Gate Control · {staffUser.name}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#04241D] dark:text-[#F3D98B] font-display">
            {t('অফিসিয়াল QR এন্ট্রি পাস স্ক্যানার ও উপস্থিতি', 'Organizer QR Scanner & Check-In Attendance')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!scanningCamera ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold rounded-xl shadow cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera Scanner</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow cursor-pointer"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scanner & Manual Input Column */}
        <div className="lg:col-span-6 space-y-4">
          {scanningCamera && (
            <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-[#0D9488] aspect-[4/3]">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-[#5EEAD4] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/75 text-[#5EEAD4] text-[11px] font-bold">
                Scanning for HCFB Entry Pass QR...
              </span>
            </div>
          )}

          {cameraError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
              {cameraError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyQrValue(manualInput);
            }}
            className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-white/15 rounded-3xl p-5 space-y-3 shadow-sm"
          >
            <label className="block text-xs font-bold text-[#04241D] dark:text-[#F3D98B]">
              {t(
                'হ্যান্ডহেল্ড স্ক্যানার / ম্যানুয়াল QR টোকেন বা রেজিস্ট্রেশন আইডি',
                'Manual / Hardware QR Token, Verification URL, or Registration ID'
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste verify URL, token, or HCFB-2026-00001"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/20 dark:bg-[#071915] dark:text-white font-mono text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#05241D] dark:bg-[#E5C158] text-white dark:text-[#04241D] text-xs font-bold rounded-xl cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify</span>
              </button>
            </div>
          </form>

          {statusMsg && (
            <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-bold">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Live Scan Verification Panel */}
        <div className="lg:col-span-6">
          {scanResult ? (
            <div
              className={`bg-white dark:bg-[#0B221D] border-2 rounded-3xl overflow-hidden shadow-lg ${
                scanResult.result_status === 'AUTHENTIC'
                  ? 'border-emerald-500'
                  : scanResult.result_status === 'PENDING'
                    ? 'border-amber-500'
                    : 'border-rose-500'
              }`}
            >
              <div
                className={`px-6 py-4 text-white flex items-center gap-3 ${
                  scanResult.result_status === 'AUTHENTIC'
                    ? 'bg-emerald-600'
                    : scanResult.result_status === 'PENDING'
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                }`}
              >
                {scanResult.result_status === 'AUTHENTIC' ? (
                  <CheckCircle2 className="w-8 h-8 shrink-0" />
                ) : scanResult.result_status === 'PENDING' ? (
                  <Clock className="w-8 h-8 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 shrink-0" />
                )}
                <div>
                  <h2 className="text-lg font-extrabold">{scanResult.headline}</h2>
                  <p className="text-xs opacity-90">{scanResult.headline_bn}</p>
                </div>
              </div>

              {scanResult.pass ? (
                <div className="p-6 space-y-4">
                  <dl className="divide-y divide-slate-200 dark:divide-white/10 text-xs sm:text-sm">
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-white/65">Participant</dt>
                      <dd className="font-extrabold text-[#04241D] dark:text-white text-right">
                        {scanResult.pass.name_en} ({scanResult.pass.name_bn})
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-white/65">Registration ID</dt>
                      <dd className="font-mono font-bold text-[#04241D] dark:text-[#F3D98B]">
                        {scanResult.pass.registration_id}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-white/65">Category</dt>
                      <dd className="font-semibold dark:text-white">{scanResult.pass.category_name_en}</dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-white/65">Institution</dt>
                      <dd className="dark:text-white text-right">{scanResult.pass.school_name}</dd>
                    </div>
                    <div className="py-2 flex justify-between gap-3">
                      <dt className="text-slate-500 dark:text-white/65">Payment</dt>
                      <dd className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {scanResult.pass.payment_status} ({scanResult.pass.payment_method})
                      </dd>
                    </div>
                  </dl>

                  {scanResult.pass.attendance_marked ? (
                    <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 text-xs font-bold">
                      Already Checked In at {scanResult.pass.attendance_marked_at} by{' '}
                      {scanResult.pass.attendance_marked_by || 'Staff'}
                    </div>
                  ) : scanResult.result_status === 'AUTHENTIC' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleMarkAttendance}
                      className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-sm rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Confirm Check-In & Mark Attendance</span>
                    </button>
                  ) : (
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      Check-in blocked: only AUTHENTIC PAID entry passes may be admitted.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-6 text-sm font-bold text-rose-700 dark:text-rose-300">
                  No pass record matched this QR code.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0B221D] border border-dashed border-slate-300 dark:border-white/20 rounded-3xl p-10 text-center space-y-2 text-slate-500 dark:text-white/60">
              <UserCheck className="w-10 h-10 mx-auto opacity-60" />
              <p className="text-sm font-bold">Ready to verify competition entry passes</p>
              <p className="text-xs">Point the camera at a participant QR code or scan using your handheld device.</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Attendance Log */}
      <div className="bg-white dark:bg-[#0B221D] border border-slate-200 dark:border-white/15 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#04241D] dark:text-[#F3D98B]">
            Recent Venue Check-Ins ({attendanceList.length})
          </h2>
          <button
            type="button"
            onClick={() => token && loadAttendance(token)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0D9488] dark:text-[#5EEAD4] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/15 text-slate-500 dark:text-white/65">
                <th className="py-2 pr-3">Reg ID</th>
                <th className="py-2 pr-3">Participant</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Checked By</th>
                <th className="py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {attendanceList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-white/55">
                    No attendance check-ins recorded yet.
                  </td>
                </tr>
              ) : (
                attendanceList.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 pr-3 font-mono font-bold text-[#059669] dark:text-[#5EEAD4]">
                      {a.registration_id}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold dark:text-white">
                      {a.name_en} <span className="text-slate-500 dark:text-white/60">· {a.school_name}</span>
                    </td>
                    <td className="py-2.5 pr-3 dark:text-white/80">{a.category_name_en}</td>
                    <td className="py-2.5 pr-3 dark:text-white/80">{a.marked_by_name}</td>
                    <td className="py-2.5 text-right font-mono text-slate-500 dark:text-white/60">{a.marked_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
