// A tiny, dependency-free syntax highlighter for chat code blocks.
//
// Written by hand rather than pulling in shiki or react-syntax-highlighter:
// both ship a grammar set measured in hundreds of kilobytes, and the previous
// release specifically cut first-load bytes by ~45%. This covers the languages
// the advisor actually emits — shell, SQL, Python, the C-family, JSON, markup,
// CSS — and degrades to plain text for anything else rather than guessing.

export type TokenClass =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "fn"
  | "var"
  | "tag"
  | "attr"
  | "plain";

export interface Token {
  text: string;
  cls: TokenClass;
}

type Family = "clike" | "python" | "shell" | "sql" | "json" | "markup" | "css" | "plain";

const FAMILY_BY_ALIAS: Record<string, Family> = {
  js: "clike", jsx: "clike", javascript: "clike",
  ts: "clike", tsx: "clike", typescript: "clike",
  java: "clike", c: "clike", h: "clike", cpp: "clike", "c++": "clike", cc: "clike",
  cs: "clike", csharp: "clike", go: "clike", golang: "clike",
  rust: "clike", rs: "clike", swift: "clike", kotlin: "clike", kt: "clike",
  php: "clike", scala: "clike", dart: "clike", groovy: "clike",
  python: "python", py: "python", python3: "python",
  bash: "shell", sh: "shell", shell: "shell", zsh: "shell", console: "shell",
  ps1: "shell", powershell: "shell", terminal: "shell",
  sql: "sql", postgres: "sql", postgresql: "sql", mysql: "sql", plpgsql: "sql",
  json: "json", jsonc: "json",
  html: "markup", xml: "markup", svg: "markup", vue: "markup",
  css: "css", scss: "css", sass: "css", less: "css",
};

/** Canonical label shown in the block header. */
export function languageLabel(lang: string | null): string {
  if (!lang) return "code";
  const pretty: Record<string, string> = {
    js: "JavaScript", jsx: "JSX", javascript: "JavaScript",
    ts: "TypeScript", tsx: "TSX", typescript: "TypeScript",
    py: "Python", python: "Python", python3: "Python",
    sh: "Shell", bash: "Bash", zsh: "Zsh", shell: "Shell", console: "Shell",
    ps1: "PowerShell", powershell: "PowerShell",
    sql: "SQL", postgres: "PostgreSQL", postgresql: "PostgreSQL", plpgsql: "PL/pgSQL",
    json: "JSON", html: "HTML", xml: "XML", css: "CSS", scss: "SCSS",
    cpp: "C++", "c++": "C++", cs: "C#", csharp: "C#", go: "Go", rs: "Rust",
    rust: "Rust", kt: "Kotlin", md: "Markdown", yml: "YAML", yaml: "YAML",
  };
  return pretty[lang.toLowerCase()] ?? lang;
}

const KEYWORDS: Record<Exclude<Family, "plain">, string[]> = {
  clike: ["abstract","as","async","await","break","case","catch","class","const","constructor","continue","default","defer","delete","do","else","enum","export","extends","false","final","finally","fn","for","from","func","function","go","if","impl","implements","import","in","instanceof","interface","let","match","mut","new","nil","null","package","private","protected","public","pub","range","return","select","static","struct","super","switch","this","throw","throws","trait","true","try","type","typeof","undefined","use","var","void","where","while","yield"],
  python: ["and","as","assert","async","await","break","class","continue","def","del","elif","else","except","False","finally","for","from","global","if","import","in","is","lambda","None","nonlocal","not","or","pass","raise","return","True","try","while","with","yield","self","match","case"],
  shell: ["if","then","else","elif","fi","for","while","until","do","done","case","esac","function","return","exit","local","export","readonly","declare","source","alias","set","unset","shift","trap","echo","printf","read","cd","mkdir","rm","cp","mv","ls","cat","grep","sed","awk","curl","wget","git","npm","npx","node","python","pip","docker","sudo","chmod","chown","find","xargs","tar","ssh","scp","kill","ps","test"],
  sql: ["add","all","alter","and","as","asc","begin","between","by","case","cast","column","commit","constraint","create","cross","default","delete","desc","distinct","drop","else","end","exists","foreign","from","full","grant","group","having","if","in","index","inner","insert","into","is","join","key","left","like","limit","not","null","offset","on","or","order","outer","primary","references","returning","revoke","right","rollback","select","set","table","then","true","false","union","unique","update","using","values","view","when","where","with"],
  json: ["true","false","null"],
  markup: [],
  css: ["important","and","not","only","from","to"],
};

/** Escape a literal for embedding in a RegExp alternation. */
function alt(words: string[]): string {
  return words.length ? `\\b(?:${words.join("|")})\\b` : "(?!)";
}

