/**
 * Transcript dispatcher — routes each student to the correct grade-specific generator.
 *
 * Note: The specialized Grade 6 bilingual transcript (used for the Arabic
 * certificate workflow) is handled separately by transcriptService.ts and
 * grade6TranscriptHTML.ts. This dispatcher handles the standard transcript
 * workflow routed through certificateService.ts.
 *
 * To add a new grade:
 *   1. Create server/transcripts/grade<N>.ts
 *   2. Export an async `generate(data: TranscriptData): Promise<string>` function
 *   3. Add a `case <N>:` entry in the switch below
 */
import type { TranscriptData } from './_base';
import { generate as grade3  } from './grade3';
import { generate as grade6  } from './grade6';
import { generate as grade9  } from './grade9';
import { generate as grade12 } from './grade12';

export type { TranscriptData };

export async function generateTranscriptPDF(data: TranscriptData): Promise<string> {
  switch (data.student.grade) {
    case 3:  return grade3(data);
    case 6:  return grade6(data);
    case 9:  return grade9(data);
    case 12: return grade12(data);
    default:
      if (data.student.grade < 6)  return grade3(data);
      if (data.student.grade < 9)  return grade6(data);
      if (data.student.grade < 12) return grade9(data);
      return grade12(data);
  }
}
