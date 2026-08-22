import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ChevronLeft, AlertCircle, Search } from "lucide-react";
import ProfessorPageShell from "../../components/ProfessorPageShell";
import PageHeader from "../../components/PageHeader";
import AccordionItem from "../../components/AccordionItem";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";
import "./prof-announcements.css";
import "./prof-faqs.css";

export default function ProfessorFaqs() {
  const { token } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/professor/faqs");
      setFaqs(data.faqs || []);
    } catch (err) {
      console.error("Failed to load FAQs:", err);
      setError("Something went wrong loading FAQs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Live refresh when an admin adds/edits/removes an FAQ, mirroring
  // stud-faqs.jsx's own socket-driven refresh pattern. fetchFaqs is a
  // stable useCallback (empty deps), so it's safe to depend on here.
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    socket.on("faq:changed", fetchFaqs);
    return () => socket.off("faq:changed", fetchFaqs);
  }, [token, fetchFaqs]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredFaqs = trimmedQuery
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(trimmedQuery) ||
          faq.answer.toLowerCase().includes(trimmedQuery),
      )
    : faqs;

  return (
    <ProfessorPageShell outerClassName="ann-with-sidebar" mainClassName="ann-main">
      <div className="faq-student-page">
        <PageHeader
          breadcrumb={
            <Link to="/professor/announcements" className="faq-breadcrumb-link">
              <ChevronLeft className="faq-breadcrumb-icon" />
              Announcements
            </Link>
          }
          icon={<HelpCircle />}
          iconClassName="faq-title-icon"
          title="Frequently Asked Questions"
          subtitle="Answers to common questions from your department."
          headerClassName="faq-header-row"
          breadcrumbClassName="faq-breadcrumb"
          titleSectionClassName="faq-title-section"
          titleClassName="faq-page-title"
          subtitleClassName="faq-page-subtitle"
        />

        {isLoading ? (
          <div className="faq-loading">Loading FAQs...</div>
        ) : error ? (
          <div className="ann-empty-state">
            <AlertCircle />
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button className="ann-retry-btn" onClick={fetchFaqs}>
              Retry
            </button>
          </div>
        ) : faqs.length === 0 ? (
          <div className="ann-empty-state">
            <HelpCircle />
            <h3>No FAQs yet</h3>
            <p>Your department hasn't posted any frequently asked questions yet.</p>
          </div>
        ) : (
          <>
            <div className="faq-search-wrapper">
              <Search className="faq-search-icon" />
              <input
                type="text"
                className="faq-search-input"
                placeholder="Search FAQs by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="ann-empty-state">
                <Search />
                <h3>No matches</h3>
                <p>No FAQs match "{searchQuery.trim()}". Try a different keyword.</p>
              </div>
            ) : (
              <div className="faq-accordion-list">
                {filteredFaqs.map((faq) => (
                  <AccordionItem key={faq.id} summary={faq.question}>
                    {faq.answer}
                  </AccordionItem>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProfessorPageShell>
  );
}
