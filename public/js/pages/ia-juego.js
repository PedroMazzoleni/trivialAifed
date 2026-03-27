// pages/ia-juego.js
// Requiere: utils.js

// ia-juego.js

// ── QUESTIONS BANK ────────────────────────────────────────────────────────────
const QUESTIONS = {
  facil: [
    // SPORTS - EASY
    { q:'In which country were the first Ancient Olympic Games held?', a:'Greece', opts:['Italy','Greece','Turkey'], cat:'Sports' },
    { q:'Which Serbian legendary athlete has won the most Grand Slam titles in tennis history?', a:'Novak Djokovic', opts:['Novak Djokovic','Roger Federer','Rafael Nadal'], cat:'Sports' },
    { q:'Andriy Shevchenko is a legendary striker and former manager of which national team?', a:'Ukraine', opts:['Romania','Poland','Ukraine'], cat:'Sports' },
    { q:'Which Serbian basketball player is one of the greatest players currently in NBA?', a:'Nikola Jokić', opts:['Nikola Jokić','Luka Dončić','Stephen Curry'], cat:'Sports' },
    { q:'In which city is the famous "Circuit de Monaco," home to one of the most prestigious Formula 1 races?', a:'Monte Carlo', opts:['Monte Carlo','La Condamine','Fontvieille'], cat:'Sports' },
    { q:'Giannis Antetokounmpo, an NBA superstar, plays for which national team?', a:'Greece', opts:['Turkey','Poland','Greece'], cat:'Sports' },
    { q:'Which Portuguese superstar is the all-time leading scorer in international football and has won 5 Ballons d\'Or?', a:'Cristiano Ronaldo', opts:['Luís Figo','Cristiano Ronaldo','Thierry Henry'], cat:'Sports' },
    { q:'Roger Federer, one of the greatest tennis players of all time, represents which country?', a:'Switzerland', opts:['Austria','Germany','Switzerland'], cat:'Sports' },
    { q:'Which two European countries share the record for the most Football World Cup titles, having won 4 trophies each?', a:'Italy and Germany', opts:['France and Spain','Italy and Germany','England and Portugal'], cat:'Sports' },
    { q:'Luka Modrić, a Ballon d\'Or winner, was born in a country bordering Bosnia and Serbia. Which one?', a:'Croatia', opts:['Croatia','Montenegro','Albania'], cat:'Sports' },
    // GEOGRAPHY - EASY
    { q:'Kyiv is the capital city of which Eastern European country?', a:'Ukraine', opts:['Ukraine','Poland','Romania'], cat:'Geography' },
    { q:'Which country connects Europe and Asia?', a:'Turkey', opts:['Greece','Turkey','Bulgaria'], cat:'Geography' },
    { q:'Which large sea borders Ukraine to the south and Turkey to the north?', a:'The Black Sea', opts:['The Black Sea','The Mediterranean Sea','The Adriatic Sea'], cat:'Geography' },
    { q:'What is the capital of Bosnia and Herzegovina?', a:'Sarajevo', opts:['Sarajevo','Belgrade','Bucharest'], cat:'Geography' },
    { q:'The city of Istanbul is the capital of Turkey?', a:'False', opts:['True','False'], cat:'Geography' },
    { q:'Which country is famous for its thousands of islands and is considered the "cradle of Western civilization"?', a:'Greece', opts:['Greece','Turkey','Montenegro'], cat:'Geography' },
    { q:'What is the capital city of Serbia, located where the Sava and Danube rivers meet?', a:'Belgrade', opts:['Athens','Belgrade','Ankara'], cat:'Geography' },
    { q:'Which country is known for its beautiful "fjords" and shares a long border with Sweden?', a:'Norway', opts:['Finland','Norway','Denmark'], cat:'Geography' },
    // CULTURE - EASY
    { q:'Ciao means "Hello" or "bye" in which language?', a:'Italian', opts:['French','Italian','Hungarian'], cat:'Culture' },
    { q:'"Fado" is a traditional style of music from which country?', a:'Portugal', opts:['Italy','Albania','Portugal'], cat:'Culture' },
    { q:'Wiener Schnitzel is a famous traditional dish of which country?', a:'Austria', opts:['Austria','Hungary','Italy'], cat:'Culture' },
    { q:'Samba and Bossa Nova are traditional music genres of which country?', a:'Brazil', opts:['Brazil','Mexico','Suriname'], cat:'Culture' },
    // HISTORY - EASY
    { q:'The euro is the least used currency in the European Union.', a:'False', opts:['True','False'], cat:'History' },
    { q:'Which UK prime minister resigned because of Brexit?', a:'David Cameron', opts:['David Cameron','Rishi Sunak','Keir Starmer'], cat:'History' },
    { q:'Which country gifted the Statue of Liberty to the United States?', a:'France', opts:['Italy','Germany','France'], cat:'History' },
    { q:'Which country withdrew its membership from the European Union in 2020?', a:'United Kingdom', opts:['United Kingdom','France','Italy'], cat:'History' },
    { q:'Which British ship sank in 1912 on its route between Southampton and New York City?', a:'The Titanic', opts:['Hms Belfast','The Titanic','Hms Hood'], cat:'History' },
    { q:'In which country did the Industrial Revolution begin?', a:'England', opts:['Portugal','France','England'], cat:'History' },
    { q:'Which European country was the birthplace of democracy?', a:'Greece', opts:['France','Italy','Greece'], cat:'History' },
    // EU - EASY
    { q:'How many stars are on the flag of the European Union?', a:'12', opts:['12','27','16'], cat:'EU' },
    { q:'How many countries are currently members of the European Union?', a:'27', opts:['27','28','29'], cat:'EU' },
    { q:'Which European Union programme allows students to study in another country?', a:'Erasmus+', opts:['Erasmus+','Bologna Plan','The European Solidarity Corps'], cat:'EU' },
  ],
  medio: [
    // SPORTS - MEDIUM
    { q:'Galatasaray, Fenerbahçe, and Beşiktaş are the "Big Three" football clubs of which city?', a:'Istanbul', opts:['Belgrade','Istanbul','Warsaw'], cat:'Sports' },
    { q:'Which German Formula 1 driver won 7 World Championships and is a global icon for Ferrari?', a:'Michael Schumacher', opts:['Lewis Hamilton','Michael Schumacher','Nico Rosberg'], cat:'Sports' },
    { q:'In 2004, which country surprised the world by winning the UEFA European Football Championship?', a:'Greece', opts:['Albania','Greece','Czech Republic'], cat:'Sports' },
    { q:'Which iconic stadium in London, famous for its giant "arch," is considered the home of English football?', a:'Wembley Stadium', opts:['Old Trafford','Camp Nou','Wembley Stadium'], cat:'Sports' },
    { q:'Brazil is the most successful national team in World Cup history. How many titles have they won?', a:'5', opts:['4','5','6'], cat:'Sports' },
    { q:'Ukraine co-hosted the UEFA Euro 2012. Which neighboring country did they host it with?', a:'Poland', opts:['Poland','Romania','Slovakia'], cat:'Sports' },
    { q:'Which Italian motorcycling legend, nicknamed "The Doctor," won 9 World Championships during his career?', a:'Valentino Rossi', opts:['Max Biaggi','Giacomo Agostini','Valentino Rossi'], cat:'Sports' },
    { q:'Edin Džeko is a legendary football striker and a symbol of national unity for which country?', a:'Bosnia and Herzegovina', opts:['Serbia','Bosnia and Herzegovina','Montenegro'], cat:'Sports' },
    { q:'"Panathinaikos" and "Olympiacos" are the two biggest rival clubs in which country?', a:'Greece', opts:['Turkey','Albania','Greece'], cat:'Sports' },
    { q:'Which famous Greek tennis player reached the final of the French Open and is a top-ranked athlete in the ATP?', a:'Stefanos Tsitsipas', opts:['Stefanos Tsitsipas','Hubert Hurkacz','Casper Ruud'], cat:'Sports' },
    // GEOGRAPHY - MEDIUM
    { q:'The "Rock of Gibraltar" is a famous landmark near the border of which African country?', a:'Morocco', opts:['Morocco','Algeria','Tunisia'], cat:'Geography' },
    { q:'Which of these countries does NOT have a coastline on the Adriatic Sea?', a:'Serbia', opts:['Croatia','Albania','Serbia'], cat:'Geography' },
    { q:'Which country is known as the "Land of Eagles"?', a:'Albania', opts:['Albania','Montenegro','Greece'], cat:'Geography' },
    { q:'Which of these countries is the youngest independent state, having gained independence in 2006?', a:'Montenegro', opts:['Serbia','Montenegro','Romania'], cat:'Geography' },
    { q:'Which sea, shared by Greece and Turkey, is famous for its blue waters and thousands of islands?', a:'The Aegean Sea', opts:['The Red Sea','The Ionian Sea','The Aegean Sea'], cat:'Geography' },
    { q:'The "Evros" river forms a natural border between which two countries?', a:'Greece and Turkey', opts:['Serbia and Montenegro','Greece and Turkey','Ukraine and Moldova'], cat:'Geography' },
    { q:'Which country is landlocked between Romania and Ukraine?', a:'Moldova', opts:['Moldova','Georgia','Albania'], cat:'Geography' },
    { q:'The "Balkan Mountains" (Stara Planina) are mainly located in which country that borders Greece and Serbia?', a:'Bulgaria', opts:['Turkey','Bulgaria','North Macedonia'], cat:'Geography' },
    // CULTURE - MEDIUM
    { q:'From which language does the word "Europe" derive?', a:'Greek', opts:['Italian','Spanish','Greek'], cat:'Culture' },
    { q:'From which country does the traditional "jota" dance originate?', a:'Spain', opts:['Poland','Spain','Belgium'], cat:'Culture' },
    { q:'The Current First Lady of the United States, Melania Trump, is a native of which European country?', a:'Slovenia', opts:['Lithuania','Slovakia','Slovenia'], cat:'Culture' },
    { q:'Which country does the food Banitza come from?', a:'Bulgaria', opts:['Bulgaria','Austria','Lithuania'], cat:'Culture' },
    { q:'Which of these countries is known as the easiest European country for foreigners to get married?', a:'Denmark', opts:['Finland','Denmark','Sweden'], cat:'Culture' },
    // HISTORY - MEDIUM
    { q:'Which of these countries houses the European Central Bank?', a:'Germany', opts:['France','Germany','Switzerland'], cat:'History' },
    { q:'Which of these countries in the Americas was the latest to abolish slavery?', a:'Brazil', opts:['Mexico','Brazil','Argentina'], cat:'History' },
    { q:'Which treaty, signed in 1648, ended the Thirty Years\' War and is considered a foundational moment in modern international diplomacy?', a:'The treaty of Westphalia', opts:['The treaty of Westphalia','Rome treaty','Maastricht treaty'], cat:'History' },
    { q:'Which 15th-century invention by Johannes Gutenberg in Europe revolutionized the spread of knowledge?', a:'The Printing Press', opts:['Caravel ship','The Printing Press','Helicopter design'], cat:'History' },
    { q:'In which European city did the 1815 Congress take place that reshaped the continent after the Napoleonic Wars?', a:'Vienna, Austria', opts:['London, UK','Paris, France','Vienna, Austria'], cat:'History' },
    { q:'Which European wall fell in 1989, symbolizing the end of the Cold War?', a:'The Berlin Wall (Germany)', opts:['Hadrian\'s Wall (England)','Lennon Wall (Czech Republic)','The Berlin Wall (Germany)'], cat:'History' },
    { q:'Which French leader crowned himself Emperor in 1804?', a:'Napoleon Bonaparte', opts:['Victor Hugo','Napoleon Bonaparte','Jean Paul Sartre'], cat:'History' },
    // EU - MEDIUM
    { q:'Which agreement allows travel without border controls in many countries of the European Union?', a:'The Schengen Agreement', opts:['The Lisbon Treaty','The Schengen Agreement','The Rome agreement'], cat:'EU' },
    { q:'How many official languages does the EU have?', a:'24 official languages', opts:['24 official languages','16 official languages','35 official languages'], cat:'EU' },
    { q:'Which eastern neighbouring country of the EU formally applied for EU membership in 2022?', a:'Ukraine', opts:['Bosnia','Slovenia','Ukraine'], cat:'EU' },
    { q:'Which level of education is the Bologna Process mainly related to?', a:'Higher education (university level)', opts:['Higher education (university level)','Primary education','Secondary education'], cat:'EU' },
  ],
  dificil: [
    // SPORTS - HARD
    { q:'Water Polo is the national sport and a symbol of pride for which small coastal country?', a:'Montenegro', opts:['Montenegro','Greece','Albania'], cat:'Sports' },
    { q:'Which Turkish basketball team has won the EuroLeague multiple times recently (2021, 2022)?', a:'Anadolu Efes', opts:['Fenerbahçe','Anadolu Efes','Galatasaray'], cat:'Sports' },
    { q:'Morocco\'s national football team is known by what nickname, representing the strength of the region?', a:'The Atlas Lions', opts:['The Pharaohs','The Atlas Lions','The Desert Foxes'], cat:'Sports' },
    { q:'Which country produced the famous NBA player Nikola Vučević?', a:'Montenegro', opts:['Serbia','Montenegro','Greece'], cat:'Sports' },
    { q:'In 2023, which country\'s female volleyball team became European Champions for the first time?', a:'Turkey', opts:['Serbia','Greece','Turkey'], cat:'Sports' },
    { q:'In which specific city can you watch the "Eternal Derby" between the rival basketball teams Red Star and Partizan?', a:'Belgrade', opts:['Sarajevo','Belgrade','Zagreb'], cat:'Sports' },
    { q:'Known as the "Turkish Diamond," which young talent moved from Fenerbahçe to Real Madrid in 2023?', a:'Arda Güler', opts:['Arda Güler','Kenan Yıldız','Arda Turan'], cat:'Sports' },
    { q:'This Ukrainian athlete is a world champion in the heavyweight division and holds several belts. What is his name?', a:'Oleksandr Usyk', opts:['Wladimir Klitschko','Oleksandr Usyk','Tyson Fury'], cat:'Sports' },
    { q:'Which stadium in Istanbul hosted the famous 2005 and 2023 Champions League finals and is the largest in Turkey?', a:'Atatürk Olympic Stadium', opts:['Wembley Stadium','Turk Telekom Arena','Atatürk Olympic Stadium'], cat:'Sports' },
    // GEOGRAPHY - HARD
    { q:'The Danube is the most international river in the world. How many countries does it flow through or border?', a:'10 countries', opts:['7 countries','10 countries','12 countries'], cat:'Geography' },
    { q:'Which country is famous for the "Mostar Bridge," a UNESCO site symbolizing the union of cultures?', a:'Bosnia and Herzegovina', opts:['Bosnia and Herzegovina','Serbia','Croatia'], cat:'Geography' },
    { q:'The "Transnistria" region is a self-proclaimed breakaway state located within the borders of which country?', a:'Moldova', opts:['Ukraine','Moldova','Albania'], cat:'Geography' },
    { q:'Suriname is the smallest sovereign state in South America. Which language is its only official language?', a:'Dutch', opts:['Spanish','Dutch','Portuguese'], cat:'Geography' },
    { q:'The "Ohrid Lake," one of Europe\'s deepest and oldest, is shared by Albania and which other country?', a:'North Macedonia', opts:['Greece','Bulgaria','North Macedonia'], cat:'Geography' },
    { q:'Which country uses the "Lari" as its currency?', a:'Georgia', opts:['Georgia','Bulgaria','Poland'], cat:'Geography' },
    { q:'Which river forms a natural border between Moldova and Ukraine?', a:'The Dniester', opts:['The Danube','The Dniester','The Vardar'], cat:'Geography' },
    { q:'Which country is known as the "Land of 1,000 Rivers" and has a famous coastline called the "Budva Riviera"?', a:'Montenegro', opts:['Serbia','Montenegro','Greece'], cat:'Geography' },
    // CULTURE - HARD
    { q:'Known as the founder of Missionaries of Charity and a Catholic saint, Mother Theresa hails from?', a:'Albanian-Indian', opts:['Albanian-Indian','Slovakian-Polish','Hungarian-Italian'], cat:'Culture' },
    { q:'Alemannic, a German dialect, is a significant language of which country?', a:'Liechtenstein', opts:['Germany','Liechtenstein','France'], cat:'Culture' },
    { q:'Rosti is a national dish for?', a:'Swiss', opts:['Italians','French','Swiss'], cat:'Culture' },
    { q:'From which country does the dish Plokkfiskur (fish stew) originate?', a:'Iceland', opts:['Norway','Iceland','Sweden'], cat:'Culture' },
    { q:'Islam is known to be the major religion of this country.', a:'Bosnia and Herzegovina', opts:['Bosnia and Herzegovina','Serbia','Croatia'], cat:'Culture' },
    // HISTORY - HARD
    { q:'The Battle of Liege was the first battle in World War 1.', a:'True', opts:['True','False'], cat:'History' },
    { q:'What disease was the cause of the "black death" in Europe?', a:'Plague', opts:['Rabies','Syphilis','Plague'], cat:'History' },
    { q:'Which of these countries is noted to have remained neutral in both World War 1 & 2?', a:'Liechtenstein', opts:['Liechtenstein','Slovakia','Romania'], cat:'History' },
    { q:'Which of these two European countries did Morocco gain its Independence from?', a:'France and Spain', opts:['Germany and Italy','Greece and Spain','France and Spain'], cat:'History' },
    { q:'Until its independence in 1975, Suriname remained under which rule?', a:'Dutch Rule', opts:['Dutch Rule','British Rule','French Rule'], cat:'History' },
    { q:'Which European country granted women the right to vote in national elections first, in 1906?', a:'Finland', opts:['Norway','Sweden','Finland'], cat:'History' },
    { q:'Which European country was divided into East and West until 1990?', a:'Germany', opts:['Hungary','Greece','Germany'], cat:'History' },
    // EU - HARD
    { q:'Which EU policy regulates relations with neighbouring countries in the East and South?', a:'The European Neighbourhood Policy', opts:['The European Neighbourhood Policy','The Common Agricultural Policy','The Common Fisheries Policy'], cat:'EU' },
    { q:'Which European countries are not members of the EU but use the euro?', a:'Montenegro / Kosovo', opts:['Montenegro / Kosovo','Croatia / Italy','Switzerland / Liechtenstein'], cat:'EU' },
    { q:'Which country was the last to join the EU in 2013?', a:'Croatia', opts:['Romania','Hungary','Croatia'], cat:'EU' },
    { q:'Since when has Turkey been a candidate country for EU membership?', a:'It applied in 1987', opts:['It applied in 2001','It applied in 2015','It applied in 1987'], cat:'EU' },
    { q:'What are the Copenhagen Criteria?', a:'Rules defining requirements for EU membership', opts:['Economic rules for the Eurozone only','Rules defining requirements for EU membership','Regulations for the Schengen Area'], cat:'EU' },
    { q:'Which treaty, signed in 1957, created the European Economic Community (EEC) and the European Atomic Energy Community (EURATOM)?', a:'The Treaty of Rome', opts:['The treaty of Sarajevo','The Vatican Treaty','The Treaty of Rome'], cat:'EU' },
  ],
};

