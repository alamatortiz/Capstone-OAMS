import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Sun, Moon } from "lucide-react";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import pncLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./legal.css";

// Public, unauthenticated page -- reachable from the Login footer and (once
// registration collects consent) the registration forms. Not wrapped in
// ProtectedRoute; deliberately not linked from robots.txt-indexable content
// either way, since the whole app is meant to stay out of search results.
//
// Content below is grounded in what OAMS actually stores (see
// server/oams_db.sql -- users/students/faculty/administrators,
// user_sessions, login_logs, push_tokens/web_push_subscriptions, and the
// per-feature tables for queues/appointments/documents/announcements), not
// a generic boilerplate policy. Written for RA 10173 (the Philippine Data
// Privacy Act of 2012), since this is a Philippine university's internal
// system, not a GDPR/CCPA-facing consumer product.
export default function PrivacyPolicy() {
  const [isDarkMode, setIsDarkMode] = useState(getSavedTheme() === "dark");

  useEffect(() => {
    applyTheme(getSavedTheme());
    setIsDarkMode(getSavedTheme() === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    applyTheme(next ? "dark" : "light");
  };

  return (
    <div className="legal-root">
      <button
        className="legal-theme-btn"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {isDarkMode ? <Sun className="legal-theme-icon" /> : <Moon className="legal-theme-icon" />}
      </button>

      <main className="legal-page">
        <Link to="/login" className="legal-back-link">
          <ChevronLeft size={18} /> Back to Login
        </Link>

        <div className="legal-header">
          <div className="legal-logos">
            <img src={pncLogo} alt="Pamantasan ng Cabuyao" className="legal-logo legal-logo--pnc" />
            <img src={oamsLogo} alt="OAMS" className="legal-logo legal-logo--oams" />
          </div>
          <div>
            <h1 className="legal-title">Privacy Policy</h1>
            <p className="legal-updated">Effective and last updated: September 26, 2026</p>
          </div>
        </div>

        <div className="legal-body">
          <p>
            The Office Automation Management System (OAMS) is an internal system of the
            University of Cabuyao (Pamantasan ng Cabuyao), built to manage queueing,
            appointments, document requests, and announcements across college department
            offices. Accounts on OAMS are issued to enrolled students, faculty, and office
            staff of the University — this is not a public service you sign up for on your
            own, and this policy explains what the system collects from you as a member of
            the University community and what it's used for.
          </p>
          <p>
            This policy is written to comply with the Data Privacy Act of 2012 (Republic
            Act No. 10173) of the Philippines and its Implementing Rules and Regulations.
          </p>

          <h2>1. Information We Collect</h2>
          <p>OAMS stores the following categories of personal data, tied to your account:</p>
          <ul>
            <li>
              <strong>Identity information:</strong> full name, and your student number
              (students) or employee ID (faculty and office staff).
            </li>
            <li>
              <strong>Contact information:</strong> your university email address.
            </li>
            <li>
              <strong>Academic/employment information:</strong> your program/course and
              year level (students), or department, position, and specialization (faculty
              and staff).
            </li>
            <li>
              <strong>Account credentials:</strong> your password, which is protected so
              that no one — including system administrators — can view it.
            </li>
            <li>
              <strong>Sign-in activity:</strong> basic records of when and how your account
              is accessed, kept for account-security purposes.
            </li>
            <li>
              <strong>Notification settings:</strong> if you enable notifications, the
              information needed to deliver them to your device, used solely for that
              purpose.
            </li>
            <li>
              <strong>Information kept on your device:</strong> the web and mobile
              applications may keep limited information on your device, such as your
              sign-in and recently viewed records, so the system works smoothly. Please
              sign out when you are done using a shared device.
            </li>
            <li>
              <strong>Activity you generate while using the system:</strong> queue entries,
              appointment bookings and their stated purpose, comments exchanged between a
              student and a professor on an appointment, document/document-submission
              requests (including any file you attach), and the notifications and
              announcements associated with your account.
            </li>
            <li>
              <strong>Administrative action logs:</strong> when an administrator processes
              a request on your behalf (e.g., approves a document or manages a queue), that
              action is logged for accountability, tied to the record involved.
            </li>
          </ul>
          <p>
            OAMS does not collect payment information, government IDs beyond your existing
            university-issued student/employee number, and it does not use advertising or
            analytics trackers.
          </p>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To authenticate you and maintain your account session securely.</li>
            <li>
              To operate the features you use — joining a queue, booking or managing an
              appointment, submitting or processing a document request, and sending you
              the notifications those actions generate.
            </li>
            <li>
              To let the right people see the right information: your college office's
              staff, and the specific faculty member or student on the other side of an
              appointment or document request, based on your role and department.
            </li>
            <li>
              To protect accounts and to detect and respond to unusual or unauthorized
              activity.
            </li>
            <li>
              To maintain an accountability trail of administrative actions taken on
              requests.
            </li>
          </ul>

          <h2>3. Who Can See Your Information</h2>
          <p>
            OAMS uses role-based access: a student cannot see another student's records; a
            faculty member sees only appointments and document requests directed to them;
            and college office staff (administrators) can see activity within their own
            department only. A university-wide administrator role exists solely for
            system-level account management and does not routinely view the content of
            individual requests. OAMS does not sell, rent, or share your personal data with
            any outside company or third party. Your data is managed by the University.
            If OAMS shows you a link to a satisfaction survey, that survey opens in a
            separate form outside OAMS, and what you enter there is handled by that form,
            not stored in OAMS.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            Your account and its associated records are retained for as long as your
            enrollment or employment with the University continues, and thereafter for as
            long as the University's records-retention practices require. Sign-in records
            and notification settings are kept only as long as needed for the security
            and functional purposes described above.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            Under the Data Privacy Act of 2012, you have the right to be informed, to
            access, to correct, and to object to the processing of your personal data, and
            to file a complaint with the National Privacy Commission. Because OAMS accounts
            are provisioned and managed by the University (there is no self-registration),
            requests to access, correct, or delete your data should be directed to your
            college department office or the University's data protection contact rather
            than through the system itself.
          </p>

          <h2>6. Data Security</h2>
          <p>
            OAMS applies security measures to protect your information, both when it is
            stored and when it is transmitted. Access is limited according to your role,
            and inactive sessions end automatically. No system is perfectly secure, and
            this policy does not represent a guarantee against every possible incident,
            but the University takes reasonable steps to safeguard your data.
          </p>

          <h2>7. Changes to This Policy</h2>
          <p>
            If this policy changes, the "last updated" date above will change with it. We
            encourage checking back periodically, particularly if you receive a notice from
            the University about a change to how OAMS handles your data.
          </p>

          <h2>8. Contact</h2>
          <p>
            For questions about this policy or your data, contact your college department
            office, or the University of Cabuyao (Pamantasan ng Cabuyao) administration
            directly.
          </p>
        </div>
      </main>
    </div>
  );
}
