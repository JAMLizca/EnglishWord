/* =========================================================
   ENGLISH WORLD – Lógica del juego (JavaScript puro)
   Contenido del archivo:
     1. Configuración
     2. Banco de preguntas (5 mundos × 2 modalidades)
     3. Guardado con LocalStorage
     4. Utilidades
     5. Efectos de sonido (Web Audio)
     6. Navegación entre pantallas
     7. Mapa de mundos
     8. Motor del juego
     9. Tipos de actividad
    10. Resultados, diccionario de pronunciación y chat de Globi (sin conexión)
    11. Eventos e inicio
   ========================================================= */
'use strict';

/* ---------- 1. Configuración ---------- */
const STORAGE_KEY = 'englishWorld.v1';
const QUESTIONS_PER_ROUND = 6;   // preguntas por partida
const MAX_LIVES = 3;             // oportunidades (corazones)
const POINTS_OK = 10;            // puntos por acierto
const STREAK_BONUS = 5;          // extra desde el tercer acierto seguido
const MODES = ['primaria', 'secundaria'];

/* ---------- 2. Banco de preguntas ----------
   Funciones cortas para escribir cada tipo de actividad:
   mc(pregunta, correcta, [incorrectas], extras)  → selección múltiple / traducción / lectura
   listen(frase, correcta, [incorrectas])         → leer cómo suena y elegir
   match([[imagen, palabra], ...])                → relacionar
   complete(palabra, pista, [posiciones vacías])  → completar la palabra
   order(español, oración en inglés)              → construir la oración               */
const mc = (q, a, others, extra = {}) => ({ t: 'mc', q, a, opts: [a, ...others], ...extra });
const listen = (say, a, others) => ({ t: 'sound', say, a, opts: [a, ...others] });
const match = (pairs) => ({ t: 'match', pairs });
const complete = (word, hint, missing) => ({ t: 'complete', word, hint, missing });
const order = (es, sentence) => ({ t: 'order', es, words: sentence.split(' ') });

