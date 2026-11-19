import { Text } from "react-native";
import type { Passage } from "@linguascroll/shared-types";
import type { PassageWordSheetEntry } from "../passage-word-entry";
import { PageFrame, pageStyles } from "./PageFrame";
import { PassageParagraphs } from "./PassageParagraphs";

type OpenPassage = Extract<Passage, { access: "open" }>;

type PassageTextPageProps = {
  passage: OpenPassage;
  height: number;
  width: number;
  /** Dokunulan kelime GEÇİŞİ (span kimliği + o geçişin cümlesi dahil): ortak kelime penceresi bunu gösterir. */
  onPressWord: (entry: PassageWordSheetEntry) => void;
  onNext: () => void;
};

/**
 * Sayfa 1/N: metnin kendisi. Sunucunun hazırladığı "run"lar çizilir (istemci offset hesabı YAPMAZ); kelime/ifade run'ları
 * dokunulabilir. Kayıtlı kelime farklı biçimlenir (renk + alt çizgi: yalnız renkle belirtilmez).
 */
export function PassageTextPage({ passage, height, width, onPressWord, onNext }: PassageTextPageProps) {
  return (
    <PageFrame height={height} width={width} chip={`${passage.level} · ${passage.topic}`} onNext={onNext} nextLabel="Sorulara geç ›">
      <Text accessibilityRole="header" style={pageStyles.title}>{passage.title}</Text>
      <PassageParagraphs passage={passage} onPressWord={onPressWord} />
      <Text style={pageStyles.muted}>Metni kaydırarak oku. Hazır olduğunda ‘Sorulara geç’ düğmesine dokun.</Text>
    </PageFrame>
  );
}
