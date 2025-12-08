import { execSync } from "child_process";
import { existsSync } from "fs";

// Helper to find Chromium executable for Puppeteer
let cachedChromiumPath: string | null = null;

export function getChromiumExecutable(): string {
  if (cachedChromiumPath) return cachedChromiumPath;
  
  // Check environment variable first
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    if (existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log('[Chromium] Using PUPPETEER_EXECUTABLE_PATH:', cachedChromiumPath);
      return cachedChromiumPath;
    } else {
      console.warn('[Chromium] PUPPETEER_EXECUTABLE_PATH set but file not found:', process.env.PUPPETEER_EXECUTABLE_PATH);
    }
  }
  
  // Try to find chromium in PATH
  const candidates = ['chromium', 'chromium-browser', 'google-chrome', 'chrome'];
  for (const cmd of candidates) {
    try {
      const path = execSync(`which ${cmd}`, { encoding: 'utf8' }).trim();
      if (path && existsSync(path)) {
        cachedChromiumPath = path;
        console.log('[Chromium] Found executable at:', cachedChromiumPath);
        return cachedChromiumPath;
      }
    } catch (err) {
      // Command not found, try next
      console.debug(`[Chromium] ${cmd} not found`);
    }
  }
  
  // If no executable found, throw with helpful error
  const errorMsg = 'Could not find Chromium executable. Tried: ' + candidates.join(', ') + 
                   '. Set PUPPETEER_EXECUTABLE_PATH environment variable or ensure chromium is installed.';
  console.error('[Chromium] ' + errorMsg);
  throw new Error(errorMsg);
}
