import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';

// Initialize bidi instance once
const bidi = bidiFactory();

/**
 * Prepare Arabic text for PDFKit (LTR renderer).
 *
 * PDFKit renders characters strictly left-to-right, so we must:
 *   1. Reorder characters to visual (display) order via the Unicode Bidi algorithm
 *   2. Shape Arabic characters AFTER reordering so each glyph's contextual form
 *      (initial / medial / final / isolated) matches its actual display neighbours.
 *
 * Previous implementation did these steps in reverse order, causing every
 * character to carry the wrong connection-side form once the string was flipped.
 *
 * NOTE: Used by certificates and transcripts — do not change the order here.
 */
export function shapeArabicText(text: string): string {
  if (!text) return '';

  try {
    // ── Step 1: Logical → Visual reordering (Unicode Bidi Algorithm) ──────
    const embeddingLevels = bidi.getEmbeddingLevels(text, 'rtl');
    const reorderedIndices = bidi.getReorderedIndices(text, embeddingLevels);

    let reordered = '';
    for (const idx of reorderedIndices) {
      reordered += text[idx];
    }

    // ── Step 2: Shape Arabic characters in their new (visual) positions ───
    const shaped = ArabicReshaper.convertArabic(reordered);

    return shaped;
  } catch {
    return text;
  }
}

/**
 * Prepare Arabic text for PDFKit — correct order: reshape FIRST, then bidi.
 *
 * ArabicReshaper must receive text in LOGICAL order so it can determine the
 * correct contextual form (initial / medial / final / isolated) for each
 * character based on its actual neighbours in the word.  Only after the
 * presentation-form glyphs are chosen do we apply the Unicode Bidi Algorithm
 * to convert logical order → visual (left-to-right) order for PDFKit.
 *
 * Use this for the timetable PDF.  Certificates/transcripts continue to use
 * shapeArabicText() above unchanged.
 */
export function shapeArabicTextForPdf(text: string): string {
  if (!text) return '';

  try {
    // ── Step 1: Shape in LOGICAL order ────────────────────────────────────
    // Reshaper sees correct left/right neighbours for each character and
    // assigns the right presentation form (initial, medial, final, isolated).
    const shaped = ArabicReshaper.convertArabic(text);

    // ── Step 2: Logical → Visual reordering (Unicode Bidi Algorithm) ──────
    // Now that glyphs carry the right form, move them to their visual
    // (display) positions so PDFKit's LTR renderer draws them correctly.
    const embeddingLevels = bidi.getEmbeddingLevels(shaped, 'rtl');
    const reorderedIndices = bidi.getReorderedIndices(shaped, embeddingLevels);

    let reordered = '';
    for (const idx of reorderedIndices) {
      reordered += shaped[idx];
    }

    return reordered;
  } catch {
    return text;
  }
}
