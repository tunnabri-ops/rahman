import { Channel } from '../types';

export const channels: Channel[] = [
  {
    id: 'redbull',
    name: 'Red Bull TV',
    logo: 'https://i.imgur.com/uRovvRk.png',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    category: 'Sports',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Bloomberg_Television.svg/200px-Bloomberg_Television.svg.png',
    url: 'https://live.bloomberg.com/w/bloomberg_us.m3u8',
    category: 'News',
  },
  {
    id: 'nasa',
    name: 'NASA TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    category: 'Science',
  },
  {
    id: 'cbn',
    name: 'CBN News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/CBN_News_logo.png/200px-CBN_News_logo.png',
    url: 'https://cbnnews.akamaized.net/hls/live/2026859/cbnnews/master.m3u8',
    category: 'News',
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera English',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Aljazeera_eng.svg/200px-Aljazeera_eng.svg.png',
    url: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8',
    category: 'News',
  },
  {
    id: 'dw',
    name: 'DW English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Deutsche_Welle_logo_2012.svg/200px-Deutsche_Welle_logo_2012.svg.png',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    category: 'News',
  },
  {
    id: 'sky-news',
    name: 'Sky News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sky_News_logo.svg/200px-Sky_News_logo.svg.png',
    url: 'https://skynews-eu.rakuten.wurl.tv/playlist.m3u8',
    category: 'News',
  },
  {
    id: 'cgtn',
    name: 'CGTN',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/CGTN_logo.svg/200px-CGTN_logo.svg.png',
    url: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8',
    category: 'News',
  }
];
