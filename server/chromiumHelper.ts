import { execSync } from "child_process";
import { existsSync } from "fs";
import puppeteer, { Browser } from "puppeteer";

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

// Shared browser instance for performance optimization
let sharedBrowser: Browser | null = null;
let browserLastUsed: number = Date.now();
let browserLaunchPromise: Promise<Browser> | null = null; // Mutex for concurrent launches
const BROWSER_IDLE_TIMEOUT = 60000; // Close after 1 minute of inactivity

export async function getSharedBrowser(): Promise<Browser> {
  browserLastUsed = Date.now();
  
  // Return existing connected browser if still healthy
  if (sharedBrowser) {
    if (sharedBrowser.connected) {
      return sharedBrowser;
    }
    // Browser disconnected - clear stale reference
    console.log('[Chromium] Browser disconnected, clearing stale reference');
    sharedBrowser = null;
  }
  
  // If browser is being launched, wait for that launch to complete
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }
  
  // Launch browser with mutex to prevent concurrent launches
  browserLaunchPromise = (async () => {
    try {
      const chromiumPath = getChromiumExecutable();
      console.log('[Chromium] Launching shared browser from:', chromiumPath);
      
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: chromiumPath,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage', 
          '--disable-gpu', 
          '--single-process',
          '--no-zygote',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate'
        ],
        timeout: 30000
      });
      
      sharedBrowser = browser;
      
      // Set up idle timeout to close browser when not in use
      scheduleIdleCheck();
      
      return browser;
    } catch (error) {
      // On launch failure, ensure stale reference is cleared
      sharedBrowser = null;
      console.error('[Chromium] Failed to launch browser:', error);
      throw error;
    } finally {
      browserLaunchPromise = null;
    }
  })();
  
  return browserLaunchPromise;
}

function scheduleIdleCheck() {
  setTimeout(async () => {
    const idleTime = Date.now() - browserLastUsed;
    if (idleTime >= BROWSER_IDLE_TIMEOUT && sharedBrowser) {
      console.log('[Chromium] Closing idle browser');
      try {
        await sharedBrowser.close();
      } catch (e) {
        // Browser might already be closed
      }
      sharedBrowser = null;
    } else if (sharedBrowser) {
      scheduleIdleCheck();
    }
  }, BROWSER_IDLE_TIMEOUT);
}

export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch (e) {
      // Browser might already be closed
    }
    sharedBrowser = null;
  }
}
