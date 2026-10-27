import test from "node:test";
import assert from "node:assert/strict";
import AutoLinkKeywordsPlugin from "../src/main";

test("indexing a file is independent of permission to write inside it", () => {
	const archived = { basename: "Old Note", path: "Archive/Old Note.md", extension: "md" };
	const current = { basename: "Current Note", path: "Notes/Current Note.md", extension: "md" };
	const files = [archived, current];
	const p = new AutoLinkKeywordsPlugin({
		vault: { getMarkdownFiles: () => files },
		metadataCache: { getFileCache: () => null },
	} as never, {} as never);
	Object.assign(p.settings, {
		scanVaultLinks: true,
		neverLinkFolders: "Archive",
		folderFilter: "",
	});
	p.rebuildFoldTable();
	p.parseBlocklist();
	p.parseManualKeywords();
	(p as unknown as { scanVaultLinks(): void }).scanVaultLinks();
	const internal = p as unknown as {
		matchKeyword(s: string): { target: string } | null;
		linkingExclusionReason(f: unknown): string | null;
	};
	assert.equal(internal.matchKeyword("Old Note")?.target, "Old Note");
	assert.equal(internal.linkingExclusionReason(archived), "Never link inside these folders");
	assert.equal(p.allowsLinksIn(archived as never), false);
	assert.equal(p.allowsLinksIn(current as never), true);
});

test("diagnostics reveal all existing content-protection rules", () => {
	const fm: Record<string, Record<string, unknown>> = {
		"Notes/Excluded.md": { linkosaurus: false },
		"Notes/Board.md": { "kanban-plugin": "basic" },
	};
	const p = new AutoLinkKeywordsPlugin({
		metadataCache: { getFileCache: (f: { path: string }) => ({ frontmatter: fm[f.path] }) },
	} as never, {} as never);
	const reason = (path: string) =>
		(p as unknown as { linkingExclusionReason(f: unknown): string | null })
			.linkingExclusionReason({ path, basename: path, extension: "md" });
	assert.equal(reason("Notes/Excluded.md"), "linkosaurus: false property");
	assert.equal(reason("Notes/Board.md"), "Excalidraw/Kanban-owned note protection");
	assert.equal(reason("Drawings/a.excalidraw.md"), "Excalidraw/Kanban-owned note protection");
	assert.equal(reason("Notes/Normal.md"), null);
});


test("diagnostics distinguish discovered, active, blocked and too-short keywords", () => {
	const files = [
		{ basename: "Old Note", path: "Old Note.md", extension: "md" },
		{ basename: "Berlin", path: "Berlin.md", extension: "md" },
		{ basename: "A", path: "A.md", extension: "md" },
	];
	const p = new AutoLinkKeywordsPlugin({
		vault: { getMarkdownFiles: () => files },
		metadataCache: { getFileCache: () => null },
	} as never, {} as never);
	Object.assign(p.settings, {
		scanVaultLinks: true,
		blocklist: "Old Note",
		minKeywordLength: 2,
	});
	p.rebuildFoldTable();
	p.parseBlocklist();
	p.parseManualKeywords();
	(p as unknown as { scanVaultLinks(): void }).scanVaultLinks();
	const status = (p as unknown as {
		keywordMatchingStatus(keyword: string): string;
	}).keywordMatchingStatus.bind(p);
	assert.ok(p.getVaultKeywords().includes("Old Note"));
	assert.match(status("Old Note"), /excluded by Blocklist/);
	assert.match(status("A"), /excluded by Minimum keyword length/);
	assert.match(status("Berlin"), /is active/);
	assert.match(status("Missing"), /not an active or discovered keyword/);
});
