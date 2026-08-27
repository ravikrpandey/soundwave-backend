export function trpcBatchPayload(data: unknown[]) {
  return data.map(value => ({ result: { data: { json: value } } }));
}
