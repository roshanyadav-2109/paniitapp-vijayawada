// End-to-end chat test via Supabase Management API.
// Reads SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from env.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT = process.env.SUPABASE_PROJECT_REF;
if (!TOKEN || !PROJECT) {
  console.error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  process.exit(1);
}

async function run(sql) {
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
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SQL ${res.status}: ${t}`);
  }
  return res.json();
}

const ROSHAN = "f9c357f3-9167-41ed-980e-ede5dbe29742";
const TEJASH = "ba9ae374-6e19-45e1-8f07-3bda288032e7";
const PANIIT = "f0583fb2-56ea-46d5-bf24-218c003b57d4";

function ord(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function seedConversation(meId, otherId, messages) {
  const [pa, pb] = ord(meId, otherId);
  // Find or create.
  let conv = (
    await run(
      `select id from public.conversations where participant_a = '${pa}' and participant_b = '${pb}';`
    )
  )[0];
  if (!conv) {
    conv = (
      await run(
        `insert into public.conversations (participant_a, participant_b) values ('${pa}', '${pb}') returning id;`
      )
    )[0];
    console.log(`  + created conversation ${conv.id}`);
  } else {
    console.log(`  · reusing conversation ${conv.id}`);
    // Clear prior test messages.
    await run(
      `delete from public.messages where conversation_id = '${conv.id}';`
    );
  }
  // Insert messages chronologically. created_at clamped per message so the
  // ordering and time labels look natural in the UI.
  let t = Date.now() - messages.length * 90_000;
  for (const m of messages) {
    const stamp = new Date(t).toISOString();
    const body = m.body.replace(/'/g, "''");
    await run(
      `insert into public.messages (conversation_id, sender_id, body, created_at, read_at) values ('${conv.id}', '${m.sender}', '${body}', '${stamp}', ${m.read ? "now()" : "null"});`
    );
    t += 90_000;
  }
  return conv.id;
}

async function main() {
  console.log("Seeding Roshan ↔ Tejash:");
  const convA = await seedConversation(ROSHAN, TEJASH, [
    { sender: TEJASH, body: "Hey Roshan, saw you're at PAN IIT — would love to catch up!", read: true },
    { sender: ROSHAN, body: "Hi Tejash! Yeah I'm here all day. Free around 11?", read: true },
    { sender: TEJASH, body: "Perfect, see you at the Strategy Hall foyer.", read: true },
    { sender: TEJASH, body: "Also — quick question about Neural AI's roadmap, can we dig into it?", read: false },
  ]);

  console.log("\nSeeding Roshan ↔ PanIIT account:");
  const convB = await seedConversation(ROSHAN, PANIIT, [
    { sender: PANIIT, body: "Welcome to PAN IIT 2026, Roshan! Let us know if you need anything.", read: true },
    { sender: ROSHAN, body: "Thanks! All good so far — really enjoying the day.", read: true },
    { sender: PANIIT, body: "Reminder: the Pitchathon kicks off at 14:00 in Strategy Hall.", read: false },
    { sender: PANIIT, body: "Networking dinner registration closes at 17:00.", read: false },
  ]);

  console.log("\nVerifying triggers + queries:");
  const convs = await run(
    `select c.id, p1.full_name as a, p2.full_name as b, c.last_message_at
     from public.conversations c
     join public.profiles p1 on p1.id = c.participant_a
     join public.profiles p2 on p2.id = c.participant_b
     where c.id in ('${convA}','${convB}')
     order by c.last_message_at desc;`
  );
  for (const c of convs) {
    console.log(`  ${c.a} ↔ ${c.b}  last=${c.last_message_at}`);
  }

  const counts = await run(
    `select conversation_id,
            count(*) as total,
            count(*) filter (where read_at is null) as unread,
            count(*) filter (where sender_id = '${ROSHAN}') as from_roshan
     from public.messages
     where conversation_id in ('${convA}','${convB}')
     group by conversation_id;`
  );
  console.log("\nMessage stats:");
  for (const r of counts) {
    console.log(
      `  ${r.conversation_id.slice(0, 8)}…  total=${r.total}  unread=${r.unread}  fromRoshan=${r.from_roshan}`
    );
  }

  console.log(
    "\nDone. Sign in as Roshan (singhrittika231@gmail.com) to see two threads in /chat with unread badges."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
