import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  Lock,
  IdCard,
  BookMarked,
  Building2,
  Sparkles,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { applyTheme, getSavedTheme } from "../utils/theme";
import LoadingOverlay from "../components/LoadingOverlay";
import api from "../utils/api";
import { COLLEGES } from "../data/colleges";

import "./Login.css";

import pncLogo from "../assets/Pnc-Logo.png";
import oamsLogo from "../assets/oams_logo.png";
import darkModeIcon from "../assets/darkmode_icon.png";
import sunIcon from "../assets/sun_icon.png";

export default function RegisterFaculty() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [collegeAbbrev, setCollegeAbbrev] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(getSavedTheme() === "dark");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    applyTheme(getSavedTheme());
    setIsDarkMode(getSavedTheme() === "dark");
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode ? "dark" : "light");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !employeeId ||
      !collegeAbbrev ||
      !password ||
      !confirmPassword
    ) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register/faculty", {
        firstName,
        lastName,
        email,
        employeeId,
        specialization: specialization || undefined,
        collegeAbbrev,
        password,
      });

      toast.success("Account created! Signing you in...");
      await login(email, password);
      navigate("/professor/dashboard");
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;

      if (status === 409) {
        toast.error(message ?? "An account with these details already exists.");
      } else if (status === 400) {
        toast.error(message ?? "Please check your details and try again.");
      } else if (status) {
        toast.error("Something went wrong. Please try again later.");
      } else {
        toast.error("Unable to reach the server. Please check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-root">
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

      <div className="login-wrapper login-wrapper--register">
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

        <div className="login-divider" aria-hidden="true" />

        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">
              Faculty Registration
              <Sparkles className="login-sparkle-icon" size={20} />
            </h2>
            <p className="login-card-desc">
              Create your faculty account to get started
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field-row">
              <div className="login-field">
                <label htmlFor="firstName" className="login-label">
                  First Name
                </label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={16} />
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Maria"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="login-input"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="lastName" className="login-label">
                  Last Name
                </label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={16} />
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Santos"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="login-input"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email
              </label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" size={16} />
                <input
                  id="email"
                  type="email"
                  placeholder="maria.santos@pnc.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field-row">
              <div className="login-field">
                <label htmlFor="employeeId" className="login-label">
                  Employee ID
                </label>
                <div className="login-input-wrap">
                  <IdCard className="login-input-icon" size={16} />
                  <input
                    id="employeeId"
                    type="text"
                    placeholder="CCS-123456"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="college" className="login-label">
                  College
                </label>
                <div className="login-input-wrap">
                  <Building2 className="login-input-icon" size={16} />
                  <select
                    id="college"
                    value={collegeAbbrev}
                    onChange={(e) => setCollegeAbbrev(e.target.value)}
                    className="login-input login-select"
                  >
                    <option value="">Select...</option>
                    {COLLEGES.map((c) => (
                      <option key={c.abbreviation} value={c.abbreviation}>
                        {c.abbreviation}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="specialization" className="login-label">
                Specialization <span className="login-optional">(optional)</span>
              </label>
              <div className="login-input-wrap">
                <BookMarked className="login-input-icon" size={16} />
                <input
                  id="specialization"
                  type="text"
                  placeholder="e.g., Database Management"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="login-input"
                />
              </div>
            </div>

            <div className="login-field-row">
              <div className="login-field">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={16} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8+ chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input login-input--password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={submitting}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="confirmPassword" className="login-label">
                  Confirm Password
                </label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={16} />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="login-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <span className="login-btn-loading">
                  <span className="login-spinner" />
                  Creating account...
                </span>
              ) : (
                "Create Faculty Account"
              )}
            </button>
          </form>

          <Link to="/login/faculty" className="login-back-link">
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>

      <p className="login-footer-copy">
        © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
      </p>

      {submitting && <LoadingOverlay label="Creating your account..." />}
    </div>
  );
}
