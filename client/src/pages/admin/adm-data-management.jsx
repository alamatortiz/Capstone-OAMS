import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import "./adm-dashboard.css";
import "./adm-data-management.css";
import { toast } from "sonner";
import api from "../../utils/api";
import AdminPageShell from "../../components/AdminPageShell";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { getManilaDateString } from "../../utils/dateTime";
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
// ── Page-specific icons ───────────────────────────────────────────────────────
const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" />
    <path d="M21 11v6c0 1.66-4.03 3-9 3S3 18.66 3 17v-6" />
  </svg>
);
const ServiceClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const AuditHistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4" />
    <polyline points="3 3 3 7 7 7" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditSvgIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Form defaults ─────────────────────────────────────────────────────────────
const emptyDocForm = () => ({
  name: "",
  description: "",
  processingTime: "",
  status: "active",
  isCrossCollege: false,
  recipientType: "students",
  requiresCoding: false,
});

const emptyServiceForm = () => ({
  name: "",
  description: "",
  isCrossCollege: false,
  locationId: "",
  otherLocationName: "",
});

const emptyReqForm = () => ({ name: "", description: "", isMandatory: true });

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDataManagement() {
  const { user: authUser } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "" };

  // Tabs
  const [activeTab, setActiveTab] = useState("documents");

  // ── Document Types ─────────────────────────────────────────
  const [documentTypes, setDocumentTypes] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [showDocModal, setShowDocModal] = useState(false);
  useLockBodyScroll(showDocModal);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState(emptyDocForm());
  const [docSaving, setDocSaving] = useState(false);

  // Requirements (inside doc modal)
  const [requirements, setRequirements] = useState([]);
  const [reqForm, setReqForm] = useState(emptyReqForm());
  const [reqLoading, setReqLoading] = useState(false);
  // True once the requirements list has been populated for the current modal
  // (immediately for "add", after a successful fetch for "edit"). Submitting
  // before this is true would send an empty list and wipe the real one.
  const [reqLoaded, setReqLoaded] = useState(false);

  // ── Service Settings ───────────────────────────────────────
  const [serviceSettings, setServiceSettings] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  useLockBodyScroll(showServiceModal);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm());
  const [serviceSaving, setServiceSaving] = useState(false);

  // Requirements & steps (inside service modal)
  const [serviceRequirements, setServiceRequirements] = useState([]);
  const [serviceSteps, setServiceSteps] = useState([]);
  const [svcReqForm, setSvcReqForm] = useState({ name: "", description: "", isMandatory: true });
  const [svcStepForm, setSvcStepForm] = useState({ title: "", description: "" });
  const [svcReqLoading, setSvcReqLoading] = useState(false);
  // As reqLoaded above, but covers both requirements and steps for the service
  // modal (they load together).
  const [svcDetailsLoaded, setSvcDetailsLoaded] = useState(false);

  // Fixed premises fetched once for the Location dropdown
  const [locations, setLocations] = useState([]);

  // ── Audit Logs ─────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // ── Delete confirmations ────────────────────────────────────
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState(null);

  // ── Effects ────────────────────────────────────────────────
  const fetchDocumentTypes = useCallback(async (status = "all") => {
    setDocLoading(true);
    try {
      const params = status !== "all" ? { status } : {};
      const { data } = await api.get("/admin/data-management/document-types", { params });
      setDocumentTypes(data.documentTypes || []);
    } catch {
      toast.error("Failed to load document types.");
    } finally {
      setDocLoading(false);
    }
  }, []);

  const fetchServiceTypes = useCallback(async () => {
    setServiceLoading(true);
    try {
      const { data } = await api.get("/admin/data-management/service-types");
      setServiceSettings(data.serviceTypes || []);
    } catch {
      toast.error("Failed to load service types.");
    } finally {
      setServiceLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/locations");
      setLocations(data.locations || []);
    } catch {
      toast.error("Failed to load locations.");
    }
  }, []);

  const fetchAuditLogs = useCallback(async (action = "all") => {
    setAuditLoading(true);
    try {
      const params = action !== "all" ? { action } : {};
      const { data } = await api.get("/admin/data-management/audit-logs", { params });
      setAuditLogs(data.auditLogs || []);
    } catch {
      toast.error("Failed to load audit logs.");
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "documents") fetchDocumentTypes(docStatusFilter);
  }, [activeTab, docStatusFilter, fetchDocumentTypes]);

  useEffect(() => {
    if (activeTab === "services") {
      fetchServiceTypes();
      fetchLocations();
    }
  }, [activeTab, fetchServiceTypes, fetchLocations]);

  useEffect(() => {
    if (activeTab === "audit") fetchAuditLogs(auditActionFilter);
  }, [activeTab, auditActionFilter, fetchAuditLogs]);

  // ── Handlers: Document Types ───────────────────────────────
  const openAddDocModal = () => {
    setEditingDoc(null);
    setDocForm(emptyDocForm());
    setRequirements([]);
    setReqForm(emptyReqForm());
    setReqLoaded(true);
    setShowDocModal(true);
  };

  const openEditDocModal = async (doc) => {
    setEditingDoc(doc);
    setDocForm({
      name: doc.name,
      description: doc.description,
      processingTime: doc.processingTime,
      status: doc.status,
      isCrossCollege: !!doc.isCrossCollege,
      recipientType: doc.recipientType || "students",
      requiresCoding: !!doc.requiresCoding,
    });
    setRequirements([]);
    setReqForm(emptyReqForm());
    setReqLoaded(false);
    setShowDocModal(true);

    setReqLoading(true);
    try {
      const { data } = await api.get(`/admin/data-management/document-types/${doc.id}/requirements`);
      setRequirements(data.requirements || []);
      setReqLoaded(true);
    } catch {
      toast.error("Failed to load requirements.");
    } finally {
      setReqLoading(false);
    }
  };

  const closeDocModal = () => {
    setShowDocModal(false);
    setEditingDoc(null);
    setDocForm(emptyDocForm());
    setRequirements([]);
    setReqForm(emptyReqForm());
    setReqLoaded(false);
  };

  const addRequirement = () => {
    if (!reqForm.name.trim()) { toast.error("Requirement name is required."); return; }
    setRequirements((prev) => [...prev, { ...reqForm, _tempId: Date.now() }]);
    setReqForm(emptyReqForm());
  };

  const removeRequirement = (index) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRequirementMandatory = (index, isMandatory) => {
    setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, isMandatory } : r)));
  };

  const handleDocSubmit = async () => {
    const { name, description, processingTime } = docForm;
    if (!name) {
      toast.error("Please enter a document type name.");
      return;
    }
    if (!description) {
      toast.error("Please enter a description.");
      return;
    }
    if (!processingTime) {
      toast.error("Please enter a processing time.");
      return;
    }
    setDocSaving(true);
    try {
      const payload = {
        name,
        description,
        processingTime,
        status: docForm.status,
        isCrossCollege: docForm.isCrossCollege,
        recipientType: docForm.recipientType,
        requiresCoding: docForm.requiresCoding,
      };
      // Only send the requirements list once it's trustworthy (loaded from the
      // server on edit, or always on add). Omitting the key tells the server to
      // leave the existing rows alone rather than wiping them.
      if (reqLoaded || !editingDoc) {
        payload.requirements = requirements.map((r) => ({
          name: r.name,
          description: r.description || "",
          isMandatory: r.isMandatory !== false,
        }));
      }

      if (editingDoc) {
        await api.put(`/admin/data-management/document-types/${editingDoc.id}`, payload);
        toast.success("Document type updated.");
      } else {
        await api.post("/admin/data-management/document-types", payload);
        toast.success("Document type created.");
      }
      closeDocModal();
      fetchDocumentTypes(docStatusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save document type.");
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDoc = async (doc) => {
    try {
      const { data } = await api.patch(`/admin/data-management/document-types/${doc.id}/deactivate`);
      toast.success(
        data?.declinedCount
          ? `Document type set inactive. ${data.declinedCount} in-progress request(s) declined.`
          : "Document type set inactive.",
      );
      fetchDocumentTypes(docStatusFilter);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to set the document type inactive.");
    } finally {
      setDeleteDocTarget(null);
    }
  };

  // ── Handlers: Service Settings ─────────────────────────────
  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm());
    setServiceRequirements([]);
    setServiceSteps([]);
    setSvcReqForm({ name: "", description: "", isMandatory: true });
    setSvcStepForm({ title: "", description: "" });
    setSvcDetailsLoaded(true);
    setShowServiceModal(true);
  };

  const openEditServiceModal = async (s) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      description: s.description || "",
      isCrossCollege: !!s.isCrossCollege,
      locationId: s.locationId ? String(s.locationId) : "",
      otherLocationName: "",
    });
    setServiceRequirements([]);
    setServiceSteps([]);
    setSvcReqForm({ name: "", description: "", isMandatory: true });
    setSvcStepForm({ title: "", description: "" });
    setSvcDetailsLoaded(false);
    setShowServiceModal(true);

    setSvcReqLoading(true);
    try {
      const [reqRes, stepRes] = await Promise.all([
        api.get(`/admin/data-management/service-types/${s.id}/requirements`),
        api.get(`/admin/data-management/service-types/${s.id}/steps`),
      ]);
      setServiceRequirements(reqRes.data.requirements || []);
      setServiceSteps(stepRes.data.steps || []);
      setSvcDetailsLoaded(true);
    } catch {
      toast.error("Failed to load service details.");
    } finally {
      setSvcReqLoading(false);
    }
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm(emptyServiceForm());
    setServiceRequirements([]);
    setServiceSteps([]);
    setSvcReqForm({ name: "", description: "", isMandatory: true });
    setSvcStepForm({ title: "", description: "" });
    setSvcDetailsLoaded(false);
  };

  const addServiceRequirement = () => {
    if (!svcReqForm.name.trim()) { toast.error("Requirement name is required."); return; }
    setServiceRequirements((prev) => [...prev, { ...svcReqForm, _tempId: Date.now() }]);
    setSvcReqForm({ name: "", description: "", isMandatory: true });
  };

  const removeServiceRequirement = (index) => {
    setServiceRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const addServiceStep = () => {
    if (!svcStepForm.title.trim()) { toast.error("Step title is required."); return; }
    setServiceSteps((prev) => [...prev, { ...svcStepForm, stepNumber: prev.length + 1, _tempId: Date.now() }]);
    setSvcStepForm({ title: "", description: "" });
  };

  const removeServiceStep = (index) => {
    setServiceSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }))
    );
  };

  const handleServiceSubmit = async () => {
    const { name } = serviceForm;
    if (!name) {
      toast.error("Service name is required.");
      return;
    }
    if (serviceForm.locationId === "__other__" && !serviceForm.otherLocationName.trim()) {
      toast.error("Please type a location name.");
      return;
    }
    setServiceSaving(true);
    try {
      let locationId = serviceForm.locationId || null;
      if (locationId === "__other__") {
        const { data } = await api.post("/admin/locations", {
          name: serviceForm.otherLocationName.trim(),
        });
        locationId = data.id;
        setLocations((prev) => [...prev, data]);
      }

      const payload = {
        name: serviceForm.name,
        description: serviceForm.description,
        isCrossCollege: serviceForm.isCrossCollege,
        locationId,
      };

      let serviceId;
      if (editingService) {
        await api.put(`/admin/data-management/service-types/${editingService.id}`, payload);
        serviceId = editingService.id;
        toast.success("Service updated.");
      } else {
        const { data } = await api.post("/admin/data-management/service-types", payload);
        serviceId = data.id;
        toast.success("Service created.");
      }

      // Only replace requirements/steps once they've actually loaded (on edit)
      // -- otherwise the modal's brief empty state would blow away the real
      // rows. On add there's nothing to lose, so always send.
      if (svcDetailsLoaded || !editingService) {
        await Promise.all([
          api.put(`/admin/data-management/service-types/${serviceId}/requirements`, {
            requirements: serviceRequirements.map((r) => ({
              name: r.name,
              description: r.description || "",
              isMandatory: r.isMandatory !== false,
            })),
          }),
          api.put(`/admin/data-management/service-types/${serviceId}/steps`, {
            steps: serviceSteps.map((s) => ({
              stepNumber: s.stepNumber,
              title: s.title,
              description: s.description || "",
            })),
          }),
        ]);
      }

      closeServiceModal();
      fetchServiceTypes();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save service.");
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = async (s) => {
    try {
      await api.delete(`/admin/data-management/service-types/${s.id}`);
      toast.success("Service deleted.");
      fetchServiceTypes();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete service.");
    } finally {
      setDeleteServiceTarget(null);
    }
  };

  // ── Filter constants ───────────────────────────────────────
  const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const AUDIT_ACTION_FILTERS = [
    { value: "all", label: "All" },
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "EXPORT", label: "Export" },
    { value: "READ", label: "Read" },
  ];

  const formatTargetLabel = (log) => {
    if (!log.targetTable) return "System";
    const tableMap = {
      document_services: "Document Type",
      services: "Service Type",
      users: "User Account",
      students: "Student",
      faculty: "Faculty",
      document_requests: "Document Request",
      faculty_document_requests: "Faculty Document Request",
      document_submissions: "Sent Document",
      generated_files: "Generated File",
      system_settings: "System Setting",
      service_requirements: "Service Requirement",
      service_procedure_steps: "Service Procedure Step",
    };
    const label = tableMap[log.targetTable] || log.targetTable;
    return log.targetRecordId ? `${label} #${log.targetRecordId}` : label;
  };

  const formatChangeSummary = (log) => {
    if (log.action === "CREATE" && log.newValues) {
      const v = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues;
      return `Created: ${v.name || ""}${v.status ? ` (${v.status})` : ""}`;
    }
    if (log.action === "UPDATE" && log.oldValues && log.newValues) {
      const o = typeof log.oldValues === "string" ? JSON.parse(log.oldValues) : log.oldValues;
      const n = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues;
      const parts = [];
      if (o.name !== n.name) parts.push(`name: "${o.name}" → "${n.name}"`);
      if (o.status !== n.status) parts.push(`status: ${o.status} → ${n.status}`);
      return parts.length ? parts.join(", ") : "Updated record";
    }
    if (log.action === "DELETE" && log.oldValues) {
      const v = typeof log.oldValues === "string" ? JSON.parse(log.oldValues) : log.oldValues;
      return `Deleted: ${v.name || "record"}`;
    }
    return "";
  };

  // Prefixes a leading =/+/-/@ with a single quote so spreadsheet apps
  // (Excel, Sheets) treat the cell as literal text instead of a formula --
  // user-entered fields like names have no format restriction at registration.
  const csvEscape = (value) => {
    let str = String(value ?? "");
    if (/^[=+\-@]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };
  const handleExportLogs = () => {
    const header = ["Timestamp", "Action", "Admin", "Admin Email", "Target", "Change Summary"];
    const rows = auditLogs.map((log) => [
      log.timestamp,
      log.action,
      log.adminName,
      log.adminEmail,
      formatTargetLabel(log),
      formatChangeSummary(log),
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${getManilaDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <AdminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
      overlay={
        <>
          {/* ── Document Type Modal ── */}
          {showDocModal && (
            <div className="adm-modal-overlay">
              <div className="adm-modal adm-modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="adm-modal-header">
                  <div>
                    <h3 className="adm-modal-title">{editingDoc ? "Edit Document Type" : "Add Document Type"}</h3>
                    <p className="adm-modal-subtitle">
                      {editingDoc ? "Update document type details and requirements" : "Create a new document type for your department"}
                    </p>
                  </div>
                  <button className="adm-modal-close-btn" onClick={closeDocModal} aria-label="Close">
                    <CloseIcon />
                  </button>
                </div>
                <div className="adm-modal-body">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Document Name *</label>
                    <input
                      className="adm-form-input"
                      placeholder="e.g., Certificate of Grades"
                      value={docForm.name}
                      onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Description *</label>
                    <textarea
                      className="adm-form-textarea"
                      placeholder="Brief description of the document"
                      rows={3}
                      value={docForm.description}
                      onChange={(e) => setDocForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Processing Time *</label>
                    <input
                      className="adm-form-input"
                      placeholder="e.g., 3-5 business days"
                      value={docForm.processingTime}
                      onChange={(e) => setDocForm((p) => ({ ...p, processingTime: e.target.value }))}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Status *</label>
                    <select
                      className="adm-form-select"
                      value={docForm.status}
                      onChange={(e) => setDocForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="adm-form-grid-2">
                    <div className="adm-form-group">
                      <label className="adm-form-label">Availability</label>
                      <label className="adm-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={docForm.isCrossCollege}
                          onChange={(e) => setDocForm((p) => ({ ...p, isCrossCollege: e.target.checked }))}
                        />
                        <span className="adm-checkbox-label">Share with all colleges</span>
                      </label>
                    </div>
                    <div className="adm-form-group">
                      <label className="adm-form-label">Available To</label>
                      <select
                        className="adm-form-select"
                        value={docForm.recipientType}
                        onChange={(e) => setDocForm((p) => ({ ...p, recipientType: e.target.value }))}
                      >
                        <option value="students">Students</option>
                        <option value="faculty">Faculty</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={docForm.requiresCoding}
                        onChange={(e) => setDocForm((p) => ({ ...p, requiresCoding: e.target.checked }))}
                      />
                      <span className="adm-checkbox-label">
                        Requires an official code (dean-sanctioned) before release
                      </span>
                    </label>
                  </div>

                  {/* ── Document Requirements ── */}
                  <div className="adm-req-section">
                    <div className="adm-req-header">
                      <h4 className="adm-req-title">Document Requirements</h4>
                      <p className="adm-req-subtitle">List what students need to submit for this document type</p>
                    </div>

                    {reqLoading && <div className="adm-loading adm-loading-sm">Loading requirements...</div>}

                    {!reqLoading && requirements.length > 0 && (
                      <div className="adm-req-list">
                        {requirements.map((req, idx) => (
                          <div key={req.id || req._tempId || idx} className="adm-req-item">
                            <div className="adm-req-item-main">
                              <div className="adm-req-item-top">
                                <span className="adm-req-item-name">{req.name}</span>
                                <label className="adm-checkbox-wrapper adm-checkbox-inline">
                                  <input
                                    type="checkbox"
                                    checked={req.isMandatory !== false}
                                    onChange={(e) => updateRequirementMandatory(idx, e.target.checked)}
                                  />
                                  <span className="adm-checkbox-label">Mandatory</span>
                                </label>
                              </div>
                              {req.description && <p className="adm-req-item-desc">{req.description}</p>}
                            </div>
                            <button className="adm-btn-icon adm-btn-delete" onClick={() => removeRequirement(idx)} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add requirement inline form */}
                    <div className="adm-req-add-form">
                      <div className="adm-req-add-fields">
                        <input
                          className="adm-form-input"
                          placeholder="Requirement name *"
                          value={reqForm.name}
                          onChange={(e) => setReqForm((p) => ({ ...p, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                        />
                        <input
                          className="adm-form-input"
                          placeholder="Description (optional)"
                          value={reqForm.description}
                          onChange={(e) => setReqForm((p) => ({ ...p, description: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRequirement(); } }}
                        />
                        <label className="adm-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={reqForm.isMandatory}
                            onChange={(e) => setReqForm((p) => ({ ...p, isMandatory: e.target.checked }))}
                          />
                          <span className="adm-checkbox-label">Mandatory</span>
                        </label>
                      </div>
                      <button className="adm-btn-add-req" onClick={addRequirement} type="button">
                        <PlusIcon /> Add Requirement
                      </button>
                    </div>
                  </div>
                </div>
                <div className="adm-modal-footer">
                  <button className="adm-btn-outline" onClick={closeDocModal}>Cancel</button>
                  <button
                    className="adm-btn-primary"
                    onClick={handleDocSubmit}
                    disabled={docSaving || (editingDoc && !reqLoaded)}
                  >
                    {docSaving ? "Saving..." : (editingDoc ? "Update" : "Create")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Service Setting Modal ── */}
          {showServiceModal && (
            <div className="adm-modal-overlay">
              <div className="adm-modal adm-modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="adm-modal-header">
                  <div>
                    <h3 className="adm-modal-title">{editingService ? "Edit Service" : "Add Service"}</h3>
                    <p className="adm-modal-subtitle">
                      {editingService ? "Update queue service configuration" : "Create a new queue service for your department"}
                    </p>
                  </div>
                  <button className="adm-modal-close-btn" onClick={closeServiceModal} aria-label="Close">
                    <CloseIcon />
                  </button>
                </div>
                <div className="adm-modal-body">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Service Name *</label>
                    <input
                      className="adm-form-input"
                      placeholder="e.g., Enrollment Assistance"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Description</label>
                    <textarea
                      className="adm-form-textarea"
                      placeholder="Brief description of this service"
                      rows={3}
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Location</label>
                    <select
                      className="adm-form-select"
                      value={serviceForm.locationId}
                      onChange={(e) => setServiceForm((p) => ({ ...p, locationId: e.target.value }))}
                    >
                      <option value="">No specific location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}{loc.isGlobal ? " (Shared)" : ""}
                        </option>
                      ))}
                      <option value="__other__">Other (type your own)…</option>
                    </select>
                    {serviceForm.locationId === "__other__" && (
                      <input
                        className="adm-form-input"
                        style={{ marginTop: "8px" }}
                        placeholder="Type the location name"
                        value={serviceForm.otherLocationName}
                        onChange={(e) => setServiceForm((p) => ({ ...p, otherLocationName: e.target.value }))}
                      />
                    )}
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Availability</label>
                    <label className="adm-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={serviceForm.isCrossCollege}
                        onChange={(e) => setServiceForm((p) => ({ ...p, isCrossCollege: e.target.checked }))}
                      />
                      <span className="adm-checkbox-label">Share with all colleges</span>
                    </label>
                  </div>

                  {/* ── Service Requirements ── */}
                  <div className="adm-req-section">
                    <div className="adm-req-header">
                      <h4 className="adm-req-title">Service Requirements</h4>
                      <p className="adm-req-subtitle">List what students need to bring or prepare</p>
                    </div>

                    {svcReqLoading && <div className="adm-loading adm-loading-sm">Loading...</div>}

                    {!svcReqLoading && serviceRequirements.length > 0 && (
                      <div className="adm-req-list">
                        {serviceRequirements.map((req, idx) => (
                          <div key={req.id || req._tempId || idx} className="adm-req-item">
                            <div className="adm-req-item-main">
                              <div className="adm-req-item-top">
                                <span className="adm-req-item-name">{req.name}</span>
                                {(req.isMandatory !== false) && (
                                  <span className="adm-badge adm-badge-mandatory">Required</span>
                                )}
                                {req.isMandatory === false && (
                                  <span className="adm-badge adm-badge-optional">Optional</span>
                                )}
                              </div>
                              {req.description && <p className="adm-req-item-desc">{req.description}</p>}
                            </div>
                            <button className="adm-btn-icon adm-btn-delete" onClick={() => removeServiceRequirement(idx)} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="adm-req-add-form">
                      <div className="adm-req-add-fields">
                        <input
                          className="adm-form-input"
                          placeholder="Requirement name *"
                          value={svcReqForm.name}
                          onChange={(e) => setSvcReqForm((p) => ({ ...p, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServiceRequirement(); } }}
                        />
                        <input
                          className="adm-form-input"
                          placeholder="Description (optional)"
                          value={svcReqForm.description}
                          onChange={(e) => setSvcReqForm((p) => ({ ...p, description: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServiceRequirement(); } }}
                        />
                        <label className="adm-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={svcReqForm.isMandatory}
                            onChange={(e) => setSvcReqForm((p) => ({ ...p, isMandatory: e.target.checked }))}
                          />
                          <span className="adm-checkbox-label">Mandatory</span>
                        </label>
                      </div>
                      <button className="adm-btn-add-req" onClick={addServiceRequirement} type="button">
                        <PlusIcon /> Add Requirement
                      </button>
                    </div>
                  </div>

                  {/* ── Procedure Steps ── */}
                  <div className="adm-req-section">
                    <div className="adm-req-header">
                      <h4 className="adm-req-title">Procedure Steps</h4>
                      <p className="adm-req-subtitle">Step-by-step process students will follow</p>
                    </div>

                    {!svcReqLoading && serviceSteps.length > 0 && (
                      <div className="adm-req-list">
                        {serviceSteps.map((step, idx) => (
                          <div key={step.id || step._tempId || idx} className="adm-req-item">
                            <div className="adm-req-item-main">
                              <div className="adm-req-item-top">
                                <span className="adm-badge adm-badge-mandatory">Step {step.stepNumber}</span>
                                <span className="adm-req-item-name">{step.title}</span>
                              </div>
                              {step.description && <p className="adm-req-item-desc">{step.description}</p>}
                            </div>
                            <button className="adm-btn-icon adm-btn-delete" onClick={() => removeServiceStep(idx)} title="Remove">
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="adm-req-add-form">
                      <div className="adm-req-add-fields">
                        <input
                          className="adm-form-input"
                          placeholder="Step title *"
                          value={svcStepForm.title}
                          onChange={(e) => setSvcStepForm((p) => ({ ...p, title: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServiceStep(); } }}
                        />
                        <input
                          className="adm-form-input"
                          placeholder="Description (optional)"
                          value={svcStepForm.description}
                          onChange={(e) => setSvcStepForm((p) => ({ ...p, description: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServiceStep(); } }}
                        />
                      </div>
                      <button className="adm-btn-add-req" onClick={addServiceStep} type="button">
                        <PlusIcon /> Add Step
                      </button>
                    </div>
                  </div>
                </div>
                <div className="adm-modal-footer">
                  <button className="adm-btn-outline" onClick={closeServiceModal}>Cancel</button>
                  <button
                    className="adm-btn-primary"
                    onClick={handleServiceSubmit}
                    disabled={serviceSaving || (editingService && !svcDetailsLoaded)}
                  >
                    {serviceSaving ? "Saving..." : (editingService ? "Update" : "Add Service")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ActionConfirmModal
            show={!!deleteDocTarget}
            onCancel={() => setDeleteDocTarget(null)}
            onConfirm={() => handleDeleteDoc(deleteDocTarget)}
            title="Set Document Type Inactive?"
            message={deleteDocTarget && (
              <>
                Set <strong>{deleteDocTarget.name}</strong> inactive? Any in-progress request for
                it will be declined, and it will be hidden from the request form. Finished records
                keep their details, and you can reactivate it later.
              </>
            )}
            confirmText="Set Inactive"
          />
          <ActionConfirmModal
            show={!!deleteServiceTarget}
            onCancel={() => setDeleteServiceTarget(null)}
            onConfirm={() => handleDeleteService(deleteServiceTarget)}
            title="Delete Service?"
            message={deleteServiceTarget && <>Delete <strong>{deleteServiceTarget.name}</strong>?</>}
            confirmText="Delete"
          />
        </>
      }
    >
        <div className="admin-dashboard">

          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<DatabaseIcon />}
            iconClassName="adm-title-icon"
            title="Data Management"
            subtitle={`${user?.college} (${user?.departmentAbbrev}) — Configure document types and queue services.`}
            headerClassName="adm-page-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="adm-title-section"
            titleClassName="adm-page-title"
            subtitleClassName="adm-page-subtitle"
          />

          {/* Tabs Container */}
          <div className="adm-tabs-container">
            {/* Tab Bar */}
            <div className="adm-tabs-bar">
              <button
                className={`adm-tab-btn ${activeTab === "documents" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("documents")}
              >
                <span className="adm-tab-icon"><FileText /></span>
                Document Settings
              </button>
              <button
                className={`adm-tab-btn ${activeTab === "services" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("services")}
              >
                <span className="adm-tab-icon"><ServiceClockIcon /></span>
                Service Settings
              </button>
              <button
                className={`adm-tab-btn ${activeTab === "audit" ? "adm-tab-active" : ""}`}
                onClick={() => setActiveTab("audit")}
              >
                <span className="adm-tab-icon"><AuditHistoryIcon /></span>
                Audit Logs
              </button>
            </div>

            {/* ── Document Settings Tab ── */}
            {activeTab === "documents" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">Document Type Management</h2>
                    <p className="adm-card-desc">Configure available document types and requirements for {user?.departmentAbbrev}.</p>
                  </div>
                  <button className="adm-btn-primary" onClick={openAddDocModal}>
                    <PlusIcon />
                    Add Document Type
                  </button>
                </div>

                {/* Status filter pills */}
                <div className="adm-filter-bar">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`adm-filter-pill ${docStatusFilter === f.value ? "adm-filter-pill-active" : ""}`}
                      onClick={() => setDocStatusFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-items-list">
                  {docLoading && <div className="adm-loading">Loading document types...</div>}
                  {!docLoading && documentTypes.length === 0 && (
                    <p className="adm-empty-state">No document types found. Add one to get started.</p>
                  )}
                  {!docLoading && documentTypes.map((doc) => (
                    <div key={doc.id} className="adm-item">
                      <div className="adm-item-main">
                        <div className="adm-item-top-row">
                          <p className="adm-item-name">{doc.name}</p>
                          <div className="adm-item-badges">
                            <span className="adm-badge adm-badge-dept">{doc.deptAbbrev}</span>
                            {doc.isCrossCollege && <span className="adm-badge adm-badge-global">Cross-College</span>}
                            <span className="adm-badge adm-badge-recipient">{doc.recipientType || "students"}</span>
                            {doc.requiresCoding && <span className="adm-badge adm-badge-global">Requires Coding</span>}
                            <span className={`adm-badge adm-badge-status-${doc.status}`}>{doc.status}</span>
                          </div>
                        </div>
                        <p className="adm-item-desc">{doc.description}</p>
                        <div className="adm-item-meta">
                          <span>Processing: {doc.processingTime || "—"}</span>
                          <span>{doc.requirementCount} requirement{doc.requirementCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-btn-icon adm-btn-edit" onClick={() => openEditDocModal(doc)} title="Edit">
                          <EditSvgIcon />
                        </button>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => setDeleteDocTarget(doc)} title="Set inactive">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Service Settings Tab ── */}
            {activeTab === "services" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">Service Configuration</h2>
                    <p className="adm-card-desc">Manage queue services for {user?.departmentAbbrev}.</p>
                  </div>
                  <button className="adm-btn-primary" onClick={openAddServiceModal}>
                    <PlusIcon />
                    Add Service
                  </button>
                </div>

                <div className="adm-items-list">
                  {serviceLoading && <div className="adm-loading">Loading services...</div>}
                  {!serviceLoading && serviceSettings.length === 0 && (
                    <p className="adm-empty-state">No services found. Add one to get started.</p>
                  )}
                  {!serviceLoading && serviceSettings.map((s) => (
                    <div key={s.id} className="adm-item">
                      <div className="adm-item-main">
                        <div className="adm-item-top-row">
                          <p className="adm-item-name">{s.name}</p>
                          <div className="adm-item-badges">
                            <span className="adm-badge adm-badge-dept">{s.deptAbbrev}</span>
                            {s.isCrossCollege && <span className="adm-badge adm-badge-global">Cross-College</span>}
                          </div>
                        </div>
                        {s.description && <p className="adm-item-desc">{s.description}</p>}
                      </div>
                      <div className="adm-item-actions">
                        <button className="adm-btn-icon adm-btn-edit" onClick={() => openEditServiceModal(s)} title="Edit">
                          <EditSvgIcon />
                        </button>
                        <button className="adm-btn-icon adm-btn-delete" onClick={() => setDeleteServiceTarget(s)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Audit Logs Tab ── */}
            {activeTab === "audit" && (
              <div className="adm-tab-content">
                <div className="adm-card-header">
                  <div>
                    <h2 className="adm-card-title">System Audit Logs</h2>
                    <p className="adm-card-desc">Track all administrative actions for {user?.departmentAbbrev}.</p>
                  </div>
                  <button className="adm-btn-outline" onClick={handleExportLogs}>
                    <DownloadIcon />
                    Export Logs
                  </button>
                </div>

                {/* Action filter pills */}
                <div className="adm-filter-bar adm-filter-bar-wrap">
                  {AUDIT_ACTION_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      className={`adm-filter-pill adm-filter-pill-action-${f.value.toLowerCase()} ${auditActionFilter === f.value ? "adm-filter-pill-active" : ""}`}
                      onClick={() => setAuditActionFilter(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="adm-items-list">
                  {auditLoading && <div className="adm-loading">Loading audit logs...</div>}
                  {!auditLoading && auditLogs.length === 0 && (
                    <p className="adm-empty-state">No audit log entries found.</p>
                  )}
                  {!auditLoading && auditLogs.map((log) => (
                    <div key={log.id} className="adm-log-item">
                      <div className="adm-log-top-row">
                        <span className={`adm-badge adm-badge-${log.action.toLowerCase()}`}>{log.action}</span>
                        <span className="adm-log-user">{log.adminName} ({log.adminEmail})</span>
                      </div>
                      <p className="adm-log-target">{formatTargetLabel(log)}</p>
                      {formatChangeSummary(log) && (
                        <p className="adm-log-details">{formatChangeSummary(log)}</p>
                      )}
                      <p className="adm-log-timestamp">{log.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </AdminPageShell>
  );
}
