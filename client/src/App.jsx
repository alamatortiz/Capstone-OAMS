import './App.css'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { applyTheme, getSavedTheme } from './utils/theme'


// Logo imports — copy these files into src/assets/
import oamsLogo from './assets/oams_logo.png'
import pncLogo  from './assets/Pnc-Logo.png'
import ccsLogo  from './assets/CCS.png'
import cbaaLogo from './assets/CBAA.png'
import coedLogo from './assets/COED.png'
import coeLog   from './assets/COE.png'
import casLogo  from './assets/CAS.png'
import chasLogo from './assets/CHAS.png'

// Icon imports — copy these files into src/assets/
import darkModeIcon    from './assets/darkmode_icon.png'
import sunIcon         from './assets/sun_icon.png'
import personsIcon     from './assets/persons_icon.png'
import nextIcon        from './assets/next_icon.png'
import queueIcon       from './assets/Queue_Management.png'
import appointmentIcon from './assets/Appointment_Management.png'
import documentIcon    from './assets/Document_Processing.png'
import transactionIcon from './assets/Transaction_Tracking.png'

const colleges = [
  { logo: ccsLogo,  name: 'College of Computing Studies' },
  { logo: cbaaLogo, name: 'College of Business, Accountancy and Administration' },
  { logo: coedLogo, name: 'College of Education' },
  { logo: coeLog,   name: 'College of Engineering' },
  { logo: casLogo,  name: 'College of Arts and Sciences' },
  { logo: chasLogo, name: 'College of Health and Allied Sciences' },
]

const features = [
  { icon: queueIcon,       title: 'Queue Management',       desc: 'Join virtual queues and track your position in real-time' },
  { icon: appointmentIcon, title: 'Appointment Scheduling', desc: 'Book and manage appointments with faculty and staff' },
  { icon: documentIcon,    title: 'Document Processing',    desc: 'Request and track official documents online' },
  { icon: transactionIcon, title: 'Transaction Tracking',   desc: 'Monitor all your activities and service requests' },
]

function App() {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(() => getSavedTheme() === 'dark')

  // Apply the saved theme on first render, and keep DOM in sync
  useEffect(() => {
    applyTheme(isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    applyTheme(newDarkMode ? 'dark' : 'light')
  }


  const goToLogin = () => navigate('/login')

  return (
    <div className="oams-root">

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <img src={pncLogo}  alt="PNC Logo"  className="nav-pnc-img" />
          <img src={oamsLogo} alt="OAMS Logo" className="nav-logo-img" />
        </div>
        <div className="navbar-actions">
          <button 
            className="icon-btn" 
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            <img 
              src={isDarkMode ? sunIcon : darkModeIcon} 
              alt={isDarkMode ? "Light Mode" : "Dark Mode"} 
              className="icon-btn-img" 
            />
          </button>
          {/* Sign In #1 — Navbar */}
          <button className="btn-signin" onClick={goToLogin}>
            Sign In <img src={nextIcon} alt="" className="btn-icon-img" />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="hero-logo-wrap">
          <div className="hero-logos-left">
            <img src={pncLogo}  alt="PNC Logo" className="hero-pnc-logo-img" />
            <img src={oamsLogo} alt="OAMS"     className="hero-logo-img" />
          </div>
        </div>
        <h1 className="hero-title">
          Office Automation<br />Management System
        </h1>
        <p className="hero-subtitle">
          A centralized platform for students, professors, and administrators
          to streamline university services and enhance productivity.
        </p>
        {/* Sign In #2 — Hero CTA */}
        <button className="btn-hero" onClick={goToLogin}>
          <span className="btn-hero-text">Sign In to Get Started</span>
          <img src={nextIcon} alt="" className="btn-icon-img" />
        </button>
      </section>

      {/* ── Key Features ── */}
      <section className="features-section">
        <h2 className="section-title">Key Features</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">
                <img src={f.icon} alt={f.title} className="feature-icon-img" />
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Serving All Colleges ── */}
      <section className="colleges-section">
        <h2 className="section-title">Serving All Colleges</h2>
        <p className="section-subtitle">
          Our system serves all six colleges of the University of Cabuyao
          (Pamantasan ng Cabuyao), providing seamless automation and management solutions.
        </p>
        <div className="colleges-grid">
          {colleges.map((c) => (
            <div className="college-card" key={c.name}>
              <img src={c.logo} alt={c.name} className="college-logo" />
              <span className="college-name">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-section">
        <div className="cta-icon">
          <img src={personsIcon} alt="Users" className="cta-icon-img" />
        </div>
        <h2 className="cta-title">Ready to Get Started?</h2>
        <p className="cta-subtitle">
          Join thousands of students, professors, and staff using OAMS to
          streamline their university experience.
        </p>
        {/* Sign In #3 — CTA Banner */}
        <button className="btn-cta" onClick={goToLogin}>
          Sign In Now <img src={nextIcon} alt="" className="btn-icon-img" />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-brand">
          <div className="footer-logos-left">
            <img src={pncLogo}  alt="PNC Logo" className="footer-pnc-logo-img" />
            <img src={oamsLogo} alt="OAMS"     className="footer-logo-img" />
          </div>
        </div>
        <span className="footer-copy">
          © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
        </span>
      </footer>

    </div>
  )
}

export default App