
## 2024-04-01 - Cleaned up App Header Nav Toggles
**Learning:** Hard-coded inline styles with hover event listeners (`onMouseEnter` / `onMouseLeave`) on dynamic UI buttons block proper CSS pseudo-classes. When CSS `:focus-visible` states were absent, keyboard accessibility on layout toggles (like "Theme" and "Sidebar") was extremely poor and almost invisible to keyboard navigation.
**Action:** Always replace programmatic hover interactions with pure CSS classes (like `.app-header-btn:hover`) when working on dynamic buttons. Doing so enables clean, consistent focus states via `:focus-visible` and reduces JavaScript bloat, while natively improving accessibility and ease of adding proper `aria-` attributes.
