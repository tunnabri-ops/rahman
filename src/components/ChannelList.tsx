import { Play } from 'lucide-react';
import { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export function ChannelList({ channels, activeChannel, onSelectChannel }: ChannelListProps) {
  // Group channels by category
  const categories = Array.from(new Set(channels.map((c) => c.category)));

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 overflow-y-auto">
      <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-500" />
          Live Channels
        </h2>
      </div>

      <div className="p-2 flex-1">
        {categories.map((category) => (
          <div key={category} className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {category}
            </h3>
            <div className="space-y-1">
              {channels
                .filter((c) => c.category === category)
                .map((channel) => {
                  const isActive = activeChannel?.id === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left group ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center p-1 shrink-0">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yIDEyaDIwIi8+PC9zdmc+'; // Fallback icon
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-700 rounded" />
                        )}
                      </div>
                      <span className="font-medium truncate">{channel.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
