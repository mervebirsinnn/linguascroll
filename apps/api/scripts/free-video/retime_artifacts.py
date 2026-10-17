"""STT'yi yeniden çalıştırılan bir videonun YENİ segment zamanlarını, metin DEĞİŞMEDİĞİ doğrulanırsa, mevcut draft.json ve enriched.json'a taşır.

plan  : yeni draft ile eski draft/enriched'i karşılaştırır; segment sayısı ve HER ordinal'in metni birebir aynı değilse REDDEDER
        (metin değiştiyse açıklamalar/quiz geçersiz olabilir → yeniden enrichment gerekir, bu araç onu yapmaz).
apply : (plan geçtiyse) eski draft.json + enriched.json + preview.srt'yi backup dizinine kopyalar, sonra
        - draft.json: eski contentId/sourceFile korunur, yalnızca segment zamanları + languageProbability yeni draft'tan alınır,
        - enriched.json: yalnızca segment startMs/endMs güncellenir (açıklamalar, vocabulary, quiz DOKUNULMAZ),
        - preview.srt: yeni draft'ın preview.srt'si.
Her yazma atomik (tmp + replace). Sonrasında quality/şema doğrulaması çağırana (node) bırakılır; başarısızlıkta `restore` backup'tan geri yükler.

Kullanım: python retime_artifacts.py plan|apply|restore <contentId> <newDraftContentId> <backupDir>
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

API = Path(__file__).resolve().parents[2]
STT_OUT = API / "scripts" / "stt" / "output"
ENRICHED = API / "src" / "content-enrichment" / "output"


class RetimeError(Exception):
    pass


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf8"))


def _atomic_write(path: Path, content: str) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(content, encoding="utf8")
    os.replace(tmp, path)


def plan(content_id: str, new_id: str) -> dict:
    old = _load(STT_OUT / content_id / "draft.json")
    new = _load(STT_OUT / new_id / "draft.json")
    enriched = _load(ENRICHED / content_id / "enriched.json")
    problems: list[str] = []
    if new["languageStatus"] != "ready":
        problems.append(f"yeni draft languageStatus={new['languageStatus']}")
    if len(old["segments"]) != len(new["segments"]) or len(enriched["segments"]) != len(new["segments"]):
        problems.append(f"segment sayısı farklı: eski draft {len(old['segments'])}, enriched {len(enriched['segments'])}, yeni {len(new['segments'])}")
    else:
        for o, e, n in zip(old["segments"], enriched["segments"], new["segments"]):
            if not (o["ordinal"] == e["ordinal"] == n["ordinal"]):
                problems.append(f"ordinal uyuşmuyor: {o['ordinal']}/{e['ordinal']}/{n['ordinal']}")
            if n["text"] != e["text"]:
                problems.append(f"segment {n['ordinal']} metni değişti: enriched={e['text']!r} yeni={n['text']!r}")
    if abs(new["durationMs"] - enriched["durationMs"]) > 150:
        problems.append(f"durationMs farkı: enriched {enriched['durationMs']} yeni {new['durationMs']}")
    if problems:
        raise RetimeError("; ".join(problems))
    changes = [
        {"ordinal": n["ordinal"], "oldStartMs": e["startMs"], "newStartMs": n["startMs"], "oldEndMs": e["endMs"], "newEndMs": n["endMs"]}
        for e, n in zip(enriched["segments"], new["segments"])
        if (e["startMs"], e["endMs"]) != (n["startMs"], n["endMs"])
    ]
    return {"contentId": content_id, "changedSegments": changes}


def apply(content_id: str, new_id: str, backup_dir: Path) -> dict:
    report = plan(content_id, new_id)
    backup = backup_dir / f"retime-{content_id}"
    backup.mkdir(parents=True, exist_ok=False)
    for name, src in (("draft.json", STT_OUT / content_id / "draft.json"), ("preview.srt", STT_OUT / content_id / "preview.srt"), ("enriched.json", ENRICHED / content_id / "enriched.json")):
        shutil.copy2(src, backup / name)
    new = _load(STT_OUT / new_id / "draft.json")
    draft = _load(STT_OUT / content_id / "draft.json")
    draft["segments"] = new["segments"]
    draft["languageProbability"] = new["languageProbability"]
    draft["durationMs"] = new["durationMs"]
    enriched = _load(ENRICHED / content_id / "enriched.json")
    for e, n in zip(enriched["segments"], new["segments"]):
        e["startMs"], e["endMs"] = n["startMs"], n["endMs"]
    _atomic_write(STT_OUT / content_id / "draft.json", json.dumps(draft, ensure_ascii=False, indent=2))
    shutil.copyfile(STT_OUT / new_id / "preview.srt", STT_OUT / content_id / "preview.srt")
    _atomic_write(ENRICHED / content_id / "enriched.json", json.dumps(enriched, ensure_ascii=False, indent=2))
    report["backup"] = str(backup)
    return report


def restore(content_id: str, backup_dir: Path) -> None:
    backup = backup_dir / f"retime-{content_id}"
    shutil.copyfile(backup / "draft.json", STT_OUT / content_id / "draft.json")
    shutil.copyfile(backup / "preview.srt", STT_OUT / content_id / "preview.srt")
    shutil.copyfile(backup / "enriched.json", ENRICHED / content_id / "enriched.json")


if __name__ == "__main__":
    mode, cid, nid, bdir = sys.argv[1], sys.argv[2], sys.argv[3], Path(sys.argv[4])
    try:
        if mode == "plan":
            print(json.dumps(plan(cid, nid), ensure_ascii=False, indent=2))
        elif mode == "apply":
            print(json.dumps(apply(cid, nid, bdir), ensure_ascii=False, indent=2))
        elif mode == "restore":
            restore(cid, bdir)
            print("geri yüklendi")
        else:
            raise SystemExit("mode: plan|apply|restore")
    except RetimeError as error:
        print(f"REDDEDİLDİ: {error}")
        sys.exit(1)
