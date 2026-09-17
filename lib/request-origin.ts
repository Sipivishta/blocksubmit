const INVALID_ORIGIN_MESSAGE = 'Invalid request origin.';

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' && url.pathname !== '') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function trustedOrigins(): Set<string> {
  const origins = new Set<string>();
  const configured = process.env.APP_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];
  for (const origin of configured) {
    const normalized = normalizeOrigin(origin);
    if (normalized) origins.add(normalized);
  }

  // VERCEL_URL is a server-provided deployment hostname, not request data.
  if (process.env.VERCEL_URL) {
    const normalized = normalizeOrigin(`https://${process.env.VERCEL_URL}`);
    if (normalized) origins.add(normalized);
  }

  // Keep local development usable without accepting arbitrary hosts. Production
  // deployments must configure APP_ORIGIN (or receive VERCEL_URL from Vercel).
  if (process.env.NODE_ENV !== 'production') {
    for (const port of [3000, 3001, 3002, 3003]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  return origins;
}

/** Return a stable 403 response unless the request has an exact trusted origin. */
export function validateMutationOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') {
    return Response.json({ error: INVALID_ORIGIN_MESSAGE }, { status: 403 });
  }

  const normalized = normalizeOrigin(origin);
  if (!normalized || !trustedOrigins().has(normalized)) {
    return Response.json({ error: INVALID_ORIGIN_MESSAGE }, { status: 403 });
  }

  return null;
}
