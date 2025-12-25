import { execSync } from "child_process";
import { existsSync } from "fs";
import type { Browser } from "puppeteer";

let cachedChromiumPath: string | null = null;
let cachedPuppeteer: any = null;

export async function getChromiumExecutable(): Promise<string | undefined> {
  if (cachedChromiumPath) return cachedChromiumPath;
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    if (existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log('[Chromium] Using PUPPETEER_EXECUTABLE_PATH:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  }
  
  if (!isProduction) {
    try {
      const whichChromium = execSync('which chromium', { encoding: 'utf8', timeout: 3000 }).trim();
      if (whichChromium && existsSync(whichChromium)) {
        cachedChromiumPath = whichChromium;
        console.log('[Chromium] Found via which:', cachedChromiumPath);
        return cachedChromiumPath;
      }
    } catch (err) {}
    
    const directPaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ];
    
    for (const path of directPaths) {
      if (existsSync(path)) {
        cachedChromiumPath = path;
        console.log('[Chromium] Found executable at:', cachedChromiumPath);
        return cachedChromiumPath;
      }
    }
  }
  
  // In production, let puppeteer use its bundled chromium
  console.log('[Chromium] Using bundled Puppeteer Chromium');
  return undefined;
}

async function getPuppeteer() {
  if (cachedPuppeteer) return cachedPuppeteer;
  cachedPuppeteer = await import('puppeteer');
  return cachedPuppeteer;
}

let sharedBrowser: Browser | null = null;
let browserLastUsed: number = Date.now();
let browserLaunchPromise: Promise<Browser> | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;

const BROWSER_IDLE_TIMEOUT = 300000;

export async function getSharedBrowser(): Promise<Browser> {
  browserLastUsed = Date.now();
  
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  
  if (sharedBrowser && !sharedBrowser.connected) {
    console.log('[Chromium] Browser disconnected, relaunching...');
    sharedBrowser = null;
  }
  
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }
  
  browserLaunchPromise = launchBrowser();
  return browserLaunchPromise;
}

async function launchBrowser(): Promise<Browser> {
  try {
    const puppeteer = await getPuppeteer();
    const chromiumPath = await getChromiumExecutable();
    
    console.log('[Chromium] Launching browser...');
    
    const launchArgs = [
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
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio'
    ];
    
    const launchOptions: any = {
      headless: true,
      args: launchArgs,
      timeout: 120000
    };
    
    if (chromiumPath) {
      launchOptions.executablePath = chromiumPath;
    }
    
    const browser = await puppeteer.default.launch(launchOptions);
    
    sharedBrowser = browser;
    browserLaunchPromise = null;
    
    startKeepAlive();
    scheduleIdleCheck();
    
    console.log('[Chromium] Browser launched successfully');
    return browser;
  } catch (error) {
    browserLaunchPromise = null;
    sharedBrowser = null;
    console.error('[Chromium] Failed to launch browser:', error);
    throw error;
  }
}

function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  keepAliveInterval = setInterval(() => {
    if (sharedBrowser && sharedBrowser.connected) {
      browserLastUsed = Date.now();
    }
  }, 30000);
}

function scheduleIdleCheck() {
  setTimeout(async () => {
    const idleTime = Date.now() - browserLastUsed;
    if (idleTime >= BROWSER_IDLE_TIMEOUT && sharedBrowser) {
      console.log('[Chromium] Closing idle browser after', Math.round(idleTime / 1000), 'seconds');
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      try {
        await sharedBrowser.close();
      } catch (e) {}
      sharedBrowser = null;
    } else if (sharedBrowser) {
      scheduleIdleCheck();
    }
  }, BROWSER_IDLE_TIMEOUT);
}

export async function warmBrowser(): Promise<void> {
  console.log('[Chromium] Warming up browser...');
  const startTime = Date.now();
  try {
    await getSharedBrowser();
    console.log('[Chromium] Browser warmed in', Date.now() - startTime, 'ms');
  } catch (error) {
    console.error('[Chromium] Failed to warm browser:', error);
  }
}

export async function closeBrowser(): Promise<void> {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch (e) {}
    sharedBrowser = null;
  }
}
