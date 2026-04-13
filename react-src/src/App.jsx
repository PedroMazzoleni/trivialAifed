import { Routes, Route, Navigate } from 'react-router-dom'
import IntroPage  from './pages/IntroPage'
import ModosPage  from './pages/ModosPage'
import LobbyPage  from './pages/LobbyPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<IntroPage />} />
      <Route path="/login"  element={<Navigate to="/trivial-login.html" replace />} />
      <Route path="/modos"  element={<ModosPage />} />
      <Route path="/lobby"  element={<LobbyPage />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  )
}
