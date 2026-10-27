import test from "node:test";
import assert from "node:assert/strict";
import AutoLinkKeywordsPlugin from "../src/main";

test("onload builds a usable index of vault note names and aliases", async () => {
	const root = globalThis as unknown as {
		window?: unknown;
		document?: unknown;
	};
	const previousWindow = root.window;
	const previousDocument = root.document;
	const scheduled: Array<() => void> = [];
	root.window = {
		setTimeout: (callback: () => void) => {
			scheduled.push(callback);
			return scheduled.length;
		},
		clearTimeout: () => {},
	};
	root.document = {};
	try {
		const files = [
			{ path: "Notes/Berlin.md", basename: "Berlin", extension: "md" },
			{ path: "Notes/🗺Question Framework.md", basename: "🗺Question Framework", extension: "md" },
		];
		const app = {
			workspace: {
				onLayoutReady: (cb: () => void) => cb(),
				on: () => ({}),
				getActiveFile: () => null,
			},
			vault: { getMarkdownFiles: () => files, on: () => ({}) },
			metadataCache: { on: () => ({}), getFileCache: () => null },
		};
		const p = new AutoLinkKeywordsPlugin(app as never, {} as never);
		p.loadData = async () => ({ ignoreEdgeEmojis: true });
		await p.onload();
		for (const task of scheduled.splice(0)) task();
		const internals = p as unknown as {
			matchKeyword(s: string): { target: string } | null;
			replaceKeywordsInText(text: string, before: string, after: string): string;
		};
		assert.equal(internals.matchKeyword("Berlin")?.target, "Berlin");
		assert.equal(internals.matchKeyword("Question Framework")?.target, "🗺Question Framework");
		assert.equal(
			internals.replaceKeywordsInText("Berlin and Question Framework", "", ""),
			"[[Berlin]] and [[🗺Question Framework]]"
		);
	} finally {
		root.window = previousWindow;
		root.document = previousDocument;
	}
});
