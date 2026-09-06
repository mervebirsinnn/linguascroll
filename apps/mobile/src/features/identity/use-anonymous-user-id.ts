import { useEffect, useState } from "react";
import { anonymousUserSchema } from "@linguascroll/shared-types";
import { checkUserExists } from "./api/check-user-exists";
import { createAnonymousUser } from "./api/create-anonymous-user";
import { getStoredAnonymousUserId, storeAnonymousUserId } from "./storage";

/**
 * useFeed'deki (bkz. features/feed/hooks/use-feed.ts) discriminated-union
 * deseniyle aynı: loading/error/success'i ayrı boolean'lar yerine tek bir union
 * olarak modelliyoruz.
 */
export type AnonymousUserIdState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; userId: string };

/**
 * Local storage da bir runtime trust boundary — cihazda elle değiştirilmiş,
 * eski bir formattan kalmış ya da bozulmuş bir değer barındırabilir. Ayrı bir
 * storage-validation abstraction'ı kurmuyoruz: zaten var olan shared contract'ı
 * (anonymousUserSchema) tekrar kullanıyoruz.
 */
function isValidAnonymousUserId(value: string): boolean {
  return anonymousUserSchema.safeParse({ id: value }).success;
}

/**
 * Bootstrap kararının kendisi — React'ten bağımsız, saf bir async fonksiyon.
 * useAnonymousUserId hook'undan BİLEREK ayrı: RNTL gibi yeni bir test kütüphanesi
 * eklemeden, ileride sade bir Jest testiyle doğrudan çağrılabilir.
 *
 * storage boş VEYA formatı geçersiz VEYA backend'de artık var olmayan
 * ("hayalet" — bkz. checkUserExists yorumu, örn. bir dev/test DB reset'i
 * sonrası) → yeni anonymous user yaratılır, storage yeni id ile overwrite
 * edilir. Format geçerli VE backend'de gerçekten varsa aynen kullanılır.
 */
async function resolveAnonymousUserId(): Promise<string> {
  const existingUserId = await getStoredAnonymousUserId();
  if (existingUserId && isValidAnonymousUserId(existingUserId) && (await checkUserExists(existingUserId))) {
    return existingUserId;
  }

  const user = await createAnonymousUser();
  await storeAnonymousUserId(user.id);
  return user.id;
}

/**
 * App açılışında bir kere çalışır: local storage'da kalıcı, geçerli formatlı bir
 * anonymous userId var mı bakar, yoksa backend'den yeni bir tane yaratıp saklar.
 * Auth yok — bu id, quiz answer / video watch-event çağrılarının hepsinin
 * taşıdığı tek kimlik.
 */
export function useAnonymousUserId(): AnonymousUserIdState {
  const [state, setState] = useState<AnonymousUserIdState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;

    resolveAnonymousUserId()
      .then((userId) => {
        if (!isCancelled) {
          setState({ status: "success", userId });
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
          setState({ status: "error", message });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}
