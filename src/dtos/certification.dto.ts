import { z } from 'zod';
import type { toCertification } from '@/services/serializers';

export type CertificationType = 'certification' | 'course' | 'bootcamp' | 'training';

export interface ListCertificationsFilterDto {
  locale: 'en' | 'id';
  type?: CertificationType;
}

export type CertificationDto = ReturnType<typeof toCertification>;

export const createCertificationSchema = z.object({
  title: z.record(z.string()),
  issuer: z.string().min(1).max(120),
  issueDate: z.string(),
  type: z.enum(['certification', 'course', 'bootcamp', 'training']),
  credentialUrl: z.string().url().optional().nullable(),
  credentialId: z.string().optional().nullable(),
  skills: z.array(z.string()).default([]),
});

export type CreateCertificationDto = z.infer<typeof createCertificationSchema>;
