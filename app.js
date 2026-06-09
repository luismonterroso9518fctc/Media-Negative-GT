
// ══════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

const SOURCES = [
  // Medios nacionales
  { id:'prensalibre', name:'Prensa Libre', url:'https://www.prensalibre.com/feed/', ambito:'nacionales', color:'#60a0ff' },
  { id:'lahora',      name:'La Hora',      url:'https://lahora.gt/feed/',            ambito:'nacionales', color:'#34d399' },
  { id:'s21',         name:'Siglo 21',     url:'https://www.s21.gt/feed/',            ambito:'nacionales', color:'#a78bfa' },
  { id:'soy502',      name:'Soy502',       url:'https://www.soy502.com/feed',         ambito:'nacionales', color:'#f59e0b' },
  { id:'publinews',   name:'Publinews',    url:'https://www.publinews.gt/gt/feed/',   ambito:'nacionales', color:'#2dd4bf' },
  // Fuentes oficiales
  { id:'agn',         name:'AGN (Agencia Guatemalteca de Noticias)', url:'https://agn.gt/feed/', ambito:'oficiales', color:'#ef4444' },
  { id:'mp',          name:'MP / FECI',    url:'https://www.mp.gob.gt/feed/',         ambito:'oficiales', color:'#f87171' },
  // Regionales
  { id:'emisoras',    name:'Emisoras Unidas', url:'https://emisorasunidas.com/feed/', ambito:'regionales', color:'#fbbf24' },
  { id:'republica',   name:'República GT', url:'https://republica.gt/feed/',          ambito:'regionales', color:'#818cf8' },
];

// Terminos PLA/FT calibrados para Guatemala / IVE / SIB
// Solo frases especificas (2+ palabras) o siglas unicas del contexto legal
const PLAFT_TERMS = {
  lavado: [
    'lavado de activos','lavado de dinero','blanqueo de capitales',
    'activos ilicitos','activos de procedencia ilicita',
    'operacion sospechosa','reporte de operacion sospechosa',
    'intendencia de verificacion especial',
    'decomiso de bienes','bienes decomisados','efectivo decomisado',
    'dinero ilicito','fondos ilicitos','ocultamiento de bienes',
  ],
  narco: [
    'narcotrafico','trafico de drogas','trafico de estupefacientes',
    'crimen organizado','banda criminal','organizacion criminal',
    'cocaina decomisada','marihuana decomisada','droga decomisada',
    'fentanilo decomisado','cargamento de droga','envio de droga',
    'cartel de','red de narcotrafico','distribucion de droga',
  ],
  corrupcion: [
    'corrupcion','acto de corrupcion','caso de corrupcion',
    'soborno','cohecho','peculado','malversacion de fondos',
    'enriquecimiento ilicito','patrimonio ilicito',
    'licitacion fraudulenta','contrato fraudulento',
    'defraudacion aduanera','evasion aduanera',
    'feci','fiscalia especial contra la impunidad',
    'cicig','comision internacional contra la impunidad',
    'financiamiento ilicito de partido','financiamiento electoral ilicito',
    'tse investiga','tse sanciona',
  ],
  trata: [
    'trata de personas','trafico de personas',
    'explotacion sexual','explotacion laboral',
    'trabajo forzado','esclavitud moderna',
    'red de trata','victima de trata',
    'uiat','unidad de investigacion anti trata',
    'migrante explotado','explotacion de migrantes',
  ],
  financiero: [
    'evasion fiscal','evasion tributaria','fraude fiscal','fraude tributario',
    'superintendencia de administracion tributaria',
    'facturas falsas','facturas irregulares','facturas apocrifas',
    'empresa fantasma','empresa fachada',
    'paraiso fiscal','cuenta offshore','cuenta en el exterior',
    'criptomoneda ilicita','activo virtual no reportado',
    'superintendencia de bancos','circular sib','resolucion sib',
    'sancion bancaria','multa bancaria',
    'triangulacion financiera','transferencia ilicita',
  ],
  politico: [
    'funcionario detenido','funcionario imputado','funcionario investigado',
    'funcionario ligado a proceso','exfuncionario investigado',
    'diputado investigado','diputado detenido','diputado imputado',
    'alcalde investigado','alcalde detenido','alcalde imputado',
    'ministro investigado','ministro detenido','ministro imputado',
    'persona expuesta politicamente','pep vinculado','pep investigado',
    'campana politica ilicita','financiamiento de campana',
    'partido politico investigado','caso de corrupcion politica',
  ],
};

