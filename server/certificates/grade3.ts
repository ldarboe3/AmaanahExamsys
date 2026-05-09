/**
 * Grade 3 — Lower Basic School (LBS) Certificate
 *
 * Currently uses the shared generic PDFKit template.
 * To add a specialized Grade 3 certificate design, replace the body of
 * `generate` with a custom implementation — see grade6.ts for reference.
 */
import type { CertificateData } from './_base';
import { generateGenericCertificatePDF } from './_base';

export type { CertificateData };

export async function generate(data: CertificateData): Promise<string> {
  return generateGenericCertificatePDF(data);
}