const WORLDS = [
  {
    name: 'Colors and Numbers', es: 'Colores y números', icon: '🎨', color: '#ff9eb0',
    primaria: [
      mc('What color is this?', 'red', ['blue', 'green', 'yellow'], { sub: '¿Qué color es?', color: '#e63946' }),
      mc('How many stars?', 'three', ['two', 'five', 'four'], { sub: '¿Cuántas estrellas hay?', img: '⭐⭐⭐' }),
      match([['🔵', 'blue'], ['🟢', 'green'], ['🟡', 'yellow'], ['🟣', 'purple']]),
      complete('yellow', '🟡 amarillo', [1, 4]),
      listen('seven', '7', ['5', '9', '2']),
      mc('¿Cómo se dice «azul» en inglés?', 'blue', ['black', 'brown', 'pink'], { label: 'Traduce' }),
      mc('How many apples?', 'six', ['seven', 'four', 'nine'], { sub: '¿Cuántas manzanas hay?', img: '🍎🍎🍎🍎🍎🍎' }),
      match([['1', 'one'], ['4', 'four'], ['8', 'eight'], ['10', 'ten']]),
    ],
    secundaria: [
      mc('What color do you get when you mix blue and yellow?', 'green', ['orange', 'purple', 'brown']),
      mc('Which number is “forty-seven”?', '47', ['74', '14', '407']),
      order('El carro rojo es rápido.', 'The red car is fast.'),
      complete('thirteen', 'trece (13)', [2, 4, 6]),
      mc('¿Cómo se dice «gris» en inglés?', 'gray', ['brown', 'pink', 'silver'], { label: 'Traduce' }),
      mc('How many orange pencils does Anna have?', 'seven', ['five', 'twelve', 'six'],
        { label: 'Lectura', text: 'Anna has twelve pencils. Five are blue and the rest are orange.' }),
      listen('one hundred and twenty', '120', ['112', '102', '220']),
      order('Hay quince estudiantes en la clase.', 'There are fifteen students in the class.'),
    ],
  },
  {
    name: 'Animals', es: 'Animales', icon: '🦁', color: '#ffd166',
    primaria: [
      mc('What animal is this?', 'dog', ['cat', 'bird', 'fish'], { sub: '¿Qué animal es?', img: '🐶' }),
      listen('elephant', '🐘', ['🦒', '🐒', '🦁']),
      match([['🐱', 'cat'], ['🐮', 'cow'], ['🐴', 'horse'], ['🐷', 'pig']]),
      complete('rabbit', '🐰 conejo', [1, 4]),
      mc('¿Cómo se dice «pájaro» en inglés?', 'bird', ['bear', 'bee', 'frog'], { label: 'Traduce' }),
      mc('What animal is this?', 'lion', ['tiger', 'bear', 'monkey'], { sub: '¿Qué animal es?', img: '🦁' }),
      listen('duck', '🦆', ['🐔', '🐸', '🐢']),
    ],
    secundaria: [
      mc('Which animal is a mammal that lives in the ocean?', 'whale', ['shark', 'octopus', 'penguin']),
      order('Los tigres son más rápidos que las tortugas.', 'Tigers are faster than turtles.'),
      mc('¿Cómo se dice «mariposa» en inglés?', 'butterfly', ['dragonfly', 'ladybug', 'bee'], { label: 'Traduce' }),
      complete('giraffe', '🦒 jirafa', [1, 3, 6]),
      mc('When do bats look for food?', 'At night', ['During the day', 'In the morning', 'At noon'],
        { label: 'Lectura', text: 'Bats sleep during the day and hunt at night. They use sound to find food in the dark.' }),
      listen('The owl can see in the dark.', 'El búho puede ver en la oscuridad.',
        ['El águila vuela muy alto.', 'El búho duerme en la noche.', 'El lobo vive en el bosque.']),
      mc('Choose the correct plural: one mouse, two ___', 'mice', ['mouses', 'mices', 'mouse'], { say: 'one mouse, two mice' }),
    ],
  },
  {
    name: 'Fruits and Food', es: 'Frutas y alimentos', icon: '🍎', color: '#95e6a8',
    primaria: [
      mc('What fruit is this?', 'apple', ['banana', 'orange', 'grapes'], { sub: '¿Qué fruta es?', img: '🍎' }),
      complete('banana', '🍌 banano', [1, 3]),
      mc('¿Cómo se dice «leche» en inglés?', 'milk', ['water', 'juice', 'bread'], { label: 'Traduce' }),
      match([['🍞', 'bread'], ['🧀', 'cheese'], ['🥚', 'egg'], ['🍕', 'pizza']]),
      listen('strawberry', '🍓', ['🍒', '🍉', '🍍']),
      mc('What fruit is this?', 'grapes', ['pear', 'lemon', 'apple'], { sub: '¿Qué fruta es?', img: '🍇' }),
      complete('water', '💧 agua', [1, 3]),
    ],
    secundaria: [
      mc('Which one is a vegetable?', 'carrot', ['pear', 'peach', 'cherry']),
      order('Me gustaría un vaso de jugo de naranja.', 'I would like a glass of orange juice.'),
      mc('¿Cómo se dice «desayuno» en inglés?', 'breakfast', ['lunch', 'dinner', 'snack'], { label: 'Traduce' }),
      complete('pineapple', '🍍 piña', [1, 4, 7]),
      mc("Why doesn't Tom eat peanut butter?", 'He is allergic to nuts',
        ["He doesn't like bread", 'He prefers jam', 'He is not hungry'],
        { label: 'Lectura', text: 'Tom is allergic to nuts, so he never eats peanut butter. He prefers cheese sandwiches.' }),
      mc("Complete: There isn't ___ milk in the fridge.", 'any', ['some', 'many', 'a'],
        { say: "There isn't any milk in the fridge." }),
      listen('Could I have the menu, please?', '¿Me puede traer el menú, por favor?',
        ['¿Me puede traer la cuenta, por favor?', '¿Dónde queda el restaurante?', '¿Quieres ver el menú?']),
    ],
  },
  {
    name: 'My Family', es: 'Mi familia', icon: '👨‍👩‍👧‍👦', color: '#c9b6ff',
    primaria: [
      mc('¿Cómo se dice «mamá» en inglés?', 'mother', ['father', 'sister', 'brother'], { label: 'Traduce', img: '👩' }),
      mc('¿Cómo se dice «abuelo» en inglés?', 'grandfather', ['grandmother', 'uncle', 'father'], { label: 'Traduce', img: '👴' }),
      match([['👨', 'father'], ['👩', 'mother'], ['👶', 'baby'], ['👵', 'grandmother']]),
      mc('He is my ___.', 'brother', ['sister', 'mother', 'aunt'],
        { label: 'Completa la oración', sub: '👦 Él es mi hermano.', say: 'He is my brother.' }),
      complete('sister', '👧 hermana', [1, 4]),
      listen('baby', '👶', ['👴', '👩', '👨']),
      mc('I love my ___.', 'family', ['school', 'house', 'dog'],
        { label: 'Completa la oración', sub: '👨‍👩‍👧‍👦 Amo a mi familia.', say: 'I love my family.' }),
    ],
    secundaria: [
      mc("My mother's brother is my ___.", 'uncle', ['cousin', 'nephew', 'grandfather'], { say: "My mother's brother is my uncle." }),
      mc("My aunt's children are my ___.", 'cousins', ['nieces', 'brothers', 'parents'], { say: "My aunt's children are my cousins." }),
      order('Mi abuela vive con nosotros.', 'My grandmother lives with us.'),
      complete('daughter', 'hija', [1, 2, 6]),
      mc('¿Cómo se dice «esposo» en inglés?', 'husband', ['wife', 'son', 'nephew'], { label: 'Traduce' }),
      mc("How many children are in Lucy's family?", 'Four', ['Three', 'Two', 'Five'],
        { label: 'Lectura', text: 'Lucy has two brothers and one sister. Her sister, Kate, is the oldest child.' }),
      mc('Complete: My parents ___ from Colombia.', 'are', ['is', 'am', 'be'], { say: 'My parents are from Colombia.' }),
    ],
  },
  {
    name: 'School', es: 'La escuela', icon: '🏫', color: '#8fd3ff',
    primaria: [
      mc('What is this?', 'book', ['pencil', 'chair', 'door'], { sub: '¿Qué es esto?', img: '📖' }),
      mc('What is this?', 'pencil', ['ruler', 'book', 'table'], { sub: '¿Qué es esto?', img: '✏️' }),
      match([['🎒', 'backpack'], ['✂️', 'scissors'], ['📏', 'ruler'], ['📖', 'book']]),
      complete('teacher', '👩‍🏫 profesora', [2, 5]),
      mc('¿Cómo se dice «silla» en inglés?', 'chair', ['desk', 'window', 'board'], { label: 'Traduce' }),
      listen('school', '🏫', ['🏠', '🏥', '🏪']),
      mc('What is this?', 'crayon', ['eraser', 'glue', 'notebook'], { sub: '¿Qué es esto?', img: '🖍️' }),
    ],
    secundaria: [
      mc('¿Cómo se dice «tablero» en inglés?', 'board', ['notebook', 'bookshelf', 'desk'], { label: 'Traduce' }),
      mc('Complete: We ___ English on Mondays.', 'study', ['studies', 'studying', 'studied'], { say: 'We study English on Mondays.' }),
      order('¿Puedo ir al baño, por favor?', 'May I go to the bathroom, please?'),
      complete('homework', 'tarea', [1, 3, 5]),
      mc('How long can students keep the books?', 'Two weeks', ['Three weeks', 'Eight days', 'One month'],
        { label: 'Lectura', text: "The library opens at eight o'clock. Students can borrow three books for two weeks." }),
      mc('Which subject studies numbers and shapes?', 'Math', ['History', 'Art', 'Music']),
      listen('Open your books to page ten.', 'Abran sus libros en la página diez.',
        ['Cierren sus libros, por favor.', 'Lean diez páginas del libro.', 'Abran sus cuadernos en la página dos.']),
    ],
  },
];

const MAX_STARS = WORLDS.length * 3;

/* ---------- 3. Guardado con LocalStorage ---------- */
function defaultSave() {
  const blank = () => ({ points: 0, worlds: WORLDS.map(() => ({ stars: 0, best: 0, plays: 0 })) });
  return { mode: null, sound: true, primaria: blank(), secundaria: blank() };
}

/** Lee el progreso guardado y lo valida; si falta algo usa los valores iniciales. */
function loadSave() {
  const base = defaultSave();
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data || typeof data !== 'object') return base;
    if (MODES.includes(data.mode)) base.mode = data.mode;
    base.sound = data.sound !== false;
    MODES.forEach((m) => {
      const src = data[m];
      if (!src) return;
      base[m].points = Number(src.points) || 0;
      base[m].worlds.forEach((w, i) => {
        const s = src.worlds && src.worlds[i];
        if (!s) return;
        w.stars = Math.min(3, Math.max(0, Number(s.stars) || 0));
        w.best = Number(s.best) || 0;
        w.plays = Number(s.plays) || 0;
      });
    });
  } catch (e) { /* datos dañados o LocalStorage bloqueado: se empieza de cero */ }
  return base;
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (e) { /* sin almacenamiento */ }
}

