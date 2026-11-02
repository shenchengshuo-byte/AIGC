const $ = id => document.getElementById(id);
async function status() {
  const s = await chrome.runtime.sendMessage({type:'status'});
  if (!s || s.error) { $('status').textContent = s?.error || '未取得状态'; return; }
  $('progress').textContent = `已检索 ${s.index} / ${s.total} 个剧名`;
  $('status').textContent = s.status;
  $('current').textContent = s.current ? `下一项：${s.current}` : '已到队列末尾';
  const rows=s.results || [], links=new Set(rows.flatMap(x=>x.candidates||[]).map(x=>x.url));
  $('counts').textContent = `${rows.filter(x=>x.candidates?.length).length} 个剧名取得候选；${links.size} 个不同链接。候选不等于已确认。`;
}
for (const type of ['start','pause','reset']) $(type).addEventListener('click',async()=>{
  if(type==='reset' && !confirm('清除本机进度和候选链接？请先导出。')) return;
  await chrome.runtime.sendMessage({type}); await status();
});
$('export').addEventListener('click',async()=>{
  const data=await chrome.runtime.sendMessage({type:'export'}), blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='TikTok_TOP100_本机采集候选.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
});
status();setInterval(status,1500);
