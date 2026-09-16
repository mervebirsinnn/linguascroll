import { useEffect, useState } from "react";
import type { WordsProgress } from "@linguascroll/shared-types";
import { fetchWordsProgress } from "../api/fetch-words-progress";

/** use-saved-words.ts ile AYNI küçük discriminated-union deseni. */
export type WordsProgressState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; progress: WordsProgress };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
}

export function useWordsProgress(userId: string): { state: WordsProgressState; reload: () => void } {
  const [state, setState] = useState<WordsProgressState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setState({ status: "loading" });

    fetchWordsProgress(userId)
      .then((progress) => {
        if (!isCancelled) {
          setState({ status: "success", progress });
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
