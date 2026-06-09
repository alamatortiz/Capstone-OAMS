import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { applyTheme, getSavedTheme } from "../utils/theme";

// @ts-ignore
import "./Login.css";

// @ts-ignore
import pncLogo from "../assets/Pnc-Logo.png";
// @ts-ignore
import oamsLogo from "../assets/oams_logo.png";
// @ts-ignore
import darkModeIcon from "../assets/darkmode_icon.png"; // Crescent moon icon
// @ts-ignore
import sunIcon from "../assets/sun_icon.png"; // Sun icon (optional, use if available)

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(getSavedTheme() === "dark");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Apply saved theme on mount
  useEffect(() => {
    applyTheme(getSavedTheme());
    setIsDarkMode(getSavedTheme() === "dark");
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode ? "dark" : "light");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    // No client-side email format restriction, as backend supports school ID or email
    // if (!email.endsWith("@pnc.edu.ph")) {
    //   toast.error("Please use your @pnc.edu.ph email address");
    //   return;
    // }

    try {
      await login(email, password);

      const storedUser = localStorage.getItem("oams_user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        toast.success(`Welcome back, ${userData.name}!`);
        setTimeout(() => {
          const roleRoutes: Record<string, string> = {
            student: "/student/dashboard",
            faculty: "/professor/dashboard",
            admin: "/admin/dashboard",
          };
          navigate(roleRoutes[userData.role] ?? "/dashboard");
        }, 500);
      }
    } catch {
      toast.error("Login failed. Please check your credentials.");
    } finally {
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
        {/* ── Logos ── */}
        <div className="login-logos">
          <img
            src={pncLogo}
            alt="University of Cabuyao"
            className="login-pnc-logo"
          />
          <img src={oamsLogo} alt="OAMS" className="login-oams-logo" />
        </div>
        <p className="login-university-name">
          University of Cabuyao (Pamantasan ng Cabuyao)
        </p>

        {/* ── Card ── */}
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
                Email
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
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                />
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

          {/* Demo accounts info */}
          <div className="login-demo-box">
            <p className="login-demo-title">Demo Accounts:</p>
            <ul className="login-demo-list">
              <li>
                <strong>Student:</strong> student@pnc.edu.ph
              </li>
              <li>
                <strong>Professor:</strong> professor@pnc.edu.ph
              </li>
              <li>
                <strong>Admin:</strong> admin@pnc.edu.ph
              </li>
            </ul>
            <p className="login-demo-password">Password: any</p>
          </div>
        </div>
        {/* /login-card */}

        <p className="login-footer-copy">
          © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights
          reserved.
        </p>
      </div>
      {/* /login-wrapper */}
    </div>
  );
}
