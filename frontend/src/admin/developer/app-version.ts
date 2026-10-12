/** Suggest a free forward version when copying history; immutable and archived builds retain their identity. */
export function nextAppVersion(base: string, occupied: string[]) {
  const parts = (value: string) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value);
    return match ? match.slice(1, 4).map(BigInt) : null;
  };
  let highest = parts(base) ?? [0n, 1n, 0n];
  for (const value of occupied) {
    const n = parts(value);
    if (
      n &&
      n.some(
        (v, i) =>
          v > highest[i] && n.slice(0, i).every((p, j) => p === highest[j]),
      )
    )
      highest = n;
  }
  return `${highest[0]}.${highest[1]}.${highest[2] + 1n}`;
}
