import { useEffect, useState } from "react";
import type { SavedWord } from "@linguascroll/shared-types";
import { fetchReviewSession } from "../api/fetch-review-session";

/**
 * use-saved-words.ts ile AYNI küçük discriminated-union deseni. Review
 * session'ı BİR KEZ, mount'ta çekiyoruz — dondurulmuş bir liste olarak
 * ReviewScreen tarafından sırayla tüketiliyor (feed'in frozen-plan session
 * deseniyle KAVRAMSAL olarak benzer: sıralama backend'de bir kez hesaplanır,
 * client cevapladıkça yeniden sorgulayıp sırayı DEĞİŞTİRMEZ).
 */
export type ReviewSessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; words: SavedWord[] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
}

export function useReviewSession(userId: string): { state: ReviewSessionState; reload: () => void } {
  const [state, setState] = useState<ReviewSessionState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setState({ status: "loading" });

    fetchReviewSession(userId)
      .then((words) => {
        if (!isCancelled) {
          setState({ status: "success", words });
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setState({ status: "error", message: errorMessage(error) });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [userId, reloadToken]);

  function reload(): void {
    setReloadToken((current) => current + 1);
  }

  return { state, reload };
}
