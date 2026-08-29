import "./App.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  AlertCircle,
  Layers,
  TrendingUp,
  Monitor,
  Smartphone,
  RefreshCw,
  Check,
} from "lucide-react";
import { applyTheme, getSavedTheme } from "./utils/theme";
import { useAuth } from "./context/AuthContext";

// Logo imports — copy these files into src/assets/
import oamsLogo from "./assets/oams_logo.png";
import pncLogo from "./assets/Pnc-Logo.png";
import ccsLogo from "./assets/CCS.png";
import cbaaLogo from "./assets/CBAA.png";
import coedLogo from "./assets/COED.png";
import coeLog from "./assets/COE.png";
import casLogo from "./assets/CAS.png";
import chasLogo from "./assets/CHAS.png";

// Icon imports — copy these files into src/assets/
import personsIcon from "./assets/persons_icon.png";
import nextIcon from "./assets/next_icon.png";
import queueIcon from "./assets/queue_management.png";
import appointmentIcon from "./assets/appointment_management.png";
import documentIcon from "./assets/document_processing.png";
import transactionIcon from "./assets/transaction_tracking.png";

const colleges = [
  { logo: ccsLogo, name: "College of Computing Studies" },
  {
    logo: cbaaLogo,
    name: "College of Business, Accountancy and Administration",
  },
  { logo: coedLogo, name: "College of Education" },
  { logo: coeLog, name: "College of Engineering" },
  { logo: casLogo, name: "College of Arts and Sciences" },
  { logo: chasLogo, name: "College of Health and Allied Sciences" },
];

const features = [
  {
    icon: queueIcon,
    title: "Queue Management",
    desc: "Join virtual queues and track your position in real-time",
  },
  {
    icon: appointmentIcon,
    title: "Appointment Scheduling",
    desc: "Book and manage appointments with faculty and staff",
  },
  {
    icon: documentIcon,
    title: "Document Processing",
    desc: "Request and track official documents online",
  },
  {
    icon: transactionIcon,
    title: "Transaction Tracking",
    desc: "Monitor all your activities and service requests",
  },
];

// "Why OAMS" — problem / solution / impact, explaining what the system
// replaces and why it matters for the University of Cabuyao's college offices.
const whyOams = [
  {
    icon: AlertCircle,
    title: "The Problem",
    desc: "College offices across campus have long relied on manual, paper-based, walk-in processes — long lines, lost forms, and no way to check a request's status without going back in person.",
  },
  {
    icon: Layers,
    title: "The Solution",
    desc: "OAMS brings queuing, appointment scheduling, document processing, and announcements into one digital platform shared by every college office.",
  },
  {
    icon: TrendingUp,
    title: "The Impact",
    desc: "Shorter wait times, real-time visibility into every request, and less paperwork for students, professors, and staff alike.",
  },
];

// Cross-platform: OAMS ships as both a web dashboard and a companion mobile
// app (React Native/Expo), sharing the same account and data in real time.
const platforms = [
  {
    icon: Monitor,
    title: "Web Dashboard",
    desc: "Full queue, appointment, and document tools built for college office staff and administrators, on any modern browser.",
    points: [
      "Manage queues & appointments",
      "Generate reports & analytics",
      "Built for larger screens",
    ],
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    desc: "Everything students and professors need for queuing, appointments, and documents — right in your pocket.",
    points: [
      "Join queues & get notified",
      "Scan QR codes for documents",
      "Real-time push notifications",
    ],
  },
];

