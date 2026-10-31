/** Hermes sürümüne bağlı AbortSignal.timeout yerine standart AbortController kullanılır. */
export async function fetchWithTimeout(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1] = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