let save = loadSave();
const progress = () => save[save.mode];                       // progreso de la modalidad actual
const totalStars = () => progress().worlds.reduce((n, w) => n + w.stars, 0);
const isUnlocked = (i) => i === 0 || progress().worlds[i - 1].stars > 0;

/* ---------- 4. Utilidades ---------- */
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  if (tag === 'button') node.type = 'button';
  return node;
}

/** Devuelve una copia desordenada del arreglo (Fisher–Yates). */
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/* ---------- 5. Efectos de sonido ---------- */
let audioCtx = null;

/** Toca una nota corta con Web Audio (no se usan archivos de sonido). */
function tone(freq, start, dur, type = 'sine') {
  if (!save.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + start;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) { /* navegador sin Web Audio */ }
}

const sfx = {
  ok: () => { tone(660, 0, 0.12); tone(880, 0.1, 0.2); },
  bad: () => { tone(200, 0, 0.3, 'square'); },
  tick: () => { tone(740, 0, 0.1); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25)); },
};

/* ---------- 6. Navegación entre pantallas ---------- */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
  $('hud').hidden = name === 'welcome' || name === 'mode';
  window.scrollTo(0, 0);
}

function updateHud() {
  if (!save.mode) return;
  $('hud-points').textContent = progress().points;
  $('hud-stars').textContent = totalStars();
  $('btn-sound').textContent = save.sound ? '🔊' : '🔇';
}

function showModeScreen() {
  document.querySelectorAll('.mode-card').forEach((c) => {
    c.classList.toggle('current', c.dataset.mode === save.mode);
  });
  showScreen('mode');
}

function setMode(mode) {
  save.mode = mode;
  document.body.dataset.mode = mode;
  persist();
  showMap();
}

/** Si hay una partida en curso pide confirmación antes de salir. */
function confirmLeave() {
  const playing = $('screen-game').classList.contains('active');
  return !playing || window.confirm('¿Salir del nivel? Se perderá el avance de esta partida.');
}

/* ---------- 7. Mapa de mundos ---------- */
const RANKS = [[15, 'English Master 👑'], [10, 'Champion 🏆'], [5, 'Adventurer 🧭'], [0, 'Explorer 🎒']];

