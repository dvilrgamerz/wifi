'use strict';
(() => {
  const q=(s,r=document)=>r.querySelector(s),clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const num=el=>{const n=parseFloat(String(el?.textContent||'').replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:NaN};
  let installPrompt=null,classicReady=false;

  function inject(){
    const brand=q('.brand');if(brand&&!q('.v2-brand-badge',brand))brand.insertAdjacentHTML('beforeend','<span class="v2-brand-badge">V2</span>');
    const eyebrow=q('.hero .eyebrow');if(eyebrow)eyebrow.textContent='WIFI PULSE V2 · NETWORK PERFORMANCE LAB';
    const classic=q('#classicPanel');if(classic&&!q('#v2ClassicInsights'))classic.insertAdjacentHTML('beforeend',`<section class="v2-insights" id="v2ClassicInsights" hidden aria-live="polite"><div class="v2-score-card"><div class="v2-score-ring"><strong id="v2Score">—</strong><span>/100</span></div><div><p class="kicker">V2 CONNECTION SCORE</p><h3><span id="v2Grade">—</span> <small id="v2GradeText">Run a test to calculate</small></h3><p id="v2ScoreSummary">WiFi Pulse V2 combines latency, jitter, download and upload into one easy score.</p></div></div><div class="v2-readiness-grid"><article><span>🎮 Gaming</span><b id="v2GamingReady">—</b><small id="v2GamingDetail">Waiting for test</small></article><article><span>📺 4K streaming</span><b id="v2StreamReady">—</b><small id="v2StreamDetail">Waiting for test</small></article><article><span>🎥 Video calls</span><b id="v2CallsReady">—</b><small id="v2CallsDetail">Waiting for test</small></article><article><span>📡 Stability</span><b id="v2Stability">—</b><small id="v2StabilityDetail">Waiting for test</small></article></div><div class="v2-actions"><button class="v2-action-btn" id="v2CopyResult" type="button">COPY RESULT</button><button class="v2-action-btn secondary" id="v2InstallApp" type="button" hidden>INSTALL APP</button></div></section>`);
    const modes=q('#modeGrid');if(modes&&!q('#v2NetworkProfile'))modes.insertAdjacentHTML('afterend',`<section class="v2-network-profile" id="v2NetworkProfile"><div><span>Connection</span><b id="v2ConnectionType">Detecting…</b></div><div><span>Browser RTT</span><b id="v2BrowserRtt">—</b></div><div><span>Estimated link</span><b id="v2BrowserDownlink">—</b></div><div><span>Data saver</span><b id="v2SaveData">—</b></div></section>`);
    const live=q('#gamePanel .live-card');if(live&&!q('#v2GameHealth'))live.insertAdjacentHTML('beforeend',`<div class="v2-game-health" id="v2GameHealth"><div class="v2-game-health-head"><span>V2 LIVE HEALTH</span><b id="v2GameHealthScore">100</b></div><div class="v2-health-track"><i id="v2GameHealthFill"></i></div><div class="v2-game-health-meta"><span>Threat <b id="v2Threat">CALM</b></span><span>Best <b id="v2BestRun">0:00</b></span></div></div>`);
    const foot=q('footer span:first-child');if(foot)foot.textContent='WiFi Pulse V2';
  }

  function profile(){
    const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    if(!c){q('#v2ConnectionType').textContent='Browser unavailable';return}
    q('#v2ConnectionType').textContent=String(c.effectiveType||c.type||'Online').toUpperCase();
    q('#v2BrowserRtt').textContent=Number.isFinite(c.rtt)?`${c.rtt} ms`:'—';
    q('#v2BrowserDownlink').textContent=Number.isFinite(c.downlink)?`${c.downlink} Mbps`:'—';
    q('#v2SaveData').textContent=c.saveData?'ON':'OFF';
  }

  function score(p,j,d,u){
    const ps=p<=20?100:clamp(112-(p-20)*.82,10,100),js=j<=4?100:clamp(108-(j-4)*3.2,5,100);
    const ds=clamp(Math.log10(Math.max(1,d))/Math.log10(500)*100,5,100),us=clamp(Math.log10(Math.max(1,u))/Math.log10(100)*100,5,100);
    return Math.round(ps*.34+js*.24+ds*.27+us*.15);
  }
  function grade(s){if(s>=95)return['A+','Exceptional'];if(s>=90)return['A','Excellent'];if(s>=82)return['B+','Very good'];if(s>=74)return['B','Good'];if(s>=64)return['C','Average'];if(s>=50)return['D','Needs improvement'];return['F','Poor']}
  function ready(ok,mid){return ok?['READY','Strong for this use']:mid?['OK','Should work, but may vary']:['LIMITED','May struggle']}
  function setReady(a,b,v){q(a).textContent=v[0];q(b).textContent=v[1]}

  function evaluate(){
    const p=num(q('#pingValue')),j=num(q('#jitterValue')),d=num(q('#downValue')),u=num(q('#upValue'));if(![p,j,d,u].every(Number.isFinite))return;
    const s=score(p,j,d,u),[g,label]=grade(s);q('#v2ClassicInsights').hidden=false;q('#v2Score').textContent=s;q('#v2Grade').textContent=g;q('#v2GradeText').textContent=label;
    q('#v2ScoreSummary').textContent=s>=90?'Your connection is fast and responsive with strong all-around performance.':s>=75?'Your connection is strong for everyday use, streaming and most online gaming.':s>=60?'Your connection is usable, but latency or throughput may limit demanding tasks.':'Your connection shows noticeable performance limits. Try another location or Ethernet.';
    setReady('#v2GamingReady','#v2GamingDetail',ready(p<45&&j<12&&d>=10&&u>=3,p<90&&j<25&&d>=5));
    setReady('#v2StreamReady','#v2StreamDetail',ready(d>=35,d>=15));
    setReady('#v2CallsReady','#v2CallsDetail',ready(p<100&&j<25&&d>=5&&u>=3,p<160&&d>=2&&u>=1));
    setReady('#v2Stability','#v2StabilityDetail',ready(j<8,j<20));
    try{localStorage.setItem('wifiPulseV2LastClassic',JSON.stringify({score:s,grade:g,ping:p,jitter:j,down:d,up:u,at:Date.now()}))}catch(_){}classicReady=true;
  }

  async function copyResult(){
    if(!classicReady)evaluate();const p=num(q('#pingValue')),j=num(q('#jitterValue')),d=num(q('#downValue')),u=num(q('#upValue'));if(![p,j,d,u].every(Number.isFinite))return;
    const text=`WiFi Pulse V2 — Score ${q('#v2Score').textContent}/100 (${q('#v2Grade').textContent}) | Ping ${p} ms | Jitter ${j} ms | Download ${d} Mbps | Upload ${u} Mbps`;
    try{await navigator.clipboard.writeText(text);const b=q('#v2CopyResult'),old=b.textContent;b.textContent='COPIED ✓';setTimeout(()=>b.textContent=old,1400)}catch(_){window.prompt('Copy your result:',text)}
  }

  function parseTime(t){const m=String(t||'').match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0}
  function fmtTime(s){return`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`}
  function gameHealth(){
    const p=num(q('#gamePing')),j=num(q('#gameJitter')),l=num(q('#gameLoss')),t=parseTime(q('#gameTime')?.textContent);let h=100;
    if(Number.isFinite(p))h-=clamp((p-22)*.48,0,42);if(Number.isFinite(j))h-=clamp(j*1.05,0,25);if(Number.isFinite(l))h-=clamp(l*4,0,28);h=Math.round(clamp(h,0,100));
    if(q('#v2GameHealthScore'))q('#v2GameHealthScore').textContent=h;if(q('#v2GameHealthFill'))q('#v2GameHealthFill').style.width=`${h}%`;
    if(q('#v2Threat'))q('#v2Threat').textContent=t>=180?'EXTREME':t>=120?'SEVERE':t>=60?'HIGH':t>=30?'RISING':'CALM';
  }
  function bestFromSummary(){const text=q('#gamingSummary')?.textContent||'',m=text.match(/Survived\s+(\d+):(\d{2})/i);if(!m)return;const secs=Number(m[1])*60+Number(m[2]);let best=0;try{best=Number(localStorage.getItem('wifiPulseV2BestSurvival')||0)}catch(_){}if(secs>best){best=secs;try{localStorage.setItem('wifiPulseV2BestSurvival',String(best))}catch(_){}}q('#v2BestRun').textContent=fmtTime(best)}
  function restore(){try{const s=JSON.parse(localStorage.getItem('wifiPulseV2LastClassic')||'null');if(s){q('#v2ClassicInsights').hidden=false;q('#v2Score').textContent=s.score;q('#v2Grade').textContent=s.grade;q('#v2GradeText').textContent='Last saved result';q('#v2ScoreSummary').textContent=`Previous test: ${s.down.toFixed(1)} Mbps down, ${s.up.toFixed(1)} Mbps up, ${Math.round(s.ping)} ms ping.`}const best=Number(localStorage.getItem('wifiPulseV2BestSurvival')||0);q('#v2BestRun').textContent=fmtTime(best)}catch(_){}}

  function bind(){
    const progress=q('#progressPercent');if(progress)new MutationObserver(()=>{if(progress.textContent.trim()==='100%')setTimeout(evaluate,50)}).observe(progress,{childList:true,characterData:true,subtree:true});
    const time=q('#gameTime');if(time)new MutationObserver(gameHealth).observe(time,{childList:true,characterData:true,subtree:true});
    const summary=q('#gamingSummary');if(summary)new MutationObserver(()=>{bestFromSummary();gameHealth()}).observe(summary,{childList:true,characterData:true,subtree:true});
    q('#v2CopyResult')?.addEventListener('click',copyResult);q('#v2InstallApp')?.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice.catch(()=>null);installPrompt=null;q('#v2InstallApp').hidden=true});
  }
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=q('#v2InstallApp');if(b)b.hidden=false});
  addEventListener('appinstalled',()=>{installPrompt=null;const b=q('#v2InstallApp');if(b)b.hidden=true});
  document.addEventListener('DOMContentLoaded',()=>{inject();profile();restore();bind();const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;c?.addEventListener?.('change',profile);setInterval(gameHealth,1000)});
})();
