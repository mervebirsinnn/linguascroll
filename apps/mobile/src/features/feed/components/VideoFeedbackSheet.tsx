import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { VideoFeedbackRequest } from "@linguascroll/shared-types";
import { sendVideoFeedback } from "../api/send-video-feedback";
const reasons: [VideoFeedbackRequest["reason"], string][] = [["subtitle", "Altyazıda hata var"], ["translation", "Anlam / çeviri hatalı"], ["too_easy", "Benim için çok kolay"], ["too_hard", "Benim için çok zor"], ["playback", "Video oynatılmıyor"], ["other", "Diğer"]];
export function VideoFeedbackSheet({ videoId, open, onClose }: { videoId: string; open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<VideoFeedbackRequest["reason"]>("subtitle");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "saved" | "error">("idle");
  const locked = useRef(false);
  const generation = useRef(0);
  useEffect(() => { generation.current++; setStatus("idle"); setComment(""); setReason("subtitle"); locked.current = false; return () => { generation.current++; }; }, [open, videoId]);
  async function send() {
    if (locked.current) return;
    locked.current = true; setStatus("sending");
    const request = generation.current;
    try { await sendVideoFeedback(videoId, { reason, comment }); if (generation.current === request) setStatus("saved"); }
    catch { if (generation.current === request) setStatus("error"); }
    finally { if (generation.current === request) locked.current = false; }
  }
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" }}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "85%", backgroundColor: "#1b1724", borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: "#f5f4f9", fontSize: 21, fontWeight: "700" }}>İçeriği birlikte iyileştirelim</Text>
        {status === "saved" ? <Text style={{ color: "#c8b5ff", fontSize: 16 }}>Geri bildirimin alındı. Teşekkür ederiz!</Text> : <>
          {reasons.map(([value, label]) => <Pressable key={value} disabled={status === "sending"} onPress={() => setReason(value)} accessibilityRole="radio" accessibilityState={{ checked: reason === value }} style={{ padding: 12, minHeight: 44, borderWidth: 1, borderColor: reason === value ? "#c8b5ff" : "#403052", borderRadius: 12 }}><Text style={{ color: "#eee" }}>{label}</Text></Pressable>)}
          <TextInput value={comment} onChangeText={setComment} maxLength={500} multiline editable={status !== "sending"} accessibilityLabel="Geri bildirim açıklaması (isteğe bağlı)" placeholder="Eklemek istediğin bir şey var mı? (İsteğe bağlı)" placeholderTextColor="#aaa" style={{ color: "#eee", minHeight: 64, borderWidth: 1, borderColor: "#403052", borderRadius: 12, padding: 12 }} />
          {status === "error" && <Text accessibilityRole="alert" style={{ color: "#ffb3b3" }}>Gönderilemedi. Tekrar deneyebilirsin.</Text>}
          <Pressable disabled={status === "sending"} onPress={() => { void send(); }} accessibilityRole="button" style={{ padding: 14, backgroundColor: "#c8b5ff", borderRadius: 12 }}><Text style={{ color: "#171321", textAlign: "center", fontWeight: "700" }}>{status === "sending" ? "Gönderiliyor…" : "Gönder"}</Text></Pressable>
        </>}
        <Pressable onPress={onClose} accessibilityRole="button" style={{ padding: 12, minHeight: 44 }}><Text style={{ color: "#c8b5ff", textAlign: "center" }}>Videoya dön</Text></Pressable>
      </ScrollView>
    </View>
  </Modal>;
}
