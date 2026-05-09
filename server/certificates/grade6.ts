/**
 * Grade 6 — Upper Basic School (UBS) Certificate
 *
 * Uses the specialized high-fidelity Arabic/English bilingual template
 * from grade6CertificateService.ts. This grade already has a dedicated
 * template with precise field positioning on the official certificate artwork.
 *
 * To update the Grade 6 design, edit: server/grade6CertificateService.ts
 */
import type { CertificateData } from './_base';
import { generateGrade6CertificatePDF } from '../grade6CertificateService';

export type { CertificateData };

export async function generate(data: CertificateData): Promise<string> {
  return generateGrade6CertificatePDF({
    student:           data.student,
    school:            data.school,
    examYear:          data.examYear,
    finalGrade:        data.finalGrade,
    qrToken:           data.qrToken,
    certificateNumber: data.certificateNumber,
    verifyUrl:         data.verifyUrl,
    isReprint:         data.isReprint,
  });
}
