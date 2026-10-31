import type { Topic } from "./video";

/** UI etiketleri ve içerik üretim kimlikleri aynı sözlüğe bağlıdır. */
export const TOPIC_LABELS: Record<Topic, string> = {
  dating: "İlişkiler",
  travel: "Seyahat",
  career: "Kariyer",
  lifestyle: "Yaşam Tarzı",
  humor: "Mizah",
  food: "Yemek ve mutfak",
  fitness: "Spor ve sağlıklı yaşam",
  technology: "Teknoloji ve yapay zekâ",
  science: "Bilim ve keşif",
  culture: "Kültür ve tarih",
  psychology: "Psikoloji ve kişisel gelişim",
  finance: "Para ve ekonomi",
  nature: "Doğa ve hayvanlar",
  music: "Müzik",
  cinema: "Film ve diziler",
  education: "Eğitim ve öğrenci hayatı",
};
