# Chunk 10 curated content — TTS ile segment ses dosyalarını üretir.
# Native Windows SAPI (System.Speech) kullanır: yeni bir dependency/servis yok,
# tamamen offline. Her transcript segment'i AYRI bir WAV olarak sentezlenir ki
# süresi ffprobe ile tam olarak ölçülüp seed timestamp'lerine BİREBİR yansısın.

Add-Type -AssemblyName System.Speech

$outDir = "C:\Users\merve\OneDrive\Masaüstü\LinguaScroll\apps\api\scripts\tts-tmp"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$videos = @(
  @{
    key = "ended-up-staying"
    voice = "Microsoft David Desktop"
    rate = -2
    lines = @(
      "I moved to Berlin for what was supposed to be a six month internship.",
      "I ended up staying there for three years.",
      "The company offered me a full time contract after just two months.",
      "I ended up loving the city so much that I never wanted to leave.",
      "Looking back, it was the best accident of my career."
    )
  },
  @{
    key = "flight-delay"
    voice = "Microsoft Zira Desktop"
    rate = -2
    lines = @(
      "Our flight was supposed to leave at six in the morning.",
      "Instead, we ended up waiting at the gate for five hours.",
      "By the time we boarded, everyone was exhausted.",
      "I finally finished the book I had been meaning to read for months.",
      "We finally landed just after midnight."
    )
  },
  @{
    key = "pickup-running"
    voice = "Microsoft Hazel Desktop"
    rate = -2
    lines = @(
      "After the breakup, I did not know what to do with all my free time.",
      "So I ended up picking up running, just to clear my head.",
      "At first, I could barely run for five minutes without stopping.",
      "Little by little, I built it into a daily habit.",
      "Now I cannot imagine starting my day without it."
    )
  },
  @{
    key = "pointless-pun"
    voice = "Microsoft David Desktop"
    rate = -4
    lines = @(
      "My friend told me a joke about a broken pencil.",
      "He said it was pointless.",
      "I could not stop laughing even though it was such a bad joke.",
      "Some puns are so bad that they become funny again.",
      "That is the kind of humor I ended up loving over the years."
    )
  }
)

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

foreach ($video in $videos) {
  $synth.SelectVoice($video.voice)
  $synth.Rate = $video.rate
  $ordinal = 0
  foreach ($line in $video.lines) {
    $ordinal++
    $file = Join-Path $outDir ("{0}_{1}.wav" -f $video.key, $ordinal)
    $synth.SetOutputToWaveFile($file)
    $synth.Speak($line)
    $synth.SetOutputToNull()
  }
}

Write-Output "TTS generation done."