const LEVELS_LABEL = { facil: 'Easy', medio: 'Medium', dificil: 'Hard' };
const TOTAL_Q      = 10;
const TIME_LIMIT   = { facil: 20, medio: 15, dificil: 10 };
const LETTERS      = ['A', 'B', 'C', 'D'];

// ── STATE ────────────────────────────────────────────────────────────────────
let level, questions, currentIdx, score, correct, wrong, timerInterval, timeLeft, timeTaken, totalTime;
let iaScore;

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  level = params.get('nivel') || 'facil';
  startGame();
});

function startGame() {
  const pool = [...QUESTIONS[level]].sort(() => Math.random() - 0.5).slice(0, TOTAL_Q);
  questions  = pool;
  currentIdx = 0;
  score      = 0;
  correct    = 0;
  wrong      = 0;
  totalTime  = 0;
  iaScore    = simulateIA(level);

  document.getElementById('topbar').style.display      = 'flex';
  document.getElementById('progress-bar').style.display = 'block';
  document.getElementById('topbar-level').textContent   = LEVELS_LABEL[level];
  document.getElementById('score-display').textContent  = '0';

  showScreen('game');
  loadQuestion();
}

function simulateIA(level) {
  const acc = { facil: 0.55, medio: 0.70, dificil: 0.88 };
  let s = 0;
  for (let i = 0; i < TOTAL_Q; i++) {
    if (Math.random() < acc[level]) s++;
  }
  return s;
}

