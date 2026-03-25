// ─── store.js ────────────────────────────────────────────────────────────────
// Estado compartido en memoria: salas, tenants y preguntas por defecto.
// Todos los módulos importan desde aquí para trabajar con el mismo objeto.

const defaultCategories = [
    { id: 'sports',  name: 'Sports',    color: '#18c25a', emoji: '⚽' },
    { id: 'geo',     name: 'Geography', color: '#3B9EFF', emoji: '🌍' },
    { id: 'culture', name: 'Culture',   color: '#f5a623', emoji: '🎭' },
    { id: 'history', name: 'History',   color: '#e84545', emoji: '📜' },
    { id: 'eu',      name: 'Europa',    color: '#a259ff', emoji: '🇪🇺' },
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
      {q:"What is the capital city of Kenya?",a:"Nairobi",opts:["Nairobi","Mombasa","Kisumu"],diff:"fácil"},
      {q:"What are the two official languages of Kenya?",a:"Swahili and English",opts:["Swahili and English","French and Swahili","Arabic and English"],diff:"fácil"},
      {q:"Which ocean borders Kenya to the east?",a:"Indian Ocean",opts:["Indian Ocean","Atlantic Ocean","Red Sea"],diff:"fácil"},
      {q:"What is the currency of Kenya?",a:"Kenyan Shilling",opts:["Kenyan Shilling","Kenyan Pound","East African Franc"],diff:"fácil"},
      {q:"What is the name of the famous wildlife reserve in Kenya known for hosting the Great Migration?",a:"Maasai Mara",opts:["Maasai Mara","Amboseli","Tsavo"],diff:"fácil"},
      {q:"What is Kenya's second largest city and main coastal port?",a:"Mombasa",opts:["Mombasa","Kisumu","Nakuru"],diff:"fácil"},
      {q:"Which continent is Kenya located in?",a:"Africa",opts:["Africa","South America","Asia"],diff:"fácil"},
      {q:"Kenya gained independence in 1963 from which country?",a:"United Kingdom",opts:["United Kingdom","France","Portugal"],diff:"medio"},
      {q:"Which Kenyan athlete, known as the greatest marathoner, won the Olympic Marathon in 2016 and 2020?",a:"Eliud Kipchoge",opts:["Eliud Kipchoge","Geoffrey Kipkoech","Wilson Kipsang"],diff:"medio"},
      {q:"What is the name of Kenya's largest lake, shared with Uganda and Tanzania?",a:"Lake Victoria",opts:["Lake Victoria","Lake Turkana","Lake Naivasha"],diff:"medio"},
      {q:"The Maasai Mara is connected to which famous Tanzanian wildlife park, forming a single great ecosystem?",a:"Serengeti",opts:["Serengeti","Ngorongoro","Kilimanjaro"],diff:"medio"},
      {q:"What is the name of the tallest mountain in Kenya?",a:"Mount Kenya",opts:["Mount Kenya","Mount Elgon","Mount Kilimanjaro"],diff:"medio"},
      {q:"Who was Kenya's first President after independence?",a:"Jomo Kenyatta",opts:["Jomo Kenyatta","Daniel arap Moi","Tom Mboya"],diff:"difícil"},
      {q:"In which year did Kenya become a republic?",a:"1964",opts:["1963","1964","1967"],diff:"difícil"},
      {q:"Which Kenyan tea-growing region produces some of the finest tea in Africa?",a:"Kericho",opts:["Kericho","Nyeri","Kisii"],diff:"difícil"},
      {q:"What is the name of the ancient coastal town in Kenya that is a UNESCO World Heritage Site?",a:"Lamu",opts:["Lamu","Malindi","Kilifi"],diff:"difícil"},
      {q:"Which large lake in northern Kenya is the world's largest desert lake and largest alkaline lake?",a:"Lake Turkana",opts:["Lake Turkana","Lake Baringo","Lake Bogoria"],diff:"difícil"},
    ],
  };

  // ─── Estado compartido ────────────────────────────────────────────────────────
  const tenants = {};   // tenantId → { categories, questions, config }
  const rooms   = {};   // roomCode → gameState
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function getRandomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  function getTenantData(tenantId) {
    if (!tenants[tenantId]) {
      tenants[tenantId] = {
        categories: defaultCategories,
        questions:  defaultQuestions,
        config:     { name: tenantId, primaryColor: '#1a1a2e' },
      };
    }
    return tenants[tenantId];
  }
  
  function getUniqueQuestion(room, categoryId, diffLabel) {
    const td        = getTenantData(room.tenantId);
    const allForCat = td.questions[categoryId] || [];
    const pool      = diffLabel ? allForCat.filter(q => q.diff === diffLabel) : allForCat;
    if (!pool.length) return allForCat[Math.floor(Math.random() * allForCat.length)] || null;
  
    if (!room.usedQuestions)              room.usedQuestions = {};
    if (!room.usedQuestions[categoryId])  room.usedQuestions[categoryId] = [];
  
    const used      = room.usedQuestions[categoryId];
    let available   = pool.filter(q => !used.includes(allForCat.indexOf(q)));
    if (!available.length) { room.usedQuestions[categoryId] = []; available = pool; }
  
    const picked    = available[Math.floor(Math.random() * available.length)];
    const globalIdx = allForCat.indexOf(picked);
    room.usedQuestions[categoryId].push(globalIdx);
    return picked;
  }
  
  function createRoom(tenantId) {
    const code = getRandomCode();
    const td   = getTenantData(tenantId);
    rooms[code] = {
      code,
      tenantId,
      host:             null,
      players:          [],
      categories:       td.categories,
      state:            'lobby',
      currentPlayerIdx: 0,
      currentQuestion:  null,
      currentCategory:  null,
      scores:           {},
    };
    return code;
  }
  
  module.exports = {
    tenants, rooms, defaultCategories,
    getTenantData, getUniqueQuestion, createRoom,
  };
