import { execSync } from "child_process";

// Helper to find Chromium executable for Puppeteer
let cachedChromiumPath: string | null = null;

export function getChromiumExecutable(): string {
  if (cachedChromiumPath) return cachedChromiumPath;
  
  // Check environment variable first
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    return cachedChromiumPath;
  }
  
  // Try to find chromium in PATH
  const candidates = ['chromium', 'chromium-browser', 'google-chrome', 'chrome'];
  for (const cmd of candidates) {
    try {
      const path = execSync(`which ${cmd}`, { encoding: 'utf8' }).trim();
      if (path) {
        cachedChromiumPath = path;
        return cachedChromiumPath;
      }
    } catch {
      // Command not found, try next
    }
  }
  
  throw new Error('Could not find Chromium executable. Set PUPPETEER_EXECUTABLE_PATH environment variable.');
}
