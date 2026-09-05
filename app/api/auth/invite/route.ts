import { forwardAuth } from "../_shared";

export async function POST(request: Request) {
  return forwardAuth(request, "/api/v1/auth/invitations/accept/", await request.json());
}
