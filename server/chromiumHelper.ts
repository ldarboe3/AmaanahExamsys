import { execSync } from "child_process";
import { existsSync } from "fs";
import puppeteerCore, { Browser } from "puppeteer-core";

let cachedChromiumPath: string | null = null;
let useSparticuzChromium = false;

export async function getChromiumExecutable(): Promise<string> {
  if (cachedChromiumPath) return cachedChromiumPath;
  
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('[Chromium] Environment:', isProduction ? 'production' : 'development');
  
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    if (existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log('[Chromium] Using PUPPETEER_EXECUTABLE_PATH:', cachedChromiumPath);
      return cachedChromiumPath;
    } else {
      console.warn('[Chromium] PUPPETEER_EXECUTABLE_PATH set but file not found:', process.env.PUPPETEER_EXECUTABLE_PATH);
    }
  }
  
  try {
    const whichChromium = execSync('which chromium', { encoding: 'utf8', timeout: 5000 }).trim();
    if (whichChromium && existsSync(whichChromium)) {
      cachedChromiumPath = whichChromium;
      console.log('[Chromium] Found via which:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  } catch (err) {
    console.debug('[Chromium] which chromium failed');
  }
  
  const directPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  
  for (const path of directPaths) {
    if (existsSync(path)) {
      cachedChromiumPath = path;
      console.log('[Chromium] Found executable at:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  }
  
  try {
    console.log('[Chromium] Trying @sparticuz/chromium for serverless...');
    const chromium = await import('@sparticuz/chromium');
    const execPath = await chromium.default.executablePath();
    if (execPath && existsSync(execPath)) {
      cachedChromiumPath = execPath;
      useSparticuzChromium = true;
      console.log('[Chromium] Using @sparticuz/chromium:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  } catch (err) {
    console.debug('[Chromium] @sparticuz/chromium not available:', err);
  }
  
  try {
    const puppeteer = require('puppeteer');
    const puppeteerChrome = puppeteer.executablePath?.();
    if (typeof puppeteerChrome === 'string' && existsSync(puppeteerChrome)) {
      cachedChromiumPath = puppeteerChrome;
      console.log('[Chromium] Using bundled Puppeteer Chromium:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  } catch (err) {
    console.debug('[Chromium] Could not find bundled Puppeteer Chrome:', err);
  }
  
  const errorMsg = 'Could not find Chromium executable. Checked: direct paths, PATH env, @sparticuz/chromium, bundled Puppeteer. Set PUPPETEER_EXECUTABLE_PATH environment variable or ensure chromium is installed.';
  console.error('[Chromium] ' + errorMsg);
  throw new Error(errorMsg);
}

let sharedBrowser: Browser | null = null;
let browserLastUsed: number = Date.now();
let browserLaunchPromise: Promise<Browser> | null = null;
const BROWSER_IDLE_TIMEOUT = 60000;

export async function getSharedBrowser(): Promise<Browser> {
  browserLastUsed = Date.now();
  
  if (sharedBrowser) {
    if (sharedBrowser.connected) {
      return sharedBrowser;
    }
    console.log('[Chromium] Browser disconnected, clearing stale reference');
    sharedBrowser = null;
  }
  
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }
  
  browserLaunchPromise = (async () => {
    try {
      const chromiumPath = await getChromiumExecutable();
      console.log('[Chromium] Launching shared browser from:', chromiumPath);
      
      let launchArgs = [
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
      ];
      
      if (useSparticuzChromium) {
        try {
          const chromium = await import('@sparticuz/chromium');
          launchArgs = chromium.default.args;
        } catch (e) {
          console.debug('[Chromium] Could not get sparticuz args, using defaults');
        }
      }
      
      const browser = await puppeteerCore.launch({
        headless: true,
        executablePath: chromiumPath,
        args: launchArgs,
        timeout: 30000
      });
      
      sharedBrowser = browser;
      scheduleIdleCheck();
      
      return browser;
    } catch (error) {
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
    }
    sharedBrowser = null;
  }
}
