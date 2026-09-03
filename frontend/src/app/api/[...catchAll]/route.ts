import { apiError } from '@/lib/server/http';

// Only reached when no more specific /api/* route matched — Next.js always
// prefers a static/dynamic segment match over a catch-all.
function notFound() {
  return apiError(404, 'Route not found');
}

export const GET = notFound;
export const POST = notFound;
export const PATCH = notFound;
export const PUT = notFound;
export const DELETE = notFound;
