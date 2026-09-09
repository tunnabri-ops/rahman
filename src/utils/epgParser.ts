import * as pako from 'pako';
import { EpgProgram, Channel } from '../types';

// Parse XMLTV date format: 20240909123000 +0000
function parseXMLTVDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10));
    const min = parseInt(dateStr.substring(10, 12));
    const sec = parseInt(dateStr.substring(12, 14));
    
    let offsetMs = 0;
    const offsetMatch = dateStr.match(/([+-]\d{4})/);
    if (offsetMatch) {
      const offset = offsetMatch[1];
      const sign = offset[0] === '+' ? 1 : -1;
      const oHour = parseInt(offset.substring(1, 3));
      const oMin = parseInt(offset.substring(3, 5));
      offsetMs = sign * ((oHour * 60) + oMin) * 60 * 1000;
    }
    
    const d = new Date(Date.UTC(year, month, day, hour, min, sec));
    return new Date(d.getTime() - offsetMs);
  } catch (e) {
    return null;
  }
}

export async function fetchAndParseEPG(url: string, channels: Channel[]): Promise<Channel[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch EPG: ${response.statusText}`);

    let xmlText = '';
    const contentType = response.headers.get('content-type') || '';
    
    // Check if it's gzipped or we need to try decoding
    if (url.endsWith('.gz') || contentType.includes('gzip') || contentType.includes('application/octet-stream')) {
      const buffer = await response.arrayBuffer();
      try {
        const decompressed = pako.ungzip(new Uint8Array(buffer));
        xmlText = new TextDecoder().decode(decompressed);
      } catch (e) {
        // If it wasn't actually gzipped, fallback to text
        xmlText = new TextDecoder().decode(buffer);
      }
    } else {
      xmlText = await response.text();
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Create a map of channel tvgId/name to Channel object
    const channelMap = new Map<string, Channel>();
    channels.forEach(ch => {
      if (ch.tvgId) channelMap.set(ch.tvgId.toLowerCase(), ch);
      channelMap.set(ch.name.toLowerCase(), ch);
    });

    // Build a map of epgId -> matching channel(s)
    const epgChannelNodes = xmlDoc.querySelectorAll('channel');
    const epgIdToAppChannels = new Map<string, Channel[]>();

    epgChannelNodes.forEach(node => {
      const id = node.getAttribute('id');
      if (!id) return;
      
      const displayNames = Array.from(node.querySelectorAll('display-name')).map(n => n.textContent?.trim() || '');
      
      const matches: Channel[] = [];
      const lowerId = id.toLowerCase();
      
      if (channelMap.has(lowerId)) {
         matches.push(channelMap.get(lowerId)!);
      }
      
      displayNames.forEach(name => {
         const lowerName = name.toLowerCase();
         if (channelMap.has(lowerName) && !matches.includes(channelMap.get(lowerName)!)) {
            matches.push(channelMap.get(lowerName)!);
         }
      });
      
      epgIdToAppChannels.set(id, matches);
    });

    const programmeNodes = xmlDoc.querySelectorAll('programme');
    
    // Clear old EPG
    channels.forEach(ch => ch.epg = []);

    programmeNodes.forEach((node, idx) => {
      const channelId = node.getAttribute('channel');
      if (!channelId) return;

      const appChannels = epgIdToAppChannels.get(channelId);
      if (!appChannels || appChannels.length === 0) return;

      const startStr = node.getAttribute('start');
      const stopStr = node.getAttribute('stop');
      if (!startStr || !stopStr) return;

      const start = parseXMLTVDate(startStr);
      const end = parseXMLTVDate(stopStr);
      if (!start || !end) return;

      const title = node.querySelector('title')?.textContent || 'Unknown Program';
      const description = node.querySelector('desc')?.textContent || '';

      const program: EpgProgram = {
        id: `epg-${idx}`,
        channelId,
        title,
        description,
        start,
        end
      };

      appChannels.forEach(ch => {
        if (!ch.epg) ch.epg = [];
        ch.epg.push(program);
      });
    });

    // Sort EPGs by start time for all channels
    channels.forEach(ch => {
      if (ch.epg) {
        ch.epg.sort((a, b) => a.start.getTime() - b.start.getTime());
      }
    });

    return channels;

  } catch (error) {
    console.error("Error loading EPG:", error);
    return channels; // Return unmodified
  }
}

export function getCurrentProgram(epg?: EpgProgram[]): EpgProgram | null {
  if (!epg || epg.length === 0) return null;
  const now = new Date();
  for (let i = 0; i < epg.length; i++) {
    if (now >= epg[i].start && now <= epg[i].end) {
      return epg[i];
    }
  }
  return null;
}
