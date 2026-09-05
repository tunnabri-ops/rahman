import { useEffect, useRef, useState } from 'react';
import shaka from 'shaka-player';
import Hls from 'hls.js';
import { AlertCircle, RefreshCw, Server, AlertTriangle } from 'lucide-react';
import { Channel } from '../types';

interface VideoPlayerProps {
  channel: Channel;
  key?: string | number;
}

export function VideoPlayer({ channel }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedStreamIdx, setSelectedStreamIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const streams = channel.streams || [];
  const currentStream = streams[selectedStreamIdx] || null;

  // Check if current site is https but stream is http (browser mixed content block)
  const isMixedContent =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    Boolean(currentStream?.url?.startsWith('http://'));

  useEffect(() => {
    let isCancelled = false;
    let shakaPlayer: any = null;
    let hlsPlayer: Hls | null = null;
    const video = videoRef.current;

    setIsLoading(true);
    setPlaybackError(null);

    if (!video || !currentStream || !currentStream.url) {
      setIsLoading(false);
      return;
    }

    // Determine if stream needs Shaka Player (DASH .mpd or ClearKey DRM)
    const isMpd = currentStream.url.includes('.mpd');
    const hasDrm = Boolean(currentStream.drm?.keyId && currentStream.drm?.key);
    const useShaka = isMpd || hasDrm;

    async function setupShaka() {
      try {
        if (shaka.polyfill) {
          shaka.polyfill.installAll();
        }

        if (!shaka.Player.isBrowserSupported()) {
          if (!isCancelled) {
            setPlaybackError('Your browser does not support DRM/DASH playback.');
            setIsLoading(false);
          }
          return;
        }

        shakaPlayer = new shaka.Player(video);

        // Listen for internal errors
        shakaPlayer.addEventListener('error', (event: any) => {
          if (isCancelled) return;
          const err = event?.detail;
          // Ignore benign abort/interrupt codes
          if (err?.code === 7000 || err?.code === 7001 || err?.code === 7002) {
            return;
          }
          if (err?.severity === 2) {
            setIsLoading(false);
            setPlaybackError('Playback error on this stream. Please switch to another server.');
          }
        });

        // Configure ClearKey DRM
        if (hasDrm && currentStream?.drm) {
          shakaPlayer.configure({
            drm: {
              clearKeys: {
                [currentStream.drm.keyId]: currentStream.drm.key,
              },
            },
          });
        }

        // Filter out browser forbidden request headers
        if (currentStream?.headers && Object.keys(currentStream.headers).length > 0) {
          const forbidden = new Set([
            'user-agent',
            'referer',
            'cookie',
            'host',
            'origin',
            'connection',
            'keep-alive',
          ]);
          shakaPlayer.getNetworkingEngine()?.registerRequestFilter((type: any, request: any) => {
            for (const [key, value] of Object.entries(currentStream.headers || {})) {
              if (!forbidden.has(key.toLowerCase())) {
                request.headers[key] = value;
              }
            }
          });
        }

        await shakaPlayer.load(currentStream.url);

        if (!isCancelled) {
          setIsLoading(false);
          video.play().catch(() => {
            // Autoplay may wait for user interaction
          });
        }
      } catch (err: any) {
        if (isCancelled) return;
        setIsLoading(false);
        // Ignore expected interruption / cancellation errors during unmount or stream switch
        if (err?.code === 7000 || err?.code === 7001 || err?.code === 7002) {
          return;
        }
        setPlaybackError('Stream failed to load on this server. Please try another server or channel.');
      }
    }

    function setupHls() {
      if (Hls.isSupported()) {
        hlsPlayer = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsPlayer.loadSource(currentStream.url);
        hlsPlayer.attachMedia(video);

        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isCancelled) {
            setIsLoading(false);
            video.play().catch(() => {});
          }
        });

        hlsPlayer.on(Hls.Events.ERROR, (_event, data) => {
          if (isCancelled) return;
          if (data.fatal) {
            setIsLoading(false);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setPlaybackError('Network connection failed. Please try another server.');
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hlsPlayer?.recoverMediaError();
                break;
              default:
                setPlaybackError('Unable to play this stream. Please try another server.');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS playback
        video.src = currentStream.url;
        const onLoaded = () => {
          if (!isCancelled) {
            setIsLoading(false);
            video.play().catch(() => {});
          }
        };
        const onError = () => {
          if (!isCancelled) {
            setIsLoading(false);
            setPlaybackError('Unable to load stream on Safari.');
          }
        };

        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onError);

        return () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
        };
      } else {
        video.src = currentStream.url;
        setIsLoading(false);
      }
    }

    if (useShaka) {
      setupShaka();
    } else {
      setupHls();
    }

    return () => {
      isCancelled = true;
      if (shakaPlayer) {
        shakaPlayer.destroy().catch(() => {});
        shakaPlayer = null;
      }
      if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
      }
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [currentStream, retryCount]);

  const handleNextServer = () => {
    if (streams.length > 1) {
      setSelectedStreamIdx((prev) => (prev + 1) % streams.length);
    }
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  if (streams.length === 0) {
    return (
      <div className="relative w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden border border-slate-800 shadow-2xl">
        <p className="text-slate-400">No playable streams available for this channel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Stage */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
        <video
          ref={videoRef}
          controls
          playsInline
          className="w-full h-full object-contain"
        />

        {/* Loading Overlay */}
        {isLoading && !playbackError && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 pointer-events-none">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-sm font-medium text-slate-300">
              Connecting to {currentStream?.name || 'stream'}...
            </span>
          </div>
        )}

        {/* Playback Error Overlay */}
        {playbackError && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Playback Failed</h3>
            <p className="text-sm text-slate-400 max-w-md mb-4">{playbackError}</p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {streams.length > 1 && (
                <button
                  onClick={handleNextServer}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Server className="w-4 h-4" />
                  Try Next Server ({streams[(selectedStreamIdx + 1) % streams.length]?.name || 'Next'})
                </button>
              )}
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mixed Content Notice if HTTP stream on HTTPS website */}
      {isMixedContent && (
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong>Mixed Content Notice:</strong> This server uses unencrypted HTTP. Modern browsers block HTTP streams inside HTTPS pages. If this server doesn't play, please select another server from the list below.
          </div>
        </div>
      )}

      {/* Server Switching Selector */}
      {streams.length > 1 && (
        <div className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              Available Servers ({streams.length})
            </span>
            <span>Select a server if the current one is offline</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {streams.map((stream, idx) => {
              const isSelected = selectedStreamIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedStreamIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{stream.name || `Server ${idx + 1}`}</span>
                  {stream.drm && (
                    <span className="text-[10px] bg-slate-950/40 px-1.5 py-0.5 rounded text-indigo-200">
                      DRM
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
