import Image from "next/image";
import { EmptyArt } from "@/components/features/empty-art";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getPublicKeyParticipants } from "@/lib/public-data";
import { initials } from "@/lib/utils";

// The same cached list the home strip rotates through.
export const revalidate = 300;

export default async function SpeakersPage() {
  let people: Awaited<ReturnType<typeof getPublicKeyParticipants>> = [];
  try {
    people = await getPublicKeyParticipants();
  } catch {
    people = [];
  }

  return (
    // No heading and no standfirst: the page is the list, and the row you
    // tapped to get here already said what it is.
    <div className="mx-auto w-full max-w-4xl pb-12 pt-5 lg:pt-8">
      {people.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="mb-1">
              <EmptyArt name="empty-team" />
            </EmptyMedia>
            <EmptyTitle>Speakers will appear here closer to the event</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 items-start gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
          {people.map((p) => {
            const line = [p.designation, p.company].filter(Boolean).join(" | ");
            const name = p.full_name ?? "Speaker";
            return (
              <li key={p.id}>
                {/* Portraits are supplied at 4:5, so the frame is 4:5 and
                    nobody is cropped. object-top for the ones that are not:
                    a head is at the top of a photograph, never the middle. */}
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-paper-deep">
                  {p.photo_url ? (
                    <Image
                      src={p.photo_url}
                      alt={name}
                      fill
                      sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-2xl font-semibold text-brand-800/70">
                      {initials(p.full_name)}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-snug text-brand-950">
                  {name}
                </p>
                {line ? (
                  <p className="mt-0.5 text-[11.5px] leading-snug text-brand-900/70">
                    {line}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
