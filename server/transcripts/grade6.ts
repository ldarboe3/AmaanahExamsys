/**
 * Grade 6 — Upper Basic School (UBS) Transcript
 *
 * Grade 6 has two transcript paths:
 *
 *   1. Generic path (called from certificateService.ts): uses the shared
 *      HTML template from _base.ts — suitable for quick reprints.
 *
 *   2. Specialized bilingual path (called from transcriptService.ts routes):
 *      uses the full Arabic/English bilingual template in grade6TranscriptHTML.ts.
 *      That template includes transliteration, GRADE_6_SUBJECTS definitions, and
 *      precise layout tuned for the official transcript artwork.
 *
 * This file serves the generic path. For the specialized bilingual path, see
 * server/transcriptService.ts and server/grade6TranscriptHTML.ts.
 *
 * To promote Grade 6 to always use the specialized bilingual template through
 * this dispatcher, replace `generateGenericTranscriptPDF` below with an import
 * from grade6TranscriptHTML.ts (adapting the data shape as needed).
 */
import type { TranscriptData } from './_base';
import { generateGenericTranscriptPDF } from './_base';

export type { TranscriptData };

export async function generate(data: TranscriptData): Promise<string> {
  return generateGenericTranscriptPDF(data);
}
