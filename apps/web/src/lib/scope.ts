export function isHostInScope(host: string, patterns: string[]) {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  return patterns.some(raw => {
    const pattern = raw.trim().toLowerCase().replace(/\.$/, "");
    if (!pattern) return false;
    if (pattern.startsWith("*.")) {
      const base = pattern.slice(2);
      return normalized !== base && normalized.endsWith("." + base);
    }
    return normalized === pattern;
  });
}
