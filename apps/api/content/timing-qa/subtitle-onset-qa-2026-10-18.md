# Altyazı / ses onset QA raporu (uygulama öncesi (kuru koşu))

Düzeltme dedektörü: `relative(-32dB from p95)` · Bağımsız doğrulayıcı: `absolute(-40dBFS)` · Hedef: |hata| ≤ 300 ms

Hata = segment başlangıcı − doğrulayıcının ölçtüğü gerçek konuşma başlangıcı (negatif = altyazı sesten ÖNCE).

| İçerik | Sonuç | Segment | Ort. önceki hata | Maks mutlak önceki | Maks mutlak sonraki | Uygulandı |
| --- | --- | --- | --- | --- | --- | --- |
| a1-ielts-ask-for-directions | GEÇTİ | 5 | -172 ms | 340 ms | 10 ms | hayır |
| a1-ielts-black-coffee | GEÇTİ | 6 | -250 ms | 660 ms | 10 ms | hayır |
| a1-ielts-apply-for-a-job | GEÇTİ | 5 | -284 ms | 700 ms | 10 ms | hayır |
| a1-ielts-after-dark | GEÇTİ | 6 | -383 ms | 700 ms | 10 ms | hayır |
| a1-ielts-all-the-time | GEÇTİ | 5 | -268 ms | 680 ms | 10 ms | hayır |
| c1-ielts-alternative-medicine | GEÇTİ | 4 | -425 ms | 680 ms | 20 ms | hayır |
| c1-ielts-black-ice | GEÇTİ | 5 | -308 ms | 700 ms | 10 ms | hayır |
| c1-ielts-black-sheep | GEÇTİ | 6 | -267 ms | 640 ms | 20 ms | hayır |
| c1-ielts-remote-work-debate | GEÇTİ | 4 | -375 ms | 720 ms | 0 ms | hayır |
| c1-ielts-the-big-picture | GEÇTİ | 5 | -292 ms | 740 ms | 10 ms | hayır |
| c2-ielts-art-and-restraint | GEÇTİ | 3 | -293 ms | 720 ms | 10 ms | hayır |
| c2-ielts-language-and-thought | GEÇTİ | 4 | -390 ms | 720 ms | 10 ms | hayır |
| c2-ielts-moral-ambiguity | GEÇTİ | 3 | -467 ms | 680 ms | 10 ms | hayır |
| c2-ielts-nuance-of-persuasion | GEÇTİ | 4 | -205 ms | 720 ms | 10 ms | hayır |
| c2-ielts-unintended-consequences | **KALDI** | 5 | -285 ms | 640 ms | 10 ms | hayır |

## c2-ielts-unintended-consequences — publish'e KAPALI
- #2: düzeltilemedi (no-onset)

## Segment ayrıntıları

### a1-ielts-ask-for-directions
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 560 | 740 | -180 | 740 | 0 | ok |
| 2 | 3020 | 3040 | -20 | 3050 | 10 | ok |
| 3 | 4980 | 5280 | -300 | 5280 | 0 | ok |
| 4 | 7400 | 7420 | -20 | 7420 | 0 | ok |
| 5 | 12000 | 12340 | -340 | 12330 | -10 | ok |

### a1-ielts-black-coffee
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 660 | -660 | 650 | -10 | ok |
| 2 | 3500 | 3640 | -140 | 3650 | 10 | ok |
| 3 | 5580 | 5580 | 0 | 5580 | 0 | ok |
| 4 | 7580 | 7880 | -300 | 7890 | 10 | ok |
| 5 | 9840 | 10200 | -360 | 10200 | 0 | ok |
| 6 | 11840 | 11880 | -40 | 11880 | 0 | ok |

### a1-ielts-apply-for-a-job
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 700 | -700 | 700 | 0 | ok |
| 2 | 3880 | 4100 | -220 | 4090 | -10 | ok |
| 3 | 5880 | 6040 | -160 | 6030 | -10 | ok |
| 4 | 9940 | 10020 | -80 | 10030 | 10 | ok |
| 5 | 13880 | 14140 | -260 | 14150 | 10 | ok |

### a1-ielts-after-dark
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 700 | -700 | 710 | 10 | ok |
| 2 | 2400 | 2440 | -40 | 2450 | 10 | ok |
| 3 | 4780 | 5240 | -460 | 5230 | -10 | ok |
| 4 | 8100 | 8400 | -300 | 8400 | 0 | ok |
| 5 | 15440 | 15840 | -400 | 15840 | 0 | ok |
| 6 | 17500 | 17900 | -400 | 17910 | 10 | ok |

### a1-ielts-all-the-time
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 680 | -680 | 680 | 0 | ok |
| 2 | 3980 | 4140 | -160 | 4150 | 10 | ok |
| 3 | 6440 | 6540 | -100 | 6530 | -10 | ok |
| 4 | 8960 | 9140 | -180 | 9150 | 10 | ok |
| 5 | 14060 | 14280 | -220 | 14270 | -10 | ok |

### c1-ielts-alternative-medicine
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 680 | -680 | 690 | 10 | ok |
| 2 | 4720 | 5160 | -440 | 5150 | -10 | ok |
| 3 | 10100 | 10520 | -420 | 10510 | -10 | ok |
| 4 | 14940 | 15100 | -160 | 15080 | -20 | ok |

