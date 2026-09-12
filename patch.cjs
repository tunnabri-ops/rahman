const fs = require('fs');
let content = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

content = content.replace(
  "const handleSelectRepoSource = async (type: 'repo-m3u' | 'repo-json' | 'albania-m3u' | 'global-freetv') => {",
  "const handleSelectRepoSource = async (type: 'repo-m3u' | 'repo-json' | 'albania-m3u' | 'global-freetv' | 'toffee-m3u') => {"
);

content = content.replace(
  "const targetUrl = type === 'repo-m3u' ? REPO_M3U_URL \n        : type === 'repo-json' ? REPO_JSON_URL \n        : type === 'global-freetv' ? GLOBAL_FREETV_URL\n        : ALBANIA_M3U_URL;",
  "const targetUrl = type === 'repo-m3u' ? REPO_M3U_URL \n        : type === 'repo-json' ? REPO_JSON_URL \n        : type === 'global-freetv' ? GLOBAL_FREETV_URL\n        : type === 'toffee-m3u' ? TOFFEE_M3U_URL\n        : ALBANIA_M3U_URL;"
);

content = content.replace(
  "name: type === 'repo-m3u' ? 'Cloud Master M3U' \n          : type === 'repo-json' ? 'Cloud Channels (DRM)' \n          : type === 'global-freetv' ? 'Global Free-TV (All Countries)'\n          : 'Free-TV Albania (Movies/Live)',",
  "name: type === 'repo-m3u' ? 'Cloud Master M3U' \n          : type === 'repo-json' ? 'Cloud Channels (DRM)' \n          : type === 'global-freetv' ? 'Global Free-TV (All Countries)'\n          : type === 'toffee-m3u' ? 'Toffee'\n          : 'Free-TV Albania (Movies/Live)',"
);

fs.writeFileSync('src/components/PlaylistModal.tsx', content);
