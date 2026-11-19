import { useState } from 'react';
import { Feather } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({ src, alt, className = '', fallbackTitle }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3FF] via-[#FFFBF5] to-[#FDF2F8] border border-[#EDE9FE] text-[#4C1D95]/70 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 text-[#7C3AED]">
          <Feather className="w-6 h-6" aria-hidden="true" />
        </div>
        <span className="text-xs font-medium text-[#4C1D95]/80 max-w-[22ch]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
