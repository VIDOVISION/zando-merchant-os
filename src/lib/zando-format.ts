export function getNumber(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatCDF(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat("fr-CD").format(getNumber(value))} CDF`;
}
