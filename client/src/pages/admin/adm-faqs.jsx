import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, HelpCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import FormModal from "../../components/FormModal";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import api from "../../utils/api";
import { formatManilaDateTime } from "../../utils/dateTime";
import "./adm-dashboard.css";
import "./adm-faqs.css";

const EMPTY_FORM = { question: "", answer: "" };

export default function AdminFaqs() {
  const { user: authUser } = useAuth();
  const user = authUser
    ? { ...authUser, college: authUser.departmentName ?? "N/A College", departmentAbbrev: authUser.departmentAbbrev ?? "CCS" }
    : { name: "Admin", college: "", departmentAbbrev: "CCS" };

  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editingFaq, setEditingFaq] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFaqs = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/admin/faqs");
      setFaqs(data.faqs || []);
    } catch (err) {
      console.error("Failed to load FAQs:", err);
      toast.error("Failed to load FAQs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const openCreate = () => {
    setCreateForm(EMPTY_FORM);
    setIsCreating(true);
  };
  const closeCreate = () => setIsCreating(false);

  const saveCreate = async () => {
    if (!createForm.question.trim() || !createForm.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setIsSaving(true);
    try {
      const { data } = await api.post("/admin/faqs", createForm);
      setFaqs((prev) => [...prev, data.faq]);
      toast.success("FAQ added");
      setIsCreating(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add FAQ");
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (faq) => {
    setEditForm({ question: faq.question, answer: faq.answer });
    setEditingFaq(faq);
  };
  const closeEdit = () => setEditingFaq(null);

  const saveEdit = async () => {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setIsSaving(true);
    try {
      const { data } = await api.put(`/admin/faqs/${editingFaq.id}`, editForm);
      setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? data.faq : f)));
      toast.success("FAQ updated");
      setEditingFaq(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update FAQ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/faqs/${deleteId}`);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteId));
      toast.success("FAQ deleted");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete FAQ");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AdminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
      overlay={
        <>
          <FormModal
            show={isCreating}
            title="New FAQ"
            description="Add a question and answer for your department's students."
            icon={<HelpCircle />}
            onCancel={closeCreate}
            onSubmit={saveCreate}
            submitting={isSaving}
            submitText="Add FAQ"
          >
            <div className="fm-field">
              <label htmlFor="faq-create-question">Question</label>
              <input
                id="faq-create-question"
                className="fm-input"
                type="text"
                value={createForm.question}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="e.g. How do I request a document?"
              />
            </div>
            <div className="fm-field">
              <label htmlFor="faq-create-answer">Answer</label>
              <textarea
                id="faq-create-answer"
                className="fm-textarea"
                value={createForm.answer}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, answer: e.target.value }))}
                placeholder="Write the answer students will see..."
              />
            </div>
          </FormModal>

          <FormModal
            show={!!editingFaq}
            title="Edit FAQ"
            icon={<HelpCircle />}
            onCancel={closeEdit}
            onSubmit={saveEdit}
            submitting={isSaving}
            submitText="Save Changes"
          >
            <div className="fm-field">
              <label htmlFor="faq-edit-question">Question</label>
              <input
                id="faq-edit-question"
                className="fm-input"
                type="text"
                value={editForm.question}
                onChange={(e) => setEditForm((prev) => ({ ...prev, question: e.target.value }))}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="faq-edit-answer">Answer</label>
              <textarea
                id="faq-edit-answer"
                className="fm-textarea"
                value={editForm.answer}
                onChange={(e) => setEditForm((prev) => ({ ...prev, answer: e.target.value }))}
              />
            </div>
          </FormModal>

          <ActionConfirmModal
            show={!!deleteId}
            title="Delete FAQ?"
            message="Delete this question and answer permanently? This can't be undone."
            confirmText="Delete"
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)}
          />
        </>
      }
    >
      <div className="faq-admin-page">
        <PageHeader
          breadcrumb={
            <Link to="/admin/announcements" className="page-breadcrumb-link">
              <ChevronLeft />
              Announcements
            </Link>
          }
          icon={<HelpCircle />}
          iconClassName="faq-title-icon"
          title="FAQ Management"
          subtitle={`Manage frequently asked questions for ${user?.college || "your department"}`}
          headerClassName="faq-header-row"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="faq-title-section"
          titleClassName="faq-page-title"
          subtitleClassName="faq-page-subtitle"
        />

        <button className="faq-btn-new" onClick={openCreate}>
          <Plus />
          New FAQ
        </button>

        <div className="faq-list-card">
          {isLoading ? (
            <div className="faq-loading">Loading FAQs...</div>
          ) : faqs.length === 0 ? (
            <div className="faq-empty">
              <HelpCircle />
              <p>No FAQs yet. Add your department's first question and answer.</p>
            </div>
          ) : (
            faqs.map((faq) => (
              <div key={faq.id} className="faq-item">
                <div className="faq-item-content">
                  <h3 className="faq-item-question">{faq.question}</h3>
                  <p className="faq-item-answer">{faq.answer}</p>
                  <p className="faq-item-meta">
                    Added {formatManilaDateTime(faq.createdAt, { month: "long" })}
                    {faq.createdBy ? ` by ${faq.createdBy}` : ""}
                  </p>
                </div>
                <div className="faq-item-actions">
                  <button className="faq-action-btn" onClick={() => openEdit(faq)}>
                    <Pencil />
                    Edit
                  </button>
                  <button
                    className="faq-action-btn faq-action-btn-danger"
                    onClick={() => setDeleteId(faq.id)}
                  >
                    <Trash2 />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
