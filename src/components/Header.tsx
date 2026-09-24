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

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#34495E]/50 bg-neutral-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Desktop & Tablet Single-Row Bar (md and up) */}
        <div className="hidden md:flex items-center justify-between h-16 gap-3 lg:gap-4">
          {/* Brand Logo & Name + Hamburger + Document Selector */}
          <div className="flex items-center gap-2.5 lg:gap-3.5 shrink-0 min-w-0">
            {/* Hamburger Menu Button */}
            <button
              onClick={onOpenSidebar}
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
              className="p-2 rounded-xl bg-neutral-900 border border-[#34495E]/60 text-neutral-300 hover:text-white hover:border-[#8E44AD] hover:bg-neutral-850 transition shrink-0 shadow-sm"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Brand Logo */}
            <div
              className="flex items-center cursor-pointer shrink-0"
              onClick={() => setActiveTab('notes')}
            >
              <LuminaLogo size={48} />
            </div>

            {/* Document Selector Dropdown */}
            {materials.length > 0 && (
              <div className="relative group shrink min-w-0 max-w-[150px] lg:max-w-[220px]">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-[#34495E]/60 text-xs font-medium text-neutral-300 hover:text-white hover:border-[#8E44AD] transition w-full">
                  <span className="truncate text-left">
                    {currentMaterial ? currentMaterial.title : 'Select Document'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-auto" />
                </button>

                <div className="absolute left-0 top-full mt-1.5 w-64 bg-neutral-900 border border-[#34495E]/70 rounded-xl shadow-xl p-1.5 hidden group-hover:block hover:block z-50 animate-in fade-in duration-100">
                  <div className="text-[10px] font-semibold text-[#F1C40F] uppercase px-2.5 py-1 tracking-wider">
                    Study Materials ({materials.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => onSelectMaterial(mat)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex flex-col ${
                          currentMaterial?.id === mat.id
                            ? 'bg-[#8E44AD]/20 text-[#a569bd] font-medium border border-[#8E44AD]/30'
                            : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <span className="truncate">{mat.title}</span>
                        <span className="text-[10px] text-neutral-400">{mat.subject}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 mt-1 border-t border-[#34495E]/50">
                    <button
                      onClick={onOpenUploadModal}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#a569bd] hover:text-[#8E44AD] hover:bg-neutral-800 flex items-center gap-1.5 font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload New Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-[#34495E]/50 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-neutral-800 text-white shadow-sm border border-[#34495E]/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'notes'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'flashcards'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcards</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Quiz</span>
            </button>
          </nav>

          {/* Right Action Tools: Search Bar Beside Upload, Settings, Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Document Search Bar */}
            <div className="relative" ref={searchContainerRef}>
              <div className="flex items-center bg-neutral-900 border border-[#34495E]/60 focus-within:border-[#8E44AD] rounded-xl px-2.5 py-1.5 transition w-44 lg:w-60 shadow-inner">
                <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-2" />
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
                  className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="p-0.5 text-neutral-400 hover:text-white transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-900 border border-[#34495E]/70 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#F1C40F] uppercase tracking-wider border-b border-[#34495E]/50 mb-1 flex items-center justify-between">
                    <span>Search Results ({searchResults.length})</span>
                    <span className="text-[9px] text-neutral-500">Press Esc to close</span>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchResults.map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => handleSelectSearchResult(mat)}
                          className={`w-full text-left p-2 rounded-xl text-xs transition flex items-start gap-2.5 ${
                            currentMaterial?.id === mat.id
                              ? 'bg-[#8E44AD]/20 border border-[#8E44AD]/40 text-neutral-100'
                              : 'hover:bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-[#34495E]/40 text-[#a569bd] shrink-0 mt-0.5">
                            <FileCheck className="w-3.5 h-3.5 text-[#2ECC71]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate text-neutral-100">{mat.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400">
                              <span className="text-[#F1C40F] font-medium">{mat.subject}</span>
                              <span>•</span>
                              <span>{mat.flashcards.length} cards</span>
                              <span>•</span>
                              <span>{mat.quiz.length} questions</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 px-3 text-center text-xs text-neutral-500">
                      No uploaded documents found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload Document Primary CTA (Deep Violet #8E44AD) */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#8E44AD] hover:bg-[#7D3C98] text-white font-semibold text-xs shadow-md shadow-[#8E44AD]/30 transition active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Upload</span>
            </button>

            {/* User Profile Menu / Logout Button */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-neutral-900 border border-[#34495E]/60 hover:border-[#8E44AD] transition text-left"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#8E44AD] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {userInitial}
                  </div>
                  <span className="hidden lg:inline text-xs font-semibold text-neutral-200 max-w-[90px] truncate">
                    {firstName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-[#34495E]/70 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in duration-100">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-[#34495E]/50">
                      <div className="w-9 h-9 rounded-xl bg-[#8E44AD] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-[#8E44AD]/25">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-100 truncate">
                          {user.fullName}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-800/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#34495E]/30 hover:bg-[#34495E]/60 border border-[#34495E] text-neutral-200 hover:text-white text-xs font-semibold transition"
              >
                <LogIn className="w-3.5 h-3.5 text-[#F1C40F]" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile & Small Screens View (< md): Two-Row Clean Layout */}
        <div className="flex md:hidden flex-col py-2.5 gap-2">
          {/* Top Bar: Hamburger, Brand, Search, Upload, Profile */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 shrink-0">
              {/* Hamburger Button on Mobile */}
              <button
                onClick={onOpenSidebar}
                aria-label="Open Navigation Menu"
                className="p-1.5 rounded-lg bg-neutral-900 border border-[#34495E]/60 text-neutral-300 hover:text-white transition"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Brand Logo */}
              <div
                className="flex items-center cursor-pointer shrink-0"
                onClick={() => setActiveTab('notes')}
              >
                <LuminaLogo size={36} />
              </div>
            </div>

            {/* Mobile Actions: Search toggle / input, Upload, Profile */}
            <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
              {/* Expandable Mobile Search Input */}
              {isMobileSearchActive ? (
                <div className="flex items-center bg-neutral-900 border border-[#8E44AD] rounded-lg px-2 py-1 flex-1 max-w-[180px]">
                  <Search className="w-3 h-3 text-neutral-400 mr-1 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setIsMobileSearchActive(false);
                      setSearchQuery('');
                    }}
                    className="p-0.5 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsMobileSearchActive(true)}
                  aria-label="Search documents"
                  className="p-1.5 rounded-lg bg-neutral-900 border border-[#34495E]/60 text-neutral-300 hover:text-white transition"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Upload Button */}
              <button
                onClick={onOpenUploadModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#8E44AD] text-white font-semibold text-xs shadow-sm transition active:scale-95 shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Upload</span>
              </button>

              {/* Mobile Profile / Auth Button */}
              {user ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-7 h-7 rounded-lg bg-[#8E44AD] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm"
                >
                  {userInitial}
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-[#34495E]/60 text-neutral-300 hover:text-white transition shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-[#F1C40F]" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Results Overlay */}
          {isMobileSearchActive && searchQuery.trim().length > 0 && (
            <div className="bg-neutral-900 border border-[#34495E]/70 rounded-xl p-2 shadow-xl z-50">
              <div className="px-2 py-1 text-[10px] font-semibold text-[#F1C40F] uppercase tracking-wider border-b border-[#34495E]/50 mb-1">
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
                          ? 'bg-[#8E44AD]/20 text-[#a569bd] font-semibold'
                          : 'hover:bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      <span className="truncate">{mat.title}</span>
                      <span className="text-[10px] text-[#F1C40F]">{mat.subject}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-neutral-500">
                  No documents found
                </div>
              )}
            </div>
          )}

          {/* Bottom Bar: Navigation Tabs */}
          <nav className="grid grid-cols-4 gap-1 bg-neutral-900/90 p-1 rounded-xl border border-[#34495E]/60 text-xs w-full">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-neutral-800 text-white shadow-sm border border-[#34495E]/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Docs</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'notes'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'flashcards'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Quiz</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
