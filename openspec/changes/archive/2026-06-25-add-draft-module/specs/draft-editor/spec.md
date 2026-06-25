## ADDED Requirements

### Requirement: CodeMirror 6 Typora-style block rendering
The editor SHALL render Markdown using CodeMirror 6 with a custom ViewPlugin that, for each Markdown block (heading, paragraph, blockquote, list, code block, hr, table, html_block) inside the visible viewport, replaces the block's line range with a rendered DOM widget via `Decoration.widget` when the block is not the active block. The active block (the block containing the cursor) and the cursor's line SHALL remain as editable Markdown source.

#### Scenario: Non-focused blocks render as HTML
- **WHEN** the document contains `# Title\n\nParagraph.\n\n- item` and the cursor is in the paragraph block
- **THEN** the heading line renders as an `<h1>` widget, the list line renders as a `<ul><li>` widget, and the paragraph lines remain as editable source

#### Scenario: Cursor line always stays as source
- **WHEN** the cursor is on a line that belongs to a block, even if that line is otherwise empty or at a block boundary
- **THEN** that line is rendered as editable Markdown source, not as a widget

#### Scenario: Block-level not line-level switching
- **WHEN** the cursor is in the middle line of a three-line paragraph
- **THEN** all three lines of that paragraph remain as editable source (no visual tear between rendered and source lines within one block)

### Requirement: Cursor approaches a rendered widget collapses it to source
The editor SHALL, when the cursor moves adjacent to (immediately before or after) a rendered block, immediately convert that block's widget back to source Markdown so the cursor can enter it. Arrow-key navigation into a widget SHALL land the cursor at the start (when entering from above) or end (when entering from below) of the block's source.

#### Scenario: Arrow down into a rendered heading
- **WHEN** the cursor is on the last line of a source paragraph immediately above a rendered `<h1>` widget and the user presses ArrowDown
- **THEN** the heading widget collapses to its `# Title` source form and the cursor lands at the start of that source line

#### Scenario: Arrow up into a rendered list
- **WHEN** the cursor is on the first line of a source paragraph immediately below a rendered `<ul>` widget and the user presses ArrowUp
- **THEN** the list block collapses to its source form and the cursor lands at the end of the last source line of that block

### Requirement: Selection spanning multiple blocks collapses all covered blocks
The editor SHALL, when a selection range spans more than one block, collapse every covered block to source Markdown. Only blocks entirely outside the selection remain rendered.

#### Scenario: Select across heading and paragraph
- **WHEN** the user selects text starting in a heading block and ending in the following paragraph block
- **THEN** both blocks render as source Markdown for the duration of the selection, and revert to widgets when the selection is cleared

### Requirement: Viewport-scoped decoration for performance
The editor SHALL build the block table and widget decorations only for lines within `view.visibleRanges` (plus a small buffer). Blocks outside the visible viewport SHALL not be decorated until they scroll into view. When the cursor jumps outside the visible viewport, the editor SHALL synchronously rebuild the block table for the new viewport before resolving the active block.

#### Scenario: Large document scrolls smoothly
- **WHEN** the document has 100,000 lines and the user scrolls continuously
- **THEN** the editor does not rebuild decorations for the entire document; only visible lines are processed, and scroll remains above 50 fps on a typical laptop

#### Scenario: Cursor jump to off-screen location
- **WHEN** the user invokes a jump (e.g. cursor memory restore) to a position 50,000 lines below the current viewport
- **THEN** the editor synchronously builds the block table for the new viewport and resolves the active block before painting, so the cursor lands in source (not inside a stale widget)

### Requirement: Block table built from markdown-it tokens with line mapping
The editor SHALL use `markdown-it` to parse the visible viewport's text into tokens with line mapping enabled, and build a block lookup table `[lineStart, lineEnd, blockType]` from those tokens. The cursor-to-block lookup SHALL use this table. The same parser instance SHALL be used for both block boundary detection and widget rendering, so the two never disagree.

#### Scenario: Cursor position resolves to a block
- **WHEN** the cursor is at document offset 500 and the block table contains an entry `[12, 18, paragraph]` covering line 14
- **THEN** resolving offset 500 to its line and looking up the table returns the paragraph block entry

#### Scenario: Parser consistency between boundaries and rendering
- **WHEN** the block table says lines 1-3 are a paragraph
- **THEN** the widget rendered for that block is the markdown-it HTML output of exactly lines 1-3, never a different range

### Requirement: Mouse click on a widget collapses that block
The editor SHALL, when the user clicks on a rendered widget, collapse that block to source Markdown and place the cursor at the click position (mapped from client coordinates via `posAtCoords`).

#### Scenario: Click in the middle of a rendered paragraph
- **WHEN** the user clicks at the horizontal middle of the second line of a rendered `<p>` widget
- **THEN** the paragraph collapses to source and the cursor lands at the character position nearest the click point

