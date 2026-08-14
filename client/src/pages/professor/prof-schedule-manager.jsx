import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import ProfessorSidebar from "../../components/ProfessorSidebar";
import PageHeader from "../../components/PageHeader";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import "./prof-dashboard.css";
import "./prof-schedule-manager.css";
import api from "../../utils/api";
import { toast } from "sonner";

// ── Icons ──────────────────────────────────────────────────────────────────────
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const PlusIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const PencilIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const ClockIcon = () => (
  <svg style={{ width: "1rem", height: "1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProfessorScheduleManager() {
  const location = useLocation();
  const cameFrom = location.state?.from ?? "/professor/dashboard";
  const cameFromLabel = location.state?.fromLabel ?? "Home";

  // ── Data ────────────────────────────────────────────────────────────────────
  // All slots indexed by day name, e.g. "Monday" -> [slot, slot, ...]
  const [slotsByDay, setSlotsByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);

  // ── Selected day / Add-Edit slot form ───────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingId, setEditingId] = useState(null);     // availability_id being edited, or null when adding
  const [addDays, setAddDays] = useState([]);           // string[] (single-item when editing)
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [showOtherLocation, setShowOtherLocation] = useState(false);
  const [addMaxStudents, setAddMaxStudents] = useState("");
  const [editingCurrentMaxBooked, setEditingCurrentMaxBooked] = useState(0); // students already booked (future dates) for the slot being edited
  const [addApptTypes, setAddApptTypes] = useState([]);   // string[]
  const [addApptInput, setAddApptInput] = useState("");   // current tag input value
  const [addSaving, setAddSaving] = useState(false);

  // ── Delete-slot confirmation ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, day, slot } or null
  const [deleteSaving, setDeleteSaving] = useState(false);

  // ── Fetch weekly availability ───────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get("/professor/availability");
      const map = {};
      res.data.forEach((slot) => {
        if (!map[slot.day_of_week]) map[slot.day_of_week] = [];
        map[slot.day_of_week].push(slot);
      });
      setSlotsByDay(map);
    } catch {
      toast.error("Failed to load schedule data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    api.get("/professor/locations")
      .then(({ data }) => setLocations(data.locations || []))
      .catch(() => toast.error("Failed to load locations."));
  }, []);

  const handleDayClick = (day) => {
    setSelectedDay(day === selectedDay ? null : day);
  };

  // ── Open "Add Slot" modal ───────────────────────────────────────────────────
  const openAddSlot = (day) => {
    setEditingId(null);
    setAddDays(day ? [day] : []);
    setAddStart("");
    setAddEnd("");
    setAddLocation("");
    setShowOtherLocation(false);
    setAddMaxStudents("");
    setAddApptTypes([]);
    setAddApptInput("");
    setEditingCurrentMaxBooked(0);
    setShowAddSlot(true);
  };

  // ── Open "Edit Slot" modal, pre-filled with the existing slot's values ──────
  const openEditSlot = (slot, day) => {
    setEditingId(slot.availability_id);
    setAddDays([day]);
    setAddStart(slot.start_time.slice(0, 5));
    setAddEnd(slot.end_time.slice(0, 5));
    setAddLocation(slot.location ?? "");
    setShowOtherLocation(!!slot.location && !locations.some((loc) => loc.name === slot.location));
    setAddMaxStudents(slot.max_students != null ? String(slot.max_students) : "");
    setAddApptTypes((slot.appointmentTypes ?? []).map((t) => t.name));
    setAddApptInput("");
    setEditingCurrentMaxBooked(slot.currentMaxBooked ?? 0);
    setShowAddSlot(true);
  };

  const toggleAddDay = (day) => {
    setAddDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const commitApptTag = () => {
    const val = addApptInput.trim();
    if (!val || addApptTypes.includes(val) || addApptTypes.length >= 10) return;
    setAddApptTypes((prev) => [...prev, val]);
    setAddApptInput("");
  };

  const removeApptTag = (tag) => setAddApptTypes((prev) => prev.filter((t) => t !== tag));

  // ── Overlap check ────────────────────────────────────────────────────────
  // Two windows on the same day conflict if they intersect at all, not just
  // if they're an exact duplicate. A professor can't keep two overlapping
  // consultation blocks open at once (see explanation above this feature).
  const findOverlap = (day, start, end) =>
    (slotsByDay[day] ?? []).find((s) => {
      if (editingId && s.availability_id === editingId) return false;
      const sStart = s.start_time.slice(0, 5);
      const sEnd = s.end_time.slice(0, 5);
      return start < sEnd && sStart < end;
    });

  // ── Save (add or edit) slot ─────────────────────────────────────────────────
  const handleSaveSlot = async () => {
    if (addDays.length === 0 || !addStart || !addEnd || !addLocation.trim()) {
      toast.error("Please select at least one day, times, and location.");
      return;
    }
    if (addEnd <= addStart) { toast.error("End time must be after start time."); return; }

    if (!addMaxStudents.trim()) {
      toast.error("Max students is required.");
      return;
    }
    const maxStu = parseInt(addMaxStudents, 10);
    if (isNaN(maxStu) || maxStu < 1) {
      toast.error("Max students must be a positive number.");
      return;
    }
    if (editingId && maxStu < editingCurrentMaxBooked) {
      toast.error(`Cannot set max students below ${editingCurrentMaxBooked} — that many students are already booked on a future date.`);
      return;
    }

    const conflictDays = addDays.filter((day) => findOverlap(day, addStart, addEnd));
    if (conflictDays.length > 0) {
      toast.error(`This time overlaps an existing slot on ${conflictDays.join(", ")}`);
      return;
    }

    setAddSaving(true);
    try {
      if (showOtherLocation && !locations.some((loc) => loc.name === addLocation.trim())) {
        try {
          const { data } = await api.post("/professor/locations", { name: addLocation.trim() });
          setLocations((prev) => [...prev, data]);
        } catch {
          // Non-fatal: the slot can still be saved with the typed location text.
        }
      }

      if (editingId) {
        await api.patch(`/professor/availability/${editingId}`, {
          day_of_week: addDays[0],
          start_time: addStart,
          end_time: addEnd,
          location: addLocation.trim(),
          max_students: maxStu,
          appointmentTypes: addApptTypes,
        });
        toast.success("Time slot updated.");
        setShowAddSlot(false);
        setSelectedDay(addDays[0]);
      } else {
        const results = await Promise.allSettled(
          addDays.map((day) =>
            api.post("/professor/availability", {
              day_of_week: day,
              start_time: addStart,
              end_time: addEnd,
              location: addLocation.trim(),
              max_students: maxStu,
              appointmentTypes: addApptTypes,
            })
          )
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length === 0) {
          toast.success(addDays.length > 1 ? "Time slots added." : "Time slot added.");
          setShowAddSlot(false);
          if (!selectedDay) setSelectedDay(addDays[0]);
        } else if (failed.length < addDays.length) {
          toast.error(`${failed.length} of ${addDays.length} day(s) failed to save.`);
          setShowAddSlot(false);
        } else {
          const msg = failed[0].reason?.response?.data?.message ?? "Failed to add time slot.";
          toast.error(msg);
        }
      }
      await fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to save time slot.";
      toast.error(msg);
    } finally { setAddSaving(false); }
  };

  // ── Delete slot ─────────────────────────────────────────────────────────────
  const requestDeleteSlot = (slot, day) => setDeleteTarget({ id: slot.availability_id, day, slot });

  const handleDeleteSlot = async () => {
    if (!deleteTarget) return;
    const { id, day } = deleteTarget;
    setDeleteSaving(true);
    try {
      await api.delete(`/professor/availability/${id}`);
      toast.success("Time slot removed.");
      await fetchAll();
      // If this was the last slot for the selected day, deselect it
      const remaining = (slotsByDay[day] ?? []).filter((s) => s.availability_id !== id);
      if (remaining.length === 0 && selectedDay === day) setSelectedDay(null);
      setDeleteTarget(null);
    } catch { toast.error("Failed to remove time slot."); }
    finally { setDeleteSaving(false); }
  };

  // ── Weekly schedule summary (days with slots, in week order) ────────────────
  const scheduledDays = DAYS.filter((d) => (slotsByDay[d] ?? []).length > 0);

  const selectedSlots = selectedDay ? (slotsByDay[selectedDay] ?? []) : [];

  return (
    <div className="dashboard-with-sidebar">
      <ProfessorSidebar />

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="sa-page">

          {/* Page Header */}
          <PageHeader
            breadcrumb={
              <Link to={cameFrom} className="breadcrumb-link">
                <ChevronLeft className="breadcrumb-icon" />
                {cameFromLabel}
              </Link>
            }
            icon={<CalendarIconNav />}
            iconClassName="sa-title-icon"
            title="Schedule Manager"
            subtitle="Set your weekly recurring availability by day. It repeats every week until you edit or remove it."
          />

          <button className="sa-action-btn sa-action-btn--primary" onClick={() => openAddSlot(selectedDay)}>
            <PlusIcon /> Add Time Slot
          </button>

          {/* Two-column layout: Weekly overview + Detail panel */}
          <div className="sa-main-layout">
            {/* Left: Weekly day list */}
            <div className="sa-calendar-card">
              <h2 className="sa-section-heading">Weekly Overview</h2>
              <p className="sa-section-desc">Select a day to view or manage its slots. Days with slots are highlighted.</p>
              <div className="sa-day-list">
                {loading ? (
                  <p className="sa-section-desc">Loading…</p>
                ) : (
                  DAYS.map((day) => {
                    const count = (slotsByDay[day] ?? []).length;
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`sa-day-btn${count > 0 ? " sa-day-btn--has-slots" : ""}${selectedDay === day ? " sa-day-btn--active" : ""}`}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className="sa-day-btn-name">{day}</span>
                        <span className="sa-day-btn-count">{count} slot{count !== 1 ? "s" : ""}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Detail panel */}
            <div className="sa-detail-panel">
              {selectedDay ? (
                <>
                  <div className="sa-detail-header-row">
                    <h2 className="sa-section-heading">{selectedDay}</h2>
                  </div>

                  {selectedSlots.length === 0 ? (
                    <div className="sa-detail-empty">
                      <p>No time slots set for {selectedDay}.</p>
                      <button className="sa-action-btn sa-action-btn--primary" onClick={() => openAddSlot(selectedDay)}>
                        <PlusIcon /> Add your first slot
                      </button>
                    </div>
                  ) : (
                    <div className="sa-slot-list">
                      {selectedSlots.map((s) => (
                        <div key={s.availability_id} className="sa-slot-card">
                          <div className="sa-slot-row">
                            <ClockIcon />
                            <span className="sa-slot-time">{fmt12(s.start_time)} – {fmt12(s.end_time)}</span>
                            {s.location && <span className="sa-slot-location">· {s.location}</span>}
                            <span className="sa-slot-location">· {s.max_students != null ? `Max ${s.max_students} students` : "Indefinite"}</span>
                            <div className="sa-slot-actions">
                              <button className="sa-edit-btn" onClick={() => openEditSlot(s, selectedDay)} title="Edit slot">
                                <PencilIcon />
                              </button>
                              <button className="sa-delete-btn" onClick={() => requestDeleteSlot(s, selectedDay)} title="Remove slot">
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                          {s.appointmentTypes?.length > 0 && (
                            <div className="sa-slot-types">
                              {s.appointmentTypes.map((t) => (
                                <span key={t.id} className="sa-preview-chip">{t.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="sa-detail-placeholder">
                  <CalendarIconNav />
                  <p>Select a day in the weekly overview to view or add time slots.</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Schedule Summary */}
          <div className="sa-weekly-section">
            <div className="sa-section-header-row">
              <div>
                <h2 className="sa-section-heading">Weekly Schedule Summary</h2>
                <p className="sa-section-desc">Your recurring availability across the week</p>
              </div>
            </div>

            {scheduledDays.length === 0 ? (
              <div className="sa-empty-upcoming">
                <p>No weekly availability set. Click a day above or use "Add Time Slot" to get started.</p>
              </div>
            ) : (
              <div className="sa-upcoming-list">
                {scheduledDays.map((day) => {
                  const slots = slotsByDay[day] ?? [];
                  return (
                    <div
                      key={day}
                      className={`sa-upcoming-item ${selectedDay === day ? "sa-upcoming-item--selected" : ""}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <div className="sa-upcoming-date-col">
                        <span className="sa-upcoming-date-label">{day}</span>
                        <span className="sa-upcoming-count">{slots.length} slot{slots.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="sa-upcoming-slots-col">
                        {slots.map((s) => (
                          <div key={s.availability_id} className="sa-upcoming-slot-chip">
                            <ClockIcon />
                            <span>{fmt12(s.start_time)} – {fmt12(s.end_time)}</span>
                            {s.location && <span className="sa-chip-location">· {s.location}</span>}
                            {s.max_students != null && <span className="sa-chip-location">· Max {s.max_students}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Add Time Slot Modal ── */}
      {showAddSlot && (
        <div className="sa-modal-overlay">
          <div className="sa-modal">
            <div className="sa-modal-header">
              <h3>{editingId ? "Edit Time Slot" : "Add Time Slot"}</h3>
              <p>{editingId ? "Update this recurring weekly slot" : "Set your recurring weekly availability"}</p>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-group">
                <label>{editingId ? "Day of Week *" : "Day(s) of Week *"}</label>
                {editingId ? (
                  <select
                    className="sa-input sa-select"
                    value={addDays[0] ?? ""}
                    onChange={(e) => setAddDays([e.target.value])}
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                ) : (
                  <div className="sa-day-checkbox-group">
                    {DAYS.map((day) => (
                      <label key={day} className={`sa-day-checkbox${addDays.includes(day) ? " checked" : ""}`}>
                        <input
                          type="checkbox"
                          checked={addDays.includes(day)}
                          onChange={() => toggleAddDay(day)}
                        />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                )}
                <p className="sa-field-hint">This time slot will repeat weekly on the selected day{editingId ? "" : "(s)"}.</p>
              </div>
              <div className="sa-form-row">
                <div className="sa-form-group">
                  <label>Start Time *</label>
                  <input className="sa-input" type="time" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
                </div>
                <div className="sa-form-group">
                  <label>End Time *</label>
                  <input className="sa-input" type="time" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
                </div>
              </div>
              <div className="sa-form-group">
                <label>Location *</label>
                <select
                  className="sa-input"
                  value={showOtherLocation ? "__other__" : addLocation}
                  onChange={(e) => {
                    if (e.target.value === "__other__") {
                      setShowOtherLocation(true);
                      setAddLocation("");
                    } else {
                      setShowOtherLocation(false);
                      setAddLocation(e.target.value);
                    }
                  }}
                >
                  <option value="">Select a location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}{loc.isGlobal ? " (Shared)" : ""}
                    </option>
                  ))}
                  <option value="__other__">Other (type your own)…</option>
                </select>
                {showOtherLocation && (
                  <input
                    className="sa-input"
                    style={{ marginTop: "8px" }}
                    type="text"
                    placeholder="Type the location name"
                    value={addLocation}
                    onChange={(e) => setAddLocation(e.target.value)}
                  />
                )}
              </div>
              <div className="sa-form-group">
                <label>Max Students *</label>
                <input
                  className="sa-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={addMaxStudents}
                  onChange={(e) => setAddMaxStudents(e.target.value)}
                />
                <p className="sa-field-hint">Students are assigned slots in order of booking (first come, first served).</p>
                {editingId && editingCurrentMaxBooked > 0 && (
                  <p className="sa-field-hint" style={{ color: "#f59e0b" }}>
                    {editingCurrentMaxBooked} student{editingCurrentMaxBooked === 1 ? "" : "s"} already booked on a future date — max can't go below this.
                  </p>
                )}
              </div>
              <div className="sa-form-group">
                <label>Appointment Types <span style={{ fontWeight: 400, color: "var(--text-tertiary)", fontSize: "0.78rem" }}>(optional · press Enter to add)</span></label>
                <div className={`sa-tag-input-box${addApptTypes.length > 0 ? " has-tags" : ""}`}>
                  {addApptTypes.map((tag) => (
                    <span key={tag} className="sa-tag-chip">
                      {tag}
                      <button type="button" className="sa-tag-remove" onClick={() => removeApptTag(tag)} aria-label={`Remove ${tag}`}>×</button>
                    </span>
                  ))}
                  <input
                    className="sa-tag-input"
                    type="text"
                    placeholder={addApptTypes.length === 0 ? "e.g. Thesis Consultation, Grade Inquiry…" : "Add another…"}
                    value={addApptInput}
                    onChange={(e) => setAddApptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitApptTag(); }
                      if (e.key === "Backspace" && !addApptInput && addApptTypes.length > 0) {
                        setAddApptTypes((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={commitApptTag}
                  />
                </div>
                <p className="sa-field-hint">Students will choose from these types when booking. Leave empty for no restriction.</p>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn sa-btn--outline" onClick={() => { setShowAddSlot(false); setEditingId(null); }}>Cancel</button>
              <button className="sa-btn sa-btn--primary" onClick={handleSaveSlot} disabled={addSaving}>
                {addSaving ? "Saving…" : editingId ? "Save Changes" : "Add Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Time Slot Confirmation ── */}
      <ActionConfirmModal
        show={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSlot}
        title="Remove Time Slot?"
        message={
          deleteTarget && (
            <>
              Remove the <strong>{fmt12(deleteTarget.slot.start_time)} – {fmt12(deleteTarget.slot.end_time)}</strong> slot on{" "}
              <strong>{deleteTarget.day}</strong>? This action cannot be undone.
            </>
          )
        }
        icon={<TrashIcon />}
        confirmText={deleteSaving ? "Removing…" : "Remove"}
        confirmDisabled={deleteSaving}
      />

    </div>
  );
}
