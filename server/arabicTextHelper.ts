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
  
  // Return shaped text - don't reverse, let pdfkit handle RTL with proper fonts
  return shaped;
}
