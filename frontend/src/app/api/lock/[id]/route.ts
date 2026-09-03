import { getLock } from '@/lib/server/tursoStore';
import { apiOk, apiError, apiRoute } from '@/lib/server/http';

export const GET = apiRoute(async (_req, { params }) => {
  const { id } = await params;
  const lock = await getLock(id);

  if (!lock) {
    return apiError(404, 'Lock not found');
  }

  return apiOk(lock);
});
