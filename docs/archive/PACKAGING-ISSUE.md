# Electron Builder Packaging Issue

**Status:** Needs Resolution
**Priority:** High (blocks distribution)
**Date:** 2025-10-14

---

## Problem

electron-builder is not including the `dist/main/` directory in the app.asar file, causing the packaged app to crash on launch with:

```
Error: Cannot find module '/path/to/app.asar/dist/main/main/index.js'
```

---

## Current State

**What Works:**
- ✅ Development mode (`npm run dev`) - Works perfectly
- ✅ All onboarding features functional
- ✅ ConfigManager working
- ✅ Tests passing (115/115)

**What Doesn't Work:**
- ❌ Packaged app (`npm run pack` or `npm run dist:mac`)
- ❌ dist/main files not included in asar
- ❌ App crashes on launch

---

## Investigation

### Files Pattern Tried:
1. `"dist/main/**/*"` - Didn't work
2. `"dist/**/*"` - Didn't work
3. `"dist"` - Still didn't include main folder

### Build Process:
```bash
npm run build:all
# Runs: build:main (TypeScript) && vite build (renderer)
```

**Result:**
- `dist/main/` - Created by TypeScript (main process)
- `dist/assets/` - Created by Vite (renderer)
- `dist/index.html` - Created by Vite

**Electron-builder packages:**
- ✅ `dist/assets/` - Included
- ✅ `dist/index.html` - Included
- ❌ `dist/main/` - NOT included (why?)

---

## Possible Solutions

### Option 1: Flatten Build Output
Move main process files to root instead of dist/main:
```json
// tsconfig.main.json
{
  "outDir": "./app/main"  // Instead of dist/main
}
```

**Pros:** Clean separation
**Cons:** Restructures project

### Option 2: Copy Files After Build
Add postbuild script:
```json
{
  "scripts": {
    "postbuild": "cp -r dist/main dist/renderer/main"
  }
}
```

**Pros:** Simple
**Cons:** Hacky

### Option 3: Use afterPack Hook
```json
// electron-builder.json
{
  "afterPack": "scripts/after-pack.js"
}
```

**Pros:** Official electron-builder solution
**Cons:** Extra complexity

### Option 4: Explicit File Mapping
```json
{
  "files": [
    {
      "from": "dist/main",
      "to": "dist/main"
    },
    "dist/assets",
    "dist/index.html"
  ]
}
```

**Pros:** Explicit control
**Cons:** Verbose

### Option 5: Change Package.json Main
Point to where files actually are in asar:
```json
{
  "main": "main/main/index.js"  // Without dist/
}
```

Then adjust electron-builder files.

---

## Recommended Solution

**Use Option 4** - Explicit file mapping with from/to syntax:

```json
{
  "files": [
    {
      "from": "dist",
      "to": "app",
      "filter": ["**/*"]
    },
    "package.json"
  ],
  "extraMetadata": {
    "main": "app/main/main/index.js"
  }
}
```

This explicitly tells electron-builder to:
1. Copy everything from `dist/` to `app/` in the asar
2. Update main entry point to `app/main/main/index.js`

---

## Testing Checklist

After implementing fix:

- [ ] `npm run pack` completes without errors
- [ ] Can launch app from `release/mac-arm64/Canvas AI.app`
- [ ] Onboarding wizard appears on first launch
- [ ] API key can be configured
- [ ] Agents can be created
- [ ] No console errors

---

## Current Workaround

For testing onboarding features:
```bash
npm run dev
```

All features work perfectly in development mode. Packaging is only needed for distribution to end users.

---

## Next Steps

1. Implement recommended solution (Option 4)
2. Test packaging
3. Verify packaged app launches
4. Build DMG for distribution
5. Test on fresh machine

**Estimated Time:** 1-2 hours to resolve