### c1-ielts-black-ice
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 700 | -700 | 700 | 0 | ok |
| 2 | 2940 | 3020 | -80 | 3020 | 0 | ok |
| 3 | 6260 | 6400 | -140 | 6410 | 10 | ok |
| 4 | 10100 | 10580 | -480 | 10580 | 0 | ok |
| 5 | 15420 | 15560 | -140 | 15570 | 10 | ok |

### c1-ielts-black-sheep
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 640 | -640 | 650 | 10 | ok |
| 2 | 4860 | 5260 | -400 | 5260 | 0 | ok |
| 3 | 7060 | 7120 | -60 | 7130 | 10 | ok |
| 4 | 9520 | 9820 | -300 | 9800 | -20 | ok |
| 5 | 12500 | 12540 | -40 | 12550 | 10 | ok |
| 6 | 14800 | 14960 | -160 | 14970 | 10 | ok |

### c1-ielts-remote-work-debate
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 720 | -720 | 720 | 0 | ok |
| 2 | 5820 | 5960 | -140 | 5960 | 0 | ok |
| 3 | 10700 | 11260 | -560 | 11260 | 0 | ok |
| 4 | 14740 | 14820 | -80 | 14820 | 0 | ok |

### c1-ielts-the-big-picture
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 740 | -740 | 740 | 0 | ok |
| 2 | 3320 | 3360 | -40 | 3370 | 10 | ok |
| 3 | 6500 | 6520 | -20 | 6520 | 0 | ok |
| 4 | 11860 | 12320 | -460 | 12330 | 10 | ok |
| 5 | 16500 | 16700 | -200 | 16700 | 0 | ok |

### c2-ielts-art-and-restraint
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 720 | -720 | 710 | -10 | ok |
| 2 | 5420 | 5560 | -140 | 5570 | 10 | ok |
| 3 | 10920 | 10940 | -20 | 10950 | 10 | ok |

### c2-ielts-language-and-thought
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 720 | -720 | 710 | -10 | ok |
| 2 | 5440 | 5900 | -460 | 5910 | 10 | ok |
| 3 | 9820 | 10160 | -340 | 10170 | 10 | ok |
| 4 | 14600 | 14640 | -40 | 14630 | -10 | ok |

### c2-ielts-moral-ambiguity
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 680 | -680 | 690 | 10 | ok |
| 2 | 5940 | 6600 | -660 | 6600 | 0 | ok |
| 3 | 13840 | 13900 | -60 | 13900 | 0 | ok |

### c2-ielts-nuance-of-persuasion
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 720 | -720 | 730 | 10 | ok |
| 2 | 3620 | 3640 | -20 | 3640 | 0 | ok |
| 3 | 8440 | 8500 | -60 | 8500 | 0 | ok |
| 4 | 13360 | 13380 | -20 | 13390 | 10 | ok |

### c2-ielts-unintended-consequences
| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 640 | -640 | 650 | 10 | ok |
| 2 | 6060 | - | - | 6060 | - | no-onset |
| 3 | 7760 | 8120 | -360 | 8130 | 10 | ok |
| 4 | 10340 | 10480 | -140 | 10480 | 0 | ok |
| 5 | 13880 | 13880 | 0 | 13890 | 10 | ok |

## Uygulama ve yayın durumu

| Grup | İçerik | Durum |
| --- | --- | --- |
| Hazır IELTS (A1×5, C1×5, C2×1) | 11 | QA GEÇTİ → düzeltme draft.json + enriched.json'a uygulandı → approved artifact'e terfi edildi (CEFR enrichment'taki gerçek değerle) |
| Enrichment'ı olmayan C2 | language-and-thought, moral-ambiguity, nuance-of-persuasion | QA geçti, düzeltme yalnızca draft.json'a uygulandı. Enrichment yok → terfi/publish YOK |
| Enrichment'ı olmayan C2 | unintended-consequences | **QA KALDI** (#2 sessizlikle ayrılmamış devam cümlesi: onset yok). Terfi kapısı kapalı; draft.json değişmedi |

## Yöntem ve sınırlar

- Düzeltme: PCM'den (16 kHz mono) göreli eşikli (-32 dB, p95'e göre) konuşma bölgeleri → her segment için Whisper başlangıcına en yakın onset'e snap (arama: −1000/+1500 ms, sonraki segmentin orijinal başlangıcı üst sınır). Metin ve endMs değişmez; elle zaman yok; deterministik.
- Doğrulama: AYNI sinyalde FARKLI yöntemli ikinci dedektör (mutlak -40 dBFS RMS, 20 ms pencere). "Sonraki hata" bu iki ölçümün uyumudur; insan etiketli gerçek değer DEĞİLDİR. Her ikisi de enerji tabanlıdır: müzik/gürültü altında konuşan klipler için güvenilmez (bu partideki klipler temiz TTS sesidir).
- Boşluksuz devam eden segmentlerde (cümle iki segmente bölünmüş) onset olmadığı için doğrulama yapılamaz → KALIR (zaman uydurulmaz).
