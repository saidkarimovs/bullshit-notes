"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

export function RelativeTime({ date }: { date: string | Date }) {
  const value = new Date(date);
  const [label, setLabel] = useState(value.toLocaleDateString());
  useEffect(() => { setLabel(formatDistanceToNow(value, { addSuffix: true })); }, [date]);
  return <time dateTime={value.toISOString()} title={value.toLocaleString()}>{label}</time>;
}
