import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: "Route not found" });
}

export function errorHandler(
  error: Error & { status?: number; statusCode?: number; type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("Unhandled API error:", error);
  const status = error.status ?? error.statusCode;
  if (status && status >= 400 && status < 500) {
    const message = status === 413 ? "Request body is too large" : error.message;
    res.status(status).json({ ok: false, error: message });
    return;
  }

  res.status(500).json({ ok: false, error: "Internal server error" });
}
