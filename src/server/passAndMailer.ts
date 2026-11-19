import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

export interface EntryPassPdfInput {
  registrationId: string;
  participantNameEn: string;
  participantNameBn?: string;
  institutionName: string;
  classLevel: string;
  competitionTitleEn: string;
  competitionDate: string;
  categoryNameEn: string;
  transactionId: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentAmount: number;
  isTestPayment: boolean;
  registeredAt: string;
  qrToken: string;
  verifyUrl: string;
}

function safePdfText(val: unknown, fallback = '-'): string {
  const cleaned = String(val ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

export async function generateEntryPassPdfBuffer(input: EntryPassPdfInput): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(input.verifyUrl, {
    width: 340,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#04241D', light: '#FFFFFF' },
  });

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 42,
      info: {
        Title: `HCFB Entry Pass - ${safePdfText(input.registrationId)}`,
        Author: 'Handwriting & Calligraphy Foundation of Bangladesh (HCFB)',
        Subject: 'Official Competition Entry Pass & Registration Confirmation',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const contentW = pageW - 84;

    // Outer double border
    doc.rect(24, 24, pageW - 48, doc.page.height - 48).lineWidth(2).strokeColor('#05241D').stroke();
    doc.rect(30, 30, pageW - 60, doc.page.height - 60).lineWidth(0.8).strokeColor('#B5892E').stroke();

    // Header Banner
    doc.rect(42, 42, contentW, 96).fill('#05241D');

    // Vector Fountain Nib Emblem inside header
    const logoX = 64;
    const logoY = 64;
    doc.circle(logoX + 22, logoY + 26, 22).lineWidth(1.5).strokeColor('#E5C158').stroke();
    doc
      .moveTo(logoX + 22, logoY + 10)
      .lineTo(logoX + 31, logoY + 26)
      .lineTo(logoX + 22, logoY + 42)
      .lineTo(logoX + 13, logoY + 26)
      .closePath()
      .lineWidth(1.5)
      .strokeColor('#E5C158')
      .stroke();
    doc.circle(logoX + 22, logoY + 25, 2.5).fill('#E5C158');

    // Organization Header Text
    doc
      .fillColor('#E5C158')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('HANDWRITING & CALLIGRAPHY FOUNDATION OF BANGLADESH', 118, 58, {
        width: contentW - 92,
      });

    doc
      .fillColor('#CCFBF1')
      .font('Helvetica')
      .fontSize(9.5)
      .text('Official Competition Registration Confirmation & Verified Entry Pass', 118, 80, {
        width: contentW - 92,
      });

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(
        `${safePdfText(input.competitionTitleEn, 'HCFB Handwriting Competition')} (${safePdfText(
          input.competitionDate.slice(0, 4) || '2026',
          '2026'
        )})`,
        118,
        102,
        {
          width: contentW - 92,
        }
      );

    // Entry Pass Status Bar
    const statusLabel =
      input.paymentStatus === 'PAID'
        ? input.isTestPayment
          ? 'PAYMENT STATUS: PAID (SANDBOX TEST)'
          : 'PAYMENT STATUS: PAID - CONFIRMED'
        : `PAYMENT STATUS: ${safePdfText(input.paymentStatus)}`;

    const barColor = input.paymentStatus === 'PAID' ? '#ECFDF5' : '#FEF3C7';
    const textColor = input.paymentStatus === 'PAID' ? '#065F46' : '#92400E';

    doc.rect(42, 152, contentW, 34).fill(barColor);
    doc.rect(42, 152, contentW, 34).lineWidth(0.8).strokeColor('#A7F3D0').stroke();
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(statusLabel, 56, 164, { width: contentW / 2 });

    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(`REG ID: ${safePdfText(input.registrationId)}`, pageW - 240, 164, {
        width: 184,
        align: 'right',
      });

    // Participant Details Grid
    let y = 204;
    doc
      .fillColor('#05241D')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('PARTICIPANT & ENTRY DETAILS', 42, y);
    y += 18;
    doc.moveTo(42, y).lineTo(pageW - 42, y).lineWidth(1).strokeColor('#CBD5E1').stroke();
    y += 12;

    const methodDisplay =
      input.paymentMethod === 'bkash'
        ? 'bKash'
        : input.paymentMethod === 'nagad'
          ? 'Nagad'
          : input.paymentMethod === 'rocket'
            ? 'Rocket'
            : 'Waived / Free';

    const rows: Array<[string, string]> = [
      ['Participant Name', safePdfText(input.participantNameEn, safePdfText(input.participantNameBn, 'Participant'))],
      ['Registration ID', safePdfText(input.registrationId)],
      ['Transaction ID', safePdfText(input.transactionId, 'N/A')],
      ['Competition Category', safePdfText(input.categoryNameEn, 'General Category')],
      ['Institution / School', safePdfText(input.institutionName, 'N/A')],
      ['Class / Grade', safePdfText(input.classLevel, 'N/A')],
      ['Competition Date', safePdfText(input.competitionDate, 'TBA')],
      ['Payment Method', methodDisplay],
      ['Registration Fee', `${Number(input.paymentAmount || 0)} BDT`],
      [
        'Payment Status',
        input.isTestPayment
          ? `${safePdfText(input.paymentStatus)} (Sandbox Test)`
          : safePdfText(input.paymentStatus),
      ],
      ['Registration Date', safePdfText(input.registeredAt.slice(0, 10))],
    ];

    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (i % 2 === 0) {
        doc.rect(42, y - 4, contentW, 24).fill('#F8FAFC');
      }
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9.5).text(label, 52, y + 2, { width: 165 });
      doc.fillColor('#0F172A').font('Helvetica').fontSize(10).text(value, 224, y + 2, { width: contentW - 190 });
      y += 25;
    }

    // QR Code Verification Box
    y += 16;
    const boxH = 198;
    doc.rect(42, y, contentW, boxH).lineWidth(1.2).strokeColor('#05241D').fillAndStroke('#FBF9F5', '#05241D');

    doc.image(qrBuffer, 62, y + 20, { width: 132, height: 132 });

    doc
      .fillColor('#05241D')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('OFFICIAL ANTI-FRAUD QR ENTRY VERIFICATION', 214, y + 24, {
        width: contentW - 190,
      });

    doc
      .fillColor('#334155')
      .font('Helvetica')
      .fontSize(9.5)
      .text(
        'This pass contains a cryptographically unique verification token linked directly to the live HCFB database. Present this printed or digital pass at the competition venue.',
        214,
        y + 46,
        { width: contentW - 190, lineGap: 3 }
      );

    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(`Verification Endpoint: ${input.verifyUrl}`, 214, y + 98, {
        width: contentW - 190,
      });

    doc
      .fillColor('#B45309')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        'Security Notice: Any revoked or tampered registration will immediately show INVALID ENTRY PASS upon organizer scan.',
        214,
        y + 128,
        { width: contentW - 190, lineGap: 2 }
      );

    // Exact required message below the QR Code
    doc
      .fillColor('#05241D')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(
        'Scan this QR Code to verify the authenticity of your official competition entry pass.',
        56,
        y + 166,
        { width: contentW - 28, align: 'center' }
      );

    // Footer Note
    doc
      .fillColor('#64748B')
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Handwriting & Calligraphy Foundation of Bangladesh (HCFB)  |  Helpline: +880 1869-970401  |  Email: hcfb2026@gmail.com',
        42,
        doc.page.height - 54,
        { width: contentW, align: 'center' }
      );

    doc.end();
  });
}

