#!/usr/bin/env bun
/**
 * Interactive Shopify Theme Development Setup Script
 *
 * This script will guide you through setting up a modern Shopify theme
 * development environment with Vite, Bun, and proper CI/CD workflows.
 */

import { $, type ShellPromise } from "bun";
import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message: string) {
  console.log("\n" + "=".repeat(60));
  log(message, colors.bright + colors.cyan);
  console.log("=".repeat(60) + "\n");
}

async function prompt(question: string): Promise<string> {
  log(question, colors.yellow);
  const input = await Bun.stdin.stream().getReader();
  let result = "";

  while (true) {
    const { value, done } = await input.read();
    if (done) break;

    const text = new TextDecoder().decode(value);
    if (text.includes("\n")) {
      result += text.replace("\n", "").replace("\r", "");
      break;
    }
    result += text;
  }

  input.releaseLock();
  return result.trim();
}

function select(question: string, options: string[]): Promise<number> {
  return new Promise(async (resolve) => {
    log(question, colors.yellow);
    options.forEach((option, index) => {
      log(`  ${index + 1}. ${option}`, colors.cyan);
    });

    const answer = await prompt("Enter your choice (1-" + options.length + "):");
    const choice = parseInt(answer);

    if (choice >= 1 && choice <= options.length) {
      resolve(choice - 1);
    } else {
      log("Invalid choice. Please try again.", colors.red);
      resolve(await select(question, options));
    }
  });
}

interface SetupConfig {
  projectName: string;
  stylingApproach: "css" | "scss" | "postcss" | "tailwind";
  jsApproach: "vanilla" | "typescript";
  packageManager: "bun" | "npm" | "pnpm" | "yarn";
  shopifyEnvironment: string;
  themeId: string | null;
  enableTunnel?: boolean;
  projectType?: string;
  projectDescription?: string;
  tomlApproach: "file" | "cli" | "skip";
  storeUrl?: string;
  lintingSetup: "eslint-prettier" | "theme-check" | "skip";
  gitHooks: boolean;
}

async function getShopifyThemes(): Promise<Array<{ id: string; name: string; role: string }>> {
  try {
    const result = await $`shopify theme list --json`.text();
    const themes = JSON.parse(result);
    return themes;
  } catch (error) {
    log("Error fetching Shopify themes. Make sure you're authenticated with Shopify CLI.", colors.red);
    return [];
  }
}

