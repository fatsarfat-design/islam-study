
import {APP_VERSION, TAJWEED_BLOCKS, AZKAR} from './data.js';
import {QUIZZES, EXAMS} from './tests.js';

const $=(s,e=document)=>e.querySelector(s);
const $$=(s,e=document)=>Array.from(e.querySelectorAll(s));

const store={
  get:(k,f=null)=>{try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v)}catch{return f}},
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),
  del:(k)=>localStorage.removeItem(k),
};

const keys={
  settings:'tj_settings_v'+APP_VERSION,
  notes:'tj_notes_v'+APP_VERSION,
  progress:'tj_progress_v'+APP_VERSION,
  prayer:'tj_prayer_v'+APP_VERSION,
  quranCache:'tj_quran_cache_v'+APP_VERSION,
  azkar:'tj_azkar_v'+APP_VERSION,
};

const state={
  tab:'tajweed',
  open:{left:true,right:true},
  blockId:TAJWEED_BLOCKS[0].id,
  azCat:AZKAR.categories[0].id,
  prayer:{mode:'auto',country:'United States',city:'New York',method:2,school:0,remindMins:10,notify:false},
  quran:{selectedSurah:78,selectedAyah:1,wordIndex:0,arabicEdition:'quran-uthmani',ruEdition:'ru.kuliev',cache:{}}
};

function escapeHtml(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.style.opacity='1'; t.style.transform='translate(-50%,0)';
  setTimeout(()=>{t.style.opacity='0'; t.style.transform='translate(-50%,6px)'},2200);
}

function getSettings(){
  return store.get(keys.settings,{theme:'dark',fontSize:16,arabicSize:28,overlay:0.55,bgPhoto:null});
}
function applySettings(s,persist=true){
  document.documentElement.dataset.theme=s.theme||'dark';
  document.documentElement.style.setProperty('--fontSize',(s.fontSize||16)+'px');
  document.documentElement.style.setProperty('--arabicSize',(s.arabicSize||28)+'px');
  document.documentElement.style.setProperty('--overlay',`rgba(0,0,0,${s.overlay ?? 0.55})`);
  const bg=$('#bgPhoto');
  bg.style.backgroundImage = s.bgPhoto ? `url("${s.bgPhoto}")` : 'none';
  if(persist) store.set(keys.settings,s);
}
async function fileToDataUrl(file){
  return await new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(file);});
}

function getNotes(){return store.get(keys.notes,{});}
function setNotes(n){store.set(keys.notes,n);}
function noteKey(scope,id){return `${scope}:${id}`;}
function getProgress(){return store.get(keys.progress,{blocks:{},streak:{lastDay:null,count:0},exams:{}});}
function setProgress(p){store.set(keys.progress,p);}
function todayKey(){return new Date().toISOString().slice(0,10);}
function bumpStreak(){
  const p=getProgress(); const t=todayKey(); if(p.streak.lastDay===t) return;
  const y=new Date(Date.now()-86400000).toISOString().slice(0,10);
  p.streak.count = (p.streak.lastDay===y) ? (p.streak.count+1) : 1;
  p.streak.lastDay=t; setProgress(p);
}

function setTab(tab){ state.tab=tab; $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); render(); }
function togglePanel(which,open){ state.open[which]=open; render(); }

function render(){
  $('#leftPanel').style.display=state.open.left?'block':'none';
  $('#rightPanel').style.display=state.open.right?'block':'none';
  renderLeft(); renderRight();
}

function renderLeft(){
  const hdr=$('#leftPanel .panelHeader h2'); const el=$('#leftPanel .content');
  $('#closeLeft').onclick=()=>togglePanel('left',false);
  if(state.tab==='tajweed'){ hdr.textContent='Таджвид'; el.innerHTML=tajLeftUI(); wireTajLeft(el); }
  else if(state.tab==='quran'){ hdr.textContent='30-й джуз'; el.innerHTML=quranLeftUI(); wireQuranLeft(el); }
  else if(state.tab==='prayer'){ hdr.textContent='Намаз'; el.innerHTML=prayerLeftUI(); wirePrayerLeft(el); }
  else if(state.tab==='azkar'){ hdr.textContent='Азкары'; el.innerHTML=azkarLeftUI(); wireAzkarLeft(el); }
  else if(state.tab==='notes'){ hdr.textContent='Заметки'; el.innerHTML=notesLeftUI(); wireNotesLeft(el); }
  else if(state.tab==='progress'){ hdr.textContent='Прогресс'; el.innerHTML=progressLeftUI(); wireProgressLeft(el); }
}

function renderRight(){
  const hdr=$('#rightPanel .panelHeader h2'); const el=$('#rightPanel .content');
  $('#closeRight').onclick=()=>togglePanel('right',false);
  if(state.tab==='tajweed'){
    const b=TAJWEED_BLOCKS.find(x=>x.id===state.blockId)||TAJWEED_BLOCKS[0];
    hdr.textContent=b.title; el.innerHTML=tajBlockUI(b); wireTajBlock(el,b);
  } else if(state.tab==='quran'){ hdr.textContent='Чтение + подсказки'; el.innerHTML=quranRightUI(); wireQuranRight(el); }
  else if(state.tab==='prayer'){ hdr.textContent='Время намаза'; el.innerHTML=prayerRightUI(); wirePrayerRight(el); }
  else if(state.tab==='azkar'){ hdr.textContent='Азкары'; el.innerHTML=azkarRightUI(); wireAzkarRight(el); }
  else if(state.tab==='notes'){ hdr.textContent='Заметки'; el.innerHTML=notesRightUI(); wireNotesRight(el); }
  else if(state.tab==='progress'){ hdr.textContent='Статистика'; el.innerHTML=progressRightUI(); wireProgressRight(el); }
}

