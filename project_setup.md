# Shopify Theme Development Environment Setup Guide

This document provides step-by-step instructions for setting up a modern Shopify theme development environment with Vite, Bun, and proper CI/CD workflows. Use this guide when starting development on a new store to ensure consistency across projects.

## 🚀 Quick Start (Recommended)

**Run the automated setup script:**

```bash
bun setup.ts
```

The setup script will:
- Ask you configuration questions interactively
- Pull your chosen Shopify theme as a base
- Install all dependencies
- Create the complete project structure
- Generate all configuration files
- Run the initial build
- Initialize git repository

**That's it!** The script handles everything for you. Continue reading only if you want to understand the details or set up manually.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Configuration Questions](#project-configuration-questions)
3. [Initial Setup](#initial-setup)
4. [Package Configuration](#package-configuration)
5. [Vite Configuration](#vite-configuration)
6. [Project Structure](#project-structure)
7. [Git Configuration](#git-configuration)
8. [GitHub Actions CI/CD](#github-actions-cicd)
9. [Development Workflow](#development-workflow)
10. [Code Style Guidelines](#code-style-guidelines)
11. [Documentation](#documentation)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Bun** (v1.3.0 or higher) - [Install Bun](https://bun.sh)
- **Shopify CLI** - [Install Shopify CLI](https://shopify.dev/docs/themes/tools/cli/install)
- **Git** - For version control
- **Node.js** (optional, but recommended for compatibility)

Verify installations:
```bash
bun --version
shopify version
git --version
```

---

## Project Configuration Questions

**IMPORTANT FOR AI CODING AGENTS:** When setting up a new project, you MUST run the setup script (`bun setup.ts`) instead of manually creating files. The script will ask the user these questions interactively.

The setup script will ask the following questions:

### 1. Project/Store Name
**Question:** What is your project/store name?
- Used to name the project directory, package.json, and global JavaScript object
- Example: `my-store`, `acme-shop`, `boutique`

### 2. Styling Approach
**Question:** Which styling approach will you use?
- **Option A:** Plain CSS (Recommended for simplicity)
- **Option B:** SCSS/SASS (If you need variables, mixins, nesting)
- **Option C:** PostCSS with plugins (For advanced processing)
- **Option D:** Tailwind CSS (Utility-first approach)

**Default:** Plain CSS with CSS custom properties for semantic class names and maintainability.

### 3. JavaScript Approach
**Question:** Which JavaScript approach will you use?
- **Option A:** Vanilla JavaScript (Recommended for Shopify themes)
- **Option B:** TypeScript (For type safety and larger projects)

**Default:** Vanilla JavaScript for simplicity and theme compatibility.

### 4. Package Manager
**Question:** Which package manager will you use?
- **Option A:** Bun (Recommended - fast, modern)
- **Option B:** npm (Standard, widely supported)
- **Option C:** pnpm (Efficient disk usage)
- **Option D:** yarn (Stable alternative)

**Default:** Bun for superior performance.

### 5. Shopify Theme Configuration (TOML)
**Question:** How would you like to configure Shopify store access?
- **Option A:** Create shopify.theme.toml file (Recommended - stores environment configs)
- **Option B:** Use Shopify CLI login only (No .toml file, authenticate via CLI each time)
- **Option C:** Skip for now (Configure manually later)

**Default:** Create shopify.theme.toml file.

The `shopify.theme.toml` file stores your store URL and theme IDs for different environments. This file will be added to `.gitignore` at the **end of setup** to protect your credentials while still allowing you to commit it to private repositories if desired.

If you choose the .toml approach, you'll be asked for your store URL (e.g., `your-store.myshopify.com`).

If you choose CLI-only access, you'll need to run `shopify auth login` before each development session.

### 6. Shopify Environment & Theme
**Question:** Which Shopify theme would you like to use as a base?
- The script will automatically fetch available themes from your Shopify store
- You can select any theme (development, live, etc.)
- You'll be asked to name the environment (e.g., "development", "staging")
- You can skip this step and configure it later

**Note:** Make sure you're authenticated with Shopify CLI before running the setup script.

---

## Initial Setup

### Automated Setup (Recommended)

Simply run the setup script:

```bash
bun setup.ts
```

The script will handle all the steps below automatically.

---

### Manual Setup (If you prefer to do it yourself)

### Step 1: Navigate to Your Shopify Theme Directory

```bash
cd /path/to/your/shopify-theme
```

Ensure you're in the root directory where `layout/`, `sections/`, `templates/`, etc. exist.

### Step 2: Initialize Git Repository (if not already)

```bash
git init
git add .
git commit -m "Initial commit: Base Shopify theme"
```

### Step 3: Initialize Bun Package Manager

```bash
bun init -y
```

This creates a `package.json` file in your project root.

---

## Package Configuration

### Step 1: Install Dependencies

Install the required development dependencies:

```bash
bun add -d vite vite-plugin-shopify postcss autoprefixer npm-run-all @shopify/theme-check-node
```

**Optional:** If using SCSS:
```bash
bun add -d sass
```

**Optional:** If using Tailwind CSS:
```bash
bun add -d tailwindcss
```

### Step 2: Configure package.json

Edit your `package.json` to match this structure:

```json
{
  "name": "your-store-shopify",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "bun@1.3.0",
  "scripts": {
    "dev": "run-p -sr \"shopify:dev -- {@}\" \"vite:dev\" --",
    "dev:staging": "run-p -sr \"shopify:dev:staging -- {@}\" \"vite:dev\" --",
    "dev:production": "run-p -sr \"shopify:dev:production -- {@}\" \"vite:dev\" --",
    "build": "bun vite:build",
    "preview": "vite preview",
    "deploy": "run-s \"vite:build\" \"shopify:push -- {@}\" --",
    "deploy:staging": "run-s \"vite:build\" \"shopify:push:staging -- {@}\" --",
    "deploy:production": "run-s \"vite:build\" \"shopify:push:production -- {@}\" --",
    "shopify:dev": "shopify theme dev --environment development",
    "shopify:dev:staging": "shopify theme dev --environment staging",
    "shopify:dev:production": "shopify theme dev --environment production",
    "shopify:push": "shopify theme push --environment development",
    "shopify:push:staging": "shopify theme push --environment staging",
    "shopify:push:production": "shopify theme push --environment production",
    "vite:dev": "vite",
    "vite:build": "vite build",
    "clean": "rm -rf dist assets/storefront.js assets/custom_styling.css"
  },
  "devDependencies": {
    "@shopify/theme-check-node": "^2.0.0",
    "autoprefixer": "^10.4.20",
    "npm-run-all": "^4.1.5",
    "postcss": "^8.4.47",
    "sass": "^1.80.7",
    "vite": "^5.4.10",
    "vite-plugin-shopify": "^3.1.1"
  }
}
```

**Key Points:**
- `"type": "module"` enables ES modules
- `"packageManager": "bun@1.3.0"` locks Bun version
- Scripts support multiple environments (development, staging, production)
- `npm-run-all` enables parallel script execution (`run-p`) and sequential (`run-s`)

---

## Vite Configuration

### Step 1: Create vite.config.js

Create a `vite.config.js` file in your project root:

```javascript
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import shopify from 'vite-plugin-shopify';

export default defineConfig(() => ({
  plugins: [
    shopify({
      // Theme root directory
      themeRoot: './',
      // Source code directory
      sourceCodeDir: 'frontend',
      // Entrypoints directory - vite-plugin-shopify will auto-discover files here
      entrypointsDir: 'frontend/entrypoints',
      // Additional entrypoints (optional)
      additionalEntrypoints: [],
    }),
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./frontend', import.meta.url)),
    },
  },
  build: {
    // IMPORTANT: Do not clear the assets folder - preserves existing Shopify theme assets
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      output: {
        // Clean output filenames without hashes for easier debugging
        entryFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
      }
    }
  },
  server: {
    // CORS headers for development
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
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@use "sass:math"; @use "sass:map";',
        api: 'modern-compiler',
        quietDeps: true,
        logger: {
          warn: () => { }
        }
      }
    }
  }
}));
```

**Key Configuration Points:**
- `sourceCodeDir: 'frontend'` - All custom code goes here
- `emptyOutDir: false` - Preserves existing Shopify theme assets
- `alias: '~'` - Import shortcut (e.g., `import '~/scripts/utils'`)
- CORS headers allow local development with Shopify CLI

### Step 2: Create postcss.config.js

Create a `postcss.config.js` file in your project root:

```javascript
export default {
  plugins: {
    autoprefixer: {},
  },
}
```

**Optional:** If using Tailwind CSS, add:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## Project Structure

### Step 1: Create Frontend Directory Structure

Create the following directory structure in your project root:

```bash
mkdir -p frontend/entrypoints
mkdir -p frontend/scripts/components
mkdir -p frontend/scripts/sections
mkdir -p frontend/scripts/hooks
mkdir -p frontend/scripts/hooks/core
mkdir -p frontend/styles
mkdir -p frontend/images
mkdir -p frontend/fonts
```

### Step 2: Create Core Files

#### 1. Create `frontend/entrypoints/storefront.js`

This is your main JavaScript entry point:

```javascript
/**
 * Storefront JavaScript Entrypoint
 *
 * This is the main JavaScript entry point for the theme.
 * - Initializes global window.cinereo object (or use your store name)
 * - Imports and initializes all utilities and sections
 * - Sets up performance monitoring
 */

import 'vite/modulepreload-polyfill';
import { consoleMessage, reportWebVitals, initGlobalEvents, handleUrlParams } from '~/scripts/utils';
import { registerSectionLifecycles } from '~/scripts/hooks/core/sectionRegistry';

/**
 * Initialize global object
 * Replace 'cinereo' with your store name
 */
window.yourStoreName = window.yourStoreName || {};

// Settings
window.yourStoreName.settings = {
  devMode: true, // Enable development mode for console logging
};

// Theme configuration (will be populated from Liquid)
window.yourStoreName.theme = {
  shopName: window.Shopify?.shop || 'your-store',
  currency: window.Shopify?.currency?.active || 'USD',
  currencySymbol: '$',
  moneyFormat: window.theme?.moneyFormat || '${{amount}}',
};

// Cart state
window.yourStoreName.cart = {
  count: window.Shopify?.cart?.item_count || 0,
  total: window.Shopify?.cart?.total_price || 0,
};

// Event bus for custom events
window.yourStoreName.events = window.yourStoreName.events || new EventTarget();

// Utility functions reference
window.yourStoreName.utils = {
  consoleMessage,
  handleUrlParams,
};

// Version
window.yourStoreName.version = '1.0.0';

consoleMessage('Store object initialized', 'info');

/**
 * Initialize Application
 */
const initializeApp = () => {
  try {
    consoleMessage('[InitializeApp] Starting application initialization', 'info');

    // Initialize global event listeners
    initGlobalEvents();
    consoleMessage('[InitializeApp] Global events initialized', 'info');

    // Register section lifecycles - handles both initial load and theme editor events
    registerSectionLifecycles();
    consoleMessage('[InitializeApp] Section lifecycles registered', 'info');

    // Handle URL parameters
    handleUrlParams();

    // Update cart state from Shopify object
    if (window.Shopify?.cart) {
      window.yourStoreName.cart.count = window.Shopify.cart.item_count || 0;
      window.yourStoreName.cart.total = window.Shopify.cart.total_price || 0;
    }

    consoleMessage('[InitializeApp] Application initialization complete', 'info', {
      version: window.yourStoreName.version,
      devMode: window.yourStoreName.settings.devMode,
      cartCount: window.yourStoreName.cart.count
    });
  } catch (error) {
    consoleMessage('[InitializeApp] Error during application initialization', 'error', error);
  }
};

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', initializeApp);

// Report web vitals when page is fully loaded
window.addEventListener('load', reportWebVitals);

// Export for use in other modules
export default window.yourStoreName;
```

#### 2. Create `frontend/entrypoints/custom_styling.css`

This is your main CSS entry point:

```css
/**
 * Custom Styling Entrypoint
 *
 * This file imports all custom styles for the theme.
 * Vite will process and bundle all imports into a single CSS file.
 */

/* ===========================
   CSS Custom Properties (Variables)
   =========================== */

:root {
  /* Add your custom CSS variables here */
  --color-primary: rgb(var(--color-button));
  --color-secondary: rgb(var(--color-accent));
  --spacing-base: 1rem;
  --spacing-small: 0.5rem;
  --spacing-large: 2rem;
  --transition-base: 200ms ease;
  --border-radius: 4px;
}

/* ===========================
   Component Imports
   =========================== */

/* Import your custom component styles here */
/* Example: @import '../styles/cart-indicators.css'; */

/* ===========================
   Utility Classes
   =========================== */

/* Add utility classes here if needed */
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
```

#### 3. Copy Core Utility Files

You need to create several utility files. Copy the following from your existing CLAUDE.md context:

**`frontend/scripts/utils.js`** - Contains helper functions like `consoleMessage`, `reportWebVitals`, `initGlobalEvents`, `handleUrlParams`

**`frontend/scripts/hooks/helpers.js`** - Contains helper functions like `formatPrice`, `getUrlParam`, `removeUrlParam`

**`frontend/scripts/hooks/useDebounce.js`** - Debounce utility hook

**`frontend/scripts/hooks/useSectionLifecycle.js`** - Section lifecycle management hook

**`frontend/scripts/hooks/core/sectionRegistry.js`** - Section registry for managing section lifecycles

**`frontend/scripts/components/baseComponent.js`** - Base component class for extending

**Note:** These files contain the core architecture for the theme. Request your coding agent to implement these files based on the patterns shown in the CLAUDE.md document.

### Step 3: Create .gitkeep Files

Create `.gitkeep` files to preserve empty directories:

```bash
touch frontend/scripts/sections/.gitkeep
touch frontend/styles/.gitkeep
touch frontend/images/.gitkeep
touch frontend/fonts/.gitkeep
```

### Final Directory Structure

Your project should now have this structure:

```
your-shopify-theme/
├── .github/
│   └── workflows/
│       └── build.yml
├── .gitignore
├── .shopifyignore
├── assets/                          # Built assets (auto-generated)
├── config/
├── frontend/                        # Source code (YOU WORK HERE)
│   ├── entrypoints/
│   │   ├── storefront.js           # Main JS entry
│   │   └── custom_styling.css      # Main CSS entry
│   ├── scripts/
│   │   ├── components/             # Reusable components
│   │   │   └── baseComponent.js
│   │   ├── hooks/                  # Shared utilities & hooks
│   │   │   ├── core/
│   │   │   │   └── sectionRegistry.js
│   │   │   ├── helpers.js
│   │   │   ├── useDebounce.js
│   │   │   └── useSectionLifecycle.js
│   │   ├── sections/               # Section-specific code
│   │   │   └── .gitkeep
│   │   └── utils.js
│   ├── styles/                     # Component styles
│   │   └── .gitkeep
│   ├── images/
│   └── fonts/
├── layout/
├── locales/
├── sections/
├── snippets/
│   └── vite-tag.liquid             # Auto-generated by vite-plugin-shopify
├── templates/
├── bun.lockb                       # Bun lock file
├── package.json
├── postcss.config.js
├── vite.config.js
├── CLAUDE.md                       # Project guidelines (create this)
└── project_setup.md                # This file
```

---

## Git Configuration

### Step 1: Create .gitignore

Create a `.gitignore` file in your project root:

```gitignore
# Node.js dependencies
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
# Note: shopify.theme.toml is added automatically at the END of setup
# This allows you to review and commit it to private repos if desired before it's ignored

# Build artifacts
*.log
*.tsbuildinfo

# Optional: Shopify CLI files (uncomment if needed)
# .shopify/

# Lock files (keep only one - Bun in this case)
package-lock.json
yarn.lock
pnpm-lock.yaml
```

### Step 2: Create .shopifyignore

Create a `.shopifyignore` file to exclude source files from theme uploads:

```gitignore
# Shopify Ignore - Files to exclude from theme uploads

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
```

**Key Point:** The `.shopifyignore` ensures that only built assets are uploaded to Shopify, not source code.

---

## GitHub Actions CI/CD

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/build.yml`:

```yaml
name: Build Vite Assets

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

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build Vite assets
        run: bun run build

      - name: Check for uncommitted changes in assets
        run: |
          git diff --exit-code assets/ || \
          (echo "Error: Built assets are out of sync. Run 'bun run build' locally and commit the changes." && exit 1)

      - name: Upload assets artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: built-assets
          path: assets/
          retention-days: 7
```

**What this workflow does:**
1. Runs on push/PR to main or develop branches
2. Sets up Bun
3. Installs dependencies
4. Builds Vite assets
5. Checks if built assets are committed (fails if not)
6. Uploads assets as artifacts

### Step 2: Commit Workflow

```bash
git add .github/workflows/build.yml
git commit -m "Add GitHub Actions workflow for Vite builds"
```

---

## Development Workflow

### Initial Build

Before starting development, build the assets once:

```bash
bun run build
```

This generates:
- `assets/storefront.js`
- `assets/custom_styling.css`
- `snippets/vite-tag.liquid` (auto-generated)

### Start Development Server

In one terminal, start Vite:
```bash
bun run dev
```

This runs both:
- `vite` (development server on http://localhost:5173)
- `shopify theme dev` (Shopify preview)

### Making Changes

1. Edit files in `frontend/` directory
2. Vite hot-reloads changes automatically
3. Changes appear instantly in Shopify preview

### Build for Production

When ready to deploy:

```bash
bun run build
```

**IMPORTANT:** Always commit built assets before pushing:

```bash
git add assets/
git commit -m "Build: Updated assets"
git push
```

### Deploy to Shopify

Deploy to development environment:
```bash
bun run deploy
```

Deploy to staging:
```bash
bun run deploy:staging
```

Deploy to production:
```bash
bun run deploy:production
```

---

## Code Style Guidelines

### CSS Guidelines

#### 1. Use Semantic Class Names

**Always use semantic, descriptive class names that describe purpose, not appearance.**

**❌ WRONG:**
```liquid
<div class="flex justify-center text-blue bg-white p-4">
  <h2 class="text-2xl font-bold">Title</h2>
</div>
```

**✅ CORRECT:**
```liquid
<div class="header-container">
  <h2 class="header-title">Title</h2>
</div>
```

```css
.header-container {
  display: flex;
  justify-content: center;
  background-color: var(--color-background);
  padding: 1rem;
}

.header-title {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-heading);
}
```

#### 2. Mobile-First Approach

Always start with mobile styles, then add responsive breakpoints:

```css
.card {
  padding: 1rem; /* Mobile */
}

@media (min-width: 768px) {
  .card {
    padding: 1.5rem; /* Tablet */
  }
}

@media (min-width: 1024px) {
  .card {
    padding: 2rem; /* Desktop */
  }
}
```

#### 3. Use CSS Custom Properties

Leverage CSS variables for consistency:

```css
:root {
  --color-primary: rgb(var(--color-button));
  --spacing-base: 1rem;
  --transition-base: 200ms ease;
}

.button-primary {
  background-color: var(--color-primary);
  padding: var(--spacing-base);
  transition: background-color var(--transition-base);
}
```

### JavaScript Guidelines

#### 1. Use camelCase for Functions and Variables

**All JavaScript must use camelCase naming:**

```javascript
// ✅ CORRECT
function initProductForm() {}
function handleAddToCart() {}
const cartItems = [];

// ❌ WRONG
function init_product_form() {}
function handle-add-to-cart() {}
```

#### 2. Class-Based Components

Use class-based components for reusable functionality:

```javascript
import { BaseComponent } from '~/scripts/components/baseComponent';

export class ProductCard extends BaseComponent {
  constructor(selector) {
    super(selector);
  }

  setupElement(element) {
    const addToCartBtn = element.querySelector('.add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', this.handleAddToCart.bind(this));
    }
  }

  handleAddToCart(event) {
    event.preventDefault();
    // Add to cart logic
  }

  destroy() {
    // Cleanup event listeners
    super.destroy();
  }
}
```

#### 3. Use useSectionLifecycle for Sections

All section-specific code should use the `useSectionLifecycle` hook:

```javascript
import { useSectionLifecycle } from '~/scripts/hooks/useSectionLifecycle';

useSectionLifecycle('hero-section', {
  onLoad: (root) => {
    console.log('Hero section loaded', root);
    // Initialize component
  },
  onUnload: (root, instance) => {
    console.log('Hero section unloaded');
    // Cleanup
  }
});
```

### Naming Conventions

1. **JavaScript**:
   - Classes: PascalCase (`ProductCard`)
   - Functions: camelCase (`initCart`)
   - Variables: camelCase (`cartItems`)

2. **CSS**: kebab-case for class names
   ```css
   .product-card {}
   .btn-primary {}
   ```

3. **Liquid Files**: kebab-case
   ```
   product-card.liquid
   featured-collection.liquid
   ```

4. **File Names**:
   - JavaScript: camelCase (`productCard.js`)
   - CSS: kebab-case (`product-card.css`)
   - Liquid: kebab-case (`product-card.liquid`)

---

## Documentation

### Create CLAUDE.md

Create a `CLAUDE.md` file in your project root with project-specific guidelines. This file should contain:

1. **Project Overview** - Description of the theme and its purpose
2. **Development Setup** - How to get started
3. **CSS & Styling Guidelines** - Specific rules for this project
4. **JavaScript Architecture** - Patterns and conventions
5. **Shopify Best Practices** - Theme-specific recommendations
6. **File Organization** - Where different types of code belong
7. **Code Quality Standards** - Testing and accessibility requirements

**IMPORTANT:** The `CLAUDE.md` file should be your source of truth for project conventions. Update it as your project evolves.

**Key Instructions to Include in CLAUDE.md:**

- **Always use mobile-first CSS** with media queries for responsive design
- **Use semantic class names** - NO utility-based class names
- **ALL custom CSS and JavaScript MUST be created in `frontend/`**, not directly in `assets/`
- Use `camelCase` for all JavaScript functions and variables
- Import all custom styles in `frontend/entrypoints/custom_styling.css`
- Import all custom scripts in `frontend/entrypoints/storefront.js`

### Create README.md

Create a `README.md` with:

- Project name and description
- Installation instructions
- Development workflow
- Deployment instructions
- Team contact information

---

## Post-Setup Checklist

After completing this setup, verify everything is working:

- [ ] Dependencies installed (`bun install`)
- [ ] Vite config created and validated
- [ ] Frontend directory structure created
- [ ] Core entry files created (storefront.js, custom_styling.css)
- [ ] Git configured (.gitignore, .shopifyignore)
- [ ] GitHub Actions workflow created
- [ ] Initial build successful (`bun run build`)
- [ ] Development server starts (`bun run dev`)
- [ ] Shopify CLI connects to store
- [ ] Hot reload works (edit CSS/JS and see changes)
- [ ] CLAUDE.md created with project guidelines
- [ ] README.md created with project info

---

## Common Issues and Solutions

### Issue: Vite not finding imports

**Solution:** Check your `vite.config.js` alias configuration:
```javascript
alias: {
  '~': fileURLToPath(new URL('./frontend', import.meta.url)),
}
```

### Issue: Assets not updating in Shopify preview

**Solution:**
1. Clear browser cache
2. Restart Vite dev server
3. Check `snippets/vite-tag.liquid` exists and is included in `layout/theme.liquid`

### Issue: Build fails in GitHub Actions

**Solution:**
1. Run `bun run build` locally
2. Commit built assets: `git add assets/ && git commit -m "Build: Update assets"`
3. Push to GitHub

### Issue: CORS errors in development

**Solution:** Ensure `vite.config.js` has CORS headers configured (see configuration above)

---

## AI Agent System

This project includes specialized Claude subagents in `.claude/agents/` that assist with different aspects of development:

### Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `ui-design` | UI/UX design & CSS/SCSS | Designing components, creating styles, responsive layouts, design tokens |
| `tailwind` | Tailwind CSS specialist | Only when Tailwind is chosen; uses @apply, never inline utilities |
| `code-writer` | JavaScript & Liquid implementation | Writing components, sections, features, common snippets |
| `accessibility` | WCAG compliance & a11y | Interactive components, forms, modals, navigation |
| `liquid` | Shopify Liquid templates | Section schemas, metafields, Ajax API, template optimization |
| `performance` | Core Web Vitals & speed | LCP/CLS/INP optimization, lazy loading, image optimization |

### Agent Guidelines

- **UI Design Agent**: Creates mobile-first CSS/SCSS with semantic BEM naming. Generates design tokens from theme settings.
- **Tailwind Agent**: Only active when Tailwind is configured. Uses `@apply` in CSS files, never inline utilities in HTML/Liquid.
- **Code Writer Agent**: Enforces 500-line soft limit, uses `BaseComponent` pattern, implements section lifecycles, provides common snippet patterns.
- **Accessibility Agent**: Reviews for WCAG 2.1 AA compliance, implements keyboard navigation and screen reader support.
- **Liquid Agent**: Optimizes Liquid templates, handles metafields/metaobjects, implements Ajax API patterns.
- **Performance Agent**: Optimizes Core Web Vitals, implements lazy loading, handles image optimization with Shopify CDN.

### Agent Collaboration

Agents can work together:
1. **UI Design** designs component → **Code Writer** implements functionality
2. **Code Writer** builds component → **Accessibility** reviews for a11y
3. **UI Design** creates styles → **Tailwind** converts to @apply patterns (if Tailwind enabled)
4. **Liquid** creates templates → **Performance** optimizes for Core Web Vitals
5. **Performance** identifies issues → **Code Writer** implements lazy loading

---

## Summary

This setup provides:

✅ **Modern Build System** - Vite for fast development and optimized builds
✅ **Flexible Package Manager** - Choose Bun, npm, pnpm, or yarn
✅ **Organized Structure** - Clear separation of source and build files
✅ **Hot Reload** - Instant feedback during development
✅ **CI/CD Pipeline** - Automated builds and checks via GitHub Actions
✅ **Flexible Styling** - Support for CSS, SCSS, or Tailwind
✅ **Type Safety Option** - Easy to add TypeScript if needed
✅ **Best Practices** - Semantic CSS, camelCase JS, mobile-first design
✅ **Theme Editor Support** - Section lifecycle hooks for seamless customization
✅ **Secure Configuration** - TOML file handling with gitignore protection
✅ **Code Quality Tools** - ESLint + Prettier or Theme Check for linting
✅ **Git Hooks** - Husky + lint-staged for pre-commit checks
✅ **AI Agent System** - 6 specialized subagents for design, code, Liquid, performance, and accessibility

**Next Steps:**

1. Complete the setup checklist above
2. Create your first component in `frontend/scripts/components/`
3. Add custom styles in `frontend/styles/`
4. Import them in the entrypoint files
5. Build and deploy!

---

**Version:** 1.0.0
**Last Updated:** October 2025
**Maintained By:** Mikhail Arden
