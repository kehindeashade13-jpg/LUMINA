import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  Plus,
  ChevronDown,
  User,
  LogOut,
  LogIn,
  Menu,
  Search,
  X,
  FileCheck,
} from 'lucide-react';
import { ActiveTab, StudyMaterial, LuminaUser } from '../types/study';
import LuminaLogo from './LuminaLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  materials: StudyMaterial[];
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
  onOpenUploadModal: () => void;
  user: LuminaUser | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  materials,
  currentMaterial,
  onSelectMaterial,
  onOpenUploadModal,
  user,
  onOpenAuthModal,
  onSignOut,
  onOpenSidebar,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  const desktopUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktopMenu = desktopUserMenuRef.current?.contains(target);
      const inMobileMenu = mobileUserMenuRef.current?.contains(target);
      if (!inDesktopMenu && !inMobileMenu) {
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S';
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Scholar';

  // Filter materials based on search query
  const searchResults = searchQuery.trim()
    ? materials.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.summary && m.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSelectSearchResult = (material: StudyMaterial) => {
    onSelectMaterial(material);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsMobileSearchActive(false);
  };

  const navItems: { id: ActiveTab; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'documents', label: 'Docs', mobileLabel: 'Docs', icon: BookOpen },
    { id: 'notes', label: 'Notes', mobileLabel: 'Notes', icon: FileText },
    { id: 'flashcards', label: 'Cards', mobileLabel: 'Cards', icon: Layers },
    { id: 'quiz', label: 'Quiz', mobileLabel: 'Quiz', icon: HelpCircle },
  ];

  const renderUserDropdown = () => (
    <div className="absolute right-0 top-full mt-2 w-72 bg-[#161922] border border-[#262B36] rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in duration-150 space-y-3">
      {user ? (
        <div className="flex items-center gap-3 pb-3 border-b border-[#262B36]">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED] text-[#F9FAFB] font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#F9FAFB] truncate">
              {user.fullName}
            </p>
            <p className="text-[11px] text-[#9CA3AF] truncate">{user.email}</p>
          </div>
        </div>
      ) : (
        <div className="pb-3 border-b border-[#262B36]">
          <p className="text-xs font-semibold text-[#F9FAFB]">Guest Workspace</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Sign in to sync documents and study progress across devices.
          </p>
          <button
            onClick={() => {
              setIsUserMenuOpen(false);
              onOpenAuthModal();
            }}
            className="mt-2.5 w-full px-3 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Create Account</span>
          </button>
        </div>
      )}

      {/* Secondary Install App Action housed cleanly inside Profile Menu */}
      <div>
        <PWAInstallButton variant="sidebar" />
      </div>

      {user && (
        <div className="pt-1 border-t border-[#262B36]">
          <button
            onClick={() => {
              setIsUserMenuOpen(false);
              onSignOut();
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#0D0F12] hover:bg-red-950/40 border border-[#262B36] hover:border-red-800/50 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262B36] bg-[#0D0F12]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Desktop & Tablet Single-Row Bar (md and up) */}
        <div className="hidden md:flex items-center justify-between h-16 gap-3 lg:gap-4">
          {/* Left Zone: Hamburger + Brand Logo + Document Selector */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <button
              onClick={onOpenSidebar}
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
              className="p-2 rounded-xl bg-[#161922] border border-[#262B36] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#7C3AED] transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div
              className="flex items-center cursor-pointer shrink-0"
              onClick={() => setActiveTab('notes')}
            >
              <LuminaLogo size={42} showText={false} />
            </div>

            {/* Document Selector Dropdown */}
            {materials.length > 0 && (
              <div className="relative group shrink min-w-0 max-w-[160px] lg:max-w-[220px]">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161922] border border-[#262B36] text-xs font-medium text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#7C3AED] transition w-full">
                  <span className="truncate text-left text-[#F9FAFB]">
                    {currentMaterial ? currentMaterial.title : 'Select Document'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 ml-auto" />
                </button>

                <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#161922] border border-[#262B36] rounded-xl shadow-2xl p-1.5 hidden group-hover:block hover:block z-50 animate-in fade-in duration-100">
                  <div className="text-[11px] font-semibold text-[#9CA3AF] px-2.5 py-1">
                    Study Materials ({materials.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => onSelectMaterial(mat)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex flex-col ${
                          currentMaterial?.id === mat.id
                            ? 'bg-[#7C3AED]/20 text-[#F9FAFB] font-semibold border border-[#7C3AED]/40'
                            : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12]'
                        }`}
                      >
                        <span className="truncate text-[#F9FAFB]">{mat.title}</span>
                        <span className="text-[10px] text-[#9CA3AF]">{mat.subject}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 mt-1 border-t border-[#262B36]">
                    <button
                      onClick={onOpenUploadModal}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#A78BFA] hover:text-[#F9FAFB] hover:bg-[#0D0F12] flex items-center gap-1.5 font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload New Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Zone: High-Contrast Category Navigation Tabs (Docs, Notes, Cards, Quiz) */}
          <nav
            aria-label="Study category tabs"
            className="flex items-center gap-1.5 bg-[#0D0F12] p-1 rounded-xl border border-[#262B36] text-xs shrink-0"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                    isActive
                      ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                      : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1E222D] border border-transparent hover:border-[#262B36]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Zone: Search Bar, Primary + Upload CTA, and User Profile Avatar Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Document Search Bar */}
            <div className="relative" ref={searchContainerRef}>
              <div className="flex items-center bg-[#161922] border border-[#262B36] focus-within:border-[#7C3AED] rounded-xl px-3 py-1.5 transition w-44 lg:w-60">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full bg-transparent text-xs text-[#F9FAFB] placeholder-[#9CA3AF] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="p-0.5 text-[#9CA3AF] hover:text-[#F9FAFB] transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#161922] border border-[#262B36] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in duration-100">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[#9CA3AF] border-b border-[#262B36] mb-1 flex items-center justify-between">
                    <span>Search Results ({searchResults.length})</span>
                    <span className="text-[10px] text-[#9CA3AF]">Esc to close</span>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchResults.map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => handleSelectSearchResult(mat)}
                          className={`w-full text-left p-2 rounded-xl text-xs transition flex items-start gap-2.5 ${
                            currentMaterial?.id === mat.id
                              ? 'bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#F9FAFB]'
                              : 'hover:bg-[#0D0F12] text-[#9CA3AF]'
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-[#0D0F12] border border-[#262B36] text-[#10B981] shrink-0 mt-0.5">
                            <FileCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate text-[#F9FAFB]">{mat.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#9CA3AF] tabular-nums">
                              <span className="text-[#06B6D4] font-medium">{mat.subject}</span>
                              <span>·</span>
                              <span>{mat.flashcards.length} cards</span>
                              <span>·</span>
                              <span>{mat.quiz.length} Qs</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 px-3 text-center text-xs text-[#9CA3AF]">
                      No documents found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary Upload CTA Button (Vibrant Violet #7C3AED) */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-xs shadow-sm transition active:scale-95 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <Plus className="w-4 h-4" />
              <span>Upload</span>
            </button>

            {/* User Profile Avatar Button (houses Account & Install option) */}
            <div className="relative" ref={desktopUserMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="User Profile Menu"
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-[#161922] border border-[#262B36] hover:border-[#7C3AED] transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
              >
                <div className="w-6 h-6 rounded-lg bg-[#7C3AED] text-[#F9FAFB] font-bold text-xs flex items-center justify-center shrink-0">
                  {user ? userInitial : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-[#F9FAFB] max-w-[90px] truncate">
                  {user ? firstName : 'Account'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </button>

              {isUserMenuOpen && renderUserDropdown()}
            </div>
          </div>
        </div>

        {/* Mobile & Small Screens View (< md): Simplified Two-Row Layout */}
        <div className="flex md:hidden flex-col py-2.5 gap-2.5">
          {/* Top Row: Left (Hamburger + Lumina Logo) | Right (Search Icon, + Upload CTA, User Profile Avatar) */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Hamburger Menu Icon + Lumina Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={onOpenSidebar}
                aria-label="Open Navigation Menu"
                className="p-2 rounded-xl bg-[#161922] border border-[#262B36] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#7C3AED] transition"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div
                className="flex items-center cursor-pointer shrink-0"
                onClick={() => setActiveTab('notes')}
              >
                <LuminaLogo size={36} showText={false} />
              </div>
            </div>

            {/* Right: Search Icon, Primary "+ Upload" CTA Button, and User Profile Avatar Button */}
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
              {isMobileSearchActive ? (
                <div className="flex items-center bg-[#161922] border border-[#7C3AED] rounded-xl px-2.5 py-1.5 flex-1 max-w-[190px]">
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] mr-1.5 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#F9FAFB] placeholder-[#9CA3AF] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setIsMobileSearchActive(false);
                      setSearchQuery('');
                    }}
                    className="p-0.5 text-[#9CA3AF] hover:text-[#F9FAFB]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsMobileSearchActive(true)}
                  aria-label="Search documents"
                  className="p-2 rounded-xl bg-[#161922] border border-[#262B36] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#7C3AED] transition shrink-0"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              {/* Primary Upload CTA Button */}
              <button
                onClick={onOpenUploadModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-xs shadow-sm transition active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Upload</span>
              </button>

              {/* User Profile Avatar Button */}
              <div className="relative shrink-0" ref={mobileUserMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label="User Profile"
                  className="w-8 h-8 rounded-xl bg-[#7C3AED] text-[#F9FAFB] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-[#7C3AED]/40"
                >
                  {user ? userInitial : <User className="w-4 h-4" />}
                </button>

                {isUserMenuOpen && renderUserDropdown()}
              </div>
            </div>
          </div>

          {/* Mobile Search Results Overlay */}
          {isMobileSearchActive && searchQuery.trim().length > 0 && (
            <div className="bg-[#161922] border border-[#262B36] rounded-xl p-2 shadow-2xl z-50">
              <div className="px-2 py-1 text-[10px] font-semibold text-[#9CA3AF] border-b border-[#262B36] mb-1">
                Matching Documents ({searchResults.length})
              </div>
              {searchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {searchResults.map((mat) => (
                    <button
                      key={mat.id}
                      onClick={() => handleSelectSearchResult(mat)}
                      className={`w-full text-left p-2 rounded-lg text-xs truncate transition flex flex-col ${
                        currentMaterial?.id === mat.id
                          ? 'bg-[#7C3AED]/20 text-[#F9FAFB] font-semibold'
                          : 'hover:bg-[#0D0F12] text-[#9CA3AF]'
                      }`}
                    >
                      <span className="truncate text-[#F9FAFB]">{mat.title}</span>
                      <span className="text-[10px] text-[#06B6D4]">{mat.subject}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[#9CA3AF]">
                  No documents found
                </div>
              )}
            </div>
          )}

          {/* Bottom Bar: High-Contrast Filter Tabs (Docs, Notes, Cards, Quiz) */}
          <nav
            aria-label="Mobile study category tabs"
            className="grid grid-cols-4 gap-1.5 bg-[#0D0F12] p-1 rounded-xl border border-[#262B36] text-xs w-full"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                    isActive
                      ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                      : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1E222D] border border-transparent hover:border-[#262B36]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.mobileLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
