export function HcfbBrandMark({
  logoUrl,
  size = 'md',
}: {
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-xl';
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="HCFB Logo"
        referrerPolicy="no-referrer"
        className={`${dims} object-contain bg-white border border-[#E5C158]/40 shadow-sm shrink-0`}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center ${dims} bg-gradient-to-br from-[#0F4C42] via-[#0A362C] to-[#05241D] border border-[#E5C158]/50 text-[#F3D98B] shadow-sm shrink-0`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 3L17.5 11.5L12 21L6.5 11.5L12 3Z" />
        <circle cx="12" cy="11.5" r="1.2" fill="currentColor" />
        <path d="M12 12.7V21" />
      </svg>
    </span>
  );
}
