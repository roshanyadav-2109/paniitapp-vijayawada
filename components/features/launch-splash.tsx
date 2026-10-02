import { EVENT_TAGLINE } from "@/lib/event-config";

/**
 * The opening of the installed app: white, then the summit's mark unveiled
 * from the bottom up as it rises and sharpens, the line under it after, and
 * the whole screen giving way to the app.
 *
 * Pure CSS (globals.css, .launch-splash), so it runs from the first paint
 * before any script has loaded, and only in the installed app: a browser
 * tab is not made to wait for it. It sits in the root layout, which a
 * change of screen does not rebuild, so it plays once per opening.
 */
export function LaunchSplash() {
  return (
    <div className="launch-splash" aria-hidden>
      <div className="launch-splash__mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/paniit-ap-mark.png" alt="" width={853} height={723} />
      </div>
      <p className="launch-splash__line">{EVENT_TAGLINE}</p>
    </div>
  );
}