function showMap(message) {
  const stars = totalStars();
  $('map-bubble').textContent = message || (stars === 0
    ? 'Empieza por el primer mundo. Gana estrellas para abrir los demás.'
    : 'Elige un mundo. Puedes repetirlos para ganar más estrellas.');
  $('rank-label').textContent = 'Rango: ' + RANKS.find((r) => stars >= r[0])[1];
  $('map-progress-text').textContent = `${stars} de ${MAX_STARS} estrellas`;
  $('map-bar').style.width = (stars / MAX_STARS) * 100 + '%';

  const map = $('world-map');
  map.innerHTML = '';
  WORLDS.forEach((w, i) => {
    const rec = progress().worlds[i];
    const open = isUnlocked(i);
    const node = el('button', 'world-node' + (open ? '' : ' locked'));
    node.style.setProperty('--c', w.color);
    node.append(el('span', 'world-icon', w.icon));
    node.append(el('span', 'world-name', `${i + 1}. ${w.name}`));
    node.append(el('span', 'world-es', open ? w.es : 'Bloqueado'));

    const starRow = el('span', 'world-stars');
    for (let s = 1; s <= 3; s++) starRow.append(el('span', s <= rec.stars ? '' : 'off', '⭐'));
    starRow.setAttribute('aria-label', `${rec.stars} de 3 estrellas`);
    node.append(starRow);

    if (!open) node.append(el('span', 'world-lock', '🔒'));
    else if (rec.stars === 3) node.append(el('span', 'world-medal', '🏅'));

    node.addEventListener('click', () => {
      if (open) return startWorld(i);
      sfx.bad();
      $('map-bubble').textContent = `Este mundo está cerrado. Gana al menos 1 estrella en “${WORLDS[i - 1].name}”.`;
      $('map-bubble').scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    const li = el('li');
    li.append(node);
    map.append(li);
  });

  updateHud();
  showScreen('map');
}

/* ---------- 8. Motor del juego ---------- */
let game = null;              // estado de la partida actual
const lastQuestion = {};      // última pregunta vista por mundo y modalidad

function startWorld(index) {
  const key = save.mode + index;
  let pool = shuffle(WORLDS[index][save.mode]);
  // Evita que la partida empiece con la misma pregunta con que terminó la anterior
  if (lastQuestion[key] && pool[0] === lastQuestion[key]) pool.push(pool.shift());

  game = {
    world: index, key,
    qs: pool.slice(0, QUESTIONS_PER_ROUND),
    idx: 0, lives: MAX_LIVES, score: 0, correct: 0, streak: 0,
    answered: false, explain: null,
  };
  $('game-world').textContent = `${WORLDS[index].icon} ${WORLDS[index].name}`;
  showScreen('game');
  renderQuestion();
}

function updateGameHud() {
  $('hearts').textContent = '❤️'.repeat(game.lives) + '🤍'.repeat(MAX_LIVES - game.lives);
  $('game-score').textContent = game.score;
  $('game-count').textContent = `${game.idx + 1}/${game.qs.length}`;
  const done = game.idx + (game.answered ? 1 : 0);
  $('game-bar').style.width = (done / game.qs.length) * 100 + '%';
}

function renderQuestion() {
  const q = game.qs[game.idx];
  game.answered = false;
  lastQuestion[game.key] = q;
  $('feedback').hidden = true;
  updateGameHud();

  const area = $('question-area');
  area.innerHTML = '';
  RENDERERS[q.t](q, area);
  window.scrollTo(0, 0);
}

/** Encabezado común de las preguntas: etiqueta, lectura, enunciado e imagen. */
function renderPrompt(area, { label, text, q, sub, color, img }) {
  area.append(el('span', 'q-label', label));
  if (text) area.append(el('p', 'q-passage', text));
  area.append(el('h2', 'q-prompt', q));
  if (sub) area.append(el('p', 'q-sub', sub));
  if (color) {
    const swatch = el('div', 'swatch');
    swatch.style.background = color;
    area.append(swatch);
  }
  if (img) area.append(el('div', 'q-img', img));
}

const PRAISE = ['Great job!', 'Awesome!', 'Well done!', 'Excellent!', 'You got it!', 'Super!'];

/** Cierra la pregunta: suma puntos o quita un corazón y muestra la retroalimentación.
    `explain` es la palabra u oración que Globi puede explicar en el chat. */
function finish(ok, answer, explain) {
  if (game.answered) return;
  game.answered = true;
  game.explain = explain || null;
  const pron = typeof explain === 'string' ? pronounce(explain) : null;

  let title, detail;
  if (ok) {
    game.correct++;
    game.streak++;
    const bonus = game.streak >= 3 ? STREAK_BONUS : 0;
    game.score += POINTS_OK + bonus;
    title = pick(PRAISE);
    detail = `+${POINTS_OK + bonus} puntos` + (bonus ? ` (racha de ${game.streak})` : '') + (answer ? ` · ${answer}` : '');
    sfx.ok();
  } else {
    game.lives--;
    game.streak = 0;
    title = game.lives > 0 ? 'Oops! Pierdes un corazón' : 'Oops! Te quedaste sin corazones';
    detail = 'Respuesta correcta: ' + answer;
    sfx.bad();
  }
  if (pron) detail += ` · Suena: «${pron}»`;

  const lastOne = game.lives <= 0 || game.idx === game.qs.length - 1;
  $('fb-title').textContent = title;
  $('fb-detail').textContent = detail;
  $('fb-ask').hidden = !game.explain;
  $('btn-next').textContent = lastOne ? 'Ver resultados' : 'Siguiente';
  const fb = $('feedback');
  fb.classList.toggle('bad', !ok);
  fb.hidden = false;
  fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  updateGameHud();
}

function nextQuestion() {
  if (!game || !game.answered) return;
  if (game.lives <= 0 || game.idx === game.qs.length - 1) return showResults();
  game.idx++;
  renderQuestion();
}

/* ---------- 9. Tipos de actividad ---------- */

/** Crea la rejilla de opciones y marca la correcta y la elegida. */
function renderOptions(area, q, onPick) {
  const emojiOnly = q.opts.every((o) => !/[a-z0-9]/i.test(o));
  const long = q.opts.some((o) => o.length > 16);
  const grid = el('div', 'options' + (emojiOnly ? ' big' : '') + (long ? ' long' : ''));
  shuffle(q.opts).forEach((opt) => {
    const b = el('button', 'option', opt);
    b.addEventListener('click', () => {
      grid.querySelectorAll('.option').forEach((o) => {
        o.disabled = true;
        if (o.textContent === q.a) o.classList.add('right');
      });
      if (opt !== q.a) b.classList.add('wrong');
      onPick(opt === q.a);
    });
    grid.append(b);
  });
  area.append(grid);
}

/* Selección múltiple (también traducción, completar oración y lectura) */
function renderMC(q, area) {
  renderPrompt(area, { ...q, label: q.label || 'Elige la respuesta' });
  // Globi podrá explicar la respuesta (o la oración completa) si la conoce
  const explain = q.say || (pronounce(q.a) ? q.a : null);
  renderOptions(area, q, (ok) => finish(ok, q.a, explain));
}

/* Pronunciación: leer cómo suena una palabra u oración y elegir a cuál corresponde */
function renderSound(q, area) {
  renderPrompt(area, { label: 'Pronunciación', q: '¿Qué suena así?', sub: 'Léelo en voz alta y elige la respuesta' });
  area.append(el('div', 'sound-text', `«${pronounce(q.say)}»`));
  renderOptions(area, q, (ok) => finish(ok, `${q.say} = ${q.a}`, q.say));
}

/* Relacionar imágenes con palabras */
function renderMatch(q, area) {
  renderPrompt(area, { label: 'Relaciona', q: 'Match the pairs', sub: 'Toca una imagen y luego su palabra' });
  const grid = el('div', 'match-grid');
  const colL = el('div', 'match-col');
  const colR = el('div', 'match-col');
  let sel = { L: null, R: null };
  let done = 0;
  let mistakes = 0;

  const evaluate = () => {
    if (!sel.L || !sel.R) return;
    const { L, R } = sel;
    sel = { L: null, R: null };
    L.node.classList.remove('sel');
    R.node.classList.remove('sel');

    if (L.pair === R.pair) {
      [L.node, R.node].forEach((n) => { n.classList.add('done'); n.disabled = true; });
      done++;
      if (done === q.pairs.length) {
        const summary = q.pairs.map((p) => p.join(' = ')).join(', ');
        finish(mistakes === 0, summary, q.pairs.map((p) => p[1]));
      } else {
        sfx.tick();
      }
    } else {
      mistakes++;
      sfx.bad();
      [L.node, R.node].forEach((n) => {
        n.classList.add('shake');
        setTimeout(() => n.classList.remove('shake'), 400);
      });
    }
  };

  const makeItem = (side, text, pair) => {
    const node = el('button', 'match-item ' + (side === 'L' ? 'pic' : 'word'), text);
    node.addEventListener('click', () => {
      if (sel[side]) sel[side].node.classList.remove('sel');
      sel[side] = { node, pair };
      node.classList.add('sel');
      evaluate();
    });
    return node;
  };

  const indexes = q.pairs.map((_, i) => i);
  shuffle(indexes).forEach((i) => colL.append(makeItem('L', q.pairs[i][0], i)));
  shuffle(indexes).forEach((i) => colR.append(makeItem('R', q.pairs[i][1], i)));
  grid.append(colL, colR);
  area.append(grid);
}

/* Completar la palabra con las letras que faltan */
function renderComplete(q, area) {
  renderPrompt(area, { label: 'Completa', q: 'Complete the word', sub: q.hint });
  const letters = q.word.split('');
  const need = q.missing.map((i) => letters[i]);
  const extras = shuffle('abcdefghiklmnoprstuwy'.split('').filter((c) => !need.includes(c))).slice(0, 3);
  const bankLetters = shuffle([...need, ...extras]);
  const filled = q.missing.map(() => null);     // índice de la ficha puesta en cada espacio

  const row = el('div', 'word-row');
  const bank = el('div', 'bank');
  const check = el('button', 'btn btn-alt', 'Comprobar');
  let tiles = [];

  const refresh = () => {
    slots.forEach((slot, k) => { slot.textContent = filled[k] === null ? '' : bankLetters[filled[k]]; });
    check.disabled = filled.includes(null);
  };

  // Espacios vacíos: al tocarlos devuelven la letra al banco
  const slots = [];
  letters.forEach((ch, i) => {
    const k = q.missing.indexOf(i);
    if (k < 0) return row.append(el('span', 'letter', ch));
    const slot = el('button', 'letter blank');
    slot.setAttribute('aria-label', 'Espacio vacío');
    slot.addEventListener('click', () => {
      if (game.answered || filled[k] === null) return;
      tiles[filled[k]].disabled = false;
      filled[k] = null;
      refresh();
    });
    slots[k] = slot;
    row.append(slot);
  });

  // Fichas de letras: llenan el primer espacio libre
  tiles = bankLetters.map((ch, ti) => {
    const tile = el('button', 'tile', ch);
    tile.addEventListener('click', () => {
      const k = filled.indexOf(null);
      if (k < 0) return;
      filled[k] = ti;
      tile.disabled = true;
      refresh();
    });
    bank.append(tile);
    return tile;
  });

  check.addEventListener('click', () => {
    let allOk = true;
    slots.forEach((slot, k) => {
      const good = bankLetters[filled[k]] === need[k];
      if (!good) allOk = false;
      slot.textContent = need[k];                       // se muestra la palabra correcta
      slot.classList.remove('blank');
      slot.classList.add(good ? 'right' : 'wrong');
    });
    tiles.forEach((t) => { t.disabled = true; });
    check.hidden = true;
    finish(allOk, `${q.word} = ${q.hint}`, q.word);
  });

  refresh();
  area.append(row, bank, check);
}

/* Ordenar las palabras para construir la oración */
function renderOrder(q, area) {
  renderPrompt(area, { label: 'Construye la oración', q: q.es, sub: 'Toca las palabras en el orden correcto' });
  const target = q.words.join(' ');
  let orderIdx = shuffle(q.words.map((_, i) => i));
  // Las palabras nunca aparecen ya ordenadas
  while (orderIdx.map((i) => q.words[i]).join(' ') === target) orderIdx = shuffle(orderIdx);

  const placed = [];                                     // índices de las palabras ya puestas
  const sentence = el('div', 'sentence');
  const bank = el('div', 'bank');
  const check = el('button', 'btn btn-alt', 'Comprobar');
  const bankTiles = {};

  const refresh = () => {
    sentence.innerHTML = '';
    placed.forEach((wi, pos) => {
      const chip = el('button', 'tile', q.words[wi]);
      chip.addEventListener('click', () => {
        if (game.answered) return;
        placed.splice(pos, 1);
        bankTiles[wi].disabled = false;
        refresh();
      });
      sentence.append(chip);
    });
    check.disabled = placed.length < q.words.length;
  };

  orderIdx.forEach((wi) => {
    const tile = el('button', 'tile', q.words[wi]);
    tile.addEventListener('click', () => {
      placed.push(wi);
      tile.disabled = true;
      refresh();
    });
    bankTiles[wi] = tile;
    bank.append(tile);
  });

  check.addEventListener('click', () => {
    const ok = placed.map((i) => q.words[i]).join(' ') === target;
    sentence.classList.add(ok ? 'right' : 'wrong');
    check.hidden = true;
    finish(ok, target, target);
  });

  refresh();
  area.append(sentence, bank, check);
}

const RENDERERS = { mc: renderMC, sound: renderSound, match: renderMatch, complete: renderComplete, order: renderOrder };

/* ---------- 10. Resultados ---------- */
function showResults() {
  const failed = game.lives <= 0;
  const stars = failed ? 0 : game.lives;        // 3 corazones = 3 estrellas
  const rec = progress().worlds[game.world];
  const firstWin = rec.stars === 0 && stars > 0;
  const hasNext = game.world < WORLDS.length - 1;

  // Guardar el progreso
  rec.plays++;
  rec.stars = Math.max(rec.stars, stars);
  rec.best = Math.max(rec.best, game.score);
  progress().points += game.score;
  persist();
  updateHud();

  $('res-title').textContent = failed ? 'Level failed' : 'Level complete!';
  const starBox = $('res-stars');
  starBox.innerHTML = '';
  for (let s = 1; s <= 3; s++) starBox.append(el('span', s <= stars ? 'on' : '', '⭐'));
  starBox.setAttribute('aria-label', `${stars} de 3 estrellas`);

  let msg;
  if (failed) msg = 'Se acabaron los corazones. Inténtalo otra vez: cada intento te enseña algo nuevo.';
  else if (firstWin && hasNext) msg = `¡Abriste un mundo nuevo: ${WORLDS[game.world + 1].name}!`;
  else if (totalStars() === MAX_STARS) msg = '¡Tienes todas las estrellas! Eres un English Master.';
  else if (stars === 3) msg = 'Perfect! Ganaste la medalla de este mundo.';
  else msg = 'Good work! Repite el nivel sin errores para ganar las 3 estrellas.';
  $('res-bubble').textContent = msg;

  $('res-correct').textContent = `${game.correct}/${game.qs.length}`;
  $('res-points').textContent = '+' + game.score;
  $('res-best').textContent = rec.best;
  $('btn-next-world').hidden = !(hasNext && isUnlocked(game.world + 1));

  showScreen('results');
  if (!failed) { sfx.win(); launchConfetti(); }
}

function launchConfetti() {
  const box = $('confetti');
  const colors = ['#ffd23f', '#ff5d73', '#2fcf8a', '#2ec4f1', '#c9b6ff'];
  for (let i = 0; i < 50; i++) {
    const p = el('div', 'confetti-piece');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = pick(colors);
    p.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    p.style.animationDelay = Math.random() * 0.5 + 's';
    box.append(p);
    setTimeout(() => p.remove(), 4000);
  }
}

/* ---------- 10b. Diccionario de pronunciación ----------
   Cada línea: palabra en inglés | significado en español | cómo suena.
   El sonido está escrito como lo leería alguien que habla español:
   la sílaba en MAYÚSCULAS se dice más fuerte y una vocal doble (ii) se alarga. */
const DICT_SOURCE = {
  colors: `red|rojo|red
blue|azul|blu
green|verde|griin
yellow|amarillo|YÉ-lou
purple|morado/púrpura|PÉR-pol
black|negro|blak
brown|café/marrón|bráun
pink|rosado/rosa|pink
orange|naranja/anaranjado|Ó-rench
gray|gris|gréi
silver|plateado|SÍL-ver
white|blanco|uáit`,
  numbers: `one|uno|uán
two|dos|tu
three|tres|zrii
four|cuatro|for
five|cinco|fáiv
six|seis|siks
seven|siete|SÉ-ven
eight|ocho|éit
nine|nueve|náin
ten|diez|ten
twelve|doce|tuelv
thirteen|trece|zer-TÍIN
fifteen|quince|fif-TÍIN
twenty|veinte|TUÉN-ti
forty|cuarenta|FÓR-ti
hundred|cien/ciento|JÁN-dred`,
  animals: `dog|perro|dog
cat|gato|kat
bird|pájaro/ave|berd
fish|pez/pescado|fish
elephant|elefante|É-le-fant
cow|vaca|káu
horse|caballo|jors
pig|cerdo/marrano|pig
rabbit|conejo|RÁ-bit
bear|oso|ber
bee|abeja|bii
frog|rana|frog
lion|león|LÁI-on
tiger|tigre|TÁI-guer
monkey|mono/mico|MÁN-ki
duck|pato|dak
whale|ballena|uéil
shark|tiburón|shark
octopus|pulpo|ÓK-to-pus
penguin|pingüino|PÉN-güin
butterfly|mariposa|BÁ-ter-flai
dragonfly|libélula|DRÁ-gon-flai
ladybug|mariquita|LÉI-di-bag
giraffe|jirafa|yi-RÁF
owl|búho|ául
mouse|ratón|máus
mice|ratones|máis
turtle|tortuga|TÉR-tol
bat|murciélago|bat
mammal|mamífero|MÁ-mal
ocean|océano|ÓU-shan
animal|animal|Á-ni-mal`,
  food: `apple|manzana|Á-pol
banana|banano/plátano|ba-NÁ-na
grape|uva|gréip
milk|leche|milk
water|agua|UÓ-ter
juice|jugo/zumo|yus
bread|pan|bred
cheese|queso|chiis
egg|huevo|eg
pizza|pizza|PÍT-sa
strawberry|fresa|STRÓ-be-ri
pear|pera|per
lemon|limón|LÉ-mon
carrot|zanahoria|KÁ-rot
peach|durazno/melocotón|piich
cherry|cereza|CHÉ-ri
breakfast|desayuno|BRÉK-fast
lunch|almuerzo|lanch
dinner|cena|DÍ-ner
snack|merienda/refrigerio|snak
pineapple|piña|PÁIN-a-pol
menu|menú|MÉ-niu
vegetable|verdura/vegetal|VÉCH-ta-bol
fruit|fruta|frut
food|comida|fud`,
  family: `mother|mamá/madre|MÁ-der
father|papá/padre|FÁ-der
sister|hermana|SÍS-ter
brother|hermano|BRÁ-der
grandfather|abuelo|GRÁND-fa-der
grandmother|abuela|GRÁND-ma-der
uncle|tío|ÁN-kol
aunt|tía|ant
baby|bebé|BÉI-bi
family|familia|FÁ-mi-li
cousin|primo/prima|KÁ-sin
nephew|sobrino|NÉ-fiu
niece|sobrina|niis
parents|padres|PÉ-rents
daughter|hija|DÓ-ter
son|hijo|san
husband|esposo/marido|JÁS-band
wife|esposa|uáif
children|niños/hijos|CHÍL-dren`,
  school: `book|libro|buk
pencil|lápiz|PÉN-sol
chair|silla|cher
door|puerta|dor
ruler|regla|RÚ-ler
table|mesa|TÉI-bol
backpack|mochila/morral|BÁK-pak
scissors|tijeras|SÍ-sors
teacher|profesor/profesora/maestro/maestra|TÍ-cher
desk|escritorio/pupitre|desk
window|ventana|UÍN-dou
board|tablero/pizarra|bord
school|escuela/colegio|skul
crayon|crayón/crayola|KRÉI-on
eraser|borrador|i-RÉI-ser
glue|pegante/pegamento|glu
notebook|cuaderno|NÓUT-buk
homework|tarea|JÓUM-uerk
library|biblioteca|LÁI-bre-ri
math|matemáticas|maz
history|historia|JÍS-to-ri
art|arte|art
music|música|MIÚ-sik
student|estudiante|STÚ-dent
page|página|péich
bookshelf|estante/librero|BÚK-shelf
subject|materia/asignatura|SÁB-yekt
classroom|salón/aula|KLÁS-rum
class|clase|klas`,
  extra: `the|el/la|de
a|un/una|e
is|es/está|is
are|son/están|ar
my|mi|mái
i|yo|ái
he|él|ji
she|ella|shi
we|nosotros|uí
us|nosotros|as
with|con|uiz
in|en|in
on|en/sobre|on
of|de|ov
to|a/hacia|tu
at|en|at
from|de/desde|from
and|y|and
there|allí/hay|der
than|que|dan
any|ningún/algún|É-ni
isn't|no es/no está|Í-sent
can|poder|kan
could|podría|kud
would|(forma condicional)|úud
like|gustar|láik
love|amar|lav
have|tener|jav
see|ver|sii
go|ir|góu
may|poder (pedir permiso)|méi
open|abrir|ÓU-pen
your|tu/su|yor
study|estudiar|STÁ-di
lives|vive|livs
fast|rápido|fast
faster|más rápido|FÁS-ter
car|carro/auto|kar
glass|vaso|glas
bathroom|baño|BÁZ-rum
please|por favor|pliis
night|noche|náit
dark|oscuro/oscuridad|dark
english|inglés|ÍN-glish
monday|lunes|MÁN-dei
colombia|Colombia|ko-LÁM-bia
fridge|nevera/refrigerador|frich
hello|hola|je-LÓU
goodbye|adiós|gud-BÁI
thanks|gracias|zanks
yes|sí|ies
no|no|nóu`,
};

const CATEGORY_NAMES = {
  colors: 'colores', numbers: 'números', animals: 'animales',
  food: 'frutas y alimentos', family: 'la familia', school: 'la escuela',
};

/** Quita mayúsculas, tildes y signos para poder comparar textos. */
function norm(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const DICT = {};       // inglés → ficha
const ES_INDEX = {};   // español → ficha
Object.entries(DICT_SOURCE).forEach(([cat, block]) => {
  block.split('\n').forEach((line) => {
    const [en, es, pron] = line.split('|');
    const entry = { en, es, pron, cat };
    DICT[en] = entry;
    es.split('/').forEach((alt) => {
      const key = norm(alt);
      // Las palabras de apoyo muy cortas (de, en, y…) no se indexan para evitar confusiones
      if (/ /.test(key) || (cat === 'extra' && key.length < 4)) return;
      if (!ES_INDEX[key]) ES_INDEX[key] = entry;
    });
  });
});

/** Busca una palabra en inglés; entiende plurales (books) y posesivos (mother's). */
function lookupEn(token) {
  if (DICT[token]) return DICT[token];
  if (token.endsWith("'s") && DICT[token.slice(0, -2)]) {
    const base = DICT[token.slice(0, -2)];
    return { ...base, en: token, pron: base.pron + 's', es: 'de ' + base.es };
  }
  if (token.length > 3 && token.endsWith('s') && DICT[token.slice(0, -1)]) {
    const base = DICT[token.slice(0, -1)];
    return { ...base, en: token, pron: base.pron + 's', es: base.es + ' (en plural)' };
  }
  return null;
}

const lookupEs = (token) => ES_INDEX[token] || (token.endsWith('s') && ES_INDEX[token.slice(0, -1)]) || null;

/** Devuelve cómo suena una palabra u oración, o null si falta alguna palabra. */
function pronounce(text) {
  const tokens = norm(text).split(' ').filter(Boolean);
  if (!tokens.length) return null;
  const parts = tokens.map(lookupEn);
  return parts.every(Boolean) ? parts.map((p) => p.pron).join(' ') : null;
}

/** Pistas de pronunciación según las letras de la palabra. */
function soundTips(word) {
  const tips = [];
  if (/th/.test(word)) {
    tips.push(/ther|^the$|^than$|^this$|^that$/.test(word)
      ? 'La «th» aquí suena como una «d» suave: pon la punta de la lengua entre los dientes.'
      : 'La «th» suena como la «z» de España: saca un poquito la lengua entre los dientes y sopla.');
  }
  if (/sh/.test(word)) tips.push('«sh» suena como cuando pides silencio: shhh.');
  if (/^h/.test(word)) tips.push('La «h» del comienzo sí suena, como una «j» muy suave.');
  if (/^s[ptkmnlw]|^sc[^ei]/.test(word)) tips.push('No digas «es» al comienzo: arranca directo con la «sss».');
  if (/ee/.test(word)) tips.push('«ee» suena como una «i» larga.');
  if (/oo/.test(word) && word !== 'door') tips.push('«oo» suena como «u».');
  if (/^w/.test(word)) tips.push('La «w» suena como una «u» rápida.');
  if (/^j/.test(word)) tips.push('La «j» inglesa suena como una «y» fuerte, no como la jota.');
  if (/^r/.test(word)) tips.push('La «r» inglesa es suave: la lengua no vibra ni toca el paladar.');
  if (word.length > 3 && /[^aeiou]e$/.test(word)) tips.push('La «e» final no suena.');
  return tips.slice(0, 2);
}

/* ---------- 10c. Globi, el chat de pronunciación (sin conexión) ----------
   No usa internet ni inteligencia artificial externa: responde con el
   diccionario de arriba y con reglas sencillas de pronunciación. */
const CHAT_HELLO = 'Hi! Soy Globi. Escríbeme una palabra en inglés o en español y te explico cómo suena y qué significa.\n' +
  'Las sílabas en MAYÚSCULAS se dicen más fuerte.';
const CHAT_WAIT = 'Estás en medio de una pregunta. Respóndela primero y después te explico cómo se pronuncia.';
const CHAT_HELP = 'Puedo ayudarte con esto:\n' +
  '• Pronunciación: «¿Cómo se pronuncia three?»\n' +
  '• Traducción: «¿Cómo se dice abuela en inglés?»\n' +
  '• Sonidos difíciles: «sonido th», «letra h», «vocales»\n' +
  '• Listas: «palabras de animales», «palabras de la familia»\n' +
  'Conozco las palabras de los cinco mundos del juego.';
const CHAT_CHIPS = ['¿Cómo se pronuncia three?', '¿Cómo se dice abuela?', 'Sonido th', 'Palabras de animales', 'Ayuda'];

const SOUND_RULES = [
  [/\bth\b/, 'El sonido «th» no existe en el español de América. Tiene dos formas:\n' +
    '• Suave, como en three («zrii») o math («maz»): lengua entre los dientes y soplas, como la «z» de España.\n' +
    '• Con voz, como en mother («MÁ-der») o the («de»): igual, pero suena como una «d» suave.'],
  [/\bsh\b/, '«sh» suena como cuando pides silencio: shhh. Ejemplos: fish («fish»), shark («shark»), she («shi»).'],
  [/\bch\b/, '«ch» casi siempre suena igual que en español: chair («cher»), cheese («chiis»), lunch («lanch»). En school suena como «k»: «skul».'],
  [/\b(letra|sonido) h\b|\bhache\b/, 'En inglés la «h» sí suena, como una «j» muy suave: horse («jors»), husband («JÁS-band»), homework («JÓUM-uerk»).'],
  [/\b(letra|sonido) r\b|\berre\b/, 'La «r» inglesa es suave: la lengua se curva hacia atrás, sin vibrar ni tocar el paladar. Prueba con red, rabbit y ruler.'],
  [/\b(letra|sonido) w\b|doble u/, 'La «w» suena como una «u» rápida: water («UÓ-ter»), window («UÍN-dou»), white («uáit»).'],
  [/\b(letra|sonido) j\b|\bjota\b/, 'La «j» inglesa suena como una «y» fuerte: juice («yus»). No se parece a la jota del español.'],
  [/\b(ee|oo)\b|vocal|vowel/, 'Algunas vocales cambian cuando van juntas:\n' +
    '• «ee» = «i» larga: green («griin»), cheese («chiis»), bee («bii»).\n' +
    '• «oo» = «u»: book («buk»), school («skul»), food («fud»).\n' +
    '• La «a» a veces suena «ei»: baby («BÉI-bi»), table («TÉI-bol»).\n' +
    '• La «i» a veces suena «ai»: five («fáiv»), tiger («TÁI-guer»).'],
  [/muda|silencios/, 'Muchas palabras terminan en una «e» que no suena: five («fáiv»), nine («náin»), whale («uéil»), juice («yus»).\n' +
    'En daughter («DÓ-ter») y eight («éit») tampoco suena «gh».'],
  [/mayuscula|acento|como se lee|como leo/, 'Escribo el sonido como lo leerías en español. La sílaba en MAYÚSCULAS se dice más fuerte y una vocal doble, como «ii», se alarga. Ejemplo: elephant → «É-le-fant».'],
];

const STOP_WORDS = new Set(('como se pronuncia pronunciar pronuncio pronunciacion dice dicen decir digo que significa significado ' +
  'la el los las lo al palabra palabras en ingles espanol es de del y por favor globi traduce traducir traduccion quiere quieren ' +
  'una un cual suena sonido leer lee me puedes explicar explica explicame a').split(' '));

const CATEGORY_WORDS = [
  [/color/, 'colors'], [/numer|number/, 'numbers'], [/animal/, 'animals'],
  [/fruta|comida|alimento|food|fruit/, 'food'], [/famil/, 'family'], [/escuela|colegio|salon|school/, 'school'],
];

function wordCard(entry, fromSpanish) {
  const lines = [];
  if (fromSpanish) lines.push(`«${fromSpanish}» en inglés es ${entry.en}.`);
  else lines.push(`${entry.en} significa «${entry.es}».`);
  lines.push(`Suena así: «${entry.pron}»`);
  soundTips(norm(entry.en)).forEach((tip) => lines.push('Pista: ' + tip));
  return lines.join('\n');
}

function sentenceCard(text, pron) {
  const lines = [text, `Suena así: «${pron}»`, 'Léela despacio y luego más rápido. Las MAYÚSCULAS van más fuerte.'];
  if (/th/i.test(text)) lines.push('Pista: en la «th» la lengua va entre los dientes.');
  return lines.join('\n');
}

/** Explica la respuesta de la pregunta que se acaba de contestar. */
function explainAnswer(explain) {
  if (Array.isArray(explain)) {
    return 'Así suenan estas palabras:\n' + explain.map((w) => {
      const e = lookupEn(norm(w));
      return e ? `• ${w} → «${e.pron}» (${e.es})` : `• ${w}`;
    }).join('\n');
  }
  const tokens = norm(explain).split(' ');
  const single = tokens.length === 1 && lookupEn(tokens[0]);
  if (single) return wordCard(single);
  const pron = pronounce(explain);
  return pron ? sentenceCard(explain, pron) : `Todavía no sé explicar «${explain}». Pregúntame por una de sus palabras.`;
}

/** Decide qué contesta Globi a un mensaje escrito por el estudiante. */
function botReply(raw) {
  const n = norm(raw);
  const tokens = n.split(' ').filter(Boolean);
  if (!tokens.length) return 'Escribe una palabra, por ejemplo: apple.';

  if (tokens.length <= 3 && /^(hola|hi|hey|buenas|buenos)\b/.test(n)) {
    return 'Hello! («je-LÓU»). ¿Qué palabra quieres practicar?';
  }
  if (/\b(gracias|thank you|thanks)\b/.test(n) && tokens.length <= 3) {
    return "You're welcome! («iur UÉL-kam»). Significa «de nada».";
  }
  if (/\b(ayuda|help|que puedes|que haces|quien eres)\b/.test(n)) return CHAT_HELP;

  const rule = SOUND_RULES.find(([re]) => re.test(n));
  if (rule) return rule[1];

  if (/palabras|lista|vocabulario|words/.test(n)) {
    const cat = CATEGORY_WORDS.find(([re]) => re.test(n));
    if (cat) {
      const items = Object.values(DICT).filter((e) => e.cat === cat[1]);
      return `Palabras de ${CATEGORY_NAMES[cat[1]]}:\n` + items.map((e) => `• ${e.en} → «${e.pron}» (${e.es})`).join('\n');
    }
  }

  // Una oración completa en inglés
  if (tokens.length >= 3) {
    const pron = pronounce(n);
    if (pron) return sentenceCard(raw.trim(), pron);
  }

  // Palabras sueltas: se quitan las palabras de la pregunta («cómo», «se», «dice»…)
  const candidates = tokens.length === 1 ? tokens : tokens.filter((t) => !STOP_WORDS.has(t));
  const spanishFirst = /se dice|en ingles|traduc/.test(n);
  const found = [];
  const unknown = [];
  candidates.forEach((t) => {
    const en = lookupEn(t);
    const es = lookupEs(t);
    const useEs = es && (spanishFirst || !en);
    const entry = useEs ? es : en;
    if (!entry) return unknown.push(t);
    if (!found.some((f) => f.entry.en === entry.en)) found.push({ entry, es: useEs ? t : null });
  });

  // Si hay palabras de vocabulario, se ignoran las de apoyo (the, is, my…)
  const main = found.filter((f) => f.entry.cat !== 'extra');
  const cards = (main.length ? main : found).slice(0, 3);
  if (cards.length) return cards.map((f) => wordCard(f.entry, f.es)).join('\n\n');

  if (unknown.length) {
    const word = unknown[0];
    const tips = soundTips(word);
    return `Todavía no tengo «${word}» en mi diccionario.` +
      (tips.length ? '\nSi es una palabra en inglés, esto te ayuda:\n' + tips.map((t) => '• ' + t).join('\n') : '') +
      '\nPrueba con una palabra del juego o escribe «ayuda».';
  }
  return CHAT_HELP;
}

/* Ventana del chat */
function addMessage(who, text) {
  const log = $('chat-log');
  log.append(el('div', 'msg ' + who, text));
  log.scrollTop = log.scrollHeight;
}

/** true si hay una pregunta sin responder (Globi no da pistas en ese momento). */
function midQuestion() {
  return $('screen-game').classList.contains('active') && game && !game.answered;
}

function openChat(intro) {
  $('chat').hidden = false;
  if (!$('chat-log').children.length) addMessage('bot', CHAT_HELLO);
  if (intro) addMessage('bot', intro);
  else if (midQuestion()) addMessage('bot', CHAT_WAIT);
  $('chat-input').focus();
}

function closeChat() { $('chat').hidden = true; }

function sendToGlobi(text) {
  if (!text.trim()) return;
  addMessage('user', text.trim());
  addMessage('bot', midQuestion() ? CHAT_WAIT : botReply(text));
}

CHAT_CHIPS.forEach((label) => {
  const chip = el('button', 'chip', label);
  chip.addEventListener('click', () => sendToGlobi(label));
  $('chat-chips').append(chip);
});

$('btn-chat').addEventListener('click', () => ($('chat').hidden ? openChat() : closeChat()));
$('chat-close').addEventListener('click', closeChat);
$('chat-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const input = $('chat-input');
  sendToGlobi(input.value);
  input.value = '';
});
$('fb-ask').addEventListener('click', () => openChat(explainAnswer(game.explain)));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeChat(); });