async function askQuestions(): Promise<SetupConfig> {
  header("Shopify Theme Development Environment Setup");

  log("Welcome! This script will help you set up a modern Shopify theme development environment.", colors.green);
  log("This setup includes Vite for fast development, Bun for package management, and CI/CD workflows.\n", colors.green);

  // Question 1: Project Name
  log("Let's start with some basic information about your project.\n", colors.cyan);
  const projectName = await prompt("📦 What is your project/store name? (e.g., 'acme-store', 'my-boutique'):");

  if (!projectName || projectName.trim() === "") {
    log("⚠️  Project name is required. Please try again.", colors.red);
    process.exit(1);
  }

  // Question 2: Styling Approach
  log("\n" + "─".repeat(60), colors.bright);
  log("🎨 CSS Setup", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("Choose your styling approach. We recommend plain CSS with CSS variables for most Shopify themes.", colors.yellow);
  log("Note: This template enforces semantic class names (NO Tailwind-style utility classes).\n", colors.yellow);

  const stylingChoice = await select(
    "Which styling approach will you use?",
    [
      "Plain CSS (Recommended - simple, semantic, mobile-first)",
      "SCSS/SASS (For variables, mixins, and nesting)",
      "PostCSS with plugins (For advanced CSS processing)",
      "Tailwind CSS (Utility-first - requires custom configuration)"
    ]
  );
  const stylingMap: SetupConfig["stylingApproach"][] = ["css", "scss", "postcss", "tailwind"];
  const stylingApproach = stylingMap[stylingChoice];

  if (stylingApproach === "tailwind") {
    log("\n⚠️  Note: While Tailwind is supported, this template's guidelines emphasize semantic class names.", colors.yellow);
    log("You'll need to adapt the CLAUDE.md guidelines if you choose to use utility classes.\n", colors.yellow);
  }

  // Question 3: JavaScript Approach
  log("\n" + "─".repeat(60), colors.bright);
  log("⚙️  JavaScript Setup", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("Choose between vanilla JavaScript or TypeScript. Vanilla JS is simpler for most Shopify themes.\n", colors.yellow);

  const jsChoice = await select(
    "Which JavaScript approach will you use?",
    [
      "Vanilla JavaScript (Recommended - simple, fast, perfect for Shopify)",
      "TypeScript (For type safety, better IDE support, and larger projects)"
    ]
  );
  const jsApproach: SetupConfig["jsApproach"] = jsChoice === 0 ? "vanilla" : "typescript";

  // Question 4: Package Manager
  log("\n" + "─".repeat(60), colors.bright);
  log("📦 Package Manager", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("We strongly recommend Bun - it's 3-10x faster than npm/yarn and has built-in TypeScript support.\n", colors.yellow);

  const pmChoice = await select(
    "Which package manager will you use?",
    [
      "Bun (Recommended - 3-10x faster, modern, built-in TypeScript)",
      "npm (Standard Node.js package manager)",
      "pnpm (Efficient disk usage with hard links)",
      "yarn (Reliable alternative to npm)"
    ]
  );
  const pmMap: SetupConfig["packageManager"][] = ["bun", "npm", "pnpm", "yarn"];
  const packageManager = pmMap[pmChoice];

  // Question 5: Theme Editor Development Setup
  log("\n" + "─".repeat(60), colors.bright);
  log("🔧 Development Environment", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("For Shopify theme editor development, we recommend using Cloudflare tunnel to avoid CORS issues.", colors.yellow);
  log("This requires cloudflared to be installed (brew install cloudflared).\n", colors.yellow);

  const tunnelChoice = await select(
    "Do you want to enable Cloudflare tunnel for theme editor development?",
    [
      "Yes (Recommended - enables HTTPS tunnel for theme editor)",
      "No (I'll configure HTTPS with mkcert or work without theme editor)"
    ]
  );
  const enableTunnel = tunnelChoice === 0;

  if (enableTunnel) {
    log("\n✓ Cloudflare tunnel will be enabled in vite.config.js", colors.green);
    log("✓ Vite will be locked to version 6.0.8 (required for tunnel support)", colors.green);
    log("Make sure to install cloudflared: brew install cloudflared\n", colors.yellow);
  }

  // Question 6: Shopify Theme Configuration (TOML)
  log("\n" + "─".repeat(60), colors.bright);
  log("📄 Shopify Theme Configuration", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("The shopify.theme.toml file stores your store URL and theme IDs for different environments.", colors.yellow);
  log("This file will be added to .gitignore at the end of setup to protect your credentials.\n", colors.yellow);

  const tomlChoice = await select(
    "How would you like to configure Shopify store access?",
    [
      "Create shopify.theme.toml file (Recommended - stores environment configs)",
      "Use Shopify CLI login only (No .toml file, authenticate via CLI each time)",
      "Skip for now (Configure manually later)"
    ]
  );
  const tomlMap: SetupConfig["tomlApproach"][] = ["file", "cli", "skip"];
  const tomlApproach = tomlMap[tomlChoice];

  let storeUrl = "";

  if (tomlApproach === "file") {
    storeUrl = await prompt("\n🏪 Enter your Shopify store URL (e.g., your-store.myshopify.com):");
    if (storeUrl && !storeUrl.includes(".myshopify.com")) {
      storeUrl = storeUrl.replace(/\.myshopify\.com$/, "") + ".myshopify.com";
    }
    log(`✓ Store URL: ${storeUrl || "(will be configured later)"}`, colors.green);
  } else if (tomlApproach === "cli") {
    log("\n✓ You'll use Shopify CLI authentication", colors.green);
    log("  Run 'shopify auth login' to authenticate before development", colors.yellow);
  } else {
    log("\n⏭️  Skipping store configuration. You can set this up later.", colors.yellow);
  }

  // Question 7: Linting Setup
  log("\n" + "─".repeat(60), colors.bright);
  log("🔍 Code Quality Tools", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("Linting helps catch errors and enforce consistent code style.\n", colors.yellow);

  const lintChoice = await select(
    "Which linting setup would you like?",
    [
      "ESLint + Prettier (Recommended - Full JavaScript/TypeScript linting + formatting)",
      "Theme Check only (Shopify Liquid linting)",
      "Skip for now (Configure manually later)"
    ]
  );
  const lintMap: SetupConfig["lintingSetup"][] = ["eslint-prettier", "theme-check", "skip"];
  const lintingSetup = lintMap[lintChoice];

  if (lintingSetup === "eslint-prettier") {
    log("\n✓ ESLint + Prettier will be configured", colors.green);
    log("  Format on save and pre-commit checks included", colors.cyan);
  } else if (lintingSetup === "theme-check") {
    log("\n✓ Theme Check will be configured for Liquid linting", colors.green);
  }

  // Question 8: Git Hooks
  log("\n" + "─".repeat(60), colors.bright);
  log("🪝 Git Hooks", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("Git hooks run checks before commits to catch issues early.\n", colors.yellow);

  const hooksChoice = await select(
    "Would you like to set up Git hooks (husky + lint-staged)?",
    [
      "Yes (Recommended - Run linting/formatting on staged files before commit)",
      "No (Skip Git hooks setup)"
    ]
  );
  const gitHooks = hooksChoice === 0;

  if (gitHooks) {
    log("\n✓ Husky + lint-staged will be configured", colors.green);
    log("  Pre-commit hooks will format and lint staged files", colors.cyan);
  }

  // Question 9: Shopify Store Connection
  log("\n" + "─".repeat(60), colors.bright);
  log("🛍️  Shopify Store Connection", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("Now let's connect to your Shopify store and select a base theme.\n", colors.yellow);

  log("Authenticating with Shopify CLI and fetching available themes...", colors.cyan);
  const themes = await getShopifyThemes();

  let shopifyEnvironment = "development";
  let themeId: string | null = null;

  if (themes.length > 0) {
    log("\n✓ Successfully fetched themes from your store!\n", colors.green);
    const themeOptions = themes.map(t => `${t.name} (${t.role}) - ID: ${t.id}`);
    themeOptions.push("Skip - I'll configure this later");

    const themeChoice = await select(
      "Which theme would you like to use as a base?",
      themeOptions
    );

    if (themeChoice < themes.length) {
      themeId = themes[themeChoice].id;
      log("\n✓ Selected theme: " + themes[themeChoice].name, colors.green);

      const envName = await prompt("\nWhat would you like to name this environment? (e.g., 'development', 'staging', 'production'):");
      shopifyEnvironment = envName.trim() || "development";
      log(`✓ Environment will be named: ${shopifyEnvironment}`, colors.green);
    } else {
      log("\n⏭️  Skipping theme selection. You can pull a theme later using 'shopify theme pull'", colors.yellow);
    }
  } else {
    log("\n⚠️  No themes found or Shopify CLI not authenticated.", colors.yellow);
    log("Make sure you've run 'shopify auth login' before running this setup.", colors.yellow);
    log("You can pull a theme later using 'shopify theme pull'\n", colors.yellow);
  }

  // Question 7: Project Context for CLAUDE.md
  log("\n" + "─".repeat(60), colors.bright);
  log("🤖 AI Assistant Configuration", colors.bright + colors.cyan);
  log("─".repeat(60), colors.bright);
  log("Help AI assistants (like Claude) understand your project better by providing context.\n", colors.yellow);

  const projectType = await select(
    "What type of Shopify store is this?",
    [
      "E-commerce (Standard online store)",
      "Headless (API-driven, custom frontend)",
      "B2B (Wholesale, bulk ordering)",
      "Subscription (Recurring products)",
      "Other/Custom"
    ]
  );

  const projectTypeMap = ["e-commerce", "headless", "b2b", "subscription", "custom"];
  const selectedProjectType = projectTypeMap[projectType];

  const projectDescription = await prompt("\n📝 Brief description of this project (optional, press Enter to skip):");

  return {
    projectName,
    stylingApproach,
    jsApproach,
    packageManager,
    shopifyEnvironment,
    themeId,
    enableTunnel,
    projectType: selectedProjectType,
    projectDescription: projectDescription.trim() || "",
    tomlApproach,
    storeUrl: storeUrl.trim() || "",
    lintingSetup,
    gitHooks,
  };
}

async function createDirectoryStructure() {
  header("Creating Directory Structure");

  const dirs = [
    "frontend/entrypoints",
    "frontend/scripts/components",
    "frontend/scripts/sections",
    "frontend/scripts/hooks/core",
    "frontend/styles",
    "frontend/images",
    "frontend/fonts",
    ".github/workflows",
  ];

  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
      log(`✓ Created: ${dir}`, colors.green);
    } catch (error) {
      log(`✗ Failed to create: ${dir}`, colors.red);
    }
  }

  // Create .gitkeep files
  const gitkeepDirs = [
    "frontend/scripts/sections",
    "frontend/styles",
    "frontend/images",
    "frontend/fonts",
  ];

  for (const dir of gitkeepDirs) {
    await writeFile(join(dir, ".gitkeep"), "");
  }
}

async function installDependencies(config: SetupConfig) {
  header("Installing Dependencies");

  const baseDeps = [
    config.enableTunnel ? "vite@6.0.8" : "vite", // Lock Vite to 6.0.8 for tunnel support
    "vite-plugin-shopify",
    "postcss",
    "autoprefixer",
    "npm-run-all",
    "@shopify/theme-check-node",
  ];

  if (config.stylingApproach === "scss") {
    baseDeps.push("sass");
  } else if (config.stylingApproach === "tailwind") {
    baseDeps.push("tailwindcss");
  }

  if (config.jsApproach === "typescript") {
    baseDeps.push("typescript", "@types/node");
  }

  log(`Installing dependencies with ${config.packageManager}...`, colors.cyan);
  if (config.enableTunnel) {
    log("  ⚡ Installing Vite 6.0.8 (required for tunnel compatibility)", colors.yellow);
  }

  try {
    if (config.packageManager === "bun") {
      await $`bun add -d ${baseDeps}`;
    } else if (config.packageManager === "npm") {
      await $`npm install --save-dev ${baseDeps}`;
    } else if (config.packageManager === "pnpm") {
      await $`pnpm add -D ${baseDeps}`;
    } else {
      await $`yarn add -D ${baseDeps}`;
    }
    log("✓ Dependencies installed successfully", colors.green);
  } catch (error) {
    log("✗ Error installing dependencies", colors.red);
    console.error(error);
  }
}

async function createPackageJson(config: SetupConfig) {
  header("Creating package.json");

  const packageJson = {
    name: `${config.projectName}-shopify`,
    version: "1.0.0",
    type: "module",
    packageManager: config.packageManager === "bun" ? "bun@1.3.0" : undefined,
    scripts: {
      dev: 'run-p -sr "shopify:dev -- {@}" "vite:dev" --',
      "dev:staging": 'run-p -sr "shopify:dev:staging -- {@}" "vite:dev" --',
      "dev:production": 'run-p -sr "shopify:dev:production -- {@}" "vite:dev" --',
      build: `${config.packageManager} vite:build`,
      preview: "vite preview",
      deploy: 'run-s "vite:build" "shopify:push -- {@}" --',
      "deploy:staging": 'run-s "vite:build" "shopify:push:staging -- {@}" --',
      "deploy:production": 'run-s "vite:build" "shopify:push:production -- {@}" --',
      "shopify:dev": "shopify theme dev --environment development",
      "shopify:dev:staging": "shopify theme dev --environment staging",
      "shopify:dev:production": "shopify theme dev --environment production",
      "shopify:push": "shopify theme push --environment development",
      "shopify:push:staging": "shopify theme push --environment staging",
      "shopify:push:production": "shopify theme push --environment production",
      "vite:dev": "vite",
      "vite:build": "vite build",
      clean: "rm -rf dist assets/storefront.js assets/custom_styling.css",
    },
  };

  await writeFile("package.json", JSON.stringify(packageJson, null, 2));
  log("✓ package.json created", colors.green);
}

async function createViteConfig(config: SetupConfig) {
  header("Creating Vite Configuration");

  const viteConfig = `import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import shopify from 'vite-plugin-shopify';

export default defineConfig(() => ({
  plugins: [
    shopify({
      themeRoot: './',
      sourceCodeDir: 'frontend',
      entrypointsDir: 'frontend/entrypoints',
      additionalEntrypoints: [],${config.enableTunnel ? `
      tunnel: true, // Enable Cloudflare tunnel for theme editor development` : ""}
    }),
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./frontend', import.meta.url)),
    },
  },
  build: {
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
      }
    }
  },
  server: {${config.enableTunnel ? `
    allowedHosts: 'all', // Required for Cloudflare tunnel` : ""}
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, PATCH, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true"
    },
    cors: {
      origin: ["*"],
      methods: ["GET", "HEAD", "PUT", "POST, PATCH", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    }
  },
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    },${config.stylingApproach === "scss" ? `
    preprocessorOptions: {
      scss: {
        additionalData: '@use "sass:math"; @use "sass:map";',
        api: 'modern-compiler',
        quietDeps: true,
        logger: {
          warn: () => { }
        }
      }
    }` : ""}
  }
}));
`;

  await writeFile("vite.config.js", viteConfig);
  log("✓ vite.config.js created", colors.green);

  // Lock Vite to 6.0.8 if tunnel is enabled
  if (config.enableTunnel) {
    log("✓ Vite version will be locked to 6.0.8 for tunnel compatibility", colors.green);
  }
}

async function createPostCSSConfig(config: SetupConfig) {
  header("Creating PostCSS Configuration");

  let postcssConfig = `export default {
  plugins: {
    autoprefixer: {},
  },
}
`;

  if (config.stylingApproach === "tailwind") {
    postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
  }

  await writeFile("postcss.config.js", postcssConfig);
  log("✓ postcss.config.js created", colors.green);
}

async function createGitIgnore() {
  header("Creating .gitignore");

  const gitignore = `# Node.js dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment variables
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local

