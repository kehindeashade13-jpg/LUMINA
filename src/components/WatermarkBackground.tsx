import React from 'react';
import { LUMINA_LOGO_IMAGE_URL } from './LuminaLogo';

export const WatermarkBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center"
    >
      {/* Primary Centered Watermark - carefully calibrated opacity to be just visible enough to make out */}
      <div className="relative flex items-center justify-center w-full h-full max-w-7xl mx-auto">
        <img
          src={LUMINA_LOGO_IMAGE_URL}
          alt=""
          className="w-[440px] h-[440px] sm:w-[580px] sm:h-[580px] md:w-[720px] md:h-[720px] max-w-[85vw] max-h-[85vh] object-contain opacity-[0.055] transition-opacity duration-300 filter drop-shadow-[0_0_80px_rgba(142,68,173,0.12)]"
        />

        {/* Ambient Top-Right Secondary Watermark Accent */}
        <img
          src={LUMINA_LOGO_IMAGE_URL}
          alt=""
          className="hidden lg:block absolute -top-12 -right-16 w-[320px] h-[320px] object-contain opacity-[0.035] -rotate-12 pointer-events-none"
        />

        {/* Ambient Bottom-Left Secondary Watermark Accent */}
        <img
          src={LUMINA_LOGO_IMAGE_URL}
          alt=""
          className="hidden lg:block absolute -bottom-16 -left-16 w-[320px] h-[320px] object-contain opacity-[0.035] rotate-12 pointer-events-none"
        />
      </div>
    </div>
  );
};

export default WatermarkBackground;
