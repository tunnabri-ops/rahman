import { useState, useMemo } from 'react';
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
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-500" />
            Channels
          </h2>
          <div className="flex items-center gap-2">
            {onOpenPlaylistModal && (
              <button
                onClick={onOpenPlaylistModal}
                className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 rounded-md transition-colors font-medium cursor-pointer"
                title="Manage Playlist and Uploads"
              >
                Playlist
              </button>
            )}
            <span className="text-xs bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-full border border-slate-700">
              {filteredChannels.length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs for All / Favs / Recents */}
        <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" /> All
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'favorites' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'text-rose-400 fill-rose-400/20' : ''}`} /> Favs
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'recent' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Recent
          </button>
        </div>

        {/* Category Horizontal Scroll Chips (Only if All or Favs are selected) */}
        {activeTab !== 'recent' && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
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
      <div className="p-2 flex-1 overflow-y-auto scrollbar-none space-y-1">
        {filteredChannels.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
            {activeTab === 'favorites' ? (
              <><Heart className="w-8 h-8 text-slate-700" /> No favorite channels yet.</>
            ) : activeTab === 'recent' ? (
              <><Clock className="w-8 h-8 text-slate-700" /> No recent history.</>
            ) : (
              <><Search className="w-8 h-8 text-slate-700" /> No channels found.</>
            )}
          </div>
        ) : (
          filteredChannels.map((channel, i) => {
            const isActive = activeChannel?.id === channel.id;
            const isFav = favorites.includes(channel.id);
            return (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.5) }}
                key={`${channel.id}-${activeTab}`} // key changing ensures animation re-runs on tab switch
                onClick={() => onSelectChannel(channel)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden border border-white/5 relative">
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
                    <Play className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{channel.name}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {channel.category}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onToggleFavorite && (
                    <div 
                      onClick={(e) => onToggleFavorite(channel.id, e)}
                      className={`p-1.5 rounded-md transition-colors hover:bg-black/20 ${isActive ? 'text-white hover:text-rose-200' : 'text-slate-500 hover:text-rose-400'} ${isFav && !isActive ? 'text-rose-500' : ''}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </div>
                  )}
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse ml-1" />
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
