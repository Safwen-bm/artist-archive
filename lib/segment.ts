const YEAR_START = /^\d{4}\b/;

export function segmentIntoEntries(rawLines: string[]): string[] {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;
    if (YEAR_START.test(line)) {
      if (current.length > 0) blocks.push(current.join(" "));
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join(" "));
  return blocks;
}
