const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ─── Prevent crashes ──────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling'],
  allowEIO3: true,
  pingTimeout: 20000,
  pingInterval: 10000,
  httpCompression: false,
  perMessageDeflate: false,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Servir archivos estáticos con MIME types correctos ──────────────────────
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js',  express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(__dirname));

// ─── Ruta raíz → intro ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'trivial-intro.html'));
});

// ─── In-memory store (replace with MongoDB for production) ───────────────────
const tenants = {};     // tenantId -> { config, categories, questions }
const rooms   = {};     // roomCode -> gameState

// Default categories (used if tenant has none configured)
const defaultCategories = [
  { id: 'sports',  name: 'Sports',    color: '#18c25a', emoji: '⚽' },
  { id: 'geo',     name: 'Geography', color: '#3B9EFF', emoji: '🌍' },
  { id: 'culture', name: 'Culture',   color: '#f5a623', emoji: '🎭' },
  { id: 'history', name: 'History',   color: '#e84545', emoji: '📜' },
  { id: 'eu',      name: 'EU',        color: '#a259ff', emoji: '🇪🇺' },
  { id: 'kenya',   name: 'Kenya',     color: '#cc2200', emoji: '🦒' },
  { id: 'doble',   name: 'x2 Pts',   color: '#FFD700', emoji: '⚡', special: true },
  { id: 'robo',    name: 'Robo',      color: '#ff4dff', emoji: '💸', special: true },
  { id: 'bomba',   name: 'Bomba',     color: '#ff6600', emoji: '💣', special: true },
  { id: 'skip',    name: 'SKIP',      color: '#00e5ff', emoji: '⏭️', special: true },
  { id: 'suerte',  name: 'Suerte',    color: '#00ff88', emoji: '🍀', special: true },
];