// ---- Modals ----
function openModal(kind){
  const m=$('#modal'); const body=$('#modalBody'); m.style.display='flex';
  $('#modalClose').onclick=()=>m.style.display='none';
  if(kind==='settings'){ const s=getSettings(); body.innerHTML=settingsUI(s); wireSettings(body,s); }
  if(kind==='panels'){ body.innerHTML=panelsUI(); wirePanels(body); }
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('#modal').style.display='none'; });

function settingsUI(s){
  return `
  <div class="card">
    <div class="row">
      <div><label>Тема</label>
        <select id="setTheme"><option value="dark">Тёмная</option><option value="light">Светлая</option></select>
      </div>
      <div><label>Размер текста</label><input id="setFont" type="number" min="12" max="24" value="${s.fontSize}"/></div>
      <div><label>Размер арабского</label><input id="setArabic" type="number" min="18" max="42" value="${s.arabicSize}"/></div>
    </div>
    <div class="row" style="margin-top:10px">
      <div><label>Затемнение фона (0..0.85)</label><input id="setOverlay" type="number" step="0.05" min="0" max="0.85" value="${s.overlay}"/></div>
      <div><label>Фон: загрузить фото</label><input id="bgFile" type="file" accept="image/*"/><div class="muted small" style="margin-top:6px">Сохранится на этом устройстве.</div></div>
      <div><label>или ссылка на фото</label><input id="bgUrl" placeholder="https://..." value="${s.bgPhoto||''}"/></div>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="saveSettings">Сохранить</button>
      <button class="secondary" id="clearBg">Убрать фото</button>
    </div>
  </div>`;
}
function wireSettings(root,s){
  $('#setTheme',root).value=s.theme;
  const preview=()=>{ const n={theme:$('#setTheme',root).value,fontSize:+($('#setFont',root).value||16),arabicSize:+($('#setArabic',root).value||28),overlay:+($('#setOverlay',root).value||0.55),bgPhoto:($('#bgUrl',root).value.trim()||null)}; applySettings(n,false); };
  ['setTheme','setFont','setArabic','setOverlay'].forEach(id=>{ $('#'+id,root).oninput=preview; $('#'+id,root).onchange=preview; });
  $('#bgUrl',root).oninput=preview;
  $('#bgFile',root).onchange=async(e)=>{ const f=e.target.files?.[0]; if(!f) return; const data=await fileToDataUrl(f); const n=getSettings(); n.bgPhoto=data; applySettings(n,true); $('#bgUrl',root).value=''; };
  $('#clearBg',root).onclick=()=>{ const n=getSettings(); n.bgPhoto=null; applySettings(n,true); $('#bgUrl',root).value=''; };
  $('#saveSettings',root).onclick=()=>{ const n={theme:$('#setTheme',root).value,fontSize:+($('#setFont',root).value||16),arabicSize:+($('#setArabic',root).value||28),overlay:+($('#setOverlay',root).value||0.55),bgPhoto:($('#bgUrl',root).value.trim()||null)}; applySettings(n,true); $('#modal').style.display='none'; };
}
function panelsUI(){return `<div class="card"><div class="row"><button class="secondary" id="openLeft">Открыть левую</button><button class="secondary" id="openRight">Открыть правую</button></div><div class="muted small" style="margin-top:10px">Подсказка: <span class="kbd">Esc</span> закрывает окно.</div></div>`;}
function wirePanels(root){ $('#openLeft',root).onclick=()=>{togglePanel('left',true);$('#modal').style.display='none';}; $('#openRight',root).onclick=()=>{togglePanel('right',true);$('#modal').style.display='none';}; }

