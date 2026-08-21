import "server-only";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { DATA_DIR, SECRET_FILE } from "./env";

const COOKIE = "tt_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

export type Session = {
  memberId: string;
  displayName: string;
  role: "admin" | "member";
  ver: number;
};

let cached: Uint8Array | null = null;

/**
 * 세션 서명키. 환경변수가 있으면 그걸 쓰고, 없으면 .data 에 만들어 재사용한다.
 * 덕분에 설정 없이 바로 개발 서버를 띄울 수 있다. (배포 시에는 SESSION_SECRET 지정)
 */
async function secret(): Promise<Uint8Array> {
  if (cached) return cached;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) {
    cached = new TextEncoder().encode(fromEnv);
    return cached;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  let value: string;
  try {
    value = (await fs.readFile(SECRET_FILE, "utf8")).trim();
    if (!value) throw new Error("empty");
  } catch {
    value = randomBytes(32).toString("base64");
    await fs.writeFile(SECRET_FILE, value, "utf8");
  }
  cached = new TextEncoder().encode(value);
  return cached;
}

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(await secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return {
      memberId: String(payload.memberId),
      displayName: String(payload.displayName),
      role: payload.role === "admin" ? "admin" : "member",
      ver: Number(payload.ver ?? 1),
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
