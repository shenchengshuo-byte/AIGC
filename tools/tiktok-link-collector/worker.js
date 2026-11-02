const load = async () => (await chrome.storage.local.get('state')).state || {running: false, index: 0, results: [], emptyStreak: 0, status: '尚未开始'};
const save = state => chrome.storage.local.set({state});
let DATA;
async function data() { return DATA || (DATA = await (await fetch(chrome.runtime.getURL('rank_data.json'))).json()); }
async function openCurrent() {
  const state = await load(), d = await data();
  if (!state.running) return;
  if (state.index >= d.tasks.length) {state.running = false; state.status = '检索任务结束；请导出并核验候选链接'; await save(state); return;}
  const url = d.tasks[state.index].searchUrl;
  if (state.tabId) {
    try {await chrome.tabs.update(state.tabId, {url}); return;} catch (_) {}
  }
  const tab = await chrome.tabs.create({url, active: true});
  state.tabId = tab.id; await save(state);
}
chrome.alarms.onAlarm.addListener(alarm => {if (alarm.name === 'next-search') openCurrent();});
chrome.tabs.onRemoved.addListener(async id => {const s = await load(); if (s.tabId === id) {s.running = false;s.tabId = null;s.status = '采集标签页已关闭；可点击继续';await save(s);}});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const d = await data(), s = await load();
    if (msg.type === 'job') return s.running && sender.tab?.id === s.tabId ? d.tasks[s.index] : null;
    if (msg.type === 'status') return {...s, total: d.tasks.length, current: d.tasks[s.index]?.query || '', records: d.records};
    if (msg.type === 'start') {s.running = true;s.emptyStreak = 0;s.status = '运行中；只采集正常页面可见链接';await save(s);await openCurrent();return true;}
    if (msg.type === 'pause') {s.running = false;s.status = '已暂停';await chrome.alarms.clear('next-search');await save(s);return true;}
    if (msg.type === 'reset') {if(s.running) return false;await save({running:false,index:0,results:[],emptyStreak:0,status:'已重置'});return true;}
    if (msg.type === 'export') return {format:'tiktok-top100-visible-links-v1', warning:'所有结果都是正常搜索页候选；不代表已确认作品或已看全集', records:d.records, results:s.results};
    if (msg.type === 'result') {
      if (!s.running || sender.tab?.id !== s.tabId || msg.query !== d.tasks[s.index]?.query) return false;
      s.results = s.results.filter(x => x.query !== msg.query);
      s.results.push({query:msg.query,ranks:d.tasks[s.index].ranks,listedAccounts:d.tasks[s.index].listedAccounts,searchUrl:msg.searchUrl,candidates:msg.candidates,blocked:msg.blocked,collectedAt:msg.collectedAt});
      s.index++;s.emptyStreak = msg.candidates.length ? 0 : s.emptyStreak+1;
      if (msg.blocked.includes('验证') || s.emptyStreak >= 2) {s.running=false;s.status='访问或加载受阻，已暂停。请在TikTok页面检查后再继续。';}
      else if(s.index >= d.tasks.length) {s.running=false;s.status='89个剧名检索已结束；请导出，仍须核验对应关系';}
      else s.status='等待下一项；可随时暂停';
      await save(s);
      if(s.running) await chrome.alarms.create('next-search',{when:Date.now()+30000});
      return true;
    }
    return null;
  })().then(sendResponse).catch(e => sendResponse({error:String(e)}));
  return true;
});
