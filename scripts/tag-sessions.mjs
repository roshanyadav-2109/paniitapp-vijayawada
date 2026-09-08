// Reads SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from the environment.
// Usage (PowerShell):
//   $env:SUPABASE_ACCESS_TOKEN = "sbp_…"; $env:SUPABASE_PROJECT_REF = "abcd";
//   node scripts/tag-sessions.mjs
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT = process.env.SUPABASE_PROJECT_REF;
if (!TOKEN || !PROJECT) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF before running."
  );
  process.exit(1);
}

const tagged = [
  ["39759fa6-21da-4b07-bbee-ce0e8fee7831", ["Dev Tools"]],
  ["38af8e91-51de-4b36-b083-2e2a737542d3", ["Dev Tools"]],
  ["62154b62-c529-4b2f-a295-c69179dee66e", ["Defense Tech", "Public Policy"]],
  ["00ceab93-d54d-4fe2-8f8c-69bbeba77042", ["AI & Machine Learning", "Public Policy"]],
  ["5f4c3d3a-6880-4377-95ed-ad0990cf9b0e", ["Dev Tools"]],
  ["1d189b08-d2a8-4ab3-984b-80b55bee31c4", ["Dev Tools"]],
  ["4372a6a9-924c-47cf-884b-23062d14ca00", ["Defense Tech", "AI & Machine Learning"]],
  ["3e4c293a-c360-4f04-bb7e-4ce055ac2216", ["Fintech"]],
  ["8e8e5cd5-25bd-43b4-838d-f4a2ee860a58", ["Fintech", "AI & Machine Learning"]],
  ["52799364-0547-4ff6-9543-238353b251d5", ["Dev Tools"]],
  ["0637b6fd-49a3-4e82-a94a-0dd8d7a00502", ["AI & Machine Learning", "Public Policy"]],
  ["c385d61f-810e-4524-84e9-4b5a41fc4708", ["Public Policy", "Cybersecurity"]],
  ["28b423c8-5032-458a-90cc-9644c57ad726", ["Education"]],
  ["604c7fb9-1631-4346-8536-a255238d3930", ["Education"]],
  ["97dba6d2-cb1a-4df5-bc2c-477520dcf7c9", ["SaaS", "Public Policy"]],
  ["af83648e-d674-4d62-a1e1-04c3ad425152", ["AI & Machine Learning", "SaaS"]],
  ["86c1d37b-c79d-4fda-867a-b1a77e272da5", ["Healthcare"]],
  ["bb54388b-cd5e-4621-8d4b-0d60a12e1e69", ["AI & Machine Learning", "Education"]],
  ["a7ba2469-6e5b-4fe3-8dd1-ce46879a5742", ["Education"]],
  ["5ca9b8a2-a50e-4c5c-b09f-5ab7292cc672", ["Dev Tools"]],
  ["ab3c6160-6106-4ce1-a08b-7cddc3c207db", ["Dev Tools", "AI & Machine Learning"]],
  ["083c5343-ccf2-428a-89f0-deb2935316a7", ["AI & Machine Learning", "Manufacturing"]],
  ["4be167fb-f5ac-43c9-8feb-bee91b165385", ["Climate / Energy"]],
  ["137fef84-5dc8-4f5a-bb5f-e0b7bd13f448", ["Deep Tech"]],
  ["61c88afe-5c3a-4efa-b312-245f51704e52", ["Education", "Climate / Energy"]],
  ["9d93f43e-33d7-4d57-9292-c3c3dc4a8374", ["Dev Tools"]],
];

const quote = (s) => "'" + s.replace(/'/g, "''") + "'";
const values = tagged
  .map(
    ([id, arr]) =>
      `(${quote(id)}::uuid, ARRAY[${arr.map(quote).join(",")}]::text[])`
  )
  .join(",\n  ");

const sql = `update public.sessions s
set interests = v.interests
from (values
  ${values}
) as v(id, interests)
where s.id = v.id;`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);
console.log("status:", res.status);
console.log(await res.text());

// Sanity check
const check = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `select id, title, interests from public.sessions where interests is not null order by title;`,
    }),
  }
);
const rows = await check.json();
console.log("\nTagged sessions: " + rows.length);
for (const r of rows) {
  console.log("  -", r.title, "=>", r.interests);
}
