import ArabicReshaper from 'arabic-reshaper';

export function shapeArabicText(text: string): string {
  if (!text) return '';
  
  // Shape Arabic characters to their connected presentation forms
  const shaped = ArabicReshaper.convertArabic(text);
  
  // Reverse the entire string for RTL rendering in pdfkit
  // pdfkit renders left-to-right, so reversing makes text appear right-to-left
  return shaped.split('').reverse().join('');
}
