import { EmptyArt, type EmptyArtName } from "./empty-art";

/**
 * Centred empty state for a whole page.
 *
 * Takes the name of an illustration rather than an icon component: the app
 * had four different empty-state treatments, each with its own stroke icon
 * at its own size, and they read as four different products.
 */
export function EmptyState({
  art,
  title,
}: {
  art: EmptyArtName;
  title: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      <EmptyArt name={art} className="size-20" />
      <h3 className="mt-4 font-display text-base font-semibold text-brand-950">
        {title}
      </h3>
    </div>
  );
}
