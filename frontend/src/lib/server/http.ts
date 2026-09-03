import 'server-only';
import { NextResponse } from 'next/server';

const DEFAULT_MAX_BYTES = 32 * 1024;

export class PayloadTooLargeError extends Error {}

/**
 * Reads and JSON-parses a request body with a hard byte cap — the Web
 * `Request`/`req.json()` API has no equivalent to Express's
 * `express.json({ limit })`, so this is that guard reimplemented directly
 * against the body stream (a lying Content-Length header can't bypass it).
 */
export async function readJsonBody<T = unknown>(req: Request, maxBytes = DEFAULT_MAX_BYTES): Promise<T> {
  const reader = req.body?.getReader();
  if (!reader) return {} as T;

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError('Request body is too large');
    }
    chunks.push(value);
  }

  if (total === 0) return {} as T;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(status: number, error: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...(details ? { details } : {}) }, { status });
}

type RouteHandler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/**
 * Wraps a route handler so nothing async it throws is ever left unhandled —
 * the equivalent of Express's asyncHandler + the shared errorHandler
 * middleware, collapsed into one place since there's no middleware chain here.
 */
export function apiRoute(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return apiError(413, 'Request body is too large');
      }
      if (err instanceof SyntaxError) {
        return apiError(400, 'Invalid JSON body');
      }
      console.error('Unhandled API error:', err);
      return apiError(500, 'Internal server error');
    }
  };
}
