(() => {
  if (globalThis.__top100CollectorActive) return;
  globalThis.__top100CollectorActive = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function collect(query) {
    const found = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      const item = LinkTools.canonical(a.href);
      if (!item) continue;
      let node = a, caption = a.innerText || a.getAttribute('aria-label') || '';
      for (let i = 0; i < 6 && node.parentElement; i++) {
        node = node.parentElement;
        const urls = new Set([...node.querySelectorAll('a[href]')].map(x => LinkTools.canonical(x.href)?.url).filter(Boolean));
        if (urls.size > 1) break;
        const text = (node.innerText || '').trim();
        if (text && text.length < 2000) caption = text;
      }
      const row = {...item, caption: caption.slice(0, 1200), status: LinkTools.match(query, caption)};
      const prior = found.get(row.url);
      if (!prior || row.caption.length > prior.caption.length) found.set(row.url, row);
    }
    return [...found.values()];
  }
  async function run() {
    let job;
    for (let i = 0; i < 6; i++) {
      job = await chrome.runtime.sendMessage({type: 'job'}).catch(() => null);
      if (job) break;
      await sleep(1000);
    }
    if (!job) return;
    if (new URL(location.href).searchParams.get('q') !== job.query) return;
    await sleep(6500);
    const all = new Map();
    let blocked = '';
    for (let i = 0; i < 4; i++) {
      const body = document.body?.innerText || '';
      if (/verify to continue|complete the puzzle|unusual traffic|访问过于频繁|完成验证/i.test(body)) { blocked = '页面要求验证；采集已暂停，不自动处理验证'; break; }
      for (const row of collect(job.query)) all.set(row.url, row);
      if (i < 3) { window.scrollBy(0, Math.round(innerHeight * .8)); await sleep(1500); }
    }
    const candidates = [...all.values()];
    if (!candidates.length && !blocked) blocked = /log in to (watch|continue|search)|登录后/i.test(document.body?.innerText || '') ? '页面要求登录后访问，未取得链接' : '没有取得可见视频链接，需检查页面或等待加载';
    await chrome.runtime.sendMessage({type: 'result', query: job.query, searchUrl: location.href, candidates, blocked, collectedAt: new Date().toISOString()});
  }
  run().catch(() => {});
})();