// ── QUESTION ─────────────────────────────────────────────────────────────────
function loadQuestion() {
  const q       = questions[currentIdx];
  const timeMax = TIME_LIMIT[level];

  document.getElementById('q-counter').textContent    = `Question ${currentIdx + 1} / ${TOTAL_Q}`;
  document.getElementById('q-category').textContent   = q.cat;
  document.getElementById('question-text').textContent = q.q;
  document.getElementById('progress-fill').style.width = `${(currentIdx / TOTAL_Q) * 100}%`;

  // Category background
  const catBgMap = {
    Sports:    'images/bg-sport.jpg',
    Geography: 'images/bg-geography.jpg',
    Culture:   'images/bg-culture.jpg',
    History:   'images/bg-history.jpg',
    EU:        'images/bg-eu.jpg',
    Kenya:     'images/bg-kenya.jpg'
  };
  const bg = catBgMap[q.cat] || 'images/bg-ia.png';
  const gs = document.getElementById('screen-game');
  gs.style.backgroundImage    = `url('${bg}')`;
  gs.style.backgroundSize     = 'cover';
  gs.style.backgroundPosition = 'center';

  // Shuffle options
  const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
  const grid     = document.getElementById('options');
  grid.innerHTML = '';
  shuffled.forEach((opt, i) => {
    const btn       = document.createElement('button');
    btn.className   = 'opt-btn';
    btn.innerHTML   = `<span class="opt-letter">${LETTERS[i]}</span>${opt}`;
    btn.onclick     = () => answer(opt, q.a, shuffled);
    grid.appendChild(btn);
  });

  // Hide feedback
  document.getElementById('feedback').className = 'feedback';

  // Timer
  timeLeft  = timeMax;
  timeTaken = 0;
  updateTimer(timeLeft, timeMax);
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timeTaken++;
    updateTimer(timeLeft, timeMax);
    if (timeLeft <= 0) { clearInterval(timerInterval); timeOut(q.a); }
  }, 1000);

  // Animate panel in
  const gi = document.querySelector('.game-inner');
  gi.style.animation = 'none';
  gi.offsetHeight;
  gi.style.animation = 'rise .3s cubic-bezier(0.16,1,0.3,1) both';
}