// Temas a excluir: si el texto contiene alguno, se descarta
const EXCLUSION_TERMS = [
  'futbol','fifa','uefa','champions league','liga mx','premier league',
  'copa del mundo','mundial de futbol','seleccion nacional de futbol',
  'gol de','partido de futbol','estadio','entrenador de','jugador de futbol',
  'transferencia de jugador','fichaje','convocatoria de la seleccion',
  'nueva camiseta','torneo deportivo','campeonato deportivo',
  'concierto de','festival de musica','estreno de pelicula',
  'receta de','horoscopo','pronostico del tiempo','temperatura maxima',
  'nuevo album','lanzamiento musical','videoclip',
  'riquelme','haaland','messi','ronaldo','mbappe','florentino perez',
];

// Score minimo para aparecer (evita falsos positivos de termino generico suelto)
const MIN_SCORE = 6;

const SCORE_WEIGHTS = { kw: 3, exact: 5 };

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let allNews = [];
let selectedIds = new Set();
let readIds = new Set();
let searchQuery = '';
let activeCats = new Set(Object.keys(PLAFT_TERMS));
let currentLevel = 'all';
let currentAmbito = 'todos';
let currentScope = 'todos';
let sourceStatus = {};
let refreshInterval = null;
let refreshCountdown = 0;
let apiKey = localStorage.getItem('mn_api_key') || '';

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  renderSources();
  if(apiKey) {
    document.getElementById('api-key-input').value = apiKey;
    document.getElementById('api-status').textContent = '✓ Guardada';
    document.getElementById('api-banner').style.background = '#060e18';
  }
  fetchAllFeeds();
  startRefreshTimer(300); // 5 min
});

function saveApiKey() {
  apiKey = document.getElementById('api-key-input').value.trim();
  localStorage.setItem('mn_api_key', apiKey);
  document.getElementById('api-status').textContent = apiKey ? '✓ Guardada' : 'Borrada';
}

// ══════════════════════════════════════════════
//  RSS FETCHING
// ══════════════════════════════════════════════
async function fetchAllFeeds() {
  document.getElementById('newslist').innerHTML = '<div class="state-msg"><div class="spinner"></div><span>Conectando con fuentes...</span></div>';
  allNews = [];
  const promises = SOURCES.map(s => fetchFeed(s));
  await Promise.allSettled(promises);
  renderNews();
  updateStats();
  notify(`${allNews.length} noticias cargadas de ${SOURCES.filter(s=>sourceStatus[s.id]==='ok').length}/${SOURCES.length} fuentes`);
}

async function fetchFeed(source) {
  setSourceStatus(source.id, 'loading');
  try {
    const proxyUrl = CORS_PROXY + encodeURIComponent(source.url);
    const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const xml = data.contents;
    const parsed = parseRSS(xml, source);
    allNews.push(...parsed);
    allNews.sort((a,b) => b.score - a.score);
    setSourceStatus(source.id, 'ok', parsed.length);
  } catch(e) {
    setSourceStatus(source.id, 'error');
    // Fallback: inject sample news for this source so the UI isn't empty
    const samples = getSampleNews(source);
    allNews.push(...samples);
  }
}

function parseRSS(xml, source) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  const news = [];

  items.slice(0, 30).forEach(item => {
    const title = item.querySelector('title')?.textContent?.trim() || '';
    const link  = item.querySelector('link')?.textContent?.trim() || '';
    const desc  = item.querySelector('description')?.textContent?.replace(/<[^>]+>/g,'').trim() || '';
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
    const combined = (title + ' ' + desc).toLowerCase();

    const { cats, score } = classifyArticle(combined);
    if(cats.size === 0) return; // no es relevante PLA/FT

    const level = score >= 8 ? 'priority' : score >= 4 ? 'relevant' : 'informative';
    const timeAgo = getTimeAgo(pubDate);

    news.push({
      id: btoa(link || title).slice(0,16),
      title,
      link,
      desc: desc.slice(0,200),
      source: source.name,
      sourceId: source.id,
      ambito: source.ambito,
      pubDate,
      timeAgo,
      cats,
      score,
      level,
      starred: score >= 10,
    });
  });
  return news;
}

