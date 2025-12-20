#!/usr/bin/env node
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

const allowlist = [
  "@google-cloud/storage",
  "@neondatabase/serverless",
  "@sendgrid/mail",
  "connect-pg-simple",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-session",
  "memorystore",
  "multer",
  "passport",
  "passport-local",
  "ws",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  try {
    await rm("dist", { recursive: true, force: true });
    console.log("✓ Cleaned dist directory");

    console.log("\n📦 Building Vite client...");
    await viteBuild();
    console.log("✓ Client built successfully");

    console.log("\n🔧 Building Express server with esbuild...");
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    await esbuild({
      entryPoints: ["server/index.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/server/server.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: externals,
      logLevel: "info",
    });
    console.log("✓ Server built successfully");

    // Create ESM wrapper for CommonJS bundle (needed for "type": "module" in package.json)
    const wrapperCode = `import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("./server.cjs");
`;
    await import("fs").then(m => m.promises.writeFile("dist/server/index.js", wrapperCode));
    console.log("✓ ESM wrapper created");

    console.log("\n✅ Build complete!");
    console.log("\nTo start production server:");
    console.log("  export NODE_ENV=production");
    console.log("  export PORT=8080");
    console.log("  export DATABASE_URL=your_database_url");
    console.log("  export SESSION_SECRET=your_secret");
    console.log("  node dist/server/index.js");
  } catch (err) {
    console.error("❌ Build failed:", err);
    process.exit(1);
  }
}

buildAll();
