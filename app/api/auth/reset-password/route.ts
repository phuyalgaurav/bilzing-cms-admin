import { forwardAuth } from "../_shared";

export async function POST(request: Request) {
  return forwardAuth(
    "/api/v1/auth/password-reset/confirm/",
    await request.json(),
  );
}
