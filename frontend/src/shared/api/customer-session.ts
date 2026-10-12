/** Read only the current customer's tenant-scoped session at request time; never use merchant identity. */
export function customerSessionHeaders(tenant: string): Record<string, string> {
  const token = localStorage.getItem(`rac-customer:${tenant}`);
  return token ? { "x-customer-token": token } : {};
}
