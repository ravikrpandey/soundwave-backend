export function trpcBatchPayload(data: unknown) {
  return [{ result: { data: { json: data } } }];
}