const defaultQuestions = {
  sports: [
    {q:"In which country were the first Ancient Olympic Games held?",a:"Greece",opts:["Italy","Greece","Turkey"],diff:"fácil"},
    {q:"Which Serbian legendary athlete has won the most Grand Slam titles in tennis history?",a:"Novak Djokovic",opts:["Novak Djokovic","Roger Federer","Rafael Nadal"],diff:"fácil"},
    {q:"Andriy Shevchenko is a legendary striker and former manager of which national team?",a:"Ukraine",opts:["Romania","Poland","Ukraine"],diff:"fácil"},
    {q:"Which Serbian basketball player is one of the greatest players currently in NBA?",a:"Nikola Jokić",opts:["Nikola Jokić","Luka Dončić","Stephen Curry"],diff:"fácil"},
    {q:"In which city is the famous Circuit de Monaco, home to one of the most prestigious Formula 1 races?",a:"Monte Carlo",opts:["Monte Carlo","La Condamine","Fontvieille"],diff:"fácil"},
    {q:"Giannis Antetokounmpo, an NBA superstar, plays for which national team?",a:"Greece",opts:["Turkey","Poland","Greece"],diff:"fácil"},
    {q:"Which Portuguese superstar is the all-time leading scorer in international football and has won 5 Ballons d'Or?",a:"Cristiano Ronaldo",opts:["Luís Figo","Cristiano Ronaldo","Thierry Henry"],diff:"fácil"},
    {q:"Roger Federer, one of the greatest tennis players of all time, represents which country?",a:"Switzerland",opts:["Austria","Germany","Switzerland"],diff:"fácil"},
    {q:"Which two European countries share the record for the most Football World Cup titles, with 4 trophies each?",a:"Italy and Germany",opts:["France and Spain","Italy and Germany","England and Portugal"],diff:"fácil"},
    {q:"Luka Modrić, a Ballon d'Or winner, was born in which country?",a:"Croatia",opts:["Croatia","Montenegro","Albania"],diff:"fácil"},
    {q:"Galatasaray, Fenerbahçe, and Beşiktaş are the Big Three football clubs of which city?",a:"Istanbul",opts:["Belgrade","Istanbul","Warsaw"],diff:"medio"},
    {q:"Which German Formula 1 driver won 7 World Championships and is a global icon for Ferrari?",a:"Michael Schumacher",opts:["Lewis Hamilton","Michael Schumacher","Nico Rosberg"],diff:"medio"},
    {q:"In 2004, which country surprised the world by winning the UEFA European Football Championship?",a:"Greece",opts:["Albania","Greece","Czech Republic"],diff:"medio"},
    {q:"Which iconic stadium in London, famous for its giant arch, is considered the home of English football?",a:"Wembley Stadium",opts:["Old Trafford","Camp Nou","Wembley Stadium"],diff:"medio"},
    {q:"Brazil is the most successful national team in World Cup history. How many titles have they won?",a:"5",opts:["4","5","6"],diff:"medio"},
    {q:"Ukraine co-hosted the UEFA Euro 2012. Which neighboring country did they host it with?",a:"Poland",opts:["Poland","Romania","Slovakia"],diff:"medio"},
    {q:"Which Italian motorcycling legend, nicknamed The Doctor, won 9 World Championships?",a:"Valentino Rossi",opts:["Max Biaggi","Giacomo Agostini","Valentino Rossi"],diff:"medio"},
    {q:"Edin Džeko is a legendary football striker and a symbol of national unity for which country?",a:"Bosnia and Herzegovina",opts:["Serbia","Bosnia and Herzegovina","Montenegro"],diff:"medio"},
    {q:"Panathinaikos and Olympiacos are the two biggest rival clubs in which country?",a:"Greece",opts:["Turkey","Albania","Greece"],diff:"medio"},
    {q:"Which famous Greek tennis player reached the final of the French Open and is a top-ranked ATP athlete?",a:"Stefanos Tsitsipas",opts:["Stefanos Tsitsipas","Hubert Hurkacz","Casper Ruud"],diff:"medio"},
    {q:"Water Polo is the national sport and a symbol of pride for which small coastal country?",a:"Montenegro",opts:["Montenegro","Greece","Albania"],diff:"difícil"},
    {q:"Which Turkish basketball team has won the EuroLeague multiple times recently (2021, 2022)?",a:"Anadolu Efes",opts:["Fenerbahçe","Anadolu Efes","Galatasaray"],diff:"difícil"},
    {q:"Morocco's national football team is known by what nickname?",a:"The Atlas Lions",opts:["The Pharaohs","The Atlas Lions","The Desert Foxes"],diff:"difícil"},
    {q:"Which country produced the famous NBA player Nikola Vučević?",a:"Montenegro",opts:["Serbia","Montenegro","Greece"],diff:"difícil"},
    {q:"In 2023, which country's female volleyball team became European Champions for the first time?",a:"Turkey",opts:["Serbia","Greece","Turkey"],diff:"difícil"},
    {q:"In which specific city can you watch the Eternal Derby between Red Star and Partizan?",a:"Belgrade",opts:["Sarajevo","Belgrade","Zagreb"],diff:"difícil"},
    {q:"Known as the Turkish Diamond, which young talent moved from Fenerbahçe to Real Madrid in 2023?",a:"Arda Güler",opts:["Arda Güler","Kenan Yıldız","Arda Turan"],diff:"difícil"},
    {q:"This Ukrainian athlete is a world champion in the heavyweight division. What is his name?",a:"Oleksandr Usyk",opts:["Wladimir Klitschko","Oleksandr Usyk","Tyson Fury"],diff:"difícil"},
    {q:"Which stadium in Istanbul hosted the 2005 and 2023 Champions League finals?",a:"Atatürk Olympic Stadium",opts:["Wembley Stadium","Turk Telekom Arena","Atatürk Olympic Stadium"],diff:"difícil"},
  ],
  geo: [
    {q:"Kyiv is the capital city of which Eastern European country?",a:"Ukraine",opts:["Ukraine","Poland","Romania"],diff:"fácil"},
    {q:"Which country connects Europe and Asia?",a:"Turkey",opts:["Greece","Turkey","Bulgaria"],diff:"fácil"},
    {q:"Which large sea borders Ukraine to the south and Turkey to the north?",a:"The Black Sea",opts:["The Black Sea","The Mediterranean Sea","The Adriatic Sea"],diff:"fácil"},
    {q:"What is the capital of Bosnia and Herzegovina?",a:"Sarajevo",opts:["Sarajevo","Belgrade","Bucharest"],diff:"fácil"},
    {q:"The city of Istanbul is the capital of Turkey?",a:"False",opts:["True","False"],diff:"fácil"},
    {q:"Which country is famous for its thousands of islands and is considered the cradle of Western civilization?",a:"Greece",opts:["Greece","Turkey","Montenegro"],diff:"fácil"},
    {q:"What is the capital city of Serbia, located where the Sava and Danube rivers meet?",a:"Belgrade",opts:["Athens","Belgrade","Ankara"],diff:"fácil"},
    {q:"Which country is known for its fjords and shares a long border with Sweden?",a:"Norway",opts:["Finland","Norway","Denmark"],diff:"fácil"},
    {q:"Which river flows through Belgrade?",a:"The Danube",opts:["The Volga","The Rhine","The Danube"],diff:"fácil"},
    {q:"Which mountain range forms a natural border between Switzerland and Italy?",a:"The Alps",opts:["The Pyrenees","The Alps","The Apennines"],diff:"fácil"},
    {q:"The Vatican City is the smallest country in the world. In which city is it located?",a:"Rome",opts:["Florence","Rome","Milan"],diff:"fácil"},
    {q:"Which of these microstates is located entirely within the borders of Italy?",a:"San Marino",opts:["Andorra","Monaco","San Marino"],diff:"fácil"},
    {q:"The Rock of Gibraltar is a famous landmark near the border of which African country?",a:"Morocco",opts:["Morocco","Algeria","Tunisia"],diff:"medio"},
    {q:"Which of these countries does NOT have a coastline on the Adriatic Sea?",a:"Serbia",opts:["Croatia","Albania","Serbia"],diff:"medio"},
    {q:"Which country is known as the Land of Eagles?",a:"Albania",opts:["Albania","Montenegro","Greece"],diff:"medio"},
    {q:"The Balkan Peninsula is named after a mountain range?",a:"True",opts:["True","False"],diff:"medio"},
    {q:"Which of these countries is the youngest independent state, having gained independence in 2006?",a:"Montenegro",opts:["Serbia","Montenegro","Romania"],diff:"medio"},
    {q:"Which sea, shared by Greece and Turkey, is famous for its blue waters and thousands of islands?",a:"The Aegean Sea",opts:["The Red Sea","The Ionian Sea","The Aegean Sea"],diff:"medio"},
    {q:"The Evros river forms a natural border between which two countries?",a:"Greece and Turkey",opts:["Serbia and Montenegro","Greece and Turkey","Ukraine and Moldova"],diff:"medio"},
    {q:"Which country is landlocked between Romania and Ukraine?",a:"Moldova",opts:["Moldova","Georgia","Albania"],diff:"medio"},
    {q:"Which country's flag features a yellow map of its territory and six white stars?",a:"Kosovo",opts:["Kosovo","Bosnia and Herzegovina","Croatia"],diff:"medio"},
    {q:"The Balkan Mountains (Stara Planina) are mainly located in which country?",a:"Bulgaria",opts:["Turkey","Bulgaria","North Macedonia"],diff:"medio"},
    {q:"Which European microstate is located in the Pyrenees mountains between France and Spain?",a:"Andorra",opts:["Andorra","Liechtenstein","Luxembourg"],diff:"medio"},
    {q:"Which country's flag features a double-headed black eagle on a red background?",a:"Albania",opts:["Albania","Greece","Serbia"],diff:"medio"},
    {q:"The Danube is the most international river. How many countries does it flow through or border?",a:"10 countries",opts:["7 countries","10 countries","12 countries"],diff:"difícil"},
    {q:"Which country is famous for the Mostar Bridge, a UNESCO site symbolizing the union of cultures?",a:"Bosnia and Herzegovina",opts:["Bosnia and Herzegovina","Serbia","Croatia"],diff:"difícil"},
    {q:"The Transnistria region is a self-proclaimed breakaway state located within which country?",a:"Moldova",opts:["Ukraine","Moldova","Albania"],diff:"difícil"},
    {q:"Suriname is the smallest sovereign state in South America. What is its only official language?",a:"Dutch",opts:["Spanish","Dutch","Portuguese"],diff:"difícil"},
    {q:"The Ohrid Lake is shared by Albania and which other country?",a:"North Macedonia",opts:["Greece","Bulgaria","North Macedonia"],diff:"difícil"},
    {q:"Which country uses the Lari as its currency?",a:"Georgia",opts:["Georgia","Bulgaria","Poland"],diff:"difícil"},
    {q:"Which river forms a natural border between Moldova and Ukraine?",a:"The Dniester",opts:["The Danube","The Dniester","The Vardar"],diff:"difícil"},
    {q:"Which country is known as the Land of 1,000 Rivers and has the Budva Riviera?",a:"Montenegro",opts:["Serbia","Montenegro","Greece"],diff:"difícil"},
  ],
  culture: [
    {q:"Ciao means Hello or bye in which language?",a:"Italian",opts:["French","Italian","Hungarian"],diff:"fácil"},
    {q:"Fado is a traditional style of music from which country?",a:"Portugal",opts:["Italy","Albania","Portugal"],diff:"fácil"},
    {q:"Which country makes it an unforgivable sin for breaking pasta?",a:"Italy",opts:["France","Germany","Italy"],diff:"fácil"},
    {q:"Wiener Schnitzel is a famous traditional dish of which country?",a:"Austria",opts:["Austria","Hungary","Italy"],diff:"fácil"},
    {q:"Bienvenue is a word from which language?",a:"French",opts:["Portuguese","Spanish","French"],diff:"fácil"},
    {q:"Samba and Bossa Nova are traditional music genres of which country?",a:"Brazil",opts:["Brazil","Mexico","Suriname"],diff:"fácil"},
    {q:"Which of these countries is the hub for the wealthiest and most expensive places in the world?",a:"Monaco",opts:["Spain","Monaco","France"],diff:"fácil"},
    {q:"What are the two official languages of Finland?",a:"Finnish and Swedish",opts:["French and German","Finnish and Swedish","Swedish and Italian"],diff:"fácil"},
    {q:"From which language does the word Europe derive?",a:"Greek",opts:["Italian","Spanish","Greek"],diff:"medio"},
    {q:"From which country does the traditional jota dance originate?",a:"Spain",opts:["Poland","Spain","Belgium"],diff:"medio"},
    {q:"Melania Trump, current First Lady of the United States, is a native of which European country?",a:"Slovenia",opts:["Lithuania","Slovakia","Slovenia"],diff:"medio"},
    {q:"Which country does the food Banitza come from?",a:"Bulgaria",opts:["Bulgaria","Austria","Lithuania"],diff:"medio"},
    {q:"Jó reggelt means Good morning in which language?",a:"Hungarian",opts:["Swedish","Italian","Hungarian"],diff:"medio"},
    {q:"Kipferl is a crescent-shaped Austrian pastry that French bakers took inspiration from to make croissants.",a:"True",opts:["True","False"],diff:"medio"},
    {q:"Which of these countries is known as the easiest European country for foreigners to get married?",a:"Denmark",opts:["Finland","Denmark","Sweden"],diff:"medio"},
    {q:"Stockholm takes the crown as the European city with the healthiest hair.",a:"True",opts:["True","False"],diff:"medio"},
    {q:"Known as the founder of Missionaries of Charity, Mother Theresa hails from?",a:"Albanian-Indian",opts:["Albanian-Indian","Slovakian-Polish","Hungarian-Italian"],diff:"difícil"},
    {q:"This country has an ethnicity of persons of descendants of escaped African slaves known as Maroons and Creoles.",a:"Suriname",opts:["Brazil","Mexico","Suriname"],diff:"difícil"},
    {q:"The Arab Berbers are the least ethnic group in Morocco.",a:"False",opts:["True","False"],diff:"difícil"},
    {q:"Alemannic, a German dialect, is a significant language of which country?",a:"Liechtenstein",opts:["Germany","Liechtenstein","France"],diff:"difícil"},
    {q:"Rosti is a national dish for?",a:"Swiss",opts:["Italians","French","Swiss"],diff:"difícil"},
    {q:"From which country does the dish Plokkfiskur (fish stew) originate?",a:"Iceland",opts:["Norway","Iceland","Sweden"],diff:"difícil"},
    {q:"Islam is known to be the major religion of this country.",a:"Bosnia and Herzegovina",opts:["Bosnia and Herzegovina","Serbia","Croatia"],diff:"difícil"},
  ],
  history: [
    {q:"The euro is the least used currency in the European Union.",a:"False",opts:["True","False"],diff:"fácil"},
    {q:"Which UK prime minister resigned because of Brexit?",a:"David Cameron",opts:["David Cameron","Rishi Sunak","Keir Starmer"],diff:"fácil"},
    {q:"The Maastricht treaty established the European Union.",a:"True",opts:["True","False"],diff:"fácil"},
    {q:"What is the smallest country in Europe and the world?",a:"Vatican City",opts:["San Marino","Prague","Vatican City"],diff:"fácil"},
    {q:"Which country gifted the Statue of Liberty to the United States?",a:"France",opts:["Italy","Germany","France"],diff:"fácil"},
    {q:"Which country withdrew its membership from the European Union in 2020?",a:"United Kingdom",opts:["United Kingdom","France","Italy"],diff:"fácil"},
    {q:"When was the European slave trade abolished?",a:"1800s",opts:["1700s","1800s","1900s"],diff:"fácil"},
    {q:"Which British ship sank in 1912 on its route between Southampton and New York City?",a:"The Titanic",opts:["Hms Belfast","The Titanic","Hms Hood"],diff:"fácil"},
    {q:"In which country did the Industrial Revolution begin?",a:"England",opts:["Portugal","France","England"],diff:"fácil"},
    {q:"Which European country was the birthplace of democracy?",a:"Greece",opts:["France","Italy","Greece"],diff:"fácil"},
    {q:"Which city was destroyed by a volcanic eruption in 79 AD?",a:"Pompeii, Italy",opts:["Akrotiri, Greece","Tenerife, Spain","Pompeii, Italy"],diff:"fácil"},
    {q:"Which of these countries houses the European Central Bank?",a:"Germany",opts:["France","Germany","Switzerland"],diff:"medio"},
    {q:"Catherine the Great was the first female ruler of Russia.",a:"False",opts:["True","False"],diff:"medio"},
    {q:"Which of these countries in the Americas was the latest to abolish slavery?",a:"Brazil",opts:["Mexico","Brazil","Argentina"],diff:"medio"},
    {q:"What did the people of France decide during the French Revolution of 1789?",a:"They no longer wanted to be ruled by Monarchs",opts:["They no longer wanted to be ruled by Monarchs","Women would gain the right to vote","To elect Charles de Gaulle as President"],diff:"medio"},
    {q:"Which treaty, signed in 1648, ended the Thirty Years War?",a:"The treaty of Westphalia",opts:["The treaty of Westphalia","Rome treaty","Maastricht treaty"],diff:"medio"},
    {q:"Which 15th-century invention by Johannes Gutenberg revolutionized the spread of knowledge?",a:"The Printing Press",opts:["Caravel ship","The Printing Press","Helicopter design"],diff:"medio"},
    {q:"In which European city did the 1815 Congress take place after the Napoleonic Wars?",a:"Vienna, Austria",opts:["London, UK","Paris, France","Vienna, Austria"],diff:"medio"},
    {q:"Which European wall fell in 1989, symbolizing the end of the Cold War?",a:"The Berlin Wall",opts:["Hadrian's Wall","Lennon Wall","The Berlin Wall"],diff:"medio"},
    {q:"Who was the famous queen of France executed during the French Revolution?",a:"Marie Antoinette",opts:["Anne of Brittany","Eleanor of Aquitaine","Marie Antoinette"],diff:"medio"},
    {q:"Which French leader crowned himself Emperor in 1804?",a:"Napoleon Bonaparte",opts:["Victor Hugo","Napoleon Bonaparte","Jean Paul Sartre"],diff:"medio"},
    {q:"The Battle of Liege was the first battle in World War 1.",a:"True",opts:["True","False"],diff:"difícil"},
    {q:"What disease was the cause of the black death in Europe?",a:"Plague",opts:["Rabies","Syphilis","Plague"],diff:"difícil"},
    {q:"Which of these countries remained neutral in both World War 1 and 2?",a:"Liechtenstein",opts:["Liechtenstein","Slovakia","Romania"],diff:"difícil"},
    {q:"This city-state served as a refuge for persecuted people in Italy during the 19th century.",a:"San Marino",opts:["Vatican City","San Marino","Pisa"],diff:"difícil"},
    {q:"Which two European countries did Morocco gain its Independence from?",a:"France and Spain",opts:["Germany and Italy","Greece and Spain","France and Spain"],diff:"difícil"},
    {q:"Until its independence in 1975, Suriname remained under which rule?",a:"Dutch Rule",opts:["Dutch Rule","British Rule","French Rule"],diff:"difícil"},
    {q:"Which European country granted women the right to vote in national elections first, in 1906?",a:"Finland",opts:["Norway","Sweden","Finland"],diff:"difícil"},
    {q:"Which European country was divided into East and West until 1990?",a:"Germany",opts:["Hungary","Greece","Germany"],diff:"difícil"},
  ],
  eu: [
    {q:"How many stars are on the flag of the European Union?",a:"12",opts:["12","27","16"],diff:"fácil"},
    {q:"How many countries are currently members of the European Union?",a:"27",opts:["27","28","29"],diff:"fácil"},
    {q:"Which document sets out the fundamental rights of European citizens?",a:"The Charter of Fundamental Rights of the European Union",opts:["The treaty of Rome","The Charter of Fundamental Rights of the European Union","The treaty of Maastricht"],diff:"fácil"},
    {q:"Which EU programme allows students to study in another country?",a:"Erasmus+",opts:["Erasmus+","Bologna Plan","The European Solidarity Corps"],diff:"fácil"},
    {q:"Which European value implies tolerance and respect for religious diversity?",a:"Freedom of religion",opts:["Freedom of ideology","Freedom of speech","Freedom of religion"],diff:"fácil"},
    {q:"Which country, located entirely in Europe, is the largest?",a:"Ukraine",opts:["Ukraine","Germany","Turkey"],diff:"fácil"},
    {q:"Which country is the smallest in Europe?",a:"Vatican City",opts:["Vatican City","Liechtenstein","Andorra"],diff:"fácil"},
    {q:"Which country is a candidate for EU membership but is located partly in Europe and partly in Asia?",a:"Turkey",opts:["Turkey","Morocco","Moldova"],diff:"fácil"},
    {q:"Which agreement allows travel without border controls in many EU countries?",a:"The Schengen Agreement",opts:["The Lisbon Treaty","The Schengen Agreement","The Rome agreement"],diff:"medio"},
    {q:"Which one of these countries is a candidate to join the EU?",a:"North Macedonia",opts:["North Macedonia","Italy","San Marino"],diff:"medio"},
    {q:"Which country shares all its land border with the EU but is not a member?",a:"Switzerland",opts:["Switzerland","Brazil","Croatia"],diff:"medio"},
    {q:"Which bordering cities between Spain and Morocco represent a land border between Europe and Africa?",a:"Ceuta and Melilla",opts:["Tetouan and Tarifa","Ceuta and Melilla","Cadiz and Rabat"],diff:"medio"},
    {q:"How many official languages does the EU have?",a:"24 official languages",opts:["24 official languages","16 official languages","35 official languages"],diff:"medio"},
    {q:"Which European value implies that governments must respect laws and institutions?",a:"The rule of law",opts:["The free Trade","Freedom of movement","The rule of law"],diff:"medio"},
    {q:"Which eastern neighbouring country of the EU formally applied for EU membership in 2022?",a:"Ukraine",opts:["Bosnia","Slovenia","Ukraine"],diff:"medio"},
    {q:"Which level of education is the Bologna Process mainly related to?",a:"Higher education (university level)",opts:["Higher education (university level)","Primary education","Secondary education"],diff:"medio"},
    {q:"Do all EU member states have to follow the acquis communautaire?",a:"Yes",opts:["Yes","No"],diff:"medio"},
    {q:"Which EU policy regulates relations with neighbouring countries in the East and South?",a:"The European Neighbourhood Policy",opts:["The European Neighbourhood Policy","The Common Agricultural Policy","The Common Fisheries Policy"],diff:"difícil"},
    {q:"Which European countries are not members of the EU but use the euro?",a:"Montenegro / Kosovo",opts:["Montenegro / Kosovo","Croatia / Italy","Switzerland / Liechtenstein"],diff:"difícil"},
    {q:"Which country in the Caucasus has an association agreement with the EU?",a:"Georgia",opts:["Moldova","Georgia","Kosovo"],diff:"difícil"},
    {q:"Which country was the last to join the EU in 2013?",a:"Croatia",opts:["Romania","Hungary","Croatia"],diff:"difícil"},
    {q:"Since when has Turkey been a candidate country for EU membership?",a:"It applied in 1987",opts:["It applied in 2001","It applied in 2015","It applied in 1987"],diff:"difícil"},
    {q:"What is the CAP?",a:"The Common Agricultural Policy",opts:["The Common Agricultural Policy","The Communal Agreement Policy","The Common Aviation Policy"],diff:"difícil"},
    {q:"What are the Copenhagen Criteria?",a:"Rules defining requirements for EU membership",opts:["Economic rules for the Eurozone only","Rules defining requirements for EU membership","Regulations for the Schengen Area"],diff:"difícil"},
    {q:"Which treaty, signed in 1957, created the European Economic Community (EEC)?",a:"The Treaty of Rome",opts:["The treaty of Sarajevo","The Vatican Treaty","The Treaty of Rome"],diff:"difícil"},
    {q:"Which policies aim to reduce economic, social and territorial disparities between regions?",a:"Cohesion policies",opts:["Equality policies","Economic policies","Cohesion policies"],diff:"difícil"},
  ],
  kenya: [
    {q:"Which country has more inhabitants, Spain or Kenya?",a:"Kenya",opts:["Spain","Kenya"],diff:"fácil"},
    {q:"What is the capital of Kenya?",a:"Nairobi",opts:["Mombasa","Nairobi","Nakuru"],diff:"fácil"},
    {q:"What is the capital of Spain?",a:"Madrid",opts:["Madrid","Barcelona","Valencia"],diff:"fácil"},
    {q:"Which of these dances is traditional in Spain?",a:"Flamenco",opts:["Salsa","Flamenco","Bachata"],diff:"fácil"},
    {q:"Which of these dishes is typical in Spain?",a:"Paella",opts:["Paella","Croissant","Tacos"],diff:"fácil"},
    {q:"Which sport is most popular in Spain?",a:"Football (Soccer)",opts:["Basketball","Rugby","Football (Soccer)"],diff:"fácil"},
    {q:"Which sport is very popular internationally in Kenya?",a:"Long-distance running",opts:["Long-distance running","Rugby","Baseball"],diff:"fácil"},
    {q:"What is the predominant religion in both Kenya and Spain?",a:"Christianity",opts:["Islam","There is no predominant religion","Christianity"],diff:"fácil"},
    {q:"Which of these natural parks is in Kenya?",a:"Maasai Mara National Reserve",opts:["Maasai Mara National Reserve","Kruger National Park","Teide National Park"],diff:"fácil"},
    {q:"Which of these natural parks is in Spain?",a:"Doñana National Park",opts:["Gran Paradiso National Park","Doñana National Park","Stelvio National Park"],diff:"fácil"},
    {q:"Which food is a staple in the traditional Kenyan diet?",a:"Ugali",opts:["Ugali","Rice","Beans"],diff:"fácil"},
    {q:"Which drink is traditional in Kenya?",a:"Chai tea",opts:["Chai tea","Changaa","Wine"],diff:"fácil"},
    {q:"What is the most important economic sector in Kenya?",a:"Agriculture",opts:["Agriculture","Tourism","Manufacturing"],diff:"fácil"},
    {q:"What is the most important economic sector in Spain?",a:"Tourism",opts:["Mining","Agriculture","Tourism"],diff:"fácil"},
    {q:"Which Kenyan ethnic group is famous for its traditions and red clothing?",a:"Maasai",opts:["Maasai","Kikuyu","Luo"],diff:"fácil"},
    {q:"Which wild animal is native to Spain?",a:"Iberian lynx",opts:["Iberian lynx","African lion","Brown bear"],diff:"fácil"},
    {q:"Which instrument is traditional in Kenya?",a:"Nyatiti",opts:["Guitar","Nyatiti","Djembe"],diff:"fácil"},
    {q:"Can cultural diversity benefit a society?",a:"Yes, it can bring new ideas, cultures, and perspectives",opts:["Yes, it can bring new ideas, cultures, and perspectives","No, it always creates conflict","It has no effect"],diff:"fácil"},
    {q:"What does cultural diversity mean?",a:"The coexistence of different cultures in one society",opts:["Only one dominant culture exists","All cultures are identical","The coexistence of different cultures in one society"],diff:"fácil"},
    {q:"What value helps to combat racism the most?",a:"Respect for all people",opts:["Respect for all people","Competition between cultures","Avoiding contact with other cultures"],diff:"fácil"},
    {q:"What are the official languages of Kenya?",a:"English and Swahili",opts:["English and Swahili","French and Swahili","Arabic and English"],diff:"medio"},
    {q:"What are the main products imported from Kenya to Spain?",a:"Vegetable oils, nuts, and polyacetal products",opts:["Vegetable oils, nuts, and polyacetal products","Petrol","Minerals and construction materials"],diff:"medio"},
    {q:"How many Spaniards live in Kenya?",a:"Between 300 and 600 people",opts:["Between 300 and 600 people","Between 1,500 and 2,000 people","Between 10,000 and 12,000 people"],diff:"medio"},
    {q:"What are the main emigration destinations for Kenyans?",a:"United States, United Kingdom, and Uganda",opts:["United States, United Kingdom, and Uganda","United Kingdom, Spain, and France","United States, South Africa, and Italy"],diff:"medio"},
    {q:"What are the main emigration destinations for Spaniards?",a:"France, United Kingdom, Germany, and Switzerland",opts:["France, United Kingdom, Germany, and Switzerland","Australia and United Arab Emirates","Argentina, Cuba, and the United States"],diff:"medio"},
    {q:"Which of these festivals is typical in Spain?",a:"La Tomatina",opts:["La Tomatina","Mombasa Carnival","Nairobi Festival"],diff:"medio"},
    {q:"Which of these festivals is typical in Kenya?",a:"Lamu Cultural Festival",opts:["Lamu Cultural Festival","Feria de Abril","La Tomatina"],diff:"medio"},
    {q:"Who is the current president of Kenya?",a:"William Ruto",opts:["Ibrahim Traoré","Emmanuel Macron","William Ruto"],diff:"medio"},
    {q:"Who is the current president of Spain?",a:"Pedro Sánchez",opts:["Emmanuel Macron","Pedro Sánchez","Francisco Franco"],diff:"medio"},
    {q:"Which dish is very common in Kenyan family celebrations?",a:"Nyama choma",opts:["Pilau","Ugali","Nyama choma"],diff:"medio"},
    {q:"What do the shield and spears on the Kenyan flag symbolize?",a:"Protection of freedom and defense of the country",opts:["The country's mineral wealth","Kenya's maritime tradition","Protection of freedom and defense of the country"],diff:"medio"},
    {q:"Which international document establishes basic human rights for all people?",a:"Universal Declaration of Human Rights",opts:["Schengen Agreement","Universal Declaration of Human Rights","Treaty of Maastricht"],diff:"medio"},
    {q:"Which international organization works to promote human rights worldwide?",a:"United Nations",opts:["United Nations","FIFA","NATO"],diff:"medio"},
    {q:"Which right protects people seeking safety in another country?",a:"Right of asylum",opts:["Right of asylum","Right to travel","Right to international trade"],diff:"medio"},
    {q:"What is a cultural stereotype?",a:"A simplified or generalized idea about a group of people",opts:["A simplified or generalized idea about a group of people","A law regulating culture","Main characteristics of a country"],diff:"medio"},
    {q:"What does equality of opportunity mean?",a:"Everyone has the same chance to develop",opts:["Everyone has the same chance to develop","Everyone studies exactly the same","Everyone has exactly the same job"],diff:"medio"},
    {q:"Which neighboring African country is the most frequent destination for Kenyan migrants?",a:"Uganda",opts:["Uganda","Ethiopia","Tanzania"],diff:"medio"},
    {q:"Which European country receives the most Spanish emigrants?",a:"France",opts:["Germany","United Kingdom","France"],diff:"medio"},
    {q:"What is racism?",a:"The belief in the superiority of one race over others based on biological prejudice",opts:["Respect for other cultures","The belief in the superiority of one race over others based on biological prejudice","Fear or rejection of foreigners based on nationality"],diff:"medio"},
    {q:"What is xenophobia?",a:"Fear, dislike, or rejection of foreigners based on cultural or national differences",opts:["Respect for other cultures","The belief in the superiority of one race","Fear, dislike, or rejection of foreigners based on cultural or national differences"],diff:"medio"},
    {q:"How many people emigrate from Spain per year?",a:"480,000 people",opts:["48,000 people","140,000 people","480,000 people"],diff:"difícil"},
    {q:"How many people emigrate from Kenya per year?",a:"Between 200,000 and 350,000 people",opts:["Less than 100,000 people","Between 200,000 and 350,000 people","More than 500,000 people"],diff:"difícil"},
    {q:"Approximately what percentage of young Spaniards considers emigrating in the next 5 years?",a:"40%",opts:["20%","40%","60%"],diff:"difícil"},
    {q:"Approximately what percentage of young Kenyans considers emigrating in the next 5 years?",a:"50%",opts:["15%","30%","50%"],diff:"difícil"},
    {q:"How many Kenyans live in Spain?",a:"Between 1,000 and 5,000 people",opts:["Less than 1,000 people","Between 1,000 and 5,000 people","More than 10,000 people"],diff:"difícil"},
    {q:"Which country has a younger average population?",a:"Kenya",opts:["Kenya","Spain"],diff:"difícil"},
    {q:"Which country receives more immigrants annually?",a:"Spain",opts:["Spain","Kenya","Morocco"],diff:"difícil"},
    {q:"Which country offers more international scholarships for students?",a:"Spain",opts:["Senegal","Kenya","Spain"],diff:"difícil"},
    {q:"What is the main reason young Spaniards emigrate?",a:"Work",opts:["Work","Study","Marriage"],diff:"difícil"},
    {q:"What is the main reason young Kenyans emigrate?",a:"Work",opts:["Tourism","Work","Study"],diff:"difícil"},
    {q:"Which of these products is a major Kenyan export?",a:"Coffee",opts:["Coffee","Automobiles","Machinery"],diff:"difícil"},
    {q:"Which environmental problem is most severe in Kenya?",a:"Desertification",opts:["Air pollution","Desertification","Oil spills"],diff:"difícil"},
    {q:"Do most migrants in the world move to wealthy countries?",a:"No, many migrate to neighboring or similar-income countries",opts:["Yes, almost all","No, many migrate to neighboring or similar-income countries","They only migrate to Europe"],diff:"difícil"},
    {q:"What does equity mean?",a:"Treating everyone fairly, considering their needs",opts:["Giving the same to everyone","Ignoring cultural differences","Treating everyone fairly, considering their needs"],diff:"difícil"},
    {q:"What does educational inclusion mean?",a:"All children and youth can access education, regardless of origin",opts:["All children and youth can access education, regardless of origin","Only students from certain social classes study","Everyone studies the same"],diff:"difícil"},
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getRandomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getUniqueQuestion(room, categoryId, diffLabel) {
  const td = getTenantData(room.tenantId);
  const allForCat = td.questions[categoryId] || [];
  const pool = diffLabel
    ? allForCat.filter(q => q.diff === diffLabel)
    : allForCat;

  if (!pool.length) return allForCat[Math.floor(Math.random() * allForCat.length)] || null;

  // Init used tracking
  if (!room.usedQuestions) room.usedQuestions = {};
  if (!room.usedQuestions[categoryId]) room.usedQuestions[categoryId] = [];

  // Filter out already used questions
  const used = room.usedQuestions[categoryId];
  let available = pool.filter((_, i) => !used.includes(pool.indexOf(pool[i])));

  // If all used, reset for this category
  if (!available.length) {
    room.usedQuestions[categoryId] = [];
    available = pool;
  }

  // Pick random from available
  const picked = available[Math.floor(Math.random() * available.length)];
  const globalIdx = allForCat.indexOf(picked);
  room.usedQuestions[categoryId].push(globalIdx);
  return picked;
}

function getTenantData(tenantId) {
  if (!tenants[tenantId]) {
    tenants[tenantId] = {
      categories: defaultCategories,
      questions: defaultQuestions,
      config: { name: tenantId, primaryColor: '#1a1a2e' }
    };
  }
  return tenants[tenantId];
}

function getRandomQuestion(tenantId, categoryId) {
  const td = getTenantData(tenantId);
  const pool = td.questions[categoryId] || [];
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createRoom(tenantId, hostName) {
  const code = getRandomCode();
  const td = getTenantData(tenantId);
  rooms[code] = {
    code,
    tenantId,
    host: null,
    players: [],
    categories: td.categories,
    state: 'lobby',      // lobby | spinning | question | answer | finished
    currentPlayerIdx: 0,
    currentQuestion: null,
    currentCategory: null,
    scores: {},
  };
  return code;
}

function broadcastRoom(code) {
  if (!rooms[code]) return;
  const room = rooms[code];
  // Send slim version without full question bank
  const payload = {
    code: room.code,
    state: room.state,
    players: room.players,
    categories: room.categories || defaultCategories,
    currentPlayerIdx: room.currentPlayerIdx,
    currentCategory: room.currentCategory,
    currentDifficulty: room.currentDifficulty,
    currentQuestion: room.currentQuestion,
    specialEffect: room.specialEffect || null,
    currentRound: room.currentRound || 1,
    totalRounds: room.totalRounds || 6,
    turnInRound: room.turnInRound || 0,
    questionIdx: room.questionIdx || 0,
    lastAnswer: room.lastAnswer || null,
    allAnswers: room.allAnswers || [],
    winner: room.winner || null,
  };
  io.to(code).emit('room:update', payload);
}

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('connect:', socket.id);

  // Create room
  socket.on('room:create', ({ tenantId = 'default', playerName }) => {
    const code = createRoom(tenantId, playerName);
    const room = rooms[code];
    room.host = socket.id;
    const player = { id: socket.id, name: playerName, score: 0, color: '#E84545' };
    room.players.push(player);
    room.scores[socket.id] = 0;
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room:created', { code, player });
    broadcastRoom(code);
  });

  // Join room
  socket.on('room:join', ({ code, playerName, tenantId = 'default' }) => {
    const room = rooms[code];
    if (!room) return socket.emit('error', { msg: 'Sala no encontrada' });
    if (room.state !== 'lobby') return socket.emit('error', { msg: 'La partida ya ha comenzado' });
    if (room.players.length >= 6) return socket.emit('error', { msg: 'Sala llena (máx. 6)' });

    const colors = ['#E84545','#3B9EFF','#F5A623','#A259FF','#2ECC71','#FF6B6B'];
    const player = { id: socket.id, name: playerName, score: 0, color: colors[room.players.length] };
    room.players.push(player);
    room.scores[socket.id] = 0;
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room:joined', { code, player });
    broadcastRoom(code);
  });

  // Rejoin room (when navigating to game page)
  socket.on('room:rejoin', ({ code, playerName }) => {
    console.log('room:rejoin:', code, playerName);
    const room = rooms[code];
    if (!room) {
      console.log('❌ Sala no encontrada:', code, '- Salas activas:', Object.keys(rooms));
      return socket.emit('error', { msg: 'Sala no encontrada' });
    }

    let existing = room.players.find(p => p.name === playerName);

    if (existing) {
      const oldId = existing.id;
      existing.id = socket.id;
      if (room.host === oldId) room.host = socket.id;
      if (room.scores[oldId] !== undefined) {
        room.scores[socket.id] = room.scores[oldId];
        delete room.scores[oldId];
      }
      console.log('✅ Player rejoined:', playerName, 'new id:', socket.id, 'state:', room.state);
    } else {
      const colors = ['#18c25a','#3B9EFF','#f5a623','#e84545','#a259ff','#ff6b6b'];
      existing = {
        id: socket.id,
        name: playerName,
        score: 0,
        color: colors[room.players.length % colors.length]
      };
      room.players.push(existing);
      room.scores[socket.id] = 0;
      console.log('✅ New player added:', playerName);
    }

    socket.join(code);
    socket.data.roomCode = code;

    // Send current room state to this socket using the proper payload
    setTimeout(() => {
      console.log('📡 Sending room:update to socket, state:', room.state);
      // Use broadcastRoom format but only to this socket
      const payload = {
        code: room.code,
        state: room.state,
        players: room.players,
        categories: room.categories || defaultCategories,
        currentPlayerIdx: room.currentPlayerIdx,
        currentCategory: room.currentCategory,
        currentDifficulty: room.currentDifficulty,
        currentQuestion: room.currentQuestion,
        specialEffect: room.specialEffect || null,
        currentRound: room.currentRound || 1,
        totalRounds: room.totalRounds || 6,
        turnInRound: room.turnInRound || 0,
        questionIdx: room.questionIdx || 0,
        lastAnswer: room.lastAnswer || null,
        allAnswers: room.allAnswers || [],
        winner: room.winner || null,
      };
      socket.emit('room:update', payload);
    }, 300);
  });

  // Start game (host only)
  socket.on('game:start', ({ rounds } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 1) return;
    room.state = 'spinning';
    room.currentRound = 1;
    room.turnInRound  = 0;
    room.totalRounds  = rounds || 6;
    room.currentPlayerIdx = 0;
    room.usedQuestions = {};
    room.lastCatPerPlayer = {};
    room.usedCatsPerPlayer = {}; // { categoryId: Set of used indices }
    io.to(code).emit('game:start', { roomCode: code });
    setTimeout(() => broadcastRoom(code), 2500);
  });

  // Spin wheel result
  // game:startSpin — player picks category (or random), server broadcasts result to ALL
  socket.on('game:startSpin', ({ catId } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;
    const currentPlayer = room.players[room.currentPlayerIdx];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    const cats = (room.categories || defaultCategories).filter(c => !c.special);
    const allCats = room.categories || defaultCategories;

    // Track used categories per player — avoid repeats until all used
    if (!room.usedCatsPerPlayer) room.usedCatsPerPlayer = {};
    if (!room.usedCatsPerPlayer[currentPlayer.name]) room.usedCatsPerPlayer[currentPlayer.name] = [];

    const usedCats = room.usedCatsPerPlayer[currentPlayer.name];
    const normalCats = cats; // already filtered non-special

    // Filter out already used categories
    let available = normalCats.filter(c => !usedCats.includes(c.id));

    // If all used, reset for this player
    if (available.length === 0) {
      room.usedCatsPerPlayer[currentPlayer.name] = [];
      available = normalCats;
    }

    // Pick category
    let winningCat;
    if (catId) {
      winningCat = allCats.find(c => c.id === catId);
    }
    if (!winningCat) {
      winningCat = available[Math.floor(Math.random() * available.length)];
    }

    // Mark as used
    room.usedCatsPerPlayer[currentPlayer.name].push(winningCat.id);

    // Pick difficulty
    const diffs = ['easy', 'medium', 'hard'];
    const chosenDiff = winningCat.special ? 'special' : diffs[Math.floor(Math.random() * diffs.length)];

    // Pick extra rotations (same for all clients so they land at same angle)
    const extraRotations = 5 + Math.random() * 3;

    // Broadcast result to ALL players
    io.to(code).emit('game:doSpin', {
      catId: winningCat.id,
      diff: chosenDiff,
      special: winningCat.special ? winningCat.id : null,
      extra: extraRotations,
    });
  });

  socket.on('game:spinResult', ({ categoryId, difficulty, special }) => {
    try {
      const code = socket.data.roomCode;
      const room = rooms[code];
      if (!room) return;
      const currentPlayer = room.players[room.currentPlayerIdx];
      if (!currentPlayer || currentPlayer.id !== socket.id) return;

      console.log('🎡 spinResult:', categoryId, difficulty, special);

      // Guard against null categoryId
      if (!categoryId) {
        console.error('❌ spinResult: categoryId is null, ignoring');
        return;
      }

      // Handle special sectors
      if (special) {
        room.currentCategory = categoryId;
        room.specialEffect = special;

        if (special === 'skip') {
          // Skip turn — go straight to answer/scoreboard
          room.state = 'answer';
          room.lastAnswer = { playerId: socket.id, playerName: currentPlayer.name, answer: '__skip__', correct: false, special: 'skip' };
          room.allAnswers = [];
          broadcastRoom(code);
          return;
        }

        if (special === 'suerte') {
          // Lucky! +6 points, no question needed
          room.scores[socket.id] = (room.scores[socket.id] || 0) + 6;
          currentPlayer.score = room.scores[socket.id];
          room.state = 'answer';
          room.lastAnswer = { playerId: socket.id, playerName: currentPlayer.name, answer: '__suerte__', correct: true, special: 'suerte' };
          room.allAnswers = [];
          broadcastRoom(code);
          return;
        }

        // For doble/robo/bomba — pick a random question from any normal category
        const normalCats = ['sports','geo','culture','history','eu','kenya'];
        const randCat = normalCats[Math.floor(Math.random() * normalCats.length)];
        room.currentQuestion = getUniqueQuestion(room, randCat, null);
        room.currentDifficulty = 'medium';

        // Small delay so spectators can finish reveal animation
        setTimeout(() => { room.state = 'question'; broadcastRoom(code); }, 500);
        return;
      }

      const diff = difficulty || 'medium';
      const diffMap = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
      const diffLabel = diffMap[diff] || 'medio';

      room.currentCategory = categoryId;
      room.currentDifficulty = diff;
      room.specialEffect = null;

      const diffMap2 = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
      room.currentQuestion = getUniqueQuestion(room, categoryId, diffMap2[diff] || 'medio');

      // Small delay so spectators can finish reveal animation
      setTimeout(() => { room.state = 'question'; broadcastRoom(code); }, 500);
    } catch(e) {
      console.error('game:spinResult error:', e.message);
    }
  });

  // Answer question — only current player answers
  socket.on('game:answer', ({ answer }) => {
    try {
      const code = socket.data.roomCode;
      const room = rooms[code];
      if (!room || room.state !== 'question') return;
      if (!room.currentQuestion) return;

      const currentPlayer = room.players[room.currentPlayerIdx];
      if (!currentPlayer || currentPlayer.id !== socket.id) return;

      const correct = answer.trim() === room.currentQuestion.a.trim();
      console.log('📝 Answer:', JSON.stringify(answer), '| Correct:', JSON.stringify(room.currentQuestion.a), '| Match:', correct);
      if (correct) {
        const diffPts = { easy: 3, medium: 6, hard: 12 };
        let points = diffPts[room.currentDifficulty] || 6;

        // Apply special effects
        if (room.specialEffect === 'doble') points *= 2;

        if (room.specialEffect === 'robo') {
          // ROBO: si aciertas, robas puntos al jugador que va primero
          const sorted = [...room.players].sort((a, b) => b.score - a.score);
          const leader = sorted.find(p => p.id !== socket.id);
          if (leader && leader.score > 0) {
            const stolen = Math.min(points, leader.score);
            room.scores[leader.id] = (room.scores[leader.id] || 0) - stolen;
            leader.score = room.scores[leader.id];
            room.scores[socket.id] = (room.scores[socket.id] || 0) + stolen;
            currentPlayer.score = room.scores[socket.id];
          } else {
            // No one to rob — just get the points
            room.scores[socket.id] = (room.scores[socket.id] || 0) + points;
            currentPlayer.score = room.scores[socket.id];
          }
        } else {
          room.scores[socket.id] = (room.scores[socket.id] || 0) + points;
          currentPlayer.score = room.scores[socket.id];
        }
      } else {
        // Failed answer effects
        if (room.specialEffect === 'bomba') {
          const diffPts = { easy: 3, medium: 6, hard: 12 };
          const penalty = diffPts[room.currentDifficulty] || 6;
          room.scores[socket.id] = Math.max(0, (room.scores[socket.id] || 0) - penalty);
          currentPlayer.score = room.scores[socket.id];
        }
      }

      room.lastAnswer = { playerId: socket.id, playerName: currentPlayer.name, answer, correct };
      room.allAnswers = [{ playerId: socket.id, playerName: currentPlayer.name, answer, correct }];
      room.state = 'answer';
      room.answers = {};

      broadcastRoom(code);
    } catch(e) {
      console.error('game:answer error:', e.message);
    }
  });

  // Next turn — any player can trigger
  socket.on('game:nextTurn', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;
    if (room.state !== 'answer') return;

    const numPlayers = room.players.length;
    room.turnInRound = (room.turnInRound || 0) + 1;

    // Check if all players have played this round
    if (room.turnInRound >= numPlayers) {
      // Round complete
      room.currentRound = (room.currentRound || 1) + 1;
      room.turnInRound  = 0;
      room.currentPlayerIdx = 0; // start again from first player

      // Check if all rounds done
      if (room.currentRound > (room.totalRounds || 6)) {
        room.state = 'finished';
        const sorted = [...room.players].sort((a, b) => b.score - a.score);
        sorted.forEach((player, idx) => {
          updateUserStats(player.name, player.score, idx === 0);
        });
        broadcastRoom(code);
        return;
      }
    } else {
      // Next player in this round
      room.currentPlayerIdx = (room.currentPlayerIdx + 1) % numPlayers;
    }

    // Also track total questions for display
    room.questionIdx = ((room.currentRound - 1) * numPlayers) + room.turnInRound;

    room.state = 'spinning';
    room.currentQuestion = null;
    room.currentCategory = null;
    room.lastAnswer = null;
    room.answers = {};
    room.allAnswers = [];
    room.specialEffect = null;
    broadcastRoom(code);
  });

  // End game
  socket.on('game:end', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.state = 'finished';
    broadcastRoom(code);
  });

  // ─── Admin API ────────────────────────────────────────────────────────────
  socket.on('admin:setCategories', ({ tenantId, categories, adminKey }) => {
    // In production validate adminKey
    if (!tenants[tenantId]) getTenantData(tenantId);
    tenants[tenantId].categories = categories;
    socket.emit('admin:ok', { msg: 'Categorías actualizadas' });
  });

  socket.on('admin:setQuestions', ({ tenantId, categoryId, questions }) => {
    if (!tenants[tenantId]) getTenantData(tenantId);
    tenants[tenantId].questions[categoryId] = questions;
    socket.emit('admin:ok', { msg: 'Preguntas actualizadas' });
  });

  socket.on('admin:getConfig', ({ tenantId }) => {
    socket.emit('admin:config', getTenantData(tenantId));
  });

  // ─── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) {
      delete rooms[code];
      return;
    }
    if (room.host === socket.id) room.host = room.players[0].id;
    if (room.currentPlayerIdx >= room.players.length) room.currentPlayerIdx = 0;
    broadcastRoom(code);
  });
});

