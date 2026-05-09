/**
 * Grade 3 — Lower Basic School (LBS) Transcript
 *
 * Currently uses the shared generic HTML transcript template.
 * To add a specialized Grade 3 transcript design, replace the body of
 * `generate` with a custom implementation — see grade6.ts for reference.
 */
import type { TranscriptData } from './_base';
import { generateGenericTranscriptPDF } from './_base';

export type { TranscriptData };

export async function generate(data: TranscriptData): Promise<string> {
  return generateGenericTranscriptPDF(data);
}