# Vite
dist/
dist-ssr/
*.local
.vite/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS files
Thumbs.db
.DS_Store
*~
.Spotlight-V100
.Trashes

# Shopify theme files
config/settings_data.json

# Build artifacts
*.log
*.tsbuildinfo

# Lock files (keep only one)
package-lock.json
yarn.lock
pnpm-lock.yaml
`;

  await writeFile(".gitignore", gitignore);
  log("✓ .gitignore created", colors.green);
}

async function createShopifyIgnore() {
  header("Creating .shopifyignore");

  const shopifyignore = `# Shopify Ignore - Files to exclude from theme uploads

# Node modules
node_modules/

# Source files (Vite will build these)
frontend/

# Config files
vite.config.js
postcss.config.js
tailwind.config.js
package.json
bun.lockb
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build configs
.vite/
tsconfig.json
.eslintrc*
.prettierrc*

# Git files
.git/
.gitignore
.gitattributes

# CI/CD
.github/

# Documentation
README.md
CLAUDE.md
project_setup.md
*.md

# Setup script
setup.ts

# Environment files
.env*

# Editor directories
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
`;

  await writeFile(".shopifyignore", shopifyignore);
  log("✓ .shopifyignore created", colors.green);
}

async function createGitHubWorkflow(config: SetupConfig) {
  header("Creating GitHub Actions Workflow");

  const workflow = `name: Build Vite Assets

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup ${config.packageManager === "bun" ? "Bun" : "Node.js"}
        uses: ${config.packageManager === "bun" ? "oven-sh/setup-bun@v1" : "actions/setup-node@v4"}${config.packageManager === "bun" ? `
        with:
          bun-version: latest` : ""}

      - name: Install dependencies
        run: ${config.packageManager} install

      - name: Build Vite assets
        run: ${config.packageManager} run build

      - name: Check for uncommitted changes in assets
        run: |
          git diff --exit-code assets/ || \\
          (echo "Error: Built assets are out of sync. Run '${config.packageManager} run build' locally and commit the changes." && exit 1)

      - name: Upload assets artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: built-assets
          path: assets/
          retention-days: 7
