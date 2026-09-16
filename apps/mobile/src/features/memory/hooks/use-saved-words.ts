import { useEffect, useState } from "react";
import type { SavedWord } from "@linguascroll/shared-types";
import { fetchSavedWords } from "../api/fetch-saved-words";

/**
 * use-feed.ts'teki discriminated-union deseninin KÜÇÜLTÜLMÜŞ hali — burada
 * pagination/loadMore/refresh yok (Memory ekranı basit bir liste), bu yüzden
 * o dosyanın concurrency-guard/cursor makinesini KOPYALAMIYORUZ (Chunk 16
 * kullanıcı kararı: "dashboard/framework'e büyütme").
 */
export type SavedWordsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; words: SavedWord[] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
}

export function useSavedWords(userId: string): { state: SavedWordsState; reload: () => void } {
  const [state, setState] = useState<SavedWordsState>({ status: "loading" });
  // Mount effect'i ile reload() arasında paylaşılan bir "yeniden yükle" tetikleyicisi —
  // her artırıldığında effect yeniden çalışır (bkz. deps).
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setState({ status: "loading" });

    fetchSavedWords(userId)
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
