export function serialize(record: Record<string, unknown>) {
  const { _id, __v: _version, ...fields } = record;
  return { id: String(_id), ...fields };
}