// `loginAudience` scopes every "Sign In" button on this page to a single
// role's login page: /landingpage/student and /landingpage/faculty pass
// "student"/"faculty" so one click from either lands the visitor on
// /login/student or /login/faculty (which in turn only ever shows that
// role's own registration link). The bare / (no prop) keeps going to the
// general /login, unchanged.
function App({ loginAudience }) {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(
    () => getSavedTheme() === "dark",
  );
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    applyTheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode ? "dark" : "light");
  };

  const goToLogin = () =>
    navigate(loginAudience ? `/login/${loginAudience}` : "/login");
  const goToDashboard = () => {
    const roleRoutes = {
      student: "/student/dashboard",
      faculty: "/professor/dashboard",
      admin: "/admin/dashboard",
      superadmin: "/superadmin/dashboard",
    };
    navigate(roleRoutes[user?.role] ?? "/login");
  };

  return (
    <div className="oams-root">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <img src={pncLogo} alt="PNC Logo" className="nav-pnc-img" />
          <img src={oamsLogo} alt="OAMS Logo" className="nav-logo-img" />
        </div>
        <div className="navbar-actions">
          <button
            className="icon-btn"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {isDarkMode ? (
              <Sun className="icon-btn-img" />
            ) : (
              <Moon className="icon-btn-img" />
            )}
          </button>
          <button
            className="btn-signin"
            onClick={isAuthenticated ? goToDashboard : goToLogin}
          >
            {isAuthenticated ? (
              <>
                Dashboard <img src={nextIcon} alt="" className="btn-icon-img" />
              </>
            ) : (
              <>
                Sign In <img src={nextIcon} alt="" className="btn-icon-img" />
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="hero-logo-wrap">
          <div className="hero-logos-left">
            <img src={pncLogo} alt="PNC Logo" className="hero-pnc-logo-img" />
            <img src={oamsLogo} alt="OAMS" className="hero-logo-img" />
          </div>
        </div>
        <h1 className="hero-title">
          Office Automation
          <br />
          Management System for the College Offices
          <br />
          of University of Cabuyao
        </h1>
        <p className="hero-subtitle">
          A centralized college offices platform for students, professors, and administrators to
          streamline university services and enhance productivity.
        </p>
        <button
          className="btn-hero"
          onClick={isAuthenticated ? goToDashboard : goToLogin}
        >
          <span className="btn-hero-text">
            {isAuthenticated ? "Go to Dashboard" : "Sign In to Get Started"}
          </span>
          <img src={nextIcon} alt="" className="btn-icon-img" />
        </button>
      </section>

      {/* ── Why OAMS ── */}
      <section className="about-section">
        <h2 className="section-title">Why OAMS?</h2>
        <p className="about-intro">
          Across CBAA, COED, COE, CCS, CAS, and CHAS, everyday college office
          work has long meant standing in line. OAMS is a digitalization
          project for the University of Cabuyao (Pamantasan ng Cabuyao) that
          brings that work online, for every college office and every role.
        </p>
        <div className="features-grid about-grid">
          {whyOams.map((item) => (
            <div className="feature-card" key={item.title}>
              <div className="feature-icon">
                <item.icon className="feature-icon-svg" />
              </div>
              <h3 className="feature-title">{item.title}</h3>
              <p className="feature-desc">{item.desc}</p>
            </div>
          ))}
        </div>
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

      {/* ── Cross-Platform ── */}
      <section className="platforms-section">
        <h2 className="section-title">One Account, Every Device</h2>
        <p className="platforms-description">
          OAMS runs as a full web dashboard and a dedicated mobile app, so
          students, professors, and staff can pick up right where they left
          off — no matter what they&rsquo;re using.
        </p>
        <div className="platforms-grid">
          {platforms.map((p) => (
            <div className="feature-card platform-card" key={p.title}>
              <div className="feature-icon platform-icon">
                <p.icon className="platform-icon-svg" />
              </div>
              <h3 className="feature-title">{p.title}</h3>
              <p className="feature-desc">{p.desc}</p>
              <ul className="platform-list">
                {p.points.map((point) => (
                  <li key={point}>
                    <Check className="platform-check" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="platforms-footnote">
          <RefreshCw className="platforms-footnote-icon" />
          Same account, same data — always in sync across web and mobile.
        </p>
      </section>

      {/* ── Serving All Colleges ── */}
      <section className="colleges-section">
        <h2 className="section-title">Serving All Colleges</h2>
        <p className="colleges-description">
          Our system serves all six colleges of the University of Cabuyao (Pamantasan ng Cabuyao), providing seamless automation and management solutions.
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
        <button
          className="btn-cta"
          onClick={isAuthenticated ? goToDashboard : goToLogin}
        >
          {isAuthenticated ? (
            "Go to Dashboard"
          ) : (
            <>
              Sign In Now <img src={nextIcon} alt="" className="btn-icon-img" />
            </>
          )}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-brand">
          <div className="footer-logos-left">
            <img src={pncLogo} alt="PNC Logo" className="footer-pnc-logo-img" />
            <img src={oamsLogo} alt="OAMS" className="footer-logo-img" />
          </div>
        </div>

        <div className="footer-right">
          <p className="footer-tagline">
            <strong>Dangal ng Bayan,</strong> bringing pride and honor to the nation!
          </p>
          <span className="footer-copy">
            © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;