// ---- Tajweed ----
function tajLeftUI(){
  return `
  <div class="card">
    <div class="muted small">Разделы</div>
    <div class="list" id="blockList" style="margin-top:8px"></div>
    <hr class="sep"/>
    <div class="row">
      <button class="secondary" id="openSettings">Оформление</button>
      <button class="secondary" id="openPanels">Панели</button>
    </div>
  </div>`;
}
function wireTajLeft(root){
  const list=$('#blockList',root); list.innerHTML='';
  TAJWEED_BLOCKS.forEach(b=>{ const btn=document.createElement('button'); btn.className='item'; btn.textContent=b.title;
    btn.onclick=()=>{state.blockId=b.id; render();}; if(b.id===state.blockId) btn.style.borderColor='rgba(125,211,166,.45)'; list.appendChild(btn);
  });
  $('#openSettings',root).onclick=()=>openModal('settings');
  $('#openPanels',root).onclick=()=>openModal('panels');
}
function tajBlockUI(block){
  const notes=getNotes(); const nk=noteKey('block',block.id); const saved=notes[nk]||'';
  const sections=block.sections.map(s=>`<h3 style="margin:6px 0 8px;font-size:16px">${escapeHtml(s.h)}</h3><div class="muted" style="line-height:1.65">${escapeHtml(s.p)}</div><hr class="sep"/>`).join('');
  return `
  <div class="card">
    ${sections}
    <div class="row">
      <button class="secondary" id="openQuiz">Мини-тест</button>
      <button class="secondary" id="markDone">Отметить пройдено</button>
      <button class="secondary" id="openExam">Экзамен</button>
    </div>
  </div>
  <div class="card">
    <label>Мои заметки по теме</label>
    <textarea id="blockNote" placeholder="Пиши сюда — сохраняется автоматически…">${escapeHtml(saved)}</textarea>
    <div class="muted small">Автосохранение. Потом найдёшь в «Заметках».</div>
  </div>
  <div class="card" id="quizCard" style="display:none"></div>
  <div class="card" id="examCard" style="display:none"></div>`;
}
function quizCardUI(title,questions){
  return `<div class="muted small">${escapeHtml(title)}</div>
    <div class="list" id="qList" style="margin-top:10px"></div>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="qCheck">Проверить</button>
      <span class="badge" id="qRes" style="display:none"></span>
    </div>`;
}
function wireQuizCard(card,title,questions,onDone){
  card.innerHTML=quizCardUI(title,questions);
  const list=$('#qList',card); list.innerHTML='';
  questions.forEach((qq,i)=>{
    const div=document.createElement('div'); div.className='card';
    div.innerHTML=`<div style="font-weight:800;margin-bottom:8px">${i+1}. ${escapeHtml(qq.q)}</div>
      ${qq.options.map((o,oi)=>`<label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="radio" name="q${i}" value="${oi}" style="width:auto;margin-top:3px"/><span>${escapeHtml(o)}</span></label>`).join('')}
      <div class="muted small" id="exp${i}" style="display:none;margin-top:6px"></div>`;
    list.appendChild(div);
  });
  $('#qCheck',card).onclick=()=>{
    let score=0;
    questions.forEach((qq,i)=>{
      const sel=card.querySelector(`input[name="q${i}"]:checked`);
      const exp=$(`#exp${i}`,card);
      if(!sel){ exp.style.display='block'; exp.textContent='Выбери вариант.'; return; }
      const ans=+sel.value; if(ans===qq.answer) score++;
      exp.style.display='block'; exp.textContent=(ans===qq.answer?'✅ ':'❌ ')+qq.explain;
    });
    const b=$('#qRes',card); b.style.display='inline-flex'; b.textContent=`Результат: ${score}/${questions.length}`;
    bumpStreak(); onDone?.(score);
  };
}
function wireTajBlock(root,block){
  const notes=getNotes(); const nk=noteKey('block',block.id);
  $('#blockNote',root).oninput=e=>{ notes[nk]=e.target.value; setNotes(notes); };
  $('#markDone',root).onclick=()=>{ const p=getProgress(); p.blocks[block.id]=p.blocks[block.id]||{completed:false,bestScore:0}; p.blocks[block.id].completed=true; setProgress(p); bumpStreak(); toast('Отмечено ✅'); };
  $('#openQuiz',root).onclick=()=>{
    const quiz=QUIZZES.find(q=>q.id===`quiz_${block.id}`);
    const card=$('#quizCard',root); card.style.display='block';
    wireQuizCard(card,quiz.title,quiz.questions,(score)=>{ const p=getProgress(); p.blocks[block.id]=p.blocks[block.id]||{completed:false,bestScore:0}; p.blocks[block.id].bestScore=Math.max(p.blocks[block.id].bestScore,score); setProgress(p); });
    card.scrollIntoView({behavior:'smooth',block:'start'});
  };
  $('#openExam',root).onclick=()=>{
    const exam=EXAMS[0];
    const card=$('#examCard',root); card.style.display='block';
    wireQuizCard(card,exam.title,exam.questions,(score)=>{ const p=getProgress(); p.exams[exam.id]=Math.max(p.exams[exam.id]||0,score); setProgress(p); });
    card.scrollIntoView({behavior:'smooth',block:'start'});
  };
}

