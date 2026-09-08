import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const TIER_FOLDERS = [
  { tier: "title", label: "Title sponsor", aliases: ["title sponsor", "title sponsors", "title"] },
  { tier: "platinum", label: "Platinum sponsor", aliases: ["platinum sponsor", "platinum sponsors", "platinum"] },
  { tier: "gold", label: "Gold sponsor", aliases: ["gold sponsor", "gold sponsors", "gold"] },
  { tier: "silver", label: "Silver sponsor", aliases: ["silver sponsor", "silver sponsors", "silver"] },
  { tier: "bronze", label: "Bronze sponsor", aliases: ["bronze sponsor", "bronze sponsors", "bronze"] },
  { tier: "partner", label: "Partner", aliases: ["partner", "partners"] },
];

const ACRONYMS = new Map(
  [
    "ai",
    "dbs",
    "dst",
    "elcot",
    "gail",
    "gok",
    "ias",
    "ibm",
    "iit",
    "kdem",
    "nmdc",
    "sbi",
    "sap",
    "st",
    "tcs",
  ].map((value) => [value, value.toUpperCase()])
);

const NAME_OVERRIDES = new Map([
  ["gok", "Government of Karnataka"],
  ["govkar", "Government of Karnataka"],
  ["government of karnataka", "Government of Karnataka"],
  ["w by groww", "W by Groww"],
  ["w by groww ", "W by Groww"],
  ["kuku wordmark logo w", "Kuku FM"],
  ["harness black", "Harness"],
  ["vision ias", "Vision IAS"],
]);

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const bucket = process.env.SPONSOR_LOGOS_BUCKET || "logos";
// The LOGOS bucket is shared with the Bangalore edition, whose tier folders
// sit at the bucket root. This edition's logos live under a prefix so the two
// summits do not read each other's partners.
const storagePrefix = (process.env.SPONSOR_LOGOS_PREFIX || "ap-2026").replace(/^\/+|\/+$/g, "");
// sponsors.event_id is NOT NULL and defaults to the Bangalore event, so this
// must be set explicitly or AP sponsors land in the Bangalore app.
const eventId = process.env.NEXT_PUBLIC_EVENT_ID;
if (!eventId) {
  throw new Error("NEXT_PUBLIC_EVENT_ID is required so sponsors are tagged to the right summit.");
}
const signedSeconds = parseInteger(process.env.SPONSOR_LOGOS_SIGNED_SECONDS);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to sync sponsors."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rootFolders = await listFolderNames(bucket, storagePrefix);
const sponsors = [];

for (const tierFolder of TIER_FOLDERS) {
  const folder = resolveFolderName(rootFolders, tierFolder.aliases) ?? tierFolder.aliases[0];
  const folderPath = `${storagePrefix}/${folder}`;
  const objects = await listImages(bucket, folderPath);

  if (objects.length === 0) {
    console.warn(`No sponsor logos found in "${bucket}/${folderPath}".`);
    continue;
  }

  for (const objectPath of objects) {
    sponsors.push({
      name: sponsorNameFromObjectPath(objectPath),
      tier: tierFolder.tier,
      tierLabel: tierFolder.label,
      logo_url: await logoUrl(bucket, objectPath),
    });
  }
}

if (sponsors.length === 0) {
  throw new Error(`No sponsor logos found in bucket "${bucket}".`);
}

console.log(`Found ${sponsors.length} sponsor logo(s) in "${bucket}".`);

for (const sponsor of sponsors) {
  if (dryRun) {
    console.log(`[dry-run] ${sponsor.tier}: ${sponsor.name} -> ${sponsor.logo_url}`);
    continue;
  }

  await syncSponsor(sponsor);
  console.log(`Synced ${sponsor.tier}: ${sponsor.name}`);
}

async function syncSponsor(sponsor) {
  const { data: existing, error: selectError } = await supabase
    .from("sponsors")
    .select("id")
    .eq("event_id", eventId)
    .eq("name", sponsor.name)
    .eq("tier", sponsor.tier)
    .limit(1);

  if (selectError) throw selectError;

  const existingId = existing?.[0]?.id;
  if (existingId) {
    const { error } = await supabase
      .from("sponsors")
      .update({ logo_url: sponsor.logo_url })
      .eq("id", existingId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("sponsors").insert({
    event_id: eventId,
    name: sponsor.name,
    tier: sponsor.tier,
    logo_url: sponsor.logo_url,
    description: `${sponsor.tierLabel} at PanIIT Andhra Pradesh Summit 2026.`,
  });
  if (error) throw error;
}

async function listImages(bucketName, prefix) {
  const images = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        if (IMAGE_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
          images.push(itemPath);
        }
        continue;
      }

      images.push(...(await listImages(bucketName, itemPath)));
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return images;
}

async function listFolderNames(bucketName, prefix) {
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw error;
  return (data ?? []).filter((item) => !item.id).map((item) => item.name);
}

function resolveFolderName(rootFolderNames, aliases) {
  const normalizedAliases = new Set(aliases.map(normalizeName));
  return rootFolderNames.find((folderName) => normalizedAliases.has(normalizeName(folderName)));
}

async function logoUrl(bucketName, objectPath) {
  if (signedSeconds) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(objectPath, signedSeconds);
    if (error) throw error;
    return data.signedUrl;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  return data.publicUrl;
}

function sponsorNameFromObjectPath(objectPath) {
  const basename = path.basename(objectPath, path.extname(objectPath));
  const normalized = basename
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const override = NAME_OVERRIDES.get(normalizeName(normalized));
  if (override) return override;

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      const normalizedToken = normalizeName(token);
      if (ACRONYMS.has(normalizedToken)) return ACRONYMS.get(normalizedToken);
      if (/[a-z][A-Z]/.test(token)) return token;
      if (token.length <= 2 && token === token.toUpperCase()) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseInteger(value) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
