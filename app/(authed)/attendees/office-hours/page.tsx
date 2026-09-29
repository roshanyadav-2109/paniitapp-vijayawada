import { redirect } from "next/navigation";

/** Office hours were bookable meetings, which this summit does not have. */
export default function OfficeHoursGone() {
  redirect("/attendees");
}
