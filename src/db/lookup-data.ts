/**
 * Initial master data for `lookup_groups` / `lookups`.
 *
 * This is seed data only: after the first migration the database is the source of truth and
 * everything here can be edited from the admin. Rows marked `system` are referenced by code
 * (see LOOKUP in src/services/lookup.service.ts) and can be relabelled but not deleted.
 */
export interface LookupSeedValue {
  code: string;
  en: string;
  id?: string;
  icon?: string;
  color?: string;
  system?: boolean;
}

export interface LookupSeedGroup {
  code: string;
  en: string;
  id: string;
  system?: boolean; // values are wired to code (e.g. site sections ↔ components)
  values: LookupSeedValue[];
}

const sys = (code: string, en: string, id?: string, extra: Partial<LookupSeedValue> = {}) => ({
  code,
  en,
  id,
  system: true,
  ...extra,
});

export const LOOKUP_SEED: LookupSeedGroup[] = [
  {
    code: 'user_role',
    en: 'User role',
    id: 'Peran pengguna',
    system: true,
    values: [sys('owner', 'Owner', 'Pemilik'), sys('editor', 'Editor', 'Editor'), sys('viewer', 'Viewer', 'Peninjau')],
  },
  {
    code: 'content_status',
    en: 'Content status',
    id: 'Status konten',
    system: true,
    values: [
      sys('draft', 'Draft', 'Draf', { color: 'muted-foreground' }),
      sys('published', 'Published', 'Terbit', { color: 'success' }),
      sys('archived', 'Archived', 'Diarsipkan', { color: 'warning' }),
    ],
  },
  {
    code: 'audit_action',
    en: 'Audit action',
    id: 'Aksi audit',
    system: true,
    values: [
      sys('create', 'Create', 'Buat'),
      sys('update', 'Update', 'Ubah'),
      sys('delete', 'Delete', 'Hapus'),
      sys('delete_permanent', 'Delete permanently', 'Hapus permanen'),
      sys('publish', 'Publish', 'Terbitkan'),
      sys('unpublish', 'Unpublish', 'Batal terbit'),
      sys('archive', 'Archive', 'Arsipkan'),
      sys('restore', 'Restore', 'Pulihkan'),
      sys('reorder', 'Reorder', 'Urutkan'),
      sys('login', 'Login', 'Masuk'),
      sys('logout', 'Logout', 'Keluar'),
      sys('settings', 'Settings', 'Pengaturan'),
      sys('import', 'Import', 'Impor'),
    ],
  },
  {
    code: 'event_type',
    en: 'Analytics event',
    id: 'Event analitik',
    system: true,
    values: [
      sys('page_view', 'Page view', 'Kunjungan halaman'),
      sys('link_click', 'Link click', 'Klik tautan'),
      sys('cv_download', 'CV download', 'Unduh CV'),
      sys('export_download', 'Export download', 'Unduh ekspor'),
      sys('share_open', 'Share link opened', 'Tautan berbagi dibuka'),
      sys('video_play', 'Video play', 'Putar video'),
    ],
  },
  {
    code: 'locale',
    en: 'Language',
    id: 'Bahasa',
    system: true,
    values: [sys('en', 'English', 'Inggris'), sys('id', 'Indonesian', 'Bahasa Indonesia')],
  },
  {
    code: 'media_provider',
    en: 'Media provider',
    id: 'Penyedia media',
    system: true,
    values: [
      sys('cloudinary', 'Cloudinary'),
      sys('youtube', 'YouTube', undefined, { icon: 'youtube' }),
      sys('vimeo', 'Vimeo', undefined, { icon: 'vimeo' }),
      sys('loom', 'Loom', undefined, { icon: 'loom' }),
    ],
  },
  {
    code: 'media_kind',
    en: 'Media kind',
    id: 'Jenis media',
    system: true,
    values: [
      sys('image', 'Image', 'Gambar', { icon: 'image' }),
      sys('pdf', 'PDF', 'PDF', { icon: 'file-text' }),
      sys('video', 'Video', 'Video', { icon: 'video' }),
      sys('document', 'Document / slides', 'Dokumen / slide', { icon: 'presentation' }),
    ],
  },
  {
    code: 'document_type',
    en: 'Document type',
    id: 'Jenis dokumen',
    system: true,
    values: [
      sys('cv', 'CV', 'CV'),
      sys('portfolio_pdf', 'Portfolio PDF', 'PDF portofolio'),
      sys('other', 'Other', 'Lainnya'),
    ],
  },
  {
    code: 'hero_cv_buttons',
    en: 'Hero CV buttons',
    id: 'Tombol CV di hero',
    system: true,
    values: [
      sys('uploaded', 'Uploaded CV only', 'Hanya CV unggahan'),
      sys('export', 'Generated PDF only', 'Hanya PDF otomatis'),
      sys('both', 'Both', 'Keduanya'),
    ],
  },
  {
    code: 'export_template',
    en: 'Export template',
    id: 'Template ekspor',
    system: true,
    values: [sys('full', 'Full', 'Lengkap'), sys('one_page', 'One page', 'Satu halaman'), sys('ats', 'ATS', 'ATS')],
  },
  {
    code: 'site_section',
    en: 'Home page section',
    id: 'Bagian beranda',
    system: true,
    values: [
      sys('hero', 'Hero', 'Hero'),
      sys('about', 'About', 'Tentang'),
      sys('projects', 'Projects', 'Proyek'),
      sys('skills', 'Skills', 'Keahlian'),
      sys('experience', 'Experience', 'Pengalaman'),
      sys('education', 'Education', 'Pendidikan'),
      sys('certifications', 'Certifications', 'Sertifikasi'),
      sys('activities', 'Activities', 'Aktivitas'),
      sys('achievements', 'Achievements', 'Pencapaian'),
      sys('publications', 'Publications', 'Publikasi'),
      sys('testimonials', 'Testimonials', 'Testimoni'),
      sys('github', 'GitHub', 'GitHub'),
      sys('contact', 'Contact', 'Kontak'),
    ],
  },
  {
    code: 'theme_preset',
    en: 'Theme preset',
    id: 'Preset tema',
    system: true,
    values: [sys('slate', 'Slate'), sys('forest', 'Forest'), sys('sunset', 'Sunset'), sys('mono', 'Mono')],
  },
  {
    code: 'color_mode',
    en: 'Color mode',
    id: 'Mode warna',
    system: true,
    values: [sys('light', 'Light', 'Terang'), sys('dark', 'Dark', 'Gelap'), sys('system', 'System', 'Ikuti sistem')],
  },
  {
    code: 'font_pair',
    en: 'Font pair',
    id: 'Pasangan font',
    system: true,
    values: [sys('geist', 'Geist'), sys('inter', 'Inter'), sys('serif-accent', 'Serif accent', 'Aksen serif')],
  },
  {
    code: 'project_media_role',
    en: 'Project media role',
    id: 'Peran media proyek',
    values: [
      sys('gallery', 'Gallery', 'Galeri', { icon: 'images' }),
      sys('demo_video', 'Demo video', 'Video demo', { icon: 'video' }),
      sys('clip', 'Preview clip', 'Klip pratinjau', { icon: 'film' }),
      { code: 'documentation', en: 'Documentation', id: 'Dokumentasi', icon: 'file-text' },
      { code: 'slides', en: 'Slides', id: 'Slide', icon: 'presentation' },
      { code: 'architecture', en: 'Architecture diagram', id: 'Diagram arsitektur', icon: 'network' },
    ],
  },
  {
    code: 'project_type',
    en: 'Project type',
    id: 'Jenis proyek',
    values: [
      { code: 'company', en: 'Company', id: 'Perusahaan', icon: 'building-2' },
      { code: 'freelance', en: 'Freelance', id: 'Freelance', icon: 'briefcase' },
      { code: 'personal', en: 'Personal', id: 'Pribadi', icon: 'user' },
      { code: 'open_source', en: 'Open source', id: 'Open source', icon: 'git-branch' },
      { code: 'hackathon', en: 'Hackathon', id: 'Hackathon', icon: 'trophy' },
    ],
  },
  {
    code: 'project_state',
    en: 'Project state',
    id: 'Status proyek',
    values: [
      sys('live', 'Live', 'Berjalan', { color: 'success' }),
      { code: 'in_development', en: 'In development', id: 'Dalam pengembangan', color: 'warning' },
      { code: 'archived', en: 'Archived', id: 'Diarsipkan', color: 'muted-foreground' },
    ],
  },
  {
    code: 'tech_category',
    en: 'Skill category',
    id: 'Kategori keahlian',
    values: [
      { code: 'frontend', en: 'Frontend', id: 'Frontend', icon: 'globe' },
      { code: 'backend', en: 'Backend', id: 'Backend', icon: 'cpu' },
      { code: 'database', en: 'Databases', id: 'Basis Data', icon: 'database' },
      { code: 'devops', en: 'DevOps & Cloud', id: 'DevOps & Cloud', icon: 'layers' },
      { code: 'tools', en: 'Tools & Workflow', id: 'Alat & Alur Kerja', icon: 'wrench' },
      { code: 'soft_skill', en: 'Soft skills', id: 'Soft skill', icon: 'sparkles' },
    ],
  },
  {
    code: 'tech_group',
    en: 'Project tech group',
    id: 'Grup teknologi proyek',
    values: [
      { code: 'frontend', en: 'Frontend', id: 'Frontend' },
      { code: 'backend', en: 'Backend', id: 'Backend' },
      { code: 'database', en: 'Database', id: 'Basis Data' },
      { code: 'devops', en: 'DevOps', id: 'DevOps' },
      sys('other', 'Other', 'Lainnya'),
    ],
  },
  {
    code: 'link_type',
    en: 'Project link type',
    id: 'Jenis tautan proyek',
    values: [
      { code: 'demo', en: 'Live demo', id: 'Demo', icon: 'external-link' },
      { code: 'repo_frontend', en: 'Frontend repo', id: 'Repo frontend', icon: 'github' },
      { code: 'repo_backend', en: 'Backend repo', id: 'Repo backend', icon: 'github' },
      { code: 'repo_service', en: 'Integration service repo', id: 'Repo service integrasi', icon: 'github' },
      { code: 'repo', en: 'Repository', id: 'Repositori', icon: 'github' },
      { code: 'api_docs', en: 'API docs', id: 'Dokumentasi API', icon: 'book-open' },
      { code: 'documentation', en: 'Documentation', id: 'Dokumentasi', icon: 'file-text' },
      { code: 'slides', en: 'Slides', id: 'Slide', icon: 'presentation' },
      { code: 'postman', en: 'Postman collection', id: 'Koleksi Postman', icon: 'send' },
      { code: 'design', en: 'Design file', id: 'File desain', icon: 'figma' },
      { code: 'video', en: 'Video', id: 'Video', icon: 'video' },
      { code: 'article', en: 'Article', id: 'Artikel', icon: 'newspaper' },
      sys('other', 'Other', 'Lainnya', { icon: 'link' }),
    ],
  },
  {
    code: 'employment_type',
    en: 'Employment type',
    id: 'Jenis pekerjaan',
    values: [
      { code: 'full_time', en: 'Full time', id: 'Penuh waktu' },
      { code: 'part_time', en: 'Part time', id: 'Paruh waktu' },
      { code: 'internship', en: 'Internship', id: 'Magang' },
      { code: 'freelance', en: 'Freelance', id: 'Freelance' },
      { code: 'contract', en: 'Contract', id: 'Kontrak' },
    ],
  },
  {
    code: 'work_mode',
    en: 'Work mode',
    id: 'Mode kerja',
    values: [
      { code: 'onsite', en: 'On-site', id: 'On-site' },
      { code: 'hybrid', en: 'Hybrid', id: 'Hibrida' },
      { code: 'remote', en: 'Remote', id: 'Remote' },
    ],
  },
  {
    code: 'availability',
    en: 'Availability',
    id: 'Ketersediaan',
    values: [
      { code: 'open_to_work', en: 'Open to work', id: 'Siap bekerja', color: 'success' },
      { code: 'freelance', en: 'Available for freelance', id: 'Tersedia untuk freelance', color: 'success' },
      sys('not_available', 'Not available', 'Sedang tidak tersedia', { color: 'muted-foreground' }),
    ],
  },
  {
    code: 'cert_type',
    en: 'Certificate type',
    id: 'Jenis sertifikat',
    values: [
      { code: 'certification', en: 'Certification', id: 'Sertifikasi' },
      { code: 'course', en: 'Course', id: 'Kursus' },
      { code: 'bootcamp', en: 'Bootcamp', id: 'Bootcamp' },
      { code: 'training', en: 'Training', id: 'Pelatihan' },
    ],
  },
  {
    code: 'activity_type',
    en: 'Activity type',
    id: 'Jenis aktivitas',
    values: [
      { code: 'volunteer', en: 'Volunteer', id: 'Relawan' },
      { code: 'committee', en: 'Committee', id: 'Kepanitiaan' },
      { code: 'organization', en: 'Organization', id: 'Organisasi' },
    ],
  },
  {
    code: 'publication_type',
    en: 'Publication type',
    id: 'Jenis publikasi',
    values: [
      { code: 'article', en: 'Article', id: 'Artikel' },
      { code: 'paper', en: 'Paper', id: 'Makalah' },
      { code: 'talk', en: 'Talk', id: 'Presentasi' },
      { code: 'workshop', en: 'Workshop', id: 'Workshop' },
      { code: 'podcast', en: 'Podcast', id: 'Podcast' },
    ],
  },
  {
    code: 'organization_type',
    en: 'Organization type',
    id: 'Jenis organisasi',
    values: [
      { code: 'company', en: 'Company', id: 'Perusahaan', icon: 'building-2' },
      { code: 'client', en: 'Client', id: 'Klien', icon: 'handshake' },
      { code: 'education', en: 'Educational institution', id: 'Institusi pendidikan', icon: 'graduation-cap' },
      { code: 'certification_issuer', en: 'Certification issuer', id: 'Penerbit sertifikat', icon: 'badge-check' },
      { code: 'community', en: 'Community / organization', id: 'Komunitas / organisasi', icon: 'users' },
      { code: 'event_organizer', en: 'Event organizer', id: 'Penyelenggara acara', icon: 'calendar' },
      { code: 'self', en: 'Self-employed', id: 'Mandiri', icon: 'user' },
    ],
  },
  {
    code: 'social_platform',
    en: 'Social platform',
    id: 'Platform sosial',
    values: [
      { code: 'github', en: 'GitHub', icon: 'github' },
      { code: 'linkedin', en: 'LinkedIn', icon: 'linkedin' },
      { code: 'x', en: 'X', icon: 'x' },
      { code: 'instagram', en: 'Instagram', icon: 'instagram' },
      { code: 'youtube', en: 'YouTube', icon: 'youtube' },
      { code: 'medium', en: 'Medium', icon: 'medium' },
      { code: 'website', en: 'Website', id: 'Situs web', icon: 'globe' },
    ],
  },
  {
    code: 'language_level',
    en: 'Language level',
    id: 'Tingkat bahasa',
    values: [
      { code: 'native', en: 'Native', id: 'Bahasa ibu' },
      { code: 'fluent', en: 'Fluent', id: 'Fasih' },
      { code: 'professional', en: 'Professional', id: 'Profesional' },
      { code: 'intermediate', en: 'Intermediate', id: 'Menengah' },
      { code: 'basic', en: 'Basic', id: 'Dasar' },
    ],
  },
];