export function getPaymentGatewayConfig() {
  const storeId = (process.env.SSLCOMMERZ_STORE_ID || '').trim();
  const storePass = (process.env.SSLCOMMERZ_STORE_PASSWD || '').trim();
  const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
  const configured = Boolean(storeId && storePass);
  const sandboxAllowed =
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_PAYMENT_SANDBOX !== 'false';

  return {
    configured,
    isLive,
    sandboxAllowed,
    mode: configured ? (isLive ? ('live' as const) : ('sandbox' as const)) : ('sandbox' as const),
    baseUrl: isLive ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com',
    storeId,
    storePass,
  };
}

export async function initSslcommerzSession(params: {
  origin: string;
  tranId: string;
  amount: number;
  method: 'bkash' | 'nagad' | 'rocket';
  participantName: string;
  email: string;
  mobile: string;
  address: string;
  district: string;
  competitionTitle: string;
  categoryName: string;
}): Promise<{ ok: boolean; gatewayUrl?: string; sessionKey?: string; error?: string; raw?: unknown }> {
  const cfg = getPaymentGatewayConfig();
  if (!cfg.configured) {
    return { ok: false, error: 'SSLCOMMERZ credentials not configured' };
  }

  const form = new URLSearchParams({
    store_id: cfg.storeId,
    store_passwd: cfg.storePass,
    total_amount: params.amount.toFixed(2),
    currency: 'BDT',
    tran_id: params.tranId,
    success_url: `${params.origin}/api/payments/sslcommerz/success`,
    fail_url: `${params.origin}/api/payments/sslcommerz/fail`,
    cancel_url: `${params.origin}/api/payments/sslcommerz/cancel`,
    ipn_url: `${params.origin}/api/payments/sslcommerz/ipn`,
    shipping_method: 'NO',
    product_name: params.competitionTitle.slice(0, 180),
    product_category: params.categoryName.slice(0, 80),
    product_profile: 'general',
    cus_name: params.participantName,
    cus_email: params.email || 'participant@hcfb.org.bd',
    cus_add1: params.address || params.district || 'Dhaka',
    cus_city: params.district || 'Dhaka',
    cus_country: 'Bangladesh',
    cus_phone: params.mobile,
    multi_card_name: params.method,
  });

  try {
    const resp = await fetch(`${cfg.baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (data.status === 'SUCCESS' && typeof data.GatewayPageURL === 'string') {
      return {
        ok: true,
        gatewayUrl: data.GatewayPageURL,
        sessionKey: String(data.sessionkey || ''),
        raw: data,
      };
    }
    return {
      ok: false,
      error: String(data.failedreason || 'SSLCOMMERZ session initialization failed'),
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error calling SSLCOMMERZ',
    };
  }
}

export async function validateSslcommerzTransaction(valId: string): Promise<{
  valid: boolean;
  status?: string;
  amount?: number;
  currency?: string;
  tranId?: string;
  bankTranId?: string;
  cardType?: string;
  raw?: unknown;
}> {
  const cfg = getPaymentGatewayConfig();
  if (!cfg.configured || !valId) return { valid: false };

  const url = `${cfg.baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
    valId
  )}&store_id=${encodeURIComponent(cfg.storeId)}&store_passwd=${encodeURIComponent(cfg.storePass)}&format=json`;

  try {
    const resp = await fetch(url);
    const data = (await resp.json()) as Record<string, unknown>;
    const status = String(data.status || '');
    const isOk = status === 'VALID' || status === 'VALIDATED';
    return {
      valid: isOk,
      status,
      amount: Number(data.amount || 0),
      currency: String(data.currency || 'BDT'),
      tranId: String(data.tran_id || ''),
      bankTranId: String(data.bank_tran_id || ''),
      cardType: String(data.card_type || ''),
      raw: data,
    };
  } catch {
    return { valid: false };
  }
}

export async function dispatchSmsOtp(
  mobile: string,
  otpCode: string
): Promise<{ mode: 'sms_gateway' | 'sandbox_log'; delivered: boolean }> {
  const smsUrl = (process.env.SMS_API_URL || '').trim();
  const smsKey = (process.env.SMS_API_KEY || '').trim();
  const senderId = (process.env.SMS_SENDER_ID || 'HCFB').trim();
  const message = `Your HCFB Handwriting Competition verification OTP is ${otpCode}. Valid for 5 minutes. Never share this code.`;

  if (smsUrl && smsKey) {
    try {
      const resp = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${smsKey}`,
        },
        body: JSON.stringify({
          api_key: smsKey,
          senderid: senderId,
          number: mobile,
          message,
        }),
      });
      if (resp.ok) {
        return { mode: 'sms_gateway', delivered: true };
      }
    } catch {
      // fall back if gateway unreachable in non-prod
    }
  }

  return { mode: 'sandbox_log', delivered: true };
}

