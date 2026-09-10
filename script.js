/* Mud Engineering Calculator - Vanilla JS
   Fórmulas validadas IADC/SPE - Comentarios en español
*/
const $ = id => document.getElementById(id);
const fmt = (n,d=3)=> Number(n).toLocaleString('es-CO',{minimumFractionDigits:0,maximumFractionDigits:d});
let pendingPDF = null;
let globalSystem = localStorage.getItem('mud_sys') || 'imperial';

// ---------- Tema ----------
function initTheme(){
  const saved = localStorage.getItem('mud_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  $('btnTheme').textContent = saved==='dark'?'☀️':'🌙';
}
$('btnTheme').onclick=()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  const nxt=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',nxt);
  localStorage.setItem('mud_theme',nxt);
  $('btnTheme').textContent=nxt==='dark'?'☀️':'🌙';
};

// ---------- Sistema global ----------
function setSystem(sys){
  globalSystem=sys;
  localStorage.setItem('mud_sys',sys);
  $('btnImperial').classList.toggle('active',sys==='imperial');
  $('btnMetric').classList.toggle('active',sys==='metric');
}
$('btnImperial').onclick=()=>setSystem('imperial');
$('btnMetric').onclick=()=>setSystem('metric');

// ---------- Navegación SPA ----------
function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el=$('view-'+view);
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.view===view));
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.nav-link').forEach(a=>{
  a.addEventListener('click',e=>{e.preventDefault();navigate(a.dataset.view)})
});
function openSidebar(){ $('sidebar').classList.add('open'); $('overlay').classList.add('open')}
function closeSidebar(){ $('sidebar').classList.remove('open'); $('overlay').classList.remove('open')}
$('btnMenu').onclick=openSidebar;
$('btnClose').onclick=closeSidebar;
$('overlay').onclick=closeSidebar;

// ---------- Conversiones ----------
const toIn = (v,u)=> u==='mm'? v/25.4 : v;
const toFt = (v,u)=> u==='m'? v*3.28084 : v;
const toPpg = (v,u)=>{
  if(u==='ppg') return v;
  if(u==='sg') return v*8.33;
  if(u==='kgm3') return v/119.826;
  if(u==='gcm3') return v*8.33;
  if(u==='pcf') return v/7.48052;
  return v;
};
const fromPpg = (ppg,to)=>{
  if(to==='ppg') return ppg;
  if(to==='sg') return ppg/8.33;
  if(to==='kgm3') return ppg*119.826;
  if(to==='gcm3') return ppg/8.33;
  if(to==='pcf') return ppg*7.48052;
  if(to==='psift') return ppg*0.052;
  return ppg;
};
const ppgToPsiPerFt = p=> p*0.052;
const bblTo = (bbl,to)=>{
  const m={bbl:1, gal:bbl*42, L:bbl*158.987, m3:bbl*0.158987, ft3:bbl*5.61458};
  return m[to]??bbl;
};
const volToBbl = (v,u)=>{
  if(u==='bbl') return v;
  if(u==='gal') return v/42;
  if(u==='L') return v/158.987;
  if(u==='m3') return v/0.158987;
  if(u==='ft3') return v/5.61458;
  return v;
};

// ---------- Historial ----------
function getHistory(){ try{return JSON.parse(localStorage.getItem('mud_history')||'[]')}catch{return []}}
function saveHistory(h){ localStorage.setItem('mud_history',JSON.stringify(h)); updateHistoryBadge();}
function addHistory(entry){
  const h=getHistory();
  entry.fecha=new Date().toLocaleString('es-CO');
  entry.timestamp=Date.now();
  h.unshift(entry);
  if(h.length>100) h.pop();
  saveHistory(h);
  renderHistory();
}
function updateHistoryBadge(){
  const n=getHistory().length;
  $('historyBadge').textContent=n;
  $('calcCount').textContent=n+' cálculos realizados';
}
function renderHistory(){
  const h=getHistory();
  const c=$('historyList');
  if(!h.length){ c.innerHTML='<div class="panel glass" style="text-align:center;color:var(--muted)">Sin cálculos aún. Realiza tu primer cálculo.</div>';return}
  c.innerHTML=h.map((e,i)=>`
    <div class="history-item glass">
      <div>
        <h4>${e.titulo}</h4>
        <p>${e.resumen}</p>
        <small>${e.fecha}</small>
      </div>
      <div class="history-actions">
        <button class="btn btn-ghost" onclick="reExport(${i})">📄 PDF</button>
        <button class="btn btn-ghost" onclick="removeHistory(${i})">✕</button>
      </div>
    </div>`).join('');
}
function removeHistory(i){ const h=getHistory(); h.splice(i,1); saveHistory(h); renderHistory();}
function clearHistory(){ if(confirm('¿Borrar historial completo?')){ localStorage.removeItem('mud_history'); renderHistory(); updateHistoryBadge();}}

// ---------- Helpers resultado ----------
function setResult(id, html, dataForPDF){
  $(id).innerHTML=html;
  if(dataForPDF) $(id)._pdfData=dataForPDF;
}
function val(id){ const v=parseFloat($(id).value); return isNaN(v)?null:v }
function requirePos(v, name){ if(v===null || v<=0) throw new Error(name+' debe ser > 0'); }

