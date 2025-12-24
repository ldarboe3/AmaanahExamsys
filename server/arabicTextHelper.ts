import ArabicReshaper from 'arabic-reshaper';

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
  
  // Shape Arabic characters to their connected presentation forms
  const shaped = ArabicReshaper.convertArabic(text, options);
  
  // For pdfkit RTL rendering: reverse the string logically
  // This reverses at a higher level to preserve shaped glyphs
  let result = '';
  for (let i = shaped.length - 1; i >= 0; i--) {
    result += shaped[i];
  }
  
  return result;
}
