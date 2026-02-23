# Phase 3: Chrome Web Store Deployment + Funnel Touchpoints

> **Date**: 2026-02-20
> **Phase**: 3 of 3
> **Timeline**: Day 12-18
> **Prerequisites**: Phase 1 (state management, selectors, withRetry) + Phase 2 (presets, response detection, notifications)

---

## Table of Contents

1. [Task 9: Chrome Web Store Deployment Prep (Day 12-13)](#task-9-chrome-web-store-deployment-prep-day-12-13)
2. [Task 10: Funnel Touchpoints Implementation (Day 14-15)](#task-10-funnel-touchpoints-implementation-day-14-15)
3. [Task 11: Store Optimization + Launch (Day 16-18)](#task-11-store-optimization--launch-day-16-18)

---

## Task 9: Chrome Web Store Deployment Prep (Day 12-13)

### 9-1. Version Bump + Manifest Updates

**File**: `C:\jnk\1000_notebooklm\manifest.json`

Replace the entire file with:

```json
{
  "manifest_version": 3,
  "name": "NotebookLM 퀵 요약기 — YouTube 1-Click 자동 분석",
  "version": "2.0.0",
  "description": "YouTube 영상을 1-Click으로 NotebookLM에 보내 핵심 요약·Q&A·팟캐스트 스크립트를 자동 생성합니다. 6가지 프리셋 + 커스텀 프롬프트 지원.",
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://notebooklm.google.com/*"],
      "js": ["selectors.js", "content.js"]
    }
  ],
  "permissions": [
    "tabs",
    "scripting",
    "activeTab",
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "*://*.youtube.com/*",
    "*://notebooklm.google.com/*"
  ]
}
```

**Changes from Phase 2 manifest**:
- `name`: `"NotebookLM 퀵 요약기 (MVP)"` -> `"NotebookLM 퀵 요약기 — YouTube 1-Click 자동 분석"` (SEO-optimized title)
- `version`: `"1.0.0"` -> `"2.0.0"`
- `description`: Updated to mention 6 presets + custom prompts
- Added `action.default_icon` with 3 sizes
- Added top-level `icons` field with 3 sizes

---

### 9-2. Icon Generation

**Directory**: `C:\jnk\1000_notebooklm\icons\`

Create directory and 3 PNG icons from `logo.webp`.

#### Option A: Using ImageMagick (recommended)

```bash
mkdir -p icons

# Install ImageMagick if not present (Windows: choco install imagemagick / Mac: brew install imagemagick)
magick logo.webp -resize 16x16 -background transparent -gravity center -extent 16x16 icons/icon-16.png
magick logo.webp -resize 48x48 -background transparent -gravity center -extent 48x48 icons/icon-48.png
magick logo.webp -resize 128x128 -background transparent -gravity center -extent 128x128 icons/icon-128.png
```

#### Option B: Using Sharp (Node.js)

Create a temporary script `_generate-icons.js`:

```js
// Run: node _generate-icons.js
// Requires: npm install sharp
const sharp = require('sharp');
const fs = require('fs');

if (!fs.existsSync('icons')) fs.mkdirSync('icons');

const sizes = [16, 48, 128];
sizes.forEach(size => {
  sharp('logo.webp')
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`icons/icon-${size}.png`)
    .then(() => console.log(`Created icon-${size}.png`))
    .catch(err => console.error(`Error creating icon-${size}.png:`, err));
});
```

```bash
npm install sharp
node _generate-icons.js
rm _generate-icons.js   # Clean up temp script
```

#### Option C: Manual (Figma / Photoshop / online tool)

1. Open `logo.webp` in any image editor
2. Export as PNG at 16x16, 48x48, 128x128
3. Save to `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`
4. Ensure PNG format, transparent background, no padding artifacts

#### Icon Requirements Checklist

- [ ] `icons/icon-16.png` exists, is 16x16 PNG
- [ ] `icons/icon-48.png` exists, is 48x48 PNG
- [ ] `icons/icon-128.png` exists, is 128x128 PNG
- [ ] All icons are legible at their respective sizes
- [ ] No white box / artifact around the icon on dark backgrounds

---

### 9-3. Privacy Policy Page

**File**: `C:\jnk\1000_notebooklm\docs\privacy-policy.html`

This file is intended to be hosted on GitHub Pages (e.g., `https://{{TEAM_NAME}}.github.io/nlm-ext-privacy/`).

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NotebookLM 퀵 요약기 — 개인정보처리방침 / Privacy Policy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
      line-height: 1.7; color: #1a1a1a; background: #fafafa;
      max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: .5rem; color: #111; }
    h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 .75rem; color: #222; border-bottom: 1px solid #e5e5e5; padding-bottom: .5rem; }
    h3 { font-size: 1rem; font-weight: 600; margin: 1.5rem 0 .5rem; color: #333; }
    p, li { font-size: .95rem; margin-bottom: .5rem; }
    ul { padding-left: 1.5rem; }
    .meta { font-size: .85rem; color: #666; margin-bottom: 2rem; }
    .divider { border: none; border-top: 2px solid #e5e5e5; margin: 3rem 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .lang-toggle { display: inline-block; padding: .5rem 1rem; border: 1px solid #ddd; border-radius: .5rem; margin-bottom: 1.5rem; font-size: .85rem; color: #555; }
  </style>
</head>
<body>

  <div class="lang-toggle">
    <a href="#ko">한국어</a> | <a href="#en">English</a>
  </div>

  <!-- ==================== 한국어 ==================== -->
  <section id="ko">
    <h1>개인정보처리방침</h1>
    <p class="meta">시행일: 2026-02-20 | 최종 수정: 2026-02-20</p>

    <h2>1. 수집하는 개인정보</h2>
    <p><strong>본 확장 프로그램은 어떠한 개인정보도 수집, 저장, 전송하지 않습니다.</strong></p>
    <ul>
      <li>서버로 데이터를 전송하지 않습니다.</li>
      <li>사용자 계정 정보에 접근하지 않습니다.</li>
      <li>쿠키를 생성하거나 추적하지 않습니다.</li>
      <li>분석 도구(Google Analytics 등)를 사용하지 않습니다.</li>
    </ul>

    <h2>2. 로컬 데이터 저장</h2>
    <p>확장 프로그램은 아래 데이터를 <strong>사용자 브라우저 내 로컬</strong>에만 저장합니다:</p>
    <ul>
      <li><code>chrome.storage.local</code>: 노트북 URL, 노트북 목록, 사용자 설정(언어, 분량)</li>
      <li><code>chrome.storage.session</code>: 임시 자동화 상태 (탭 닫으면 삭제)</li>
    </ul>
    <p>이 데이터는 외부로 전송되지 않으며, 확장 프로그램 삭제 시 모두 제거됩니다.</p>

    <h2>3. 권한 사용 목적</h2>
    <ul>
      <li><strong>tabs</strong>: 현재 탭 URL 확인 (YouTube 영상 감지)</li>
      <li><strong>scripting</strong>: NotebookLM 페이지에 자동화 스크립트 실행</li>
      <li><strong>activeTab</strong>: 활성 탭 정보 접근</li>
      <li><strong>storage</strong>: 로컬 설정 저장</li>
      <li><strong>notifications</strong>: 자동화 완료 알림 표시</li>
    </ul>
    <p>모든 권한은 확장 프로그램 기능 수행에만 사용되며, 사용자 데이터 수집 목적으로 사용되지 않습니다.</p>

    <h2>4. 호스트 권한</h2>
    <ul>
      <li><code>*://*.youtube.com/*</code>: YouTube 영상 URL 감지 및 제목 추출</li>
      <li><code>*://notebooklm.google.com/*</code>: NotebookLM 페이지 자동화 (소스 추가, 프롬프트 입력)</li>
    </ul>

    <h2>5. 제3자 데이터 공유</h2>
    <p>본 확장 프로그램은 제3자에게 어떠한 데이터도 공유, 판매, 전송하지 않습니다.</p>

    <h2>6. 데이터 보안</h2>
    <p>모든 데이터는 사용자 브라우저 내 Chrome Storage API를 통해 저장되며, Chrome의 보안 샌드박스 내에서만 접근 가능합니다.</p>

    <h2>7. 아동 개인정보</h2>
    <p>본 확장 프로그램은 13세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>

    <h2>8. 변경사항 고지</h2>
    <p>개인정보처리방침이 변경될 경우, 이 페이지를 통해 고지합니다. 중요한 변경 시 확장 프로그램 업데이트 노트에도 명시합니다.</p>

    <h2>9. 문의</h2>
    <p>개인정보 관련 문의: <a href="mailto:privacy@{{TEAM_NAME}}.com">privacy@{{TEAM_NAME}}.com</a></p>
  </section>

  <hr class="divider" />

  <!-- ==================== English ==================== -->
  <section id="en">
    <h1>Privacy Policy</h1>
    <p class="meta">Effective: 2026-02-20 | Last updated: 2026-02-20</p>

    <h2>1. Information We Collect</h2>
    <p><strong>This extension does not collect, store, or transmit any personal information.</strong></p>
    <ul>
      <li>No data is sent to any external server.</li>
      <li>No user account information is accessed.</li>
      <li>No cookies are created or tracked.</li>
      <li>No analytics tools (Google Analytics, etc.) are used.</li>
    </ul>

    <h2>2. Local Data Storage</h2>
    <p>The extension stores the following data <strong>locally in the user's browser only</strong>:</p>
    <ul>
      <li><code>chrome.storage.local</code>: Notebook URL, notebook list, user preferences (language, length)</li>
      <li><code>chrome.storage.session</code>: Temporary automation state (cleared when tab closes)</li>
    </ul>
    <p>This data is never transmitted externally and is removed when the extension is uninstalled.</p>

    <h2>3. Permission Usage</h2>
    <ul>
      <li><strong>tabs</strong>: Read current tab URL to detect YouTube videos</li>
      <li><strong>scripting</strong>: Execute automation scripts on NotebookLM pages</li>
      <li><strong>activeTab</strong>: Access active tab information</li>
      <li><strong>storage</strong>: Store local preferences</li>
      <li><strong>notifications</strong>: Show automation completion notifications</li>
    </ul>
    <p>All permissions are used solely for extension functionality. No permissions are used for data collection.</p>

    <h2>4. Host Permissions</h2>
    <ul>
      <li><code>*://*.youtube.com/*</code>: Detect YouTube video URLs and extract titles</li>
      <li><code>*://notebooklm.google.com/*</code>: Automate NotebookLM (add sources, input prompts)</li>
    </ul>

    <h2>5. Third-Party Data Sharing</h2>
    <p>This extension does not share, sell, or transfer any data to third parties.</p>

    <h2>6. Data Security</h2>
    <p>All data is stored via Chrome Storage API within the user's browser, accessible only within Chrome's security sandbox.</p>

    <h2>7. Children's Privacy</h2>
    <p>This extension does not knowingly collect personal information from children under 13.</p>

    <h2>8. Changes to This Policy</h2>
    <p>Changes will be posted on this page. Significant changes will also be noted in extension update notes.</p>

    <h2>9. Contact</h2>
    <p>Privacy inquiries: <a href="mailto:privacy@{{TEAM_NAME}}.com">privacy@{{TEAM_NAME}}.com</a></p>
  </section>

</body>
</html>
```

**Hosting instructions**:
1. Create a GitHub repository (e.g., `nlm-ext-privacy`)
2. Push `privacy-policy.html` as `index.html`
3. Enable GitHub Pages in Settings -> Pages -> Source: main branch
4. URL will be: `https://{{TEAM_NAME}}.github.io/nlm-ext-privacy/`
5. Use this URL in Chrome Web Store dashboard under "Privacy policy"

---

### 9-4. Store Listing Description

#### Korean (Primary)

```
NotebookLM 퀵 요약기 — YouTube 영상을 1-Click으로 자동 분석

YouTube 영상 URL을 한 번의 클릭으로 Google NotebookLM에 보내,
AI가 핵심 내용을 자동으로 분석해 드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 주요 기능
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 전체 요약 — 영상 핵심 내용을 구조화된 문서로 정리
❓ 핵심 Q&A — 가장 궁금한 질문과 명쾌한 답변 자동 생성
🎙️ 팟캐스트 — 두 진행자의 자연스러운 대화 스크립트 변환
📝 원본 텍스트 — 영상 전문을 빠짐없이 기록
📓 스터디 노트 — 학습에 최적화된 요약 노트 생성
📋 회의 메모 — 회의/발표 영상을 실행 가능한 메모로 변환

＋ 2개의 커스텀 프롬프트 슬롯

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 편의 기능
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 4개 언어 지원 (한국어, English, 日本語, 中文)
• 3단계 분량 조절 (간략 / 기본 / 상세)
• 노트북 자동 감지 & 목록 관리
• 새 노트북 자동 생성
• 기존 소스 자동 삭제 옵션
• 완료 알림 + 원클릭 응답 복사
• 5단계 실시간 진행 상태 표시

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 개인정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 서버 전송 없음 — 모든 데이터는 브라우저 로컬에만 저장
• 계정 정보 접근 없음
• 추적/분석 도구 없음
• 100% 무료, 광고 없음

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 사용 방법
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. YouTube 영상 페이지에서 확장 프로그램 아이콘 클릭
2. 원하는 분석 모드 선택 (전체 요약, Q&A, 팟캐스트 등)
3. NotebookLM이 자동으로 열리며 AI가 분석 시작!

Google NotebookLM 계정이 필요합니다 (무료).
```

#### English (Global)

```
NotebookLM Quick Summarizer — YouTube 1-Click Auto Analysis

Send any YouTube video to Google NotebookLM with a single click.
AI automatically analyzes and extracts key insights for you.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Full Summary — Structured document with key points & takeaways
❓ Q&A — Auto-generated questions and clear answers
🎙️ Podcast — Natural two-host conversation script
📝 Full Text — Complete verbatim transcript
📓 Study Notes — Learning-optimized summary notes
📋 Meeting Memo — Action-oriented notes from meetings/presentations

＋ 2 custom prompt slots for your own templates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 4 languages (Korean, English, Japanese, Chinese)
• 3 length options (Brief / Standard / Detailed)
• Auto-detect & manage notebooks
• Auto-create new notebooks
• Auto-delete existing sources option
• Completion notification + one-click copy
• 5-step real-time progress indicator

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Zero server transmission — all data stored locally
• No account access
• No tracking or analytics
• 100% free, no ads

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 HOW TO USE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Click the extension icon on any YouTube video page
2. Choose your analysis mode (Summary, Q&A, Podcast, etc.)
3. NotebookLM opens automatically and AI starts analyzing!

Requires a Google NotebookLM account (free).
```

---

### 9-5. Store Dashboard Submission Checklist

Follow this exact sequence in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):

#### Pre-Submission

- [ ] Developer account registered ($5 one-time fee paid)
- [ ] `manifest.json` version is `2.0.0`
- [ ] Icons exist: `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`
- [ ] Extension loads without errors in `chrome://extensions` (developer mode)
- [ ] All 6 preset buttons work on a YouTube page
- [ ] Custom preset slots save and load correctly
- [ ] Notifications fire on automation completion

#### Package Creation

```bash
# From project root (C:\jnk\1000_notebooklm)
# Exclude non-extension files from the zip

# Files to include:
#   manifest.json
#   index.html
#   popup.js
#   background.js
#   content.js
#   selectors.js
#   logo.webp
#   icons/icon-16.png
#   icons/icon-48.png
#   icons/icon-128.png
#   fonts/Inter.woff2
#   fonts/MaterialSymbolsOutlined.woff2

# Create zip (exclude docs, .claude, markdown files, tailwind, node_modules)
zip -r nlm-quick-summarizer-v2.0.0.zip \
  manifest.json \
  index.html \
  popup.js \
  background.js \
  content.js \
  selectors.js \
  logo.webp \
  icons/ \
  fonts/
```

On Windows (PowerShell):
```powershell
Compress-Archive -Path manifest.json, index.html, popup.js, background.js, content.js, selectors.js, logo.webp, icons, fonts -DestinationPath nlm-quick-summarizer-v2.0.0.zip
```

#### Dashboard Steps

1. **Items -> New Item** -> Upload `nlm-quick-summarizer-v2.0.0.zip`
2. **Store Listing**:
   - Language: Korean (한국어)
   - Title: `NotebookLM 퀵 요약기 — YouTube 1-Click 자동 분석`
   - Summary (132 char max): `YouTube 영상을 1-Click으로 NotebookLM에 보내 AI가 요약·Q&A·팟캐스트 스크립트를 자동 생성합니다. 100% 무료.`
   - Description: Paste Korean description from 9-4
   - Category: `Productivity`
   - Language: Add English, paste English description
3. **Graphic Assets**:
   - [ ] Extension icon: 128x128 PNG (upload `icons/icon-128.png`)
   - [ ] Screenshot 1: Popup UI on YouTube page (1280x800 or 640x400)
   - [ ] Screenshot 2: NotebookLM automation in progress (overlay visible)
   - [ ] Screenshot 3: Completed analysis result
   - [ ] Screenshot 4: Preset selection + settings panel
   - [ ] Small promo tile (optional): 440x280 PNG
4. **Privacy**:
   - Single purpose description: `Sends YouTube video URLs to Google NotebookLM and automates AI-powered content analysis with preset prompts.`
   - Privacy policy URL: `https://{{TEAM_NAME}}.github.io/nlm-ext-privacy/`
   - Permissions justification:
     - `tabs`: "Read current tab URL to detect when user is on a YouTube video page"
     - `scripting`: "Inject content script into NotebookLM to automate source addition and prompt input"
     - `activeTab`: "Access the active tab to determine the current page context"
     - `storage`: "Store user preferences (language, length, notebook selection) locally"
     - `notifications`: "Notify user when automation completes successfully or encounters an error"
   - Host permissions justification:
     - `*://*.youtube.com/*`: "Detect YouTube video URLs on the active tab"
     - `*://notebooklm.google.com/*`: "Run automation scripts on NotebookLM pages to add sources and input prompts"
   - Data use: Check "I do not sell or transfer user data to third parties" and "I do not use or transfer user data for purposes unrelated to the item's single purpose"
   - Certify no remote code execution
5. **Distribution**:
   - Visibility: Public
   - Distribution: All regions
6. **Submit for review**

#### Screenshot Preparation Guide

Take screenshots at exactly **1280x800** resolution:

1. **Screenshot 1 (Popup)**: Open YouTube video -> Click extension icon -> Capture popup showing all 6 presets + options
2. **Screenshot 2 (Automation)**: During automation -> Capture NotebookLM page with overlay showing progress
3. **Screenshot 3 (Result)**: After automation completes -> Capture NotebookLM with AI response visible + copy button
4. **Screenshot 4 (Settings)**: Open settings panel -> Show notebook list + URL input + custom presets

Windows screenshot tool:
```
Win + Shift + S -> Select region exactly 1280x800
```

Or use Chrome DevTools:
```
1. F12 -> Toggle device toolbar (Ctrl+Shift+M)
2. Set dimensions to 1280x800
3. Three-dot menu -> "Capture screenshot"
```

---

### 9-6. Verification Steps (Task 9)

- [ ] `manifest.json` shows version `2.0.0`
- [ ] `manifest.json` has `icons` field with 16/48/128
- [ ] `manifest.json` name is updated with SEO title
- [ ] `icons/` directory contains 3 PNG files at correct dimensions
- [ ] Extension loads in `chrome://extensions` without errors
- [ ] Extension icon appears correctly in toolbar (16px) and extensions page (48px, 128px)
- [ ] `docs/privacy-policy.html` opens correctly in browser, both Korean and English sections render
- [ ] Zip file contains only necessary extension files (no `.md`, no `.claude/`, no `docs/`)

### 9-7. Commit Message

```
feat: prepare Chrome Web Store deployment (v2.0.0)

- Bump version to 2.0.0 with SEO-optimized title and description
- Add icons field to manifest (16x16, 48x48, 128x128 PNG)
- Add privacy policy page (Korean + English) for Store listing
- Prepare Store listing descriptions in Korean and English

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Task 10: Funnel Touchpoints Implementation (Day 14-15)

### Strategy Constraints

- **100% free forever** -- funnel exists only to introduce developer's other projects
- **Zero UX degradation** -- all touchpoints are passive, non-intrusive, easily dismissible
- **UTM tracking** -- every link includes `utm_source=nlm-ext&utm_medium=[touchpoint-name]`
- **Placeholders** -- `{{PROJECT_URL}}` and `{{TEAM_NAME}}` must be replaced by the developer before deployment

---

### 10-1. Touchpoint 1: Popup Footer Link

**File**: `C:\jnk\1000_notebooklm\index.html`

#### HTML Change

Find the current footer (approximately line 253-255):

```html
    <footer>
      <img src="logo.webp" alt="logo" class="footer-logo" />
    </footer>
```

Replace with:

```html
    <footer>
      <a href="{{PROJECT_URL}}?utm_source=nlm-ext&utm_medium=popup-footer"
         target="_blank" rel="noopener noreferrer" class="footer-link">
        <img src="logo.webp" alt="logo" class="footer-logo" />
      </a>
      <span class="footer-credit">Made by {{TEAM_NAME}}</span>
    </footer>
```

#### CSS Change

Find the current footer CSS (approximately line 143-144 in the `<style>` block):

```css
    footer { position:relative;z-index:10;margin-top:1rem;padding-top:.75rem;border-top:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;align-items:center;gap:.25rem; }
    .footer-logo { width:100px;margin-top:.25rem;opacity:.85; }
```

Replace with:

```css
    footer { position:relative;z-index:10;margin-top:1rem;padding-top:.75rem;border-top:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;align-items:center;gap:.25rem; }
    .footer-link { display:inline-flex;align-items:center;text-decoration:none;transition:opacity 150ms; }
    .footer-link:hover { opacity:1; }
    .footer-link:hover .footer-logo { opacity:1;transform:scale(1.03); }
    .footer-logo { width:100px;margin-top:.25rem;opacity:.85;transition:all 150ms; }
    .footer-credit { font-size:.65rem;color:rgb(107,114,128);letter-spacing:.02em;margin-top:.125rem; }
```

---

### 10-2. Touchpoint 2: Automation Complete Banner in Overlay

**File**: `C:\jnk\1000_notebooklm\content.js`

#### CSS Addition

In the `_injectOverlayStyles` function, find the existing style block and add the banner styles. Locate this section (approximately line 41-76):

Find:
```js
    @keyframes nlm-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
```

Replace with:
```js
    @keyframes nlm-spin { to { transform: rotate(360deg); } }

    /* Funnel: completion banner */
    .nlm-complete-banner {
      position: absolute;
      bottom: 48px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: rgba(255,255,255,.08);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px;
      color: rgba(255,255,255,.7);
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-decoration: none;
      transition: all .25s;
      white-space: nowrap;
      opacity: 0;
      animation: nlm-banner-in .4s ease-out forwards;
      animation-delay: .3s;
    }
    .nlm-complete-banner:hover {
      background: rgba(255,255,255,.14);
      color: rgba(255,255,255,.95);
      border-color: rgba(96,165,250,.4);
    }
    .nlm-complete-banner-close {
      background: none;
      border: none;
      color: rgba(255,255,255,.4);
      font-size: 16px;
      cursor: pointer;
      padding: 0 0 0 4px;
      line-height: 1;
      transition: color .15s;
    }
    .nlm-complete-banner-close:hover {
      color: rgba(255,255,255,.8);
    }
    @keyframes nlm-banner-in {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
```

#### Banner Injection Function

Add this new function right after the `hideOverlay` function (after approximately line 118):

```js
// ============================================================
// Funnel: 자동화 완료 배너
// ============================================================

const showCompleteBanner = () => {
  const overlay = document.getElementById('nlm-ext-overlay');
  if (!overlay) return;

  // 이미 배너가 있으면 중복 생성 방지
  if (overlay.querySelector('.nlm-complete-banner')) return;

  const banner = document.createElement('a');
  banner.className = 'nlm-complete-banner';
  banner.href = '{{PROJECT_URL}}?utm_source=nlm-ext&utm_medium=complete-banner';
  banner.target = '_blank';
  banner.rel = 'noopener noreferrer';

  const textSpan = document.createElement('span');
  textSpan.textContent = '{{TEAM_NAME}}의 다른 도구도 확인해보세요 \u2192';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'nlm-complete-banner-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 200);
  });

  banner.appendChild(textSpan);
  banner.appendChild(closeBtn);
  overlay.appendChild(banner);
};
```

#### Integration into runAutomation

Find the end of `runAutomation` (approximately line 498-501):

```js
  injectCopyButton();
  updateOverlay('완료!', 'NotebookLM이 응답을 생성하고 있습니다');
  hideOverlay(2000);
  sendStatus('완료!', 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능', 'success');
```

Replace with:

```js
  injectCopyButton();
  updateOverlay('완료!', 'NotebookLM이 응답을 생성하고 있습니다');
  showCompleteBanner();
  hideOverlay(3000);
  sendStatus('완료!', 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능', 'success');
```

**Behavior**:
- Banner appears ~300ms after "완료!" overlay shows (CSS animation-delay)
- Banner is an `<a>` tag -- clickable to open `{{PROJECT_URL}}`
- Close button (x) removes banner immediately on click, prevents link navigation
- The overlay (including banner) auto-hides after 3 seconds via `hideOverlay(3000)`
- Glass aesthetic matches the existing overlay style

---

### 10-3. Touchpoint 3: Project Card in Settings Area

**File**: `C:\jnk\1000_notebooklm\index.html`

#### HTML Change

Find the settings area (approximately line 169-177):

```html
      <div id="settings-area" class="settings-area">
        <p class="settings-label">노트북 URL 직접 입력</p>
        <div class="settings-input-row">
          <input id="notebook-url-input" class="settings-input" type="text"
                 placeholder="https://notebooklm.google.com/notebook/..." />
          <button id="btn-save-url" class="settings-save-btn">저장</button>
        </div>
        <span id="notebook-badge" class="notebook-badge badge-none">확인 중...</span>
      </div>
```

Replace with:

```html
      <div id="settings-area" class="settings-area">
        <p class="settings-label">노트북 URL 직접 입력</p>
        <div class="settings-input-row">
          <input id="notebook-url-input" class="settings-input" type="text"
                 placeholder="https://notebooklm.google.com/notebook/..." />
          <button id="btn-save-url" class="settings-save-btn">저장</button>
        </div>
        <span id="notebook-badge" class="notebook-badge badge-none">확인 중...</span>

        <!-- Funnel: Project card -->
        <a href="{{PROJECT_URL}}?utm_source=nlm-ext&utm_medium=settings-card"
           target="_blank" rel="noopener noreferrer" class="funnel-card">
          <div class="funnel-card-icon">
            <span class="material-symbols-outlined">rocket_launch</span>
          </div>
          <div class="funnel-card-body">
            <span class="funnel-card-title">{{TEAM_NAME}}의 다른 프로젝트</span>
            <span class="funnel-card-desc">AI 생산성 도구를 더 만들고 있어요. 구경 오세요!</span>
          </div>
          <span class="material-symbols-outlined funnel-card-arrow">chevron_right</span>
        </a>
      </div>
```

#### CSS Addition

Find the settings area CSS section (approximately line 82-96). After the `.badge-none` rule, add the funnel card styles.

Find:
```css
    .badge-none { color:rgb(248,113,113);background:rgba(248,113,113,.1); }
```

Add immediately after:

```css

    /* Funnel: settings project card */
    .funnel-card { display:flex;align-items:center;gap:.625rem;margin-top:.75rem;padding:.625rem .75rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);text-decoration:none;transition:all 150ms;cursor:pointer; }
    .funnel-card:hover { background:rgba(59,130,246,.06);border-color:rgba(59,130,246,.2); }
    .funnel-card-icon { flex-shrink:0;width:2rem;height:2rem;border-radius:.5rem;background:rgba(59,130,246,.1);display:flex;align-items:center;justify-content:center; }
    .funnel-card-icon .material-symbols-outlined { font-size:1rem;color:rgb(96,165,250); }
    .funnel-card-body { flex:1;min-width:0; }
    .funnel-card-title { display:block;font-size:.75rem;font-weight:600;color:rgb(229,231,235);line-height:1.3; }
    .funnel-card-desc { display:block;font-size:.65rem;color:rgb(107,114,128);line-height:1.3;margin-top:.125rem; }
    .funnel-card-arrow { font-size:1rem;color:rgb(107,114,128);flex-shrink:0;transition:transform 150ms; }
    .funnel-card:hover .funnel-card-arrow { transform:translateX(2px);color:rgb(96,165,250); }
```

---

### 10-4. Complete Modified Files (Task 10)

For clarity, here are the full diffs of all changes in Task 10:

#### `index.html` -- Full Diff Summary

**Change 1 (CSS)**: After `.footer-logo` rule, add `.footer-link`, `.footer-link:hover`, `.footer-link:hover .footer-logo`, `.footer-credit` rules. Modify `.footer-logo` to add `transition`.

**Change 2 (CSS)**: After `.badge-none` rule, add `.funnel-card` and related rules.

**Change 3 (HTML)**: Replace `<footer>` block with linked logo + credit.

**Change 4 (HTML)**: Add funnel card inside `#settings-area` after `#notebook-badge`.

#### `content.js` -- Full Diff Summary

**Change 1 (CSS)**: Add banner CSS rules inside `_injectOverlayStyles`.

**Change 2 (Function)**: Add `showCompleteBanner()` function after `hideOverlay`.

**Change 3 (Integration)**: In `runAutomation`, add `showCompleteBanner()` call and change `hideOverlay(2000)` to `hideOverlay(3000)`.

---

### 10-5. Verification Steps (Task 10)

#### Touchpoint 1: Popup Footer Link

- [ ] Open popup on any page
- [ ] Logo is wrapped in a clickable link
- [ ] Hovering over logo shows subtle scale effect
- [ ] "Made by {{TEAM_NAME}}" text appears below logo in muted gray
- [ ] Clicking logo opens `{{PROJECT_URL}}?utm_source=nlm-ext&utm_medium=popup-footer` in new tab
- [ ] Link does NOT break popup layout or cause scrolling

#### Touchpoint 2: Complete Banner

- [ ] Run automation on a YouTube video
- [ ] When overlay shows "완료!", banner appears at the bottom of the overlay
- [ ] Banner text: "{{TEAM_NAME}}의 다른 도구도 확인해보세요 ->"
- [ ] Banner has glass-like style matching the overlay
- [ ] Clicking banner opens `{{PROJECT_URL}}?utm_source=nlm-ext&utm_medium=complete-banner` in new tab
- [ ] Clicking X button dismisses banner without navigating
- [ ] Banner auto-disappears when overlay fades out (~3 seconds)
- [ ] Banner does NOT appear during automation (only on completion)
- [ ] Banner does NOT reappear if overlay is already gone

#### Touchpoint 3: Settings Card

- [ ] Open popup -> click settings gear icon
- [ ] Settings panel opens, card is visible below the URL input and badge
- [ ] Card shows rocket icon, project title, one-line description, chevron arrow
- [ ] Hovering card shows blue highlight and arrow animation
- [ ] Clicking card opens `{{PROJECT_URL}}?utm_source=nlm-ext&utm_medium=settings-card` in new tab
- [ ] Card is NOT visible when settings panel is closed
- [ ] Card does NOT affect settings panel toggle behavior

#### General UX Verification

- [ ] All 3 touchpoints contain correct UTM parameters
- [ ] No touchpoint blocks or delays any user action
- [ ] Extension popup still fits within 480px width
- [ ] All automation flows (FULL_DOC, FAQ, PODCAST, FULL_TEXT, etc.) still work correctly
- [ ] Overlay timer change from 2000ms to 3000ms does not feel sluggish

---

### 10-6. Commit Message

```
feat: add 3 non-intrusive funnel touchpoints

- Touchpoint 1: Wrap popup footer logo in linked <a> tag with
  UTM tracking (popup-footer), add "Made by" credit text
- Touchpoint 2: Show dismissible completion banner in overlay
  with glass aesthetic, auto-disappears with overlay (complete-banner)
- Touchpoint 3: Add project card in settings panel below URL input
  with icon, description, and hover animation (settings-card)

All touchpoints use {{PROJECT_URL}} placeholder with UTM params.
Zero UX degradation — all passive, non-blocking, easily dismissed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Task 11: Store Optimization + Launch (Day 16-18)

### 11-1. Optimized Store Title

**Final title** (max 75 characters):

```
NotebookLM 퀵 요약기 — YouTube 1-Click 자동 분석
```

Character count: 30 characters (Korean), well within limits.

**Rationale**:
- Primary keyword: `NotebookLM` (exact brand match)
- Secondary keyword: `YouTube` (target user search term)
- Action keyword: `1-Click 자동 분석` (value proposition)
- Em-dash separator for readability

---

### 11-2. Keywords Strategy

Chrome Web Store does not have a separate keywords field, but keywords must appear naturally in the title, summary, and description.

#### Primary Keywords (must appear in title or summary)

| Keyword | Placement |
|---------|-----------|
| NotebookLM | Title, Summary, Description |
| YouTube | Title, Summary, Description |
| 요약 / Summary | Title (요약기), Description |
| 1-Click / 원클릭 | Title, Summary |
| 자동 / Auto | Title (자동 분석), Description |

#### Secondary Keywords (must appear in description)

| Korean | English | Section |
|--------|---------|---------|
| AI 요약 | AI summary | Features |
| 핵심 내용 추출 | key insights extraction | Features |
| 팟캐스트 스크립트 | podcast script | Features |
| Q&A 질문 답변 | Q&A questions answers | Features |
| 노트북 관리 | notebook management | Features |
| 무료 확장 프로그램 | free extension | Privacy |
| 스터디 노트 | study notes | Features |
| 회의 메모 | meeting memo | Features |
| 구글 노트북LM | Google NotebookLM | Description |
| 유튜브 영상 분석 | YouTube video analysis | Description |
| 프롬프트 | prompt | Features |
| 크롬 확장 | Chrome extension | Description |

#### Long-tail Search Phrases to Target

These should be woven into the description naturally:

1. "NotebookLM 유튜브 요약" (KR)
2. "YouTube NotebookLM automatic" (EN)
3. "NotebookLM 자동화 확장 프로그램" (KR)
4. "NotebookLM Chrome extension YouTube" (EN)
5. "유튜브 영상 AI 분석" (KR)
6. "YouTube video AI summary tool" (EN)
7. "NotebookLM podcast script generator" (EN)
8. "노트북LM 팟캐스트 생성" (KR)

---

### 11-3. English Description for Global Reach

Already provided in Task 9-4. Additional SEO-focused opening paragraph to prepend to the English description:

```
The fastest way to analyze YouTube videos with Google NotebookLM.
This Chrome extension automates the entire workflow — from adding
YouTube as a source to generating AI-powered summaries, Q&As,
podcast scripts, and more. No manual copy-paste. One click does it all.

Works with any YouTube video in any language.
Supports Korean, English, Japanese, and Chinese output.
```

Full English listing (combine with 9-4 content):

```
NotebookLM Quick Summarizer — YouTube 1-Click Auto Analysis

The fastest way to analyze YouTube videos with Google NotebookLM.
This Chrome extension automates the entire workflow — from adding
YouTube as a source to generating AI-powered summaries, Q&As,
podcast scripts, and more. No manual copy-paste. One click does it all.

Works with any YouTube video in any language.
Supports Korean, English, Japanese, and Chinese output.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 6 ANALYSIS MODES + CUSTOM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Full Summary — Structured document with key points, takeaways, and caveats
❓ Core Q&A — Auto-generated questions covering the video's key topics
🎙️ Podcast Script — Natural two-host conversation (expert + curious listener)
📝 Full Transcript — Complete verbatim text, organized by topic sections
📓 Study Notes — Learning-optimized notes with definitions and key terms
📋 Meeting Memo — Action items, decisions, and follow-ups from any meeting video

＋ 2 custom prompt slots — save your own analysis templates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 SMART FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 4 output languages: Korean, English, Japanese, Chinese
• 3 length levels: Brief (quick scan), Standard, Detailed (deep dive)
• Smart notebook detection — auto-finds your NotebookLM notebooks
• One-click new notebook creation
• Auto-delete previous sources option
• Desktop notification on completion
• One-click response copy button
• 5-step real-time progress indicator with status overlay
• Retry mechanism for unreliable DOM operations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY-FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• ZERO data collection — nothing leaves your browser
• No analytics, no tracking, no cookies
• No account access or login required
• All settings stored locally via Chrome Storage API
• Open and transparent permission usage
• 100% free forever — no premium tier, no ads

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Navigate to any YouTube video
2. Click the extension icon in your toolbar
3. Select a notebook (or let it auto-create one)
4. Choose your analysis mode (Summary, Q&A, Podcast, etc.)
5. NotebookLM opens automatically — AI generates your analysis!
6. Copy the result with the floating copy button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Google Chrome browser
• Google NotebookLM account (free at notebooklm.google.com)
• YouTube video URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 WHY THIS EXTENSION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Manual workflow: Open NotebookLM → Create notebook → Add source →
Paste URL → Wait → Type prompt → Wait → Copy result (5-10 minutes)

With this extension: Click → Select mode → Done (under 30 seconds)

Save hours every week. Perfect for students, researchers, content
creators, and anyone who learns from YouTube.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Made with ❤️ by {{TEAM_NAME}}
```

---

### 11-4. Post-Launch Checklist

Execute these steps immediately after the extension is approved and published:

#### Day 1 (Publication Day)

- [ ] **Verify Store listing**: Search "NotebookLM 퀵 요약기" on Chrome Web Store, confirm it appears
- [ ] **Install from Store**: Install the published version (not dev mode), test full workflow
- [ ] **Test all 6 presets**: FULL_DOC, FAQ, PODCAST, FULL_TEXT, STUDY_NOTE, MEETING_MEMO
- [ ] **Test custom presets**: Save and run both custom slots
- [ ] **Test all 3 funnel touchpoints**: Verify UTM parameters in opened URLs
- [ ] **Check notifications**: Confirm completion notifications fire correctly
- [ ] **Cross-browser test**: Test on Chrome Stable, Chrome Beta, and Edge (Chromium)

#### Week 1

- [ ] **Monitor Store reviews**: Respond to any user reviews within 24 hours
- [ ] **Check error reports**: Review Chrome Web Store developer dashboard for crash reports
- [ ] **UTM verification**: Check if `utm_source=nlm-ext` traffic is appearing in analytics for `{{PROJECT_URL}}`
- [ ] **Share announcement**: Post on relevant communities (see 11-5)
- [ ] **Monitor uninstall rate**: Dashboard -> Statistics -> check Day 1 and Day 7 retention

#### Week 2-4

- [ ] **First review push**: If <5 reviews, add a subtle review prompt (future update consideration)
- [ ] **SEO check**: Search various keyword combinations, note ranking position
- [ ] **Performance monitoring**: Check if any timeout errors increase (DOM changes on NotebookLM side)
- [ ] **Update selectors**: If NotebookLM updates their UI, update `selectors.js` and push a patch

---

### 11-5. Announcement Post Template

#### Korean Community Post (Reddit r/korea, DC Inside, Clien, etc.)

```markdown
# [무료] YouTube 영상을 NotebookLM으로 1-Click 자동 분석하는 크롬 확장 프로그램

안녕하세요! YouTube 영상을 Google NotebookLM에서 자동으로 분석해주는
크롬 확장 프로그램을 만들었습니다.

## 이런 분들께 추천합니다
- 유튜브 영상을 요약해서 정리하고 싶은 분
- NotebookLM을 쓰고 있지만 매번 URL 복붙이 귀찮은 분
- 영상 내용을 팟캐스트 스크립트나 Q&A로 변환하고 싶은 분
- 수업/회의 녹화 영상을 효율적으로 정리하고 싶은 분

## 주요 기능
- **6가지 분석 모드**: 전체 요약, 핵심 Q&A, 팟캐스트, 원본 텍스트, 스터디 노트, 회의 메모
- **커스텀 프롬프트**: 자주 쓰는 프롬프트 2개 저장 가능
- **4개 언어**: 한국어, English, 日本語, 中文
- **3단계 분량**: 간략 / 기본 / 상세
- **완전 자동화**: 소스 추가 → 프롬프트 입력 → 전송까지 원클릭

## 개인정보
- 서버 전송 없음 (모든 데이터 로컬 저장)
- 추적/분석 도구 없음
- **100% 무료, 광고 없음**

## 설치
Chrome Web Store: [링크]

피드백이나 버그 리포트 환영합니다!
궁금한 점은 댓글로 남겨주세요.
```

#### English Community Post (Reddit r/NotebookLM, r/productivity, Product Hunt, etc.)

```markdown
# [Free] Chrome Extension: 1-Click YouTube to NotebookLM Auto Analysis

Hi everyone! I built a Chrome extension that automates the entire workflow
of analyzing YouTube videos with Google NotebookLM.

## The Problem
Every time you want to analyze a YouTube video in NotebookLM, you need to:
1. Open NotebookLM
2. Create/select a notebook
3. Add source → Website → Paste URL
4. Type your analysis prompt
5. Wait and copy the result

This takes 5-10 minutes of clicking around. Every. Single. Time.

## The Solution
One click. Pick your analysis mode. Done.

## Features
- **6 analysis modes**: Full Summary, Q&A, Podcast Script, Full Text,
  Study Notes, Meeting Memo
- **2 custom prompt slots** for your own templates
- **4 languages**: Korean, English, Japanese, Chinese
- **3 length levels**: Brief, Standard, Detailed
- **Smart notebook management**: Auto-detect, create, switch
- **Privacy-first**: Zero data collection, everything stays local
- **100% free** — no premium tier, no ads, no catch

## Install
Chrome Web Store: [link]

Would love to hear your feedback! If you encounter any issues,
please let me know in the comments.
```

#### Product Hunt Launch Description

```
# NotebookLM Quick Summarizer

## Tagline
YouTube → NotebookLM in 1 click. 6 AI analysis modes. 100% free.

## Description
Stop copy-pasting YouTube URLs into NotebookLM manually.

This Chrome extension automates the entire workflow: source addition,
prompt input, and response generation — all with a single click.

Choose from 6 preset analysis modes (Summary, Q&A, Podcast Script,
Full Text, Study Notes, Meeting Memo) or create your own custom prompts.

Supports 4 languages, 3 detail levels, and smart notebook management.

Zero data collection. No analytics. No ads. Free forever.

## Topics
- Chrome Extensions
- Artificial Intelligence
- Productivity
- YouTube Tools
- NotebookLM
```

---

### 11-6. Verification Steps (Task 11)

- [ ] Store title is exactly: `NotebookLM 퀵 요약기 — YouTube 1-Click 자동 분석`
- [ ] Korean description contains all primary and secondary keywords
- [ ] English description contains global-reach keywords
- [ ] Privacy policy page is live at the GitHub Pages URL
- [ ] Post-launch checklist is printed and ready
- [ ] Announcement posts are drafted for at least 2 Korean + 2 English communities
- [ ] Product Hunt launch page draft is prepared

### 11-7. Commit Message

```
docs: add Store optimization content and launch materials

- Finalize SEO-optimized Store title and keyword strategy
- Write comprehensive English description for global reach
- Create post-launch monitoring checklist
- Draft announcement templates for Korean/English communities
  and Product Hunt

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Appendix A: Complete File Change Map

| File | Task | Changes |
|------|------|---------|
| `manifest.json` | 9-1 | Version bump, name, description, icons field |
| `icons/icon-16.png` | 9-2 | New file (generated from logo.webp) |
| `icons/icon-48.png` | 9-2 | New file (generated from logo.webp) |
| `icons/icon-128.png` | 9-2 | New file (generated from logo.webp) |
| `docs/privacy-policy.html` | 9-3 | New file (privacy policy page) |
| `index.html` | 10-1, 10-3 | Footer link + credit, settings project card, CSS additions |
| `content.js` | 10-2 | Banner CSS, `showCompleteBanner()`, integration in `runAutomation` |

## Appendix B: Placeholder Reference

All occurrences that must be replaced before deployment:

| Placeholder | Occurrences | Files |
|-------------|-------------|-------|
| `{{PROJECT_URL}}` | 5 | `index.html` (x2), `content.js` (x1), `docs/privacy-policy.html` (x0, only email) |
| `{{TEAM_NAME}}` | 7 | `index.html` (x2), `content.js` (x1), `docs/privacy-policy.html` (x3 email refs), Store listing texts |

To find and replace all at once:
```bash
# From project root
grep -rn "{{PROJECT_URL}}" --include="*.html" --include="*.js"
grep -rn "{{TEAM_NAME}}" --include="*.html" --include="*.js"
```

Replace with actual values:
```bash
# Example (adjust paths for Windows)
sed -i 's|{{PROJECT_URL}}|https://example.com|g' index.html content.js
sed -i 's|{{TEAM_NAME}}|YourTeamName|g' index.html content.js docs/privacy-policy.html
```

## Appendix C: Rollback Plan

If any funnel touchpoint receives negative user feedback:

1. **Touchpoint 1 (Footer link)**: Remove `<a>` wrapper, revert to bare `<img>` tag, remove `.footer-credit`
2. **Touchpoint 2 (Complete banner)**: Delete `showCompleteBanner()` function, remove call from `runAutomation`, revert `hideOverlay(3000)` to `hideOverlay(2000)`, remove banner CSS
3. **Touchpoint 3 (Settings card)**: Delete `.funnel-card` HTML block from `#settings-area`, remove CSS rules

Each touchpoint is fully independent and can be removed without affecting the others or any core functionality.
