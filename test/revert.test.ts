import test from "node:test";
import assert from "node:assert/strict";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { isolateHistory } from "@codemirror/commands";
import AutoLinkKeywordsPlugin from "../src/main";

// A stand-in for EditorView: enough state and dispatch for the typing path,
// with the plugin's update listener called the way CodeMirror would.
function setup(keywords: string, doc: string) {
	const p = new AutoLinkKeywordsPlugin(
		{ workspace: { getActiveFile: () => null } } as never,
		{} as never
	);
	Object.assign(p.settings, { scanVaultLinks: false, keywordList: keywords });
	p.rebuildFoldTable();
	p.parseBlocklist();
	p.parseManualKeywords();
	p.parseTlds();
	const internals = p as unknown as {
		handleInput(v: unknown, from: number, to: number, text: string): boolean;
		revertAutolink(v: unknown): boolean;
		handleEditorUpdate(v: unknown, docChanged: boolean, sel: boolean, changes: unknown): void;
	};
	const specs: TransactionSpec[] = [];
	const view = {
		state: EditorState.create({ doc, selection: { anchor: doc.length } }),
		composing: false,
		compositionStarted: false,
		dispatch(spec: TransactionSpec) {
			specs.push(spec);
			const tr = this.state.update(spec);
			this.state = tr.state;
			internals.handleEditorUpdate(this, tr.docChanged, true, tr.changes);
		},
	};
	// Typing a character the plugin does not take is inserted by "CodeMirror".
	const type = (text: string) => {
		const pos = view.state.selection.main.head;
		if (!internals.handleInput(view, pos, pos, text)) {
			view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } });
		}
	};
	return { view, type, internals, specs };
}

test("an auto-link is its own undo step", () => {
	const { type, specs, view } = setup("Berlin", "Trip to Berlin");
	type(" ");
	assert.equal(view.state.doc.toString(), "Trip to [[Berlin]] ");
	assert.equal(specs.length, 1);
	assert.equal(specs[0]!.userEvent, "input.autolink");
	const ann = specs[0]!.annotations;
	assert.ok(ann && !Array.isArray(ann) && ann.type === isolateHistory);
});

test("Backspace right after a link restores the typed word", () => {
	const { type, internals, view } = setup("Berlin", "Trip to Berlin");
	type(" ");
	assert.equal(internals.revertAutolink(view), true);
	assert.equal(view.state.doc.toString(), "Trip to Berlin ");
	assert.equal(view.state.selection.main.head, "Trip to Berlin ".length);
	// A second Backspace is an ordinary one.
	assert.equal(internals.revertAutolink(view), false);
});

test("a taken-back link is not created again at the same place", () => {
	const { type, internals, view } = setup("Berlin", "Trip to Berlin");
	type(" ");
	internals.revertAutolink(view);
	// Delete the space and type it again.
	const end = view.state.doc.length;
	view.dispatch({ changes: { from: end - 1, to: end }, selection: { anchor: end - 1 } });
	type(" ");
	assert.equal(view.state.doc.toString(), "Trip to Berlin ");
	// Elsewhere the keyword still links.
	type("and Berlin");
	type(" ");
	assert.equal(view.state.doc.toString(), "Trip to Berlin and [[Berlin]] ");
});

test("Backspace does nothing special once the user typed on", () => {
	const { type, internals, view } = setup("Berlin", "Trip to Berlin");
	type(" ");
	type("x");
	assert.equal(internals.revertAutolink(view), false);
	assert.equal(view.state.doc.toString(), "Trip to [[Berlin]] x");
});
