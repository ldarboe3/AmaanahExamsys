import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

export function shapeArabicText(text: string): string {
  if (!text) return '';
  
  const shaped = ArabicReshaper.convertArabic(text);
  
  const embeddingLevels = bidi.getEmbeddingLevels(shaped, 'rtl');
  const segments = bidi.getReorderSegments(shaped, embeddingLevels, 0, shaped.length - 1);
  
  let chars = shaped.split('');
  
  segments.forEach(([start, end]) => {
    const segment = chars.slice(start, end + 1).reverse();
    chars.splice(start, end - start + 1, ...segment);
  });
  
  const mirrored = bidi.getMirroredCharactersMap(shaped, embeddingLevels);
  mirrored.forEach((mirroredChar, index) => {
    chars[index] = mirroredChar;
  });
  
  return chars.join('');
}
