import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';

// Initialize bidi instance
const bidi = bidiFactory();

export function shapeArabicText(text: string): string {
  if (!text) return '';
  
  const options = {
    support: {
      ZWJ: true,
      ZWJ_U08E2: false
    },
    replacement: {
      ZWJ: '۰',
      ZWJLamAlef: '۰'
    },
    shadda: true
  };
  
  // Step 1: Shape Arabic characters to their connected presentation forms
  const shaped = ArabicReshaper.convertArabic(text, options);
  
  // Step 2: Use bidi-js for logical-to-visual reordering (RTL)
  const embeddingLevelsResult = bidi.getEmbeddingLevels(shaped, 'rtl');
  const reorderedIndices = bidi.getReorderedIndices(shaped, embeddingLevelsResult);
  
  // Build visually reordered string
  let visual = '';
  for (let i = 0; i < reorderedIndices.length; i++) {
    visual += shaped[reorderedIndices[i]];
  }
  
  return visual;
}