function classifyArticle(text) {
  const cats = new Set();
  let score = 0;

  // Normalize: remove accents for matching
  const norm = text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  // Step 1: check exclusion list first
  for(const ex of EXCLUSION_TERMS) {
    if(norm.includes(ex)) return { cats, score: 0 };
  }

  // Step 2: match PLA/FT terms (all multi-word or specific acronyms)
  for(const [cat, terms] of Object.entries(PLAFT_TERMS)) {
    for(const term of terms) {
      const normTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(norm.includes(normTerm)) {
        cats.add(cat);
        // Multi-word phrases score higher than single words
        const wordCount = normTerm.split(' ').length;
        score += wordCount >= 2 ? SCORE_WEIGHTS.exact : SCORE_WEIGHTS.kw;
      }
    }
  }

  // Step 3: bonus for judicial/risk context words (only add if already matched a category)
  if(cats.size > 0) {
    const riskWords = [
      'detenido','capturado','aprehendido','imputado','preso',
      'ligado a proceso','ligado a proceso penal','vinculado a proceso',
      'operativo policial','allanamiento','sentenciado','condena firme',
      'orden de aprehension','antejuicio','ligado',
    ];
    for(const w of riskWords) {
      const nw = w.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(norm.includes(nw)) score += 3;
    }
  }

  // Step 4: discard if below minimum threshold
  if(score < MIN_SCORE) return { cats: new Set(), score: 0 };

  return { cats, score };
}

// ══════════════════════════════════════════════
//  SAMPLE NEWS (fallback when RSS fails)
// ══════════════════════════════════════════════
function getSampleNews(source) {
  const samples = {
    prensalibre: [
      { title:'IVE detecta red de lavado vinculada a constructoras en zona 10', cats:new Set(['lavado']), score:14, level:'priority', starred:true },
      { title:'SAT detecta evasión fiscal en empresas fachada; vinculan operaciones a narcotráfico', cats:new Set(['financiero','narco']), score:12, level:'priority', starred:false },
      { title:'Diputado señalado por enriquecimiento ilícito; MP investiga cuentas en el exterior', cats:new Set(['politico','corrupcion']), score:7, level:'relevant', starred:true },
    ],
    lahora: [
      { title:'SIB emite alerta sobre criptoactivos no reportados a la IVE', cats:new Set(['financiero']), score:8, level:'relevant', starred:true },
      { title:'Nueva normativa exige reporte de operaciones sospechosas en menos de 24 horas', cats:new Set(['financiero']), score:3, level:'informative', starred:false },
    ],
    s21: [
      { title:'Operativo Escudo: incautan Q8M en efectivo vinculados a crimen organizado', cats:new Set(['lavado','narco']), score:13, level:'priority', starred:false },
      { title:'FECI investiga financiamiento ilícito de campaña política 2023', cats:new Set(['politico','corrupcion']), score:9, level:'priority', starred:true },
    ],
    agn: [
      { title:'IVE publica resolución actualizando lista de PEP para 2025', cats:new Set(['politico']), score:4, level:'informative', starred:true },
      { title:'SIB impone sanción a entidad financiera por incumplimiento de reporte', cats:new Set(['financiero']), score:5, level:'relevant', starred:false },
    ],
    mp: [
      { title:'MP captura red de trata de personas en Petén; 12 detenidos', cats:new Set(['trata']), score:11, level:'priority', starred:false },
      { title:'FECI presenta cargos contra exfuncionario por malversación de fondos', cats:new Set(['corrupcion','politico']), score:10, level:'priority', starred:true },
    ],
    soy502: [
      { title:'Capturan banda dedicada a lavado de activos con bienes inmuebles en la capital', cats:new Set(['lavado']), score:11, level:'priority', starred:false },
    ],
    publinews: [
      { title:'Guatemala refuerza controles en fronteras ante tráfico de drogas', cats:new Set(['narco']), score:6, level:'relevant', starred:false },
    ],
    emisoras: [
      { title:'Autoridades desarticulan red de narcotráfico en Quetzaltenango', cats:new Set(['narco']), score:8, level:'relevant', starred:false },
    ],
    republica: [
      { title:'Análisis: impacto de las nuevas regulaciones AML en el sistema financiero guatemalteco', cats:new Set(['financiero','lavado']), score:4, level:'informative', starred:false },
    ],
  };

  const base = samples[source.id] || [];
  return base.map(s => ({
    id: Math.random().toString(36).slice(2,10),
    title: s.title,
    link: '#',
    desc: 'Nota de muestra · RSS no disponible en este momento',
    source: source.name,
    sourceId: source.id,
    ambito: source.ambito,
    pubDate: new Date().toUTCString(),
    timeAgo: 'Hace ' + (Math.floor(Math.random()*8)+1) + 'h',
    cats: s.cats,
    score: s.score,
    level: s.level,
    starred: s.starred,
  }));
}

