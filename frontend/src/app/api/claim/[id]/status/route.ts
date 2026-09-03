import { isValidClaimStatus } from '@/lib/server/validators';
import { getClaim, updateClaimStatus } from '@/lib/server/tursoStore';
import { apiOk, apiError, apiRoute, readJsonBody } from '@/lib/server/http';

export const PATCH = apiRoute(async (req, { params }) => {
  const { id } = await params;
  const { status } = await readJsonBody<{ status?: unknown }>(req);

  if (!isValidClaimStatus(status)) {
    return apiError(400, 'status must be pending, claimed, or failed');
  }

  const existingClaim = await getClaim(id);
  if (!existingClaim) {
    return apiError(404, 'Claim not found');
  }

  if (existingClaim.status !== 'pending' && existingClaim.status !== status) {
    return apiError(409, 'Claim has already been finalized');
  }

  const claim = await updateClaimStatus(id, status);
  return apiOk(claim);
});