function updateTimer(t, max) {
  const pct  = (t / max) * 100;
  const fill = document.getElementById('timer-fill');
  fill.style.width      = pct + '%';
  fill.style.background = t <= 5 ? '#e84545' : t <= 10 ? '#f5a623' : 'var(--blue)';
  document.getElementById('timer-num').textContent = t;
}

function answer(chosen, correct_a) {
  clearInterval(timerInterval);
  totalTime += (TIME_LIMIT[level] - timeLeft);

  const isCorrect = chosen === correct_a;
  if (isCorrect) { score++; correct++; }
  else           { wrong++; }

  document.getElementById('score-display').textContent = score;

  document.querySelectorAll('.opt-btn').forEach(btn => {
    const btnOpt = btn.textContent.replace(/^[A-D]/, '').trim();
    btn.disabled = true;
    if (btnOpt === correct_a)              btn.classList.add('correct');
    else if (btnOpt === chosen && !isCorrect) btn.classList.add('wrong');
  });

  showFeedback(isCorrect, correct_a);
}

function timeOut(correct_a) {
  wrong++;
  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.disabled = true;
    const btnOpt = btn.textContent.replace(/^[A-D]/, '').trim();
    if (btnOpt === correct_a) btn.classList.add('correct');
  });
  showFeedback(false, correct_a, true);
}

