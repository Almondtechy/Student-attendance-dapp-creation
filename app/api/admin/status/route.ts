import { getOwnerAddress } from "@/lib/auth";

/**
 * Public admin status endpoint. Returns the contract owner's address
 * (derived from the server PRIVATE_KEY) so the frontend can determine
 * whether the connected wallet has admin privileges. The address itself
 * is public info, so no auth is needed here.
 */
export async function GET() {
  return Response.json({ ownerAddress: getOwnerAddress() });
}
