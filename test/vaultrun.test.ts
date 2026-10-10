import test from "node:test";
import assert from "node:assert/strict";
import AutoLinkKeywordsPlugin from "../src/main";

// An in-memory vault with just enough of the Obsidian API for the
// vault-wide run: listing, reading, atomic writes, and open panes.
function makeVault(files: Record<string, string>, open: string[] = []) {
	const data = new Map(Object.entries(files));
	const tfiles = new Map(
		[...data.keys()].map((path) => [
			path,
			{
				path,
				extension: "md",
				basename: path.replace(/^.*\//, "").replace(/\.md$/, ""),
				stat: { mtime: 1 },
			},
		])
	);
	const app = {
		vault: {
			getMarkdownFiles: () => [...tfiles.values()],
			cachedRead: async (f: { path: string }) => data.get(f.path)!,
			read: async (f: { path: string }) => data.get(f.path)!,
			modify: async (f: { path: string }, text: string) => void data.set(f.path, text),
			process: async (f: { path: string; stat: { mtime: number } }, fn: (d: string) => string) => {
				const next = fn(data.get(f.path)!);
				data.set(f.path, next);
				f.stat.mtime++;
				return next;
			},
			getAbstractFileByPath: (p: string) => tfiles.get(p) ?? null,
		},
		workspace: {
			getActiveFile: () => null,
			iterateAllLeaves: (cb: (leaf: unknown) => void) => {
				for (const file of open) cb({ view: { getState: () => ({ file }) } });
			},
		},
		metadataCache: { getFileCache: () => null },
	};
	return { app, data, tfiles };
}

function setup(files: Record<string, string>, open: string[] = []) {
	const vault = makeVault(files, open);
	const p = new AutoLinkKeywordsPlugin(vault.app as never, {} as never);
	Object.assign(p.settings, { scanVaultLinks: false, keywordList: "Berlin\nTokyo" });
	p.rebuildFoldTable();
	p.parseBlocklist();
	p.parseManualKeywords();
	p.parseTlds();
	type Plan = { items: { file: { path: string } }[]; links: number; skippedOpen: number; skippedLarge: number };
	const internals = p as unknown as {
		planRelink(): Promise<Plan>;
		confirmVaultRun(plan: Plan): Promise<void>;
		undoVaultRun(): Promise<void>;
		lastVaultRun: unknown[] | null;
	};
	return { ...vault, internals };
}

test("the dry run counts notes and links without writing", async () => {
	const { internals, data } = setup(
		{
			"a.md": "Berlin and Tokyo",
			"b.md": "nothing here",
			"c.md": "Tokyo",
			"open.md": "Berlin",
			"big.md": "Berlin " + "x".repeat(100001),
		},
		["open.md"]
	);
	const plan = await internals.planRelink();
	assert.deepEqual(plan.items.map((i) => i.file.path).sort(), ["a.md", "c.md"]);
	assert.equal(plan.links, 3);
	assert.equal(plan.skippedOpen, 1);
	assert.equal(plan.skippedLarge, 1);
	assert.equal(data.get("a.md"), "Berlin and Tokyo");
});

test("a confirmed run writes and can be undone", async () => {
	const { internals, data } = setup({ "a.md": "Berlin", "c.md": "Tokyo" });
	await internals.confirmVaultRun(await internals.planRelink());
	assert.equal(data.get("a.md"), "[[Berlin]]");
	assert.equal(data.get("c.md"), "[[Tokyo]]");
	assert.equal(internals.lastVaultRun?.length, 2);
	await internals.undoVaultRun();
	assert.equal(data.get("a.md"), "Berlin");
	assert.equal(data.get("c.md"), "Tokyo");
	assert.equal(internals.lastVaultRun, null);
});

test("undo leaves notes alone that changed after the run", async () => {
	const { internals, data } = setup({ "a.md": "Berlin", "c.md": "Tokyo" });
	await internals.confirmVaultRun(await internals.planRelink());
	data.set("a.md", "[[Berlin]] edited later");
	await internals.undoVaultRun();
	assert.equal(data.get("a.md"), "[[Berlin]] edited later");
	assert.equal(data.get("c.md"), "Tokyo");
});

test("an edit between preview and write is linked, not overwritten", async () => {
	const { internals, data } = setup({ "a.md": "Berlin" });
	const plan = await internals.planRelink();
	data.set("a.md", "Berlin and Tokyo");
	await internals.confirmVaultRun(plan);
	assert.equal(data.get("a.md"), "[[Berlin]] and [[Tokyo]]");
});

test("unchanged notes are skipped on the next run", async () => {
	const { internals } = setup({ "a.md": "nothing", "b.md": "Berlin" });
	await internals.planRelink();
	const second = await internals.planRelink();
	// b.md is still pending (it was only planned, not written); a.md is
	// remembered as having nothing to link.
	assert.deepEqual(second.items.map((i) => i.file.path), ["b.md"]);
});

test("a failed write is retried on the next run", async () => {
	const { app, internals, data } = setup({ "a.md": "Berlin" });
	const process = app.vault.process;
	let failures = 1;
	app.vault.process = async (f, fn) => {
		if (failures-- > 0) throw new Error("locked");
		return process(f, fn);
	};
	const original = console.error;
	console.error = () => {};
	try {
		await internals.confirmVaultRun(await internals.planRelink());
	} finally {
		console.error = original;
	}
	assert.equal(data.get("a.md"), "Berlin");
	const second = await internals.planRelink();
	assert.deepEqual(second.items.map((i) => i.file.path), ["a.md"]);
	await internals.confirmVaultRun(second);
	assert.equal(data.get("a.md"), "[[Berlin]]");
});

test("the scan folder filter does not limit where the vault run writes", async () => {
	const { internals } = setup({ "People/a.md": "Berlin", "Daily/b.md": "Tokyo" });
	const plugin = internals as unknown as { settings: Record<string, unknown> };
	Object.assign(plugin.settings, { folderFilterMode: "include", folderFilter: "People" });
	const plan = await internals.planRelink();
	assert.deepEqual(plan.items.map((i) => i.file.path).sort(), ["Daily/b.md", "People/a.md"]);
});