function showFeedback(isCorrect, correct_a, timeout = false) {
  const fb     = document.getElementById('feedback');
  const title  = document.getElementById('feedback-title');
  const detail = document.getElementById('feedback-detail');

  if (timeout) {
    fb.className      = 'feedback wrong-fb show';
    title.textContent  = "Time's up";
    detail.textContent = `The correct answer was: ${correct_a}`;
  } else if (isCorrect) {
    fb.className      = 'feedback correct-fb show';
    title.textContent  = 'Correct';
    detail.textContent = '+1 point';
  } else {
    fb.className      = 'feedback wrong-fb show';
    title.textContent  = 'Wrong';
    detail.textContent = `The correct answer was: ${correct_a}`;
  }

  document.getElementById('btn-next').textContent =
    currentIdx + 1 >= TOTAL_Q ? 'View results →' : 'Next →';
}

function nextQuestion() {
  currentIdx++;
  if (currentIdx >= TOTAL_Q) showResults();
  else loadQuestion();
}

// ── RESULTS ──────────────────────────────────────────────────────────────────
function showResults() {
  clearInterval(timerInterval);
  document.getElementById('progress-fill').style.width = '100%';

  const avgTime = correct + wrong > 0 ? Math.round(totalTime / TOTAL_Q) : 0;

  document.getElementById('res-score').textContent          = score;
  document.getElementById('res-correct').textContent        = correct;
  document.getElementById('res-wrong').textContent          = wrong;
  document.getElementById('res-time').textContent           = avgTime + 's';
  document.getElementById('ia-score-display').textContent   = `${iaScore} / ${TOTAL_Q}`;

  const verdict = document.getElementById('ia-verdict');
  if      (score > iaScore) { verdict.textContent = 'You won'; verdict.className = 'ia-verdict verdict-win'; }
  else if (score < iaScore) { verdict.textContent = 'You lost'; verdict.className = 'ia-verdict verdict-loss'; }
  else                      { verdict.textContent = 'Draw';   verdict.className = 'ia-verdict verdict-draw'; }

  const pct = score / TOTAL_Q;
  document.getElementById('res-msg').textContent =
    pct === 1   ? 'Perfect score!' :
    pct >= 0.8  ? 'Great job, excellent result!' :
    pct >= 0.6  ? 'Good, but there is room to improve.' :
    pct >= 0.4  ? 'You can do better.' : 'Keep practicing.';

  showScreen('results');
}

// ── NAV ───────────────────────────────────────────────────────────────────────
// showScreen comes from utils.js
function _showScreen_unused(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function restartGame()  { startGame(); }
function goToLevels()   { goTo('trivial-ia-nivel.html'); }
function goHome()       { goTo('trivial-modos.html'); }
function exitGame()     { clearInterval(timerInterval); goHome(); }
