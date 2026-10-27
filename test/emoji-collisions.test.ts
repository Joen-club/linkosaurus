import test from "node:test";
import assert from "node:assert/strict";
import AutoLinkKeywordsPlugin from "../src/main";

// Existing links in older notes must not shadow the actual filename-derived
// keyword. Test order deliberately puts the older note before its target.
function scan(
  filenames: string[],
  outgoingLinks: Record<string, string[]> = {},
  overrides: Record<string, unknown> = {}
) {
  const files = filenames.map((basename) => ({
    basename, path: basename + ".md", extension: "md",
  }));
  const p = new AutoLinkKeywordsPlugin({
    vault: { getMarkdownFiles: () => files },
    metadataCache: { getFileCache: (file: { basename: string }) => ({
      links: (outgoingLinks[file.basename] ?? []).map((link) => ({ link })),
    }) },
  } as never, {} as never);
  Object.assign(p.settings, {
    scanVaultLinks: true, ignoreEdgeEmojis: true, keywordList: "", ...overrides,
  });
  p.rebuildFoldTable();
  p.parseBlocklist();
  p.parseManualKeywords();
  (p as unknown as { scanVaultLinks(): void }).scanVaultLinks();
  return p as unknown as {
    replaceKeywordsInText(text: string, before: string, after: string): string;
    matchKeyword(text: string): { target: string } | null;
  };
}

test("old plain wikilinks do not steal the stripped emoji-title match", () => {
  const p = scan(
    ["Old", "🗺Question Framework", "🛠️🛠️🗡Brightest Ones Fade Away First❓"],
    { Old: ["Question Framework", "Brightest Ones Fade Away First"] }
  );
  assert.equal(
    p.replaceKeywordsInText("Question Framework", "", ""),
    "[[🗺Question Framework]]"
  );
  assert.equal(
    p.matchKeyword("Brightest Ones Fade Away First")?.target,
    "🛠️🛠️🗡Brightest Ones Fade Away First❓"
  );
});

test("actual matching filename beats an outgoing link and emoji-derived name", () => {
  const p = scan(
    ["Old", "🗺Question Framework", "Question Framework"],
    { Old: ["Question Framework"] }
  );
  assert.equal(
    p.replaceKeywordsInText("Question Framework", "", ""),
    "[[Question Framework]]"
  );
});

test("explicit frontmatter aliases retain priority over synthesized names", () => {
  const files = [
    { basename: "Old", path: "Old.md", extension: "md" },
    { basename: "🗺Question Framework", path: "🗺Question Framework.md", extension: "md" },
    { basename: "Other", path: "Other.md", extension: "md" },
  ];
  const p = new AutoLinkKeywordsPlugin({
    vault: { getMarkdownFiles: () => files },
    metadataCache: { getFileCache: (f: { basename: string }) => (
      f.basename === "Other" ? { frontmatter: { aliases: ["Question Framework"] } } : null
    ) },
  } as never, {} as never);
  Object.assign(p.settings, { scanVaultLinks: true, ignoreEdgeEmojis: true });
  p.rebuildFoldTable();
  p.parseBlocklist();
  p.parseManualKeywords();
  (p as unknown as { scanVaultLinks(): void }).scanVaultLinks();
  const internals = p as unknown as { matchKeyword(s: string): { target: string } | null };
  assert.equal(internals.matchKeyword("Question Framework")?.target, "Other");
});

test("two emoji-decorated notes with the same plain name remain ambiguous", () => {
  const p = scan(
    ["Old", "🗺Question Framework", "🧠Question Framework"],
    { Old: ["Question Framework"] }
  );
  assert.equal(p.replaceKeywordsInText("Question Framework", "", ""), "Question Framework");
});

test("manual mapping wins over both emoji-derived keywords and old links", () => {
  const p = scan(
    ["Old", "🗺Question Framework"],
    { Old: ["Question Framework"] },
    { keywordList: "Question Framework = My Choice" }
  );
  assert.equal(p.matchKeyword("Question Framework")?.target, "My Choice");
});
