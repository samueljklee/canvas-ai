# GitHub Sharing Checklist

## ✅ Before Pushing

- [x] `.env` is gitignored (verified)
- [x] `.env.example` exists with placeholder key
- [ ] Add `package-lock.json` to git: `git add package-lock.json`
- [ ] Verify no sensitive data: `git status` and review files
- [ ] Test build from scratch:
  ```bash
  rm -rf node_modules dist release
  npm install
  npm run rebuild
  npm run build:all
  npm test
  ```

## 📤 Pushing to GitHub

```bash
# Add package-lock.json
git add package-lock.json

# Commit
git commit -m "chore: Add package-lock.json for reproducible builds"

# Push to GitHub
git push origin main
```

## 📝 Update README.md

Make sure README includes:
- [x] Prerequisites (Node.js 18+)
- [x] Installation steps
- [x] API key setup (.env.example)
- [x] Build commands
- [ ] Link to docs/BUILD.md for detailed build instructions

## 🔗 Post-Push Tasks

1. **Add repository topics** on GitHub:
   - `electron`, `typescript`, `react`, `ai`, `claude`, `anthropic`, `workspace`, `canvas`

2. **Update package.json URLs** (if needed):
   - Change repository URL from `microsoft/canvas-ai` to your actual org/username

3. **Create GitHub releases**:
   - Tag version: `v0.1.0-beta`
   - Attach DMG files from `release/` folder

4. **Add badges to README**:
   ```markdown
   ![Build](https://github.com/yourusername/canvas-ai/actions/workflows/build.yml/badge.svg)
   ![License](https://img.shields.io/badge/license-SEE%20LICENSE-blue)
   ![Version](https://img.shields.io/badge/version-0.1.0--beta-green)
   ```

## 🎯 Quick Clone Test

After pushing, test that others can clone and run:

```bash
# In a different directory
git clone https://github.com/yourusername/canvas-ai.git
cd canvas-ai
npm install
npm run rebuild
cp .env.example .env
# Edit .env with API key
npm run dev
```

If this works, you're good to go! ✅