/* ---------- 11. Eventos e inicio ---------- */
$('btn-start').addEventListener('click', () => (save.mode ? showMap() : showModeScreen()));

document.querySelectorAll('.mode-card').forEach((card) => {
  card.addEventListener('click', () => setMode(card.dataset.mode));
});

$('btn-home').addEventListener('click', () => { if (confirmLeave()) showScreen('welcome'); });
$('btn-exit').addEventListener('click', () => { if (confirmLeave()) showMap(); });
$('btn-change-mode').addEventListener('click', showModeScreen);

$('btn-sound').addEventListener('click', () => {
  save.sound = !save.sound;
  persist();
  updateHud();
  sfx.tick();
});

$('btn-reset').addEventListener('click', () => {
  if (!window.confirm('¿Borrar todo el progreso de las dos modalidades? No se puede deshacer.')) return;
  const { mode, sound } = save;
  save = defaultSave();
  save.mode = mode;
  save.sound = sound;
  persist();
  showMap('Progreso borrado. ¡Empecemos de nuevo!');
});

$('btn-next').addEventListener('click', nextQuestion);

$('btn-retry').addEventListener('click', () => startWorld(game.world));
$('btn-next-world').addEventListener('click', () => startWorld(game.world + 1));
$('btn-to-map').addEventListener('click', () => showMap());

// Al abrir el juego se recuerda la modalidad usada la última vez
if (save.mode) {
  document.body.dataset.mode = save.mode;
  $('btn-start').textContent = 'Continuar';
}
