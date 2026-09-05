/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Tv, Menu, X, RefreshCw, Layers, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { ChannelList } from './components/ChannelList';
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
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/95 backdrop-blur flex items-center justify-between px-3 sm:px-6 shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle channels menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-600/30"
            >
              <Tv className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-white flex items-center gap-2">
                NRT STREAMING
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline">
                  Live
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Status Badge */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300"
          >
            <Signal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-200">{channels.length}</span>
            <span className="text-slate-400">Channels</span>
          </motion.div>

          {/* Playlist Manager Button */}
          <button
            onClick={() => setIsPlaylistModalOpen(true)}
            className="text-xs sm:text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Manage and update playlist sources"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Playlist</span>
            <span className="text-[11px] bg-slate-800 text-indigo-300 px-1.5 py-0.2 rounded font-mono hidden md:inline">
              {activeSource.type === 'repo-m3u'
                ? 'M3U'
                : activeSource.type === 'repo-json'
                ? 'JSON'
                : 'Custom'}
            </span>
          </button>

          {/* Sync / Refresh Streams */}
          <button
            onClick={handleRefreshRepo}
            disabled={isLoading || isUpdating}
            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
        {/* Sidebar Channel List (Desktop & Mobile Drawer) */}
        <aside
          className={`absolute inset-y-0 left-0 z-30 w-72 sm:w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
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
        </aside>

        {/* Mobile Sidebar Overlay Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Player & Stream View */}
        <main className="flex-1 flex flex-col overflow-y-auto scrollbar-none w-full">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-400">Loading playlist streams...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <p className="mb-4 max-w-md">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => loadActivePlaylist(activeSource)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium transition cursor-pointer"
                >
                  Retry Load
                </button>
                <button
                  onClick={() => setIsPlaylistModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 text-sm font-medium transition cursor-pointer"
                >
                  Change Playlist Source
                </button>
              </div>
            </div>
          ) : activeChannel ? (
            <motion.div 
              key={activeChannel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-6xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5"
            >
              {/* Responsive Video Player */}
              <div className="w-full relative">
                <VideoPlayer channel={activeChannel} />
              </div>

              {/* Now Playing Channel Card */}
              <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 rounded-xl flex items-center justify-center p-2 shrink-0 border border-slate-800">
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
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                        LIVE
                      </span>
                      <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20 uppercase tracking-wider">
                        {activeChannel.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {activeChannel.streams?.length || 1} Server
                        {(activeChannel.streams?.length || 1) > 1 ? 's' : ''} available
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white truncate tracking-tight">
                      {activeChannel.name}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Now streaming live on NRT STREAMING
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 p-6">
              <Tv className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-base font-medium text-slate-400">No channel selected</p>
              <p className="text-xs text-slate-500">Choose a channel from the left sidebar to start streaming</p>
            </div>
          )}
        </main>
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
