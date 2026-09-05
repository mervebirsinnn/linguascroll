import AsyncStorage from "@react-native-async-storage/async-storage";

// Anonymous userId'yi app restart'ları arasında kalıcı tutmak için tek bir
// key/value çift — genel bir storage katmanı değil, tek bir gerçek ihtiyaç.
const ANONYMOUS_USER_ID_KEY = "linguascroll.anonymousUserId";

export async function getStoredAnonymousUserId(): Promise<string | null> {
  return AsyncStorage.getItem(ANONYMOUS_USER_ID_KEY);
}

export async function storeAnonymousUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
}
