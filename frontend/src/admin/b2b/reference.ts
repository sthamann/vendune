/** Native organization IDs require a lowercase letter first and at most 32 characters. */
export function organizationReference(): string {
  return "b" + crypto.randomUUID().replaceAll("-", "").slice(0, 31);
}
