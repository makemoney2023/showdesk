-- Show Desk critique audio (private Storage)
-- Project: emiwbvbytmfbonbnemli
-- Object path: {show_id}/{critique_id}.webm

INSERT INTO storage.buckets (id, name, public)
VALUES ('critique-audio', 'critique-audio', false);

CREATE POLICY critique_audio_authenticated_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'critique-audio');

CREATE POLICY critique_audio_authenticated_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'critique-audio');

CREATE POLICY critique_audio_authenticated_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'critique-audio')
  WITH CHECK (bucket_id = 'critique-audio');

CREATE POLICY critique_audio_authenticated_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'critique-audio');
