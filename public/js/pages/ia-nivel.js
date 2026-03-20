// pages/ia-nivel.js
// Requiere: utils.js

let selectedLevel = null;

function selectLevel(level) {
  selectedLevel = level;
  ['facil','medio','dificil'].forEach(l => {
    el('level-' + l).classList.toggle('selected', l === level);
  });
  el('btn-start').classList.add('ready');
}

function startGame() {
  if (!selectedLevel) return;
  goTo(`trivial-ia-juego.html?nivel=${selectedLevel}`);
}