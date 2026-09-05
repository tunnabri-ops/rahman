/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Tv, Menu, X, Github } from 'lucide-react';
import { channels } from './data/channels';
import { Channel } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { ChannelList } from './components/ChannelList';

export default function App() {
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 lg:px-6 shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Live IPTV
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="#" 
            className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            <Github className="w-5 h-5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar for Desktop / Overlay for Mobile */}
        <aside
          className={`absolute inset-y-0 left-0 z-10 w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <ChannelList
            channels={channels}
            activeChannel={activeChannel}
            onSelectChannel={(channel) => {
              setActiveChannel(channel);
              setIsMobileMenuOpen(false);
            }}
          />
        </aside>

        {/* Mobile Sidebar Overlay Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-0 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto w-full">
          <div className="w-full max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
            {/* Player Container */}
            <div className="w-full relative group">
              <VideoPlayer url={activeChannel.url} />
            </div>

            {/* Now Playing Info */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-xl flex items-center justify-center p-2 shrink-0 border border-slate-800">
                  {activeChannel.logo ? (
                     <img
                       src={activeChannel.logo}
                       alt={activeChannel.name}
                       className="max-w-full max-h-full object-contain"
                     />
                  ) : (
                    <Tv className="w-8 h-8 text-slate-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                      LIVE
                    </span>
                    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20 uppercase tracking-wider">
                      {activeChannel.category}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white truncate tracking-tight">
                    {activeChannel.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                    You are watching the live broadcast of {activeChannel.name}. 
                    Stream resolution and quality will automatically adjust based on your network connection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

