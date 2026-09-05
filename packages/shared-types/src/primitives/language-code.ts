import { z } from "zod";

/**
 * BCP-47 benzeri bir dil kodunun kaba şekil kontrolü ("en", "tr", "en-US", "zh-Hans").
 * Tam BCP-47 grameri doğrulanmıyor; amaç sadece bariz hatalı değerleri API sınırında
 * yakalamak. Sabit bir dil listesi (enum) bilinçli olarak kullanılmıyor — roadmap
 * çoklu dil çiftini mimaride açık tutuyor, enum burada erken bir kısıtlama olurdu.
 */
export const languageCodeSchema = z
  .string()
  .regex(/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "BCP-47 benzeri bir dil kodu bekleniyor (ör. \"en\", \"tr\")");
