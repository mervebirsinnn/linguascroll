# `public/media/` — local development assets, NOT version-controlled

Bu klasördeki `.mp4` dosyaları, `resolve-playback-url.ts`'in servis ettiği gerçek video içeriği — ama **Git'e commit edilmiyor** (bkz. repo kökündeki `.gitignore`, Chunk 14 kararı).

**Neden:** 50 videoya çıkarken (~600MB+) bunları git history'ye commit etmek clone/CI/deploy süresini kalıcı olarak şişirirdi (git history append-only — bir video yeniden encode edilse bile eski blob geçmişte kalır). Gerçek bir object storage mimarisi (S3/Mux/Cloudflare) **Chunk 18 — Release Readiness** kapsamında kurulacak; şimdilik bu klasör sadece yerel development/test ortamı için bir çalışma alanı.

**Bu ne anlama geliyor:**
- `git clone` sonrası bu klasör (bu README ve `.gitkeep` dışında) **boş** gelir.
- Yerelde `pnpm seed`/`pnpm publish-content` ile eklenen videoların playback URL'lerinin gerçekten çalışması için, karşılık gelen `.mp4` dosyalarının buraya (elle veya bir sync script'iyle) kopyalanmış olması gerekir.
- `apps/api/content-provenance.json`, hangi `muxAssetId`'nin hangi kaynağa/lisansa dayandığını insan-okunabilir şekilde kaydeder (bu klasördeki dosyaların kendisi değil, provenance BİLGİSİ commit edilir).