// Every sub-pattern uses non-capturing groups only, so the capture indices
// below line up one-to-one with PART_CLASSES.
function patternFor(family: Exclude<Family, "plain">): { re: RegExp; classes: TokenClass[] } {
  const num = `(?:\\b(?:0[xXbB][0-9a-fA-F_]+|\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b)`;
  const fn = `(?:\\b[A-Za-z_$][\\w$]*(?=\\s*\\())`;

  switch (family) {
    case "clike":
      return {
        re: new RegExp(
          `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)` +
            `|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)` +
            `|(${num})|(${alt(KEYWORDS.clike)})|(${fn})`,
          "g",
        ),
        classes: ["comment", "string", "number", "keyword", "fn"],
      };
    case "python":
      return {
        re: new RegExp(
          `(#[^\\n]*)` +
            `|("""[\\s\\S]*?"""|'''[\\s\\S]*?'''|(?:[rbfu]{0,2})"(?:\\\\.|[^"\\\\\\n])*"|(?:[rbfu]{0,2})'(?:\\\\.|[^'\\\\\\n])*')` +
            `|(@[A-Za-z_][\\w.]*)` +
            `|(${num})|(${alt(KEYWORDS.python)})|(${fn})`,
          "g",
        ),
        classes: ["comment", "string", "attr", "number", "keyword", "fn"],
      };
    case "shell":
      return {
        re: new RegExp(
          `(#[^\\n]*)` +
            `|("(?:\\\\.|[^"\\\\])*"|'[^']*')` +
            // $VAR, ${VAR}, $(cmd) — the thing people most want to spot in a
            // shell snippet, and the thing most likely to be mistyped.
            `|(\\$\\{[^}]*\\}|\\$[A-Za-z_][\\w]*|\\$[0-9@*#?])` +
            `|(^\\s*[-]{1,2}[\\w-]+|\\s[-]{1,2}[\\w-]+)` +
            `|(${alt(KEYWORDS.shell)})`,
          "gm",
        ),
        classes: ["comment", "string", "var", "attr", "keyword"],
      };
    case "sql":
      return {
        re: new RegExp(
          `(--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)` +
            `|('(?:''|[^'])*')` +
            `|(${num})|(${alt(KEYWORDS.sql)})|(${fn})`,
          "gi",
        ),
        classes: ["comment", "string", "number", "keyword", "fn"],
      };
    case "json":
      return {
        re: new RegExp(
          `("(?:\\\\.|[^"\\\\])*"(?=\\s*:))` +
            `|("(?:\\\\.|[^"\\\\])*")` +
            `|(${num})|(${alt(KEYWORDS.json)})`,
          "g",
        ),
        classes: ["attr", "string", "number", "keyword"],
      };
    case "markup":
      return {
        re: new RegExp(
          `(<!--[\\s\\S]*?-->)` +
            `|("(?:\\\\.|[^"\\\\])*"|'[^']*')` +
            `|(<\\/?[A-Za-z][\\w:-]*|\\/?>)` +
            `|([A-Za-z_:][\\w:.-]*(?=\\s*=))`,
          "g",
        ),
        classes: ["comment", "string", "tag", "attr"],
      };
    case "css":
      return {
        re: new RegExp(
          `(\\/\\*[\\s\\S]*?\\*\\/)` +
            `|("(?:\\\\.|[^"\\\\])*"|'[^']*')` +
            `|(@[\\w-]+)` +
            `|([-\\w]+(?=\\s*:))` +
            `|(${num}(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?)`,
          "g",
        ),
        classes: ["comment", "string", "keyword", "attr", "number"],
      };
  }
}

/**
 * Tokenise `code` for display. Always returns tokens covering the input
 * exactly — concatenating `text` reproduces the original string — so a
 * highlighter miss can never drop or reorder a character of the user's code.
 */
export function highlight(code: string, lang: string | null): Token[] {
  const family: Family = (lang && FAMILY_BY_ALIAS[lang.toLowerCase()]) || "plain";
  if (family === "plain") return [{ text: code, cls: "plain" }];

  const { re, classes } = patternFor(family);
  const out: Token[] = [];
  let last = 0;

  for (const m of code.matchAll(re)) {
    const idx = m.index ?? 0;
    // Zero-width matches would spin forever if matchAll didn't guard them;
    // skip them anyway so they can't emit empty tokens.
    if (!m[0]) continue;
    if (idx > last) out.push({ text: code.slice(last, idx), cls: "plain" });
    const groupIdx = m.slice(1).findIndex((g) => g !== undefined);
    out.push({ text: m[0], cls: groupIdx >= 0 ? classes[groupIdx] : "plain" });
    last = idx + m[0].length;
  }
  if (last < code.length) out.push({ text: code.slice(last), cls: "plain" });
  return out;
}
