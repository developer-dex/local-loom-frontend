/** Wheel time value used in Become Tradie business hours UI. */
export type BusinessTimeValue = {
  hour: number;
  minute: number;
  second: number;
  period: 'AM' | 'PM';
};

export const DEFAULT_BUSINESS_TIME: BusinessTimeValue = {
  hour: 6,
  minute: 0,
  second: 0,
  period: 'AM',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Display format matching Figma: `06 : 28 : 55 PM` */
export function formatBusinessTimeDisplay(value: BusinessTimeValue): string {
  return `${pad2(value.hour)} : ${pad2(value.minute)} : ${pad2(value.second)} ${value.period}`;
}

/** Convert wheel time to API `HH:MM` (24-hour). Seconds are not sent. */
export function businessTimeToApi(value: BusinessTimeValue): string {
  let hours24 = value.hour;
  if (value.period === 'AM') {
    hours24 = value.hour === 12 ? 0 : value.hour;
  } else {
    hours24 = value.hour === 12 ? 12 : value.hour + 12;
  }
  return `${pad2(hours24)}:${pad2(value.minute)}`;
}

/** Parse stored draft (`HH:MM`) or legacy display strings (`6:00 AM`). */
export function parseStoredBusinessTime(raw: string | null | undefined): BusinessTimeValue | null {
  if (!raw?.trim()) return null;

  const hhmm = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const hours24 = Number(hhmm[1]);
    const minute = Number(hhmm[2]);
    if (Number.isNaN(hours24) || Number.isNaN(minute)) return null;
    const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
    let hour12 = hours24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: hour12, minute, second: 0, period };
  }

  const legacy = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (legacy) {
    return {
      hour: Number(legacy[1]),
      minute: Number(legacy[2]),
      second: 0,
      period: legacy[3].toUpperCase() as 'AM' | 'PM',
    };
  }

  return null;
}
