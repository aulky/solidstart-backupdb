import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Mengambil JWT_SECRET dari environment.
 * Fail-fast jika tidak diset (sesuai TECH_STACK.md §3 item 3).
 */
function getJwtSecret(): Uint8Array {
  const secret =
    typeof process !== "undefined" ? process.env.JWT_SECRET : undefined;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required. Server cannot start without it."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  sub: string;
  role: string;
}

/**
 * Membuat JWT token baru dengan payload admin.
 * Algoritma: HS256. Masa berlaku: 24 jam.
 */
export async function signJwt(username: string): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ sub: username, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

/**
 * Memverifikasi JWT token dan mengembalikan payload.
 * Melempar error jika token tidak valid atau sudah kedaluwarsa.
 */
export async function verifyJwt(token: string): Promise<SessionPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as SessionPayload;
}

/**
 * Mengekstrak nilai cookie dari header Cookie standard Web Request.
 */
export function getCookieValue(
  request: Request,
  cookieName: string
): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name.trim() === cookieName) {
      return rest.join("=").trim();
    }
  }
  return null;
}

/**
 * Mengambil sesi dari cookie request.
 * Mengembalikan payload JWT jika valid, null jika tidak valid atau tidak ada.
 */
export async function getSessionFromCookie(
  request: Request
): Promise<SessionPayload | null> {
  const token = getCookieValue(request, "session_token");
  if (!token) return null;

  try {
    return await verifyJwt(token);
  } catch {
    return null;
  }
}
