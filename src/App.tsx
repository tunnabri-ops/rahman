/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tv, Menu, X, RefreshCw, Layers, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { ChannelList } from './components/ChannelList';
import { MovieSearch } from './components/MovieSearch';
import { ClassicMovies } from './components/ClassicMovies';
import {
  PlaylistModal,
  PlaylistSource,
  REPO_M3U_URL,
  REPO_JSON_URL,
} from './components/PlaylistModal';
import { autoParsePlaylist, parseChannelsJson } from './utils/parser';

const STORAGE_SOURCE_KEY = 'nrt_streaming_source';
const STORAGE_FAVS_KEY = 'nrt_favorites';
const STORAGE_RECENT_KEY = 'nrt_recent';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Favorites & Recents State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_FAVS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [recentChannels, setRecentChannels] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [activeSource, setActiveSource] = useState<PlaylistSource>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SOURCE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.name.includes('Repo')) {
          parsed.name = parsed.name.replace(/Repo/g, 'Master');
        }
        return parsed;
      }
    } catch {
      // Ignore parse error
    }
    return {
      type: 'repo-m3u',
      name: 'Master M3U Playlist',
      url: REPO_M3U_URL,
    };
  });

  const [appMode, setAppMode] = useState<'live' | 'movies' | 'classic'>('live');

  // Security: Block Right Click & DevTools shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
      }
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Monkey-patch console to hide output from average users
    const noop = () => {};
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    console.log = noop;
    console.info = noop;
    
    // Only warn stays for critical errors handling logic internally if needed, but we can mock it too
    // We will keep warn active so React/Video player internal errors don't crash the stack silently
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      console.log = originalConsoleLog;
      console.info = originalConsoleInfo;
    };
  }, []);

  // Persist Favorites & Recents
  useEffect(() => {
    localStorage.setItem(STORAGE_FAVS_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(recentChannels));
  }, [recentChannels]);

  // Handle Channel Selection
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setIsMobileMenuOpen(false);
    
    // Add to recents (keep last 15)
    setRecentChannels(prev => {
      const newRecents = [channel.id, ...prev.filter(id => id !== channel.id)].slice(0, 15);
      return newRecents;
    });
  };

  const toggleFavorite = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  useEffect(() => {
    loadActivePlaylist(activeSource);
  }, []);

  const loadActivePlaylist = async (source: PlaylistSource) => {
    setIsLoading(true);
    setError(null);
    try {
      let targetUrl = source.url || REPO_M3U_URL;

      // Fetch playlist from cloud source or custom URL
      const response = await fetch(targetUrl);
      if (!response.ok) {
        // Fallback to json if m3u fails or vice versa
        if (targetUrl === REPO_M3U_URL) {
          targetUrl = REPO_JSON_URL;
          const fallbackRes = await fetch(targetUrl);
          if (!fallbackRes.ok) throw new Error('Failed to fetch playlist streams');
          const data = await fallbackRes.json();
          const parsed = parseChannelsJson(data);
          applyChannels(parsed, {
            type: 'repo-json',
            name: 'Master Channels (DRM)',
            url: REPO_JSON_URL,
            lastUpdated: new Date().toLocaleTimeString(),
            channelCount: parsed.length,
          });
          return;
        }
        throw new Error(`Failed to load playlist: HTTP ${response.status}`);
      }

      const text = await response.text();
      const parsedChannels = autoParsePlaylist(text);

      if (parsedChannels.length === 0) {
        throw new Error('No valid channels found in playlist.');
      }

      applyChannels(parsedChannels, {
        ...source,
        lastUpdated: new Date().toLocaleTimeString(),
        channelCount: parsedChannels.length,
      });
    } catch (err: any) {
      console.warn('Playlist load error:', err);
      setError('Could not load channels from playlist. Please verify connection or try another source.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyChannels = (newChannels: Channel[], source: PlaylistSource) => {
    setChannels(newChannels);
    setActiveSource(source);
    try {
      localStorage.setItem(STORAGE_SOURCE_KEY, JSON.stringify(source));
    } catch {
      // Ignore storage errors
    }
    if (newChannels.length > 0) {
      setActiveChannel((prev) => {
        if (!prev) {
           // Try to select first recent channel if it exists in the new list
           const lastRecentId = recentChannels[0];
           if (lastRecentId) {
             const recentMatch = newChannels.find((c) => c.id === lastRecentId);
             if (recentMatch) return recentMatch;
           }
           return newChannels[0];
        }
        const match = newChannels.find((c) => c.name === prev.name);
        return match || newChannels[0];
      });
    } else {
      setActiveChannel(null);
    }
  };

  const handleRefreshRepo = async () => {
    setIsUpdating(true);
    try {
      await loadActivePlaylist(activeSource);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060609] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="h-16 border-b border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 shrink-0 z-20 sticky top-0 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle channels menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl p-1.5 shadow-lg shadow-indigo-500/10 ring-1 ring-white/10"
            >
              <img 
                src="/logo.png" 
                alt="NRT Logo" 
                className="h-full object-contain mix-blend-multiply"
                onError={(e) => {
                  // Fallback to Tv icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-indigo-500/20', 'p-1.5');
                  e.currentTarget.parentElement?.classList.remove('bg-white/90', 'p-1.5', 'mix-blend-multiply');
                  const fallback = document.createElement('div');
                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                NRT STREAMING
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest hidden sm:inline border border-indigo-500/30">
                  Live
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Mode Switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/[0.05] shadow-inner">
            <button
              onClick={() => setAppMode('live')}
              className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                appMode === 'live' 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              Live TV
            </button>
            <button
              onClick={() => setAppMode('movies')}
              className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                appMode === 'movies' 
                  ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => setAppMode('classic')}
              className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                appMode === 'classic' 
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              Classic
            </button>
          </div>

          {/* Live Status Badge */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs text-slate-300 shadow-inner shadow-white/[0.02]"
          >
            <Signal className="w-3.5 h-3.5 text-emerald-400 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="font-semibold text-slate-200">{channels.length}</span>
            <span className="text-slate-400/80">Channels</span>
          </motion.div>

          {/* Sync / Refresh Streams */}
          <button
            onClick={handleRefreshRepo}
            disabled={isLoading || isUpdating}
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
            title="Sync and reload latest live streams"
          >
            <RefreshCw
              className={`w-4 h-4 text-indigo-400 ${
                isLoading || isUpdating ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {appMode === 'live' ? (
          <>
            {/* Sidebar Channel List (Desktop & Mobile Drawer) */}
        <aside
          className={`absolute inset-y-0 left-0 z-30 w-72 sm:w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-white/[0.05] lg:bg-transparent lg:border-none shadow-2xl lg:shadow-none">
            <ChannelList
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={handleSelectChannel}
              favorites={favorites}
              recentChannels={recentChannels}
              onToggleFavorite={toggleFavorite}
              onOpenPlaylistModal={() => {
                setIsPlaylistModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
            />
          </div>
        </aside>

        {/* Mobile Sidebar Overlay Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#060609]/80 z-20 lg:hidden backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Player & Stream View */}
        <main className="flex-1 flex flex-col overflow-y-auto w-full relative z-10">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              <p className="text-sm text-slate-400 font-medium tracking-wide animate-pulse">Loading live streams...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md backdrop-blur-md">
                <p className="mb-5 text-red-200 font-medium leading-relaxed">{error}</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => loadActivePlaylist(activeSource)}
                    className="px-5 py-2.5 bg-red-500/20 text-red-200 rounded-xl hover:bg-red-500/30 text-sm font-semibold transition-colors cursor-pointer border border-red-500/30"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          ) : activeChannel ? (
            <motion.div 
              key={activeChannel.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[1400px] mx-auto p-2 sm:p-4 lg:p-6 space-y-6"
            >
              {/* Responsive Video Player Stage */}
              <div className="w-full relative rounded-2xl overflow-hidden ring-1 ring-white/[0.05] shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
                <VideoPlayer 
                  channel={activeChannel} 
                  onPlayNextChannel={() => {
                    // Try to find the exact list of channels currently displayed to the user
                    const filteredElements = Array.from(document.querySelectorAll('[role="listbox"] button[data-channel-id]'));
                    const filteredIds = filteredElements.map(el => el.getAttribute('data-channel-id')).filter(Boolean) as string[];
                    
                    if (filteredIds.length > 0) {
                      const currentIndex = filteredIds.indexOf(activeChannel.id);
                      if (currentIndex !== -1 && currentIndex < filteredIds.length - 1) {
                        const nextId = filteredIds[currentIndex + 1];
                        const nextChannel = channels.find(c => c.id === nextId);
                        if (nextChannel) setActiveChannel(nextChannel);
                        return;
                      } else if (filteredIds.length > 0) {
                        // Loop back to start of filtered list
                        const firstChannel = channels.find(c => c.id === filteredIds[0]);
                        if (firstChannel) setActiveChannel(firstChannel);
                        return;
                      }
                    }

                    // Fallback to main channels array if DOM query fails
                    const currentIndex = channels.findIndex(c => c.id === activeChannel.id);
                    if (currentIndex !== -1 && currentIndex < channels.length - 1) {
                      setActiveChannel(channels[currentIndex + 1]);
                    } else if (channels.length > 0) {
                      setActiveChannel(channels[0]); // Loop back to start
                    }
                  }}
                />
              </div>

              {/* Now Playing Channel Card */}
              <div className="bg-white/[0.02] backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/[0.05] shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex items-start gap-5 relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black/40 rounded-xl flex items-center justify-center p-2.5 shrink-0 border border-white/[0.05] shadow-inner">
                    {activeChannel.logo ? (
                      <img
                        src={activeChannel.logo}
                        alt={activeChannel.name}
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yIDEyaDIwIi8+PC9zdmc+';
                        }}
                      />
                    ) : (
                      <Tv className="w-7 h-7 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-inset ring-red-500/20 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-[pulse_2s_ease-in-out_infinite]" />
                        LIVE
                      </span>
                      <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300 ring-1 ring-inset ring-indigo-500/20 uppercase tracking-widest shadow-[0_0_8px_rgba(99,102,241,0.1)]">
                        {activeChannel.category || 'Uncategorized'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.05]">
                        {activeChannel.streams?.length || 1} Server{(activeChannel.streams?.length || 1) > 1 ? 's' : ''}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate tracking-tight drop-shadow-sm">
                      {activeChannel.name}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
                      Now streaming on NRT
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 p-6">
              <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                <Tv className="w-8 h-8 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-300 tracking-tight">No channel selected</p>
                <p className="text-sm text-slate-500 mt-1">Choose a channel from the sidebar to start streaming</p>
              </div>
            </div>
          )}
        </main>
          </>
        ) : appMode === 'movies' ? (
          <main className="flex-1 flex flex-col overflow-hidden w-full relative z-10">
             <MovieSearch />
          </main>
        ) : (
          <main className="flex-1 flex flex-col overflow-hidden w-full relative z-10">
             <ClassicMovies />
          </main>
        )}
      </div>

      {/* Playlist Manager Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        activeSource={activeSource}
        onApplyPlaylist={(newChannels, newSource) => {
          applyChannels(newChannels, newSource);
          setIsPlaylistModalOpen(false);
        }}
        isUpdating={isUpdating}
        onRefreshRepo={handleRefreshRepo}
      />
    </div>
  );
}
