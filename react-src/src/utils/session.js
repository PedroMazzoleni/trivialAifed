export const Session = {
  get:         (key)        => sessionStorage.getItem(key),
  set:         (key, value) => sessionStorage.setItem(key, value),
  remove:      (key)        => sessionStorage.removeItem(key),
  clear:       ()           => sessionStorage.clear(),
  playerName:  ()           => sessionStorage.getItem('player_name') || '',
  playerRole:  ()           => sessionStorage.getItem('player_role') || 'guest',
  isAdmin:     ()           => sessionStorage.getItem('player_role') === 'admin',
  isGuest:     ()           => sessionStorage.getItem('player_role') === 'guest',
  isLoggedIn:  ()           => !!sessionStorage.getItem('player_name'),
}
