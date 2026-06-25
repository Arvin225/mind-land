## Purpose

L1 编辑点记忆 —— localStorage 按 docId 分 key、debounce 500ms 写入 + 卸载/失焦兜底、CM6 ready 后恢复、删稿纸时同步清理。

## Requirements

### Requirement: Cursor memory persisted per docId in localStorage
The editor SHALL persist cursor memory keyed `draft:cursor:<docId>` in `localStorage`, storing a JSON object `{ cursorPos, scrollTop, selection: { anchor, head }, foldedRanges, activeHeadingId, updatedAt }`. Each draft SHALL have its own key; memories are NOT shared across drafts.

#### Scenario: Two drafts have independent memories
- **WHEN** the user opens draft A, scrolls to line 100, switches to draft B, scrolls to line 50, then reopens draft A
- **THEN** draft A restores to line 100 (its own memory), not line 50

#### Scenario: Memory key is docId-scoped
- **WHEN** the editor writes cursor memory for draft 42
- **THEN** `localStorage.getItem("draft:cursor:42")` returns the JSON object and no other `draft:cursor:*` key is modified

### Requirement: Cursor memory records five fields
The editor SHALL record in each cursor memory entry: `cursorPos` (CodeMirror 6 document offset), `scrollTop` (viewport scroll position in pixels), `selection` (anchor and head offsets), `foldedRanges` (array of currently folded code/heading ranges), and `activeHeadingId` (identifier of the heading nearest the viewport top).

#### Scenario: All five fields are present
- **WHEN** the editor writes cursor memory for a draft with a selection spanning offsets 10..20, scroll position 350px, one folded range, and the nearest heading being "Section 2"
- **THEN** the stored JSON contains non-null values for `cursorPos`, `scrollTop`, `selection.anchor`, `selection.head`, `foldedRanges` (length 1), and `activeHeadingId`

### Requirement: Cursor memory writes are debounced 500ms with unload fallback
The editor SHALL debounce `localStorage.setItem` writes by 500ms after a cursor/scroll/selection/fold change. The editor SHALL additionally write the current memory on `beforeunload` and on React component unmount (whichever fires first), so a sudden close still persists the latest state.

#### Scenario: Continuous cursor movement coalesces writes
- **WHEN** the user moves the cursor 20 times within 500ms
- **THEN** at most one `localStorage.setItem` call is made for that window, containing the final cursor position

#### Scenario: Sudden close persists memory
- **WHEN** the user closes the browser tab immediately after moving the cursor, before the 500ms debounce fires
- **THEN** the `beforeunload` handler writes the latest cursor memory and `localStorage.getItem("draft:cursor:42")` returns the just-before-close state

### Requirement: Cursor memory restores after editor is ready
The editor SHALL restore cursor memory only after the CodeMirror 6 instance is created AND the document content is set. Restoring `scrollTop` before content is loaded would jump to the wrong position, so the restore order SHALL be: load content → set selection/cursor → set scrollTop.

#### Scenario: Restore order prevents wrong scroll jump
- **WHEN** the editor loads draft 42 which has memory `{ cursorPos: 5000, scrollTop: 1200 }`
- **THEN** the editor first sets the document text, then sets the selection to offset 5000, then sets `scrollTop` to 1200; the viewport lands on the correct line, not on line 1 + 1200px offset

#### Scenario: No memory starts at top
- **WHEN** the editor loads draft 42 and there is no `draft:cursor:42` key
- **THEN** the editor opens with the cursor at offset 0 and `scrollTop` 0

### Requirement: Cursor memory is cleared when its draft is deleted
The editor SHALL, when a draft is deleted (soft or permanent), remove the corresponding `draft:cursor:<docId>` key from `localStorage`. This applies to deletes initiated from the list view and from the editor's own delete action.

#### Scenario: Soft delete clears cursor memory
- **WHEN** the user soft-deletes draft 42 from the list
- **THEN** `localStorage.getItem("draft:cursor:42")` returns `null`

#### Scenario: Permanent delete clears cursor memory
- **WHEN** the user permanently deletes draft 42 from the recycle bin
- **THEN** `localStorage.getItem("draft:cursor:42")` returns `null`

#### Scenario: Restore does not resurrect cursor memory
- **WHEN** the user soft-deletes draft 42 (clearing its cursor memory) and later restores it
- **THEN** `localStorage.getItem("draft:cursor:42")` remains `null` until the user opens the draft and new cursor activity writes a fresh memory

### Requirement: Cursor memory is local-only and not synced to server
The editor SHALL NOT send cursor memory to the backend. Cursor memory is a single-device, single-session convenience and lives exclusively in `localStorage`. The backend has no `draft_cursor` table and no API endpoint for cursor memory.

#### Scenario: No network traffic for cursor memory
- **WHEN** the editor writes or reads cursor memory
- **THEN** no HTTP request is made to `/api/drafts/*` or any other endpoint on account of cursor memory

#### Scenario: No backend table for cursor memory
- **WHEN** the server is inspected after extended use of the draft module
- **THEN** the database contains no `draft_cursor` or similarly named table; only `drafts` exists
