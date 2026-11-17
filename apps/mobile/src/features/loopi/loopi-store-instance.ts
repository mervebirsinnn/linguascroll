import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLoopiStore } from "./loopi-store";

/**
 * 2026-11-17 — uygulamadaki TEK Loopi deposu (AsyncStorage'a bağlı). Kayıt noktaları (use-saved-word-ids,
 * WordGlossSheet), Feed'deki nokta ve Kelimelerim kartı aynı örneği kullanır ki yayıncı (subscribe) ve yazma
 * sırası (kullanıcı başına kuyruk) gerçekten ortak olsun.
 */
export const loopiStore = createLoopiStore(AsyncStorage);
