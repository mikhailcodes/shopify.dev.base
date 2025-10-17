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
  log("Please answer the following questions:\n", colors.green);

  // Question 1: Project Name
  const projectName = await prompt("What is your project/store name? (e.g., 'my-store'):");

  // Question 2: Styling Approach
  const stylingChoice = await select(
    "\nWhich styling approach will you use?",
    [
      "Plain CSS (Recommended for simplicity)",
      "SCSS/SASS (If you need variables, mixins, nesting)",
      "PostCSS with plugins (For advanced processing)",
      "Tailwind CSS (Utility-first approach)"
    ]
  );
  const stylingMap: SetupConfig["stylingApproach"][] = ["css", "scss", "postcss", "tailwind"];
  const stylingApproach = stylingMap[stylingChoice];

  // Question 3: JavaScript Approach
  const jsChoice = await select(
    "\nWhich JavaScript approach will you use?",
    [
      "Vanilla JavaScript (Recommended for Shopify themes)",
      "TypeScript (For type safety and larger projects)"
    ]
  );
  const jsApproach: SetupConfig["jsApproach"] = jsChoice === 0 ? "vanilla" : "typescript";

  // Question 4: Package Manager
  const pmChoice = await select(
    "\nWhich package manager will you use?",
    [
      "Bun (Recommended - fast, modern)",
      "npm (Standard, widely supported)",
      "pnpm (Efficient disk usage)",
      "yarn (Stable alternative)"
    ]
  );
  const pmMap: SetupConfig["packageManager"][] = ["bun", "npm", "pnpm", "yarn"];
  const packageManager = pmMap[pmChoice];

  // Question 5: Shopify Environment
  log("\nFetching available Shopify themes...", colors.cyan);
  const themes = await getShopifyThemes();

  let shopifyEnvironment = "development";
  let themeId: string | null = null;

  if (themes.length > 0) {
    log("\nAvailable themes:", colors.green);
    const themeOptions = themes.map(t => `${t.name} (${t.role}) - ID: ${t.id}`);
    themeOptions.push("Skip - I'll configure this later");

    const themeChoice = await select(
      "\nWhich theme would you like to use as a base?",
      themeOptions
    );

    if (themeChoice < themes.length) {
      themeId = themes[themeChoice].id;
      const envName = await prompt("\nWhat would you like to name this environment? (e.g., 'development', 'staging'):");
      shopifyEnvironment = envName || "development";
    }
  } else {
    log("\nNo themes found or Shopify CLI not authenticated.", colors.yellow);
    log("You can pull a theme later using 'shopify theme pull'", colors.yellow);
  }

  return {
    projectName,
    stylingApproach,
    jsApproach,
    packageManager,
    shopifyEnvironment,
    themeId,
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
    "vite",
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
      additionalEntrypoints: [],
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
  server: {
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
shopify.theme.toml

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

  // Create custom_styling.css
  const customCss = `/**
 * Custom Styling Entrypoint
 */

:root {
  --color-primary: rgb(var(--color-button));
  --color-secondary: rgb(var(--color-accent));
  --spacing-base: 1rem;
  --spacing-small: 0.5rem;
  --spacing-large: 2rem;
  --transition-base: 200ms ease;
  --border-radius: 4px;
}

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
`;

  await writeFile("frontend/entrypoints/custom_styling.css", customCss);
  log("✓ custom_styling.css created", colors.green);
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

async function displayNextSteps(config: SetupConfig) {
  header("Setup Complete!");

  log("Your Shopify theme development environment is ready!", colors.green);
  log("\nNext steps:\n", colors.bright);

  log("1. Start the development server:", colors.cyan);
  log(`   ${config.packageManager} run dev\n`, colors.yellow);

  log("2. Build for production:", colors.cyan);
  log(`   ${config.packageManager} run build\n`, colors.yellow);

  log("3. Deploy to Shopify:", colors.cyan);
  log(`   ${config.packageManager} run deploy\n`, colors.yellow);

  log("4. Read the documentation:", colors.cyan);
  log("   - CLAUDE.md for project guidelines", colors.yellow);
  log("   - project_setup.md for detailed setup info\n", colors.yellow);

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
    await pullShopifyTheme(config);
    await runInitialBuild(config);
    await initializeGit();
    await displayNextSteps(config);

  } catch (error) {
    log("\n✗ Setup failed with error:", colors.red);
    console.error(error);
    process.exit(1);
  }
}

main();
