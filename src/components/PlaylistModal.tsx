import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  X,
  Radio,
  UploadCloud,
  FileText,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { Channel } from '../types';
import { autoParsePlaylist } from '../utils/parser';

export interface PlaylistSource {
  type: 'repo-m3u' | 'repo-json' | 'custom-url' | 'uploaded-file' | 'albania-m3u';
  name: string;
  url?: string;
  lastUpdated?: string;
  channelCount?: number;
}

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSource: PlaylistSource;
  onApplyPlaylist: (channels: Channel[], source: PlaylistSource) => void;
  isUpdating: boolean;
  onRefreshRepo: () => Promise<void>;
}

export const REPO_M3U_URL =
  'https://raw.githubusercontent.com/abukayuum/NINJA-TV/main/playlist.m3u';
export const REPO_JSON_URL =
  'https://raw.githubusercontent.com/abukayuum/NINJA-TV/main/channels.json';
export const ALBANIA_M3U_URL =
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_albania.m3u8';

export function PlaylistModal({
  isOpen,
  onClose,
  activeSource,
  onApplyPlaylist,
  isUpdating,
  onRefreshRepo,
}: PlaylistModalProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectRepoSource = async (type: 'repo-m3u' | 'repo-json' | 'albania-m3u') => {
    setModalError(null);
    setSuccessMessage(null);
    setIsLoadingUrl(true);
    try {
      const targetUrl = type === 'repo-m3u' ? REPO_M3U_URL : type === 'repo-json' ? REPO_JSON_URL : ALBANIA_M3U_URL;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const text = await res.text();
      const parsed = autoParsePlaylist(text);
      if (parsed.length === 0) throw new Error('No valid channels found in playlist.');

      const newSource: PlaylistSource = {
        type,
        name: type === 'repo-m3u' ? 'Cloud Master M3U' : type === 'repo-json' ? 'Cloud Channels (DRM)' : 'Free-TV Albania (Movies/Live)',
        url: targetUrl,
        lastUpdated: new Date().toLocaleTimeString(),
        channelCount: parsed.length,
      };

      onApplyPlaylist(parsed, newSource);
      setSuccessMessage(`Updated successfully! Loaded ${parsed.length} channels.`);
    } catch (err: any) {
      setModalError(`Failed to load playlist: ${err.message || err}`);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleLoadCustomUrl = async () => {
    if (!customUrl.trim()) return;
    setModalError(null);
    setSuccessMessage(null);
    setIsLoadingUrl(true);
    try {
      const res = await fetch(customUrl.trim());
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const text = await res.text();
      const parsed = autoParsePlaylist(text);
      if (parsed.length === 0) throw new Error('No channels detected in this URL.');

      const newSource: PlaylistSource = {
        type: 'custom-url',
        name: 'Custom URL Playlist',
        url: customUrl.trim(),
        lastUpdated: new Date().toLocaleTimeString(),
        channelCount: parsed.length,
      };

      onApplyPlaylist(parsed, newSource);
      setSuccessMessage(`Loaded ${parsed.length} channels from custom URL.`);
    } catch (err: any) {
      setModalError(`Failed to load URL: ${err.message || 'Check network / CORS policy.'}`);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const processFile = (file: File) => {
    setModalError(null);
    setSuccessMessage(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) throw new Error('File is empty');
        const parsed = autoParsePlaylist(content);
        if (parsed.length === 0) throw new Error('No valid channels parsed from uploaded file.');

        const newSource: PlaylistSource = {
          type: 'uploaded-file',
          name: file.name,
          lastUpdated: new Date().toLocaleTimeString(),
          channelCount: parsed.length,
        };

        onApplyPlaylist(parsed, newSource);
        setSuccessMessage(`File "${file.name}" uploaded! Loaded ${parsed.length} channels.`);
      } catch (err: any) {
        setModalError(`Error reading file: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setModalError('Failed to read file.');
    };

    reader.readAsText(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Playlist Manager</h2>
              <p className="text-xs text-slate-400">
                Sync live cloud streams or upload custom M3U/JSON playlist
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Status Box */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Active Source
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">{activeSource.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeSource.channelCount || 0} channels loaded • Last updated: {activeSource.lastUpdated || 'Initial load'}
              </p>
            </div>
            <button
              onClick={onRefreshRepo}
              disabled={isUpdating || isLoadingUrl}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              Sync Streams Now
            </button>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {modalError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Section 1: Official Cloud Stream Playlist Sources */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              Primary Live Cloud Streams
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Master M3U Playlist */}
              <button
                onClick={() => handleSelectRepoSource('repo-m3u')}
                disabled={isLoadingUrl}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  activeSource.type === 'repo-m3u'
                    ? 'bg-indigo-600/15 border-indigo-500/60 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Live Playlist (M3U)
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                      M3U8
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Loads live IPTV channels directly from the master cloud playlist.
                  </p>
                </div>
                <div className="mt-3 text-xs text-indigo-400 font-medium flex items-center gap-1">
                  {activeSource.type === 'repo-m3u' ? '✓ Currently Active' : 'Switch & Sync →'}
                </div>
              </button>

              {/* Option 2: Master Channels JSON */}
              <button
                onClick={() => handleSelectRepoSource('repo-json')}
                disabled={isLoadingUrl}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  activeSource.type === 'repo-json'
                    ? 'bg-indigo-600/15 border-indigo-500/60 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-400" />
                      DRM Channels (JSON)
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                      ClearKey DRM
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Loads full channel dataset including ClearKey DRM & multi-server stream configs.
                  </p>
                </div>
                <div className="mt-3 text-xs text-indigo-400 font-medium flex items-center gap-1">
                  {activeSource.type === 'repo-json' ? '✓ Currently Active' : 'Switch & Sync →'}
                </div>
              </button>

              {/* Option 3: Albania M3U Playlist */}
              <button
                onClick={() => handleSelectRepoSource('albania-m3u')}
                disabled={isLoadingUrl}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  activeSource.type === 'albania-m3u'
                    ? 'bg-indigo-600/15 border-indigo-500/60 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Free-TV Albania
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                      M3U8
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Loads Albanian IPTV channels & movies from Free-TV master repo.
                  </p>
                </div>
                <div className="mt-3 text-xs text-indigo-400 font-medium flex items-center gap-1">
                  {activeSource.type === 'albania-m3u' ? '✓ Currently Active' : 'Switch & Sync →'}
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Upload M3U / JSON File */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
              Upload Local Playlist File
            </h4>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8,.json,.mpd,.mp4,.mkv,text/plain"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Click to browse or drag and drop your playlist or stream file here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports .m3u, .m3u8, .json, .mpd, .mp4, and .mkv streams
              </p>
            </div>
          </div>

          {/* Section 3: Custom Playlist URL */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Load From Custom URL / Stream Link
            </h4>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/stream.m3u8, .mp4, .mpd, or .mkv"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleLoadCustomUrl}
                disabled={!customUrl.trim() || isLoadingUrl}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
              >
                {isLoadingUrl ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