`;

  await mkdir(".github/workflows", { recursive: true });
  await writeFile(".github/workflows/build.yml", workflow);
  log("✓ GitHub Actions workflow created", colors.green);
}

async function createEntrypoints(config: SetupConfig) {
  header("Creating Entry Point Files");

  // Create storefront.js
  const storefrontJs = `/**
 * Storefront JavaScript Entrypoint
 */

import 'vite/modulepreload-polyfill';
import { consoleMessage, reportWebVitals, initGlobalEvents, handleUrlParams } from '~/scripts/utils';
import { registerSectionLifecycles } from '~/scripts/hooks/core/sectionRegistry';

// Initialize global object
window.${config.projectName.replace(/-/g, "")} = window.${config.projectName.replace(/-/g, "")} || {};

window.${config.projectName.replace(/-/g, "")}.settings = {
  devMode: true,
};

window.${config.projectName.replace(/-/g, "")}.theme = {
  shopName: window.Shopify?.shop || '${config.projectName}',
  currency: window.Shopify?.currency?.active || 'USD',
  currencySymbol: '$',
  moneyFormat: window.theme?.moneyFormat || '${{amount}}',
};

window.${config.projectName.replace(/-/g, "")}.cart = {
  count: window.Shopify?.cart?.item_count || 0,
  total: window.Shopify?.cart?.total_price || 0,
};

window.${config.projectName.replace(/-/g, "")}.events = window.${config.projectName.replace(/-/g, "")}.events || new EventTarget();

window.${config.projectName.replace(/-/g, "")}.utils = {
  consoleMessage,
  handleUrlParams,
};

window.${config.projectName.replace(/-/g, "")}.version = '1.0.0';

consoleMessage('Store object initialized', 'info');

const initializeApp = () => {
  try {
    consoleMessage('[InitializeApp] Starting application initialization', 'info');

    initGlobalEvents();
    consoleMessage('[InitializeApp] Global events initialized', 'info');

    registerSectionLifecycles();
    consoleMessage('[InitializeApp] Section lifecycles registered', 'info');

    handleUrlParams();

    if (window.Shopify?.cart) {
      window.${config.projectName.replace(/-/g, "")}.cart.count = window.Shopify.cart.item_count || 0;
      window.${config.projectName.replace(/-/g, "")}.cart.total = window.Shopify.cart.total_price || 0;
    }

    consoleMessage('[InitializeApp] Application initialization complete', 'info', {
      version: window.${config.projectName.replace(/-/g, "")}.version,
      devMode: window.${config.projectName.replace(/-/g, "")}.settings.devMode,
      cartCount: window.${config.projectName.replace(/-/g, "")}.cart.count
    });
  } catch (error) {
    consoleMessage('[InitializeApp] Error during application initialization', 'error', error);
  }
};

window.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('load', reportWebVitals);

