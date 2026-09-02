import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: "Route not found" });
}

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("Unhandled API error:", error);
  res.status(500).json({ ok: false, error: "Internal server error" });
}
