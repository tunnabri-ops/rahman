import { Channel, StreamOption } from '../types';

export function parseStreamOptions(rawUrl: string): StreamOption[] {
  if (!rawUrl) return [];

  // Split multiple streams separated by $
  const options = rawUrl
    .split('$')
    .map((s) => s.trim())
    .filter(Boolean);

  return options.map((opt, index) => {
    let name = `Server ${index + 1}`;
    let streamPart = opt;

    // Extract name if provided after last #
    const hashIndex = opt.lastIndexOf('#');
    if (hashIndex !== -1) {
      const extractedName = opt.slice(hashIndex + 1).trim();
      if (extractedName) {
        name = extractedName;
      }
      streamPart = opt.slice(0, hashIndex).trim();
    }

    // Extract configurations separated by |
    const parts = streamPart.split('|');
    const url = parts[0].trim();
    let drm: StreamOption['drm'] = undefined;
    const headers: Record<string, string> = {};

    for (let i = 1; i < parts.length; i++) {
      const p = parts[i].trim();
      if (p.startsWith('drmScheme=clearkey&drmLicense=')) {
        const licensePart = p.split('drmLicense=')[1];
        if (licensePart && licensePart.includes(':')) {
          const [keyId, key] = licensePart.split(':');
          drm = { keyId: keyId.trim(), key: key.trim() };
        }
      } else if (p.includes('=')) {
        const [k, v] = p.split('=');
        if (k && v) {
          headers[k.trim()] = v.trim();
        }
      }
    }

    return { url, name, drm, headers };
  });
}

/**
 * Parses standard and extended M3U / M3U8 playlists
 */
export function parseM3U(m3uContent: string): Channel[] {
  const lines = m3uContent.split(/\r?\n/);
  const channels: Channel[] = [];
  let currentInfo: {
    id?: string;
    name?: string;
    logo?: string;
    category?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Channel Name after comma
      const commaIdx = line.indexOf(',');
      const name = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : 'Live Channel';

      // Logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const logo = logoMatch ? logoMatch[1] : '';

      // Category / Group
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const category = groupMatch ? groupMatch[1].trim() : 'Live Event';

      // ID
      const idMatch = line.match(/tvg-id="([^"]+)"/i);
      const id = idMatch ? idMatch[1].trim() : `${channels.length + 1}`;

      currentInfo = { id, name, logo, category };
    } else if (!line.startsWith('#') && currentInfo) {
      const url = line;
      channels.push({
        id: `${channels.length + 1}-${currentInfo.name}`,
        name: currentInfo.name || 'Live Channel',
        logo: currentInfo.logo || '',
        category: currentInfo.category || 'Live Event',
        url: url,
        streams: parseStreamOptions(url),
      });
      currentInfo = null;
    }
  }

  // Fallback: If no standard #EXTINF headers were found, check for raw stream URLs (m3u8, mp4, mpd, mkv, etc.)
  if (channels.length === 0) {
    const rawLines = m3uContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    const streamLines = rawLines.filter(
      (l) => l.startsWith('http://') || l.startsWith('https://') || l.startsWith('//')
    );

    if (streamLines.length > 0) {
      streamLines.forEach((streamUrl, index) => {
        let streamName = `Stream ${index + 1}`;
        try {
          const urlObj = new URL(streamUrl.split('$')[0].split('|')[0]);
          const path = urlObj.pathname;
          const fileName = path.split('/').pop();
          if (fileName) {
            streamName = decodeURIComponent(fileName.split('.')[0] || `Stream ${index + 1}`);
          }
        } catch {
          // Ignore URL parsing error
        }

        channels.push({
          id: `direct-${index + 1}`,
          name: streamName,
          logo: '',
          category: 'Direct Streams',
          url: streamUrl,
          streams: parseStreamOptions(streamUrl),
        });
      });
    }
  }

  return channels;
}

export type StreamFormat = 'm3u8' | 'mpd' | 'mp4' | 'mkv' | 'unknown';

export function detectStreamFormat(url: string): StreamFormat {
  if (!url) return 'unknown';
  const clean = url.toLowerCase().split('?')[0].split('#')[0];
  if (clean.endsWith('.mpd') || url.includes('.mpd')) return 'mpd';
  if (clean.endsWith('.m3u8') || clean.endsWith('.m3u') || url.includes('m3u8')) return 'm3u8';
  if (clean.endsWith('.mp4') || clean.endsWith('.m4v') || clean.endsWith('.mov') || url.includes('.mp4')) return 'mp4';
  if (clean.endsWith('.mkv') || clean.endsWith('.webm') || url.includes('.mkv')) return 'mkv';
  return 'unknown';
}

/**
 * Parses channels JSON from the repository
 */
export function parseChannelsJson(data: any[]): Channel[] {
  if (!Array.isArray(data)) return [];

  return data.map((item: any, index: number) => ({
    id: item.serial?.toString() || `${index + 1}`,
    name: item.name || 'Unknown Channel',
    logo: item.logo || '',
    url: item.url || '',
    category: item.category || 'General',
    streams: parseStreamOptions(item.url || ''),
  }));
}

/**
 * Auto-detects whether raw text is M3U or JSON and parses channels
 */
export function autoParsePlaylist(text: string): Channel[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      return parseChannelsJson(Array.isArray(json) ? json : json.channels || []);
    } catch {
      // Fallback to M3U parser
    }
  }
  return parseM3U(trimmed);
}
