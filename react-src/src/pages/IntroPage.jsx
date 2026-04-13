import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './IntroPage.css'

export default function IntroPage() {
  const [out, setOut]     = useState(false)
  const navigate          = useNavigate()

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 3000)
    const t2 = setTimeout(() => { window.location.href = '/trivial-login.html' }, 3500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [navigate])

  return (
    <div className={`splash${out ? ' out' : ''}`}>
      <div className="glow" />
      <div className="logo-wrap">
        <img src="/images/logo.png" alt="Trivial Travel" />
      </div>
    </div>
  )
}
