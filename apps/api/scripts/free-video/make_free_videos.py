"""Ücretsiz 9:16 klip üretici: edge-tts (nöral ses) + ffmpeg. Kredi/API anahtarı gerekmez.
Kullanım: python scripts/free-video/make_free_videos.py [--only <id>] [--out-dir <dir>] [--timing-dir <dir>]
Girdi: content/new-batches/ielts-pdf-scripts.md  Çıktı: scripts/stt/input/<id>.mp4
Konuşmacı ışığı, TTS parçalarının ÖLÇÜLEN gerçek konuşma onset/offset'ine bağlıdır (speech_timing.py), clip başlangıcına
ve script zamanına DEĞİL; aralık yarı-açık [speechStartMs, speechEndMs). Her video için scripts/free-video/timing/<id>.json
üretilir (konuşmacı başına speechStartMs/speechEndMs).
Videoda altyazı BİLEREK yok (uygulama kendi senkron altyazısını çiziyor); sadece konuşan kişiyi
vurgulayan iki sahne kutusu var."""
import asyncio, json, re, subprocess, sys, tempfile
from pathlib import Path
import edge_tts
from speech_timing import build_turns, enable_expression, measure_speech_bounds

API = Path(__file__).resolve().parents[2]
SRC = API / "content/new-batches/ielts-pdf-scripts.md"
OUT = API / "scripts/stt/input"
VOICES = [("en-US-AvaNeural", "en-US-AndrewNeural"), ("en-US-EmmaNeural", "en-US-BrianNeural"),
          ("en-GB-SoniaNeural", "en-GB-RyanNeural"), ("en-US-JennyNeural", "en-US-GuyNeural"),
          ("en-GB-LibbyNeural", "en-GB-ThomasNeural")]
# Seviye başına 3 renkli, yavaşça akan (animasyonlu) gradient arka plan.
BG = {"a1": ("0x2b6cb0", "0x38b2ac", "0x805ad5"), "c1": ("0x6b46c1", "0xd53f8c", "0x2c5282"), "c2": ("0x1a202c", "0x2d3748", "0x744210")}
# İsteğe bağlı gerçek arka plan: scripts/free-video/bg/<contentId>.mp4 (ör. Pexels'ten elle indirilmiş
# telifsiz stok video) varsa gradient yerine o kullanılır (döngüye alınır, 9:16'ya kırpılır, karartılır).
BG_DIR = Path(__file__).resolve().parent / "bg"
TIMING = Path(__file__).resolve().parent / "timing"
FONT = "C\:/Windows/Fonts/arialbd.ttf"
LEAD, GAP, MIN_TOTAL = 0.5, 0.45, 15.6

def parse():
    clips, cur = {}, None
    for line in SRC.read_text(encoding="utf8").splitlines():
        m = re.match(r"\*\*([a-z0-9-]+)\*\*", line)
        if m: cur = clips.setdefault(m.group(1), []); continue
        m = re.match(r"- ([A-Za-z]+): (.+)", line)
        if m and cur is not None: cur.append((m.group(1), m.group(2).replace("**", "")))
    return {k: v for k, v in clips.items() if v}

def dur(p):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(p)]).decode())

def arg_value(flag, default):
    return Path(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default

async def render(cid, lines, idx, out_dir, timing_dir):
    tmp = Path(tempfile.mkdtemp()); speakers = []
    for s, _ in lines:
        if s not in speakers: speakers.append(s)
    voices = VOICES[idx % len(VOICES)]
    files = []
    for i, (s, text) in enumerate(lines):
        f = tmp / f"{i}.mp3"
        await edge_tts.Communicate(text, voices[speakers.index(s) % 2], rate="-5%").save(str(f))
        files.append(f)
    bounds = [measure_speech_bounds(f) for f in files]
    durations = [round(dur(f) * 1000) for f in files]
    turns = build_turns(
        [(s, speakers.index(s) % 2, text) for s, text in lines],
        measure=lambda i: bounds[i],
        lead_ms=round(LEAD * 1000),
        gap_ms=round(GAP * 1000),
        clip_duration_ms=lambda i: durations[i],
    )
    # Toplam süre ESKİ davranışla aynı: son klipten sonra da GAP kadar sessizlik (STT draft.durationMs ile uyum için değiştirilmez).
    total = max((turns[-1].clipEndMs + round(GAP * 1000)) / 1000, MIN_TOTAL)
    ins = [x for f in files for x in ("-i", str(f))]
    stock = BG_DIR / f"{cid}.mp4"
    if stock.exists(): ins += ["-stream_loop", "-1", "-i", str(stock)]
    # Ses, ışıkla AYNI tam-ms clipStartMs'e yerleşir (tek source-of-truth).
    af = ";".join(f"[{i}:a]adelay={t.clipStartMs}|{t.clipStartMs}[a{i}]" for i, t in enumerate(turns))
    af += ";" + "".join(f"[a{i}]" for i in range(len(turns))) + f"amix=inputs={len(turns)}:normalize=0,apad=whole_dur={total:.3f}[aout]"
    level = cid.split("-")[0]; names = {}
    for t in turns: names[t.slot] = t.speaker
    if stock.exists():
        vf = f"[{len(turns)}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.3:saturation=0.9,fps=30,format=yuv420p"
    else:
        c0, c1, c2 = BG[level]
        vf = f"gradients=s=1080x1920:d={total:.2f}:r=30:c0={c0}:c1={c1}:c2={c2}:nb_colors=3:speed=0.015:type=linear,format=yuv420p"
    for slot, y in ((0, 380), (1, 1080)):
        acts = enable_expression(turns, slot)
        vf += f",drawbox=x=240:y={y}:w=600:h=600:color=white@0.18:t=fill"
        vf += f",drawbox=x=240:y={y}:w=600:h=600:color=white@0.95:t=14:enable='{acts}'"
        vf += f",drawtext=fontfile='{FONT}':text='{names.get(slot,'?')[0]}':fontsize=300:fontcolor=white:x=(w-text_w)/2:y={y}+150"
        vf += f",drawtext=fontfile='{FONT}':text='{names.get(slot,'')}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y={y}+500"
    fc = af + f";{vf}[v]"
    out_dir.mkdir(parents=True, exist_ok=True); timing_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{cid}.mp4"
    subprocess.run(["ffmpeg","-y","-v","error",*ins,"-filter_complex",fc,"-map","[v]","-map","[aout]","-c:v","libx264","-preset","fast","-c:a","aac","-ar","44100","-t",f"{total:.3f}","-movflags","+faststart",str(out)],check=True)
    (timing_dir / f"{cid}.json").write_text(json.dumps({"contentId": cid, "totalMs": round(total * 1000), "turns": [t.to_metadata() for t in turns]}, ensure_ascii=False, indent=2), encoding="utf8")
    print(cid, f"{total:.1f}s ->", out)

async def main():
    only = sys.argv[sys.argv.index("--only")+1] if "--only" in sys.argv else None
    out_dir = arg_value("--out-dir", OUT)
    timing_dir = arg_value("--timing-dir", TIMING)
    for i, (cid, lines) in enumerate(parse().items()):
        if only and cid != only: continue
        await render(cid, lines, i, out_dir, timing_dir)

if __name__ == "__main__":
    asyncio.run(main())
