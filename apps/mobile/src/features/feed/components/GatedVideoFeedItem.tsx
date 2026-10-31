import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { FeedPlayableVideo } from "@linguascroll/shared-types";
import type { AccountLinkControl } from "../../identity/auth-state";
import { PaywallFeedItem } from "../../subscription/PaywallFeedItem";
import { usePlaybackAccess } from "../hooks/use-playback-access";
import { VideoFeedItem } from "./VideoFeedItem";

type GatedVideoFeedItemProps = Omit<ComponentProps<typeof VideoFeedItem>, "video"> & {
  video: FeedPlayableVideo;
  /** Yerinde paywall gösterilirse misafir kullanıcının Google hesabı bağlaması için (bkz. PaywallFeedItem). */
  account: AccountLinkControl;
  /** Erişim reddedilip yerinde paywall gösterilirse, satın alma sonrası feed'i yeniler. */
  onUnlocked: () => void;
};

/**
 * 2026-10-27 — VideoFeedItem'ı (native player'ı) HİÇ değiştirmeden önüne konan erişim katmanı
 * (bkz. native-UI değişiklik riski: player yaşam döngüsüne dokunulmuyor). VideoFeedItem
 * yalnızca elinde geçerli bir URL varken mount edilir; `useVideoPlayer` her zaman string alır.
 *
 * Erişim yalnızca video ekranda AKTİF olunca istenir (bkz. use-playback-access.ts) — önceden
 * mount edilen komşu videolar hak tüketmez.
 *
 * `paywall`: feed bütçeyi yalnızca kalıcı tüketimden hesapladığı için bir sonraki sayfa, önceki
 * sayfanın açılmamış videolarıyla birlikte kalan haktan fazla yeni video gösterebilir; ayrıca
 * başka bir cihaz son hakkı aynı anda kullanmış olabilir. Bu durumda videonun yerinde paywall.
 */
export function GatedVideoFeedItem({ video, account, onUnlocked, ...rest }: GatedVideoFeedItemProps) {
  const { state, retry } = usePlaybackAccess(video.id, video.playbackUrl, rest.isActive);

  if (state.status === "ready") {
    return <VideoFeedItem {...rest} video={{ ...video, playbackUrl: state.playbackUrl }} />;
  }
  if (state.status === "paywall") {
    return <PaywallFeedItem height={rest.height} width={rest.width} userId={rest.userId} account={account} onUnlocked={onUnlocked} />;
  }
  return (
    <View style={[styles.placeholder, { height: rest.height, width: rest.width }]}>
      {state.status === "idle" || state.status === "requesting" ? (
        <ActivityIndicator color="#fff" accessibilityLabel="Video hazırlanıyor" />
      ) : (
        <>
          <Text style={styles.errorText}>Video yüklenemedi.</Text>
          <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { color: "#fff", fontSize: 15 },
  retry: { borderWidth: 1, borderColor: "#fff", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