// ---- Prayer ----
function prayerLeftUI(){
  return `<div class="card">
    <div class="muted small">Локация</div>
    <div class="row" style="margin-top:8px">
      <div><label>Режим</label><select id="prMode"><option value="auto">Авто (GPS)</option><option value="city">Вручную (город)</option></select></div>
      <div><label>Метод</label><select id="prMethod"><option value="2">ISNA</option><option value="3">MWL</option><option value="4">Umm al-Qura</option><option value="5">Egyptian</option><option value="1">Karachi</option></select></div>
      <div><label>Аср</label><select id="prSchool"><option value="0">Шафи</option><option value="1">Ханафи</option></select></div>
    </div>
    <div class="row" style="margin-top:10px" id="cityRow">
      <div><label>Страна</label><input id="prCountry" placeholder="например, Russia"/></div>
      <div><label>Город</label><input id="prCity" placeholder="например, Moscow"/></div>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="prRefresh">Обновить</button>
      <button class="secondary" id="prSettings">Оформление</button>
    </div>
    <div class="muted small" style="margin-top:10px">Если GPS блокируется — выбери «Вручную (город)».</div>
  </div>`;
}
function wirePrayerLeft(root){
  Object.assign(state.prayer, store.get(keys.prayer,state.prayer));
  $('#prMode',root).value=state.prayer.mode;
  $('#prMethod',root).value=String(state.prayer.method);
  $('#prSchool',root).value=String(state.prayer.school);
  $('#prCountry',root).value=state.prayer.country;
  $('#prCity',root).value=state.prayer.city;
  const cityRow=$('#cityRow',root); cityRow.style.display=state.prayer.mode==='city'?'flex':'none';
  $('#prMode',root).onchange=()=>{ state.prayer.mode=$('#prMode',root).value; cityRow.style.display=state.prayer.mode==='city'?'flex':'none'; store.set(keys.prayer,state.prayer); };
  $('#prMethod',root).onchange=()=>{ state.prayer.method=+$('#prMethod',root).value; store.set(keys.prayer,state.prayer); };
  $('#prSchool',root).onchange=()=>{ state.prayer.school=+$('#prSchool',root).value; store.set(keys.prayer,state.prayer); };
  $('#prCountry',root).oninput=()=>{ state.prayer.country=$('#prCountry',root).value; store.set(keys.prayer,state.prayer); };
  $('#prCity',root).oninput=()=>{ state.prayer.city=$('#prCity',root).value; store.set(keys.prayer,state.prayer); };
  $('#prRefresh',root).onclick=()=>fetchPrayerTimes();
  $('#prSettings',root).onclick=()=>openModal('settings');
}
function prayerRightUI(){
  return `<div class="card">
    <div class="row">
      <div><div class="muted small">Сегодня</div><div style="font-size:22px;font-weight:900" id="prToday">—</div></div>
      <div><div class="muted small">Следующий</div><div style="font-size:22px;font-weight:900" id="prNext">—</div><div class="muted small" id="prCountdown">—</div></div>
    </div>
    <hr class="sep"/><div id="prTable" class="list"></div>
  </div>
  <div class="card">
    <div class="row">
      <div><label>Уведомления</label><select id="prNotify"><option value="off">Выключены</option><option value="on">Включить</option></select></div>
      <div><label>Напоминать за (мин)</label><input id="prRemind" type="number" min="0" max="60"/></div>
      <div style="display:flex;align-items:end"><button class="secondary" id="prTest">Тест</button></div>
    </div>
    <div class="muted small" style="margin-top:10px">Лучше работает, если приложение установлено как PWA.</div>
  </div>`;
}
let countdownTimer=null;
async function requestNotif(){
  if(!('Notification'in window)){ toast('Уведомления не поддерживаются'); return false; }
  if(Notification.permission==='granted') return true;
  const p=await Notification.requestPermission(); return p==='granted';
}
function showNotif(title,body){ try{ if(Notification.permission==='granted') new Notification(title,{body}); }catch{} }
function wirePrayerRight(root){
  $('#prRemind',root).value=state.prayer.remindMins;
  $('#prNotify',root).value=state.prayer.notify?'on':'off';
  $('#prRemind',root).onchange=()=>{ state.prayer.remindMins=+($('#prRemind',root).value||0); store.set(keys.prayer,state.prayer); };
  $('#prNotify',root).onchange=async()=>{
    const want=$('#prNotify',root).value==='on';
    if(want){ const ok=await requestNotif(); if(!ok){ $('#prNotify',root).value='off'; state.prayer.notify=false; } else state.prayer.notify=true; }
    else state.prayer.notify=false;
    store.set(keys.prayer,state.prayer);
  };
  $('#prTest',root).onclick=()=>showNotif('Тест уведомления','Если видно — всё ок ✅');
  fetchPrayerTimes();
}
function getGeo(){ return new Promise((res,rej)=>{ if(!navigator.geolocation) return rej(); navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:10000}); }); }
async function fetchPrayerTimes(){
  const out=$('#prTable'); if(!out) return;
  out.innerHTML='<div class="muted">Загружаю…</div>';
  try{
    const d=new Date(); const dateStr=String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();
    let url='';
    if(state.prayer.mode==='auto'){ const pos=await getGeo(); url=`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&method=${state.prayer.method}&school=${state.prayer.school}`; }
    else{ const city=encodeURIComponent(state.prayer.city.trim()||'New York'); const country=encodeURIComponent(state.prayer.country.trim()||'United States'); url=`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=${country}&method=${state.prayer.method}&school=${state.prayer.school}`; }
    const res=await fetch(url,{cache:'no-store'}); const js=await res.json(); const t=js?.data?.timings; if(!t) throw new Error();
    const tz=js?.data?.meta?.timezone||''; $('#prToday').textContent = (state.prayer.mode==='auto'?'GPS':'Город')+' • '+tz;
    const order=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha']; out.innerHTML='';
    order.forEach(k=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<div class="row"><div style="font-weight:900">${k}</div><div style="text-align:right;font-weight:900">${t[k]}</div></div>`; out.appendChild(c); });
    setupNextPrayer(t);
  }catch(e){
    out.innerHTML='<div class="card"><div style="font-weight:900">Не удалось загрузить</div><div class="muted small" style="margin-top:6px">Проверь интернет и доступ к геолокации.</div></div>';
  }
}
function setupNextPrayer(t){
  if(countdownTimer) clearInterval(countdownTimer);
  const now=new Date();
  const parse=(s)=>{ const m=String(s).match(/(\d{1,2}):(\d{2})/); if(!m) return null; const d=new Date(); d.setHours(+m[1],+m[2],0,0); return d; };
  const order=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha']; let nextName=null,nextTime=null;
  for(const n of order){ const dt=parse(t[n]); if(dt && dt>now){ nextName=n; nextTime=dt; break; } }
  if(!nextTime){ nextName='Fajr (завтра)'; nextTime=parse(t['Fajr']); if(nextTime) nextTime.setDate(nextTime.getDate()+1); }
  $('#prNext').textContent=`${nextName} • ${t[nextName.startsWith('Fajr')?'Fajr':nextName]||''}`;
  countdownTimer=setInterval(()=>{
    const diff=nextTime-new Date();
    if(diff<=0){ $('#prCountdown').textContent='Сейчас'; if(state.prayer.notify) showNotif('Время намаза',`Наступило: ${nextName}`); clearInterval(countdownTimer); fetchPrayerTimes(); return; }
    const mins=Math.floor(diff/60000); const hrs=Math.floor(mins/60); const mm=mins%60; $('#prCountdown').textContent=`через ${hrs}ч ${mm}м`;
    if(state.prayer.notify && state.prayer.remindMins>0 && mins===state.prayer.remindMins && (diff%60000)<1100) showNotif('Скоро намаз',`Через ${state.prayer.remindMins} минут: ${nextName}`);
  },1000);
}

// ---- Azkar ----
function azkarLeftUI(){
  return `<div class="card"><div class="muted small">Категории</div><div class="list" id="azCats" style="margin-top:8px"></div><hr class="sep"/><div class="row"><button class="secondary" id="azSettings">Оформление</button><button class="secondary" id="azNotes">Заметки</button></div></div>`;
}
function wireAzkarLeft(root){
  const list=$('#azCats',root); list.innerHTML='';
  AZKAR.categories.forEach(c=>{ const b=document.createElement('button'); b.className='item'; b.textContent=c.title; b.onclick=()=>{state.azCat=c.id; render();}; if(c.id===state.azCat) b.style.borderColor='rgba(125,211,166,.45)'; list.appendChild(b); });
  $('#azSettings',root).onclick=()=>openModal('settings');
  $('#azNotes',root).onclick=()=>setTab('notes');
}
function azkarRightUI(){
  const cat=AZKAR.categories.find(c=>c.id===state.azCat)||AZKAR.categories[0];
  return `<div class="card"><div class="muted small">${escapeHtml(cat.title)}</div><div id="azItems" class="list" style="margin-top:10px"></div></div>`;
}
function wireAzkarRight(root){
  const cat=AZKAR.categories.find(c=>c.id===state.azCat)||AZKAR.categories[0];
  const s=store.get(keys.azkar,{counts:{},fav:{},notes:{}});
  const list=$('#azItems',root); list.innerHTML='';
  cat.items.forEach(it=>{
    const key=it.id, count=s.counts[key]||0, fav=!!s.fav[key], note=s.notes[key]||'';
    const c=document.createElement('div'); c.className='card';
    c.innerHTML=`<div class="row"><div class="ar" style="flex:2">${escapeHtml(it.ar)}</div>
      <div style="text-align:right"><span class="badge">${count}/${it.goal}</span> <button class="iconBtn" data-fav="${key}">${fav?'★':'☆'}</button></div></div>
      <div class="muted" style="margin-top:6px;line-height:1.6">${escapeHtml(it.ru)}</div>
      <div class="row" style="margin-top:10px"><button class="secondary" data-dec="${key}">−</button><button class="primary" data-inc="${key}">+</button><button class="secondary" data-reset="${key}">Сброс</button></div>
      <div style="margin-top:10px"><label>Заметка</label><textarea data-note="${key}">${escapeHtml(note)}</textarea></div>`;
    list.appendChild(c);
  });
  list.onclick=(e)=>{
    const inc=e.target.getAttribute('data-inc'); const dec=e.target.getAttribute('data-dec'); const reset=e.target.getAttribute('data-reset'); const fav=e.target.getAttribute('data-fav');
    if(inc){ s.counts[inc]=(s.counts[inc]||0)+1; store.set(keys.azkar,s); bumpStreak(); render(); }
    if(dec){ s.counts[dec]=Math.max(0,(s.counts[dec]||0)-1); store.set(keys.azkar,s); render(); }
    if(reset){ s.counts[reset]=0; store.set(keys.azkar,s); render(); }
    if(fav){ s.fav[fav]=!s.fav[fav]; store.set(keys.azkar,s); render(); }
  };
  list.oninput=(e)=>{ const k=e.target.getAttribute('data-note'); if(!k) return; s.notes[k]=e.target.value; store.set(keys.azkar,s); };
}

// ---- Notes ----
let notesFilter='all', notesQuery='';
function notesLeftUI(){
  return `<div class="card"><div class="muted small">Поиск</div><input id="notesSearch" placeholder="найти по словам…"/><hr class="sep"/>
    <div class="row"><button class="secondary" id="nfAll">Все</button><button class="secondary" id="nfTaj">Таджвид</button><button class="secondary" id="nfAz">Азкары</button><button class="secondary" id="nfQ">Коран</button></div></div>`;
}
function wireNotesLeft(root){
  $('#notesSearch',root).value=notesQuery;
  $('#notesSearch',root).oninput=()=>{ notesQuery=$('#notesSearch',root).value; render(); };
  $('#nfAll',root).onclick=()=>{notesFilter='all'; render();};
  $('#nfTaj',root).onclick=()=>{notesFilter='block'; render();};
  $('#nfAz',root).onclick=()=>{notesFilter='azkar'; render();};
  $('#nfQ',root).onclick=()=>{notesFilter='quran'; render();};
}
function notesRightUI(){
  const notes=getNotes();
  const az=store.get(keys.azkar,{notes:{}});
  const entries=[];
  for(const [k,v] of Object.entries(notes)) entries.push({scope:k.split(':')[0],id:k.split(':')[1],text:v,raw:k});
  for(const [k,v] of Object.entries(az.notes||{})) entries.push({scope:'azkar',id:k,text:v,raw:`azkar:${k}`});
  const q=notesQuery.trim().toLowerCase();
  const filtered=entries.filter(e=>e.text?.trim() && (notesFilter==='all'||e.scope===notesFilter) && (!q||e.text.toLowerCase().includes(q)));
  return `<div class="card"><div class="muted small">Найдено: ${filtered.length}</div><div id="notesList" class="list" style="margin-top:10px"></div></div>`;
}
function wireNotesRight(root){
  const notes=getNotes();
  const az=store.get(keys.azkar,{notes:{}});
  const entries=[];
  for(const [k,v] of Object.entries(notes)) entries.push({scope:k.split(':')[0],id:k.split(':')[1],text:v,raw:k});
  for(const [k,v] of Object.entries(az.notes||{})) entries.push({scope:'azkar',id:k,text:v,raw:`azkar:${k}`});
  const q=notesQuery.trim().toLowerCase();
  const filtered=entries.filter(e=>e.text?.trim() && (notesFilter==='all'||e.scope===notesFilter) && (!q||e.text.toLowerCase().includes(q)));
  const list=$('#notesList',root); list.innerHTML='';
  filtered.forEach(e=>{
    let title='Заметка';
    if(e.scope==='block') title=TAJWEED_BLOCKS.find(b=>b.id===e.id)?.title||'Таджвид';
    if(e.scope==='quran') title='Коран: '+e.id;
    if(e.scope==='azkar') title='Азкар: '+e.id;
    const c=document.createElement('div'); c.className='card';
    c.innerHTML=`<div class="muted small">${escapeHtml(title)}</div><div style="white-space:pre-wrap;line-height:1.6;margin-top:8px">${escapeHtml(e.text)}</div>`;
    list.appendChild(c);
  });
}

// ---- Quran ----
function quranLeftUI(){
  return `<div class="card">
    <div class="muted small">Настройки чтения</div>
    <div class="row" style="margin-top:8px">
      <div><label>Арабский</label><select id="qAr"><option value="quran-uthmani">Uthmani</option><option value="quran-simple">Simple</option></select></div>
      <div><label>Перевод RU</label><select id="qRu"><option value="ru.kuliev">Кулиев</option><option value="ru.porokhova">Порохова</option></select></div>
    </div>
    <div class="row" style="margin-top:10px"><button class="primary" id="qLoad">Открыть суру</button><button class="secondary" id="qSettings">Оформление</button></div>
    <hr class="sep"/><div class="muted small">Суры (78–114)</div><div id="qSurahs" class="list" style="margin-top:8px"></div>
  </div>`;
}
function wireQuranLeft(root){
  const cache=store.get(keys.quranCache,null); if(cache) state.quran.cache=cache;
  $('#qAr',root).value=state.quran.arabicEdition; $('#qRu',root).value=state.quran.ruEdition;
  $('#qAr',root).onchange=()=>{state.quran.arabicEdition=$('#qAr',root).value; render();};
  $('#qRu',root).onchange=()=>{state.quran.ruEdition=$('#qRu',root).value; render();};
  $('#qSettings',root).onclick=()=>openModal('settings');
  const list=$('#qSurahs',root); list.innerHTML='';
  for(let i=78;i<=114;i++){ const b=document.createElement('button'); b.className='item'; b.textContent='Сура '+i; b.onclick=()=>{state.quran.selectedSurah=i; state.quran.selectedAyah=1; state.quran.wordIndex=0; render();}; if(i===state.quran.selectedSurah) b.style.borderColor='rgba(125,211,166,.45)'; list.appendChild(b); }
  $('#qLoad',root).onclick=()=>loadSurah(state.quran.selectedSurah);
}
function quranRightUI(){
  return `<div class="card">
    <div class="row"><div><div class="muted small">Сура</div><div style="font-size:20px;font-weight:900" id="qTitle">—</div></div>
      <div style="text-align:right"><button class="secondary" id="qRefresh">Обновить</button></div></div>
    <hr class="sep"/><div class="ar" id="qAyat"></div>
    <div class="muted" id="qRuText" style="margin-top:12px;line-height:1.8"></div>
  </div>
  <div class="card">
    <div class="muted small">Подсказка по таджвиду (кликни по слову)</div>
    <div id="qHints" class="list" style="margin-top:10px"></div>
    <div style="margin-top:10px"><label>Моя заметка</label><textarea id="qNote" placeholder="Например: здесь мадд… потому что…"></textarea></div>
  </div>`;
}
function wireQuranRight(root){ $('#qRefresh',root).onclick=()=>loadSurah(state.quran.selectedSurah); loadSurah(state.quran.selectedSurah); }

async function loadSurah(id){
  const arEl=$('#qAyat'), ruEl=$('#qRuText'), titleEl=$('#qTitle'); if(!arEl) return;
  arEl.innerHTML='<span class="muted">Загружаю…</span>'; ruEl.textContent='';
  try{
    const key=`${id}|${state.quran.arabicEdition}|${state.quran.ruEdition}`;
    let p=state.quran.cache[key];
    if(!p){
      const arUrl=`https://api.alquran.cloud/v1/surah/${id}/${state.quran.arabicEdition}`;
      const ruUrl=`https://api.alquran.cloud/v1/surah/${id}/${state.quran.ruEdition}`;
      const [arRes,ruRes]=await Promise.all([fetch(arUrl,{cache:'no-store'}),fetch(ruUrl,{cache:'no-store'})]);
      const ar=await arRes.json(); const ru=await ruRes.json();
      p={name:ar.data.name,enName:ar.data.englishName,arabic:ar.data.ayahs.map(a=>({n:a.numberInSurah,text:a.text})),russian:ru.data.ayahs.map(a=>({n:a.numberInSurah,text:a.text}))};
      state.quran.cache[key]=p; store.set(keys.quranCache,state.quran.cache);
    }
    titleEl.textContent=`${p.name} • ${p.enName}`;
    renderAyat(p);
    setAyah(p,state.quran.selectedAyah||1,state.quran.wordIndex||0);
  }catch{ arEl.innerHTML='<span class="muted">Не удалось загрузить Коран. Проверь интернет.</span>'; }
}
function renderAyat(p){
  const arEl=$('#qAyat'); arEl.innerHTML='';
  p.arabic.forEach(a=>{
    const wrap=document.createElement('span');
    const words=a.text.trim().split(/\s+/);
    wrap.innerHTML=words.map((w,i)=>`<span class="word" data-ayah="${a.n}" data-i="${i}">${escapeHtml(w)}</span>`).join(' ') + ` <span class="badge">${a.n}</span> `;
    arEl.appendChild(wrap);
  });
  arEl.onclick=e=>{
    const w=e.target.closest('.word'); if(!w) return;
    $$('.word',arEl).forEach(x=>x.classList.remove('sel')); w.classList.add('sel');
    const ayah=+w.dataset.ayah, idx=+w.dataset.i;
    setAyah(p,ayah,idx);
  };
}
function setAyah(p,ayah,idx){
  state.quran.selectedAyah=ayah; state.quran.wordIndex=idx;
  const ru=p.russian.find(x=>x.n===ayah)?.text||''; $('#qRuText').textContent=ru;
  const atext=p.arabic.find(x=>x.n===ayah)?.text||''; const words=atext.trim().split(/\s+/);
  const word=words[idx]||words[0]||''; const next=words[idx+1]||'';
  const hints=analyze(word,next); renderHints(word,hints);
  const notes=getNotes(); const nk=noteKey('quran',`${state.quran.selectedSurah}:${ayah}:${idx}`);
  const area=$('#qNote'); area.value=notes[nk]||''; area.oninput=()=>{ notes[nk]=area.value; setNotes(notes); };
}
function renderHints(word,hints){
  const list=$('#qHints'); list.innerHTML='';
  const head=document.createElement('div'); head.className='badge'; head.textContent='Слово: '+word; list.appendChild(head);
  if(!hints.length){ const c=document.createElement('div'); c.className='card'; c.innerHTML='<div style="font-weight:900">Пока нет подсказок</div><div class="muted small" style="margin-top:6px">Мы расширим правила и контекстные случаи.</div>'; list.appendChild(c); return; }
  hints.forEach(h=>{ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<div style="font-weight:900">${escapeHtml(h.title)}</div><div class="muted" style="margin-top:6px;line-height:1.6">${escapeHtml(h.desc)}</div>`; list.appendChild(c); });
}
function analyze(w,next){
  const hints=[];
  if(/(ا|و|ي).*[أإؤئء]/.test(w) || /(ا|و|ي).*ء/.test(w)) hints.push({title:'Мадд муттасыль',desc:'Буква мадд + хамза в одном слове → обычно 4–5 харакатов.'});
  if(next && /^[أإؤئء]/.test(next) && /(ا|و|ي)$/.test(w)) hints.push({title:'Мадд мунфасыль',desc:'Буква мадд в конце слова + хамза в начале следующего → 4–5 харакатов.'});
  if(/[ًٌٍ]/.test(w) || /نْ/.test(w)){
    const f=next?.[0]||''; const iz='ءهعحغخ', idgG='ينمو', idgN='لر';
    if(iz.includes(f)) hints.push({title:'Изхар',desc:'Буква горла после نْ/тануина → читаем ясно.'});
    else if(idgG.includes(f)) hints.push({title:'Идгъам с гунной',desc:'После نْ/тануина ي/ن/م/و → слияние с гунной.'});
    else if(idgN.includes(f)) hints.push({title:'Идгъам без гунны',desc:'После نْ/тануина ل/ر → слияние без гунны.'});
    else if(f==='ب') hints.push({title:'Икъляб',desc:'Перед ب: ن → م с гунной.'});
    else if(f) hints.push({title:'Ихфа',desc:'Скрытое произношение нуна с гунной.'});
  }
  if(/مْ/.test(w)){
    const f=next?.[0]||''; if(f==='م') hints.push({title:'Идгъам шафавi',desc:'Мим с сукуном перед م → слияние с гунной.'});
    else if(f==='ب') hints.push({title:'Ихфа шафавi',desc:'Мим с сукуном перед ب → скрытие с гунной.'});
    else if(f) hints.push({title:'Изхар шафавi',desc:'Мим с сукуном перед другой буквой → ясно.'});
  }
  if(/[قطبجد]ْ/.test(w)) hints.push({title:'Калькаля',desc:'Буква ق ط ب ج د с сукуном → отскок.'});
  if(w.includes('الل')) hints.push({title:'Лям в «Аллах»',desc:'Твёрдо после фатхи/даммы, мягко после кясры.'});
  const seen=new Set(); return hints.filter(h=>{if(seen.has(h.title)) return false; seen.add(h.title); return true;});
}

// ---- Progress ----
function progressLeftUI(){
  return `<div class="card">
    <div class="muted small">Быстро</div>
    <div class="row" style="margin-top:8px"><button class="primary" id="goExam">Итоговый экзамен</button><button class="secondary" id="goReview">Повторение (10)</button></div>
    <hr class="sep"/><div class="row"><button class="secondary" id="pSettings">Оформление</button></div>
  </div>`;
}
function wireProgressLeft(root){
  $('#goExam',root).onclick=()=>{ state.tab='tajweed'; render(); document.querySelector('#openExam')?.click(); };
  $('#goReview',root).onclick=()=>openReview();
  $('#pSettings',root).onclick=()=>openModal('settings');
}
function progressRightUI(){
  const p=getProgress();
  const done=Object.values(p.blocks||{}).filter(x=>x.completed).length;
  const total=TAJWEED_BLOCKS.length;
  const avg=Math.round((Object.values(p.blocks||{}).reduce((a,b)=>a+(b.bestScore||0),0)/Math.max(1,total))*100/3);
  return `<div class="card">
    <div class="row">
      <div><div class="muted small">Блоки</div><div style="font-size:26px;font-weight:900">${done}/${total}</div></div>
      <div><div class="muted small">Серия дней</div><div style="font-size:26px;font-weight:900">${p.streak.count||0}</div><div class="muted small">${p.streak.lastDay||'—'}</div></div>
      <div><div class="muted small">Средний мини-тест</div><div style="font-size:26px;font-weight:900">${avg}%</div></div>
    </div>
    <hr class="sep"/><div class="muted small">По блокам</div><div id="pList" class="list" style="margin-top:10px"></div>
  </div>
  <div class="card" id="reviewCard" style="display:none"></div>`;
}
function wireProgressRight(root){
  const p=getProgress(); const list=$('#pList',root); list.innerHTML='';
  TAJWEED_BLOCKS.forEach(b=>{ const pb=p.blocks[b.id]||{completed:false,bestScore:0}; const c=document.createElement('div'); c.className='card';
    c.innerHTML=`<div class="row"><div style="font-weight:900">${escapeHtml(b.title)}</div><div style="text-align:right"><span class="badge">${pb.completed?'✅':'—'}</span> <span class="badge">${pb.bestScore||0}/3</span></div></div>`;
    list.appendChild(c);
  });
}
function openReview(){
  setTab('progress');
  const card=$('#reviewCard'); if(!card) return;
  const pool=QUIZZES.flatMap(q=>q.questions);
  const qs=[...pool].sort(()=>Math.random()-0.5).slice(0,10);
  card.style.display='block';
  wireQuizCard(card,'Повторение: 10 вопросов',qs,()=>{});
  card.scrollIntoView({behavior:'smooth',block:'start'});
}

// ---- Init ----
function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`).then(r=>r.update?.()).catch(()=>{});
}
function init(){
  $('#appVersion').textContent='v'+APP_VERSION;
  $$('.nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('#openLeftHeader').onclick=()=>togglePanel('left',true);
  applySettings(getSettings(),false);
  const pr=store.get(keys.prayer,null); if(pr) state.prayer={...state.prayer,...pr};
  setTab('tajweed');
  registerSW();
}
window.addEventListener('load',init);
