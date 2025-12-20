declare module 'bidi-js' {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{start: number; end: number; level: number}>;
  }
  
  interface Bidi {
    getEmbeddingLevels(text: string, direction?: 'ltr' | 'rtl' | 'auto'): EmbeddingLevels;
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels, start?: number, end?: number): Array<[number, number]>;
    getMirroredCharactersMap(text: string, embeddingLevels: EmbeddingLevels): Map<number, string>;
    getMirroredCharacter(char: string): string;
  }
  
  function bidiFactory(): Bidi;
  export = bidiFactory;
}