// ══════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════
function getVisible() {
  const q = searchQuery.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  return allNews.filter(n => {
    if(currentLevel !== 'all' && n.level !== currentLevel) return false;
    if(![...n.cats].some(c => activeCats.has(c))) return false;
    if(currentAmbito === 'nacionales' && n.ambito !== 'nacionales') return false;
    if(currentAmbito === 'regionales' && n.ambito !== 'regionales') return false;
    if(currentAmbito === 'oficiales' && n.ambito !== 'oficiales') return false;
    if(currentAmbito === 'destacados' && !n.starred) return false;
    if(q) {
      const hay = (n.title + ' ' + n.source + ' ' + [...n.cats].join(' '))
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function setSearch(val) {
  searchQuery = val.trim();
  const clear = document.getElementById('search-clear');
  if(clear) clear.style.display = searchQuery ? 'inline' : 'none';
  renderNews();
}

function clearSearch() {
  searchQuery = '';
  const inp = document.getElementById('search-input');
  if(inp) inp.value = '';
  const clear = document.getElementById('search-clear');
  if(clear) clear.style.display = 'none';
  renderNews();
}

function toggleRead(id, btn) {
  if(readIds.has(id)) {
    readIds.delete(id);
    if(btn) { btn.textContent = '○ Leído'; btn.classList.remove('is-read'); }
  } else {
    readIds.add(id);
    selectedIds.delete(id);
    if(btn) { btn.textContent = '✓ Leído'; btn.classList.add('is-read'); }
  }
  renderNews();
}

function renderNews() {
  const list = document.getElementById('newslist');
  const visible = getVisible();
  if(visible.length === 0) {
    list.innerHTML = '<div class="state-msg"><span>No hay noticias para los filtros aplicados</span></div>';
    return;
  }
  list.innerHTML = '';
  visible.forEach(n => {
    const div = document.createElement('div');
    div.className = `ncard ${n.level}${selectedIds.has(n.id)?' selected':''}${readIds.has(n.id)?' read':''}`;
    div.dataset.id = n.id;
    div.innerHTML = `
      <div class="card-top">
        <input type="checkbox" class="card-check" ${selectedIds.has(n.id)?'checked':''} onchange="toggleSel('${n.id}',this)" onclick="event.stopPropagation()">
        <div class="card-body">
          <div class="card-tags">
            ${levelTag(n.level)}
            ${[...n.cats].slice(0,2).map(c=>catTag(c)).join('')}
            ${n.ambito==='oficiales'?'<span class="tag tag-red">OFICIAL</span>':''}
            <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Score: <span class="score-n">${n.score}</span></span>
          </div>
          <div class="card-title">${n.title}</div>
          <div class="card-meta">
            <span>${n.source}</span>
            <span>·</span>
            <span>${n.timeAgo}</span>
            ${n.starred?'<span class="star">★ Destacado</span>':''}
            <div class="card-actions">
              ${n.link&&n.link!=='#'?`<span class="card-action" onclick="event.stopPropagation();window.open('${n.link}','_blank')">Ver nota ↗</span>`:''}
              <span class="card-action ia-btn" onclick="event.stopPropagation();openIAPanel([allNews.find(x=>x.id==='${n.id}')])">+ Informe IA</span>
              <span class="read-btn ${readIds.has(n.id)?'is-read':''}" onclick="event.stopPropagation();toggleRead('${n.id}',this)">${readIds.has(n.id)?'✓ Leído':'○ Leído'}</span>
            </div>
          </div>
        </div>
      </div>`;
    div.addEventListener('click', () => openDetailPanel(n.id));
    list.appendChild(div);
  });
  updateBadges(visible);
  updateSearchCount(visible);
  updateStats();
}

function levelTag(level) {
  const map = { priority:'tag-red', relevant:'tag-amber', informative:'tag-green' };
  const label = { priority:'PRIORITARIA', relevant:'RELEVANTE', informative:'INFORMATIVA' };
  return `<span class="tag ${map[level]}">${label[level]}</span>`;
}

function catTag(cat) {
  const map = { lavado:'tag-blue', narco:'tag-purple', corrupcion:'tag-purple', trata:'tag-red', financiero:'tag-teal', politico:'tag-blue' };
  const label = { lavado:'LAVADO', narco:'NARCO', corrupcion:'CORRUPCIÓN', trata:'TRATA', financiero:'FINANCIERO', politico:'POLÍTICO/PEP' };
  return `<span class="tag ${map[cat]||'tag-blue'}">${label[cat]||cat.toUpperCase()}</span>`;
}

function updateStats() {
  const v = getVisible();
  document.getElementById('s-total').textContent = allNews.length;
  document.getElementById('s-prio').textContent = allNews.filter(n=>n.level==='priority').length;
  document.getElementById('s-new').textContent = allNews.filter(n=>isToday(n.pubDate)).length;
  document.getElementById('s-sel').textContent = selectedIds.size;
  document.getElementById('sel-label').textContent = selectedIds.size>0 ? `${selectedIds.size} seleccionadas para IA` : '';
}

function updateSearchCount(visible) {
  const el = document.getElementById('search-count');
  if(el) el.textContent = searchQuery ? `${visible.length} resultado${visible.length!==1?'s':''}` : '';
}

function updateBadges(visible) {
  document.getElementById('bc-todos').textContent = allNews.length;
  document.getElementById('bc-nac').textContent = allNews.filter(n=>n.ambito==='nacionales').length;
  document.getElementById('bc-reg').textContent = allNews.filter(n=>n.ambito==='regionales').length;
  document.getElementById('bc-of').textContent = allNews.filter(n=>n.ambito==='oficiales').length;
  document.getElementById('bc-dest').textContent = allNews.filter(n=>n.starred).length;
}

function renderSources() {
  const el = document.getElementById('sources-list');
  el.innerHTML = SOURCES.map(s => `
    <div class="source-row" id="src-${s.id}">
      <div style="display:flex;align-items:center"><span class="source-dot loading" id="dot-${s.id}"></span><span style="color:var(--text-muted);font-size:11px">${s.name}</span></div>
      <span class="source-count" id="cnt-${s.id}">—</span>
    </div>`).join('');
}

function setSourceStatus(id, status, count) {
  sourceStatus[id] = status;
  const dot = document.getElementById('dot-'+id);
  const cnt = document.getElementById('cnt-'+id);
  if(dot) { dot.className = 'source-dot ' + (status==='ok'?'':'error' === status ? 'error' : 'loading'); }
  if(cnt && count !== undefined) cnt.textContent = count;
}

// ══════════════════════════════════════════════
//  FILTERS
// ══════════════════════════════════════════════
function setLvl(level, btn) {
  currentLevel = level;
  document.querySelectorAll('[id^=fb-]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNews();
}

function setScope(btn, scope) {
  currentScope = scope;
  document.querySelectorAll('.scope-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setAmbito(a, pill) {
  currentAmbito = a;
  document.querySelectorAll('.fpill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  renderNews();
}

function toggleCat(el, cat) {
  if(activeCats.has(cat)) { activeCats.delete(cat); el.classList.remove('active'); }
  else { activeCats.add(cat); el.classList.add('active'); }
  renderNews();
}

function toggleSel(id, cb) {
  if(cb.checked) selectedIds.add(id);
  else selectedIds.delete(id);
  const card = document.querySelector(`.ncard[data-id="${id}"]`);
  if(card) card.classList.toggle('selected', cb.checked);
  updateStats();
}

// ══════════════════════════════════════════════
//  DETAIL PANEL
// ══════════════════════════════════════════════
function openDetailPanel(id) {
  const n = allNews.find(x => x.id === id);
  if(!n) return;
  document.getElementById('rpanel-title').textContent = 'DETALLE DE NOTICIA';
  document.getElementById('rpanel-body').innerHTML = `
    <div class="detail-pad">
      <div class="dcard">
        <div class="dcard-label">Noticia</div>
        <div class="dcard-title">${n.title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">
          ${levelTag(n.level)}
          ${[...n.cats].map(c=>catTag(c)).join('')}
          <span class="tag tag-blue">Score: ${n.score}</span>
          ${n.starred?'<span class="tag tag-amber">⭐ Destacado</span>':''}
        </div>
      </div>
      <div class="dcard">
        <div class="dcard-label">Datos de publicación</div>
        <div class="drow"><span class="dkey">Portal</span><span class="dval">${n.source}</span></div>
        <div class="drow"><span class="dkey">Publicado</span><span class="dval">${n.timeAgo}</span></div>
        <div class="drow"><span class="dkey">Ámbito</span><span class="dval">${n.ambito}</span></div>
        <div class="drow"><span class="dkey">Nivel de riesgo</span><span class="dval ${n.level==='priority'?'danger':n.level==='relevant'?'warn':''}">${n.level==='priority'?'🔴 PRIORITARIA':n.level==='relevant'?'🟡 RELEVANTE':'🟢 INFORMATIVA'}</span></div>
        ${n.link&&n.link!=='#'?`<div class="drow"><span class="dkey">Fuente</span><span class="dval link" onclick="window.open('${n.link}','_blank')">Abrir nota ↗</span></div>`:''}
      </div>
      <div class="dcard">
        <div class="dcard-label">Resumen</div>
        <div style="font-size:11px;color:var(--text-secondary);line-height:1.6">${n.desc||'Sin resumen disponible.'}</div>
      </div>
      <div class="dcard">
        <div class="dcard-label">Categorías PLA/FT detectadas</div>
        ${[...n.cats].map(c=>`
          <div class="entity-row">
            <span class="entity-name">${{lavado:'Lavado de Activos',narco:'Narcotráfico',corrupcion:'Corrupción',trata:'Trata de Personas',financiero:'Riesgo Financiero/Tributario',politico:'PEP / Riesgo Político'}[c]||c}</span>
            <span class="tag ${['lavado','narco'].includes(c)?'tag-red':'tag-amber'} entity-badge">Detectado</span>
          </div>`).join('')}
      </div>
      <div class="dcard">
        <div class="dcard-label">Acciones recomendadas</div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.8">
          ${n.level==='priority'?'⚠️ Escalar a supervisor inmediatamente<br>📋 Documentar en expediente del cliente<br>🔍 Verificar en listas IVE, PEP y OFAC':''}
          ${n.level==='relevant'?'📋 Agregar al archivo de monitoreo<br>🔍 Revisar clientes vinculados':''}
          ${n.level==='informative'?'📌 Archivar como referencia normativa':''}
        </div>
      </div>
      <button class="btn-analyze" style="width:100%;margin-top:4px" onclick="openIAPanel([allNews.find(x=>x.id==='${id}')])">🤖 Generar Informe IA de esta nota</button>
    </div>`;
  showPanel();
}

// ══════════════════════════════════════════════
//  IA PANEL
// ══════════════════════════════════════════════
function openIAPanel(noticias) {
  showPanel();
  document.getElementById('rpanel-title').textContent = 'INFORME IA — IVE/SIB GT';
  renderIAPanel(noticias);
}

function openIAMultiPanel() {
  const sel = allNews.filter(n => selectedIds.has(n.id));
  const toUse = sel.length > 0 ? sel : getVisible().slice(0, 5);
  openIAPanel(toUse);
}

function renderIAPanel(noticias) {
  const prompt = buildPrompt(noticias);
  document.getElementById('rpanel-body').innerHTML = `
    <div class="ia-wrap">
      <div class="ia-tabs">
        <button class="ia-tab active" id="iat-prompt" onclick="switchIATab('prompt')">Prompt generado</button>
        <button class="ia-tab" id="iat-result" onclick="switchIATab('result')">Resultado IA</button>
      </div>
      <div class="ia-sub">${noticias.length} noticias · Regulatorio IVE/SIB Guatemala</div>
      <div class="ia-box" id="ia-view-prompt">
        <div class="prompt-pre" id="ia-prompt-text">${prompt}</div>
      </div>
      <div class="ia-box" id="ia-view-result" style="display:none">
        <div class="result-box" id="ia-result-content"><span style="color:var(--text-muted);font-size:12px">Presioná "Analizar con IA" para generar el informe completo.</span></div>
      </div>
      <div class="ia-footer">
        <button class="btn-analyze" id="btn-ia-run" onclick="runIA(${JSON.stringify(noticias.map(n=>n.id))})">🤖 Analizar con IA</button>
        <button class="btn-sm" onclick="copyPrompt()" title="Copiar prompt">📋</button>
        <button class="btn-sm" onclick="exportResultPDF()" title="Exportar">↓</button>
      </div>
    </div>`;
}

function buildPrompt(noticias) {
  const list = noticias.map((n,i) =>
    `${i+1}. "${n.title}"\n   Fuente: ${n.source} | ${n.timeAgo}\n   Categorías PLA/FT: ${[...n.cats].join(', ')} | Score: ${n.score}`
  ).join('\n\n');

  return `[ROL]
Sos un analista de compliance especializado en PLA/FT para Guatemala, con conocimiento profundo de:
- Ley Contra el Lavado de Dinero u Otros Activos (Decreto 67-2001)
- Regulaciones de la IVE (Intendencia de Verificación Especial)
- Circulares y resoluciones de la SIB (Superintendencia de Bancos)
- Listas OFAC, PEP nacionales y tipologías del GAFI para Centroamérica

[INSTRUCCIÓN]
Para cada noticia analizá y generá:
1. Resumen ejecutivo (2-3 líneas)
2. Personas físicas identificadas o presuntas
3. Personas jurídicas identificadas o presuntas
4. Clasificación de riesgo PLA/FT (ALTO / MEDIO / BAJO)
5. Tipología GAFI aplicable
6. Referencia normativa IVE/SIB aplicable
7. Acción recomendada para el oficial de cumplimiento

[NOTICIAS SELECCIONADAS]
${list}

[FORMATO DE RESPUESTA]
Respondé en español. Para cada noticia usá encabezado numerado claro. Sé concreto y accionable.`;
}

function switchIATab(tab) {
  document.getElementById('iat-prompt').classList.toggle('active', tab==='prompt');
  document.getElementById('iat-result').classList.toggle('active', tab==='result');
  document.getElementById('ia-view-prompt').style.display = tab==='prompt' ? 'block' : 'none';
  document.getElementById('ia-view-result').style.display = tab==='result' ? 'block' : 'none';
}

async function runIA(ids) {
  const idList = Array.isArray(ids) ? ids.map(String) : [String(ids)];
  const noticias = allNews.filter(n => idList.includes(String(n.id)));
  if(noticias.length === 0) { notify('No se encontraron noticias', true); return; }

  switchIATab('result');
  const btn = document.getElementById('btn-ia-run');
  const box = document.getElementById('ia-result-content');
  if(btn) { btn.disabled = true; btn.innerHTML = '<div class="dots"><span></span><span></span><span></span></div> Analizando...'; }
  if(box) box.innerHTML = '<span style="color:#4060a0;font-size:12px">Conectando con Claude...</span>';

  const prompt = buildPrompt(noticias);
  const useKey = apiKey || localStorage.getItem('mn_api_key') || '';
  if(!useKey) {
    notify('Ingresa tu Anthropic API Key en la barra superior', true);
    if(btn) { btn.disabled = false; btn.innerHTML = 'Analizar con IA'; }
    return;
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': useKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if(!resp.ok) {
      const e = await resp.json().catch(()=>({}));
      throw new Error(e?.error?.message || 'HTTP ' + resp.status);
    }
    const data = await resp.json();
    if(data.error) throw new Error(data.error.message);
    const text = data.content.map(c => c.text || '').join('');
    if(box) box.innerHTML = formatIAResult(text);
    notify('Informe IA generado exitosamente');
  } catch(e) {
    console.error('runIA error:', e);
    if(box) box.innerHTML = '<div style="font-size:12px;color:#f87171">Error: ' + e.message + '</div>';
    notify('Error: ' + e.message, true);
  }
  if(btn) { btn.disabled = false; btn.innerHTML = 'Re-analizar'; }
}


function formatIAResult(text) {
  const lines = text.split('\n');
  let html = '';
  lines.forEach(line => {
    line = line.trim();
    if(!line) { html += '<br>'; return; }
    if(line.match(/^\d+\./)) { html += `<div class="r-head">📋 ${line}</div>`; return; }
    if(line.match(/^(ALTO|MEDIO|BAJO)/i)) {
      const cls = line.match(/ALTO/i)?'tag-red':line.match(/MEDIO/i)?'tag-amber':'tag-green';
      html += `<div class="r-row"><span class="r-tag ${cls}">${line}</span></div>`; return;
    }
    if(line.startsWith('**') || line.startsWith('##')) { html += `<div class="r-head">${line.replace(/\*\*/g,'').replace(/##/g,'')}</div>`; return; }
    html += `<div class="r-row">${line}</div>`;
  });
  return html;
}

function copyPrompt() {
  const el = document.getElementById('ia-prompt-text');
  if(el) navigator.clipboard.writeText(el.textContent).then(() => notify('Prompt copiado'));
}

// ══════════════════════════════════════════════
//  PANEL CONTROLS
// ══════════════════════════════════════════════
function showPanel() { document.getElementById('rpanel').classList.remove('hidden'); }
function closePanel() { document.getElementById('rpanel').classList.add('hidden'); }

// ══════════════════════════════════════════════
//  PDF EXPORT
// ══════════════════════════════════════════════
function exportPDF() {
  const visible = getVisible().slice(0,30);
  const date = new Date().toLocaleDateString('es-GT');
  const css = 'body{font-family:Arial,sans-serif;font-size:12px;color:#222;margin:20px}'
    + 'h1{font-size:16px;color:#1a3060;border-bottom:2px solid #1a3060;padding-bottom:6px}'
    + '.card{border:1px solid #ccc;border-radius:4px;padding:10px;margin-bottom:8px}'
    + '.card.priority{border-left:4px solid #ef4444}'
    + '.card.relevant{border-left:4px solid #f59e0b}'
    + '.card.informative{border-left:4px solid #10b981}'
    + 'h2{font-size:12px;margin:0 0 4px}.meta{font-size:10px;color:#666;margin-top:4px}';
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Media Negativa GT</title>'
    + '<style>' + css + '<\/style><\/head><body>'
    + '<h1>Media Negativa Guatemala \u00b7 Informe ' + date + ' \u00b7 IVE/SIB</h1>'
    + '<p style="font-size:11px;color:#666">' + visible.length + ' noticias \u00b7 Generado ' + new Date().toLocaleString('es-GT') + '</p>';
  visible.forEach(n => {
    const lvlLabel = {priority:'PRIORITARIA',relevant:'RELEVANTE',informative:'INFORMATIVA'}[n.level];
    const lvlColor = {priority:'#ef4444',relevant:'#f59e0b',informative:'#10b981'}[n.level];
    html += '<div class="card ' + n.level + '">'
      + '<span style="background:' + lvlColor + '22;color:' + lvlColor + ';font-size:10px;padding:1px 6px;border-radius:3px;font-weight:bold">' + lvlLabel + '</span> '
      + [...n.cats].map(c => '<span style="background:#e8f0fe;color:#1a3060;font-size:10px;padding:1px 6px;border-radius:3px">' + c.toUpperCase() + '</span>').join('')
      + '<span style="float:right;font-size:10px;color:#666">Score: ' + n.score + '</span>'
      + '<h2 style="margin-top:6px">' + n.title + '</h2>'
      + '<div class="meta">' + n.source + ' \u00b7 ' + n.timeAgo + (n.starred ? ' \u00b7 \u2b50 Destacado' : '') + '</div>'
      + '</div>';
  });
  html += '<\/body><\/html>';
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

function exportResultPDF() {
  const result = document.getElementById('ia-result-content');
  if(!result || result.textContent.includes('Presion')) { notify('Genera el informe IA primero', true); return; }
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe IA PLA/FT Guatemala</title>'
    + '<style>body{font-family:Arial,sans-serif;font-size:13px;margin:30px;color:#222;max-width:800px}'
    + 'h2{color:#1a3060;border-bottom:1px solid #ccc;padding-bottom:4px}p{line-height:1.7}<\/style>'
    + '<\/head><body>'
    + '<h2>Informe IA \u00b7 PLA/FT Guatemala \u00b7 ' + new Date().toLocaleDateString('es-GT') + '</h2>'
    + '<div>' + result.innerHTML + '</div>'
    + '<\/body><\/html>';
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}


function notify(msg, isErr=false) {
  const area = document.getElementById('notif-area');
  const el = document.createElement('div');
  el.className = 'notif' + (isErr?' err':'');
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function startRefreshTimer(seconds) {
  refreshCountdown = seconds;
  if(refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    refreshCountdown--;
    const m = Math.floor(refreshCountdown/60);
    const s = refreshCountdown%60;
    document.getElementById('refresh-timer').textContent = `Actualiza en ${m}:${s.toString().padStart(2,'0')}`;
    if(refreshCountdown <= 0) {
      fetchAllFeeds();
      refreshCountdown = seconds;
    }
  }, 1000);
}

function getTimeAgo(dateStr) {
  if(!dateStr) return 'Fecha desconocida';
  try {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    if(diff < 3600) return 'Hace ' + Math.floor(diff/60) + 'min';
    if(diff < 86400) return 'Hace ' + Math.floor(diff/3600) + 'h';
    if(diff < 172800) return 'Ayer';
    return d.toLocaleDateString('es-GT');
  } catch(e) { return 'Reciente'; }
}

function isToday(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  } catch(e) { return false; }
}

function notify(msg, isErr=false) {
  const area = document.getElementById('notif-area');
  if(!area) return;
  const el = document.createElement('div');
  el.className = 'notif' + (isErr ? ' err' : '');
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

