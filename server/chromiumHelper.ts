import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import type { Browser } from "puppeteer";

let cachedChromiumPath: string | null = null;
let cachedPuppeteer: any = null;

function findChromiumInCacheDir(cacheDir: string): string | null {
  try {
    if (!existsSync(cacheDir)) return null;
    
    const entries = readdirSync(cacheDir);
    for (const entry of entries) {
      if (entry.startsWith('chromium')) {
        const chromiumDir = join(cacheDir, entry);
        const possiblePaths = [
          join(chromiumDir, 'chrome-linux', 'chrome'),
          join(chromiumDir, 'chrome-linux64', 'chrome'),
          join(chromiumDir, 'chrome'),
        ];
        
        for (const p of possiblePaths) {
          if (existsSync(p)) {
            console.log('[Chromium] Found in cache directory:', p);
            return p;
          }
        }
        
        try {
          const subEntries = readdirSync(chromiumDir);
          for (const sub of subEntries) {
            const subPath = join(chromiumDir, sub);
            const chromePaths = [
              join(subPath, 'chrome-linux', 'chrome'),
              join(subPath, 'chrome-linux64', 'chrome'),
              join(subPath, 'chrome'),
            ];
            for (const cp of chromePaths) {
              if (existsSync(cp)) {
                console.log('[Chromium] Found in nested cache directory:', cp);
                return cp;
              }
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.log('[Chromium] Error scanning cache directory:', err);
  }
  return null;
}

export async function getChromiumExecutable(): Promise<string | undefined> {
  if (cachedChromiumPath) return cachedChromiumPath;
  
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    if (existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log('[Chromium] Using PUPPETEER_EXECUTABLE_PATH:', cachedChromiumPath);
      return cachedChromiumPath;
    }
    console.log('[Chromium] PUPPETEER_EXECUTABLE_PATH set but file not found:', process.env.PUPPETEER_EXECUTABLE_PATH);
  }
  
  const cacheDirs = [
    process.env.PUPPETEER_CACHE_DIR,
    '/opt/chromium',
    join(process.cwd(), '.cache', 'puppeteer'),
    '/workspace/.cache/puppeteer',
  ].filter(Boolean) as string[];
  
  for (const cacheDir of cacheDirs) {
    const found = findChromiumInCacheDir(cacheDir);
    if (found) {
      cachedChromiumPath = found;
      return cachedChromiumPath;
    }
  }
  
  const directPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/lib/chromium/chromium',
  ];
  
  for (const path of directPaths) {
    if (existsSync(path)) {
      cachedChromiumPath = path;
      console.log('[Chromium] Found executable at:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  }
  
  try {
    const whichChromium = execSync('which chromium || which chromium-browser || which google-chrome', { encoding: 'utf8', timeout: 3000 }).trim();
    if (whichChromium && existsSync(whichChromium)) {
      cachedChromiumPath = whichChromium;
      console.log('[Chromium] Found via which:', cachedChromiumPath);
      return cachedChromiumPath;
    }
  } catch (err) {
    console.log('[Chromium] which command failed');
  }
  
  console.log('[Chromium] No chromium found, will use bundled Puppeteer Chromium');
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

const BROWSER_IDLE_TIMEOUT = process.env.NODE_ENV === 'production' ? 600000 : 300000;

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
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-software-rasterizer',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
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
