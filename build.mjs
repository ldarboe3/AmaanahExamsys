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
  "puppeteer",
  "ws",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  try {
    // Clean dist
    console.log("🧹 Cleaning dist directory...");
    await rm("dist", { recursive: true, force: true });
    console.log("✓ Cleaned dist directory");

    // Build Vite client
    console.log("\n📦 Building Vite client...");
    try {
      await viteBuild();
      console.log("✓ Client built successfully");
    } catch (vitaErr) {
      console.error("❌ Vite build failed:", vitaErr);
      throw vitaErr;
    }

    // Build server with esbuild
    console.log("\n🔧 Building Express server with esbuild...");
    try {
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
    } catch (esbuildErr) {
      console.error("❌ esbuild failed:", esbuildErr);
      throw esbuildErr;
    }

    // Create ESM wrapper
    console.log("\n📝 Creating ESM wrapper...");
    try {
      const fs = await import("fs");
      const wrapperCode = `import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("./server.cjs");
`;
      await fs.promises.writeFile("dist/server/index.js", wrapperCode);
      console.log("✓ ESM wrapper created");
    } catch (wrapperErr) {
      console.error("❌ Wrapper creation failed:", wrapperErr);
      throw wrapperErr;
    }

    console.log("\n✅ Build complete!");
    console.log("\nTo start production server:");
    console.log("  export NODE_ENV=production");
    console.log("  export PORT=8080");
    console.log("  export DATABASE_URL=your_database_url");
    console.log("  export SESSION_SECRET=your_secret");
    console.log("  node dist/server/index.js");
  } catch (err) {
    console.error("\n❌ Build failed:", err);
    process.exit(1);
  }
}

buildAll();