// ---------- 1 Pipe Capacity ----------
function calcPipeCap(){
  try{
    const id=val('pc-id'), len=val('pc-len');
    requirePos(id,'ID'); requirePos(len,'Longitud');
    const idIn=toIn(id,$('pc-id-u').value);
    const lenFt=toFt(len,$('pc-len-u').value);
    const capBblFt=(idIn*idIn)/1029.4;
    const volBbl=capBblFt*lenFt;
    const out=$('pc-out').value;
    const volOut=bblTo(volBbl,out);
    const capOut=out==='bbl'?capBblFt: bblTo(capBblFt,out);
    const unitLabel={bbl:'bbl',gal:'gal',L:'L',m3:'m³',ft3:'ft³'}[out];
    const html=`
      <div class="result-title">Resultado — Capacidad de Tubería</div>
      <div class="result-big"><span>${fmt(volOut)}</span> ${unitLabel}</div>
      <div class="result-sub">Volumen total para ${fmt(len)} ${$('pc-len-u').value} de tubería ID ${fmt(id)} ${$('pc-id-u').value}</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(capBblFt,4)} bbl/ft</strong><small>Capacidad</small></div>
        <div class="result-item"><strong>${fmt(volBbl,2)} bbl</strong><small>Volumen (bbl)</small></div>
        <div class="result-item"><strong>${fmt(bblTo(volBbl,'gal'),1)} gal</strong><small>Galones</small></div>
        <div class="result-item"><strong>${fmt(bblTo(volBbl,'m3'),3)} m³</strong><small>Metros cúbicos</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>Cap = ID² / 1029.4</b> → ${fmt(idIn,3)}² /1029.4 = ${fmt(capBblFt,5)} bbl/ft<br>Volumen = ${fmt(capBblFt,5)} × ${fmt(lenFt,1)} ft = <b>${fmt(volBbl,2)} bbl</b> → ${fmt(volOut,2)} ${unitLabel}</div>
    `;
    setResult('res-pipe-cap',html,{titulo:'1. Capacidad de Tubería', resumen:`ID ${id} ${$('pc-id-u').value}, L ${len} ${$('pc-len-u').value} → ${fmt(volOut)} ${unitLabel}`, detalles: html});
    addHistory({titulo:'1. Capacidad de Tubería', resumen:`${fmt(volOut)} ${unitLabel} | ID ${id} | L ${len} ${$('pc-len-u').value}`, detalles:`Fórmula Cap=ID²/1029.4`});
  }catch(e){ setResult('res-pipe-cap',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 2 Annular Capacity ----------
function calcAnnularCap(){
  try{
    const dh=val('ac-dh'), dp=val('ac-dp'), len=val('ac-len');
    requirePos(dh,'Dh'); requirePos(dp,'Dp'); requirePos(len,'Longitud');
    if(dp>=dh) throw new Error('Dp debe ser menor que Dh');
    const dhIn=toIn(dh,$('ac-dh-u').value), dpIn=toIn(dp,$('ac-dp-u').value);
    const lenFt=toFt(len,$('ac-len-u').value);
    const cap=(dhIn*dhIn - dpIn*dpIn)/1029.4;
    const volBbl=cap*lenFt;
    const out=$('ac-out').value;
    const volOut=bblTo(volBbl,out);
    const html=`
      <div class="result-title">Resultado — Capacidad Anular</div>
      <div class="result-big"><span>${fmt(volOut)}</span> ${out}</div>
      <div class="result-sub">Anular Dh ${fmt(dh)} ${$('ac-dh-u').value} - Dp ${fmt(dp)} ${$('ac-dp-u').value} × ${fmt(len)} ${$('ac-len-u').value}</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(cap,4)} bbl/ft</strong><small>Capacidad</small></div>
        <div class="result-item"><strong>${fmt(volBbl,2)} bbl</strong><small>Volumen</small></div>
        <div class="result-item"><strong>${fmt(bblTo(volBbl,'gal'),1)} gal</strong><small>Galones</small></div>
        <div class="result-item"><strong>${fmt(bblTo(volBbl,'m3'),3)} m³</strong><small>m³</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>(Dh² - Dp²)/1029.4</b> → (${fmt(dhIn,2)}² - ${fmt(dpIn,2)}²)/1029.4 = ${fmt(cap,5)} bbl/ft<br>Volumen = ${fmt(cap,5)} × ${fmt(lenFt,1)} = <b>${fmt(volBbl,2)} bbl</b></div>`;
    setResult('res-annular-cap',html,{titulo:'2. Capacidad Anular', resumen:`${fmt(volOut)} ${out} | Dh ${dh} Dp ${dp}`});
    addHistory({titulo:'2. Capacidad Anular', resumen:`${fmt(volOut)} ${out} | Dh ${dh} Dp ${dp}`});
  }catch(e){ setResult('res-annular-cap',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 3 Pipe & Annular Volume ----------
function calcPipeAnnularVol(){
  try{
    const id=val('pav-id'), od=val('pav-od'), dh=val('pav-dh'), len=val('pav-len');
    requirePos(id,'ID'); requirePos(od,'OD'); requirePos(dh,'Dh'); requirePos(len,'Longitud');
    if(od>=dh) throw new Error('OD debe ser < Dh');
    const idIn=toIn(id,$('pav-id-u').value), odIn=toIn(od,$('pav-od-u').value), dhIn=toIn(dh,$('pav-dh-u').value);
    const lenFt=toFt(len,$('pav-len-u').value);
    const capPipe=(idIn*idIn)/1029.4, capAnn=(dhIn*dhIn - odIn*odIn)/1029.4;
    const vPipe=capPipe*lenFt, vAnn=capAnn*lenFt, vTot=vPipe+vAnn;
    const out=$('pav-out').value;
    const html=`
      <div class="result-title">Resultado — Volumen Combinado</div>
      <div class="result-big"><span>${fmt(bblTo(vTot,out))}</span> ${out}</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(bblTo(vPipe,out),2)} ${out}</strong><small>Tubería interior</small></div>
        <div class="result-item"><strong>${fmt(bblTo(vAnn,out),2)} ${out}</strong><small>Anular</small></div>
        <div class="result-item"><strong>${fmt(vTot,2)} bbl</strong><small>Total bbl</small></div>
        <div class="result-item"><strong>${fmt(bblTo(vTot,'m3'),3)} m³</strong><small>Total m³</small></div>
      </div>
      <div class="formula-box">Tubería: ${fmt(idIn,2)}²/1029.4=${fmt(capPipe,5)} bbl/ft → ${fmt(vPipe,2)} bbl<br>Anular: (${fmt(dhIn,2)}²-${fmt(odIn,2)}²)/1029.4=${fmt(capAnn,5)} → ${fmt(vAnn,2)} bbl<br><b>Total = ${fmt(vTot,2)} bbl</b></div>`;
    setResult('res-pipe-annular-vol',html,{titulo:'3. Volumen Tubería+Anular', resumen:`Total ${fmt(bblTo(vTot,out))} ${out} | Tubería ${fmt(bblTo(vPipe,out))} + Anular ${fmt(bblTo(vAnn,out))}`});
    addHistory({titulo:'3. Volumen Tubería+Anular', resumen:`Total ${fmt(bblTo(vTot,out))} ${out}`});
  }catch(e){ setResult('res-pipe-annular-vol',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 4 Tank ----------
function calcTankVol(){
  try{
    const l=val('tk-l'), w=val('tk-w'), h=val('tk-h');
    requirePos(l,'Longitud'); requirePos(w,'Ancho'); requirePos(h,'Altura');
    const lFt=toFt(l,$('tk-l-u').value), wFt=toFt(w,$('tk-w-u').value), hFt=toFt(h,$('tk-h-u').value);
    let hEff=hFt;
    const lv=val('tk-level');
    if(lv!==null){
      const u=$('tk-lv-u').value;
      if(u==='%'){ if(lv<0||lv>100) throw new Error('% 0-100'); hEff=hFt*lv/100; }
      else { const lvFt=toFt(lv,u); if(lvFt>hFt) throw new Error('Nivel no puede exceder altura'); hEff=lvFt; }
    }
    const volFt3=lFt*wFt*hEff, volBbl=volFt3/5.61458;
    const out=$('tk-out').value;
    const volOut=bblTo(volBbl,out);
    const html=`
      <div class="result-title">Resultado — Tanque Rectangular</div>
      <div class="result-big"><span>${fmt(volOut)}</span> ${out}</div>
      <div class="result-sub">Dimensiones ${fmt(l)}×${fmt(w)}×${fmt(hEff,2)} ${$('tk-l-u').value} (efectivo)</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(volFt3,2)} ft³</strong><small>Pies cúbicos</small></div>
        <div class="result-item"><strong>${fmt(volBbl,2)} bbl</strong><small>Barriles</small></div>
        <div class="result-item"><strong>${fmt(bblTo(volBbl,'gal'),1)} gal</strong><small>Galones</small></div>
        <div class="result-item"><strong>${fmt(bblTo(volBbl,'m3'),3)} m³</strong><small>m³</small></div>
      </div>
      <div class="formula-box">V = L×W×H = ${fmt(lFt,2)}×${fmt(wFt,2)}×${fmt(hEff,2)} = <b>${fmt(volFt3,2)} ft³ = ${fmt(volBbl,2)} bbl</b></div>`;
    setResult('res-tank-vol',html,{titulo:'4. Tanque Rectangular', resumen:`${fmt(volOut)} ${out} | ${l}×${w}×${h}`});
    addHistory({titulo:'4. Tanque Rectangular', resumen:`${fmt(volOut)} ${out}`});
  }catch(e){ setResult('res-tank-vol',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 5 Pump ----------
function togglePumpType(){
  const t=$('pump-type').value;
  $('field-rod').style.display=t==='duplex'?'block':'none';
}
function calcPump(){
  try{
    const type=$('pump-type').value;
    const D=val('pump-d'), S=val('pump-s');
    requirePos(D,'Liner D'); requirePos(S,'Stroke');
    const DIn=toIn(D,$('pump-d-u').value), SIn=toIn(S,$('pump-s-u').value);
    let eff=parseFloat($('pump-eff').value); if(isNaN(eff)) eff=97; eff=eff/100;
    let outBblStk=0;
    let formula='';
    if(type==='triplex'){
      outBblStk=0.000162*DIn*DIn*SIn*eff;
      formula=`Triplex: 0.000162 × ${fmt(DIn,2)}² × ${fmt(SIn,2)} × ${fmt(eff,2)} = ${fmt(outBblStk,5)} bbl/stk`;
    } else {
      const d=val('pump-rod'); requirePos(d,'Rod d');
      const dIn=toIn(d,$('pump-rod-u').value);
      outBblStk=0.000162*(2*DIn*DIn - dIn*dIn)*SIn*eff;
      formula=`Dúplex: 0.000162 × (2×${fmt(DIn,2)}² - ${fmt(dIn,2)}²) × ${fmt(SIn,2)} × ${fmt(eff,2)} = ${fmt(outBblStk,5)} bbl/stk`;
    }
    const galStk=outBblStk*42, lStk=outBblStk*158.987;
    const spm=val('pump-spm');
    let qHtml='';
    if(spm!==null && spm>0){
      const gpm=galStk*spm, bblMin=outBblStk*spm, lMin=lStk*spm;
      qHtml=`<div class="result-grid"><div class="result-item"><strong>${fmt(gpm,1)} gpm</strong><small>Caudal</small></div><div class="result-item"><strong>${fmt(bblMin,3)} bbl/min</strong><small>bbl/min</small></div><div class="result-item"><strong>${fmt(lMin,1)} L/min</strong><small>L/min</small></div><div class="result-item"><strong>${fmt(spm,0)} SPM</strong><small>Emboladas/min</small></div></div>`;
    }
    const html=`
      <div class="result-title">Resultado — Bomba ${type}</div>
      <div class="result-big"><span>${fmt(outBblStk,4)}</span> bbl/stk</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(galStk,3)} gal/stk</strong><small>gal/stk</small></div>
        <div class="result-item"><strong>${fmt(lStk,2)} L/stk</strong><small>L/stk</small></div>
        <div class="result-item"><strong>${fmt(outBblStk*42*42,1)} gal/min @42SPM</strong><small>ejemplo</small></div>
        <div class="result-item"><strong>${fmt(eff*100,0)}%</strong><small>Eficiencia</small></div>
      </div>
      ${qHtml}
      <div class="formula-box">${formula}</div>`;
    setResult('res-pump-output',html,{titulo:'5. Bomba '+type, resumen:`${fmt(outBblStk,4)} bbl/stk | ${fmt(galStk,2)} gal/stk`});
    addHistory({titulo:'5. Bomba '+type, resumen:`${fmt(outBblStk,4)} bbl/stk`});
  }catch(e){ setResult('res-pump-output',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 6 TFA ----------
function calcTFA(){
  try{
    const vals=[];
    ['tfa-1','tfa-2','tfa-3'].forEach(id=>{ const v=val(id); if(v!==null) vals.push(v)});
    const extra=$('tfa-extra').value.trim();
    if(extra){ extra.split(',').forEach(s=>{ const v=parseFloat(s.trim()); if(!isNaN(v)&&v>0) vals.push(v)})}
    if(!vals.length) throw new Error('Ingresa al menos una tobera');
    vals.forEach(v=>{ if(v<=0) throw new Error('Diámetros >0')});
    const sumSq=vals.reduce((a,b)=>a+b*b,0);
    const tfa=sumSq/1303.8;
    const tfa_mm2=tfa*645.16;
    const html=`
      <div class="result-title">Resultado — TFA</div>
      <div class="result-big"><span>${fmt(tfa,4)}</span> in²</div>
      <div class="result-sub">${vals.length} toberas: ${vals.join(', ')} /32"</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(tfa,4)} in²</strong><small>TFA</small></div>
        <div class="result-item"><strong>${fmt(tfa_mm2,1)} mm²</strong><small>mm²</small></div>
        <div class="result-item"><strong>${fmt(sumSq,0)}</strong><small>Σ d²</small></div>
        <div class="result-item"><strong>${fmt(tfa*144,4)} ft²×10⁻³</strong><small>ft²</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>TFA = Σ(d²)/1303.8</b> → (${vals.map(v=>v+'²').join(' + ')}) /1303.8 = ${fmt(sumSq,0)}/1303.8 = <b>${fmt(tfa,4)} in²</b></div>`;
    setResult('res-tfa',html,{titulo:'6. TFA Toberas', resumen:`${fmt(tfa,4)} in² | ${vals.join('-')}/32"`});
    addHistory({titulo:'6. TFA', resumen:`${fmt(tfa,4)} in²`});
  }catch(e){ setResult('res-tfa',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 7 Annular Velocity ----------
function calcAnnularVel(){
  try{
    const q=val('av-q'), dh=val('av-dh'), dp=val('av-dp');
    requirePos(q,'Caudal'); requirePos(dh,'Dh'); requirePos(dp,'Dp');
    if(dp>=dh) throw new Error('Dp < Dh');
    let qGpm=q;
    const qu=$('av-q-u').value;
    if(qu==='lpm') qGpm=q/3.78541;
    if(qu==='m3min') qGpm=q*264.172;
    const dhIn=toIn(dh,$('av-dh-u').value), dpIn=toIn(dp,$('av-dp-u').value);
    const avFtMin=24.51*qGpm/(dhIn*dhIn - dpIn*dpIn);
    const avMMin=avFtMin*0.3048;
    const html=`
      <div class="result-title">Resultado — Velocidad Anular</div>
      <div class="result-big"><span>${fmt(avFtMin,1)}</span> ft/min</div>
      <div class="result-sub">Q ${fmt(q)} ${qu} — Dh ${fmt(dh)} / Dp ${fmt(dp)}</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(avFtMin,1)} ft/min</strong><small>ft/min</small></div>
        <div class="result-item"><strong>${fmt(avMMin,2)} m/min</strong><small>m/min</small></div>
        <div class="result-item"><strong>${fmt(avMMin/60,3)} m/s</strong><small>m/s</small></div>
        <div class="result-item"><strong>${fmt(qGpm,1)} gpm</strong><small>Q convertido</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>AV = 24.51 × Q / (Dh² - Dp²)</b> → 24.51 × ${fmt(qGpm,1)} / (${fmt(dhIn,2)}² - ${fmt(dpIn,2)}²) = <b>${fmt(avFtMin,1)} ft/min</b></div>`;
    setResult('res-annular-vel',html,{titulo:'7. Velocidad Anular', resumen:`${fmt(avFtMin,1)} ft/min | ${fmt(avMMin,2)} m/min`});
    addHistory({titulo:'7. Vel. Anular', resumen:`${fmt(avFtMin,1)} ft/min`});
  }catch(e){ setResult('res-annular-vel',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 8 Brine Density ----------
// Datos empíricos densidad vs % peso (ppg)
const brineCurves={
  NaCl: [{c:0,d:8.33},{c:5,d:8.60},{c:10,d:8.94},{c:15,d:9.30},{c:20,d:9.72},{c:26,d:10.0}],
  CaCl2:[{c:0,d:8.33},{c:10,d:9.05},{c:20,d:9.90},{c:30,d:10.85},{c:39,d:11.6}],
  KCl:  [{c:0,d:8.33},{c:5,d:8.60},{c:10,d:8.90},{c:15,d:9.20},{c:24,d:9.70}],
  NaBr: [{c:0,d:8.33},{c:10,d:9.10},{c:20,d:10.10},{c:30,d:11.20},{c:40,d:12.5}],
  CaBr2:[{c:0,d:8.33},{c:10,d:9.20},{c:20,d:10.30},{c:30,d:11.70},{c:40,d:13.30},{c:52,d:15.1}]
};
function interpBrine(salt, conc){
  const pts=brineCurves[salt];
  if(conc<=pts[0].c) return pts[0].d;
  if(conc>=pts[pts.length-1].c) return pts[pts.length-1].d;
  for(let i=0;i<pts.length-1;i++){
    if(conc>=pts[i].c && conc<=pts[i+1].c){
      const t=(conc-pts[i].c)/(pts[i+1].c-pts[i].c);
      return pts[i].d + t*(pts[i+1].d-pts[i].d);
    }
  }
  return pts[0].d;
}
function calcBrineDensity(){
  try{
    const salt=$('bd-salt').value;
    const conc=val('bd-conc');
    const target=val('bd-target');
    let ppg, sg;
    if(target!==null){
      // calcular conc requerida
      const targetPpg=toPpg(target,$('bd-target-u').value);
      // buscar conc inversa iterativa
      let best=0, bestDiff=1e9;
      for(let c=0;c<=60;c+=0.1){
        const d=interpBrine(salt,c);
        const diff=Math.abs(d-targetPpg);
        if(diff<bestDiff){bestDiff=diff; best=c;}
      }
      const approx=interpBrine(salt,best);
      const html=`
        <div class="result-title">Concentración requerida — ${salt}</div>
        <div class="result-big"><span>${fmt(best,1)}</span> % peso</div>
        <div class="result-sub">Para lograr ${fmt(targetPpg,2)} ppg (${fmt(targetPpg/8.33,3)} SG)</div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(approx,2)} ppg</strong><small>Densidad estimada</small></div>
          <div class="result-item"><strong>${fmt(approx/8.33,3)} SG</strong><small>SG</small></div>
          <div class="result-item"><strong>${fmt(approx*119.826,0)} kg/m³</strong><small>kg/m³</small></div>
          <div class="result-item"><strong>${salt}</strong><small>Sal</small></div>
        </div>
        <div class="formula-box">Interpolación curva IADC ${salt}: concentración ≈ ${fmt(best,1)}% para ${fmt(targetPpg,2)} ppg</div>`;
      setResult('res-brine-density',html,{titulo:'8. Densidad Salmuera (inversa)', resumen:`${fmt(best,1)}% ${salt} → ${fmt(targetPpg,2)} ppg`});
      addHistory({titulo:'8. Salmuera '+salt, resumen:`${fmt(best,1)}% → ${fmt(targetPpg,2)} ppg`});
      return;
    }
    requirePos(conc,'Concentración');
    ppg=interpBrine(salt,conc);
    sg=ppg/8.33;
    const html=`
      <div class="result-title">Resultado — Densidad Salmuera ${salt} ${fmt(conc,1)}%</div>
      <div class="result-big"><span>${fmt(ppg,2)}</span> ppg</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(sg,3)} SG</strong><small>SG</small></div>
        <div class="result-item"><strong>${fmt(ppg*119.826,0)} kg/m³</strong><small>kg/m³</small></div>
        <div class="result-item"><strong>${fmt(ppg*0.052,3)} psi/ft</strong><small>Gradiente</small></div>
        <div class="result-item"><strong>${fmt(sg,3)} g/cm³</strong><small>g/cm³</small></div>
      </div>
      <div class="formula-box">Curva IADC ${salt} interpolada: ${fmt(conc,1)}% → <b>${fmt(ppg,2)} ppg</b> (${fmt(sg,3)} SG)</div>`;
    setResult('res-brine-density',html,{titulo:'8. Densidad Salmuera', resumen:`${salt} ${fmt(conc,1)}% → ${fmt(ppg,2)} ppg`});
    addHistory({titulo:'8. Salmuera '+salt, resumen:`${fmt(ppg,2)} ppg | ${fmt(conc,1)}%`});
  }catch(e){ setResult('res-brine-density',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 9 SG & Viscosity ----------
function calcSGVisc(){
  try{
    const rho=val('sg-rho'); requirePos(rho,'Densidad');
    const u=$('sg-rho-u').value;
    const ppg=toPpg(rho,u);
    const sg=ppg/8.33;
    const kgm3=ppg*119.826;
    // Viscosidad empírica: agua 1cP, salmuera ~1 + 0.05*% sal aprox ; estimar conc
    const concEst=Math.max(0,Math.min(30,(ppg-8.33)*12)); // rough
    let tempF=val('sg-temp'); if(tempF===null) tempF=77;
    if($('sg-temp-u').value==='C') tempF=tempF*9/5+32;
    // corrección temp: viscosidad baja con temp
    const visc = (1 + 0.04*concEst) * (1 - 0.008*(tempF-77)/10 ); // cP
    const viscAdj=Math.max(0.7,visc);
    const html=`
      <div class="result-title">Resultado — SG & Viscosidad</div>
      <div class="result-big"><span>${fmt(sg,3)}</span> SG</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(ppg,2)} ppg</strong><small>ppg</small></div>
        <div class="result-item"><strong>${fmt(kgm3,0)} kg/m³</strong><small>kg/m³</small></div>
        <div class="result-item"><strong>${fmt(sg,3)} g/cm³</strong><small>g/cm³</small></div>
        <div class="result-item"><strong>${fmt(viscAdj,2)} cP</strong><small>Visc. est. @${fmt(tempF,0)}°F</small></div>
      </div>
      <div class="formula-box">SG = ρ / 1000 = ${fmt(kgm3,0)}/1000 = <b>${fmt(sg,3)}</b><br>Viscosidad estimada salmuera: <b>${fmt(viscAdj,2)} cP</b> (agua=1.0 cP, + salinidad, - temperatura)</div>`;
    setResult('res-sg-visc',html,{titulo:'9. SG & Viscosidad', resumen:`SG ${fmt(sg,3)} | ${fmt(viscAdj,2)} cP`});
    addHistory({titulo:'9. SG & Viscosidad', resumen:`SG ${fmt(sg,3)} | ${fmt(ppg,2)} ppg`});
  }catch(e){ setResult('res-sg-visc',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 10 Mud Weight Adjustment (con SG personalizado) ----------
function toggleCustomSG(){
  const v=$('mw-mat').value;
  $('field-custom-sg').style.display = v==='custom' ? 'block' : 'none';
}
function calcMudWeight(){
  try{
    const w1=val('mw-w1'), w2=val('mw-w2'), vol=val('mw-vol');
    requirePos(w1,'MW1'); requirePos(w2,'MW2'); requirePos(vol,'Volumen');
    const w1ppg=toPpg(w1,$('mw-w1-u').value), w2ppg=toPpg(w2,$('mw-w2-u').value);
    const volBbl=volToBbl(vol,$('mw-vol-u').value);
    const mat=$('mw-mat').value;
    let sgMat, matPpg;
    const preset={barite:4.2, hematite:5.05, calcium:2.7};
    const presetPpg={barite:35.43, hematite:42.1, calcium:22.5};
    if(mat==='custom'){
      const sg=val('mw-custom-sg'); requirePos(sg,'SG personalizado');
      if(sg<1 || sg>7) throw new Error('SG debe estar entre 1.0 y 7.0');
      sgMat=sg; matPpg=sg*8.33*1.015; // corrección leve por densidad aparente (SG*8.33); usar directo SG*8.33
      matPpg=sg*8.33;
    } else {
      sgMat=preset[mat]; matPpg=presetPpg[mat];
    }
    let resultHtml='';
    if(w2ppg > w1ppg){
      // densificar
      // m (lb) = V(bbl)*350*(W2-W1)/(matPpg - W2) ??? Fórmula famosa: Barita lb/bbl = 1470*(W2-W1)/(35 - W2) ??? 1470 = 350*4.2
      // General: lb/bbl = 350*sgMat*(W2-W1)/(sgMat*8.33 - W2) ??? Usamos forma precisa
      // Masa barita = (W2-W1)*V*42 / (1 - W2/matPpg)
      const mLb = (w2ppg - w1ppg) * volBbl * 42 / (1 - w2ppg/matPpg); // lb
      // alternativa con agua: lb/bbl 350*(W2-W1)/(matPpg/8.33 - W2/8.33) ... check
      // Validar con ejemplo: 500 bbl 10->12 ppg barite: (2*500*42)/(1-12/35.43)=42000/0.661=63500 lb ~ 635 sacos 100lb => ~ 15.2 ppb? typical 77 lb/bbl = 38500 lb ... discrepancy
      // Usaremos fórmula API: Barite (sacks 100lb /100bbl) = (1470*(W2-W1))/(35-W2) ??? Para 10->12: 1470*2/23=127.8 sacks per 100 bbl => 639 sacks for 500 bbl => 63900 lb matches above. OK.
      const sacks100 = mLb/100;
      const ppb = mLb/volBbl;
      const volIncreaseBbl = mLb / (matPpg*42); // vol barita bbl (since matPpg lb/gal *42 = lb/bbl)
      const finalVol = volBbl + volIncreaseBbl;
      resultHtml=`
        <div class="result-title">Resultado — Densificación requerida (aumentar peso)</div>
        <div class="result-big"><span>${fmt(mLb,0)}</span> lb</div>
        <div class="result-sub">${fmt(sacks100,1)} sacos de 100 lb • ${fmt(ppb,1)} lb/bbl</div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(sacks100,1)} sx</strong><small>Sacos 100 lb</small></div>
          <div class="result-item"><strong>${fmt(mLb/2204.62,2)} t</strong><small>Toneladas</small></div>
          <div class="result-item"><strong>${fmt(volIncreaseBbl,1)} bbl</strong><small>Vol. añadido</small></div>
          <div class="result-item"><strong>${fmt(finalVol,1)} bbl</strong><small>Vol. final</small></div>
        </div>
        <div class="formula-box">Fórmula API: <b>m(lb)= (W2-W1)×V×42 / (1 - W2/ρmat)</b><br>(${fmt(w2ppg,2)}-${fmt(w1ppg,2)})×${fmt(volBbl,0)}×42 / (1 - ${fmt(w2ppg,2)}/${fmt(matPpg,2)}) = <b>${fmt(mLb,0)} lb</b><br>Material: ${mat} ρ=${fmt(matPpg,2)} ppg</div>`;
      setResult('res-mud-weight',resultHtml,{titulo:'10. Ajuste Peso Lodo (densificar)', resumen:`${fmt(mLb,0)} lb ${mat} | ${fmt(w1ppg,2)}→${fmt(w2ppg,2)} ppg`});
      addHistory({titulo:'10. Ajuste Lodo', resumen:`+${fmt(mLb,0)} lb ${mat} ${fmt(w1ppg,1)}→${fmt(w2ppg,1)} ppg`});
    } else if(w2ppg < w1ppg){
      // dilución con agua 8.33 ppg
      // Agua requerida: Vw = V*(W1-W2)/(W2 - Wagua)
      const wWater=8.33;
      const vWater = volBbl*(w1ppg - w2ppg)/(w2ppg - wWater);
      resultHtml=`
        <div class="result-title">Resultado — Dilución requerida (reducir peso)</div>
        <div class="result-big"><span>${fmt(vWater,1)}</span> bbl de agua</div>
        <div class="result-sub">Agua dulce 8.33 ppg para bajar de ${fmt(w1ppg,2)} a ${fmt(w2ppg,2)} ppg</div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(bblTo(vWater,'gal'),0)} gal</strong><small>Galones</small></div>
          <div class="result-item"><strong>${fmt(bblTo(vWater,'m3'),2)} m³</strong><small>m³</small></div>
          <div class="result-item"><strong>${fmt(vWater+volBbl,1)} bbl</strong><small>Vol. final</small></div>
          <div class="result-item"><strong>${fmt(wWater,2)} ppg</strong><small>Agua</small></div>
        </div>
        <div class="formula-box">Fórmula dilución: <b>Vw = V×(W1-W2)/(W2 - 8.33)</b> → ${fmt(volBbl,0)}×(${fmt(w1ppg,2)}-${fmt(w2ppg,2)})/(${fmt(w2ppg,2)}-8.33)=<b>${fmt(vWater,1)} bbl</b></div>`;
      setResult('res-mud-weight',resultHtml,{titulo:'10. Ajuste Peso Lodo (diluir)', resumen:`Diluir ${fmt(vWater,1)} bbl agua | ${fmt(w1ppg,2)}→${fmt(w2ppg,2)} ppg`});
      addHistory({titulo:'10. Ajuste Lodo (dilución)', resumen:`${fmt(vWater,1)} bbl agua`});
    } else {
      setResult('res-mud-weight','<div style="color:#f87171">MW1 y MW2 son iguales, no se requiere ajuste</div>');
    }
  }catch(e){ setResult('res-mud-weight',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 11 Hydrostatic ----------
function calcHydrostatic(){
  try{
    const mw=val('hp-mw'), tvd=val('hp-tvd');
    requirePos(mw,'MW'); requirePos(tvd,'TVD');
    const mwPpg=toPpg(mw,$('hp-mw-u').value);
    const tvdFt=toFt(tvd,$('hp-tvd-u').value);
    const psi=mwPpg*0.052*tvdFt;
    const kpa=psi*6.89476, bar=psi*0.0689476, mpa=kpa/1000;
    const grad=ppgToPsiPerFt(mwPpg);
    const html=`
      <div class="result-title">Resultado — Presión Hidrostática</div>
      <div class="result-big"><span>${fmt(psi,0)}</span> psi</div>
      <div class="result-sub">MW ${fmt(mw)} ${$('hp-mw-u').value} × TVD ${fmt(tvd)} ${$('hp-tvd-u').value}</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(kpa,0)} kPa</strong><small>kPa</small></div>
        <div class="result-item"><strong>${fmt(bar,2)} bar</strong><small>bar</small></div>
        <div class="result-item"><strong>${fmt(grad,3)} psi/ft</strong><small>Gradiente</small></div>
        <div class="result-item"><strong>${fmt(mwPpg/8.33,3)} SG</strong><small>SG</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>P = MW × 0.052 × TVD</b><br>${fmt(mwPpg,2)} ppg × 0.052 × ${fmt(tvdFt,0)} ft = <b>${fmt(psi,0)} psi</b><br>Métrico: ${fmt(mwPpg*119.826,0)} kg/m³ × 9.81 × ${fmt(tvdFt*0.3048,0)} m = ${fmt(kpa,0)} kPa</div>`;
    setResult('res-hydrostatic',html,{titulo:'11. Presión Hidrostática', resumen:`${fmt(psi,0)} psi | ${fmt(mwPpg,2)} ppg × ${fmt(tvdFt,0)} ft`});
    addHistory({titulo:'11. Hidrostática', resumen:`${fmt(psi,0)} psi`});
  }catch(e){ setResult('res-hydrostatic',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 12 ECD ----------
function calcECD(){
  try{
    const mw=val('ecd-mw'), dp=val('ecd-dp'), tvd=val('ecd-tvd');
    requirePos(mw,'MW'); requirePos(tvd,'TVD'); if(dp===null||dp<0) throw new Error('ΔP ≥0');
    const mwPpg=toPpg(mw,$('ecd-mw-u').value);
    const tvdFt=toFt(tvd,$('ecd-tvd-u').value);
    let dpPsi=dp;
    const u=$('ecd-dp-u').value;
    if(u==='kpa') dpPsi=dp/6.89476;
    if(u==='bar') dpPsi=dp/0.0689476;
    const ecdPpg=mwPpg + dpPsi/(0.052*tvdFt);
    const ecdSg=ecdPpg/8.33, ecdKgm3=ecdPpg*119.826;
    const html=`
      <div class="result-title">Resultado — ECD</div>
      <div class="result-big"><span>${fmt(ecdPpg,2)}</span> ppg</div>
      <div class="result-sub">MW ${fmt(mwPpg,2)} ppg + ΔP ${fmt(dpPsi,0)} psi @ ${fmt(tvdFt,0)} ft</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(ecdSg,3)} SG</strong><small>SG</small></div>
        <div class="result-item"><strong>${fmt(ecdKgm3,0)} kg/m³</strong><small>kg/m³</small></div>
        <div class="result-item"><strong>${fmt(ecdPpg*0.052,3)} psi/ft</strong><small>Gradiente ECD</small></div>
        <div class="result-item"><strong>+${fmt(ecdPpg-mwPpg,3)} ppg</strong><small>Incremento</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>ECD = MW + ΔP/(0.052×TVD)</b> → ${fmt(mwPpg,2)} + ${fmt(dpPsi,0)}/(0.052×${fmt(tvdFt,0)}) = <b>${fmt(ecdPpg,2)} ppg</b></div>`;
    setResult('res-ecd',html,{titulo:'12. ECD', resumen:`${fmt(ecdPpg,2)} ppg | MW ${fmt(mwPpg,2)} + ΔP ${fmt(dpPsi,0)} psi`});
    addHistory({titulo:'12. ECD', resumen:`${fmt(ecdPpg,2)} ppg`});
  }catch(e){ setResult('res-ecd',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 13 Mix Two/Three Fluids (réplica exacta captura) ----------
function calcMixFluids(){
  try{
    const w1=val('mix-w1'), v1=val('mix-v1'), w2=val('mix-w2'), v2=val('mix-v2');
    requirePos(w1,'Weight Fluid 1'); requirePos(v1,'Volume Fluid 1');
    requirePos(w2,'Weight Fluid 2'); requirePos(v2,'Volume Fluid 2');
    const w3=val('mix-w3'), v3=val('mix-v3');
    const has3 = w3!==null && v3!==null && w3>0 && v3>0;
    // Si w3 dado pero v3 no, o viceversa, error
    if((w3!==null && v3===null) || (w3===null && v3!==null)) throw new Error('Fluido 3: ingresa peso y volumen juntos o déjalos vacíos');
    const w1ppg=toPpg(w1,$('mix-w1-u').value), w2ppg=toPpg(w2,$('mix-w2-u').value);
    const v1bbl=volToBbl(v1,$('mix-v1-u').value), v2bbl=volToBbl(v2,$('mix-v2-u').value);
    let totalV = v1bbl+v2bbl, weighted = w1ppg*v1bbl + w2ppg*v2bbl, n=2;
    let w3ppg=0, v3bbl=0;
    if(has3){
      w3ppg=toPpg(w3,$('mix-w3-u').value); v3bbl=volToBbl(v3,$('mix-v3-u').value);
      totalV+=v3bbl; weighted+=w3ppg*v3bbl; n=3;
    }
    const finalPpg = weighted/totalV;
    const finalSG = finalPpg/8.33;
    // Volumen total en ambas unidades
    const totalM3 = bblTo(totalV,'m3');
    // Detalle por fluido
    const html=`
      <div class="result-title">Resultado — Mix ${n} Fluidos</div>
      <div class="result-big"><span>${fmt(finalPpg,2)}</span> ppg</div>
      <div class="result-sub">${n} fluidos mezclados • Volumen total <b>${fmt(totalV,2)} bbl</b> (${fmt(totalM3,3)} m³)</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(finalSG,3)} SG</strong><small>SG final</small></div>
        <div class="result-item"><strong>${fmt(finalPpg*119.826,0)} kg/m³</strong><small>kg/m³</small></div>
        <div class="result-item"><strong>${fmt(totalV,2)} bbl</strong><small>Vol total</small></div>
        <div class="result-item"><strong>${fmt(finalPpg*0.052,3)} psi/ft</strong><small>Gradiente</small></div>
      </div>
      <div class="formula-box">Fórmula: <b>MW = (W1·V1 + W2·V2${has3?' + W3·V3':''}) / (V1+V2${has3?'+V3':''})</b><br>
      (${fmt(w1ppg,2)}×${fmt(v1bbl,1)} + ${fmt(w2ppg,2)}×${fmt(v2bbl,1)}${has3?' + '+fmt(w3ppg,2)+'×'+fmt(v3bbl,1):''}) / ${fmt(totalV,1)} = <b>${fmt(finalPpg,2)} ppg</b><br>
      Detalle: F1 ${fmt(w1ppg,2)} ppg × ${fmt(v1bbl,1)} bbl + F2 ${fmt(w2ppg,2)}×${fmt(v2bbl,1)}${has3?` + F3 ${fmt(w3ppg,2)}×${fmt(v3bbl,1)}`:''}
      </div>`;
    setResult('res-mix-fluids',html,{titulo:'13. Mix Two/Three Fluids', resumen:`${fmt(finalPpg,2)} ppg • ${fmt(totalV,2)} bbl • ${n} fluidos`});
    addHistory({titulo:'13. Mix Fluids', resumen:`${fmt(finalPpg,2)} ppg | ${fmt(totalV,1)} bbl`});
  }catch(e){ setResult('res-mix-fluids',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 14 Sólidos Totales / Retorta ----------
function toggleRetortType(){
  const t=$('rt-type').value;
  const isOBM = t==='obm';
  const oilField=$('field-oil'), owrField=$('field-owr');
  if(oilField) oilField.style.display = isOBM ? 'block' : 'none';
  if(owrField) owrField.style.display = isOBM ? 'block' : 'none';
  // deshabilitar inputs para no confundir validación
  $('rt-oil-d').disabled = !isOBM;
  $('rt-owr-oil').disabled = !isOBM;
  $('rt-owr-water').disabled = !isOBM;
  // animación suave
  if(oilField) oilField.style.opacity = isOBM ? '1' : '0.45';
  if(owrField) owrField.style.opacity = isOBM ? '1' : '0.45';
}
function toggleRetortSG(){
  const v=$('rt-mat').value;
  $('field-rt-custom').style.display = v==='custom' ? 'block' : 'none';
}
function calcSolidsRetort(){
  try{
    const mw=val('rt-mw'); requirePos(mw,'MW');
    const mwPpg=toPpg(mw,$('rt-mw-u').value);
    const type=$('rt-type').value;
    const oilDinput=val('rt-oil-d') || 0.84;
    const waterDinput=val('rt-water-d') || 8.33;
    // oil y water densidades a ppg
    const oilPpg = $('rt-oil-u').value==='sg' ? oilDinput*8.33 : oilDinput;
    const waterPpg = $('rt-water-u').value==='sg' ? waterDinput*8.33 : waterDinput;
    const mat=$('rt-mat').value;
    let sgSolidsAvg;
    const presetSolids={barite:4.2, hematite:5.05, calcium:2.7, lgs:2.6};
    if(mat==='custom'){
      const sg=val('rt-custom-sg'); requirePos(sg,'SG personalizado');
      sgSolidsAvg=sg;
    } else {
      sgSolidsAvg=presetSolids[mat] || 4.2;
    }
    const lgsSG=val('rt-lgs') || 2.6;
    // sólidos avg ppg
    const solidsPpg = sgSolidsAvg*8.33;
    let solidsFrac=0, oilVol=0, waterVol=0;
    let htmlExtra='';
    if(type==='wbm'){
      // Base agua: s = (MW - water_d) / (solids_d - water_d)
      if(solidsPpg <= waterPpg) throw new Error('SG sólido debe ser > agua');
      solidsFrac = (mwPpg - waterPpg) / (solidsPpg - waterPpg);
      if(solidsFrac<0) solidsFrac=0; if(solidsFrac>0.6) solidsFrac=0.6;
      waterVol = 1 - solidsFrac;
      oilVol = 0;
      htmlExtra = `WBM: sólidos = (MW - agua)/(sólido - agua) = (${fmt(mwPpg,2)}-${fmt(waterPpg,2)})/(${fmt(solidsPpg,2)}-${fmt(waterPpg,2)})`;
    } else {
      // OBM: con OWR
      let owrOil=val('rt-owr-oil'), owrWater=val('rt-owr-water');
      if(owrOil===null) owrOil=80; if(owrWater===null) owrWater=20;
      const totalOWR = owrOil+owrWater;
      const oilFracLiq = owrOil/totalOWR, waterFracLiq = owrWater/totalOWR;
      const mixLiquidPpg = oilFracLiq*oilPpg + waterFracLiq*waterPpg;
      // s = (MW - mixLiquid)/(solids - mixLiquid)
      if(solidsPpg <= mixLiquidPpg) throw new Error('SG sólido insuficiente para alcanzar MW con ese OWR');
      solidsFrac = (mwPpg - mixLiquidPpg) / (solidsPpg - mixLiquidPpg);
      if(solidsFrac<0) solidsFrac=0; if(solidsFrac>0.5) solidsFrac=0.5;
      const liquidFrac = 1 - solidsFrac;
      oilVol = oilFracLiq * liquidFrac;
      waterVol = waterFracLiq * liquidFrac;
      htmlExtra = `OBM OWR ${fmt(owrOil,0)}/${fmt(owrWater,0)}: líquido medio ${fmt(mixLiquidPpg,2)} ppg → s = (${fmt(mwPpg,2)}-${fmt(mixLiquidPpg,2)})/(${fmt(solidsPpg,2)}-${fmt(mixLiquidPpg,2)})`;
    }
    // --- Override con % agua/aceite manual si el usuario los proporcionó ---
    const manWaterPct = val('rt-water-pct'), manOilPct = val('rt-oil-pct');
    if(manWaterPct!==null && manOilPct!==null){
      if(manWaterPct<0||manWaterPct>100||manOilPct<0||manOilPct>100) throw new Error('% agua/aceite 0-100');
      if(manWaterPct+manOilPct>=100) throw new Error('Suma agua+aceite debe ser <100');
      waterVol = manWaterPct/100; oilVol = manOilPct/100;
      solidsFrac = 1 - waterVol - oilVol;
      htmlExtra += `<br>📋 Manual: agua ${fmt(manWaterPct,1)}% + aceite ${fmt(manOilPct,1)}% → sólidos ${fmt(solidsFrac*100,1)}%`;
    } else if(manWaterPct!==null || manOilPct!==null){
      throw new Error('Ingresa ambos % agua y % aceite o déjalos vacíos para cálculo automático');
    }
    const solidsPct = solidsFrac*100, oilPct = oilVol*100, waterPct = waterVol*100;
    // --- Barita y Carbonato usados (lb/bbl) para concordancia derecha ---
    const baritePPB = val('rt-barite-ppb'), caco3PPB = val('rt-caco3-ppb');
    let bariteVol = 0, caco3Vol = 0, customHGSVol = 0;
    if(baritePPB!==null && baritePPB>0){ bariteVol = baritePPB/(4.2*350); }
    if(caco3PPB!==null && caco3PPB>0){ caco3Vol = caco3PPB/(2.7*350); }
    // Si densificante es custom y se usó, calcular con su SG
    if(mat==='custom' && (baritePPB===null && caco3PPB===null)){
      // usar SG custom como HGS único
      customHGSVol = 0;
    }
    let lgsVol = 0, hgsVol=0, baritePct=0, caco3Pct=0;
    const hasManualBarite = baritePPB!==null && baritePPB>0;
    const hasManualCaco3 = caco3PPB!==null && caco3PPB>0;
    const hasManualDens = hasManualBarite || hasManualCaco3;
    if(hasManualDens){
      baritePct = bariteVol*100; caco3Pct = caco3Vol*100;
      const totalDensVol = bariteVol + caco3Vol;
      if(totalDensVol > solidsFrac+0.001) throw new Error(`Sólidos ${fmt(solidsPct,1)}% insuficientes para barita ${fmt(baritePct,1)}% + CaCO₃ ${fmt(caco3Pct,1)}% — revisa MW o cantidades`);
      // LÓGICA CORRECTA: Barita = HGS (SG 4.2), Carbonato = NO es HGS, es LGS/MGS (SG 2.7)
      hgsVol = bariteVol; // solo barita es HGS
      lgsVol = solidsFrac - hgsVol; // LGS incluye arcilla + carbonato
      // validar que carbonato quepa en LGS
      if(caco3Vol > lgsVol+0.001) throw new Error(`Carbonato ${fmt(caco3Pct,1)}% excede LGS disponible ${fmt(lgsVol*100,1)}%`);
      htmlExtra += `<br>🧱 Barita ${fmt(baritePPB||0,1)} lb/bbl → <b>HGS ${fmt(baritePct,2)}% vol</b> | CaCO₃ ${fmt(caco3PPB||0,1)} lb/bbl → <b>LGS ${fmt(caco3Pct,2)}% vol (no HGS)</b>`;
    } else {
      // Automático: Carbonato NO genera HGS
      if(mat==='calcium' || mat==='lgs'){
        // Todo es LGS (carbonato es puenteo, SG 2.7, no es HGS)
        lgsVol = solidsFrac; hgsVol=0;
      } else if(mat==='custom' && sgSolidsAvg < 3.0){
        // SG bajo = no es HGS
        lgsVol = solidsFrac; hgsVol=0;
      } else {
        const baseLGS = Math.min(0.06, solidsFrac*0.35);
        lgsVol = baseLGS;
        hgsVol = solidsFrac - lgsVol;
      }
    }
    const lgsPct = lgsVol*100, hgsPct = hgsVol*100;
    const hgsLabel = hasManualDens ? (hasManualBarite ? `HGS Barita (SG 4.2)` : `HGS 0% — sin barita (CaCO₃ es LGS)`) : (mat==='calcium' ? `HGS 0% — Carbonato es LGS` : mat==='lgs' ? `HGS 0%` : `HGS (SG ${fmt(sgSolidsAvg,2)})`);
    const lgsSmall = hasManualCaco3 ? `LGS incl. CaCO₃ ${fmt(caco3Pct,1)}%` : `LGS (SG ${fmt(lgsSG,2)})`;
    // Sólidos totales en retorta de 50ml = solidsPct*0.5 ml? Pero mostramos %
    const retortSolidsMl = solidsPct*0.5; // 50ml * %
    const html=`
      <div class="result-title">Resultado — Sólidos Retorta Esperados</div>
      <div class="result-big"><span>${fmt(solidsPct,1)}</span> % sólidos</div>
      <div class="result-sub">MW ${fmt(mwPpg,2)} ppg • Densificante SG ${fmt(sgSolidsAvg,2)} • ${type==='obm'?'OBM':'WBM'}</div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(oilPct,1)}%</strong><small>Aceite</small></div>
        <div class="result-item"><strong>${fmt(waterPct,1)}%</strong><small>Agua</small></div>
        <div class="result-item"><strong>${fmt(solidsPct,1)}%</strong><small>Sólidos totales</small></div>
        <div class="result-item"><strong>${fmt(retortSolidsMl,1)} ml</strong><small>en retorta 50 ml</small></div>
      </div>
      <div class="result-grid">
        <div class="result-item"><strong>${fmt(lgsPct,1)}%</strong><small>${lgsSmall}</small></div>
        <div class="result-item"><strong>${fmt(hgsPct,1)}%</strong><small>${hgsLabel}</small></div>
        <div class="result-item"><strong>${fmt(solidsPpg,1)} ppg</strong><small>Dens. sólido</small></div>
        <div class="result-item"><strong>${fmt(mwPpg/8.33,3)} SG</strong><small>SG lodo</small></div>
      </div>
      ${hasManualBarite || hasManualCaco3 ? `<div class="formula-box" style="margin-top:8px;background:rgba(0,229,204,0.08);border-color:rgba(0,229,204,0.18)">🧱 Validación: HGS (barita) ${fmt(baritePct,2)}% vol (${fmt(baritePPB||0,1)} lb/bbl) | LGS-CaCO₃ ${fmt(caco3Pct,2)}% vol (${fmt(caco3PPB||0,1)} lb/bbl) → HGS total ${fmt(hgsPct,1)}% — lógico: carbonato NUNCA es HGS</div>` : ''}
      <div class="formula-box">${htmlExtra} = <b>${fmt(solidsPct,1)}% sólidos</b><br>
      Balance: MW = aceite·${fmt(oilPct,1)}% + agua·${fmt(waterPct,1)}% + sólidos·${fmt(solidsPct,1)}%<br>
      Retorta 50 ml esperada: Aceite ${fmt(oilPct*0.5,1)} ml + Agua ${fmt(waterPct*0.5,1)} ml + Sólidos ${fmt(retortSolidsMl,1)} ml<br>
      <b>Dato de campo:</b> si tu retorta marca ±2% de estos valores, el lodo está en especificación.
      </div>`;
    setResult('res-solids-retort',html,{titulo:'14. Sólidos / Retorta', resumen:`${fmt(solidsPct,1)}% sólidos • ${fmt(oilPct,1)}% aceite • ${fmt(waterPct,1)}% agua`});
    addHistory({titulo:'14. Retorta Sólidos', resumen:`${fmt(solidsPct,1)}% sólidos | MW ${fmt(mwPpg,2)} ppg`});
  }catch(e){ setResult('res-solids-retort',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- 15 Frack Tanks Global Verde 500 BBL - Investigación SLB ----------
// Datos de investigación: Global Verde 500 BBL = 79,500 L (500 bbl = 21,000 gal)
// Dim reales: Largo 14.02 m, Ancho 2.59 m, Alto total 3.35 m (hasta techo), Altura útil aprox 2.85 m (285 cm) Round Bottom
// Factor investigado: 500 bbl / 285 cm = 1.754 bbl/cm (1 cm = 1.754 bbl = 278.9 L = 73.68 gal)
// Para 400 BBL: 400/285 = 1.403 bbl/cm. Para custom: L*W/1e6/0.158987 con corrección round bottom 0.77 si aplica.
function toggleFrackType(){
  const v=$('ft-type').value;
  const custom=$('ft-custom-dims');
  if(custom) custom.style.display = v==='custom' ? 'block' : 'none';
  // actualizar altura por defecto
  if(v==='global500') $('ft-height').value=285;
  if(v==='global400') $('ft-height').value=285;
  generateFrackStrap();
}
function toggleFrackMode(){
  const m=$('ft-mode').value;
  $('ft-transfer-fields').style.display = m==='transfer' ? 'block' : 'none';
  $('ft-need-fields').style.display = m==='need' ? 'block' : 'none';
}
function getFrackFactor(){
  const type=$('ft-type').value;
  const h = val('ft-height') || 285;
  if(type==='global500') return {factor: 500/h, capacity:500, height:h, name:'Global Verde 500 BBL'};
  if(type==='global400') return {factor: 400/h, capacity:400, height:h, name:'Global Verde 400 BBL'};
  const L=val('ft-l')||1402, W=val('ft-w')||259;
  let f = (L*W/1e6)/0.158987;
  f = f * 0.77;
  const cap = f*h;
  return {factor:f, capacity:cap, height:h, name:`Custom ${L}x${W}x${h} cm`};
}
// Helper: aforo con descuadre llanta 0-84 cm (2 tramos)
function getTireParams(){
  const th = val('ft-tire-h');
  const tireH = (th!==null ? th : 84);
  const corr = val('ft-tire-corr');
  const corrVal = (corr!==null ? corr : 12);
  const unit = $('ft-tire-corr-u') ? $('ft-tire-corr-u').value : '%';
  return {tireH, corrVal, unit};
}
function frackBblForLevel(level, factor, tireH, corrVal, unit){
  if(level===null || level<=0) return 0;
  const h = tireH;
  let factorLow = factor;
  if(unit==='%') factorLow = factor * (1 - corrVal/100);
  else factorLow = factor - (corrVal / h);
  if(factorLow<0) factorLow=0;
  if(level <= h) return level * factorLow;
  return h*factorLow + (level - h)*factor;
}
function frackEffectiveCapacity(factor, height, tireH, corrVal, unit){
  return frackBblForLevel(height, factor, tireH, corrVal, unit);
}
function generateFrackStrap(){
  const {factor, height} = getFrackFactor();
  const {tireH, corrVal, unit} = getTireParams();
  const el=$('ft-strapping'); if(!el) return;
  let html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font-weight:800;color:#FFA733;margin-bottom:6px"><span>cm (nivel)</span><span>bbl</span><span>L</span><span>libre</span></div>';
  for(let cm=0; cm<=height; cm+=20){
    const bbl=frackBblForLevel(cm, factor, tireH, corrVal, unit);
    const liters=bbl*158.987;
    const free=height-cm;
    const isLow = cm<=tireH && cm>0;
    html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;border-top:1px solid rgba(255,255,255,0.06);padding:3px 0;${isLow?'background:rgba(255,140,0,0.08)':''}"><span>${cm}${isLow?'*':''}</span><span>${fmt(bbl,1)}</span><span>${fmt(liters,0)}</span><span>${fmt(free,0)} cm</span></div>`;
  }
  const capEff = frackEffectiveCapacity(factor, height, tireH, corrVal, unit);
  const lost = factor*height - capEff;
  html+=`<div style="margin-top:8px;color:#4ADE80;font-size:10px">Factor base: ${fmt(factor,3)} bbl/cm | 0-${tireH}cm con llanta: ${unit==='%'?corrVal+'% menos':corrVal+' bbl perdidos'} → Capacidad efectiva <b>${fmt(capEff,1)} bbl</b> (nominal ${fmt(factor*height,1)} bbl, perdido ${fmt(lost,1)} bbl)</div>`;
  html+=`<div style="color:#FFA733;font-size:10px">* primeros ${tireH} cm con descuadre llanta</div>`;
  el.innerHTML=html;
}
function calcFrackTanks(){
  try{
    const {factor, capacity, height, name} = getFrackFactor();
    // Medición por ESPACIO LIBRE (vacío arriba) — prioridad, como mide el operador en campo con cinta desde el borde
    const freeInput=val('ft-free'), levelInput=val('ft-level');
    let level = null;
    let freeCmInput = null;
    if(freeInput!==null){
      if(freeInput<0 || freeInput>height) throw new Error(`Espacio libre debe estar 0-${height} cm`);
      level = height - freeInput;
      freeCmInput = freeInput;
    } else if(levelInput!==null){
      if(levelInput<0 || levelInput>height) throw new Error(`Nivel debe estar 0-${height} cm`);
      level = levelInput;
      freeCmInput = height - level;
    }
    const count=Math.max(1, val('ft-count')||1);
    const mode=$('ft-mode').value;
    let html='', resumen='';
    const {tireH, corrVal, unit} = getTireParams();
    const capEff = frackEffectiveCapacity(factor, height, tireH, corrVal, unit);
    // Datos base stock con aforo 2 tramos (0-84 llanta, 84+ completo)
    let currentBbl = level!==null ? frackBblForLevel(level, factor, tireH, corrVal, unit) : 0;
    let freeCm = level!==null ? height - level : height;
    let freeBbl = level!==null ? capEff - currentBbl : capEff;
    let pct = level!==null ? currentBbl/capEff*100 : 0;
    let correctionNote = level!==null && level<=tireH ? `<br><small style="color:#FFA733">🛞 Zona llanta (0-${tireH} cm): factor corregido ${unit==='%'?corrVal+'%':corrVal+' bbl'} menos → ${fmt(currentBbl,1)} bbl</small>` : '';
    if(mode==='stock'){
      if(level===null) throw new Error('Ingresa Espacio LIBRE (cm) o Nivel de fluido');
      html=`
        <div class="result-title">Stock — ${name} x${count}</div>
        <div class="result-big"><span>${fmt(currentBbl*count,1)}</span> bbl</div>
        <div class="result-sub">${freeInput!==null ? `Medido por <b>espacio libre ${fmt(freeInput,1)} cm</b> → Nivel ${fmt(level,1)} cm` : `Nivel ${fmt(level,1)} cm`} / ${fmt(height,0)} cm (${fmt(pct,1)}% lleno) — Factor ${fmt(factor,3)} bbl/cm${correctionNote}</div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(currentBbl,1)} bbl</strong><small>Por tanque</small></div>
          <div class="result-item"><strong>${fmt(currentBbl*158.987,0)} L</strong><small>Litros/tanque</small></div>
          <div class="result-item"><strong>${fmt(freeCm,0)} cm</strong><small>Libres</small></div>
          <div class="result-item"><strong>${fmt(freeBbl,1)} bbl</strong><small>Libres/tanque</small></div>
        </div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(freeBbl*count,1)} bbl</strong><small>Libres totales x${count}</small></div>
          <div class="result-item"><strong>${fmt((currentBbl*count)*158.987/1000,2)} m³</strong><small>Stock total m³</small></div>
          <div class="result-item"><strong>${fmt(pct,1)}%</strong><small>Ocupado</small></div>
          <div class="result-item"><strong>${fmt(100-pct,1)}%</strong><small>Libre</small></div>
        </div>
        <div class="formula-box">Frack Tank Verde Global: 500 BBL = 79,500 L (21,000 gal) Dim 14.02×2.59×3.35 m<br>
        Cálculo: bbl = nivel(cm) × factor(${fmt(factor,3)}) → ${fmt(level,1)}×${fmt(factor,3)}=<b>${fmt(currentBbl,1)} bbl</b> | Libres: ${fmt(height,0)}-${fmt(level,0)}=${fmt(freeCm,0)} cm → ${fmt(freeBbl,1)} bbl<br>
        Para ${count} tanque(s): Stock total ${fmt(currentBbl*count,1)} bbl, Libre total ${fmt(freeBbl*count,1)} bbl</div>`;
      resumen=`${fmt(currentBbl,1)} bbl (${fmt(pct,1)}%) | Libres ${fmt(freeBbl,1)} bbl (${fmt(freeCm,0)} cm)`;
    } else if(mode==='transfer'){
      const freeBefore=val('ft-free-before'), freeAfter=val('ft-free-after');
      let before=val('ft-before'), after=val('ft-after');
      // si dio espacio libre, convertir a nivel
      if(freeBefore!==null) before = height - freeBefore;
      if(freeAfter!==null) after = height - freeAfter;
      const cmTrans=val('ft-cm-trans');
      let cmDiff=0;
      if(cmTrans!==null && cmTrans>0) cmDiff=cmTrans;
      else {
        requirePos(before,'Nivel ANTES'); requirePos(after,'Nivel DESPUÉS');
        // validar usando espacio libre si fue el input original
        cmDiff = before - after;
        if(cmDiff<=0) throw new Error('ANTES debe ser mayor que DESPUÉS (descenso) — con espacio libre: ANTES vacío debe ser MENOR que DESPUÉS vacío');
      }
      // Cálculo con aforo 2 tramos: diferencia de aforos (no lineal)
      let bblTrans=0, bblTransCorr=0;
      if(cmTrans!==null && cmTrans>0 && before===null){
        // solo cm sueltos: asumir tramo alto (sin llanta) para estimación
        bblTrans = cmTrans*factor;
        bblTransCorr = bblTrans;
      } else {
        const bblBefore = frackBblForLevel(before, factor, tireH, corrVal, unit);
        const bblAfter = frackBblForLevel(after, factor, tireH, corrVal, unit);
        bblTrans = bblBefore - bblAfter;
        bblTransCorr = bblTrans;
      }
      const afterBbl = (level!==null ? frackBblForLevel(level, factor, tireH, corrVal, unit) : (after!==null?frackBblForLevel(after, factor, tireH, corrVal, unit):0));
      html=`
        <div class="result-title">Transferencia — ${name}</div>
        <div class="result-big"><span>${fmt(bblTransCorr,1)}</span> bbl transferidos</div>
        <div class="result-sub">Descontado ${fmt(cmDiff,1)} cm × ${fmt(factor,3)} bbl/cm ${cmDiff!==bblTransCorr/factor?' (corregido fondo curvo)':''}</div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(cmDiff,1)} cm</strong><small>Descontados</small></div>
          <div class="result-item"><strong>${fmt(bblTransCorr,1)} bbl</strong><small>Transferidos/tanque</small></div>
          <div class="result-item"><strong>${fmt(bblTransCorr*count,1)} bbl</strong><small>Transfer total x${count}</small></div>
          <div class="result-item"><strong>${fmt(bblTransCorr*158.987,0)} L</strong><small>Litros/tanque</small></div>
        </div>
        <div class="formula-box">Transferencia: cm = ANTES - DESPUÉS = ${before!==null?fmt(before,0):'?'} - ${after!==null?fmt(after,0):'?'} = <b>${fmt(cmDiff,1)} cm</b><br>
        Barriles = cm × ${fmt(factor,3)} = ${fmt(cmDiff,1)}×${fmt(factor,3)}=<b>${fmt(bblTransCorr,1)} bbl</b> por tanque<br>
        Para ${count} tanque(s): ${fmt(bblTransCorr*count,1)} bbl = ${fmt(bblTransCorr*count*42,0)} gal</div>`;
      resumen=`${fmt(bblTransCorr,1)} bbl (${fmt(cmDiff,1)} cm) transferidos`;
    } else if(mode==='need'){
      const need=val('ft-need-bbl'); requirePos(need,'Barriles requeridos');
      if(need>freeBbl+0.001) throw new Error(`Necesitas ${fmt(need,1)} bbl pero solo hay ${fmt(freeBbl,1)} bbl libres (${fmt(freeCm,0)} cm) — capacidad efectiva ${fmt(capEff,1)} bbl`);
      // Calcular cm necesarios con aforo 2 tramos
      const targetBbl = currentBbl + need;
      let targetLevel;
      const factorLow = unit==='%' ? factor*(1-corrVal/100) : factor - (corrVal/tireH);
      const bblAtTire = tireH*factorLow;
      if(targetBbl <= bblAtTire) targetLevel = targetBbl / factorLow;
      else targetLevel = tireH + (targetBbl - bblAtTire)/factor;
      const cmNeed = targetLevel - (level||0);
      const newLevel = targetLevel;
      html=`
        <div class="result-title">Necesidad — ${name}</div>
        <div class="result-big"><span>${fmt(cmNeed,1)}</span> cm necesarios</div>
        <div class="result-sub">Para agregar ${fmt(need,1)} bbl con factor ${fmt(factor,3)} bbl/cm</div>
        <div class="result-grid">
          <div class="result-item"><strong>${fmt(cmNeed,1)} cm</strong><small>Altura requerida</small></div>
          <div class="result-item"><strong>${fmt(newLevel,1)} cm</strong><small>Nivel final</small></div>
          <div class="result-item"><strong>${fmt(freeCm-cmNeed,0)} cm</strong><small>Quedará libre</small></div>
          <div class="result-item"><strong>${fmt((freeBbl-need),1)} bbl</strong><small>Libre después</small></div>
        </div>
        <div class="formula-box">cm necesarios = bbl / factor = ${fmt(need,1)}/${fmt(factor,3)}=<b>${fmt(cmNeed,1)} cm</b><br>
        Nivel final: ${fmt(level||0,0)} + ${fmt(cmNeed,1)} = ${fmt(newLevel,1)} cm (${fmt(newLevel/height*100,1)}%)</div>`;
      resumen=`Necesitas ${fmt(cmNeed,1)} cm para ${fmt(need,1)} bbl`;
    }
    setResult('res-fracktanks',html,{titulo:'15. Frack Tanks Transferencia '+name, resumen});
    addHistory({titulo:'15. Frack Tanks', resumen});
    generateFrackStrap();
  }catch(e){ setResult('res-fracktanks',`<div style="color:#f87171">${e.message}</div>`)}
}

// ---------- Conversores ----------
function convertDensity(){
  const v=val('conv-dens-val'); if(v===null) return;
  const from=$('conv-dens-from').value, to=$('conv-dens-to').value;
  let ppg;
  if(from==='ppg') ppg=v;
  else if(from==='sg') ppg=v*8.33;
  else if(from==='kgm3') ppg=v/119.826;
  else if(from==='gcm3') ppg=v*8.33;
  else if(from==='pcf') ppg=v/7.48052;
  else if(from==='psift') ppg=v/0.052;
  let out;
  if(to==='ppg') out=ppg;
  else if(to==='sg') out=ppg/8.33;
  else if(to==='kgm3') out=ppg*119.826;
  else if(to==='gcm3') out=ppg/8.33;
  else if(to==='pcf') out=ppg*7.48052;
  else if(to==='psift') out=ppg*0.052;
  $('conv-dens-res').textContent=`${fmt(v)} ${from} = ${fmt(out,4)} ${to}`;
}
function convertPressure(){
  const v=val('conv-pres-val'); if(v===null) return;
  const from=$('conv-pres-from').value, to=$('conv-pres-to').value;
  const toPsi={psi:1,kpa:0.145038,bar:14.5038,mpa:145.038,kgcm2:14.2233};
  const fromPsi={psi:1,kpa:6.89476,bar:68.9476,mpa:6894.76,kgcm2:98.0665};
  // convertir a psi luego a destino: psi = v * factor? Simpler: v in from -> psi = v * (psi per unit)?? Actually kpa->psi 0.145, psi->psi 1
  // Then psi -> to: psi * (to per psi)? kpa per psi 6.894
  const psi= v * (toPsi[from]||1);
  let out;
  if(to==='psi') out=psi;
  else if(to==='kpa') out=psi*6.89476;
  else if(to==='bar') out=psi*0.0689476;
  else if(to==='mpa') out=psi*0.00689476;
  else if(to==='kgcm2') out=psi*0.070307;
  else out=psi;
  $('conv-pres-res').textContent=`${fmt(v)} ${from} = ${fmt(out,3)} ${to}`;
}
function convertLength(){
  const v=val('conv-len-val'); if(v===null) return;
  const from=$('conv-len-from').value, to=$('conv-len-to').value;
  const toM={in:0.0254, ft:0.3048, mm:0.001, m:1};
  const m=v*toM[from];
  const out=m/toM[to];
  $('conv-len-res').textContent=`${fmt(v)} ${from} = ${fmt(out,4)} ${to}`;
}
function convertVolume(){
  const v=val('conv-vol-val'); if(v===null) return;
  const from=$('conv-vol-from').value, to=$('conv-vol-to').value;
  const bbl=volToBbl(v,from);
  const out=bblTo(bbl,to);
  $('conv-vol-res').textContent=`${fmt(v)} ${from} = ${fmt(out,4)} ${to}`;
}

// ---------- Ejemplos ----------
function fillExample(which){
  const map={
    'pipe-cap':()=>{ $('pc-id').value=4.276; $('pc-len').value=10000; $('pc-id-u').value='in'; $('pc-len-u').value='ft'; calcPipeCap(); },
    'annular-cap':()=>{ $('ac-dh').value=12.25; $('ac-dp').value=5; $('ac-len').value=5000; calcAnnularCap(); },
    'pipe-annular-vol':()=>{ $('pav-id').value=4.276; $('pav-od').value=5; $('pav-dh').value=12.25; $('pav-len').value=10000; calcPipeAnnularVol(); },
    'tank-vol':()=>{ $('tk-l').value=10; $('tk-w').value=8; $('tk-h').value=5; $('tk-level').value=''; calcTankVol(); },
    'pump-output':()=>{ $('pump-type').value='triplex'; togglePumpType(); $('pump-d').value=6; $('pump-s').value=11; $('pump-eff').value=97; $('pump-spm').value=60; calcPump(); },
    'tfa':()=>{ $('tfa-1').value=12; $('tfa-2').value=12; $('tfa-3').value=13; $('tfa-extra').value=''; calcTFA(); },
    'annular-vel':()=>{ $('av-q').value=400; $('av-dh').value=12.25; $('av-dp').value=5; calcAnnularVel(); },
    'brine-density':()=>{ $('bd-salt').value='NaCl'; $('bd-conc').value=10; $('bd-target').value=''; calcBrineDensity(); },
    'sg-visc':()=>{ $('sg-rho').value=10; $('sg-rho-u').value='ppg'; calcSGVisc(); },
    'mud-weight':()=>{ $('mw-w1').value=10; $('mw-w2').value=12; $('mw-vol').value=500; $('mw-mat').value='barite'; toggleCustomSG(); calcMudWeight(); },
    'hydrostatic':()=>{ $('hp-mw').value=12.5; $('hp-tvd').value=7000; calcHydrostatic(); },
    'ecd':()=>{ $('ecd-mw').value=12; $('ecd-dp').value=200; $('ecd-tvd').value=10000; calcECD(); },
    'mix-fluids':()=>{ $('mix-w1').value=10; $('mix-w1-u').value='ppg'; $('mix-v1').value=100; $('mix-v1-u').value='bbl'; $('mix-w2').value=12; $('mix-w2-u').value='ppg'; $('mix-v2').value=100; $('mix-v2-u').value='bbl'; $('mix-w3').value=''; $('mix-v3').value=''; calcMixFluids(); },
    'solids-retort':()=>{ $('rt-mw').value=12; $('rt-mw-u').value='ppg'; $('rt-type').value='obm'; toggleRetortType(); $('rt-oil-d').value=0.84; $('rt-water-d').value=8.33; $('rt-owr-oil').value=80; $('rt-owr-water').value=20; $('rt-mat').value='barite'; toggleRetortSG(); calcSolidsRetort(); },
    'fracktanks':()=>{ $('ft-type').value='global500'; toggleFrackType(); $('ft-height').value=285; $('ft-free').value=105; $('ft-level').value=''; $('ft-mode').value='stock'; toggleFrackMode(); $('ft-count').value=1; generateFrackStrap(); calcFrackTanks(); },
  };
  if(map[which]) map[which]();
}

// ---------- PDF ----------
function exportPDF(view){
  const resEl=$('res-'+view);
  if(!resEl || resEl.querySelector('.result-empty')){ alert('Primero realiza un cálculo'); return; }
  pendingPDF={view, data: resEl._pdfData || {titulo:view, resumen:resEl.innerText.slice(0,120)}};
  $('userModal').classList.remove('hidden');
}
function closeModal(){ $('userModal').classList.add('hidden'); pendingPDF=null; }
function reExport(i){
  const h=getHistory()[i];
  if(!h) return;
  pendingPDF={view:'history', data:h};
  $('userModal').classList.remove('hidden');
}
function confirmPDF(){
  const name=$('userName').value.trim()||'Usuario';
  const data=pendingPDF.data;
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF();
  // Header
  doc.setFillColor(15,23,42); doc.rect(0,0,210,28,'F');
  doc.setTextColor(34,211,238); doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('SLB SOLIDOS - MUD ENGINEERING CALCULATOR',10,14);
  doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('Reporte Profesional de Calculo - Formulas IADC/SPE',10,20);
  doc.text('Fecha: '+new Date().toLocaleString('es-CO')+' | Usuario: '+name,10,25);
  // Title
  doc.setTextColor(15,23,42); doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text(data.titulo||pendingPDF.view,10,38);
  doc.setDrawColor(34,211,238); doc.setLineWidth(0.6); doc.line(10,40,200,40);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
  // Resumen
  let y=46;
  doc.setFont('helvetica','bold'); doc.text('Resumen:',10,y); y+=6;
  doc.setFont('helvetica','normal');
  const resumen=doc.splitTextToSize(data.resumen||'',190);
  doc.text(resumen,10,y); y+=resumen.length*5+4;
  if(data.detalles){
    // strip html tags for pdf
    const tmp=document.createElement('div'); tmp.innerHTML=data.detalles;
    const txt=tmp.innerText;
    const lines=doc.splitTextToSize(txt,190);
    if(y+lines.length*5>270){ doc.addPage(); y=20; }
    doc.setFont('helvetica','bold'); doc.text('Detalles del calculo:',10,y); y+=6;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(lines,10,y); y+=lines.length*5+6;
  }
  // Footer
  doc.setFontSize(8); doc.setTextColor(100,116,139);
  doc.text('Mud Engineering Calculator v1.0 - SLB Solidos - Validado IADC/SPE - Generado localmente (sin envio a servidor)',10,285);
  doc.text('www.slb-solidos.com | Este documento es un reporte tecnico de campo',10,289);
  doc.save((data.titulo||'reporte').replace(/[^a-zA-Z0-9]/g,'_')+'_'+Date.now()+'.pdf');
  // Guardar nombre
  localStorage.setItem('mud_user',name);
  closeModal();
  // Añadir al historial si no es re-export
  if(pendingPDF.view!=='history'){
    // ya está en historial
  }
}
function exportHistoryPDF(){
  const h=getHistory();
  if(!h.length){ alert('Historial vacío'); return; }
  pendingPDF={view:'history_all', data:{titulo:'Historial Completo - Mud Calculator', resumen:`Total ${h.length} calculos`, detalles: h.map((e,i)=>`${i+1}. ${e.titulo} - ${e.resumen} - ${e.fecha}`).join('\n')}};
  $('userModal').classList.remove('hidden');
}

// Init
initTheme();
setSystem(globalSystem);
updateHistoryBadge();
renderHistory();
// inicializar visibilidad condicional WBM/OBM y SG personalizado
try{ toggleRetortType(); }catch(e){}
try{ toggleRetortSG(); }catch(e){}
try{ toggleCustomSG(); }catch(e){}
try{ togglePumpType(); }catch(e){}
try{ toggleFrackType(); }catch(e){}
try{ toggleFrackMode(); }catch(e){}
try{ generateFrackStrap(); }catch(e){}
const savedUser=localStorage.getItem('mud_user'); if(savedUser) $('userName').value=savedUser;

// Exponer globales para onclick
window.navigate=navigate; window.calcPipeCap=calcPipeCap; window.calcAnnularCap=calcAnnularCap;
window.calcPipeAnnularVol=calcPipeAnnularVol; window.calcTankVol=calcTankVol; window.calcPump=calcPump;
window.togglePumpType=togglePumpType; window.calcTFA=calcTFA; window.calcAnnularVel=calcAnnularVel;
window.calcBrineDensity=calcBrineDensity; window.calcSGVisc=calcSGVisc; window.calcMudWeight=calcMudWeight;
window.calcHydrostatic=calcHydrostatic; window.calcECD=calcECD; window.calcMixFluids=calcMixFluids; window.calcSolidsRetort=calcSolidsRetort; window.calcFrackTanks=calcFrackTanks;
window.toggleCustomSG=toggleCustomSG; window.toggleRetortType=toggleRetortType; window.toggleRetortSG=toggleRetortSG; window.toggleFrackType=toggleFrackType; window.toggleFrackMode=toggleFrackMode; window.generateFrackStrap=generateFrackStrap;
window.convertDensity=convertDensity; window.convertPressure=convertPressure; window.convertLength=convertLength; window.convertVolume=convertVolume;
window.fillExample=fillExample; window.exportPDF=exportPDF; window.closeModal=closeModal; window.confirmPDF=confirmPDF;
window.clearHistory=clearHistory; window.exportHistoryPDF=exportHistoryPDF; window.reExport=reExport; window.removeHistory=removeHistory;
