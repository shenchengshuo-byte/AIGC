(() => {
  const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  function canonical(raw) {
    try {
      const u = new URL(raw, 'https://www.tiktok.com');
      if (u.protocol !== 'https:' || u.hostname !== 'www.tiktok.com') return null;
      const video = u.pathname.match(/^\/@([a-zA-Z0-9_.]+)\/video\/(\d{10,22})\/?$/);
      if (video) return {url: `https://www.tiktok.com/@${video[1]}/video/${video[2]}`, handle: video[1], videoId: video[2], kind: '视频候选'};
      const episode = u.pathname.match(/^\/shortdrama\/episode\/(\d{10,22})\/(\d+)\/?$/);
      if (episode) return {url: `https://www.tiktok.com/shortdrama/episode/${episode[1]}/${episode[2]}`, seriesId: episode[1], episode: Number(episode[2]), kind: '剧集页候选'};
    } catch (_) {}
    return null;
  }
  function match(query, caption) {
    const q = normalize(query), c = normalize(caption);
    if (q && c.includes(q)) return '页面文字含完整剧名；仍待核实';
    const words = q.split(' ').filter(x => x.length > 2);
    const found = words.filter(x => c.split(' ').includes(x)).length;
    return words.length && found / words.length >= .8 ? '标题词匹配候选；仍待核实' : '搜索结果候选；归属未确认';
  }
  globalThis.LinkTools = {normalize, canonical, match};
})();
