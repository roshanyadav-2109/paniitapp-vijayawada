import { redirect } from "next/navigation";

/**
 * Meetings are not part of this summit. The screens are gone; a link to one
 * from an old notification or a bookmark lands on home instead of a 404.
 */
export default function MeetingsGone() {
  redirect("/home");
}
