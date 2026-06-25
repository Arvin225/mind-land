## ADDED Requirements

### Requirement: List view and editor view are separate routes
The draft module SHALL expose two routes: `/draft` for the list view and `/draft/:id` for the editor view. The list view SHALL be a full-screen list with no editor; the editor view SHALL be a full-screen editor with no persistent list panel. The two views are mutually exclusive at the route level.

#### Scenario: List route shows no editor
- **WHEN** the user navigates to `/draft`
- **THEN** the page shows the draft list and no CodeMirror editor is mounted

#### Scenario: Editor route shows no list
- **WHEN** the user navigates to `/draft/42`
- **THEN** the page shows the editor for draft 42 and no draft list is visible

### Requirement: List shows title, preview, and updated time
The list view SHALL render each draft as a row containing: the draft's `title` (or "无标题" when title is empty), the `preview` text from the server, and the `updated_at` timestamp. Rows SHALL be ordered by `updated_at` descending (most recent first), matching the server's list order.

#### Scenario: Row contents
- **WHEN** the list view renders a draft with title `My Essay`, preview `First paragraph here.`, and `updated_at` 2024-03-15
- **THEN** the row displays all three values: the title, the preview text, and a human-readable form of the timestamp

#### Scenario: Empty title shows fallback
- **WHEN** the list view renders a draft whose `title` is empty
- **THEN** the row's title slot shows `无标题`

#### Scenario: Most recent first
- **WHEN** the list view renders drafts with `updated_at` values 2024-03-15, 2024-03-10, 2024-03-20
- **THEN** the rows appear in order 2024-03-20, 2024-03-15, 2024-03-10

### Requirement: New draft button and empty state
The list view SHALL show a "新建稿纸" button at the top of the list. When the list is empty (no active drafts), the view SHALL show a large centered empty-state button that also creates a new draft.

#### Scenario: Top button when drafts exist
- **WHEN** the list view renders with one or more drafts
- **THEN** a "新建稿纸" button is visible at the top of the list

#### Scenario: Empty state button when no drafts
- **WHEN** the list view renders with zero active drafts
- **THEN** the view shows a large centered button (e.g. "开始第一篇稿纸") that, when clicked, creates a new draft

#### Scenario: Creating a draft navigates to the editor
- **WHEN** the user clicks either new-draft button and the `POST /api/drafts` call returns the new draft with id 43
- **THEN** the router navigates to `/draft/43`

### Requirement: Open draft navigates to editor
The list view SHALL, when a row is clicked, navigate to `/draft/:id` for that draft's id.

#### Scenario: Click a row
- **WHEN** the user clicks the row for draft 42
- **THEN** the router navigates to `/draft/42`

### Requirement: Row actions for rename and delete
Each list row SHALL expose a menu (triggered by a three-dot button or right-click) with at least two actions: "重命名" and "删除". Because the title is derived from content (see draft-storage), "重命名" SHALL navigate to the editor and focus the H1 / first line; "删除" SHALL call the soft-delete endpoint and remove the row from the list.

#### Scenario: Rename navigates to editor and focuses title source
- **WHEN** the user opens the row menu for draft 42 and clicks "重命名"
- **THEN** the router navigates to `/draft/42` and the editor places the cursor on the first line (the H1 or first non-empty line) so the user can edit it

#### Scenario: Delete soft-deletes and removes the row
- **WHEN** the user opens the row menu for draft 42 and clicks "删除" and confirms
- **THEN** the client calls `DELETE /api/drafts/42`, the row is removed from the visible list, and the corresponding `draft:cursor:42` localStorage key is cleared (per draft-cursor-memory spec)

### Requirement: List reflects creates and deletes without manual reload
The list view SHALL, after a successful create or delete, update its visible rows from the API response or by re-fetching the list. The user SHALL NOT need to manually refresh the page to see the change.

#### Scenario: New draft appears at top
- **WHEN** a new draft is created from the list view
- **THEN** the new draft appears at the top of the list (most recent `updated_at`)

#### Scenario: Deleted draft disappears
- **WHEN** a draft is soft-deleted from the list view
- **THEN** that draft's row is no longer in the visible list

### Requirement: Routes registered in router
The draft module's two routes SHALL be registered in `mind-land-web/src/router/index.tsx` alongside the existing routes, lazy-loading the Draft page component. The existing `/draft` placeholder route SHALL be replaced (not duplicated) by these two routes.

#### Scenario: Router has both draft routes
- **WHEN** the router configuration is inspected after the change
- **THEN** exactly one `/draft` route and exactly one `/draft/:id` route exist, both lazy-loading the Draft module, and no separate placeholder `/draft` route remains
