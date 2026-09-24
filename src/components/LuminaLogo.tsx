import React from 'react';

interface LuminaLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textColor?: string;
}

export default function LuminaLogo({
  size = 64,
  showText = true,
  className = '',
  textColor,
}: LuminaLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        {/* Outer Compass Ring */}
        <circle cx="50" cy="50" r="38" stroke="#34495E" strokeWidth="6" />

        {/* Compass Points */}
        <polygon points="50,6 54,16 46,16" fill="#34495E" />
        <polygon points="50,94 54,84 46,84" fill="#34495E" />
        <polygon points="6,50 16,46 16,54" fill="#34495E" />
        <polygon points="94,50 84,46 84,54" fill="#34495E" />

        {/* Central L Lettermark */}
        <path
          d="M 38 32 V 68 H 62"
          stroke="#8E44AD"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lumina Spark Star */}
        <polygon
          points="58,32 60,38 66,40 60,42 58,48 56,42 50,40 56,38"
          fill="#F1C40F"
        />
      </svg>
      {showText && (
        <span
          className={`font-bold tracking-tight ${textColor || 'text-white'}`}
          style={{ fontSize: size >= 70 ? '2rem' : size >= 48 ? '1.5rem' : '1.25rem' }}
        >
          LUMINA
        </span>
      )}
    </div>
  );
}

export { LuminaLogo };
