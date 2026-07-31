import { getSessionFromCookie, type SessionPayload } from "../services/auth.js";

export interface AuthenticatedResult {
  session: SessionPayload;
}

/**
 * Middleware/Guard server-side untuk memverifikasi autentikasi pada API endpoint.
 *
 * Mengabaikan request tanpa cookie sesi yang valid dan merespons HTTP 401 Unauthorized.
 * Mengembalikan session payload jika terautentikasi.
 */
export async function requireAuth(
  request: Request
): Promise<SessionPayload | Response> {
  const session = await getSessionFromCookie(request);

  if (!session) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required to access this resource",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  return session;
}
