import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function prefixFlag(title) {
  return title.startsWith("!") ? title : `! ${title}`;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getFields(item) {
  if (Array.isArray(item?.fields)) {
    return item.fields;
  }

  if (Array.isArray(item?.details?.fields)) {
    return item.details.fields;
  }

  return [];
}

function getUrls(item) {
  if (Array.isArray(item?.urls)) {
    return item.urls;
  }

  if (Array.isArray(item?.overview?.URLs)) {
    return item.overview.URLs.map((url) => ({
      href: url?.href ?? url?.u ?? "",
    }));
  }

  if (normalizeString(item?.overview?.url)) {
    return [{ href: item.overview.url }];
  }

  return [];
}

function isUsernameField(field) {
  const id = normalizeString(field?.id).toLowerCase();
  const label = normalizeString(field?.label).toLowerCase();
  const name = normalizeString(field?.name).toLowerCase();
  const purpose = normalizeString(field?.purpose).toUpperCase();
  const designation = normalizeString(field?.designation).toLowerCase();

  return (
    purpose === "USERNAME" ||
    designation === "username" ||
    id === "username" ||
    label === "username" ||
    name === "username"
  );
}

export function getAuditIssues(item) {
  const fields = getFields(item);
  const urls = getUrls(item);
  const usernameField = fields.find(isUsernameField);
  const username = normalizeString(usernameField?.value);
  const hasWebsite = urls.some((url) => normalizeString(url?.href).length > 0);
  const issues = [];

  if (!username) {
    issues.push("missing username");
  }

  if (!hasWebsite) {
    issues.push("missing website");
  }

  return issues;
}

export function buildAuditEntry(item) {
  const issues = getAuditIssues(item);
  const title = item?.title ?? item?.overview?.title ?? "";
  const nextTitle = issues.length > 0 ? prefixFlag(title) : title;

  return {
    id: item?.id ?? item?.uuid ?? "",
    title,
    nextTitle,
    vault: item?.vault?.name ?? "",
    category: item?.category ?? "",
    issues,
    needsRename: issues.length > 0 && nextTitle !== title,
  };
}

function parseArgs(argv) {
  const options = {
    apply: false,
    categories: ["Login"],
    includeArchive: false,
    vaults: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--include-archive") {
      options.includeArchive = true;
      continue;
    }

    if (arg === "--vault") {
      const vault = argv[index + 1];

      if (!vault) {
        throw new Error("--vault requires a value");
      }

      options.vaults.push(vault);
      index += 1;
      continue;
    }

    if (arg === "--categories") {
      const categories = argv[index + 1];

      if (!categories) {
        throw new Error("--categories requires a comma-separated value");
      }

      options.categories = categories
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function getHelpText() {
  return [
    "Audit 1Password items and prefix ! on entries missing username or website.",
    "",
    "Usage:",
    "  node scripts/op-audit-login-metadata.mjs [--apply] [--vault <name>] [--categories <csv>] [--include-archive]",
    "",
    "Examples:",
    "  node scripts/op-audit-login-metadata.mjs",
    "  node scripts/op-audit-login-metadata.mjs --apply",
    "  node scripts/op-audit-login-metadata.mjs --categories 'Login,API Credential'",
  ].join("\n");
}

async function runOp(args) {
  const { stdout } = await execFileAsync("op", args, {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf8",
  });

  return stdout;
}

async function listItems(options) {
  if (options.vaults.length === 0) {
    const args = ["item", "list", "--format", "json"];

    if (options.categories.length > 0) {
      args.push("--categories", options.categories.join(","));
    }

    if (options.includeArchive) {
      args.push("--include-archive");
    }

    return JSON.parse(await runOp(args));
  }

  const results = [];

  for (const vault of options.vaults) {
    const args = ["item", "list", "--format", "json", "--vault", vault];

    if (options.categories.length > 0) {
      args.push("--categories", options.categories.join(","));
    }

    if (options.includeArchive) {
      args.push("--include-archive");
    }

    results.push(...JSON.parse(await runOp(args)));
  }

  return results;
}

async function getItemDetails(item) {
  const args = ["item", "get", item.id, "--format", "json"];

  if (item?.vault?.name) {
    args.push("--vault", item.vault.name);
  }

  return JSON.parse(await runOp(args));
}

async function auditItems(options) {
  const summaries = await listItems(options);
  const entries = [];

  for (const summary of summaries) {
    const detail = await getItemDetails(summary);
    entries.push(buildAuditEntry(detail));
  }

  return entries
    .filter((entry) => entry.issues.length > 0)
    .sort((left, right) => left.title.localeCompare(right.title));
}

async function applyFlags(entries) {
  const renamed = [];

  for (const entry of entries) {
    if (!entry.needsRename) {
      continue;
    }

    await runOp([
      "item",
      "edit",
      entry.id,
      "--vault",
      entry.vault,
      "--title",
      entry.nextTitle,
    ]);
    renamed.push(entry);
  }

  return renamed;
}

function formatEntry(entry) {
  return `! [${entry.issues.join(", ")}] ${entry.vault} / ${entry.title}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(getHelpText());
    return;
  }

  const entries = await auditItems(options);

  if (entries.length === 0) {
    console.log("No matching items found.");
    return;
  }

  const action = options.apply ? "Flagging" : "Would flag";
  console.log(`${action} ${entries.length} item(s):`);

  for (const entry of entries) {
    console.log(formatEntry(entry));
  }

  if (!options.apply) {
    console.log("");
    console.log("Re-run with --apply to rename the matching item titles.");
    return;
  }

  const renamed = await applyFlags(entries);

  if (renamed.length === 0) {
    console.log("");
    console.log("All matching items were already flagged.");
    return;
  }

  console.log("");
  console.log(`Renamed ${renamed.length} item(s).`);
}

const isEntryPoint = process.argv[1]
  ? import.meta.url === new URL(`file://${process.argv[1]}`).href
  : false;

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
