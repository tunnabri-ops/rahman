export interface StreamOption {
  url: string;
  name: string;
  drm?: {
    keyId: string;
    key: string;
  };
  headers?: Record<string, string>;
}

export interface Channel {
  id: string; // we'll use serial or name as id
  name: string;
  logo: string;
  url: string; // The raw url string
  category: string;
  streams?: StreamOption[]; // Parsed stream options
}
