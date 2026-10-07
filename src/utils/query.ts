export function escapeSearch(search: string) {
  return search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function dateFilter(from?: string, to?: string) {
  const filter: { $gte?: Date; $lt?: Date } = {};
  if (from) filter.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.$lt = end;
  }
  return Object.keys(filter).length ? { createdAt: filter } : {};
}
export function sortFields(
  sortBy: string,
  sortOrder: string,
  patient = false,
): Record<string, 1 | -1> {
  const direction = sortOrder === "asc" ? 1 : -1;
  return sortBy === "name"
    ? patient
      ? { firstName: direction, lastName: direction, _id: direction }
      : { name: direction, _id: direction }
    : { createdAt: direction, _id: direction };
}
export function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}
