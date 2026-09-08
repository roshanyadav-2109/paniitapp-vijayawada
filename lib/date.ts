import { formatInTimeZone } from "date-fns-tz";
import { SUMMIT_TZ } from "./constants";

function asValidDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function timeIST(value: string | Date): string {
  const date = asValidDate(value);
  return date ? formatInTimeZone(date, SUMMIT_TZ, "h:mm a") : "Time TBA";
}

export function hourIST(value: string | Date): string {
  const date = asValidDate(value);
  return date ? formatInTimeZone(date, SUMMIT_TZ, "HH:00") : "00:00";
}

export function dayIST(value: string | Date): string {
  const date = asValidDate(value);
  return date ? formatInTimeZone(date, SUMMIT_TZ, "EEE, MMM d") : "Date TBA";
}

export function rangeIST(start: string | Date, end: string | Date): string {
  return `${timeIST(start)} - ${timeIST(end)}`;
}
