import React, { useState, useMemo } from 'react';
import { Play, Search, Radio, X, Heart, Clock, ListVideo } from 'lucide-react';
import { motion } from 'motion/react';
import { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  favorites?: string[];
  recentChannels?: string[];
  onToggleFavorite?: (channelId: string, e: React.MouseEvent) => void;
  onOpenPlaylistModal?: () => void;
}

type TabType = 'all' | 'favorites' | 'recent';

export function ChannelList({
  channels,
  activeChannel,
  onSelectChannel,
  favorites = [],
  recentChannels = [],
  onToggleFavorite,
  onOpenPlaylistModal,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((c) => {
      const cat = (c.category || '').trim();
      if (cat) set.add(cat);
    });
    return ['All', ...Array.from(set)];
  }, [channels]);

  // Filter channels based on tab, search, and category
  const filteredChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // First, filter by tab
    let tabFiltered = channels;
    if (activeTab === 'favorites') {
      tabFiltered = channels.filter(c => favorites.includes(c.id));
    } else if (activeTab === 'recent') {
      // Sort recents by order in recentChannels array
      tabFiltered = recentChannels
        .map(id => channels.find(c => c.id === id))
        .filter((c): c is Channel => c !== undefined);
    }

    return tabFiltered.filter((channel) => {
      const name = (channel.name || '').toLowerCase();
      const cat = (channel.category || '').toLowerCase();
      const matchesSearch = !query || name.includes(query) || cat.includes(query);

      const matchesCategory =
        selectedCategory === 'All' || (channel.category || '').trim() === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [channels, searchQuery, selectedCategory, activeTab, favorites, recentChannels]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-white/[0.05] shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            Channels
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-white/[0.05] text-slate-300 font-medium px-2.5 py-1 rounded-full border border-white/[0.05]">
              {filteredChannels.length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.05] rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner shadow-black/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs for All / Favs / Recents */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/[0.05]">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" /> All
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'favorites' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'text-rose-400 fill-rose-400/20' : ''}`} /> Favs
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'recent' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Recent
          </button>
        </div>

        {/* Category Horizontal Scroll Chips (Only if All or Favs are selected) */}
        {activeTab !== 'recent' && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-none text-xs">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)] font-semibold'
                      : 'bg-white/[0.03] text-slate-400 border-transparent hover:bg-white/[0.08] hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Channel Items List */}
      <div className="p-3 flex-1 overflow-y-auto scrollbar-none space-y-1.5" role="listbox">
        {filteredChannels.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center">
              {activeTab === 'favorites' ? (
                <Heart className="w-5 h-5 text-slate-600" />
              ) : activeTab === 'recent' ? (
                <Clock className="w-5 h-5 text-slate-600" />
              ) : (
                <Search className="w-5 h-5 text-slate-600" />
              )}
            </div>
            <p>
              {activeTab === 'favorites' ? 'No favorite channels yet.'
                : activeTab === 'recent' ? 'No recent history.'
                : 'No channels found.'}
            </p>
          </div>
        ) : (
          filteredChannels.map((channel, i) => {
            const isActive = activeChannel?.id === channel.id;
            const isFav = favorites.includes(channel.id);
            return (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                key={`${channel.id}-${activeTab}`} // key changing ensures animation re-runs on tab switch
                onClick={() => onSelectChannel(channel)}
                data-channel-id={channel.id}
                role="option"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer group border ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'bg-transparent text-slate-300 border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center p-1.5 shrink-0 overflow-hidden border border-white/[0.05] relative shadow-inner">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yIDEyaDIwIi8+PC9zdmc+';
                      }}
                    />
                  ) : (
                    <Play className="w-4 h-4 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm truncate transition-colors ${isActive ? 'text-indigo-100' : 'text-slate-200 group-hover:text-white'}`}>{channel.name}</div>
                  <div
                    className={`text-[11px] font-medium truncate transition-colors mt-0.5 ${
                      isActive ? 'text-indigo-300/80' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {channel.category || 'Uncategorized'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onToggleFavorite && (
                    <div 
                      onClick={(e) => onToggleFavorite(channel.id, e)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-black/40 ${isActive ? 'text-white hover:text-rose-300' : 'text-slate-500 hover:text-rose-400'} ${isFav && !isActive ? 'text-rose-500' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </div>
                  )}
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 animate-pulse ml-1 drop-shadow-[0_0_5px_rgba(129,140,248,1)]" />
                  )}
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
