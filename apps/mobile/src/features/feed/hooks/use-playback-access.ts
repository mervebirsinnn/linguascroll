import { useEffect, useState } from "react";
import type { PlaybackAccessResponse, FeedScope } from "@linguascroll/shared-types";
import { requestPlaybackAccess } from "../api/request-playback-access";

/**
 * 2026-10-27 — feed'deki bir videonun oynatma URL'i. Feed, erişimi ZATEN olan videolar için
 * URL'i doğrudan taşır (`ready`); taşımıyorsa (`playbackUrl: null`) erişim backend'den istenir.
 * Ücretsiz hak backend'de, o istekte tüketilir — bu dosya hiçbir sayaç/limit bilmez.
 *
 * Geçişler use-feed.ts / paywall-state.ts ile AYNI desende saf fonksiyonlar (React'siz test edilir).
 */
export type PlaybackAccessState =
  | { status: "ready"; playbackUrl: string }
  /** URL yok ve video henüz ekranda aktif olmadı — istek atılmaz, hak tüketilmez. */
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "paywall" }
  | { status: "error" };

export function initialPlaybackAccessState(feedPlaybackUrl: string | null): PlaybackAccessState {
  return feedPlaybackUrl !== null ? { status: "ready", playbackUrl: feedPlaybackUrl } : { status: "idle" };
}

/**
 * Erişim SADECE video ekranda aktif olunca istenir. FlatList aktif item'ın birkaç komşusunu
 * önceden mount ediyor (Feed.tsx WINDOW_SIZE) — mount anında istek atmak, kullanıcının hiç
 * görmeyeceği videolar için kalıcı hak tüketirdi. Bedeli: henüz açılmamış (ücretsiz) bir video
 * aktif olduğunda erişim + yükleme kadar kısa bir bekleme; erişimi olan videolar (URL'li)
 * eskisi gibi önceden yüklenir.
 */
export function applyActivation(state: PlaybackAccessState, isActive: boolean): PlaybackAccessState {
  return isActive && state.status === "idle" ? { status: "requesting" } : state;
}

export function applyAccessResponse(response: PlaybackAccessResponse): PlaybackAccessState {
  return response.status === "granted" ? { status: "ready", playbackUrl: response.playbackUrl } : { status: "paywall" };
}

export function applyAccessError(): PlaybackAccessState {
  return { status: "error" };
}

/** Sadece hata durumundan yeniden denenebilir (paywall bir hata değil, iş sonucu). */
export function applyRetry(state: PlaybackAccessState): PlaybackAccessState {
  return state.status === "error" ? { status: "requesting" } : state;
}

/**
 * Feed yenilenince (ör. satın alma sonrası) aynı video yeni bir URL'le gelebilir — feed'in
 * verdiği URL her zaman yerel durumdan önceliklidir. URL hâlâ null ise mevcut durum korunur.
 */
export function applyFeedPlaybackUrl(state: PlaybackAccessState, feedPlaybackUrl: string | null): PlaybackAccessState {
  if (feedPlaybackUrl === null) return state;
  if (state.status === "ready" && state.playbackUrl === feedPlaybackUrl) return state;
  return { status: "ready", playbackUrl: feedPlaybackUrl };
}

export function usePlaybackAccess(videoId: string, feedPlaybackUrl: string | null, isActive: boolean, scope: FeedScope = "all"): { state: PlaybackAccessState; retry: () => void } {
  const [state, setState] = useState<PlaybackAccessState>(() => initialPlaybackAccessState(feedPlaybackUrl));

  useEffect(() => {
    setState((current) => applyFeedPlaybackUrl(current, feedPlaybackUrl));
  }, [feedPlaybackUrl]);

  useEffect(() => {
    setState((current) => applyActivation(current, isActive));
  }, [isActive]);

  useEffect(() => {
    if (state.status !== "requesting") return undefined;
    let cancelled = false;
    requestPlaybackAccess(videoId, scope)
      .then((response) => {
        if (!cancelled) setState(applyAccessResponse(response));
      })
      .catch(() => {
        if (!cancelled) setState(applyAccessError());
      });
    return () => {
      cancelled = true;
    };
  }, [state.status, videoId, scope]);

  return { state, retry: () => setState(applyRetry) };
}