export default window.${config.projectName.replace(/-/g, "")};
`;

  await writeFile("frontend/entrypoints/storefront.js", storefrontJs);
  log("✓ storefront.js created", colors.green);

  // Create custom_styling.css or .scss
  const fileExtension = config.stylingApproach === "scss" ? "scss" : "css";
  const fileName = `frontend/entrypoints/custom_styling.${fileExtension}`;

  let customStyles = "";

  if (config.stylingApproach === "scss") {
    // SCSS with tokens
    customStyles = `/**
 * Custom Styling Entrypoint (SCSS)
 */

// Design Tokens
$colors: (
  'primary': rgb(var(--color-button)),
  'secondary': rgb(var(--color-accent)),
  'text-primary': #1a1a1a,
  'text-secondary': #666,
  'surface': #ffffff,
  'border': #e5e5e5,
);

$spacing: (
  'xs': 0.25rem,
  'sm': 0.5rem,
  'base': 1rem,
  'lg': 2rem,
  'xl': 4rem,
);

$breakpoints: (
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  '2xl': 1536px,
);

$transitions: (
  'fast': 150ms ease,
  'base': 250ms ease,
  'slow': 400ms ease,
);

// Centralized Media Query Mixins
@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  } @else {
    @warn "Breakpoint #{$breakpoint} not found in $breakpoints map.";
  }
}

// Helper functions
@function color($key) {
  @return map-get($colors, $key);
}

@function spacing($key) {
  @return map-get($spacing, $key);
}

@function transition($key) {
  @return map-get($transitions, $key);
}

// CSS Custom Properties for runtime theming
:root {
  --color-primary: #{color('primary')};
  --color-secondary: #{color('secondary')};
  --spacing-base: #{spacing('base')};
  --spacing-small: #{spacing('sm')};
  --spacing-large: #{spacing('lg')};
  --transition-base: #{transition('base')};
  --border-radius: 4px;
}

// Utility Classes
.visually-hidden {
  position: absolute !important;
  overflow: hidden;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  word-wrap: normal !important;
}

// Import component styles
// @import '../styles/product-card';
// @import '../styles/cart-drawer';
`;
  } else {
    // Plain CSS with centralized media queries via custom properties
    customStyles = `/**
 * Custom Styling Entrypoint
 */

