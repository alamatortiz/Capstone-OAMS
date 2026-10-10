# Submittal Feature — Implementation Spec (reverted, kept for future re-implementation)

## Status
This feature was fully implemented and verified end-to-end (2026-07-07), then **reverted at the user's request** to keep the branch clean. This doc is a complete, self-contained spec so a fresh agent can rebuild it later without re-deriving the design. All file paths, schemas, and endpoints below were verified against the actual running app before revert.

## Context / why this exists
OAMS objective 2.3 is "streamline document/form requests/submittals for students and teachers alike." The **requests** half (a user asks the school to *issue* a document — COR, TOR, certificate) was already fully built: `client/src/pages/student/stud-documents.jsx`, `client/src/pages/professor/prof-documents.jsx`, `client/src/pages/admin/AdminDocumentProcessing.jsx`, backed by `document_services`/`document_requirements`/`document_requests`/`faculty_document_requests` tables.

The **submittals** half — a student/professor *uploading* a file to satisfy something the school asked for (e.g. "submit your COR", "submit your clearance form") — did not exist. The existing "scan document" feature (`admin_scan_document.jsx`, `qr_tracking_logs`) is unrelated: it's an admin-side release-verification scanner for *already-issued* documents, not a student upload mechanism. Confirmed via full codebase search: no `multer`, no `<input type="file">`/`FormData` usage, no upload-related tables existed anywhere before this feature.

**Desired shape (from the user):** Admin posts a submission requirement and picks who it's for (students/faculty/both, department-scoped or all-departments, optional deadline). Students/professors see open requirements as a **new tab inside their existing Documents page** (not a new sidebar item/route) and upload a file against it. Admin reviews uploads in a new "Submittals" view inside the existing Document Processing page and approves/rejects with remarks.

## Database schema

Add to `server/oams_db.sql` (after the `faculty_document_requests` table, before the "Schema definition ends here" marker):

```sql
CREATE TABLE submission_requirements (
    submission_id    INT          AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(150) NOT NULL,
    description      TEXT         NOT NULL,
    department_id    INT          NULL,   -- NULL = available across all departments
    recipient_type   ENUM('students','faculty','both') NOT NULL DEFAULT 'students',
    deadline         DATE         NULL,   -- NULL = no deadline
    status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by       INT          NOT NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by)    REFERENCES administrators(admin_id),
    INDEX idx_submission_requirements_dept (department_id)
);

CREATE TABLE submission_uploads (
    upload_id          INT          AUTO_INCREMENT PRIMARY KEY,
    submission_id      INT          NOT NULL,
    uploader_id        INT          NOT NULL,   -- = users.user_id (student_id or faculty_id)
    uploader_role      ENUM('student','faculty') NOT NULL,
    original_filename  VARCHAR(255) NOT NULL,   -- display only, never used to build a path
    stored_filename    VARCHAR(255) NOT NULL,   -- UUID-based name actually on disk
    file_size          INT          NOT NULL,   -- bytes
    mime_type          VARCHAR(100) NOT NULL,
    status             ENUM('submitted','approved','rejected') NOT NULL DEFAULT 'submitted',
    admin_remarks      TEXT         NULL,
    reviewed_by        INT          NULL,
    reviewed_at        TIMESTAMP    NULL,
    submitted_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submission_requirements(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id)   REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by)   REFERENCES administrators(admin_id) ON DELETE SET NULL,
    UNIQUE KEY uq_submission_uploader (submission_id, uploader_id),
    INDEX idx_submission_uploads_status (status)
);
```

Design notes:
- PK named `submission_id`, not `requirement_id` — avoids collision/confusion with the unrelated pre-existing `document_requirements.requirement_id`.
- `UNIQUE KEY (submission_id, uploader_id)`: one upload slot per user per requirement. Resubmission after rejection uses `INSERT ... ON DUPLICATE KEY UPDATE`, deleting the old physical file first, and resets `status` back to `'submitted'` / clears `admin_remarks`/`reviewed_by`/`reviewed_at`.
- Scoping convention (`department_id` nullable + `recipient_type` enum) deliberately mirrors `document_services`, resolved server-side via the existing `getAdminDepartmentId(adminId)` helper already defined in `adminRoutes.js`.
- On an already-running dev DB (not a fresh Docker volume), apply the two `CREATE TABLE` statements manually — `docker-entrypoint-initdb.d` only runs once per fresh `mysql_data` volume:
  ```
  docker compose exec -T db mysql -u root -pAkosimatt123 oams_db <<'EOF'
  -- paste the two CREATE TABLE statements here
  EOF
  ```

