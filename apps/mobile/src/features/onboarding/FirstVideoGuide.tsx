import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type GuideAction, type GuideStep } from './first-video-guide-state';

const inactive = { step: 'done' as GuideStep, videoId: null as string | null, begin: (_id: string) => {}, act: (_action: GuideAction) => {} };
export const GuideContext = createContext(inactive);
export const useFirstVideoGuide = () => useContext(GuideContext);

const messages: Partial<Record<GuideStep, string>> = {
  word: '↓ Altı çizili bir kelimeye dokun. Türkçe anlamını hemen gör.',
  save: '↓ Bu kelimeyi saklamak için “Kelimelerime kaydet”e dokun.',
  closeWord: '✓ Kelimen kaydedildi. Şimdi “Videoya dön”e dokun.',
  sentence: '↓ Cümlenin kelimeler arasındaki boşluğuna veya kutunun kenarına dokun. Cümle açıklamasını aç.',
  closeSentence: 'Cümle açıklaması burada. Türkçe düğmesinden anlamına bak; ardından “Videoya dön”e dokun.',
  memory: '↑ Kaydettiğin kelimeyi görmek için “Kelimelerim”e dokun.',
  account: '↑ “Hesabım”a dokun. İngilizce seviyeni ve hesap ayarlarını burada bulacaksın.',
};
export function GuideTip({ steps, visible = true }: { steps: GuideStep[]; visible?: boolean }) {
  const guide = useFirstVideoGuide();
  const message = messages[guide.step];
  if (!visible || !steps.includes(guide.step) || !message) return null;
  return <View style={styles.tip} testID={`guide-${guide.step}`}>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="İlk kullanım rehberini atla" onPress={() => guide.act('skip')} style={styles.skip}>
      <Text style={styles.skipText}>Atla</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  tip: { backgroundColor: '#211b32ed', borderColor: '#bca7ff', borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, paddingLeft: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  text: { color: '#f4efff', fontSize: 14, lineHeight: 21, flex: 1 },
  skip: { minHeight: 44, minWidth: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  skipText: { color: '#d6c5ff', fontSize: 13 },
});
