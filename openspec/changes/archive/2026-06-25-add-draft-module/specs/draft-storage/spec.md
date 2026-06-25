## ADDED Requirements

### Requirement: Drafts table schema
The system SHALL persist drafts in a `drafts` table with columns: `id` (INTEGER PK AUTOINCREMENT), `title` (TEXT NOT NULL DEFAULT ''), `content_md` (TEXT NOT NULL DEFAULT ''), `version` (INTEGER NOT NULL DEFAULT 1), `created_at` (DATETIME NOT NULL), `updated_at` (DATETIME NOT NULL), `deleted_at` (DATETIME nullable). The table SHALL be auto-migrated by GORM on startup.

#### Scenario: Fresh database auto-migrates drafts table
- **WHEN** the server starts against an empty SQLite file
- **THEN** GORM `AutoMigrate` creates the `drafts` table with all seven columns and `version` defaults to 1 for new rows

#### Scenario: Existing database keeps drafts data
- **WHEN** the server starts against a database that already has the `drafts` table
- **THEN** existing rows are preserved and no migration error is raised

### Requirement: Partial indexes for list and recycle bin queries
The system SHALL create a partial index `idx_drafts_updated_at` on `updated_at DESC` filtered by `deleted_at IS NULL`, and a partial index `idx_drafts_deleted` on `deleted_at` filtered by `deleted_at IS NOT NULL`.

#### Scenario: List query uses the active index
- **WHEN** the system queries `SELECT ... WHERE deleted_at IS NULL ORDER BY updated_at DESC`
- **THEN** the query planner uses `idx_drafts_updated_at`

#### Scenario: Recycle bin query uses the deleted index
- **WHEN** the system queries `SELECT ... WHERE deleted_at IS NOT NULL`
- **THEN** the query planner uses `idx_drafts_deleted`

### Requirement: Create draft
The system SHALL expose `POST /api/drafts` accepting an optional `content_md` string. On success it SHALL return `{ id, title, content_md, version, created_at, updated_at }` with `version = 1` and `deleted_at = null`.

#### Scenario: Create empty draft
- **WHEN** the client sends `POST /api/drafts` with no body
- **THEN** the system creates a draft with empty `content_md` and `title`, and returns the new record with `version = 1`

#### Scenario: Create draft with initial content
- **WHEN** the client sends `POST /api/drafts` with body `{ "content_md": "# Hello\n\nWorld" }`
- **THEN** the system stores the content and returns the record with `title` derived from the H1 and `version = 1`

### Requirement: List drafts excludes soft-deleted and omits full content
The system SHALL expose `GET /api/drafts` returning an array of `{ id, title, preview, updated_at }` for drafts where `deleted_at IS NULL`, ordered by `updated_at DESC`. The response MUST NOT include `content_md`.

#### Scenario: List returns drafts in recency order
- **WHEN** the client sends `GET /api/drafts` and the database has three active drafts with distinct `updated_at` values and one soft-deleted draft
- **THEN** the response contains exactly the three active drafts ordered by `updated_at DESC`, and none of them include a `content_md` field

#### Scenario: List with no drafts returns empty array
- **WHEN** the client sends `GET /api/drafts` and the database has no active drafts
- **THEN** the response body is `[]`

### Requirement: Get single draft
The system SHALL expose `GET /api/drafts/:id` returning the full draft `{ id, title, content_md, version, created_at, updated_at }` for an active draft.

#### Scenario: Get existing draft
- **WHEN** the client sends `GET /api/drafts/42` and draft 42 exists with `deleted_at IS NULL`
- **THEN** the response includes the full `content_md` and current `version`

#### Scenario: Get non-existent draft
- **WHEN** the client sends `GET /api/drafts/9999` and no draft with id 9999 exists
- **THEN** the system returns 404

#### Scenario: Get soft-deleted draft
- **WHEN** the client sends `GET /api/drafts/42` and draft 42 has `deleted_at` set
- **THEN** the system returns 404

### Requirement: Update draft with optimistic version lock
The system SHALL expose `PUT /api/drafts/:id` accepting `{ content_md, base_version }`. It SHALL increment `version` by 1 only when `base_version` equals the current `version` of the stored row. On success it returns `{ id, title, version, updated_at }`.

#### Scenario: Successful update increments version
- **WHEN** the client sends `PUT /api/drafts/42` with `{ "content_md": "new text", "base_version": 3 }` and the stored draft has `version = 3`
- **THEN** the system stores the new content, sets `version = 4`, updates `updated_at`, re-derives `title`, and returns `{ id: 42, title: <derived>, version: 4, updated_at: <new> }`

