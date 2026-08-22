import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { applyTheme, getSavedTheme } from "../utils/theme";
import LoadingOverlay from "../components/LoadingOverlay";

import "./Login.css";

import pncLogo from "../assets/Pnc-Logo.png";
import oamsLogo from "../assets/oams_logo.png";
import darkModeIcon from "../assets/darkmode_icon.png";
import sunIcon from "../assets/sun_icon.png";

// `registerAudience` scopes the "Don't have an account yet?" hint to a
// single role: pages reached at /login/student or /login/faculty pass
// "student"/"faculty" so each audience only ever sees its own registration
// link, never both together. The bare /login (no prop) shows no
// registration hint at all -- it's the general entry point, not a link
// meant to be handed out for self-registration.
export default function Login({ registerAudience }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(getSavedTheme() === "dark");
  const [redirecting, setRedirecting] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    applyTheme(getSavedTheme());
    setIsDarkMode(getSavedTheme() === "dark");
  }, []);

  // Set by the api.js response interceptor when a request comes back with a
  // dead session (missing/expired JWT), right before it redirects here.
  useEffect(() => {
    if (sessionStorage.getItem("oams_session_expired")) {
      sessionStorage.removeItem("oams_session_expired");
      toast.error("Your session has expired. Please log in again.");
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode ? "dark" : "light");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email && !password) {
      toast.error("Please fill in your Email or School ID and password.");
      return;
    }
    if (!email) {
      toast.error("Please enter your Email or School ID.");
      return;
    }
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    try {
      await login(email, password);

      const storedUser = sessionStorage.getItem("oams_user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        toast.success(`Welcome back, ${userData.name}!`);
        setRedirecting(true);
        setTimeout(() => {
          const roleRoutes = {
            student: "/student/dashboard",
            faculty: "/professor/dashboard",
            admin: "/admin/dashboard",
            superadmin: "/superadmin/dashboard",
          };
          navigate(roleRoutes[userData.role] ?? "/dashboard");
        }, 500);
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;

      if (status === 401) {
        toast.error(message ?? "Invalid credentials. Please check your ID or email and password.");
      } else if (status === 423) {
        toast.error(message ?? "Too many failed login attempts. Please try again later.");
      } else if (status === 403) {
        toast.error(message ?? "Your account is not active. Please contact the administrator.");
      } else if (status === 400) {
        toast.error(message ?? "Please fill in all fields.");
      } else if (status) {
        toast.error("Something went wrong. Please try again later.");
      } else {
        toast.error("Unable to reach the server. Please check your connection.");
      }
    }
  };

  return (
    <div className="login-root">
      {/* ── Dark-mode toggle (top-right) ── */}
      <button
        className="login-theme-btn"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        <img
          src={isDarkMode ? sunIcon : darkModeIcon}
          alt={isDarkMode ? "Light Mode" : "Dark Mode"}
          className="login-theme-icon"
        />
      </button>

      <div className="login-wrapper">
        {/* ── Left: Branding ── */}
        <div className="login-branding">
          <div className="login-logos">
            <img
              src={pncLogo}
              alt="University of Cabuyao"
              className="login-pnc-logo"
            />
            <img src={oamsLogo} alt="OAMS" className="login-coams-logo" />
          </div>
          <p className="login-university-name">
            University of Cabuyao<br />
            (Pamantasan ng Cabuyao)
          </p>
        </div>

        {/* ── Vertical divider ── */}
        <div className="login-divider" aria-hidden="true" />

        {/* ── Right: Card ── */}
        <div className="login-card">
          {/* Card header */}
          <div className="login-card-header">
            <h2 className="login-card-title">
              Welcome Back
              <Sparkles className="login-sparkle-icon" size={20} />
            </h2>
            <p className="login-card-desc">
              Sign in with your @pnc.edu.ph email or School ID
            </p>
            <p className="login-card-hint">
              Your account type will be automatically detected
            </p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email or School ID
              </label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" size={16} />
                <input
                  id="email"
                  type="text"
                  placeholder="Email or School ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Password
              </label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" size={16} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input login-input--password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="login-btn-loading">
                  <span className="login-spinner" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {registerAudience && (
            <p className="login-register-hint">
              Don't have an account yet?{" "}
              <Link to={`/register/${registerAudience}`}>
                Register as {registerAudience === "student" ? "Student" : "Faculty"}
              </Link>
            </p>
          )}
        </div>
        {/* /login-card */}
      </div>
      {/* /login-wrapper */}

      <p className="login-footer-copy">
        © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
      </p>

      {redirecting && <LoadingOverlay label="Signing you in..." />}
    </div>
  );
}