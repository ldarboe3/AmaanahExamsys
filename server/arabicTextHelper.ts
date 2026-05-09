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
    // No custom options — the defaults are correct and safe.
    // Passing options with `replacement.ZWJ: '۰'` (as in the old code)
    // injects the visible Arabic-Indic digit 0 into the output, corrupting text.
    const shaped = ArabicReshaper.convertArabic(reordered);

    return shaped;
  } catch {
    return text;
  }
}
