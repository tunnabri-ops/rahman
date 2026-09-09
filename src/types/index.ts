export interface StreamOption {
  url: string;
  name: string;
  drm?: {
    keyId: string;
    key: string;
  };
  headers?: Record<string, string>;
}

export interface EpgProgram {
  id: string;
  channelId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
}

export interface Channel {
  id: string; // we'll use serial or name as id
  tvgId?: string; // tvg-id for EPG matching
  name: string;
  logo: string;
  url: string; // The raw url string
  category: string;
  streams?: StreamOption[]; // Parsed stream options
  epg?: EpgProgram[]; // EPG data for this channel
}