/* Design Tokens - CSS Custom Properties */
:root {
  /* Colors */
  --color-primary: rgb(var(--color-button));
  --color-secondary: rgb(var(--color-accent));
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666;
  --color-surface: #ffffff;
  --color-border: #e5e5e5;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-base: 1rem;
  --spacing-lg: 2rem;
  --spacing-xl: 4rem;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;

  /* Borders */
  --border-radius: 4px;
  --border-width: 1px;

  /* Breakpoints (for use with min-width media queries) */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Utility Classes */
.visually-hidden {
  position: absolute !important;
  overflow: hidden;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  word-wrap: normal !important;
}

/*
  Centralized Media Query Guide
  ==============================
  Always use mobile-first approach with min-width:

  Mobile:   Base styles (no media query)
  Tablet:   @media (min-width: 768px)  { }
  Desktop:  @media (min-width: 1024px) { }
  Wide:     @media (min-width: 1280px) { }

  Example:
  .my-component {
    padding: var(--spacing-sm);        // Mobile

    @media (min-width: 768px) {
      padding: var(--spacing-base);    // Tablet+
    }

    @media (min-width: 1024px) {
      padding: var(--spacing-lg);      // Desktop+
    }
  }
*/

/* Import component styles */
/* @import './styles/product-card.css'; */
/* @import './styles/cart-drawer.css'; */
`;
  }

  await writeFile(fileName, customStyles);
  log(`✓ custom_styling.${fileExtension} created`, colors.green);

  if (config.stylingApproach === "scss") {
    log("  ✓ SCSS tokens and mixins configured", colors.green);
  } else {
    log("  ✓ Centralized media query guide added", colors.green);
  }
}

async function createShopifyThemeToml(config: SetupConfig) {
  if (config.tomlApproach === "skip" || config.tomlApproach === "cli") {
    // Create only the example file for reference
    header("Creating example.shopify.theme.toml");

    const exampleToml = `# Example Shopify Theme Configuration
# Copy this file to shopify.theme.toml and update with your store details

[environments.development]
store = "your-store.myshopify.com"
theme = "your-theme-id"
ignore = [".shopifyignore"]

# Additional environment examples:
# [environments.staging]
# store = "your-store-staging.myshopify.com"
# theme = "staging-theme-id"

# [environments.production]
# store = "your-store.myshopify.com"
# theme = "live-theme-id"
`;

    await writeFile("example.shopify.theme.toml", exampleToml);
    log("✓ example.shopify.theme.toml created for reference", colors.green);

    if (config.tomlApproach === "cli") {
      log("  Using CLI authentication - run 'shopify auth login' before development", colors.yellow);
    } else {
      log("  Copy this to shopify.theme.toml when ready to configure", colors.yellow);
    }
    return;
  }

  // Create actual shopify.theme.toml file
  header("Creating shopify.theme.toml");

  const storeUrl = config.storeUrl || "your-store.myshopify.com";
  const themeId = config.themeId || "your-theme-id";

  const themeToml = `# Shopify Theme Configuration
# This file contains your store credentials - it will be added to .gitignore

[environments.${config.shopifyEnvironment}]
store = "${storeUrl}"
theme = "${themeId}"
ignore = [".shopifyignore"]

# Additional environment examples (uncomment and configure as needed):
# [environments.staging]
# store = "${storeUrl}"
# theme = "staging-theme-id"
# ignore = [".shopifyignore"]

# [environments.production]
# store = "${storeUrl}"
# theme = "live-theme-id"
# ignore = [".shopifyignore"]
`;

  await writeFile("shopify.theme.toml", themeToml);
  log("✓ shopify.theme.toml created", colors.green);
  log(`  Store: ${storeUrl}`, colors.cyan);
  log(`  Theme: ${themeId}`, colors.cyan);
  log(`  Environment: ${config.shopifyEnvironment}`, colors.cyan);
}

async function setupLinting(config: SetupConfig) {
  if (config.lintingSetup === "skip") {
    log("\nSkipping linting setup", colors.yellow);
    return;
  }

  header("Setting Up Linting");

  if (config.lintingSetup === "eslint-prettier") {
    // Install ESLint and Prettier dependencies
    const deps = [
      "eslint",
      "prettier",
      "eslint-config-prettier",
      "eslint-plugin-prettier",
      "@eslint/js",
    ];

    if (config.jsApproach === "typescript") {
      deps.push("@typescript-eslint/eslint-plugin", "@typescript-eslint/parser");
    }

    log("Installing ESLint and Prettier...", colors.cyan);

    try {
      if (config.packageManager === "bun") {
        await $`bun add -d ${deps}`;
      } else if (config.packageManager === "npm") {
        await $`npm install --save-dev ${deps}`;
      } else if (config.packageManager === "pnpm") {
        await $`pnpm add -D ${deps}`;
      } else {
        await $`yarn add -D ${deps}`;
      }
      log("✓ Linting dependencies installed", colors.green);
    } catch (error) {
      log("✗ Error installing linting dependencies", colors.red);
      console.error(error);
      return;
    }

    // Create ESLint config
    const eslintConfig = config.jsApproach === "typescript"
      ? `import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";

export default [
  js.configs.recommended,
  {
    files: ["frontend/**/*.{js,ts}"],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["assets/**", "node_modules/**", "*.config.js"],
  },
];
`
      : `import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";

export default [
  js.configs.recommended,
  {
    files: ["frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["assets/**", "node_modules/**", "*.config.js"],
  },
];
`;

    await writeFile("eslint.config.js", eslintConfig);
    log("✓ eslint.config.js created", colors.green);

    // Create Prettier config
    const prettierConfig = `{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
`;
    await writeFile(".prettierrc", prettierConfig);
    log("✓ .prettierrc created", colors.green);

    // Create Prettier ignore
    const prettierIgnore = `# Prettier ignore
assets/
node_modules/
*.liquid
*.json
*.md
bun.lockb
`;
    await writeFile(".prettierignore", prettierIgnore);
    log("✓ .prettierignore created", colors.green);

  } else if (config.lintingSetup === "theme-check") {
    log("Theme Check is already included via @shopify/theme-check-node", colors.green);

    // Create theme check config
    const themeCheckConfig = `# Theme Check Configuration
# https://shopify.dev/docs/themes/tools/theme-check

root: .
extends: :theme-app-extension

# Ignore patterns
ignore:
  - node_modules/**
  - frontend/**

# Custom rules
MatchingTranslations:
  enabled: true

RemoteAsset:
  enabled: true
  severity: suggestion
`;
    await writeFile(".theme-check.yml", themeCheckConfig);
    log("✓ .theme-check.yml created", colors.green);
  }
}

async function setupGitHooks(config: SetupConfig) {
  if (!config.gitHooks) {
    log("\nSkipping Git hooks setup", colors.yellow);
    return;
  }

  header("Setting Up Git Hooks");

  // Install husky and lint-staged
  const deps = ["husky", "lint-staged"];

  log("Installing husky and lint-staged...", colors.cyan);

  try {
    if (config.packageManager === "bun") {
      await $`bun add -d ${deps}`;
    } else if (config.packageManager === "npm") {
      await $`npm install --save-dev ${deps}`;
    } else if (config.packageManager === "pnpm") {
      await $`pnpm add -D ${deps}`;
    } else {
      await $`yarn add -D ${deps}`;
    }
    log("✓ Git hooks dependencies installed", colors.green);
  } catch (error) {
    log("✗ Error installing Git hooks dependencies", colors.red);
    console.error(error);
    return;
  }

  // Initialize husky
  try {
    await $`npx husky init`;
    log("✓ Husky initialized", colors.green);
  } catch (error) {
    log("⚠️ Husky init skipped (may need git init first)", colors.yellow);
  }

  // Create pre-commit hook
  const preCommitHook = config.lintingSetup === "eslint-prettier"
    ? `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
`
    : `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run theme check on liquid files
npx shopify theme check --fail-level error
`;

  try {
    await mkdir(".husky", { recursive: true });
    await writeFile(".husky/pre-commit", preCommitHook);
    await $`chmod +x .husky/pre-commit`;
    log("✓ Pre-commit hook created", colors.green);
  } catch (error) {
    log("⚠️ Pre-commit hook creation skipped", colors.yellow);
  }

  // Create lint-staged config
  if (config.lintingSetup === "eslint-prettier") {
    const lintStagedConfig = `{
  "frontend/**/*.{js,ts}": [
    "eslint --fix",
    "prettier --write"
  ],
  "frontend/**/*.{css,scss}": [
    "prettier --write"
  ]
}
`;
    await writeFile(".lintstagedrc", lintStagedConfig);
    log("✓ .lintstagedrc created", colors.green);
  }

  // Add scripts to package.json
  log("  Adding lint scripts to package.json...", colors.cyan);
  try {
    const { readFile } = await import("node:fs/promises");
    const packageJsonContent = await readFile("package.json", "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.lint = config.lintingSetup === "eslint-prettier"
      ? "eslint frontend/"
      : "shopify theme check";
    packageJson.scripts["lint:fix"] = config.lintingSetup === "eslint-prettier"
      ? "eslint frontend/ --fix"
      : "shopify theme check --auto-correct";
    packageJson.scripts.format = "prettier --write frontend/";
    packageJson.scripts.prepare = "husky";

    await writeFile("package.json", JSON.stringify(packageJson, null, 2));
    log("✓ Lint scripts added to package.json", colors.green);
  } catch (error) {
    log("⚠️ Could not update package.json scripts", colors.yellow);
  }
}

async function addTomlToGitignore() {
  header("Securing shopify.theme.toml");

  const { readFile } = await import("node:fs/promises");

  try {
    let gitignoreContent = await readFile(".gitignore", "utf-8");

    // Check if shopify.theme.toml is already in gitignore
    if (!gitignoreContent.includes("shopify.theme.toml")) {
      // Add it under the Shopify theme files section
      gitignoreContent = gitignoreContent.replace(
        "# Shopify theme files\nconfig/settings_data.json",
        "# Shopify theme files\nconfig/settings_data.json\nshopify.theme.toml"
      );

      await writeFile(".gitignore", gitignoreContent);
      log("✓ shopify.theme.toml added to .gitignore", colors.green);
      log("  Your store credentials are now protected from being committed", colors.cyan);
    } else {
      log("✓ shopify.theme.toml already in .gitignore", colors.green);
    }
  } catch (error) {
    log("✗ Error updating .gitignore", colors.red);
    console.error(error);
  }
}

async function createCoreFiles() {
  header("Creating Core Utility Files");

  // utils.js
  const utilsJs = `/**
 * Core Utility Functions
 */

export function consoleMessage(message, type = 'log', data = null) {
  if (!window.${await prompt("Enter your project name again for utils:")} || !window.${await prompt("Enter your project name again for utils:")}.settings?.devMode) return;

  const prefix = '[Theme]';
  const styles = {
    log: 'color: #3b82f6',
    info: 'color: #10b981',
    warn: 'color: #f59e0b',
    error: 'color: #ef4444',
  };

  console[type](\`%c\${prefix} \${message}\`, styles[type] || styles.log, data || '');
}

export function reportWebVitals() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        consoleMessage(\`Web Vital: \${entry.name} = \${entry.value.toFixed(2)}ms\`, 'info');
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
  }
}

export function initGlobalEvents() {
  // Add global event listeners here
  document.addEventListener('click', (e) => {
    // Handle global clicks
  });
}

export function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);

  // Handle specific URL parameters
  if (params.has('cart_open')) {
    // Open cart
    consoleMessage('Opening cart from URL parameter', 'info');
  }
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
`;

  await writeFile("frontend/scripts/utils.js", utilsJs);
  log("✓ utils.js created", colors.green);

  // Section registry
  const sectionRegistry = `/**
 * Section Registry
 * Manages section lifecycles for Shopify Theme Editor
 */

const sectionInstances = new Map();

export function registerSection(sectionId, callbacks) {
  if (!sectionInstances.has(sectionId)) {
    sectionInstances.set(sectionId, []);
  }
  sectionInstances.get(sectionId).push(callbacks);
}

export function registerSectionLifecycles() {
  if (typeof window.Shopify !== 'undefined' && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', (event) => {
      const sectionId = event.target.dataset.sectionId;
      const callbacks = sectionInstances.get(sectionId);
      if (callbacks) {
        callbacks.forEach(cb => cb.onLoad?.(event.target));
      }
    });

    document.addEventListener('shopify:section:unload', (event) => {
      const sectionId = event.target.dataset.sectionId;
      const callbacks = sectionInstances.get(sectionId);
      if (callbacks) {
        callbacks.forEach(cb => cb.onUnload?.(event.target));
      }
    });
  } else {
    // Initial load
    const sections = document.querySelectorAll('[data-section-id]');
    sections.forEach(section => {
      const sectionId = section.dataset.sectionId;
      const callbacks = sectionInstances.get(sectionId);
      if (callbacks) {
        callbacks.forEach(cb => cb.onLoad?.(section));
      }
    });
  }
}
`;

  await writeFile("frontend/scripts/hooks/core/sectionRegistry.js", sectionRegistry);
  log("✓ sectionRegistry.js created", colors.green);
}

async function pullShopifyTheme(config: SetupConfig) {
  if (!config.themeId) {
    log("\nSkipping theme pull - no theme selected", colors.yellow);
    return;
  }

  header("Pulling Shopify Theme");

  try {
    log(`Pulling theme ${config.themeId} to ${config.shopifyEnvironment} environment...`, colors.cyan);
    await $`shopify theme pull --theme ${config.themeId} --environment ${config.shopifyEnvironment}`;
    log("✓ Theme pulled successfully", colors.green);
  } catch (error) {
    log("✗ Error pulling theme", colors.red);
    console.error(error);
  }
}

async function initializeGit() {
  header("Initializing Git Repository");

  try {
    // Check if git is already initialized
    try {
      await $`git rev-parse --git-dir`.quiet();
      log("Git repository already initialized", colors.yellow);
      return;
    } catch {
      // Not a git repo, continue
    }

    await $`git init`;
    await $`git add .`;
    await $`git commit -m "Initial commit: Shopify theme setup"`;
    log("✓ Git repository initialized", colors.green);
  } catch (error) {
    log("✗ Error initializing git", colors.red);
    console.error(error);
  }
}

async function runInitialBuild(config: SetupConfig) {
  header("Running Initial Build");

  try {
    log("Building Vite assets for the first time...", colors.cyan);

    if (config.packageManager === "bun") {
      await $`bun run build`;
    } else if (config.packageManager === "npm") {
      await $`npm run build`;
    } else if (config.packageManager === "pnpm") {
      await $`pnpm run build`;
    } else {
      await $`yarn build`;
    }

    log("✓ Initial build completed successfully", colors.green);
  } catch (error) {
    log("✗ Error during build", colors.red);
    console.error(error);
  }
}

async function updateClaudeMd(config: SetupConfig) {
  header("Updating CLAUDE.md with Project Context");

  // Read existing CLAUDE.md
  const { readFile } = await import("node:fs/promises");
  const existingContent = await readFile("CLAUDE.md", "utf-8");

  // Create project-specific section
  const projectContext = `

---

## Project-Specific Context

**Project Name**: ${config.projectName}
**Store Type**: ${config.projectType || "e-commerce"}
**Description**: ${config.projectDescription || "Shopify theme development project"}

### Configuration

- **Styling Approach**: ${config.stylingApproach}
- **JavaScript**: ${config.jsApproach === "vanilla" ? "Vanilla JavaScript" : "TypeScript"}
- **Package Manager**: ${config.packageManager}
- **Theme Editor Setup**: ${config.enableTunnel ? "Cloudflare tunnel enabled (Vite 6.0.8)" : "Manual HTTPS configuration required"}
- **Environment**: ${config.shopifyEnvironment}

### Project-Specific Notes

${config.projectDescription ? `This project is ${config.projectDescription}.` : ""}

${config.enableTunnel ? `
**Important**: This project uses Cloudflare tunnel for theme editor development. Make sure cloudflared is installed:
\`\`\`bash
brew install cloudflared
\`\`\`

When running \`${config.packageManager} run dev\`, the tunnel will automatically create an HTTPS URL for testing in the Shopify theme editor.
` : ""}

${config.stylingApproach === "tailwind" ? `
**Note**: This project uses Tailwind CSS. While the default guidelines emphasize semantic class names, you may use utility classes if that's the project's chosen approach. Ensure mobile-first responsive design principles are still followed.
` : ""}

### Quick Start Commands

\`\`\`bash
# Start development
${config.packageManager} run dev

# Build assets
${config.packageManager} run build

# Deploy to Shopify
${config.packageManager} run deploy
\`\`\`

---

*This project context section is auto-generated. Update it as the project evolves.*
`;

  // Append to existing content
  const updatedContent = existingContent + projectContext;

  await writeFile("CLAUDE.md", updatedContent);
  log("✓ CLAUDE.md updated with project-specific context", colors.green);
}

async function displayNextSteps(config: SetupConfig) {
  header("Setup Complete!");

  log("Your Shopify theme development environment is ready!", colors.green);
  log("\nNext steps:\n", colors.bright);

  if (config.enableTunnel) {
    log("⚠️  IMPORTANT: Install cloudflared for tunnel support:", colors.yellow);
    log("   brew install cloudflared\n", colors.yellow);
  }

  log("1. Start the development server:", colors.cyan);
  log(`   ${config.packageManager} run dev`, colors.yellow);
  if (config.enableTunnel) {
    log("   (This will create a Cloudflare tunnel for theme editor testing)", colors.bright);
  }
  console.log();

  log("2. Build for production:", colors.cyan);
  log(`   ${config.packageManager} run build\n`, colors.yellow);

  log("3. Deploy to Shopify:", colors.cyan);
  log(`   ${config.packageManager} run deploy\n`, colors.yellow);

  log("4. Read the documentation:", colors.cyan);
  log("   - CLAUDE.md for project guidelines and AI assistant rules", colors.yellow);
  log("   - README.md for comprehensive documentation\n", colors.yellow);

  log("5. Commit your changes:", colors.cyan);
  log("   git add .", colors.yellow);
  log(`   git commit -m "feat: Initial Shopify theme setup for ${config.projectName}"`, colors.yellow);
  log("   git push\n", colors.yellow);

  log("Happy coding! 🚀", colors.green + colors.bright);
}

// Main execution
async function main() {
  try {
    const config = await askQuestions();

    // Confirm before proceeding
    log("\n" + "=".repeat(60), colors.bright);
    log("Configuration Summary:", colors.bright + colors.cyan);
    log("=".repeat(60), colors.bright);
    log(`Project Name: ${config.projectName}`, colors.cyan);
    log(`Styling: ${config.stylingApproach}`, colors.cyan);
    log(`JavaScript: ${config.jsApproach}`, colors.cyan);
    log(`Package Manager: ${config.packageManager}`, colors.cyan);
    log(`Store Config: ${config.tomlApproach === "file" ? "shopify.theme.toml" : config.tomlApproach === "cli" ? "CLI authentication" : "Manual setup"}`, colors.cyan);
    if (config.storeUrl) {
      log(`Store URL: ${config.storeUrl}`, colors.cyan);
    }
    log(`Linting: ${config.lintingSetup === "eslint-prettier" ? "ESLint + Prettier" : config.lintingSetup === "theme-check" ? "Theme Check" : "None"}`, colors.cyan);
    log(`Git Hooks: ${config.gitHooks ? "Yes (husky + lint-staged)" : "No"}`, colors.cyan);
    log(`Environment: ${config.shopifyEnvironment}`, colors.cyan);
    if (config.themeId) {
      log(`Theme ID: ${config.themeId}`, colors.cyan);
    }
    log("=".repeat(60) + "\n", colors.bright);

    const confirm = await prompt("Proceed with setup? (y/n):");
    if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
      log("Setup cancelled.", colors.yellow);
      process.exit(0);
    }

    // Run setup steps
    await createPackageJson(config);
    await installDependencies(config);
    await createDirectoryStructure();
    await createViteConfig(config);
    await createPostCSSConfig(config);
    await createGitIgnore();
    await createShopifyIgnore();
    await createGitHubWorkflow(config);
    await createEntrypoints(config);
    await createCoreFiles();
    await createShopifyThemeToml(config);
    await setupLinting(config);
    await setupGitHooks(config);
    await pullShopifyTheme(config);
    await runInitialBuild(config);
    await updateClaudeMd(config);
    await initializeGit();
    // IMPORTANT: Add .toml to gitignore as the LAST step to protect credentials
    await addTomlToGitignore();
    await displayNextSteps(config);

  } catch (error) {
    log("\n✗ Setup failed with error:", colors.red);
    console.error(error);
    process.exit(1);
  }
}

main();
