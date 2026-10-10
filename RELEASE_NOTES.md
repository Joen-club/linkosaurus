## 🦕 Faster linking, and links you can take back

### ⏪ Changed your mind? Press Backspace

Backspace right after an auto-link turns it back into the word you typed, and Linkosaurus won't link that spot again. This works for swiped and dictated words on mobile too. Ctrl/Cmd+Z now undoes just the link, not the whole sentence you typed before it.

### 🚫 Keep Linkosaurus out of some notes

- **Never link inside these folders:** a new setting for folders whose notes are never changed, not while typing and not by the commands.
- **Per note:** add the property `linkosaurus: false`.
- Excalidraw and Kanban notes are always left alone.

### 🗂️ Link the whole vault, with a preview and undo

"Auto-link keywords in all notes" now shows a preview first ("M links in N notes") and a progress bar while it runs. The new command **Undo last vault-wide link** puts back every note you haven't edited since.

### ⚡ Faster

- No more full vault rescan on every autosave. Only notes whose name, aliases or links changed are looked at again.
- Matching, the search popup and the settings fields stay smooth in large vaults.
- The periodic relink skips notes that haven't changed and gives the editor room to breathe while it works.

### 🐛 Fixes

- Enter after a keyword continues lists, checkboxes and quotes again.
- No more links inside `#tags`, frontmatter, `%%comments%%`, math, callout headers, HTML and code blocks (including code blocks inside list items).
- A stray backtick no longer stops linking for the rest of the note.
- Manual targets keep their folder and heading: `ML = AI/Machine Learning#Basics`. A keyword like `C#` with no target becomes `[[C|C#]]` and never points at a heading.
- Properties: checkboxes and booleans are never linked, dates and numbers only when a note has exactly that name, and prefix completion needs at least three characters.
- URLs and email addresses link on paste and dictation even if you have no keywords.
- The URL and relink settings no longer disappear when vault link detection is off.
- Notes opened in a hover preview or an embed follow their own opt-out, not the opt-out of the note in the main pane.

Happy linking. 🦕