const mysql = require('mysql2/promise');

// ─── MySQL connection pool ────────────────────────────────────────────────────
let db;

async function initDB() {
  const url = process.env.DATABASE_URL ||
              process.env.MYSQL_PUBLIC_URL ||
              process.env.MYSQL_URL;

  try {
    if (url) {
      db = await mysql.createPool({
        uri: url,
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 5,
      });
    } else {
      db = await mysql.createPool({
        host:     process.env.MYSQL_HOST || process.env.MYSQLHOST,
        port:     parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306),
        user:     process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'railway',
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 5,
      });
    }

    await db.execute('SELECT 1');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'player',
        wins INT DEFAULT 0,
        total_points INT DEFAULT 0,
        games_played INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      INSERT IGNORE INTO users (email, name, password, role)
      VALUES ('admin', 'Admin', 'admin1234', 'admin')
    `);

    console.log('✅ MySQL connected and tables ready');
  } catch(e) {
    console.error('❌ MySQL error:', e.message);
    db = null;
  }
}

// ─── REST: Auth endpoints ─────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.json({ ok: false, msg: 'Faltan campos' });
  if (!db) return res.json({ ok: false, msg: 'Base de datos no disponible' });
  try {
    await db.execute(
      'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
      [email, name, password, 'player']
    );
    console.log('✅ Registered:', email);
    res.json({ ok: true, name, role: 'player' });
  } catch(e) {
    if (e.code === 'ER_DUP_ENTRY') return res.json({ ok: false, msg: 'Este correo ya está registrado' });
    res.json({ ok: false, msg: 'Error al registrar' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ ok: false, msg: 'Faltan campos' });
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.json({ ok: false, msg: 'Usuario no encontrado' });
    const user = rows[0];
    if (user.password !== password) return res.json({ ok: false, msg: 'Contraseña incorrecta' });
    console.log('✅ Login:', email, user.role);
    res.json({ ok: true, name: user.name, role: user.role });
  } catch(e) {
    res.json({ ok: false, msg: 'Error al iniciar sesión' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT email, name, role FROM users WHERE role != 'admin'");
    res.json(rows);
  } catch(e) { res.json([]); }
});

app.get('/api/ranking', async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT name, wins, total_points as totalPoints, games_played as gamesPlayed FROM users WHERE role != 'admin' ORDER BY wins DESC, total_points DESC"
    );
    res.json(rows);
  } catch(e) { res.json([]); }
});

app.get('/api/wins/:name', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT wins FROM users WHERE name = ?', [req.params.name]);
    res.json({ wins: rows[0] ? rows[0].wins : 0 });
  } catch(e) { res.json({ wins: 0 }); }
});

// ─── Update stats after game ──────────────────────────────────────────────────
async function updateUserStats(playerName, points, isWinner) {
  if (!db) return;
  try {
    await db.execute(
      'UPDATE users SET total_points = total_points + ?, games_played = games_played + 1, wins = wins + ? WHERE name = ?',
      [points, isWinner ? 1 : 0, playerName]
    );
  } catch(e) { console.error('Stats update error:', e.message); }
}

app.get('/api/tenant/:id', (req, res) => {
  res.json(getTenantData(req.params.id));
});

app.post('/api/tenant/:id/categories', (req, res) => {
  const td = getTenantData(req.params.id);
  td.categories = req.body.categories;
  res.json({ ok: true });
});

app.post('/api/tenant/:id/questions', (req, res) => {
  const td = getTenantData(req.params.id);
  td.questions = { ...td.questions, ...req.body.questions };
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Trivial server running on http://localhost:${PORT}`));