"""Staging → scripts/stt/input toplu promotion (hepsi ya da hiçbiri).

Sözleşme:
  1. Önkoşullar (HİÇBİR şey yazmadan): her id için staging VE hedef dosya var, ikisi AYNI filesystem'de.
  2. Eski dosyalar tarihli backup dizinine kopyalanır ve SHA-256 ile doğrulanır.
  3. Staging dosyaları hedef dizinde geçici ad (.<id>.mp4.promote-tmp) altına kopyalanır, hash doğrulanır.
  4. Geçici dosyalar os.replace ile (aynı filesystem → atomik, dosya başına) hedefin üzerine yerleştirilir.
  5. Herhangi bir adımda hata → o ana kadar değiştirilen dosyalar backup'tan geri yüklenir, geçici dosyalar silinir (yarım batch kalmaz).
Production/R2'ye dokunmaz.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable, Sequence


class PromotionError(Exception):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _tmp_path(dest_dir: Path, video_id: str) -> Path:
    return dest_dir / f".{video_id}.mp4.promote-tmp"


def promote_batch(
    ids: Sequence[str],
    staging_dir: Path,
    dest_dir: Path,
    backup_root: Path,
    now: datetime | None = None,
    replace: Callable[[Path, Path], None] = os.replace,
) -> dict:
    now = now or datetime.now()
    # 1) önkoşullar — yazma yok
    problems: list[str] = []
    for video_id in ids:
        if not (staging_dir / f"{video_id}.mp4").is_file():
            problems.append(f"staging'de yok: {video_id}.mp4")
        if not (dest_dir / f"{video_id}.mp4").is_file():
            problems.append(f"hedefte yok: {video_id}.mp4 (yalnızca var olan dosyalar değiştirilir)")
    if not problems and staging_dir.stat().st_dev != dest_dir.stat().st_dev:
        problems.append("staging ve hedef AYNI filesystem'de değil — atomik replace garanti edilemez")
    if problems:
        raise PromotionError("; ".join(problems))

    old_hashes = {video_id: sha256_file(dest_dir / f"{video_id}.mp4") for video_id in ids}
    new_hashes = {video_id: sha256_file(staging_dir / f"{video_id}.mp4") for video_id in ids}

    # 2) backup
    backup_dir = backup_root / now.strftime("%Y%m%d-%H%M%S")
    if backup_dir.exists():
        raise PromotionError(f"backup dizini zaten var: {backup_dir}")
    backup_dir.mkdir(parents=True)
    for video_id in ids:
        shutil.copy2(dest_dir / f"{video_id}.mp4", backup_dir / f"{video_id}.mp4")
        if sha256_file(backup_dir / f"{video_id}.mp4") != old_hashes[video_id]:
            raise PromotionError(f"backup doğrulaması başarısız: {video_id}")

    replaced: list[str] = []
    try:
        # 3) hedef dizinde geçici kopyalar
        for video_id in ids:
            tmp = _tmp_path(dest_dir, video_id)
            shutil.copyfile(staging_dir / f"{video_id}.mp4", tmp)
            with open(tmp, "rb+") as handle:
                os.fsync(handle.fileno())
            if sha256_file(tmp) != new_hashes[video_id]:
                raise PromotionError(f"geçici kopya hash'i staging ile uyuşmuyor: {video_id}")
        # 4) atomik replace (dosya başına)
        for video_id in ids:
            replace(_tmp_path(dest_dir, video_id), dest_dir / f"{video_id}.mp4")
            replaced.append(video_id)
        # doğrulama
        for video_id in ids:
            if sha256_file(dest_dir / f"{video_id}.mp4") != new_hashes[video_id]:
                raise PromotionError(f"promotion sonrası hash uyuşmuyor: {video_id}")
    except Exception as error:
        # 5) rollback: değişen dosyaları backup'tan geri yükle, geçici dosyaları temizle
        for video_id in replaced:
            restore_tmp = _tmp_path(dest_dir, video_id)
            shutil.copyfile(backup_dir / f"{video_id}.mp4", restore_tmp)
            os.replace(restore_tmp, dest_dir / f"{video_id}.mp4")
        for video_id in ids:
            _tmp_path(dest_dir, video_id).unlink(missing_ok=True)
        restored_ok = all(sha256_file(dest_dir / f"{video_id}.mp4") == old_hashes[video_id] for video_id in ids)
        raise PromotionError(f"promotion başarısız, {len(replaced)} dosya geri alındı (hedef orijinal duruma döndü: {restored_ok}): {error}") from error

    return {
        "backupDir": str(backup_dir),
        "files": [{"videoId": v, "oldHash": old_hashes[v], "newHash": new_hashes[v], "changed": old_hashes[v] != new_hashes[v]} for v in ids],
    }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Kullanım: python staging_promote.py <staging-dir> <dest-dir> <backup-root>")
        sys.exit(2)
    staging, dest, backups = (Path(arg) for arg in sys.argv[1:4])
    video_ids = sorted(path.stem for path in staging.glob("*.mp4"))
    try:
        result = promote_batch(video_ids, staging, dest, backups)
    except PromotionError as error:
        print(f"HATA: {error}")
        sys.exit(1)
    print(f"backup: {result['backupDir']}")
    for item in result["files"]:
        print(f"{'DEĞİŞTİ ' if item['changed'] else 'AYNI    '} {item['videoId']}  {item['oldHash'][:12]} → {item['newHash'][:12]}")
