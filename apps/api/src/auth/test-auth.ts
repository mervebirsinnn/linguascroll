import { randomUUID } from "node:crypto";
import type { TestingModuleBuilder } from "@nestjs/testing";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { usersTable } from "../users/users.schema";
import { FirebaseTokenVerifier } from "./firebase-token-verifier";

/**
 * 2026-10-27 — e2e testleri için TEK, dar amaçlı kimlik yardımcısı (test-database.ts ile aynı
 * "generic test framework DEĞİL" yaklaşımı). Testler gerçek Firebase'e gitmiyor: sadece
 * FirebaseTokenVerifier override ediliyor; guard, UsersService ve tüm DB yolu GERÇEK.
 * Token biçimi `test-token:<firebaseUid>`; başka her şey geçersiz token sayılır (→ 401).
 * Gerçek imza/issuer/audience/exp doğrulaması firebase-admin'in sorumluluğu, burada taklit edilmiyor.
 */
const TEST_TOKEN_PREFIX = "test-token:";

class TestFirebaseTokenVerifier {
  verify(idToken: string): Promise<string | null> {
    return Promise.resolve(idToken.startsWith(TEST_TOKEN_PREFIX) ? idToken.slice(TEST_TOKEN_PREFIX.length) : null);
  }
}

export function withTestAuth(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder.overrideProvider(FirebaseTokenVerifier).useValue(new TestFirebaseTokenVerifier());
}

export function bearerFor(firebaseUid: string): string {
  return `Bearer ${TEST_TOKEN_PREFIX}${firebaseUid}`;
}

/** Firebase hesabına bağlı bir backend kullanıcısı yaratır; `authorization` header'ını döner. */
export async function createAuthenticatedUser(db: NodePgDatabase): Promise<{ userId: string; authorization: string }> {
  const firebaseUid = `firebase-${randomUUID()}`;
  const [user] = await db.insert(usersTable).values({ firebaseUid }).returning({ id: usersTable.id });
  if (!user) throw new Error("Beklenen kullanıcı insert edilemedi");
  return { userId: user.id, authorization: bearerFor(firebaseUid) };
}
