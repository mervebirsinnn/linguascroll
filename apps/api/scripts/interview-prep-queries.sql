-- Mülakat hazırlığı için EXPLAIN ANALYZE örnekleri.
-- Çalıştırma: docker exec -i api-postgres-1 psql -U linguascroll -d linguascroll < apps/api/scripts/interview-prep-queries.sql
-- (repo'ya commit edilmez, sadece yerel inceleme için)

\echo '=== 1) Personalization: topic affinity (JOIN + GROUP BY + clamp) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT videos.topic,
       SUM(LEAST(GREATEST(video_watch_events.watched_ms::float / videos.duration_ms, 0), 1)) AS affinity_score
FROM video_watch_events
INNER JOIN videos ON video_watch_events.video_id = videos.id
WHERE video_watch_events.user_id = 'e6dc8e21-23a5-44b4-8b07-bd961cc80644'
GROUP BY videos.topic;

\echo ''
\echo '=== 2) video_watch_events by user_id (index var ama kullanılmıyor mu?) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM video_watch_events
WHERE user_id = 'e6dc8e21-23a5-44b4-8b07-bd961cc80644';

\echo ''
\echo '=== 3) findVideosByIds: WHERE id IN (...) (N+1 önleme) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM videos
WHERE id IN (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000009'
);

\echo ''
\echo '=== 4) findSegmentsForVideos: LEFT JOIN learning_points ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT vts.video_id, vts.id AS segment_id, vts.ordinal, vts.start_ms, vts.end_ms, vts.text,
       lp.id AS learning_point_id, lp.ordinal AS lp_ordinal
FROM video_transcript_segments vts
LEFT JOIN transcript_segment_learning_points lp ON lp.transcript_segment_id = vts.id
WHERE vts.video_id IN (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000009'
)
ORDER BY vts.video_id, vts.ordinal, lp.ordinal;

\echo ''
\echo '=== 5) findQuizzesForVideos: 3 tablo JOIN (quizzes + quiz_options + transcript_segments) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT q.id, q.question, qo.id AS option_id, qo.position, vts.video_id
FROM quizzes q
INNER JOIN quiz_options qo ON qo.quiz_id = q.id
INNER JOIN video_transcript_segments vts ON vts.id = q.source_transcript_segment_id
WHERE vts.video_id IN (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000009'
)
ORDER BY q.id, qo.position;

\echo ''
\echo '=== BONUS: aynı sorguyu seq scan kapalı çalıştır, index kullanımını zorla kıyasla ==='
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM video_watch_events
WHERE user_id = 'e6dc8e21-23a5-44b4-8b07-bd961cc80644';
SET enable_seqscan = on;
