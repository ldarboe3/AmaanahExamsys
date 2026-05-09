/**
 * Grade 12 — Senior Secondary School (SSS) Transcript
 *
 * Currently uses the shared generic HTML transcript template.
 * To add a specialized Grade 12 transcript design, replace the body of
 * `generate` with a custom implementation — see grade6TranscriptHTML.ts
 * for a reference of a full specialized bilingual template.
 */
import type { TranscriptData } from './_base';
import { generateGenericTranscriptPDF } from './_base';

export type { TranscriptData };

export async function generate(data: TranscriptData): Promise<string> {
  return generateGenericTranscriptPDF(data);
}
