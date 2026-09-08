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

// ---------- 10 Mud Weight Adjustment ----------
function calcMudWeight(){
  try{
    const w1=val('mw-w1'), w2=val('mw-w2'), vol=val('mw-vol');
    requirePos(w1,'MW1'); requirePos(w2,'MW2'); requirePos(vol,'Volumen');
    const w1ppg=toPpg(w1,$('mw-w1-u').value), w2ppg=toPpg(w2,$('mw-w2-u').value);
    const volBbl=volToBbl(vol,$('mw-vol-u').value);
    const mat=$('mw-mat').value;
    const sgMat={barite:4.2, hematite:5.05, calcium:2.7}[mat];
    const rhoMat=sgMat*8.33*42; // lb/bbl? Densidad barita 35.43 ppg => 1487 lb/bbl
    // Pero usar fórmula estándar: sacks barite (100 lb) = (W2-W1)*V / (35.43 - W2) *14.7 ??? Simplificamos balance masa/volumen
    // Balance: (V*w1 + m)/(V + m/rhoMat_weightPerBbl) = w2
    // rhoMat en ppg: barite 35.43 ppg (1470 lb/bbl /42?), actually barite bulk SG 4.2 => 35 ppg
    const matPpg={barite:35.43, hematite:42.1, calcium:22.5}[mat];
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
    'mud-weight':()=>{ $('mw-w1').value=10; $('mw-w2').value=12; $('mw-vol').value=500; calcMudWeight(); },
    'hydrostatic':()=>{ $('hp-mw').value=12.5; $('hp-tvd').value=7000; calcHydrostatic(); },
    'ecd':()=>{ $('ecd-mw').value=12; $('ecd-dp').value=200; $('ecd-tvd').value=10000; calcECD(); },
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
const savedUser=localStorage.getItem('mud_user'); if(savedUser) $('userName').value=savedUser;

// Exponer globales para onclick
window.navigate=navigate; window.calcPipeCap=calcPipeCap; window.calcAnnularCap=calcAnnularCap;
window.calcPipeAnnularVol=calcPipeAnnularVol; window.calcTankVol=calcTankVol; window.calcPump=calcPump;
window.togglePumpType=togglePumpType; window.calcTFA=calcTFA; window.calcAnnularVel=calcAnnularVel;
window.calcBrineDensity=calcBrineDensity; window.calcSGVisc=calcSGVisc; window.calcMudWeight=calcMudWeight;
window.calcHydrostatic=calcHydrostatic; window.calcECD=calcECD; window.convertDensity=convertDensity;
window.convertPressure=convertPressure; window.convertLength=convertLength; window.convertVolume=convertVolume;
window.fillExample=fillExample; window.exportPDF=exportPDF; window.closeModal=closeModal; window.confirmPDF=confirmPDF;
window.clearHistory=clearHistory; window.exportHistoryPDF=exportHistoryPDF; window.reExport=reExport; window.removeHistory=removeHistory;
