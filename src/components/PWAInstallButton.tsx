import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  MoreVertical,
  Loader2,
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
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // Default active tab based on detected device
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }
  }, [isIOS, isAndroid]);

  // Handle clicking the main install button in Header or Sidebar
  const handleOpenModal = () => {
    // ALWAYS open the modal immediately so the user sees an instant response
    setShowGuideModal(true);
  };

  // Direct 1-tap browser install trigger
  const handleDirectInstall = async () => {
    try {
      setIsPrompting(true);
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => {
          setShowGuideModal(false);
          setInstalledSuccess(false);
        }, 1500);
      }
    } catch (e) {
      console.warn('Install trigger error:', e);
    } finally {
      setIsPrompting(false);
    }
  };

  // If already running standalone, hide the prompt
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleOpenModal}
          title="Install LUMINA as Web App (Chrome, Opera, Safari, Android, iOS)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8E44AD]/30 to-[#F1C40F]/20 hover:from-[#8E44AD]/45 hover:to-[#F1C40F]/35 border border-[#8E44AD]/50 hover:border-[#F1C40F]/60 text-xs font-semibold text-neutral-100 hover:text-white transition shadow-sm group active:scale-95 shrink-0 ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-[#F1C40F] group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Install App</span>
          <span className="inline sm:hidden">Install</span>
        </button>
      ) : variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleOpenModal}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-neutral-900 to-[#8E44AD]/20 border border-[#8E44AD]/40 hover:border-[#8E44AD] text-left transition group active:scale-98 ${className}`}
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
          type="button"
          onClick={handleOpenModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#8E44AD] hover:bg-[#9b59b6] text-white text-xs font-semibold shadow-md shadow-[#8E44AD]/30 transition ${className}`}
        >
          <Download className="w-4 h-4 text-[#F1C40F]" />
          <span>Install Web App</span>
        </button>
      )}

      {/* Cross-Browser Install Modal Rendered into Document Body via Portal */}
      {showGuideModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setShowGuideModal(false)}
          >
            {/* Modal Dialog Content */}
            <div
              className="relative w-full sm:max-w-md bg-neutral-900 border-t sm:border border-[#34495E]/80 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden text-neutral-100 max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Drag Indicator */}
              <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

              {/* Ambient Glow */}
              <div className="absolute top-0 right-1/4 w-36 h-20 bg-[#8E44AD]/20 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-xl bg-neutral-800 border border-[#34495E]/70 shrink-0">
                    <LuminaLogo size={36} showText={false} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                      Install LUMINA App
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8E44AD]/25 text-[#c39bd3] border border-[#8E44AD]/40">
                        PWA
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Store on your phone home screen or desktop
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success Notice if installed */}
              {installedSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-[#2ECC71]/20 border border-[#2ECC71]/50 text-[#2ECC71] text-xs font-semibold flex items-center gap-2 shrink-0 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>LUMINA installed successfully to your device!</span>
                </div>
              )}

              {/* Direct 1-Click Install Button when browser supports beforeinstallprompt */}
              {isInstallable && !installedSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-[#8E44AD]/25 to-[#2ECC71]/20 border border-[#8E44AD]/40 shrink-0">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#F1C40F] shrink-0" />
                        Direct Install Ready
                      </p>
                      <p className="text-[11px] text-neutral-300 truncate">
                        Tap below to install directly to phone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDirectInstall}
                      disabled={isPrompting}
                      className="px-3.5 py-2 rounded-xl bg-[#8E44AD] hover:bg-[#9b59b6] text-white text-xs font-bold shadow-md shadow-[#8E44AD]/30 transition shrink-0 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      {isPrompting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-[#F1C40F]" />
                      )}
                      <span>Install Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Device Tabs */}
              <div className="grid grid-cols-3 p-1 bg-neutral-950 rounded-xl border border-[#34495E]/60 mb-3 shrink-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'android'
                      ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'ios'
                      ? 'bg-[#F1C40F]/20 text-[#F1C40F] border border-[#F1C40F]/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPhone</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'desktop'
                      ? 'bg-[#8E44AD]/25 text-[#c39bd3] border border-[#8E44AD]/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>

              {/* Scrollable Step-by-Step Instructions */}
              <div className="overflow-y-auto space-y-2.5 pr-1 text-xs">
                {/* Android Phone Tab (Chrome, Opera, Samsung Internet) */}
                {activeTab === 'android' && (
                  <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-[#34495E]/60 space-y-2.5">
                    <p className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#2ECC71]" />
                      <span>Android (Chrome, Opera, Samsung Internet)</span>
                    </p>

                    <div className="space-y-2 text-neutral-300">
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900 border border-[#34495E]/40">
                        <div className="p-1 rounded-lg bg-neutral-800 text-[#F1C40F] shrink-0 mt-0.5">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-100">Step 1: Open Browser Menu</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Tap the three dots (<strong>⋮</strong> or <strong>...</strong>) in the top or bottom bar of Chrome or Opera.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900 border border-[#34495E]/40">
                        <div className="p-1 rounded-lg bg-neutral-800 text-[#2ECC71] shrink-0 mt-0.5">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-100">Step 2: Tap Install App</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Tap <strong className="text-white">Install App</strong> (or <strong className="text-white">Add to Home screen</strong>). LUMINA will be added directly to your phone screen with its official logo!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* iPhone / iPad Tab (Safari & Chrome on iOS) */}
                {activeTab === 'ios' && (
                  <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-[#34495E]/60 space-y-2.5">
                    <p className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#F1C40F]" />
                      <span>Apple iPhone &amp; iPad (Safari)</span>
                    </p>

                    <div className="space-y-2 text-neutral-300">
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900 border border-[#34495E]/40">
                        <div className="p-1 rounded-lg bg-neutral-800 text-[#F1C40F] shrink-0 mt-0.5">
                          <Share className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-100">Step 1: Tap Share</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Tap the <strong className="text-white">Share</strong> button (square with arrow pointing up) in Safari’s toolbar.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900 border border-[#34495E]/40">
                        <div className="p-1 rounded-lg bg-neutral-800 text-[#c39bd3] shrink-0 mt-0.5">
                          <PlusSquare className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-100">Step 2: Add to Home Screen</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Scroll down the share sheet and tap <strong className="text-white">Add to Home Screen</strong>, then tap <strong className="text-white">Add</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop Tab */}
                {activeTab === 'desktop' && (
                  <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-[#34495E]/60 space-y-2.5">
                    <p className="font-bold text-neutral-200 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-[#c39bd3]" />
                      <span>Desktop (Chrome, Opera, Edge, Safari macOS)</span>
                    </p>

                    <p className="text-neutral-300 leading-relaxed text-[11px]">
                      Look at the right side of your browser URL address bar and click the{' '}
                      <strong className="text-white">Install icon</strong> (computer monitor with arrow down), or click browser Menu (⋮) &gt;{' '}
                      <strong className="text-white">Save and Share</strong> &gt;{' '}
                      <strong className="text-white">Install LUMINA</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Footer */}
              <div className="mt-3 pt-3 border-t border-[#34495E]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <CheckCircle className="w-3.5 h-3.5 text-[#2ECC71]" />
                  <span>Runs full-screen with offline support</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