### Requirement: Required Markdown input rules
The editor SHALL implement the following input rules via CodeMirror 6 `inputHandler`:
- Typing `## ` (or any `#` repetition 1–6 followed by a space) at line start converts the line to a heading.
- Typing `**` auto-closes with `**` and places the cursor between.
- Typing `- ` or `* ` at line start converts the line to a list item.
- Typing `> ` at line start converts the line to a blockquote.
- Pressing Enter on a line whose only content is a list marker (`- `, `* `, or `1. `) exits the list (clears the marker instead of creating a new list item).
- Pressing Backspace at the start of an empty list item line exits the list (clears the marker).

#### Scenario: Heading shortcut
- **WHEN** the user types `## ` at the start of an empty line
- **THEN** the line becomes a level-2 heading source line `## ` and on next input the block re-renders as `<h2>` when blurred

#### Scenario: Bold auto-close
- **WHEN** the user types `**` in the middle of a paragraph
- **THEN** the editor inserts `****` and places the cursor between the two pairs

#### Scenario: Enter on empty list item exits list
- **WHEN** the cursor is on a line containing only `- ` and the user presses Enter
- **THEN** the marker is removed and the new line is a plain paragraph, not a new list item

#### Scenario: Backspace at start of empty list item exits list
- **WHEN** the cursor is at the start of the text on a line containing only `- ` and the user presses Backspace
- **THEN** the marker is removed and the line becomes a plain paragraph

### Requirement: Debounced 800ms autosave with version optimistic lock
The editor SHALL, whenever `content_md` changes, schedule a save after 800ms of inactivity. The save SHALL `PUT /api/drafts/:id` with the current `content_md` and the `base_version` of the document at load time (or the most recent confirmed version). While a save is in flight, further changes SHALL queue and trigger a new save after the in-flight one completes.

#### Scenario: Typing pauses then saves
- **WHEN** the user types continuously and then pauses for 800ms
- **THEN** exactly one `PUT` request is fired with the latest full `content_md` and the current `base_version`

#### Scenario: Continuous typing does not flood requests
- **WHEN** the user types continuously for 10 seconds without pausing
- **THEN** no more than one `PUT` request is fired per 800ms window, and pending changes coalesce into the next request

### Requirement: Save status indicator
The editor SHALL display a status dot in the top bar with four states: `saved` (green), `saving` (amber, pulsing), `unsaved` (orange), and `error` (gray). The state SHALL reflect the most recent save outcome.

#### Scenario: Status transitions through a save cycle
- **WHEN** the user edits, pauses 800ms (saving), and the server returns 200
- **THEN** the dot transitions `unsaved` → `saving` → `saved`

#### Scenario: Save error shows error state
- **WHEN** a save request fails (network error or 5xx)
- **THEN** the dot becomes `error` (gray) and remains until the next successful save

### Requirement: Version conflict prompts the user
The editor SHALL, on receiving HTTP 409 from `PUT /api/drafts/:id`, show a toast offering two choices: "Reload from server" (discard local changes, load `server_content_md` and `current_version`) and "Overwrite server" (re-`PUT` with the local `content_md` and `base_version = current_version`, accepting the risk of overwriting server changes). The save status SHALL show `error` until the user chooses.

#### Scenario: Reload from server
- **WHEN** a 409 response arrives and the user clicks "Reload from server"
- **THEN** the editor loads `server_content_md`, sets `base_version = current_version`, discards local edits, and the status dot returns to `saved`

#### Scenario: Overwrite server
- **WHEN** a 409 response arrives and the user clicks "Overwrite server"
- **THEN** the editor re-issues `PUT` with the local `content_md` and `base_version = current_version`; if that succeeds the status dot returns to `saved`

### Requirement: Word count in top bar
The editor SHALL display a character count of `content_md` (excluding Markdown syntax? — implementation MAY choose character count of plain text via markdown-it rendering; specification requires it be stable and update within 200ms of an edit). The count SHALL appear in the top bar.

#### Scenario: Word count updates after edit
- **WHEN** the user types 100 new characters and pauses
- **THEN** within 200ms the top bar count reflects the new total

### Requirement: Export draft as Markdown file
The editor SHALL provide a "Download .md" action (in the top bar menu) that downloads the current `content_md` as a file named `<title>.md` (falling back to `draft-<id>.md` when `title` is empty). The download SHALL happen client-side via a Blob, with no server round-trip.

#### Scenario: Export with a title
- **WHEN** the draft's derived title is `My Essay` and the user clicks "Download .md"
- **THEN** the browser downloads a file named `My Essay.md` containing the full `content_md`

#### Scenario: Export without a title
- **WHEN** the draft's derived title is empty (id 42) and the user clicks "Download .md"
- **THEN** the browser downloads a file named `draft-42.md`

### Requirement: Editor route is full-screen with no left sidebar
The editor at route `/draft/:id` SHALL occupy the full content area with no persistent left navigation panel. Navigation back to the list is via an explicit back control in the top bar.

#### Scenario: No left sidebar in editor
- **WHEN** the user is at `/draft/42`
- **THEN** the editor canvas spans the full width of the content area; no folder tree or draft list is visible alongside it

### Requirement: No empty-document placeholder
The editor SHALL NOT render any placeholder text on an empty document. An empty draft SHALL simply show an empty editable area.

#### Scenario: Empty draft shows no placeholder
- **WHEN** the user opens a draft with empty `content_md`
- **THEN** the editor area is empty with no "Start writing..." or similar text
