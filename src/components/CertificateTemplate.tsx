import { Printer, Download } from 'lucide-react';
import { AWARD_LABELS } from '../types/hcfb';
import { useApp } from '../context/AppContext';

export interface CertificateData {
  certificate_code: string;
  registration_id: string;
  participant_name_bn: string;
  participant_name_en: string;
  competition_title_bn: string;
  competition_title_en: string;
  category_name_bn: string;
  award_tier: string;
  issued_at: string;
  issued_by: string;
  revoked?: number;
}

export function CertificateTemplate({
  cert,
  qrDataUrl,
}: {
  cert: CertificateData;
  qrDataUrl?: string;
}) {
  const { t } = useApp();
  const award = AWARD_LABELS[cert.award_tier] || AWARD_LABELS.merit;

  const handleDownloadPng = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1130;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Archival warm paper backdrop
    ctx.fillStyle = '#FBF9F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer navy frame & inner gold hairline
    ctx.strokeStyle = '#0F2342';
    ctx.lineWidth = 14;
    ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

    ctx.strokeStyle = '#B5892E';
    ctx.lineWidth = 3;
    ctx.strokeRect(66, 66, canvas.width - 132, canvas.height - 132);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(80, 80, canvas.width - 160, canvas.height - 160);

    // Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#135D43';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('HANDWRITING & CALLIGRAPHY FOUNDATION OF BANGLADESH (HCFB)', canvas.width / 2, 170);

    ctx.fillStyle = '#0F2342';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('Certificate of Merit & Recognition', canvas.width / 2, 260);

    ctx.strokeStyle = 'rgba(15, 35, 66, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(260, 300);
    ctx.lineTo(canvas.width - 260, 300);
    ctx.stroke();

    // Recipient
    ctx.fillStyle = '#475569';
    ctx.font = '24px sans-serif';
    ctx.fillText('This certificate is formally presented to', canvas.width / 2, 375);

    ctx.fillStyle = '#0F2342';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText(cert.participant_name_en || cert.participant_name_bn, canvas.width / 2, 460);

    if (cert.participant_name_bn && cert.participant_name_bn !== cert.participant_name_en) {
      ctx.font = 'bold 34px sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(cert.participant_name_bn, canvas.width / 2, 515);
    }

    ctx.fillStyle = '#334155';
    ctx.font = '25px sans-serif';
    ctx.fillText(
      `for participating in "${cert.competition_title_en || cert.competition_title_bn}"`,
      canvas.width / 2,
      595
    );
    ctx.fillText(`(${cert.category_name_bn})`, canvas.width / 2, 635);

    ctx.fillStyle = '#135D43';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(`Distinction: ${award.en}`, canvas.width / 2, 715);

    // Footer metadata
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F2342';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Cert Code: ${cert.certificate_code}`, 140, 915);
    ctx.font = '18px monospace';
    ctx.fillText(`Reg ID: ${cert.registration_id}`, 140, 950);
    ctx.fillText(`Issued: ${cert.issued_at.slice(0, 10)}`, 140, 985);

    ctx.textAlign = 'center';
    ctx.beginPath();
    ctx.moveTo(640, 935);
    ctx.lineTo(960, 935);
    ctx.strokeStyle = '#0F2342';
    ctx.stroke();
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(cert.issued_by, 800, 965);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('HCFB Examination & Jury Board', 800, 992);

    if (qrDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, canvas.width - 310, 845, 165, 165);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = qrDataUrl;
      });
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${cert.certificate_code}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2.5 no-print">
        <button
          type="button"
          onClick={handleDownloadPng}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#135D43] text-white text-sm font-medium rounded-lg hover:bg-[#0E4A35] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{t('সনদ ডাউনলোড (PNG)', 'Download Certificate (PNG)')}</span>
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2342] text-white text-sm font-medium rounded-lg hover:bg-[#193561] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
        </button>
      </div>

      <div className="print-only-card bg-[#FBF9F5] border-2 border-[#0F2342] p-3 sm:p-5 rounded-sm shadow-sm">
        <div className="border border-[#B5892E]/70 p-6 sm:p-10 bg-white relative">
          {/* Header */}
          <div className="text-center border-b border-[#0F2342]/15 pb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#B5892E] bg-[#FBF9F5] mb-3">
              <svg viewBox="0 0 32 32" className="w-6 h-6 text-[#0F2342]" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M16 3L23 14L16 29L9 14L16 3Z" />
                <circle cx="16" cy="14" r="1.5" fill="currentColor" />
                <path d="M16 15.5V29" />
              </svg>
            </div>
            <p className="text-xs tracking-widest uppercase text-[#135D43] font-semibold">
              Handwriting &amp; Calligraphy Foundation of Bangladesh (HCFB)
            </p>
            <p className="text-sm font-medium text-[#0F2342]/80 mt-1">
              হ্যান্ডরাইটিং এন্ড ক্যালিগ্রাফি ফাউন্ডেশন অব বাংলাদেশ
            </p>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-[#0F2342] font-editorial">
              {t('সম্মাননা ও কৃতিত্বের সনদপত্র', 'Certificate of Merit & Recognition')}
            </h2>
          </div>

          {/* Body */}
          <div className="py-8 text-center max-w-2xl mx-auto space-y-4">
            <p className="text-sm text-[#0F2342]/70">
              {t('এই মর্মে প্রত্যয়ন করা যাচ্ছে যে,', 'This certificate is formally presented to')}
            </p>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-[#0F2342]">
                {cert.participant_name_bn}
              </p>
              <p className="text-base sm:text-lg font-medium text-[#0F2342]/80 mt-0.5 font-editorial">
                {cert.participant_name_en}
              </p>
            </div>

            <p className="text-sm sm:text-base text-[#0F2342]/85 leading-relaxed pt-2">
              {t(
                `সফলভাবে "${cert.competition_title_bn}"-এর "${cert.category_name_bn}" বিভাগে অংশগ্রহণ করে "${award.bn}" অর্জন করেছেন।`,
                `for participating in "${cert.competition_title_en}" (${cert.category_name_bn}) and earning the distinction of "${award.en}".`
              )}
            </p>

            <div className="inline-block border-t border-b border-[#B5892E]/50 py-2 px-6 mt-2">
              <span className="text-xs font-medium text-[#135D43]">
                {award.bn} · {award.en}
              </span>
            </div>
          </div>

          {/* Footer / Signatures / QR */}
          <div className="pt-6 border-t border-[#0F2342]/15 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-xs text-[#0F2342]/80">
            <div className="space-y-1">
              <p className="font-mono tabular-nums text-[#0F2342] font-semibold">
                {cert.certificate_code}
              </p>
              <p className="font-mono tabular-nums">
                Reg ID: {cert.registration_id}
              </p>
              <p>Issued: {cert.issued_at.slice(0, 10)}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="h-8 border-b border-[#0F2342]/30 w-40 mx-auto" />
              <p className="font-semibold text-[#0F2342]">{cert.issued_by}</p>
              <p className="text-[#0F2342]/60">HCFB Examination &amp; Jury Board</p>
            </div>

            <div className="flex sm:justify-end items-center gap-3">
              {qrDataUrl && (
                <div className="text-right flex items-center gap-3">
                  <span className="text-[11px] text-[#0F2342]/65 max-w-[110px] leading-tight">
                    Scan QR to verify authenticity
                  </span>
                  <img
                    src={qrDataUrl}
                    alt={`QR verification code for ${cert.certificate_code}`}
                    className="w-20 h-20 border border-[#0F2342]/15 bg-white p-1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
