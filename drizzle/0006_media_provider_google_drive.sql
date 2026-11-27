-- Long demo videos hosted on Google Drive (embedded through /file/d/{id}/preview).
INSERT INTO lookups (id, group_id, code, label_en, label_id, icon, color, is_system, sort_order)
SELECT gen_random_uuid(), g.id, 'google_drive', 'Google Drive', 'Google Drive', 'googledrive', NULL, true, 4
FROM lookup_groups g WHERE g.code = 'media_provider'
  AND NOT EXISTS (SELECT 1 FROM lookups l WHERE l.group_id = g.id AND l.code = 'google_drive');
