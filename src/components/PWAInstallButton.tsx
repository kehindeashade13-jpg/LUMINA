import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
  CheckCircle,
  Laptop,
  Globe,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import LuminaLogo from './LuminaLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed and running standalone, do not show button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      try {
        setIsInstalling(true);
        const accepted = await install();
        if (!accepted) {
          // If dismissed or need manual guide
          setShowGuideModal(true);
        }
      } catch (e) {
        setShowGuideModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          onClick={handleClick}
          title="Install LUMINA as Web App (Chrome, Opera, Safari, Android & iOS)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8E44AD]/25 to-[#F1C40F]/20 hover:from-[#8E44AD]/40 hover:to-[#F1C40F]/35 border border-[#8E44AD]/50 hover:border-[#F1C40F]/60 text-xs font-semibold text-neutral-100 hover:text-white transition shadow-sm group ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-[#F1C40F] group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Install App</span>
          <span className="inline sm:hidden">Install</span>
        </button>
      ) : variant === 'sidebar' ? (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-neutral-900 to-[#8E44AD]/20 border border-[#8E44AD]/40 hover:border-[#8E44AD] text-left transition group ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#8E44AD]/30 border border-[#8E44AD]/50 text-[#F1C40F] group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-100 group-hover:text-white flex items-center gap-1.5">
                Install as Mobile / Web App
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F1C40F]/20 text-[#F1C40F] font-semibold border border-[#F1C40F]/40">
                  PWA
                </span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Chrome, Safari, Opera &amp; Home Screen
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#F1C40F] group-hover:translate-x-1 transition" />
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#8E44AD] hover:bg-[#9b59b6] text-white text-xs font-semibold shadow-md shadow-[#8E44AD]/30 transition ${className}`}
        >
          <Download className="w-4 h-4 text-[#F1C40F]" />
          <span>Install Web App</span>
        </button>
      )}

      {/* Cross-Browser Install Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-[#34495E]/80 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden text-neutral-100 max-h-[90vh] overflow-y-auto">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-1/4 w-40 h-20 bg-[#8E44AD]/25 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="p-2 rounded-2xl bg-neutral-800 border border-[#34495E]/70 shrink-0">
                <LuminaLogo size={42} showText={false} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
                  Install LUMINA Web App
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8E44AD]/20 text-[#a569bd] border border-[#8E44AD]/40">
                    Standalone
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Launch from your phone home screen or desktop without browser bars
                </p>
              </div>
            </div>

            {/* Quick 1-Click Install Button if supported */}
            {isInstallable && (
              <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-[#8E44AD]/20 to-[#2ECC71]/15 border border-[#8E44AD]/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#F1C40F]" />
                      Direct Browser Install Ready
                    </p>
                    <p className="text-[11px] text-neutral-300 mt-0.5">
                      Chrome, Opera, and Edge support 1-tap installation.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await install();
                      setShowGuideModal(false);
                    }}
                    disabled={isInstalling}
                    className="px-4 py-2 rounded-xl bg-[#8E44AD] hover:bg-[#9b59b6] text-white text-xs font-bold shadow-lg shadow-[#8E44AD]/30 transition shrink-0 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* Browser Specific Guides */}
            <div className="space-y-3.5 text-xs">
              {/* iPhone / iPad Safari */}
              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-[#34495E]/60">
                <div className="flex items-center gap-2 font-bold text-neutral-200 mb-2">
                  <Smartphone className="w-4 h-4 text-[#F1C40F]" />
                  <span>iPhone &amp; iPad (Apple Safari &amp; Chrome)</span>
                </div>
                <ol className="space-y-2 text-neutral-300 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Tap the <strong className="text-white">Share</strong> button{' '}
                      <Share className="inline w-3.5 h-3.5 text-[#F1C40F] mx-0.5 align-middle" /> in
                      the Safari toolbar (bottom on iPhone, top on iPad).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Scroll down the share sheet and tap{' '}
                      <strong className="text-white">Add to Home Screen</strong>{' '}
                      <PlusSquare className="inline w-3.5 h-3.5 text-[#a569bd] mx-0.5 align-middle" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Tap <strong className="text-white">Add</strong> in the top right. LUMINA will
                      appear on your phone home screen like a native app!
                    </span>
                  </li>
                </ol>
              </div>

              {/* Android Phone (Chrome, Opera, Samsung Internet) */}
              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-[#34495E]/60">
                <div className="flex items-center gap-2 font-bold text-neutral-200 mb-2">
                  <Globe className="w-4 h-4 text-[#2ECC71]" />
                  <span>Android Phone (Google Chrome, Opera, Samsung Internet)</span>
                </div>
                <ol className="space-y-1.5 text-neutral-300 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Tap the <strong className="text-white">Menu</strong> (three dots ⋮) in the top
                      right of Chrome or Opera.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap <strong className="text-white">Install App</strong> or{' '}
                      <strong className="text-white">Add to Home screen</strong>.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Desktop (Chrome, Opera, Edge, Safari macOS) */}
              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-[#34495E]/60">
                <div className="flex items-center gap-2 font-bold text-neutral-200 mb-2">
                  <Laptop className="w-4 h-4 text-[#a569bd]" />
                  <span>Desktop (Google Chrome, Opera, Edge, macOS Safari)</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  In Google Chrome or Opera address bar, click the{' '}
                  <strong className="text-white">Install icon</strong> (computer screen with down
                  arrow) on the right side of the URL bar, or click Menu ⋮ &gt;{' '}
                  <strong className="text-white">Save and Share</strong> &gt;{' '}
                  <strong className="text-white">Install LUMINA</strong>.
                </p>
              </div>
            </div>

            {/* Close / Got it */}
            <div className="mt-5 pt-4 border-t border-[#34495E]/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <CheckCircle className="w-3.5 h-3.5 text-[#2ECC71]" />
                <span>Works offline with automatic caching</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
