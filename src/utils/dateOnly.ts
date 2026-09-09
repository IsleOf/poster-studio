// Dates in this app are stored as pure calendar dates ("what day did the event happen"),
// but `<input type="date">` and `new Date("2024-12-04")` parse a date-only string as UTC
// MIDNIGHT, while date-fns `format()` (and every other calendar getter used for display)
// reads back via LOCAL time. Those two disagree by a day for anyone behind UTC.
//
// That mismatch is worse than a cosmetic picker glitch: the customer's own browser preview
// renders in THEIR local timezone, but the actual downloadable file is rendered server-side
// by Puppeteer, which runs in the server's system timezone (Europe/Berlin/UTC in production)
// — a completely different offset from most customers. A real order hit exactly this: the
// live preview showed the correct date, the downloaded file showed a different one.
//
// Fix: never read a stored date's calendar fields with local getters. Always go through
// this helper, which reconstructs a Date whose LOCAL fields equal the ORIGINAL's UTC fields
// — safe to hand to date-fns `format()` (or any local-getter-based formatter) for display,
// and produces the same calendar date no matter which machine/timezone does the rendering.
// Never re-serialize the result of this function — it's a display-only view, not storage.
export function asCalendarDate(date: Date): Date {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