#### Scenario: Version conflict returns 409 with server content
- **WHEN** the client sends `PUT /api/drafts/42` with `base_version = 3` and the stored draft has `version = 5`
- **THEN** the system returns HTTP 409 with body `{ "error": "version_conflict", "current_version": 5, "server_content_md": "<stored content>" }` and does NOT modify the stored row

#### Scenario: Update on soft-deleted draft returns 404
- **WHEN** the client sends `PUT /api/drafts/42` and draft 42 has `deleted_at` set
- **THEN** the system returns 404 and does not modify the row

### Requirement: Title is derived from content by the server
The system SHALL derive `title` from `content_md` on every create and update using this rule: take the text of the first H1 heading; if no H1, take the first non-empty line with Markdown syntax stripped; if content is empty, `title` is the empty string. The client MUST NOT be trusted to send `title`.

#### Scenario: Title from H1
- **WHEN** the system stores content `# My Essay\n\nbody text`
- **THEN** the stored `title` is `My Essay`

#### Scenario: Title from first non-empty line when no H1
- **WHEN** the system stores content `Some opening line\n\nmore text`
- **THEN** the stored `title` is `Some opening line`

#### Scenario: Title empty when content empty
- **WHEN** the system stores content ``
- **THEN** the stored `title` is ``

#### Scenario: Title strips inline markdown syntax
- **WHEN** the system stores content `Hello **world** and [link](x)`
- **THEN** the stored `title` is `Hello world and link`

### Requirement: List preview is derived from first paragraph plain text
The system SHALL derive the `preview` field for list responses from the first paragraph's plain text (markdown syntax stripped), truncated to 120 characters with an ellipsis when longer. H1 headings SHALL be skipped when extracting preview (the title already covers them).

#### Scenario: Preview from first paragraph
- **WHEN** the system lists a draft whose content is `# Title\n\nFirst paragraph here.\n\nSecond paragraph.`
- **THEN** the `preview` field is `First paragraph here.`

#### Scenario: Preview truncates with ellipsis
- **WHEN** the system lists a draft whose first paragraph is 200 characters long
- **THEN** the `preview` field is the first 120 characters followed by `…`

#### Scenario: Preview empty when only H1
- **WHEN** the system lists a draft whose content is `# Title only`
- **THEN** the `preview` field is the empty string

### Requirement: Soft delete and recycle bin
The system SHALL implement soft delete: `DELETE /api/drafts/:id` sets `deleted_at` to the current timestamp without removing the row. It SHALL expose `PATCH /api/drafts/:id/restore` to clear `deleted_at`, `DELETE /api/drafts/:id/permanent` to physically remove the row, and `DELETE /api/drafts/trash` to permanently remove all rows where `deleted_at IS NOT NULL`.

#### Scenario: Soft delete moves draft to recycle bin
- **WHEN** the client sends `DELETE /api/drafts/42` on an active draft
- **THEN** the system sets `deleted_at` to the current timestamp and returns 200; subsequent `GET /api/drafts/42` returns 404

#### Scenario: Restore reactivates a soft-deleted draft
- **WHEN** the client sends `PATCH /api/drafts/42/restore` on a soft-deleted draft
- **THEN** the system clears `deleted_at` and subsequent `GET /api/drafts/42` returns the draft

#### Scenario: Permanent delete removes the row
- **WHEN** the client sends `DELETE /api/drafts/42/permanent` on a soft-deleted draft
- **THEN** the row is physically removed from the `drafts` table

#### Scenario: Empty trash removes only soft-deleted rows
- **WHEN** the client sends `DELETE /api/drafts/trash` and the database has 2 soft-deleted drafts and 3 active drafts
- **THEN** only the 2 soft-deleted rows are physically removed; the 3 active drafts remain

#### Scenario: Permanent delete on active draft returns 409
- **WHEN** the client sends `DELETE /api/drafts/42/permanent` on an active (non-deleted) draft
- **THEN** the system returns 409 and does not modify the row

### Requirement: Package structure follows existing module convention
The system SHALL implement the draft backend in a new `mind-land-server/draft/` package containing `model.go` (GORM `Draft` struct), `service.go` (CRUD + title/preview derivation + version check), and `handler.go` (Gin handlers). It SHALL follow the flat handler+service+model pattern used by `slipbox/`, `todo/`, and `outline/`.

#### Scenario: Package layout matches convention
- **WHEN** the implementation is complete
- **THEN** the `mind-land-server/draft/` directory contains exactly `model.go`, `service.go`, and `handler.go`, and `main.go` registers `&draft.Draft{}` in `AutoMigrate` and mounts the `/api/drafts` route group
