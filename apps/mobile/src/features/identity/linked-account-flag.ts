import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 2026-10-28 — "bu cihazda bir Google hesabı bağlandı mı?" bayrağı (bkz. auth-state.ts,
 * `guestAllowed`). Bağlandıysa çıkıştan sonra yeni anonim (yeni 10 ücretsiz hak) oturum AÇILMAZ.
 * Uygulama silinince bayrak da silinir — bu, kabul edilen yeniden kurulum sınırıyla aynı kapsam.
 * Okuma hatası "bağlanmadı" sayılır: en kötü durumda kullanıcı misafir olarak devam eder.
 */
const STORAGE_KEY = "looplish.identity.hasLinkedAccount";

export async function readLinkedAccountFlag(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markAccountLinked(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
}
