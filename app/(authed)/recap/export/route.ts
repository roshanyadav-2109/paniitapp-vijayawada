import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PersonExport {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
}

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: PersonExport[]): string {
  const header = "full_name,designation,company,linkedin_url,twitter_url";
  const lines = rows.map((p) =>
    [p.full_name, p.designation, p.company, p.linkedin_url, p.twitter_url].map(csvEscape).join(",")
  );
  return [header, ...lines].join("\n");
}

function toVcf(rows: PersonExport[]): string {
  return rows
    .map((p) => {
      const lines = ["BEGIN:VCARD", "VERSION:3.0"];
      if (p.full_name) lines.push(`FN:${p.full_name}`);
      if (p.company) lines.push(`ORG:${p.company}`);
      if (p.designation) lines.push(`TITLE:${p.designation}`);
      if (p.linkedin_url) lines.push(`URL:${p.linkedin_url}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    })
    .join("\r\n");
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauth", { status: 401 });

  const format = new URL(req.url).searchParams.get("format") ?? "vcf";

  const { data: conns } = await supabase
    .from("connections")
    .select(
      "user_a, user_b, ua:user_a(id, full_name, designation, company, linkedin_url, twitter_url), ub:user_b(id, full_name, designation, company, linkedin_url, twitter_url)"
    )
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const rows = (conns as {
    user_a: string;
    user_b: string;
    ua: PersonExport | null;
    ub: PersonExport | null;
  }[] | null) ?? [];
  const people: PersonExport[] = rows
    .map((r) => (r.user_a === user.id ? r.ub : r.ua))
    .filter((p): p is PersonExport => !!p);

  if (format === "csv") {
    return new NextResponse(toCsv(people), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="paniit2026-contacts.csv"`,
      },
    });
  }
  return new NextResponse(toVcf(people), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="paniit2026-contacts.vcf"`,
    },
  });
}
