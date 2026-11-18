import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { PassageLevel } from "@linguascroll/shared-types";
import { unsaveWord } from "../feed/api/unsave-word";
import { answerPassageQuestion, fetchPassages, savePassageWord } from "./api/passages-api";
import { subscribeToAccessVerified } from "../subscription/access-events";
import { PassagesController, selectLevelState, type PassagesDeps } from "./passages-controller";

const realDeps: PassagesDeps = {
  fetchPassages,
  answerPassageQuestion,
  savePassageWord,
  unsaveWord,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Okuma pratiği hook'u: PassagesController'ın ince React sarmalayıcısı (tüm zamanlama/yarış mantığı denetleyicide, orada test
 * edilir). Kullanıcı (`userId`) değişince YENİ denetleyici kurulur; eskisi deactivate edilir → eski hesabın uçuştaki yanıtları
 * yeni hesabın durumunu yazamaz. Seviye değişimi denetleyiciyi korur: her seviye kendi yuvasında yaşar.
 *
 * Erişim: abonelik yolları (paywall/restore/hesap ekranı) sunucunun doğruladığı değişimi access-events üzerinden yayınlar;
 * burada dinlenir ve denetleyici tüm önbelleği atıp aktif seviyeyi yeniden çeker.
 */
export function usePassages(userId: string, level: PassageLevel, deps: PassagesDeps = realDeps) {
  const controller = useMemo(() => new PassagesController(deps), [userId, deps]); // eslint-disable-line react-hooks/exhaustive-deps -- userId kimlik anahtarı: değişince yeni denetleyici
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    controller.activate();
    const unsubscribe = subscribeToAccessVerified(userId, (active) => controller.onAccessVerified(active));
    return () => {
      unsubscribe();
      controller.deactivate();
    };
  }, [controller, userId]);

  useEffect(() => {
    controller.ensureLoaded(level);
  }, [controller, level]);

  return {
    state: selectLevelState(snapshot, level),
    pendingAnswers: snapshot.pendingAnswers,
    answerErrors: snapshot.answerErrors,
    pendingWords: snapshot.pendingWords,
    wordErrors: snapshot.wordErrors,
    eliminated: snapshot.eliminated,
    accessChanged: snapshot.accessChanged,
    loadMore: useCallback(() => controller.loadMore(level), [controller, level]),
    refresh: useCallback(() => controller.refresh(level), [controller, level]),
    answer: controller.answer.bind(controller),
    recheckAnswer: controller.recheckAnswer.bind(controller),
    saveWord: controller.saveWord.bind(controller),
    unsaveWord: controller.unsaveWord.bind(controller),
    clearWordError: controller.clearWordError.bind(controller),
    toggleElimination: controller.toggleElimination.bind(controller),
  };
}