## Backend

### New dependency
`npm install multer` in `server/` (was not previously a dependency).

**Docker gotcha:** `docker-compose.yml`'s `server` service uses `volumes: [./server:/app, /app/node_modules]`. The second entry is an **anonymous volume** — after `docker compose build server`, a plain `docker compose up -d server` reuses the *old* anonymous volume (without multer) instead of the freshly-built image's `node_modules`. You must force-recreate it:
```
docker compose up -d --force-recreate -V server
```
(`-V` recreates anonymous volumes.) Otherwise you'll hit `Error: Cannot find module 'multer'` on boot.

### New middleware — `server/middleware/upload.js`
```js
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "submissions");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_EXT = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Never derive the on-disk name from the client-supplied original
    // filename - prevents path traversal / double-extension tricks.
    const ext = MIME_EXT[file.mimetype] || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) {
      return cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR };
```

Add `server/uploads/` to root `.gitignore` (uploaded files should never be committed).

### Date-formatting gotcha (important — a real bug was found and fixed)
`mysql2` parses `DATE` columns into JS `Date` objects representing **local midnight** (using the Node process's `TZ`, which is `Asia/Manila`/UTC+8 per `docker-compose.yml`). If you format them with `date.toISOString().split("T")[0]` (the pattern already used elsewhere in this codebase for `appointment_date`), the UTC conversion shifts the date back by one day — e.g. a stored `2026-12-31` becomes `"2026-12-30"`. This bug already exists in a few pre-existing call sites (`appointment_date` formatting in `studentRoutes.js`/`adminRoutes.js`/`facultyRoutes.js`) but **do not copy that pattern for `deadline`.** Use local getters instead:
```js
function formatDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).split("T")[0];
}
```
Add this helper near the top of `adminRoutes.js`, `studentRoutes.js`, and `facultyRoutes.js` (each file needs its own copy — no shared utils module exists for route helpers in this codebase) and use `formatDateOnly(r.deadline)` instead of the `instanceof Date ? toISOString()... : ...` ternary.

### `adminRoutes.js` — new routes
Add near top: `const path = require("path"); const fs = require("fs"); const { upload, UPLOAD_DIR } = require("../middleware/upload");`

Insert before `module.exports = router;`, following the exact `document-types` CRUD pattern already in the file (same `logAudit(...)` calls, same `getAdminDepartmentId(req.user.userId)` scoping):

| Method | Path | Notes |
|---|---|---|
| GET | `/data-management/submission-requirements?status=` | scoped `WHERE (department_id = ? OR department_id IS NULL)`, includes `uploadCount` subquery |
| POST | `/data-management/submission-requirements` | body `{ title, description, deadline, status, scope, recipientType }` |
| PUT | `/data-management/submission-requirements/:id` | same body |
| DELETE | `/data-management/submission-requirements/:id` | **409** if `uploadCount > 0` — message: "Cannot delete a requirement with existing submissions. Set it to Inactive instead." |
| GET | `/submission-review?status=&role=&submissionId=` | review queue; joins `submission_uploads` → `submission_requirements` → `students`/`faculty` (by `uploader_role`) for display name/identifier |
| PATCH | `/submission-review/:uploadId/status` | body `{ status: 'approved'|'rejected', remarks }`; sets `reviewed_by`, `reviewed_at = NOW()` |
| GET | `/submission-review/:uploadId/file` | **authenticated** download, dept-scope checked, resolves `stored_filename` against the fixed `UPLOAD_DIR` and rejects if the resolved path escapes it. `res.download(resolvedPath, original_filename)` |

All routes: `authenticateToken, authorizeRoles("admin")`.

### `studentRoutes.js` — new routes
Mirrors the existing `SELECT department_id FROM students WHERE student_id = ?` pattern (already used at the `/documents/service-types` route).

| Method | Path | Notes |
|---|---|---|
| GET | `/submissions` | requirements where `(department_id = studentDept OR department_id IS NULL) AND recipient_type IN ('students','both') AND status='active'`, `LEFT JOIN submission_uploads` on `uploader_id = studentId` to surface own status inline |
| POST | `/submissions/:submissionId/upload` | `authenticateToken, authorizeRoles("student"), upload.single("file")` — re-validates the requirement is visible/active server-side (never trust the id blindly), `INSERT ... ON DUPLICATE KEY UPDATE`, deletes old physical file first if replacing |
| GET | `/submissions/:uploadId/file` | own file only — `WHERE upload_id = ? AND uploader_id = req.user.userId`, else 403 |

### `facultyRoutes.js` — new routes
Identical shape, `recipient_type IN ('faculty','both')`, `uploader_role='faculty'`, using the existing `SELECT department_id FROM faculty WHERE faculty_id = ?` pattern.

| Method | Path |
|---|---|
| GET | `/submissions` |
| POST | `/submissions/:submissionId/upload` |
| GET | `/submissions/:uploadId/file` |

**No `express.static` was added anywhere** — uploaded files may be sensitive (IDs, personal forms), so all downloads go through authenticated, ownership/scope-checked routes only.

## Frontend

### Shared component — `client/src/components/FileUploadInput.jsx` (+ `.css`)
Dumb file-picker + submit control. Props: `onUpload(file)` (async, caller owns the endpoint/refresh logic since student/faculty hit different routes), `uploading` (bool), `accept` (default `.pdf,.jpg,.jpeg,.png`), `submitLabel`. Uses `useId()` (not `Math.random()`) for the hidden input's `id` — React's purity rules flag `Math.random()` calls during render.

### Student — third tab in `client/src/pages/student/stud-documents.jsx`
This page already has a local `useState("active")` tab switcher with `.doc-tabs-container`/`.doc-tabs-list`/`.doc-tab`/`.doc-tab-count` CSS classes, tabs "Active Requests" / "Completed". Add a third tab **"Submittals"**:
- New state: `submissions`, `submissionsLoading`, `uploadingSubmissionId`.
- Fetch `GET /student/submissions` on mount (separate `useEffect`, same pattern as the existing `fetchDocuments` effect).
- `handleSubmissionUpload(submissionId, file)`: builds `FormData`, `api.post('/student/submissions/:id/upload', formData)` — axios auto-sets the multipart boundary when the body is a `FormData` instance, no header configuration needed (confirmed: `client/src/utils/api.js` doesn't hardcode `Content-Type`).
- `handleDownloadSubmission(uploadId, filename)`: `api.get(url, { responseType: 'blob' })` → `URL.createObjectURL` → synthetic `<a download>` click → `revokeObjectURL`.
- Badge mapping reuses existing `.doc-badge-*` CSS classes: no upload → `doc-badge-pending` ("Not Submitted"); `submitted` → `doc-badge-processing` ("Under Review"); `approved` → `doc-badge-ready` ("Approved"); `rejected` → `doc-badge-rejected` ("Rejected").
- Card shows deadline (flag overdue in red-ish tracking style if past and no upload yet), description, rejection remarks if any, a download link for the current upload, and the `FileUploadInput` control (shown when no upload yet or when rejected, with `submitLabel="Resubmit"` in the rejected case).

### Professor — third tab in `client/src/pages/professor/prof-documents.jsx`
Identical structure, hitting `/faculty/submissions*`. **Gotcha:** this file does NOT already define a `DownloadIcon` (unlike `stud-documents.jsx`) — add one (copy from `stud-documents.jsx`) before using it in the download button.

### Admin — new tab in `client/src/pages/admin/admin_data_management.jsx`
This page has tabs "Document Settings" / "Service Settings" / "Audit Logs" (`activeTab` state, `.adm-tabs-bar`/`.adm-tab-btn`/`.adm-tab-content` classes) and a well-established modal CRUD pattern for `document-types` (scope radio: My Department/All Departments → nullable `department_id`; `recipientType` select). Add a 4th tab **"Submission Requirements"**, positioned before "Audit Logs":
- New state mirrors the `documentTypes` state block: `submissionReqs`, `subLoading`, `subStatusFilter`, `showSubModal`, `editingSub`, `subForm` (`{ title, description, deadline, status, scope: "department", recipientType: "students" }`), `subSaving`.
- Modal reuses the exact Document Type modal's Title/Description/Status/Availability-scope/Available-To fields, but swaps the Fee/Processing-Time grid for a single `<input type="date">` Deadline field, and **omits** the Requirements sub-list editor entirely (not needed for this concept).
- List item reuses `.adm-item`/`.adm-item-badges` styling; shows deadline (or "No deadline") and `{uploadCount} submission(s) received` in the meta row.
- Delete handler surfaces the backend's 409 response via `toast.error`, suggesting "Set it to Inactive instead."

### Admin — "Submittals" view in `client/src/pages/admin/AdminDocumentProcessing.jsx`
This page currently has no page-level tabs (only a student/faculty **source toggle** for document *requests*). Add a `viewMode` state (`"requests" | "submittals"`) rendered as a small tab bar (reusing `.adp-tabs`/`.adp-tab` classes) above the existing source toggle:
- `"requests"`: existing content unchanged, wrapped in `{viewMode === "requests" && (<>...</>)}`.
- `"submittals"`: its own role toggle (Students/Faculty, reusing `.adp-source-toggle`/`.adp-source-btn`), status tabs (`all|submitted|approved|rejected`, reusing `.adp-tabs`), and a list (reusing `.adp-doc-card` markup) showing uploader name/id, requirement title, filename, status badge, submitted date. "View & Process" opens a modal (reusing `.adp-modal`) with a Download button (blob-fetch + synthetic click, same technique as the student page), a remarks textarea, and Approve/Reject buttons that `PATCH /admin/submission-review/:uploadId/status`.
- New badge status meta: `submitted` → `adp-badge-processing` ("Under Review"); `approved` → `adp-badge-completed` ("Approved"); `rejected` → `adp-badge-rejected` ("Rejected").

## Security checklist (all verified working before revert)
- Mimetype + size validated server-side via multer (`fileFilter` whitelist, `limits.fileSize`) — never trust client-reported extension.
- Stored filenames are `crypto.randomUUID()`-based, never derived from user input (path traversal prevention).
- Department/recipient-type scoping enforced in SQL `WHERE` clauses server-side (tested: a student outside the requirement's department, or a faculty-only requirement, correctly does not appear for students).
- All file downloads require authentication + ownership/scope check; no `express.static` directory anywhere for uploads.
- Cross-user file access returns 403 (tested: student B requesting student A's `uploadId` via `/student/submissions/:uploadId/file`).
- Delete-with-existing-uploads returns 409 with a guidance message rather than silently orphaning files/history.

## Verification steps (all passed via direct API testing before revert)
1. Admin creates a requirement (students, own department, future deadline) → lists with 0 submissions, correct deadline (post date-fix).
2. Student in-scope sees it in the new Submittals tab; student out-of-scope (wrong department, or a faculty-only requirement) does not.
3. Student uploads a PDF → `201`, appears on disk under `server/uploads/submissions/<uuid>.pdf`, status `submitted`.
4. Admin review queue shows it; admin downloads it (`200`, correct byte size); approves with a remark.
5. Student sees `approved` + remark.
6. Faculty flow repeated in parallel (own department, `recipientType: 'faculty'`) including a reject → resubmit cycle (file replaced, status flips back to `submitted`).
7. Cross-user download attempt → `403`. Delete-with-uploads attempt → `409`.
8. `npm run build` (client) and `eslint` both clean on all touched files.

## Files touched (for reference — all were reverted after this doc was written)
- `server/oams_db.sql` (new tables)
- `server/middleware/upload.js` (new)
- `server/routes/adminRoutes.js`, `server/routes/studentRoutes.js`, `server/routes/facultyRoutes.js`
- `server/package.json` / `server/package-lock.json` (added `multer`)
- `client/src/pages/admin/admin_data_management.jsx`, `client/src/pages/admin/AdminDocumentProcessing.jsx`
- `client/src/pages/student/stud-documents.jsx`, `client/src/pages/professor/prof-documents.jsx`
- `client/src/components/FileUploadInput.jsx` (new), `client/src/components/FileUploadInput.css` (new)
- `.gitignore` (added `server/uploads/`)
