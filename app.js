
// --- Error boundary (no-crash) ---
window.addEventListener("error", (e) => {
  try { console.error(e.error || e.message || e); } catch {}
  try {
    const root = document.getElementById("app");
    if (root && !document.getElementById("fatalErrorCard")) {
      const div = document.createElement("div");
      div.id = "fatalErrorCard";
      div.style.cssText = "margin:16px; padding:16px; border:1px solid rgba(255,255,255,.15); border-radius:16px; background:rgba(0,0,0,.25)";
      div.innerHTML = `<div style="font-weight:700; margin-bottom:6px;">Что-то пошло не так</div>
      <div style="opacity:.85; margin-bottom:10px;">Я не даю приложению “упасть”. Обнови страницу (Ctrl+R). Если не помогло — очисть кэш приложения.</div>
      <button id="btnReload" style="padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;">Обновить</button>`;
      root.prepend(div);
      const b = document.getElementById("btnReload"); if (b) b.onclick = () => location.reload();
    }
  } catch {}
});


(() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const STORAGE = {
    settings: "tajweed_settings_v26",
    progress: "tajweed_progress_v26",
    notesPrefix: "tajweed_note_v26_"
  };

  const DEFAULT_SETTINGS = {
    theme: "night",          // night | sand
    fontSize: 16,
    arabicSize: 22,
    arabicFont: "Noto Naskh Arabic",
    // Намаз / уведомления
    prayer: {
      locationMode: "auto", // auto | city
      city: "",
      country: "",
      method: 2, // 2=ISNA (пример). Можно менять
      school: 0, // 0=Shafi, 1=Hanafi
      notifyEnabled: false,
      notifyLeadMin: 10
    },

    background: "none",      // none | mosaic | stars | arabesque | photo
    bgPhoto: ""            // dataURL or https://... for photo background
  };

  const BG = {
    none: { img: "none", repeat:"repeat", size:"auto" },
    mosaic: { img: "radial-gradient(circle at 10px 10px, rgba(232,200,120,.30) 1px, transparent 1.5px), radial-gradient(circle at 30px 22px, rgba(125,211,252,.25) 1px, transparent 1.5px)", repeat:"repeat", size:"40px 40px" },
    stars: { img: "radial-gradient(circle at 5px 5px, rgba(255,255,255,.25) 1px, transparent 1.5px), radial-gradient(circle at 18px 14px, rgba(232,200,120,.22) 1px, transparent 1.5px), radial-gradient(circle at 28px 28px, rgba(125,211,252,.20) 1px, transparent 1.5px)", repeat:"repeat", size:"36px 36px" },
    arabesque: { img: "conic-gradient(from 45deg at 12px 12px, rgba(232,200,120,.20), transparent 25%, rgba(125,211,252,.14) 50%, transparent 75%, rgba(232,200,120,.18))", repeat:"repeat", size:"48px 48px" }
  };

  function loadSettings(){
    // миграция настроек со старых версий (чтобы ничего не "пропало")
    const candidates = [STORAGE.settings, "tajweed_settings_v25", "tajweed_settings_v24", "tajweed_settings_v23"];
    for(const k of candidates){
      const raw = localStorage.getItem(k);
      if(raw){
        try{
          const obj = JSON.parse(raw);
          // если нашли старый ключ — сохраним в новый
          if(k !== STORAGE.settings) localStorage.setItem(STORAGE.settings, raw);
          return { ...DEFAULT_SETTINGS, ...(obj||{}) };
        }catch(e){ /* ignore */ }
      }
    }
    return { ...DEFAULT_SETTINGS };
  }
  function saveSettings(s){
    localStorage.setItem(STORAGE.settings, JSON.stringify(s));
  }
  function applySettings(s){
    const root = document.documentElement;
    root.style.setProperty("--fs", s.fontSize + "px");
    root.style.setProperty("--arfs", s.arabicSize + "px");
    root.style.setProperty("--arfont", `"${s.arabicFont}", "Amiri", "Scheherazade New", serif`);
    if(s.theme === "sand"){
      root.style.setProperty("--bg", "#0b0a07");
      root.style.setProperty("--panel", "#14110b");
      root.style.setProperty("--card", "#14110b");
      root.style.setProperty("--text", "#f3efe4");
      root.style.setProperty("--muted", "#c6bba5");
      root.style.setProperty("--accent", "#f2c97b");
      root.style.setProperty("--accent2", "#7dd3fc");
      root.style.setProperty("--border", "rgba(255,255,255,.10)");
    } else {
      // night defaults are in CSS; keep.
      root.style.setProperty("--bg", "#0c0f14");
      root.style.setProperty("--panel", "#111826");
      root.style.setProperty("--card", "#0f1724");
      root.style.setProperty("--text", "#e8eefc");
      root.style.setProperty("--muted", "#9bb0d0");
      root.style.setProperty("--accent", "#e8c878");
      root.style.setProperty("--accent2", "#7dd3fc");
      root.style.setProperty("--border", "rgba(255,255,255,.08)");
    }
    let b;
    if(s.background === "photo"){
      const src = (s.bgPhoto || "").trim();
      const safe = src.replace(/"/g, "%22");
      b = { img: src ? `url("${safe}")` : "none", repeat: "no-repeat", size: "cover", pos: "center" };
    } else {
      b = BG[s.background] || BG.none;
    }
    root.style.setProperty("--bg-img", b.img);
    root.style.setProperty("--bg-repeat", b.repeat);
    root.style.setProperty("--bg-size", b.size);
    root.style.setProperty("--bg-pos", b.pos || "center");
  }

  function loadProgress(){
    const candidates = [STORAGE.progress, "tajweed_progress_v25", "tajweed_progress_v24", "tajweed_progress_v23"];
    for(const k of candidates){
      const raw = localStorage.getItem(k);
      if(raw){
        try{
          const obj = JSON.parse(raw) || { completed: {} };
          if(k !== STORAGE.progress) localStorage.setItem(STORAGE.progress, JSON.stringify(obj));
          return obj;
        }catch(e){ /* ignore */ }
      }
    }
    return { completed: {} };
  }
  function saveProgress(p){
    localStorage.setItem(STORAGE.progress, JSON.stringify(p));
  }

  function getNote(lessonId){
    return localStorage.getItem(STORAGE.notesPrefix + lessonId) || "";
  }
  function setNote(lessonId, txt){
    localStorage.setItem(STORAGE.notesPrefix + lessonId, txt);
  }

  // Data
  const blocks = (window.TAJWEED_BLOCKS || []);
  const tests = (window.TAJWEED_TESTS || {});
  const exams = (window.TAJWEED_EXAMS || {});

  // UI state
  let settings = loadSettings();
  let progress = loadProgress();
  let current = { blockId: null, lessonId: null, mode: "lesson" }; // lesson | quiz | trainer | settings | exam | prayer | adhkar
  let filter = { q: "", activePill: "all" };

  const pills = [
    {id:"all", label:"Все"},
    {id:"lesson", label:"Теория"},
    {id:"quiz", label:"Мини‑тест"},
    {id:"trainer", label:"Тренажёр"},
    {id:"exam", label:"Экзамены"},
    {id:"prayer", label:"Намаз"},
    {id:"adhkar", label:"Азкары"},
    {id:"quran", label:"Коран (30 джузов)"},
    {id:"notes", label:"Заметки"},
    {id:"progress", label:"Прогресс"},
    {id:"review", label:"Повторение"},
    {id:"settings", label:"Настройки"}
  ];

  // Helpers
  const findLesson = (lessonId) => {
    for(const b of blocks){
      for(const l of b.lessons){
        if(l.id === lessonId) return { block: b, lesson: l };
      }
    }
    return null;
  };

  const firstLesson = () => blocks?.[0]?.lessons?.[0]?.id || null;

  function setHash(parts){
    const h = "#" + parts.filter(Boolean).join("/");
    if(location.hash !== h) location.hash = h;
  }

  function parseHash(){
    const raw = (location.hash || "").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    // formats:
    // #lesson/<lessonId>
    // #quiz/<blockId>
    // #trainer
    // #settings
    // #exam/<blockId|final>
    if(parts[0] === "quiz"){
      return { mode:"quiz", blockId: parts[1] || "b2", lessonId:null };
    }
    if(parts[0] === "trainer"){
      return { mode:"trainer", blockId:null, lessonId:null };
    }
    if(parts[0] === "prayer"){
      return { mode:"prayer" };
    }
    if(parts[0] === "adhkar"){
      return { mode:"adhkar" };
    }
    if(parts[0] === "quran"){
      return { mode:"quran" };
    }
    if(parts[0] === "notes"){
      return { mode:"notes" };
    }
    if(parts[0] === "progress"){
      return { mode:"progress" };
    }
    if(parts[0] === "review"){
      return { mode:"review" };
    }
    if(parts[0] === "settings"){
      return { mode:"settings", blockId:null, lessonId:null };
    }
    if(parts[0] === "exam"){
      return { mode:"exam", blockId: parts[1] || "final", lessonId:null };
    }
    if(parts[0] === "lesson"){
      const lessonId = parts[1] || firstLesson();
      const fl = findLesson(lessonId);
      return { mode:"lesson", blockId: fl?.block?.id || null, lessonId };
    }
    // default
    const lessonId = firstLesson();
    const fl = findLesson(lessonId);
    return { mode:"lesson", blockId: fl?.block?.id || null, lessonId };
  }

  // Rendering
  function renderSidebar(){
    $("#pillRow").innerHTML = pills.map(p => `
      <div class="pill ${filter.activePill===p.id?'active':''}" data-pill="${p.id}">${p.label}</div>
    `).join("");

    const q = filter.q.trim().toLowerCase();
    const wrap = $("#blocksWrap");
    wrap.innerHTML = "";

    blocks.forEach((b, bi) => {
      // filter by search
      const lessons = b.lessons.filter(l => {
        if(!q) return true;
        const hay = (b.title + " " + l.title + " " + (l.arabicTitle||"") + " " + (l.content||"")).toLowerCase();
        return hay.includes(q);
      });

      if(q && lessons.length === 0) return;

      const blockEl = document.createElement("div");
      blockEl.className = "block";
      blockEl.innerHTML = `
        <div class="blockTitle">
          <span>${b.title}</span>
          <span class="small">${lessons.length}/${b.lessons.length}</span>
        </div>
        <div class="lessonList">
          ${lessons.map((l, li) => {
            const isActive = current.mode==="lesson" && current.lessonId===l.id;
            const done = !!progress.completed[l.id];
            const hint = (l.arabicTitle ? l.arabicTitle : "—");
            return `
              <div class="lessonBtn ${isActive?'active':''}" data-lesson="${l.id}">
                <div class="idx">${done ? "✓" : (li+1)}</div>
                <div class="meta">
                  <div class="title">${l.title}</div>
                  <div class="hint">${hint}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
      wrap.appendChild(blockEl);
    });
  }

  function renderHero(){
    const hero = $("#hero");
    const title = (current.mode==="lesson") ? "Учебное приложение по таджвиду" :
                  (current.mode==="quiz") ? "Мини‑тесты" :
                  (current.mode==="trainer") ? "Тренажёр" :
                  (current.mode==="exam") ? "Экзамены" :
                  (current.mode==="prayer") ? "Время намаза" :
                  (current.mode==="adhkar") ? "Азкары" :
                  (current.mode==="quran") ? "Коран (30 джузов)" :
                  (current.mode==="notes") ? "Заметки" :
                  (current.mode==="progress") ? "Прогресс" :
                  (current.mode==="review") ? "Повторение" :
                  "Настройки";
    const desc = (current.mode==="lesson")
  ? "Открывай тему, делай заметки, проходи мини‑тест и экзамены. Всё сохраняется."
  : (current.mode==="quiz")
  ? "Короткие тесты по каждому блоку: быстрая проверка понимания."
  : (current.mode==="trainer")
  ? "Случайные задания: угадай правило/термин/категорию. Отлично для закрепления."
  : (current.mode==="exam")
  ? "Экзамены по блокам и итоговый экзамен по всему курсу."
  : (current.mode==="prayer")
  ? "Часы намаза по твоей локации/городу, выбор метода расчёта и напоминания."
  : (current.mode==="adhkar")
  ? "Азкары по категориям + быстрые повторы и счётчик."
  : (current.mode==="quran")
  ? "30-й джуз: арабский текст + перевод, клики по словам, подсказки и заметки."
  : (current.mode==="notes")
  ? "Единый раздел заметок: таджвид / Коран / азкары + поиск и фильтры."
  : (current.mode==="progress")
  ? "Прогресс обучения: завершённые темы, серия дней, результаты тестов."
  : (current.mode==="review")
  ? "Повторение: закрепляй темы и возвращайся к сложным моментам."
  : "Шрифт, размер, фон, тема — подстрой приложение под себя.";
    hero.innerHTML = `
      <div class="hero card">
        <div class="topbar">
          <div>
            <h2>${title}</h2>
            <p>${desc}</p>
          </div>
          <div class="actions">
            <button class="btn" id="btnLesson">Теория</button>
            <button class="btn" id="btnQuiz">Мини‑тест</button>
            <button class="btn" id="btnTrainer">Тренажёр</button>
            <button class="btn" id="btnExam">Экзамены</button>
            <button class="btn primary" id="btnSettings">Настройки</button>
          </div>
        </div>
      </div>
    `;
    { const __el = $("#btnLesson"); if(__el) __el.onclick = () => { filter.activePill="lesson"; setHash(["lesson", current.lessonId || firstLesson()]); }; }
    { const __el = $("#btnQuiz"); if(__el) __el.onclick = () => { filter.activePill="quiz"; setHash(["quiz", current.blockId || "b2"]); }; }
    { const __el = $("#btnTrainer"); if(__el) __el.onclick = () => { filter.activePill="trainer"; setHash(["trainer"]); }; }
    { const __el = $("#btnExam"); if(__el) __el.onclick = () => { filter.activePill="exam"; setHash(["exam","final"]); }; }
    { const __el = $("#btnPrayer"); if(__el) __el.onclick = () => { filter.activePill="prayer"; setHash(["prayer"]); }; }
    { const __el = $("#btnAdhkar"); if(__el) __el.onclick = () => { filter.activePill="adhkar"; setHash(["adhkar"]); }; }
    { const __el = $("#btnSettings"); if(__el) __el.onclick = () => { filter.activePill="settings"; setHash(["settings"]); }; }
  }

  function renderLesson(){
    const panel = $("#mainPanel");
    const found = findLesson(current.lessonId);
    if(!found){
      panel.innerHTML = `<div class="card content"><h3>Не найдено</h3><p class="muted">Тема не найдена.</p></div>`;
      return;
    }
    const {block, lesson} = found;
    const done = !!progress.completed[lesson.id];
    panel.innerHTML = `
      <div class="grid2">
        <div class="card content">
          <h3>${block.title} • ${lesson.title}</h3>
          ${lesson.arabicTitle ? `<div class="ar">${lesson.arabicTitle}</div>` : ``}
          <div class="ru">${lesson.content}</div>
          <div class="hr"></div>
          <div class="actions">
            <button class="btn primary" id="markDone">${done ? "Отмечено ✓" : "Отметить как пройдено"}</button>
            <button class="btn" id="goMiniQuiz">Мини‑тест по блоку</button>
            <button class="btn" id="goExam">Экзамен по блоку</button>
          </div>
          <div class="result" id="lessonStatus">${done ? "Тема отмечена как пройденная." : "Отметь тему, когда будешь уверена."}</div>
        </div>
        <div class="card noteBox">
          <h3 style="margin:0 0 10px; font-size:16px;">Мои заметки</h3>
          <textarea id="noteArea" placeholder="Пиши свои заметки по этой теме..."></textarea>
          <div class="noteRow">
            <div class="badge" id="noteSaved">Сохраняется автоматически</div>
            <div class="actions">
              <button class="btn" id="clearNote">Очистить</button>
            </div>
          </div>
          <div class="hr"></div>
          <div class="small">Подсказка: заметки сохраняются на этом устройстве (localStorage).</div>
        </div>
      </div>
    `;

    // note
    const ta = $("#noteArea");
    ta.value = getNote(lesson.id);
    let t;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        setNote(lesson.id, ta.value);
        $("#noteSaved").textContent = "Сохранено ✓";
        setTimeout(()=> $("#noteSaved").textContent = "Сохраняется автоматически", 900);
      }, 250);
    });
    $("#clearNote").onclick = () => {
      ta.value = "";
      setNote(lesson.id, "");
      $("#noteSaved").textContent = "Очищено";
      setTimeout(()=> $("#noteSaved").textContent = "Сохраняется автоматически", 900);
    };

    $("#markDone").onclick = () => {
      progress.completed[lesson.id] = true;
      saveProgress(progress);
      renderSidebar();
      renderLesson();
    };

    { const __el = $("#goMiniQuiz"); if(__el) __el.onclick = () => setHash(["quiz", block.id]); }
    { const __el = $("#goExam"); if(__el) __el.onclick = () => setHash(["exam", block.id]); }
  }

  function renderQuiz(){
    const panel = $("#mainPanel");
    const blockId = current.blockId || "b2";
    const block = blocks.find(b=>b.id===blockId) || blocks[0];
    const qs = tests[blockId] || [];
    if(!qs.length){
      panel.innerHTML = `<div class="card content"><h3>Мини‑тест</h3><p class="muted">Пока нет вопросов для этого блока.</p></div>`;
      return;
    }

    panel.innerHTML = `
      <div class="card quiz">
        <h3 style="margin:0 0 6px;">Мини‑тест • ${block.title}</h3>
        <div class="small">Выбери ответы и нажми «Проверить».</div>
        <div id="quizWrap"></div>
        <div class="actions" style="margin-top:10px;">
          <button class="btn primary" id="checkQuiz">Проверить</button>
          <button class="btn" id="retryQuiz">Заново</button>
          <button class="btn" id="toLessonFromQuiz">Открыть теорию блока</button>
        </div>
        <div class="result" id="quizResult"></div>
      </div>
    `;

    const wrap = $("#quizWrap");
    wrap.innerHTML = qs.map((item, i) => `
      <div class="q" data-q="${i}">
        <h4>${i+1}. ${item.prompt}</h4>
        ${item.options.map((opt, j) => `
          <label class="opt">
            <input type="radio" name="q_${i}" value="${j}">
            <div>${opt}</div>
          </label>
        `).join("")}
        <div class="small" id="ex_${i}"></div>
      </div>
    `).join("");

    $("#checkQuiz").onclick = () => {
      let score = 0;
      qs.forEach((item,i)=>{
        const picked = $(`input[name="q_${i}"]:checked`);
        const ex = $(`#ex_${i}`);
        if(!picked){
          ex.textContent = "—";
          return;
        }
        const val = Number(picked.value);
        if(val === item.answer){
          score++;
          ex.textContent = "Верно ✓ " + (item.explain ? ("— " + item.explain) : "");
        } else {
          ex.textContent = `Неверно ✗ Правильный ответ: ${item.options[item.answer]}` + (item.explain ? (" — " + item.explain) : "");
        }
      });
      const pct = Math.round((score/qs.length)*100);
      $("#quizResult").textContent = `Результат: ${score}/${qs.length} (${pct}%).`;
    };

    { const __el = $("#retryQuiz"); if(__el) __el.onclick = () => setHash(["quiz", blockId]); }
    $("#toLessonFromQuiz").onclick = () => {
      const lessonId = block.lessons[0]?.id || firstLesson();
      setHash(["lesson", lessonId]);
    };
  }

  function renderTrainer(){
    const panel = $("#mainPanel");
    panel.innerHTML = `
      <div class="card quiz">
        <h3 style="margin:0 0 6px;">Тренажёр</h3>
        <div class="small">Случайные вопросы из всех блоков. Выбирай сложность и тренируйся.</div>
        <div class="hr"></div>
        <div class="settings">
          <div class="row">
            <label>Сложность</label>
            <select id="trLevel">
              <option value="easy">Лёгкая (1 вариант очевидный)</option>
              <option value="normal" selected>Обычная</option>
              <option value="hard">Сложная (больше похожих ответов)</option>
            </select>
            <button class="btn primary" id="nextTask">Следующее задание</button>
          </div>
        </div>
        <div id="taskBox" class="q"></div>
        <div class="result" id="taskResult"></div>
      </div>
    `;

    const pool = [];
    Object.entries(tests).forEach(([bid, qs])=>{
      qs.forEach((it, idx)=> pool.push({ bid, idx, ...it }));
    });

    const pick = () => pool[Math.floor(Math.random()*pool.length)];

    function showOne(){
      const level = $("#trLevel").value;
      const item = pick();
      let opts = [...item.options];

      // Hard: shuffle always (default) + maybe add "похожий" distractor (we can't add safely) => keep shuffle.
      // Easy: keep correct close to top? We'll do mild bias.
      const correctText = opts[item.answer];

      // shuffle
      const shuffled = opts.map((t,i)=>({t,i})).sort(()=>Math.random()-0.5);
      let newAnswer = shuffled.findIndex(o=>o.i===item.answer);
      opts = shuffled.map(o=>o.t);

      if(level==="easy"){
        // put correct as option 0 sometimes
        if(Math.random()<0.6){
          const idx = newAnswer;
          const [ct] = opts.splice(idx,1);
          opts.unshift(ct);
          newAnswer = 0;
        }
      }

      $("#taskBox").innerHTML = `
        <h4 style="margin:0 0 8px;">${item.prompt}</h4>
        ${opts.map((o,j)=>`
          <label class="opt">
            <input type="radio" name="tr" value="${j}">
            <div>${o}</div>
          </label>
        `).join("")}
        <div class="small">Источник: ${item.bid.toUpperCase()}</div>
      `;
      $("#taskResult").textContent = "";
      { const __el = $("#nextTask"); if(__el) __el.onclick = showOne; }

      // handle check on click: pick option -> evaluate instantly
      $$("#taskBox input[name='tr']").forEach(inp=>{
        inp.addEventListener("change", ()=>{
          const v = Number(inp.value);
          if(v === newAnswer){
            $("#taskResult").textContent = "Верно ✓ " + (item.explain ? ("— " + item.explain) : "");
          } else {
            $("#taskResult").textContent = `Неверно ✗ Правильный ответ: ${opts[newAnswer]}` + (item.explain ? (" — " + item.explain) : "");
          }
        });
      });
    }

    { const __el = $("#nextTask"); if(__el) __el.onclick = showOne; }
    showOne();
  }

  function renderSettings(){
    const panel = $("#mainPanel");
    panel.innerHTML = `
      <div class="card settings">
        <h3 style="margin:0 0 6px;">Настройки</h3>
        <div class="small">Все настройки сохраняются и применяются сразу.</div>

        <div class="row" id="bgPhotoRow" style="display:none;">
          <label>Фото фона</label>
          <div class="col">
            <input id="bgPhotoFile" type="file" accept="image/*">
            <input id="bgPhotoUrl" type="url" placeholder="или вставь ссылку на картинку (https://...)">
            <div class="small" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <button class="btn ghost" id="bgPhotoClear" type="button">Убрать фото</button>
              <span>Фото сохраняется на этом устройстве.</span>
            </div>
          </div>
        </div>

        <div class="hr"></div>

        <div class="row">
          <label>Тема</label>
          <select id="setTheme">
            <option value="night">Ночь</option>
            <option value="sand">Тёплая (песочная)</option>
          </select>
        </div>

        <div class="row">
          <label>Размер текста</label>
          <input id="setFs" type="range" min="14" max="22" step="1">
          <span class="small" id="fsVal"></span>
        </div>

        <div class="row">
          <label>Размер арабского</label>
          <input id="setArFs" type="range" min="18" max="34" step="1">
          <span class="small" id="arVal"></span>
        </div>

        <div class="row">
          <label>Шрифт арабского</label>
          <select id="setArFont">
            <option value="Noto Naskh Arabic">Noto Naskh Arabic</option>
            <option value="Amiri">Amiri</option>
            <option value="Scheherazade New">Scheherazade New</option>
          </select>
        </div>

        <div class="row">
          <label>Фон</label>
          <select id="setBg">
            <option value="none">Без фона</option>
            <option value="mosaic">Мозаика</option>
            <option value="stars">Звёзды</option>
            <option value="arabesque">Арабески</option>
            <option value="photo">Фото (своё)</option>
          </select>
        </div>

        <div class="hr"></div>

        <div class="row">
          <button class="btn danger" id="resetAll">Сбросить прогресс и заметки</button>
          <span class="small">Осторожно: удалит локальные данные на этом устройстве.</span>
        </div>
      </div>
    `;

    $("#setTheme").value = settings.theme;
    $("#setFs").value = settings.fontSize;
    $("#setArFs").value = settings.arabicSize;
    $("#setArFont").value = settings.arabicFont;
    $("#setBg").value = settings.background;

    $("#bgPhotoUrl").value = settings.bgPhoto || "";

    const syncBgPhotoUI = ()=>{
      const isPhoto = settings.background === "photo";
      $("#bgPhotoRow").style.display = isPhoto ? "" : "none";
    };
    syncBgPhotoUI();

    const updateLabels = () => {
      $("#fsVal").textContent = settings.fontSize + "px";
      $("#arVal").textContent = settings.arabicSize + "px";
    };
    updateLabels();

    { const __el = $("#setTheme"); if(__el) __el.onchange = (e)=>{ settings.theme = e.target.value; saveSettings(settings); applySettings(settings); }; }
    { const __el = $("#setFs"); if(__el) __el.oninput = (e)=>{ settings.fontSize = Number(e.target.value); saveSettings(settings); applySettings(settings); updateLabels(); }; }
    { const __el = $("#setArFs"); if(__el) __el.oninput = (e)=>{ settings.arabicSize = Number(e.target.value); saveSettings(settings); applySettings(settings); updateLabels(); }; }
    { const __el = $("#setArFont"); if(__el) __el.onchange = (e)=>{ settings.arabicFont = e.target.value; saveSettings(settings); applySettings(settings); }; }
    { const __el = $("#setBg"); if(__el) __el.onchange = (e)=>{ settings.background = e.target.value; saveSettings(settings); applySettings(settings); syncBgPhotoUI(); }; }

    // Фото фона
    $("#bgPhotoFile").onchange = (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        settings.bgPhoto = String(r.result || "");
        $("#bgPhotoUrl").value = "";
        settings.background = "photo";
        $("#setBg").value = "photo";
        saveSettings(settings);
        applySettings(settings);
        syncBgPhotoUI();
      };
      r.readAsDataURL(f);
    };

    $("#bgPhotoUrl").onchange = (e)=>{
      const v = (e.target.value || "").trim();
      if(!v) return;
      settings.bgPhoto = v;
      settings.background = "photo";
      $("#setBg").value = "photo";
      saveSettings(settings);
      applySettings(settings);
      syncBgPhotoUI();
    };

    $("#bgPhotoClear").onclick = ()=>{
      settings.bgPhoto = "";
      $("#bgPhotoUrl").value = "";
      $("#bgPhotoFile").value = "";
      saveSettings(settings);
      applySettings(settings);
    };


    $("#resetAll").onclick = () => {
      if(!confirm("Точно сбросить прогресс и удалить все заметки на этом устройстве?")) return;
      localStorage.removeItem(STORAGE.progress);
      Object.keys(localStorage).forEach(k=>{
        if(k.startsWith(STORAGE.notesPrefix)) localStorage.removeItem(k);
      });
      progress = loadProgress();
      renderSidebar();
      alert("Готово. Прогресс и заметки удалены.");
    };
  }

  function renderExam(){
    const panel = $("#mainPanel");
    const which = current.blockId || "final";

    const buildExamQuestions = () => {
      if(which === "final"){
        const qs = [];
        // pickPerBlock
        const per = exams?.final?.pickPerBlock || 3;
        Object.entries(tests).forEach(([bid, arr])=>{
          const picks = arr
            .map((it, idx)=>({bid, idx, ...it}))
            .sort(()=>Math.random()-0.5)
            .slice(0, Math.min(per, arr.length));
          qs.push(...picks);
        });
        return qs.sort(()=>Math.random()-0.5);
      } else {
        const arr = tests[which] || [];
        return arr.map((it, idx)=>({bid: which, idx, ...it}));
      }
    };

    const examQs = buildExamQuestions();
    if(!examQs.length){
      panel.innerHTML = `<div class="card content"><h3>Экзамен</h3><p class="muted">Нет вопросов.</p></div>`;
      return;
    }

    const title = (which === "final") ? "Итоговый экзамен" : `Экзамен • ${(blocks.find(b=>b.id===which)?.title||which)}`;
    panel.innerHTML = `
      <div class="card quiz">
        <h3 style="margin:0 0 6px;">${title}</h3>
        <div class="small">Ответь на вопросы, затем нажми «Завершить экзамен».</div>
        <div id="examWrap"></div>
        <div class="actions" style="margin-top:10px;">
          <button class="btn primary" id="finishExam">Завершить экзамен</button>
          <button class="btn" id="restartExam">Пересобрать экзамен</button>
        </div>
        <div class="result" id="examResult"></div>
      </div>
    `;

    $("#examWrap").innerHTML = examQs.map((item, i)=>`
      <div class="q" data-q="${i}">
        <h4>${i+1}. ${item.prompt} <span class="small">(${item.bid.toUpperCase()})</span></h4>
        ${item.options.map((opt,j)=>`
          <label class="opt">
            <input type="radio" name="e_${i}" value="${j}">
            <div>${opt}</div>
          </label>
        `).join("")}
        <div class="small" id="ee_${i}"></div>
      </div>
    `).join("");

    $("#finishExam").onclick = () => {
      let score = 0;
      examQs.forEach((item,i)=>{
        const picked = $(`input[name="e_${i}"]:checked`);
        const out = $(`#ee_${i}`);
        if(!picked){
          out.textContent = "—";
          return;
        }
        const v = Number(picked.value);
        if(v === item.answer){
          score++;
          out.textContent = "Верно ✓";
        } else {
          out.textContent = `Неверно ✗ Правильно: ${item.options[item.answer]}`;
        }
      });
      const pct = Math.round((score/examQs.length)*100);
      $("#examResult").textContent = `Итог: ${score}/${examQs.length} (${pct}%).`;
    };

    { const __el = $("#restartExam"); if(__el) __el.onclick = () => setHash(["exam", which]); }
  }


  // --------- NAMAZ (Prayer times) ----------
  const PRAYER_METHODS = [
    {id:0, name:"0 — Shia Ithna‑Ashari"},
    {id:1, name:"1 — University of Islamic Sciences, Karachi"},
    {id:2, name:"2 — ISNA"},
    {id:3, name:"3 — Muslim World League"},
    {id:4, name:"4 — Umm Al‑Qura, Makkah"},
    {id:5, name:"5 — Egyptian General Authority of Survey"},
    {id:7, name:"7 — Institute of Geophysics, University of Tehran"},
    {id:8, name:"8 — Gulf Region"},
    {id:9, name:"9 — Kuwait"},
    {id:10, name:"10 — Qatar"},
    {id:11, name:"11 — Majlis Ugama Islam Singapura"},
    {id:12, name:"12 — Union Organization islamic de France"},
    {id:13, name:"13 — Diyanet (Turkey)"},
    {id:14, name:"14 — Spiritual Administration of Muslims of Russia"},
    {id:15, name:"15 — Moonsighting Committee"}
  ];

  function todayDDMMYYYY(){
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  function fmtTime(t){
    if(!t) return "—";
    return String(t).replace(/\s*\(.+\)\s*$/,""); // strip timezone suffix if any
  }

  function msUntil(next){
    const m = Math.max(0, next - Date.now());
    const s = Math.floor(m/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  }

  async function fetchPrayerTimesByCoords(lat, lon, method, school){
    const date = todayDDMMYYYY();
    const key = `tajweed_prayer_${date}_${lat.toFixed(3)}_${lon.toFixed(3)}_${method}_${school}`;
    const cached = localStorage.getItem(key);
    if(cached){
      try { return JSON.parse(cached); } catch(e){}
    }
    const url = `https://api.aladhan.com/v1/timings/${date}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&method=${encodeURIComponent(method)}&school=${encodeURIComponent(school)}`;
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("fetch_failed");
    const j = await res.json();
    const data = j && j.data ? j.data : j;
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  async function fetchPrayerTimesByCity(city, country, method, school){
    const date = todayDDMMYYYY();
    const key = `tajweed_prayer_city_${date}_${city}_${country}_${method}_${school}`.toLowerCase();
    const cached = localStorage.getItem(key);
    if(cached){
      try { return JSON.parse(cached); } catch(e){}
    }
    const url = `https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${encodeURIComponent(method)}&school=${encodeURIComponent(school)}`;
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("fetch_failed");
    const j = await res.json();
    const data = j && j.data ? j.data : j;
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  function computeNextPrayer(timings){
    const order = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const toMs = (hhmm) => {
      const [h,m] = hhmm.split(":").map(Number);
      return base.getTime() + (h*60+m)*60*1000;
    };
    const list = order.map(name => ({name, at: toMs(fmtTime(timings[name]))}));
    // pick next today
    for(const p of list){
      if(p.at > Date.now()) return p;
    }
    // else next is tomorrow fajr
    const fajr = fmtTime(timings["Fajr"]);
    const [h,m] = fajr.split(":").map(Number);
    return { name:"Fajr", at: base.getTime() + 24*3600*1000 + (h*60+m)*60*1000 };
  }

  let prayerTick = null;
  let prayerTimers = [];

  function clearPrayerTimers(){
    prayerTimers.forEach(t => clearTimeout(t));
    prayerTimers = [];
  }

  async function ensureNotificationPermission(){
    if(!("Notification" in window)) return "unsupported";
    // Must be called from user gesture (click)
    const perm = await Notification.requestPermission();
    return perm; // granted | denied | default
  }

  async function showLocalNotification(title, body){
    try{
      if("serviceWorker" in navigator){
        const reg = await navigator.serviceWorker.getRegistration();
        if(reg && reg.showNotification){
          await reg.showNotification(title, { body, tag:"tajweed-prayer", renotify:true });
          return;
        }
      }
      // fallback
      new Notification(title, { body });
    }catch(e){
      // ignore
    }
  }

  function schedulePrayerNotifications(timings){
    clearPrayerTimers();
    if(!settings.prayer?.notifyEnabled) return;
    const lead = Number(settings.prayer.notifyLeadMin || 10);
    const order = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0).getTime();

    const toMs = (hhmm) => {
      const [h,m] = fmtTime(hhmm).split(":").map(Number);
      return base + (h*60+m)*60*1000;
    };

    order.forEach(name => {
      const t = toMs(timings[name]);
      const fireAt = t - lead*60*1000;
      const delay = fireAt - Date.now();
      if(delay > 2000 && delay < 24*3600*1000){
        const id = setTimeout(()=> showLocalNotification("Напоминание о намазе", `${name} через ${lead} мин.`), delay);
        prayerTimers.push(id);
      }
    });
  }

  function renderPrayer(){
    const panel = $("#mainPanel");
    const p = settings.prayer || DEFAULT_SETTINGS.prayer;

    panel.innerHTML = `
      <div class="card content">
        <h3 style="margin-top:0;">Время намаза</h3>
        <div class="small">Расчёт берём из открытого API AlAdhan (методы можно менять). Для точности включи геолокацию или укажи город/страну.</div>

        <div class="grid2" style="margin-top:12px;">
          <div class="card inner">
            <div class="row">
              <label>Локация</label>
              <div class="col">
                <select id="pLocMode">
                  <option value="auto">Авто (геолокация)</option>
                  <option value="city">Город + страна</option>
                </select>
                <div class="small" id="pLocHint"></div>
              </div>
            </div>

            <div class="row" id="pCityRow" style="display:none;">
              <label>Город</label>
              <div class="col"><input id="pCity" placeholder="например: Makhachkala" /></div>
            </div>

            <div class="row" id="pCountryRow" style="display:none;">
              <label>Страна</label>
              <div class="col"><input id="pCountry" placeholder="например: Russia" /></div>
            </div>

            <div class="row">
              <label>Метод</label>
              <div class="col">
                <select id="pMethod">
                  ${PRAYER_METHODS.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="row">
              <label>Аср (мазхаб)</label>
              <div class="col">
                <select id="pSchool">
                  <option value="0">Шафи (стандарт)</option>
                  <option value="1">Ханафи</option>
                </select>
              </div>
            </div>

            <div class="row">
              <label></label>
              <div class="col" style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn" id="pRefresh" type="button">Обновить</button>
                <button class="btn ghost" id="pUseGeo" type="button">Определить местоположение</button>
              </div>
            </div>

            <div class="hr"></div>

            <div class="row">
              <label>Уведомления</label>
              <div class="col">
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                  <label class="toggle">
                    <input id="pNotify" type="checkbox" />
                    <span>Напоминать о намазе</span>
                  </label>
                  <div class="small">за</div>
                  <input id="pLead" type="number" min="0" max="120" style="width:90px;" />
                  <div class="small">мин.</div>
                </div>
                <div class="small" id="pNotifyHint"></div>
              </div>
            </div>
          </div>

          <div class="card inner">
            <div class="row">
              <label>Сейчас</label>
              <div class="col">
                <div id="pClock" class="clock">--:--:--</div>
                <div class="small" id="pNext">Следующий намаз: —</div>
              </div>
            </div>

            <div class="hr"></div>

            <div id="pTimes" class="timesList small"></div>
          </div>
        </div>
      </div>
    `;

    const setHint = (t)=> $("#pLocHint").textContent = t;

    $("#pLocMode").value = p.locationMode || "auto";
    $("#pCity").value = p.city || "";
    $("#pCountry").value = p.country || "";
    $("#pMethod").value = String(p.method ?? 2);
    $("#pSchool").value = String(p.school ?? 0);
    $("#pNotify").checked = !!p.notifyEnabled;
    $("#pLead").value = String(p.notifyLeadMin ?? 10);

    const syncLocUI = ()=>{
      const mode = $("#pLocMode").value;
      $("#pCityRow").style.display = mode==="city" ? "" : "none";
      $("#pCountryRow").style.display = mode==="city" ? "" : "none";
      $("#pUseGeo").style.display = mode==="auto" ? "" : "none";
      setHint(mode==="auto" ? "Нажми «Определить местоположение» и разреши доступ." : "Введи город и страну (англ. или как в AlAdhan).");
    };
    syncLocUI();

    let lastTimings = null;
    let lastCoords = null;

    const renderTimes = (timings)=>{
      if(!timings) { $("#pTimes").innerHTML = ""; return; }
      const rows = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"].map(k=>{
        const ru = ({Fajr:"Фаджр",Sunrise:"Восход",Dhuhr:"Зухр",Asr:"Аср",Maghrib:"Магриб",Isha:"Иша"})[k] || k;
        return `<div class="timeRow"><span>${ru}</span><strong>${fmtTime(timings[k])}</strong></div>`;
      }).join("");
      $("#pTimes").innerHTML = rows;
      lastTimings = timings;
      // schedule notifications if enabled
      schedulePrayerNotifications(timings);
    };

    const updateClock = ()=>{
      const d = new Date();
      $("#pClock").textContent = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
      if(lastTimings){
        const next = computeNextPrayer(lastTimings);
        $("#pNext").textContent = `Следующий намаз: ${next.name} • через ${msUntil(next.at)}`;
      } else {
        $("#pNext").textContent = "Следующий намаз: —";
      }
    };

    if(prayerTick) clearInterval(prayerTick);
    prayerTick = setInterval(updateClock, 1000);
    updateClock();

    const refresh = async ()=>{
      const method = Number($("#pMethod").value);
      const school = Number($("#pSchool").value);
      const mode = $("#pLocMode").value;

      // persist
      settings.prayer = settings.prayer || {};
      Object.assign(settings.prayer, {
        locationMode: mode,
        city: $("#pCity").value.trim(),
        country: $("#pCountry").value.trim(),
        method,
        school,
        notifyEnabled: $("#pNotify").checked,
        notifyLeadMin: Number($("#pLead").value || 10)
      });
      saveSettings(settings);

      $("#pNotifyHint").textContent = "";

      try{
        let data;
        if(mode === "auto"){
          if(!lastCoords) throw new Error("no_geo");
          data = await fetchPrayerTimesByCoords(lastCoords.lat, lastCoords.lon, method, school);
        } else {
          const city = $("#pCity").value.trim();
          const country = $("#pCountry").value.trim();
          if(!city || !country) throw new Error("need_city");
          data = await fetchPrayerTimesByCity(city, country, method, school);
        }
        const timings = data.timings || (data.data && data.data.timings) || {};
        renderTimes(timings);
      }catch(e){
        const msg = (e.message==="no_geo") ? "Сначала нажми «Определить местоположение»." :
                    (e.message==="need_city") ? "Укажи город и страну." :
                    "Не получилось загрузить время намаза. Проверь интернет и попробуй ещё раз.";
        $("#pTimes").innerHTML = `<div class="muted">${msg}</div>`;
      }
    };

    { const __el = $("#pRefresh"); if(__el) __el.onclick = refresh; }

    $("#pLocMode").onchange = ()=>{
      syncLocUI();
      refresh();
    };

    { const __el = $("#pMethod"); if(__el) __el.onchange = refresh; }
    { const __el = $("#pSchool"); if(__el) __el.onchange = refresh; }

    $("#pNotify").onchange = async ()=>{
      settings.prayer = settings.prayer || {};
      settings.prayer.notifyEnabled = $("#pNotify").checked;
      settings.prayer.notifyLeadMin = Number($("#pLead").value || 10);
      saveSettings(settings);

      if($("#pNotify").checked){
        const perm = await ensureNotificationPermission();
        if(perm !== "granted"){
          $("#pNotify").checked = false;
          settings.prayer.notifyEnabled = false;
          saveSettings(settings);
          $("#pNotifyHint").textContent = "Уведомления не включены (разрешение не выдано).";
          return;
        }
        $("#pNotifyHint").textContent = "Уведомления включены. Важно: браузеры надёжно показывают напоминания, пока приложение открыто/запущено.";
        if(lastTimings) schedulePrayerNotifications(lastTimings);
      } else {
        clearPrayerTimers();
        $("#pNotifyHint").textContent = "";
      }
    };

    $("#pLead").onchange = ()=>{
      settings.prayer = settings.prayer || {};
      settings.prayer.notifyLeadMin = Number($("#pLead").value || 10);
      saveSettings(settings);
      if(lastTimings) schedulePrayerNotifications(lastTimings);
    };

    $("#pUseGeo").onclick = ()=>{
      if(!("geolocation" in navigator)){
        setHint("Геолокация недоступна в этом браузере.");
        return;
      }
      setHint("Определяем местоположение…");
      navigator.geolocation.getCurrentPosition((pos)=>{
        lastCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setHint(`Локация: ${lastCoords.lat.toFixed(3)}, ${lastCoords.lon.toFixed(3)} • теперь нажми «Обновить»`);
        refresh();
      }, (err)=>{
        setHint("Не удалось получить геолокацию (разрешение/настройки). Можно выбрать режим «Город + страна».");
      }, { enableHighAccuracy:false, timeout: 12000, maximumAge: 300000 });
    };

    // initial: try refresh with stored mode; geo must be clicked by user for permission, so we don't auto-request.
    if(p.locationMode === "city" && (p.city && p.country)){
      refresh();
    }
  }

  
// --------- ADHKAR ----------
  // Базовый офлайн‑набор + возможность расширять под свой источник.
  // (Для полного "Хиснуль‑Муслим" удобнее подключить внешний набор/файл — добавим позже.)
  const ADHKAR = window.TAJWEED_ADHKAR || [
    {
      id:"morning",
      title:"Утренние азкары (база)",
      items:[
        { ar:"أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", ru:"Прошу защиты у Аллаха от сатаны, побиваемого камнями.", note:"" },
        { ar:"سُبْحَانَ اللهِ", ru:"СубханАллах (Пречист Аллах).", note:"" },
        { ar:"الْحَمْدُ لِلّٰهِ", ru:"Альхамдулиллях (Хвала Аллаху).", note:"" },
        { ar:"اللهُ أَكْبَرُ", ru:"Аллаху Акбар (Аллах Велик).", note:"" },
        { ar:"لَا إِلٰهَ إِلَّا اللّٰهُ", ru:"Нет божества, кроме Аллаха.", note:"" },
        { ar:"أَسْتَغْفِرُ اللّٰهَ", ru:"Прошу у Аллаха прощения.", note:"" }
      ]
    },
    {
      id:"evening",
      title:"Вечерние азкары (база)",
      items:[
        { ar:"سُبْحَانَ اللهِ", ru:"СубханАллах.", note:"" },
        { ar:"الْحَمْدُ لِلّٰهِ", ru:"Альхамдулиллях.", note:"" },
        { ar:"اللهُ أَكْبَرُ", ru:"Аллаху Акбар.", note:"" },
        { ar:"أَسْتَغْفِرُ اللّٰهَ", ru:"Истигфар.", note:"" }
      ]
    },
    {
      id:"after_salah",
      title:"После намаза (тасбих)",
      items:[
        { ar:"سُبْحَانَ اللهِ ×33", ru:"33 раза", note:"" },
        { ar:"الْحَمْدُ لِلّٰهِ ×33", ru:"33 раза", note:"" },
        { ar:"اللهُ أَكْبَرُ ×34", ru:"34 раза", note:"" }
      ]
    },
    {
      id:"general",
      title:"Зикры на каждый день (база)",
      items:[
        { ar:"سُبْحَانَ اللهِ وَبِحَمْدِهِ", ru:"СубханАллахи ва бихамдихи.", note:"" },
        { ar:"سُبْحَانَ اللهِ الْعَظِيمِ", ru:"СубханАллахиль‑Азым.", note:"" },
        { ar:"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", ru:"Нет мощи и силы ни у кого, кроме Аллаха.", note:"" }
      ]
    }
  ];


  function renderAdhkar(){
    const panel = $("#mainPanel");
    panel.innerHTML = `
      <div class="card content">
        <h3 style="margin-top:0;">Азкары</h3>
        <div class="small">Здесь можно читать азкары, добавлять свои заметки и использовать счётчик. (Тексты можно расширить/заменить под твой источник.)</div>

        <div class="grid2" style="margin-top:12px;">
          <div class="card inner" id="adhkarList"></div>
          <div class="card inner">
            <div id="adhkarView" class="adhkarView muted">Выбери раздел слева.</div>
          </div>
        </div>
      </div>
    `;

    const list = $("#adhkarList");
    list.innerHTML = ADHKAR.map((c,i)=>`
      <button class="btn ghost adhkarCat" data-id="${c.id}" style="width:100%; justify-content:flex-start; margin-bottom:8px;">
        ${c.title}
      </button>
    `).join("");

    list.addEventListener("click",(e)=>{
      const btn = e.target.closest(".adhkarCat");
      if(!btn) return;
      const cat = ADHKAR.find(x=>x.id===btn.dataset.id);
      if(!cat) return;

      const view = $("#adhkarView");
      view.classList.remove("muted");
      view.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
          <h4 style="margin:0;">${cat.title}</h4>
          <div class="counter">
            <button class="btn ghost" id="cDec">−</button>
            <div id="cVal">0</div>
            <button class="btn" id="cInc">+</button>
            <button class="btn ghost" id="cReset">Сброс</button>
          </div>
        </div>
        <div class="hr"></div>
        <div class="adhkarItems">
          ${cat.items.map((it,idx)=>`
            <div class="adhItem">
              <div class="ar big" dir="rtl">${it.ar}</div>
              <div class="small">${it.ru || ""}</div>
              ${it.note ? `<div class="hint">${it.note}</div>` : ``}
              <textarea class="note" data-note="${cat.id}_${idx}" placeholder="Твоя заметка..."></textarea>
            </div>
          `).join("")}
        </div>
      `;

      // counter
      let val = 0;
      const sync = ()=> $("#cVal").textContent = String(val);
      { const __el = $("#cInc"); if(__el) __el.onclick = ()=>{ val++; sync(); }; }
      { const __el = $("#cDec"); if(__el) __el.onclick = ()=>{ val = Math.max(0, val-1); sync(); }; }
      { const __el = $("#cReset"); if(__el) __el.onclick = ()=>{ val=0; sync(); }; }
      sync();

      // notes (reuse same storage scheme)
      $$(".note", view).forEach(ta=>{
        const k = "tajweed_adhkar_note:" + ta.dataset.note;
        ta.value = localStorage.getItem(k) || "";
        ta.addEventListener("input", ()=> localStorage.setItem(k, ta.value));
      });
    });
  }


  function renderMain(){
    renderHero();
    if(current.mode === "lesson") renderLesson();
    else if(current.mode === "quiz") renderQuiz();
    else if(current.mode === "trainer") renderTrainer();
    else if(current.mode === "settings") renderSettings();
    else if(current.mode === "exam") renderExam();
    else if(current.mode === "prayer") renderPrayer();
    else if(current.mode === "adhkar") renderAdhkar();
    else if(current.mode === "quran") renderQuran();
    else if(current.mode === "notes") renderNotes();
    else if(current.mode === "progress") renderProgressView();
    else if(current.mode === "review") renderReview();
  }

  function attachSidebarHandlers(){
    $("#searchInput").addEventListener("input", (e)=>{
      filter.q = e.target.value;
      renderSidebar();
    });

    $("#pillRow").addEventListener("click", (e)=>{
  const pill = e.target.closest("[data-pill]");
  if(!pill) return;

  const id = pill.getAttribute("data-pill");
  filter.activePill = id;

  // "all" just keeps current view (no jumping)
  if(id === "all"){
    // keep current hash; just re-render pill highlight
    renderSidebar();
    return;
  }

  switch(id){
    case "lesson":
      setHash(["lesson", current.lessonId || firstLesson()]);
      break;
    case "quiz":
      setHash(["quiz", current.blockId || "b2"]);
      break;
    case "trainer":
      setHash(["trainer"]);
      break;
    case "exam":
      setHash(["exam", "final"]);
      break;
    case "prayer":
      setHash(["prayer"]);
      break;
    case "adhkar":
      setHash(["adhkar"]);
      break;
    case "quran":
      setHash(["quran"]);
      break;
    case "notes":
      setHash(["notes"]);
      break;
    case "progress":
      setHash(["progress"]);
      break;
    case "review":
      setHash(["review"]);
      break;
    case "settings":
      setHash(["settings"]);
      break;
    default:
      setHash(["lesson", current.lessonId || firstLesson()]);
  }
});

    $("#blocksWrap").addEventListener("click", (e)=>{
      const btn = e.target.closest("[data-lesson]");
      if(!btn) return;
      const lessonId = btn.getAttribute("data-lesson");
      setHash(["lesson", lessonId]);
    });
  }

  function syncModeToPill(){
    const map = { lesson:"lesson", quiz:"quiz", trainer:"trainer", exam:"exam", prayer:"prayer", adhkar:"adhkar", quran:"quran", notes:"notes", progress:"progress", review:"review", settings:"settings" };
    filter.activePill = map[current.mode] || "all";
  }

  function onRoute(){
    current = parseHash();
    // set blockId for lesson
    if(current.mode === "lesson"){
      const fl = findLesson(current.lessonId);
      current.blockId = fl?.block?.id || current.blockId;
    }
    syncModeToPill();
    renderSidebar();
    renderMain();
  }

  
  
  // --------- QURAN (30 JUZ) ----------
  // Мы загружаем данные по джузам по сети (Arabic Uthmani + RU перевод),
  // кешируем по джузу, и никогда не "роняем" UI, если сети нет.
  const QURAN_CACHE_KEY = "tajweed_quran_cache_v2"; // { juz: { arabic:[], ru:[], meta:{...} } }
  const QURAN_WORD_NOTE_PREFIX = "tajweed_quran_word_note_v2:"; // key: juz|ayahGlobal|wordIdx
  const QURAN_AYAH_NOTE_PREFIX = "tajweed_quran_ayah_note_v2:"; // key: juz|ayahGlobal
  const QURAN_READ_PREFIX      = "tajweed_quran_read_v2:";      // key: juz|ayahGlobal -> "1"

  // Translation id (alquran.cloud). Можно поменять позже в настройках
  const QURAN_TRANSLATION_ID = "ru.kuliev";

  function safeJSONParse(str, fallback){
    try { return JSON.parse(str); } catch(e){ return fallback; }
  }

  function getQuranCache(){
    return safeJSONParse(localStorage.getItem(QURAN_CACHE_KEY), { juz: {} });
  }
  function setQuranCache(cache){
    localStorage.setItem(QURAN_CACHE_KEY, JSON.stringify(cache));
  }

  // Arabic normalization (удаляем знаки паузы/декор, оставляем огласовки)
  function stripQuranPunct(s){
    return (s||"")
      .replace(/[ۖۗۘۙۚۛۜ۝۞۩]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripDiacritics(s){
    // убираем огласовки для определения "первой буквы"
    return (s||"").replace(/[\u064B-\u0652\u0670]/g, "");
  }

  function firstArabicLetter(word){
    const w = stripDiacritics(stripQuranPunct(word));
    const m = w.match(/[\u0621-\u064A]/);
    return m ? m[0] : "";
  }

  function isHamzaLetter(ch){
    return ["ء","أ","إ","ؤ","ئ"].includes(ch);
  }
  function isIdghamLetter(ch){
    return ["ي","ن","م","و","ل","ر"].includes(ch);
  }
  function isIdghamGhunnahLetter(ch){
    return ["ي","ن","م","و"].includes(ch);
  }
  function isIzharHalqiLetter(ch){
    return ["ء","ه","ع","ح","غ","خ"].includes(ch);
  }
  function isIkhfaLetter(ch){
    return ["ت","ث","ج","د","ذ","ز","س","ش","ص","ض","ط","ظ","ف","ق","ك"].includes(ch);
  }

  function analyzeTajweedForWord(word, nextWord, opts){
    // opts: {isEndOfAyah:boolean}
    const res = [];
    const w = stripQuranPunct(word);
    const nwFirst = firstArabicLetter(nextWord||"");

    // --- Madd detection (best-effort) ---
    // Natural madd patterns: َ + ا , ُ + و , ِ + ي
    const hasNatural = /َا|ُو|ِي/.test(w);
    // Muttasil: madd + hamza in same word (after madd)
    const muttasil = /(َا|ُو|ِي).*([ءأإؤئ])/.test(w);
    const endsWithMadd = /[اوي]$/.test(stripDiacritics(w));
    const munfasil = endsWithMadd && isHamzaLetter(nwFirst);

    // Madd lin: َ + (وْ|يْ) at the end, and we stop
    const maddLin = opts?.isEndOfAyah && /َ[وي]ْ$/.test(w);

    if(muttasil){
      res.push({type:"madd", title:"مَدّ مُتَّصِل (muttasil)", body:"В одном слове: буква мадд + хамза после неё. Обычно тянем 4–5 харакатов."});
    } else if(munfasil){
      res.push({type:"madd", title:"مَدّ مُنْفَصِل (munfasil)", body:"Буква мадд в конце слова, хамза в начале следующего. Обычно тянем 4–5 харакатов."});
    } else if(maddLin){
      res.push({type:"madd", title:"مَدّ لِين (lin)", body:"При остановке: (فَتْحَة + وْ/يْ). Тянем 2/4/6 харакатов (по риваяту и школе чтения)."});
    } else if(hasNatural){
      // arid li sukun if end of ayah and ends with madd
            if(opts?.isEndOfAyah && endsWithMadd){
        res.push({type:"madd", title:"مَدّ عَارِض لِلسُّكُون (ʿāriḍ)", body:"При остановке появляется временный сукун после буквы мадд. Тянем 2/4/6 харакатов."});
      } else {
        res.push({type:"madd", title:"مَدّ طَبِيعِي (ṭabīʿī)", body:"Обычный мадд без причины хамзы/сукуна. Тянем 2 хараката."});
      }
    }

    // --- Qalqalah ---
    if(/[قطبجد]\u0652|[قطبجد]ْ/.test(w)){ // sukun
      res.push({type:"rule", title:"قَلْقَلَة (qalqalah)", body:"Если буква ق ط ب ج د с сукуном — делаем лёгкий отскок звука (без добавления огласовки)."});
    }

    // --- Noon sakinah / tanween rules (look at next letter) ---
    const hasNoonSakinah = /نْ/.test(w);
    const hasTanween = /[ًٌٍ]/.test(w);
    if(hasNoonSakinah || hasTanween){
      if(isIzharHalqiLetter(nwFirst)){
        res.push({type:"rule", title:"إِظْهَار (izhar)", body:"После نْ/танвина идёт буква горла: ء هـ ع ح غ خ — читаем ن ясно, без слияния."});
      } else if(nwFirst === "ب"){
        res.push({type:"rule", title:"إِقْلَاب (iqlab)", body:"После نْ/танвина идёт ب — ن превращается в م с гунной."});
      } else if(isIdghamLetter(nwFirst)){
        if(isIdghamGhunnahLetter(nwFirst)){
          res.push({type:"rule", title:"إِدْغَام بِغُنَّة (idgham with ghunnah)", body:"После نْ/танвина идёт ي ن م و — слияние с гунной."});
        } else {
          res.push({type:"rule", title:"إِدْغَام بِلا غُنَّة (idgham without ghunnah)", body:"После نْ/танвина идёт ل или ر — слияние без гунны."});
        }
      } else if(isIkhfaLetter(nwFirst)){
        res.push({type:"rule", title:"إِخْفَاء (ikhfa)", body:"После نْ/танвина идёт одна из 15 букв ихфа — нун читается скрыто с гунной."});
      }
    }

    // --- Mim sakinah rules ---
    const hasMimSakinah = /مْ/.test(w);
    if(hasMimSakinah){
      if(nwFirst === "م"){
        res.push({type:"rule", title:"إِدْغَام شَفَوِي (idgham shafawi)", body:"После مْ идёт م — слияние двух мимов с гунной (мّ)."});
      } else if(nwFirst === "ب"){
        res.push({type:"rule", title:"إِخْفَاء شَفَوِي (ikhfa shafawi)", body:"После مْ идёт ب — скрытое произношение мима с гунной, губы не смыкаются полностью."});
      } else {
        res.push({type:"rule", title:"إِظْهَار شَفَوِي (izhar shafawi)", body:"После مْ идёт любая буква кроме م и ب — мим произносится ясно, без гунны."});
      }
    }

    // --- Lam in Allah (simple hint) ---
    if(stripDiacritics(w).includes("الله")){
      // Determine previous vowel is hard without context; show reminder
      res.push({type:"hint", title:"لَفْظُ الْجَلَالَة (اللّٰه)", body:"Лям в слове «Аллах» читается твёрдо после َ или ُ и мягко после ِ."});
    }

    if(res.length === 0){
      res.push({type:"hint", title:"Подсказка", body:"Здесь не распознано явных правил автоматически. Если нужно — добавь свою заметку к слову/аяту."});
    }
    return res;
  }

  async function fetchJuz(juzNum){
    // Arabic text
    const urlAr = `https://api.alquran.cloud/v1/juz/${juzNum}/quran-uthmani`;
    const urlRu = `https://api.alquran.cloud/v1/juz/${juzNum}/${QURAN_TRANSLATION_ID}`;
    const [arResp, ruResp] = await Promise.all([fetch(urlAr), fetch(urlRu)]);
    if(!arResp.ok) throw new Error("Не удалось загрузить арабский текст");
    if(!ruResp.ok) throw new Error("Не удалось загрузить перевод");
    const arJson = await arResp.json();
    const ruJson = await ruResp.json();
    const arAyahs = arJson?.data?.ayahs || [];
    const ruAyahs = ruJson?.data?.ayahs || [];
    // align by index
    const list = arAyahs.map((a, i)=>({
      number: a.number, // global
      numberInSurah: a.numberInSurah,
      surah: { number: a.surah.number, name: a.surah.name, englishName: a.surah.englishName },
      text: a.text,
      ru: (ruAyahs[i]?.text) || ""
    }));
    return { ayahs: list, meta: { juz: juzNum, fetchedAt: Date.now() } };
  }

  function quranNoteKeyJuzAyah(juzNum, ayahGlobal){
    return `${juzNum}|${ayahGlobal}`;
  }

  function renderQuran(){
    const panel = $("#mainPanel");
    panel.innerHTML = `
      <div class="card content">
        <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0;">Коран — 30 джузов</h3>
            <div class="muted" style="margin-top:4px;">Выбери джуз → загрузить → нажми на слово, чтобы увидеть подсказки таджвида (в т.ч. мадды) + заметки.</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <label class="muted">Джуз:</label>
            <select id="qJuzSelect" class="select"></select>
            <button class="btn" id="qLoadBtn">Загрузить</button>
            <button class="btn ghost" id="qClearBtn">Очистить кэш</button>
          </div>
        </div>

        <div id="qStatus" class="muted" style="margin-top:10px;"></div>

        <div id="qList" style="margin-top:14px;"></div>

        <div id="qWordPanel" class="card" style="display:none; margin-top:14px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <div class="arabic big" id="qWordText"></div>
              <div class="muted" id="qWordMeta"></div>
            </div>
            <button class="btn ghost" id="qWordClose">Закрыть</button>
          </div>
          <div class="divider"></div>
          <div id="qHints"></div>
          <div class="divider"></div>
          <div class="grid2">
            <div>
              <div class="muted">Заметка к этому слову</div>
              <textarea id="qWordNote" class="textarea" rows="3" placeholder="Например: здесь мадд мунфасиль, тянем 4–5..."></textarea>
              <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                <button class="btn" id="qSaveWordNote">Сохранить</button>
                <button class="btn ghost" id="qClearWordNote">Очистить</button>
              </div>
            </div>
            <div>
              <div class="muted">Заметка к аяту</div>
              <textarea id="qAyahNote" class="textarea" rows="3" placeholder="Например: повторить чтение, обратить внимание на калькалю..."></textarea>
              <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                <button class="btn" id="qSaveAyahNote">Сохранить</button>
                <button class="btn ghost" id="qClearAyahNote">Очистить</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const sel = $("#qJuzSelect");
    sel.innerHTML = Array.from({length:30}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
    const last = safeJSONParse(localStorage.getItem("tajweed_last_juz"), 30);
    sel.value = String(last);

    const status = (msg)=>{ $("#qStatus").textContent = msg || ""; };

    const cache = getQuranCache();
    const renderFromCache = (juzNum)=>{
      const juzData = cache.juz[String(juzNum)];
      if(!juzData?.ayahs?.length){
        $("#qList").innerHTML = `<div class="muted">Нет данных для этого джуза. Нажми “Загрузить”.</div>`;
        return;
      }
      status(`Показан джуз ${juzNum}. Данные: ${new Date(juzData.meta.fetchedAt).toLocaleString()}`);

      // Render ayahs grouped by surah
      const listEl = $("#qList");
      let html = "";
      let lastSurah = null;

      juzData.ayahs.forEach((a, idx)=>{
        const surahKey = `${a.surah.number}`;
        if(surahKey !== lastSurah){
          lastSurah = surahKey;
          html += `<div class="divider"></div>
                   <h4 style="margin:14px 0 8px;">${a.surah.name} <span class="muted">(${a.surah.englishName})</span></h4>`;
        }

        const ayahKey = quranNoteKeyJuzAyah(juzNum, a.number);
        const isRead = localStorage.getItem(QURAN_READ_PREFIX + ayahKey) === "1";

        const arabicWords = stripQuranPunct(a.text).split(" ").filter(Boolean);
        // clickable words
        const wordsHtml = arabicWords.map((w, wi)=>{
          const safeW = w.replace(/"/g,"&quot;");
          return `<span class="qWord" data-juz="${juzNum}" data-ayah="${a.number}" data-idx="${wi}" data-next="${(arabicWords[wi+1]||"").replace(/"/g,"&quot;")}" data-text="${safeW}">${safeW}</span>`;
        }).join(" ");

        html += `
          <div class="ayahRow">
            <div class="ayahTop">
              <label class="chk">
                <input type="checkbox" class="qRead" data-juz="${juzNum}" data-ayah="${a.number}" ${isRead?"checked":""}/>
                <span class="muted">Прочитано</span>
              </label>
              <div class="muted">Аят: ${a.surah.number}:${a.numberInSurah}</div>
            </div>
            <div class="arabic ayahText">${wordsHtml}</div>
            <div class="ruText">${a.ru || ""}</div>
            <div class="muted small" style="margin-top:6px;">
              <button class="btn ghost qAyahNoteBtn" data-juz="${juzNum}" data-ayah="${a.number}">Заметка к аяту</button>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;

      // bind read checkboxes
      $$(".qRead", listEl).forEach(cb=>{
        cb.addEventListener("change", ()=>{
          const juz = cb.getAttribute("data-juz");
          const ayah = cb.getAttribute("data-ayah");
          const key = quranNoteKeyJuzAyah(juz, ayah);
          if(cb.checked) localStorage.setItem(QURAN_READ_PREFIX + key, "1");
          else localStorage.removeItem(QURAN_READ_PREFIX + key);
          // progress ping
          bumpStreak("quran_read");
        });
      });

      // word click
      $$(".qWord", listEl).forEach(span=>{
        span.addEventListener("click", ()=>{
          const juzNum = Number(span.getAttribute("data-juz"));
          const ayahGlobal = Number(span.getAttribute("data-ayah"));
          const wordIdx = Number(span.getAttribute("data-idx"));
          const wordText = span.getAttribute("data-text") || "";
          const nextWord = span.getAttribute("data-next") || "";

          openQuranWordPanel(juzNum, ayahGlobal, wordIdx, wordText, nextWord, juzData);
        });
      });

      // ayah note button
      $$(".qAyahNoteBtn", listEl).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const juzNum = Number(btn.getAttribute("data-juz"));
          const ayahGlobal = Number(btn.getAttribute("data-ayah"));
          openQuranWordPanel(juzNum, ayahGlobal, 0, "", "", juzData, {openAyahNoteOnly:true});
        });
      });
    };

    const loadJuz = async ()=>{
      const juzNum = Number(sel.value);
      localStorage.setItem("tajweed_last_juz", JSON.stringify(juzNum));
      status(`Загружаю джуз ${juzNum}...`);
      $("#qList").innerHTML = `<div class="muted">Загрузка…</div>`;
      try{
        const data = await fetchJuz(juzNum);
        cache.juz[String(juzNum)] = data;
        setQuranCache(cache);
        renderFromCache(juzNum);
        toast("Загружено");
      }catch(e){
        status(`Не удалось загрузить. Показываю локальный кэш, если он есть. (${e.message})`);
        renderFromCache(juzNum);
      }
    };

    { const __el = $("#qLoadBtn"); if(__el) __el.onclick = loadJuz; }
    $("#qClearBtn").onclick = ()=>{
      localStorage.removeItem(QURAN_CACHE_KEY);
      status("Кэш очищен.");
      $("#qList").innerHTML = `<div class="muted">Кэш очищен. Нажми “Загрузить”.</div>`;
      toast("Очищено");
    };

    // initial show from cache (no network)
    renderFromCache(Number(sel.value));
    status("Выбери джуз и нажми “Загрузить”, если данных ещё нет.");
  }

  function openQuranWordPanel(juzNum, ayahGlobal, wordIdx, wordText, nextWord, juzData, flags){
    const panel = $("#qWordPanel");
    panel.style.display = "block";
    { const __el = $("#qWordClose"); if(__el) __el.onclick = ()=>{ panel.style.display = "none"; }; }

    // find ayah
    const ayah = (juzData.ayahs||[]).find(a=>Number(a.number)===Number(ayahGlobal));
    const ayahKey = quranNoteKeyJuzAyah(juzNum, ayahGlobal);

    const ayahNote = localStorage.getItem(QURAN_AYAH_NOTE_PREFIX + ayahKey) || "";
    const wordKey = `${ayahKey}|${wordIdx}`;
    const wordNote = localStorage.getItem(QURAN_WORD_NOTE_PREFIX + wordKey) || "";

    $("#qAyahNote").value = ayahNote;
    $("#qWordNote").value = wordNote;

    const meta = ayah ? `${ayah.surah.name} — ${ayah.surah.number}:${ayah.numberInSurah} • Джуз ${juzNum}` : `Джуз ${juzNum}`;
    $("#qWordMeta").textContent = meta;

    // If opened from ayah note button
    const openAyahOnly = flags?.openAyahNoteOnly;
    if(openAyahOnly){
      $("#qWordText").textContent = "Заметка к аяту";
      $("#qHints").innerHTML = `<div class="muted">Можно записать, что важно в чтении/смысле этого аята.</div>`;
      // disable word note
      $("#qWordNote").value = "";
      $("#qSaveWordNote").disabled = true;
      $("#qClearWordNote").disabled = true;
    } else {
      $("#qWordText").textContent = wordText || "";
      $("#qSaveWordNote").disabled = false;
      $("#qClearWordNote").disabled = false;

      // determine end of ayah
      let isEnd = false;
      if(ayah){
        const words = stripQuranPunct(ayah.text).split(" ").filter(Boolean);
        isEnd = (wordIdx === words.length - 1);
      }

      const hints = analyzeTajweedForWord(wordText||"", nextWord||"", {isEndOfAyah:isEnd});
      $("#qHints").innerHTML = hints.map(h=>`
        <div class="hintCard">
          <div class="hintTitle">${h.title}</div>
          <div class="muted">${h.body}</div>
        </div>
      `).join("");
    }

    $("#qSaveWordNote").onclick = ()=>{
      const key = QURAN_WORD_NOTE_PREFIX + `${ayahKey}|${wordIdx}`;
      localStorage.setItem(key, ($("#qWordNote").value||"").trim());
      toast("Сохранено");
    };
    $("#qClearWordNote").onclick = ()=>{
      localStorage.removeItem(QURAN_WORD_NOTE_PREFIX + `${ayahKey}|${wordIdx}`);
      $("#qWordNote").value = "";
      toast("Очищено");
    };
    $("#qSaveAyahNote").onclick = ()=>{
      localStorage.setItem(QURAN_AYAH_NOTE_PREFIX + ayahKey, ($("#qAyahNote").value||"").trim());
      toast("Сохранено");
    };
    $("#qClearAyahNote").onclick = ()=>{
      localStorage.removeItem(QURAN_AYAH_NOTE_PREFIX + ayahKey);
      $("#qAyahNote").value = "";
      toast("Очищено");
    };
  }


  function renderNotes(){
    const panel = $("#mainPanel");
    panel.innerHTML = `
      <div class="card content">
        <h3 style="margin-top:0;">Заметки</h3>
        <div class="muted">Поиск по заметкам: таджвид / коран / азкары.</div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <input id="notesSearch" class="input" placeholder="Поиск..." style="flex:1; min-width:220px;" />
          <select id="notesFilter" class="select">
            <option value="all">Все</option>
            <option value="таджвид">Таджвид</option>
            <option value="коран">Коран</option>
            <option value="азкары">Азкары</option>
          </select>
          <button class="btn ghost" id="notesRefresh">Обновить</button>
        </div>

        <div id="notesList" style="margin-top:14px;"></div>
      </div>
    `;

    const list = $("#notesList");
    const input = $("#notesSearch");
    const filterSel = $("#notesFilter");

    const render = ()=>{
      const q = (input.value||"").trim().toLowerCase();
      const f = filterSel.value;
      const items = collectAllNotes().filter(n=>{
        if(f!=="all" && n.type!==f) return false;
        if(!q) return true;
        return (n.title||"").toLowerCase().includes(q) || (n.text||"").toLowerCase().includes(q);
      });

      if(!items.length){
        list.innerHTML = `<div class="muted">Пока нет заметок (или ничего не найдено).</div>`;
        return;
      }

      list.innerHTML = items
        .sort((a,b)=> a.type.localeCompare(b.type) || a.title.localeCompare(b.title))
        .map(n=>`
          <div class="noteCard">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
              <div>
                <div class="noteTitle">${escapeHtml(n.title)}</div>
                <div class="pillSmall">${n.type}</div>
              </div>
              <button class="btn ghost" data-del="${encodeURIComponent(n.type+"|"+n.ref)}">Удалить</button>
            </div>
            <div class="noteText">${escapeHtml(n.text)}</div>
          </div>
        `).join("");
    };

    list.addEventListener("click",(e)=>{
      const b = e.target.closest("[data-del]");
      if(!b) return;
      const raw = decodeURIComponent(b.getAttribute("data-del"));
      const [type, ref] = raw.split("|");
      if(type==="коран" && ref.includes(":") && !ref.includes("|")){
        localStorage.removeItem(QURAN_AYAH_NOTE_PREFIX + ref);
      }else if(type==="коран" && ref.includes("|")){
        localStorage.removeItem(QURAN_WORD_NOTE_PREFIX + ref);
      }else if(type==="таджвид"){
        localStorage.removeItem("tajweed_note:" + ref);
      }else if(type==="азкары"){
        localStorage.removeItem("tajweed_adhkar_note:" + ref);
      }
      toast("Удалено");
      render();
    });

    input.addEventListener("input", render);
    filterSel.addEventListener("change", render);
    $("#notesRefresh").addEventListener("click", render);
    render();
  }

  // --------- PROGRESS ----------
  function renderProgressView(){
    const panel = $("#mainPanel");
    const completed = progress?.completed || {};
    const totalLessons = blocks.reduce((acc,b)=> acc + (b.lessons?.length||0), 0);
    const done = Object.keys(completed).length;

    // Quran progress (simple): count ayah notes marked as read
    let qDone = 0;
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||"";
      if(k.startsWith("tajweed_quran_read:")) qDone++;
    }

    panel.innerHTML = `
      <div class="card content">
        <h3 style="margin-top:0;">Прогресс</h3>

        <div class="grid2">
          <div class="miniStat">
            <div class="muted">Таджвид: пройдено уроков</div>
            <div class="bigNum">${done} / ${totalLessons}</div>
          </div>
          <div class="miniStat">
            <div class="muted">Коран (30 джуз): отмечено “прочитано”</div>
            <div class="bigNum">${qDone}</div>
          </div>
        </div>

        <div class="divider"></div>

        <h4 style="margin:0 0 8px 0;">Серия дней</h4>
        <div class="muted" style="margin-bottom:10px;">Отмечай “занималась сегодня” — и приложение будет считать серию.</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button class="btn" id="streakToday">Занималась сегодня</button>
          <div class="pillSmall" id="streakInfo"></div>
        </div>

        <div class="divider"></div>

        <h4 style="margin:0 0 8px 0;">Результаты тестов</h4>
        <div class="muted">Сохраняются автоматически после прохождения мини‑тестов/экзаменов.</div>
        <div id="testStats" style="margin-top:10px;"></div>
      </div>
    `;

    // streak
    const SKEY="tajweed_streak_v1";
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,"0");
    const dd = String(today.getDate()).padStart(2,"0");
    const todayKey = `${yyyy}-${mm}-${dd}`;

    function loadStreak(){
      try{ return JSON.parse(localStorage.getItem(SKEY)||"{}"); }catch(e){ return {}; }
    }
    function saveStreak(obj){ localStorage.setItem(SKEY, JSON.stringify(obj)); }

    function daysBetween(a,b){
      const da = new Date(a+"T00:00:00");
      const db = new Date(b+"T00:00:00");
      return Math.round((db-da)/(24*3600*1000));
    }

    function computeStreak(){
      const s=loadStreak();
      const last = s.last || null;
      let count = s.count || 0;
      if(!last) return {count:0,last:null};
      const diff = daysBetween(last, todayKey);
      if(diff===0) return {count, last};
      if(diff===1) return {count, last};
      // missed day -> streak broken
      return {count:0,last:null};
    }

    function renderStreak(){
      const s=loadStreak();
      const info=$("#streakInfo");
      const computed=computeStreak();
      const last = s.last || "—";
      info.textContent = `Серия: ${computed.count} • Последний день: ${last}`;
    }

    $("#streakToday").addEventListener("click", ()=>{
      const s=loadStreak();
      const computed=computeStreak();
      let count = computed.count;
      const last = s.last || null;
      const diff = last ? daysBetween(last, todayKey) : 999;
      if(!last) count = 1;
      else if(diff===0) count = count; // already counted
      else if(diff===1) count = count + 1;
      else count = 1;
      saveStreak({count, last: todayKey});
      toast("Отмечено");
      renderStreak();
    });
    renderStreak();

    // test stats (best-effort)
    const statsEl=$("#testStats");
    const tkeys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||"";
      if(k.startsWith("tajweed_test_result:")) tkeys.push(k);
    }
    if(!tkeys.length){
      statsEl.innerHTML = `<div class="muted">Пока нет результатов.</div>`;
    }else{
      const rows=tkeys.slice(0,50).map(k=>{
        const v=localStorage.getItem(k)||"";
        return `<tr><td>${escapeHtml(k.replace("tajweed_test_result:",""))}</td><td>${escapeHtml(v)}</td></tr>`;
      }).join("");
      statsEl.innerHTML = `<table class="table"><thead><tr><th>Тест</th><th>Результат</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
  }

  // --------- REVIEW ----------
  function renderReview(){
    const panel = $("#mainPanel");
    const completed = progress?.completed || {};
    const allLessons = [];
    for(const b of blocks){
      for(const l of (b.lessons||[])){
        allLessons.push({blockId:b.id, blockTitle:b.title, lessonId:l.id, lessonTitle:l.title});
      }
    }
    const need = allLessons.filter(x=> !completed[x.lessonId]);
    // pick up to 5
    const pick = need.slice(0,5);

    panel.innerHTML = `
      <div class="card content">
        <h3 style="margin-top:0;">Повторение</h3>
        <div class="muted">Быстрый план: 5 тем, которые ещё не закрыты (или можно повторить вручную).</div>

        <div class="divider"></div>

        <div id="reviewList"></div>

        <div class="divider"></div>

        <button class="btn" id="reviewShuffle">Сформировать заново</button>
      </div>
    `;

    const list=$("#reviewList");
    function draw(){
      const completed = progress?.completed || {};
      const remaining = allLessons.filter(x=> !completed[x.lessonId]);
      const shuffled = remaining.sort(()=> Math.random()-0.5).slice(0,5);
      if(!shuffled.length){
        list.innerHTML = `<div class="muted">Кажется, все уроки отмечены как пройденные 🎉</div>`;
        return;
      }
      list.innerHTML = shuffled.map(x=>`
        <div class="reviewCard">
          <div class="muted">${escapeHtml(x.blockTitle)}</div>
          <div class="reviewTitle">${escapeHtml(x.lessonTitle)}</div>
          <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            <button class="btn" data-open="${x.lessonId}">Открыть тему</button>
            <button class="btn ghost" data-done="${x.lessonId}">Отметить пройдено</button>
          </div>
        </div>
      `).join("");
    }
    list.addEventListener("click",(e)=>{
      const open=e.target.closest("[data-open]");
      if(open){
        const id=open.getAttribute("data-open");
        setHash(["lesson", id]);
        return;
      }
      const done=e.target.closest("[data-done]");
      if(done){
        const id=done.getAttribute("data-done");
        progress.completed[id]=true;
        saveProgress(progress);
        toast("Отмечено");
        draw();
        return;
      }
    });
    $("#reviewShuffle").addEventListener("click", draw);
    draw();
  }

function init(){
    applySettings(settings);

    // Build basic layout
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand">
            <div class="logo"></div>
            <div>
              <h1>Таджвид • Учебник</h1>
              <div class="sub">Блоки • Заметки • Тесты • Экзамены</div>
            </div>
          </div>
          <div class="searchRow">
            <input id="searchInput" placeholder="Поиск по темам и примерам..." />
          </div>
          <div class="pills" id="pillRow"></div>
          <div id="blocksWrap"></div>
          <div class="hr"></div>
          <div class="small">Версия: v23 • без кеш‑ошибок</div>
        </aside>

        <main class="main">
          <div id="hero"></div>
          <div id="mainPanel"></div>
        </main>
      </div>
    `;

    attachSidebarHandlers();
    window.addEventListener("hashchange", onRoute);
    if(!location.hash) setHash(["lesson", firstLesson()]);
    onRoute();

    // register SW (safe version)
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./sw.js").catch(()=>{ /* ignore */ });
    }
  }

  init();
})();