export async function sendRegistrationConfirmationEmail(params: {
  to: string;
  participantName: string;
  registrationId: string;
  competitionTitle: string;
  categoryName: string;
  transactionId: string;
  verifyUrl: string;
  pdfBuffer: Buffer;
}): Promise<string> {
  if (!params.to) return 'not_provided';

  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const from = (process.env.SMTP_FROM || 'noreply@hcfb.org.bd').trim();

  if (!host || !user || !pass) {
    return 'queued_smtp_not_configured';
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `HCFB Bangladesh <${from}>`,
      to: params.to,
      subject: `Registration Confirmed & Entry Pass: ${params.registrationId} | ${params.competitionTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B4B;">
          <h2 style="color: #05241D;">Congratulations, ${params.participantName}!</h2>
          <p>Your registration for <strong>${params.competitionTitle}</strong> has been confirmed.</p>
          <ul>
            <li><strong>Registration ID:</strong> ${params.registrationId}</li>
            <li><strong>Transaction ID:</strong> ${params.transactionId}</li>
            <li><strong>Category:</strong> ${params.categoryName}</li>
            <li><strong>Payment Status:</strong> PAID</li>
          </ul>
          <p>Your official Entry Pass PDF with a secure QR code is attached. You can also verify authenticity anytime at:</p>
          <p><a href="${params.verifyUrl}">${params.verifyUrl}</a></p>
        </div>
      `,
      attachments: [
        {
          filename: `HCFB-Entry-Pass-${params.registrationId}.pdf`,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return 'sent_smtp';
  } catch {
    return 'smtp_delivery_failed';
  }
}
