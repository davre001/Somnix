import { getClaim } from '@/lib/server/tursoStore';
import { apiOk, apiError, apiRoute } from '@/lib/server/http';

export const GET = apiRoute(async (_req, { params }) => {
  const { id } = await params;
  const claim = await getClaim(id);

  if (!claim) {
    return apiError(404, 'Claim not found');
  }

  return apiOk(claim);
});
