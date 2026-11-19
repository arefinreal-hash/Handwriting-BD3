import React from 'react';

export type MobilePaymentMethod = 'bkash' | 'nagad' | 'rocket';

export function BkashLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 42" className={className} role="img" aria-label="bKash">
      <rect x="0" y="0" width="132" height="42" rx="10" fill="#E2136E" />
      <g transform="translate(12, 8)">
        <polygon points="10,2 19,12 11,16" fill="#FFFFFF" opacity="0.96" />
        <polygon points="11,16 22,12 15,24" fill="#FCE7F3" />
        <polygon points="2,13 10,7 11,16" fill="#FBCFE8" />
        <polygon points="15,24 22,12 25,18" fill="#FFFFFF" opacity="0.88" />
      </g>
      <text
        x="46"
        y="27"
        fill="#FFFFFF"
        fontFamily="Poppins, sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="0.3"
      >
        bKash
      </text>
    </svg>
  );
}

export function NagadLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 42" className={className} role="img" aria-label="Nagad">
      <rect x="0" y="0" width="132" height="42" rx="10" fill="#F25C19" />
      <circle cx="24" cy="21" r="11" fill="#FFFFFF" />
      <path d="M19 25 C21 18, 25 14, 30 17 C27 21, 24 23, 19 25 Z" fill="#E11D2E" />
      <circle cx="24" cy="20" r="2.2" fill="#F59E0B" />
      <text
        x="43"
        y="27"
        fill="#FFFFFF"
        fontFamily="Poppins, sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="0.3"
      >
        Nagad
      </text>
    </svg>
  );
}

export function RocketLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 42" className={className} role="img" aria-label="Rocket">
      <rect x="0" y="0" width="132" height="42" rx="10" fill="#8C3494" />
      <g transform="translate(11, 9)">
        <circle cx="12" cy="12" r="11" fill="#FFFFFF" opacity="0.18" />
        <path d="M12 3 L17 15 L12 13 L7 15 Z" fill="#FFFFFF" />
        <path d="M9 17 L12 22 L15 17" stroke="#FDE047" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <text
        x="42"
        y="27"
        fill="#FFFFFF"
        fontFamily="Poppins, sans-serif"
        fontWeight="700"
        fontSize="15.5"
        letterSpacing="0.3"
      >
        Rocket
      </text>
    </svg>
  );
}

export function PaymentMethodLogo({
  method,
  className = 'h-8 w-auto',
}: {
  method: MobilePaymentMethod | string;
  className?: string;
}) {
  if (method === 'bkash') return <BkashLogo className={className} />;
  if (method === 'nagad') return <NagadLogo className={className} />;
  if (method === 'rocket') return <RocketLogo className={className} />;
  return null;
}
