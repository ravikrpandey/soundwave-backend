export function trpcBatchPayload(data: unknown[]) {
  return data.map(value => ({ result: { data: { json: value } } }));
}

export function parseTrpcInputs(raw: string | null, batched: boolean): any[] {
  if (!raw) return [{}];
  const parsed = JSON.parse(raw);
  const entries = batched
    ? Object.keys(parsed).sort((left, right) => Number(left) - Number(right)).map(key => parsed[key])
    : [parsed];
  return entries.map(entry => entry?.json ?? entry);
}
