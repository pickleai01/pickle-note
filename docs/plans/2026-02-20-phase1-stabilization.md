# Phase 1 — Stabilization Plan

> **Date**: 2026-02-20
> **Extension**: NotebookLM Quick Summarizer (Manifest V3, Vanilla JS)
> **Testing**: Manual — load unpacked extension, run automation, verify in browser

---

## Overview

Phase 1 addresses four reliability and maintainability issues in the current MVP:

| # | Task | Problem | Solution |
|---|------|---------|----------|
| 1 | `pendingTask` migration | In-memory variable lost when MV3 service worker hibernates | Migrate to `chrome.storage.session` |
| 2 | Selectors extraction | 40+ hardcoded CSS selectors scattered across `content.js` | Extract to `selectors.js` module |
| 3 | `withRetry` wrapper | DOM operations fail silently on slow pages | Generic retry utility with exponential backoff |
| 4 | Progress 5-step granularity | Overlay/popup status is vague and inconsistent | Structured 5-step progress pipeline |

---

## Task 1 — `pendingTask` to `chrome.storage.session` Migration

### Problem

`background.js` stores the pending automation task in a plain variable (`let pendingTask = null`). In Manifest V3, the service worker can be terminated at any time. When it restarts, `pendingTask` is `null` and the automation silently fails.

### Files to Modify

| File | Action |
|------|--------|
| `C:\jnk\1000_notebooklm\background.js` | **Rewrite** entire file |

### Complete New File: `background.js`

Replace the entire contents of `C:\jnk\1000_notebooklm\background.js` with:

```js
// background.js — Phase 1: chrome.storage.session migration
// pendingTask is now persisted in chrome.storage.session so it survives
// service-worker hibernation/restart cycles.

// ============================================================
// Storage helpers
// ============================================================

const getPendingTask = async () => {
  const result = await chrome.storage.session.get('pendingTask');
  return result.pendingTask || null;
};

const setPendingTask = async (task) => {
  await chrome.storage.session.set({ pendingTask: task });
};

const clearPendingTask = async () => {
  await chrome.storage.session.remove('pendingTask');
};

// ============================================================
// Message listener
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Popup -> Background: 자동화 요청
  if (request.target === 'NOTEBOOKLM_AUTOMATION') {
    console.log('[BG] 메시지 수신:', request.type, request.notebookId);

    const task = {
      type: request.type,
      url: request.url,
      clearSources: request.clearSources,
      lang: request.lang,
      length: request.length,
      createNew: request.notebookId === '__NEW__'
    };

    setPendingTask(task).then(() => {
      if (request.notebookId === '__NEW__') {
        chrome.tabs.create({ url: 'https://notebooklm.google.com/' });
      } else {
        chrome.tabs.create({
          url: `https://notebooklm.google.com/notebook/${request.notebookId}`
        });
      }
    });
  }

  // Content -> Background -> Popup: 상태 메시지 중계
  if (request.target === 'POPUP_STATUS') {
    chrome.runtime.sendMessage(request).catch(() => {});
  }

  // Content -> Background -> Popup: 노트북 목록 갱신 알림
  if (request.target === 'NOTEBOOK_LIST_UPDATED') {
    chrome.runtime.sendMessage(request).catch(() => {});
  }
});

// ============================================================
// 탭 로딩 완료 감지
// ============================================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (!tab.url.includes('notebooklm.google.com')) return;

  getPendingTask().then((pendingTask) => {
    if (!pendingTask) return;

    const isNotebookPage = tab.url.includes('/notebook/');
    const isHomePage = !isNotebookPage;

    // 1) 홈페이지 로드 완료 + 새 노트북 생성 모드 -> CREATE_NOTEBOOK 전송
    if (isHomePage && pendingTask.createNew) {
      console.log('[BG] 홈페이지 로드 완료 -> 새 노트북 생성 요청');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'CREATE_NOTEBOOK' });
      }, 2000);
      return; // pendingTask 유지 — 노트북 페이지 로드 시 자동화 시작
    }

    // 2) 노트북 페이지 로드 완료 -> 자동화 시작
    if (isNotebookPage) {
      console.log('[BG] 노트북 페이지 로드 완료 -> 자동화 시작');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          action: 'START_AUTOMATION',
          url: pendingTask.url,
          type: pendingTask.type,
          clearSources: pendingTask.clearSources,
          lang: pendingTask.lang,
          length: pendingTask.length
        });
        clearPendingTask();
      }, 2000);
    }
  });
});
```

### Diff Summary

The following describes the conceptual changes from the old file to the new file:

**Remove**: `let pendingTask = null;` (line 2)

**Add** (top of file): Three async helper functions `getPendingTask`, `setPendingTask`, `clearPendingTask` that wrap `chrome.storage.session`.

**Change** in `onMessage` handler:
```
old_string: pendingTask = {
new_string: const task = {
```
Followed by wrapping the `chrome.tabs.create` calls inside `setPendingTask(task).then(...)`.

**Change** in `onUpdated` handler:
```
old_string: if (!pendingTask || changeInfo.status !== 'complete' || !tab.url) return;
new_string: if (changeInfo.status !== 'complete' || !tab.url) return;
```
The entire body of the `onUpdated` callback is now wrapped in `getPendingTask().then(...)` with an early `if (!pendingTask) return;` inside the promise.

**Change** clearing the task:
```
old_string: pendingTask = null;
new_string: clearPendingTask();
```

### Manual Verification Steps

1. Go to `chrome://extensions`, reload the unpacked extension.
2. Open the popup on a YouTube video page, click any action button (e.g., "전체 요약").
3. Before the NotebookLM tab finishes loading, go to `chrome://extensions` and click the "service worker" link for this extension.
4. In the DevTools console of the service worker, run:
   ```js
   chrome.storage.session.get('pendingTask', (r) => console.log(r));
   ```
5. Confirm the `pendingTask` object is present with `type`, `url`, `clearSources`, `lang`, `length`, and `createNew` fields.
6. After automation completes (or the notebook page loads), run the same command again and confirm `pendingTask` is `undefined` (cleared).
7. Simulate service worker restart: go to `chrome://serviceworker-internals`, find the extension's service worker, click "Stop", then wait for the NotebookLM tab to finish loading. The automation should still proceed because the task is read from `chrome.storage.session`.
8. Verify no console errors in the background service worker or the NotebookLM tab.

### Commit Message

```
fix(background): migrate pendingTask from in-memory variable to chrome.storage.session

Service worker can be terminated at any time in MV3. Persisting
pendingTask in session storage ensures automation survives restarts.
```

---

## Task 2 — Selectors Extraction (`selectors.js`)

### Problem

`content.js` has 40+ hardcoded CSS selectors and text-match arrays scattered throughout the automation functions. When NotebookLM updates its DOM, every function must be audited individually. A single selector registry makes maintenance trivial.

### Files to Create/Modify

| File | Action |
|------|--------|
| `C:\jnk\1000_notebooklm\selectors.js` | **Create** new file |
| `C:\jnk\1000_notebooklm\manifest.json` | **Modify** — add `selectors.js` to content_scripts |
| `C:\jnk\1000_notebooklm\content.js` | **Modify** — replace hardcoded selectors with `SEL.*` references |

### New File: `selectors.js`

Create `C:\jnk\1000_notebooklm\selectors.js`:

```js
// selectors.js — Centralized CSS selector & text-match registry
// All DOM selectors used by content.js are defined here.
// When NotebookLM changes its UI, update only this file.

const SEL = {
  // ============================================================
  // 소스 추가 (Add Source)
  // ============================================================
  addSource: {
    ariaLabels: ['소스 추가', '출처 추가', 'Add source', 'Add sources'],
    textMatches: ['소스추가', '출처추가', 'Addsource'],
    buttonQuery: 'button, [role="button"]'
  },

  // ============================================================
  // URL 입력 (Source URL textarea)
  // ============================================================
  urlInput: 'textarea[formcontrolname="urls"], textarea[aria-label="URL 입력"]',

  // ============================================================
  // 채팅 입력 (Chat / Query box)
  // ============================================================
  chatInput: [
    'textarea.query-box-input',
    'textarea[placeholder*="시작"]',
    'textarea[aria-label*="query"]',
    'textarea[aria-label*="쿼리"]',
    'main textarea'
  ].join(', '),

  // ============================================================
  // 전송 버튼 (Submit)
  // ============================================================
  submitButton: 'button[aria-label="제출"]:not([disabled]), button.submit-button:not([disabled])',

  // ============================================================
  // 노트북 카드 (Homepage notebook cards)
  // ============================================================
  notebook: {
    card: 'project-button',
    idPrefix: '[id^="project-"]',
    featuredFilter: '.featured-project, .featured-project-card',
    title: '.project-button-title',
    emoji: '.project-button-box-icon'
  },

  // ============================================================
  // 소스 삭제 (Delete individual source)
  // ============================================================
  sourceDelete: {
    moreButton: 'button[aria-label="더보기"]',
    menuItem: '.mat-mdc-menu-item',
    menuTextMatch: '소스삭제',
    confirmButton: 'button[aria-label="삭제 확인"]'
  },

  // ============================================================
  // 응답 영역 (Response content for copy)
  // ============================================================
  responseContent: '.response-container,.model-response,[class*="response"],.markdown-content,.chat-message',

  // ============================================================
  // 노트북 삭제 — 더보기 메뉴 (Notebook card actions)
  // ============================================================
  notebookDelete: {
    moreButton: [
      'button[aria-label*="Actions"]',
      'button[aria-label*="actions"]',
      'button[aria-label*="메뉴"]',
      'button[aria-label*="더보기"]',
      'button[aria-label*="More"]'
    ].join(', '),
    moreButtonFallback1: 'button[class*="more"], button[class*="menu"]',
    moreButtonFallback2: 'mat-card button',
    menuItem: '.mat-mdc-menu-item, [role="menuitem"], .cdk-overlay-pane button',
    deleteTextMatches: ['삭제', 'Delete', 'delete', '휴지통', 'Trash', 'Remove'],
    confirmDialog: [
      '[role="dialog"] button[type="submit"]',
      '.mat-mdc-dialog-container button[type="submit"]',
      '.cdk-overlay-pane button[color="warn"]',
      '[role="dialog"] button.mat-warn'
    ].join(', '),
    confirmFallbackQuery: '[role="dialog"] button, .cdk-overlay-pane button, .mat-mdc-dialog-container button',
    confirmTextMatches: ['삭제', 'Delete', '이동', 'Move']
  },

  // ============================================================
  // 새 노트북 생성 (Create new notebook)
  // ============================================================
  createNotebook: {
    classQuery: '.create-new-label, .create-button, .create-new, [class*="create-new"], mat-fab, [class*="mat-fab"]',
    cardTextMatches: ['만들기', '새노트북', 'Create', 'New'],
    buttonTextMatches: ['만들기', '새노트북', 'Createnew', 'Newnotebook', 'Create', 'New'],
    buttonQuery: 'button, [role="button"], a, div[tabindex], span[tabindex]',
    ariaQuery: '[aria-label*="만들기"], [aria-label*="Create"], [aria-label*="New notebook"], [aria-label*="새 노트북"]',
    fabTextMatches: ['+', 'add', 'add_circle'],
    fabQuery: 'button, [role="button"]',
    debugQuery: 'button, [role="button"], a, mat-fab, [class*="fab"], [class*="create"], [class*="new"]'
  },

  // ============================================================
  // 삽입/추가 버튼 텍스트 (Insert source)
  // ============================================================
  insertSource: {
    primary: { text1: '삽입', text2: 'Insert' },
    fallback: { text1: '추가', text2: 'Add' }
  },

  // ============================================================
  // 웹사이트 버튼 텍스트 (Website source type)
  // ============================================================
  websiteButton: { text1: '웹사이트', text2: 'Website' }
};
```

### Modify: `manifest.json`

**old_string:**
```json
  "content_scripts": [
    {
      "matches": ["*://notebooklm.google.com/*"],
      "js": ["content.js"]
    }
  ],
```

**new_string:**
```json
  "content_scripts": [
    {
      "matches": ["*://notebooklm.google.com/*"],
      "js": ["selectors.js", "content.js"]
    }
  ],
```

### Modify: `content.js`

Below are all the individual edits to replace hardcoded selectors with `SEL.*` references.

---

#### Edit 1: `scanAndSaveNotebooks` — project-button polling

**old_string:**
```js
    const pb = document.querySelectorAll('project-button');
    const links = document.querySelectorAll('a[href*="/notebook/"]');
    console.log(`[NLM-EXT] 폴링 ${i+1}/15: project-button=${pb.length}, a[notebook]=${links.length}`);
```

**new_string:**
```js
    const pb = document.querySelectorAll(SEL.notebook.card);
    const links = document.querySelectorAll('a[href*="/notebook/"]');
    console.log(`[NLM-EXT] 폴링 ${i+1}/15: ${SEL.notebook.card}=${pb.length}, a[notebook]=${links.length}`);
```

---

#### Edit 2: `scanAndSaveNotebooks` — querySelectorAll project-button (line ~197)

**old_string:**
```js
  const projectButtons = document.querySelectorAll('project-button');
  console.log(`[NLM-EXT] project-button 발견: ${projectButtons.length}개`);
```

**new_string:**
```js
  const projectButtons = document.querySelectorAll(SEL.notebook.card);
  console.log(`[NLM-EXT] ${SEL.notebook.card} 발견: ${projectButtons.length}개`);
```

---

#### Edit 3: `scanAndSaveNotebooks` — featured filter + title/emoji selectors

**old_string:**
```js
    if (pb.querySelector('.featured-project, .featured-project-card')) {
      console.log('[NLM-EXT] 추천 노트북 건너뜀:', pb.querySelector('.project-button-title')?.textContent?.trim());
      return;
    }

    // [id*="project-"] 요소에서 노트북 ID 추출 (UUID 형식)
    let id = null;
    const idEl = pb.querySelector('[id^="project-"]');
```

**new_string:**
```js
    if (pb.querySelector(SEL.notebook.featuredFilter)) {
      console.log('[NLM-EXT] 추천 노트북 건너뜀:', pb.querySelector(SEL.notebook.title)?.textContent?.trim());
      return;
    }

    // [id*="project-"] 요소에서 노트북 ID 추출 (UUID 형식)
    let id = null;
    const idEl = pb.querySelector(SEL.notebook.idPrefix);
```

---

#### Edit 4: `scanAndSaveNotebooks` — title and emoji elements

**old_string:**
```js
    const titleEl = pb.querySelector('.project-button-title');
    const title = titleEl ? titleEl.textContent.trim() : '(제목 없음)';
    const emojiEl = pb.querySelector('.project-button-box-icon');
```

**new_string:**
```js
    const titleEl = pb.querySelector(SEL.notebook.title);
    const title = titleEl ? titleEl.textContent.trim() : '(제목 없음)';
    const emojiEl = pb.querySelector(SEL.notebook.emoji);
```

---

#### Edit 5: `deleteNotebook` — find project-button cards

**old_string:**
```js
  const projectButtons = document.querySelectorAll('project-button');
  for (const pb of projectButtons) {
```

**new_string:**
```js
  const projectButtons = document.querySelectorAll(SEL.notebook.card);
  for (const pb of projectButtons) {
```

---

#### Edit 6: `deleteNotebook` — debug log for project IDs

**old_string:**
```js
    projectButtons.forEach(pb => {
      const idEl = pb.querySelector('[id^="project-"]');
      console.log('  -', idEl?.id);
    });
```

**new_string:**
```js
    projectButtons.forEach(pb => {
      const idEl = pb.querySelector(SEL.notebook.idPrefix);
      console.log('  -', idEl?.id);
    });
```

---

#### Edit 7: `deleteNotebook` — more button selector

**old_string:**
```js
  const moreBtn = targetCard.querySelector(
    'button[aria-label*="Actions"], button[aria-label*="actions"], button[aria-label*="메뉴"], button[aria-label*="더보기"], button[aria-label*="More"]'
  ) || targetCard.querySelector('button[class*="more"], button[class*="menu"]')
    || targetCard.querySelector('mat-card button'); // mat-card 안의 아무 버튼
```

**new_string:**
```js
  const moreBtn = targetCard.querySelector(SEL.notebookDelete.moreButton)
    || targetCard.querySelector(SEL.notebookDelete.moreButtonFallback1)
    || targetCard.querySelector(SEL.notebookDelete.moreButtonFallback2);
```

---

#### Edit 8: `deleteNotebook` — menu item selectors and delete text matches

**old_string:**
```js
  const menuItems = Array.from(document.querySelectorAll('.mat-mdc-menu-item, [role="menuitem"], .cdk-overlay-pane button'));
  console.log('[NLM-EXT] 메뉴 항목들:', menuItems.map(el => el.textContent.trim()));
  const deleteItem = menuItems.find(el => {
    const text = el.textContent.replace(/\s+/g, '');
    return text.includes('삭제') || text.includes('Delete') || text.includes('delete')
      || text.includes('휴지통') || text.includes('Trash') || text.includes('Remove');
  });
```

**new_string:**
```js
  const menuItems = Array.from(document.querySelectorAll(SEL.notebookDelete.menuItem));
  console.log('[NLM-EXT] 메뉴 항목들:', menuItems.map(el => el.textContent.trim()));
  const deleteItem = menuItems.find(el => {
    const text = el.textContent.replace(/\s+/g, '');
    return SEL.notebookDelete.deleteTextMatches.some(m => text.includes(m));
  });
```

---

#### Edit 9: `deleteNotebook` — confirm dialog selectors

**old_string:**
```js
  const confirmBtn = document.querySelector(
    '[role="dialog"] button[type="submit"], ' +
    '.mat-mdc-dialog-container button[type="submit"], ' +
    '.cdk-overlay-pane button[color="warn"], ' +
    '[role="dialog"] button.mat-warn'
  ) || Array.from(document.querySelectorAll('[role="dialog"] button, .cdk-overlay-pane button, .mat-mdc-dialog-container button')).find(btn => {
    const text = (btn.textContent || '').replace(/\s+/g, '');
    return (text.includes('삭제') || text.includes('Delete') || text.includes('이동') || text.includes('Move')) &&
           btn.getBoundingClientRect().width > 0 &&
           !btn.disabled;
  });
```

**new_string:**
```js
  const confirmBtn = document.querySelector(SEL.notebookDelete.confirmDialog)
    || Array.from(document.querySelectorAll(SEL.notebookDelete.confirmFallbackQuery)).find(btn => {
      const text = (btn.textContent || '').replace(/\s+/g, '');
      return SEL.notebookDelete.confirmTextMatches.some(m => text.includes(m)) &&
             btn.getBoundingClientRect().width > 0 &&
             !btn.disabled;
    });
```

---

#### Edit 10: `deleteAllSources` — more button and menu selectors

**old_string:**
```js
    const moreButtons = Array.from(document.querySelectorAll('button[aria-label="더보기"]'))
      .filter(b => b.getBoundingClientRect().width > 0);
    if (moreButtons.length === 0) break;
    sendStatus('소스 삭제 중...', `남은 소스: ${moreButtons.length}개`);
    moreButtons[0].click();
    await sleep(1000);
    const menuItems = Array.from(document.querySelectorAll('.mat-mdc-menu-item'));
    const del = menuItems.find(el =>
      el.textContent.replace(/\s+/g, '').includes('소스삭제') && el.getBoundingClientRect().width > 0
    );
```

**new_string:**
```js
    const moreButtons = Array.from(document.querySelectorAll(SEL.sourceDelete.moreButton))
      .filter(b => b.getBoundingClientRect().width > 0);
    if (moreButtons.length === 0) break;
    sendStatus('소스 삭제 중...', `남은 소스: ${moreButtons.length}개`);
    moreButtons[0].click();
    await sleep(1000);
    const menuItems = Array.from(document.querySelectorAll(SEL.sourceDelete.menuItem));
    const del = menuItems.find(el =>
      el.textContent.replace(/\s+/g, '').includes(SEL.sourceDelete.menuTextMatch) && el.getBoundingClientRect().width > 0
    );
```

---

#### Edit 11: `deleteAllSources` — confirm button

**old_string:**
```js
    const conf = await waitForButton('button[aria-label="삭제 확인"]', 5000);
```

**new_string:**
```js
    const conf = await waitForButton(SEL.sourceDelete.confirmButton, 5000);
```

---

#### Edit 12: `runAutomation` — add source button aria-label loop

**old_string:**
```js
  let addSourceBtn = null;
  const ariaLabels = ['소스 추가', '출처 추가', 'Add source', 'Add sources'];
  for (const label of ariaLabels) {
    addSourceBtn = document.querySelector(`button[aria-label="${label}"]`);
    if (addSourceBtn && addSourceBtn.getBoundingClientRect().width > 0) break;
    addSourceBtn = null;
  }
  // fallback: 텍스트 기반 탐색
  if (!addSourceBtn) {
    addSourceBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(btn => {
      const text = (btn.textContent || '').replace(/\s+/g, '');
      return (text.includes('소스추가') || text.includes('출처추가') || text.includes('Addsource'))
        && btn.getBoundingClientRect().width > 0;
    });
  }
```

**new_string:**
```js
  let addSourceBtn = null;
  for (const label of SEL.addSource.ariaLabels) {
    addSourceBtn = document.querySelector(`button[aria-label="${label}"]`);
    if (addSourceBtn && addSourceBtn.getBoundingClientRect().width > 0) break;
    addSourceBtn = null;
  }
  // fallback: 텍스트 기반 탐색
  if (!addSourceBtn) {
    addSourceBtn = Array.from(document.querySelectorAll(SEL.addSource.buttonQuery)).find(btn => {
      const text = (btn.textContent || '').replace(/\s+/g, '');
      return SEL.addSource.textMatches.some(m => text.includes(m))
        && btn.getBoundingClientRect().width > 0;
    });
  }
```

---

#### Edit 13: `runAutomation` — website button, URL input, chat input, submit button

**old_string:**
```js
  await clickButtonByText('웹사이트', 'Website');
  const inputField = await waitForVisibleElement('textarea[formcontrolname="urls"], textarea[aria-label="URL 입력"]');
```

**new_string:**
```js
  await clickButtonByText(SEL.websiteButton.text1, SEL.websiteButton.text2);
  const inputField = await waitForVisibleElement(SEL.urlInput);
```

---

#### Edit 14: `runAutomation` — insert/add buttons

**old_string:**
```js
  await clickButtonByText('삽입', 'Insert');
  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText('추가', 'Add', 3000); } catch(_) {}
```

**new_string:**
```js
  await clickButtonByText(SEL.insertSource.primary.text1, SEL.insertSource.primary.text2);
  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText(SEL.insertSource.fallback.text1, SEL.insertSource.fallback.text2, 3000); } catch(_) {}
```

---

#### Edit 15: `runAutomation` — chat input selector

**old_string:**
```js
  const chatInput = await waitForVisibleElement('textarea.query-box-input, textarea[placeholder*="시작"], textarea[aria-label*="query"], textarea[aria-label*="쿼리"], main textarea', 90000);
```

**new_string:**
```js
  const chatInput = await waitForVisibleElement(SEL.chatInput, 90000);
```

---

#### Edit 16: `runAutomation` — submit button

**old_string:**
```js
    const sendBtn = await waitForVisibleElement('button[aria-label="제출"]:not([disabled]), button.submit-button:not([disabled])', 10000);
```

**new_string:**
```js
    const sendBtn = await waitForVisibleElement(SEL.submitButton, 10000);
```

---

#### Edit 17: `injectCopyButton` — response content selectors

**old_string:**
```js
    const blocks = Array.from(
      document.querySelectorAll('.response-container,.model-response,[class*="response"],.markdown-content,.chat-message')
    ).filter(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().length > 50);
```

**new_string:**
```js
    const blocks = Array.from(
      document.querySelectorAll(SEL.responseContent)
    ).filter(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().length > 50);
```

---

#### Edit 18: `CREATE_NOTEBOOK` handler — debug query

**old_string:**
```js
      const allClickable = document.querySelectorAll('button, [role="button"], a, mat-fab, [class*="fab"], [class*="create"], [class*="new"]');
```

**new_string:**
```js
      const allClickable = document.querySelectorAll(SEL.createNotebook.debugQuery);
```

---

#### Edit 19: `CREATE_NOTEBOOK` handler — class-based create button

**old_string:**
```js
      // 1) 클래스 기반: create-new, create-button, fab
      createBtn = document.querySelector('.create-new-label, .create-button, .create-new, [class*="create-new"], mat-fab, [class*="mat-fab"]');
```

**new_string:**
```js
      // 1) 클래스 기반: create-new, create-button, fab
      createBtn = document.querySelector(SEL.createNotebook.classQuery);
```

---

#### Edit 20: `CREATE_NOTEBOOK` handler — project-button text search

**old_string:**
```js
      if (!createBtn) {
        createBtn = [...document.querySelectorAll('project-button')].find(pb => {
          const text = pb.textContent.replace(/\s+/g, '');
          return text.includes('만들기') || text.includes('새노트북') || text.includes('Create') || text.includes('New');
        });
      }
```

**new_string:**
```js
      if (!createBtn) {
        createBtn = [...document.querySelectorAll(SEL.notebook.card)].find(pb => {
          const text = pb.textContent.replace(/\s+/g, '');
          return SEL.createNotebook.cardTextMatches.some(m => text.includes(m));
        });
      }
```

---

#### Edit 21: `CREATE_NOTEBOOK` handler — generic element text search

**old_string:**
```js
      if (!createBtn) {
        createBtn = [...document.querySelectorAll('button, [role="button"], a, div[tabindex], span[tabindex]')].find(el => {
          const text = (el.textContent || '').replace(/\s+/g, '');
          return (text.includes('만들기') || text.includes('새노트북') || text.includes('Createnew') || text.includes('Newnotebook') || text === 'Create' || text === 'New')
            && el.getBoundingClientRect().width > 0;
        });
      }
```

**new_string:**
```js
      if (!createBtn) {
        createBtn = [...document.querySelectorAll(SEL.createNotebook.buttonQuery)].find(el => {
          const text = (el.textContent || '').replace(/\s+/g, '');
          return SEL.createNotebook.buttonTextMatches.some(m => text.includes(m) || text === m)
            && el.getBoundingClientRect().width > 0;
        });
      }
```

---

#### Edit 22: `CREATE_NOTEBOOK` handler — aria-label search

**old_string:**
```js
      if (!createBtn) {
        createBtn = document.querySelector('[aria-label*="만들기"], [aria-label*="Create"], [aria-label*="New notebook"], [aria-label*="새 노트북"]');
      }
```

**new_string:**
```js
      if (!createBtn) {
        createBtn = document.querySelector(SEL.createNotebook.ariaQuery);
      }
```

---

#### Edit 23: `CREATE_NOTEBOOK` handler — FAB plus icon search

**old_string:**
```js
      if (!createBtn) {
        createBtn = [...document.querySelectorAll('button, [role="button"]')].find(el => {
          const text = (el.textContent || '').trim();
          return (text === '+' || text === 'add' || text.includes('add_circle'))
            && el.getBoundingClientRect().width > 0;
        });
      }
```

**new_string:**
```js
      if (!createBtn) {
        createBtn = [...document.querySelectorAll(SEL.createNotebook.fabQuery)].find(el => {
          const text = (el.textContent || '').trim();
          return SEL.createNotebook.fabTextMatches.some(m => text === m || text.includes(m))
            && el.getBoundingClientRect().width > 0;
        });
      }
```

---

#### Edit 24: Homepage auto-scan — project-button polling

**old_string:**
```js
      const cards = document.querySelectorAll('project-button');
```

**new_string:**
```js
      const cards = document.querySelectorAll(SEL.notebook.card);
```

---

### Manual Verification Steps

1. Reload the extension at `chrome://extensions`.
2. Open DevTools on the NotebookLM tab. In the console, type `SEL` and press Enter. Confirm the full selector object is printed (it should be available as a global variable since `selectors.js` loads before `content.js`).
3. Navigate to `https://notebooklm.google.com/`. Confirm notebook cards are scanned (check console for `[NLM-EXT] project-button 발견` or `[NLM-EXT] project-button 발견` log).
4. Open the popup, select a notebook, click "전체 요약" on a YouTube page. Confirm the full automation runs: source add, URL input, prompt input, submit.
5. Test "기존 소스 삭제 후 추가" checkbox: confirm sources are deleted then re-added.
6. Test notebook deletion from the popup list. Confirm the delete flow (more button, menu, confirm) works.
7. Test "새 노트북" flow (no notebook selected): confirm the create-new button is found and clicked.
8. Verify no `undefined` or `null` errors in console related to selectors.

### Commit Message

```
refactor(content): extract hardcoded selectors into selectors.js registry

Centralizes 40+ CSS selectors and text-match arrays into a single
SEL object. content.js now references SEL.* instead of inline strings,
making DOM selector updates a single-file change.
```

---

## Task 3 — `withRetry` Wrapper Utility

### Problem

DOM operations in `runAutomation` use fixed `sleep()` delays and single-attempt element lookups. On slow connections or when NotebookLM loads lazily, these fail silently or throw uncaught errors. A generic retry wrapper with exponential backoff makes every step resilient.

### Files to Create/Modify

| File | Action |
|------|--------|
| `C:\jnk\1000_notebooklm\retry.js` | **Create** new file |
| `C:\jnk\1000_notebooklm\manifest.json` | **Modify** — add `retry.js` to content_scripts |
| `C:\jnk\1000_notebooklm\content.js` | **Modify** — wrap key operations in `withRetry` |

### New File: `retry.js`

Create `C:\jnk\1000_notebooklm\retry.js`:

```js
// retry.js — Generic retry wrapper with exponential backoff
// Loaded before content.js via manifest content_scripts.

/**
 * Retries an async function up to `maxAttempts` times with exponential backoff.
 *
 * @param {Function} fn        - Async function to execute. Must throw to trigger retry.
 * @param {object}   opts
 * @param {number}   opts.maxAttempts  - Maximum number of attempts (default: 3)
 * @param {number}   opts.baseDelay    - Initial delay in ms before first retry (default: 1000)
 * @param {number}   opts.maxDelay     - Maximum delay cap in ms (default: 8000)
 * @param {string}   opts.label        - Human-readable label for log messages (default: 'withRetry')
 * @param {Function} opts.onRetry      - Optional callback(attempt, error) called before each retry
 * @returns {Promise<*>} — The return value of fn() on success
 * @throws — The last error if all attempts are exhausted
 */
const withRetry = async (fn, opts = {}) => {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 8000,
    label = 'withRetry',
    onRetry = null
  } = opts;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[${label}] 시도 ${attempt}/${maxAttempts} 실패:`, err.message);

      if (attempt === maxAttempts) break;

      // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      console.log(`[${label}] ${delay}ms 후 재시도...`);

      if (onRetry) {
        try { onRetry(attempt, err); } catch (_) {}
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
```

### Modify: `manifest.json`

After Task 2, the content_scripts js array is `["selectors.js", "content.js"]`. Now add `retry.js`:

**old_string:**
```json
      "js": ["selectors.js", "content.js"]
```

**new_string:**
```json
      "js": ["selectors.js", "retry.js", "content.js"]
```

### Modify: `content.js` — Wrap `runAutomation` Steps

Replace the entire `runAutomation` function body with retry-wrapped steps. The function signature stays the same.

**old_string:**
```js
const runAutomation = async (url, type, lang, length) => {
  showOverlay('소스 추가 중...', '소스 추가 버튼을 찾고 있습니다');
  sendStatus('소스 추가 중...', '소스 추가 버튼을 찾고 있습니다');
  await sleep(2000);

  // 소스 추가 버튼 — 여러 셀렉터 시도
  let addSourceBtn = null;
  for (const label of SEL.addSource.ariaLabels) {
    addSourceBtn = document.querySelector(`button[aria-label="${label}"]`);
    if (addSourceBtn && addSourceBtn.getBoundingClientRect().width > 0) break;
    addSourceBtn = null;
  }
  // fallback: 텍스트 기반 탐색
  if (!addSourceBtn) {
    addSourceBtn = Array.from(document.querySelectorAll(SEL.addSource.buttonQuery)).find(btn => {
      const text = (btn.textContent || '').replace(/\s+/g, '');
      return SEL.addSource.textMatches.some(m => text.includes(m))
        && btn.getBoundingClientRect().width > 0;
    });
  }
  if (!addSourceBtn) {
    // 디버그: 페이지의 모든 버튼 aria-label 출력
    console.log('[NLM-EXT] 소스 추가 버튼 못 찾음. 페이지 버튼 목록:',
      Array.from(document.querySelectorAll('button')).map(b => `"${b.getAttribute('aria-label') || b.textContent.trim().substring(0,30)}"`));
    throw new Error('소스 추가 버튼을 찾지 못했습니다');
  }

  console.log('[NLM-EXT] 소스 추가 버튼 클릭:', addSourceBtn.getAttribute('aria-label'));
  addSourceBtn.click();
  await sleep(1000);
  updateOverlay('웹사이트 소스 선택 중...', 'URL 입력 창을 열고 있습니다');
  await clickButtonByText(SEL.websiteButton.text1, SEL.websiteButton.text2);
  const inputField = await waitForVisibleElement(SEL.urlInput);
  inputField.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(inputField, url);
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  inputField.dispatchEvent(new Event('change', { bubbles: true }));
  inputField.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(2000);
  await clickButtonByText(SEL.insertSource.primary.text1, SEL.insertSource.primary.text2);
  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText(SEL.insertSource.fallback.text1, SEL.insertSource.fallback.text2, 3000); } catch(_) {}

  updateOverlay('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  sendStatus('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  const myPrompt = buildPrompt(type, lang, length);
  const chatInput = await waitForVisibleElement(SEL.chatInput, 90000);
  await sleep(2000);
  chatInput.focus();
  const chatSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  chatSetter.call(chatInput, myPrompt);
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  chatInput.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1000);
  try {
    const sendBtn = await waitForVisibleElement(SEL.submitButton, 10000);
    (sendBtn.closest('button') || sendBtn).click();
  } catch (_) {
    chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
  }

  injectCopyButton();
  updateOverlay('완료!', 'NotebookLM이 응답을 생성하고 있습니다');
  hideOverlay(2000);
  sendStatus('완료!', 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능', 'success');
};
```

**new_string:**
```js
const runAutomation = async (url, type, lang, length) => {
  // ----------------------------------------------------------
  // Step 1: 소스 추가 버튼 찾기 + 클릭
  // ----------------------------------------------------------
  showOverlay('소스 추가 중...', '소스 추가 버튼을 찾고 있습니다');
  sendStatus('소스 추가 중...', '소스 추가 버튼을 찾고 있습니다');
  await sleep(2000);

  await withRetry(async () => {
    let addSourceBtn = null;
    for (const label of SEL.addSource.ariaLabels) {
      addSourceBtn = document.querySelector(`button[aria-label="${label}"]`);
      if (addSourceBtn && addSourceBtn.getBoundingClientRect().width > 0) break;
      addSourceBtn = null;
    }
    if (!addSourceBtn) {
      addSourceBtn = Array.from(document.querySelectorAll(SEL.addSource.buttonQuery)).find(btn => {
        const text = (btn.textContent || '').replace(/\s+/g, '');
        return SEL.addSource.textMatches.some(m => text.includes(m))
          && btn.getBoundingClientRect().width > 0;
      });
    }
    if (!addSourceBtn) {
      console.log('[NLM-EXT] 소스 추가 버튼 못 찾음. 페이지 버튼 목록:',
        Array.from(document.querySelectorAll('button')).map(b => `"${b.getAttribute('aria-label') || b.textContent.trim().substring(0,30)}"`));
      throw new Error('소스 추가 버튼을 찾지 못했습니다');
    }
    console.log('[NLM-EXT] 소스 추가 버튼 클릭:', addSourceBtn.getAttribute('aria-label'));
    addSourceBtn.click();
  }, { maxAttempts: 3, baseDelay: 2000, label: 'addSourceBtn' });

  // ----------------------------------------------------------
  // Step 2: 웹사이트 선택 + URL 입력 + 삽입
  // ----------------------------------------------------------
  await sleep(1000);
  updateOverlay('웹사이트 소스 선택 중...', 'URL 입력 창을 열고 있습니다');

  await withRetry(async () => {
    await clickButtonByText(SEL.websiteButton.text1, SEL.websiteButton.text2);
  }, { maxAttempts: 3, baseDelay: 1000, label: 'websiteBtn' });

  const inputField = await waitForVisibleElement(SEL.urlInput);
  inputField.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(inputField, url);
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  inputField.dispatchEvent(new Event('change', { bubbles: true }));
  inputField.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(2000);

  await withRetry(async () => {
    await clickButtonByText(SEL.insertSource.primary.text1, SEL.insertSource.primary.text2);
  }, { maxAttempts: 3, baseDelay: 1000, label: 'insertBtn' });

  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText(SEL.insertSource.fallback.text1, SEL.insertSource.fallback.text2, 3000); } catch(_) {}

  // ----------------------------------------------------------
  // Step 3: 프롬프트 입력
  // ----------------------------------------------------------
  updateOverlay('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  sendStatus('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  const myPrompt = buildPrompt(type, lang, length);
  const chatInput = await waitForVisibleElement(SEL.chatInput, 90000);
  await sleep(2000);
  chatInput.focus();
  const chatSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  chatSetter.call(chatInput, myPrompt);
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  chatInput.dispatchEvent(new Event('change', { bubbles: true }));

  // ----------------------------------------------------------
  // Step 4: 전송
  // ----------------------------------------------------------
  await sleep(1000);

  await withRetry(async () => {
    try {
      const sendBtn = await waitForVisibleElement(SEL.submitButton, 10000);
      (sendBtn.closest('button') || sendBtn).click();
    } catch (_) {
      chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
  }, { maxAttempts: 2, baseDelay: 2000, label: 'submitBtn' });

  // ----------------------------------------------------------
  // Step 5: 완료
  // ----------------------------------------------------------
  injectCopyButton();
  updateOverlay('완료!', 'NotebookLM이 응답을 생성하고 있습니다');
  hideOverlay(2000);
  sendStatus('완료!', 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능', 'success');
};
```

### Manual Verification Steps

1. Reload the extension at `chrome://extensions`.
2. Open DevTools on the NotebookLM tab. In the console, type `withRetry` and press Enter. Confirm it is a function (loaded from `retry.js`).
3. Test the happy path: open a YouTube video, click "전체 요약". The automation should complete normally with no retry log messages.
4. Test retry behavior: temporarily add a 0ms timeout to `waitForVisibleElement` for the URL input selector (or rename the selector to something invalid), then run automation. Observe in the console:
   - `[addSourceBtn] 시도 1/3 실패: ...`
   - `[addSourceBtn] 2000ms 후 재시도...`
   - (retries up to 3 times before throwing)
5. Revert the intentional breakage.
6. Confirm the overlay and popup status messages update correctly through all steps.
7. Confirm error messages still appear in the popup when all retries are exhausted.

### Commit Message

```
feat(content): add withRetry wrapper for resilient DOM operations

Introduces retry.js with exponential backoff (configurable attempts,
baseDelay, maxDelay). Wraps the 4 critical click operations in
runAutomation so transient DOM timing issues are retried automatically.
```

---

## Task 4 — Progress 5-Step Granularity

### Problem

The current overlay and popup status messages are ad-hoc strings with no structure. The user sees vague messages like "소스 추가 중..." with no sense of overall progress. Both the overlay and popup should show a clear step indicator (e.g., "2/5") so the user knows exactly where the automation is.

### Design

Five automation steps:

| Step | Label (KO) | Label (EN context) |
|------|-----------|---------------------|
| 1/5 | 소스 추가 버튼 클릭 | Click add-source button |
| 2/5 | URL 입력 및 삽입 | Enter URL and insert |
| 3/5 | 프롬프트 입력 | Enter prompt |
| 4/5 | 프롬프트 전송 | Submit prompt |
| 5/5 | 완료 | Done |

The overlay will show a step progress bar. The popup will show step numbers in the status text.

### Files to Modify

| File | Action |
|------|--------|
| `C:\jnk\1000_notebooklm\content.js` | **Modify** — add progress helpers, update overlay HTML, update `runAutomation` |

### Modify: `content.js`

---

#### Edit A: Add progress constants and helper after `sendStatus` function

**old_string:**
```js
// ============================================================
// 로딩 오버레이
// ============================================================
```

**new_string:**
```js
// ============================================================
// 5-Step Progress
// ============================================================

const STEPS = [
  { step: 1, label: '소스 추가 버튼 클릭', sub: '소스 추가 버튼을 찾고 있습니다' },
  { step: 2, label: 'URL 입력 및 삽입', sub: 'URL을 입력하고 소스를 삽입합니다' },
  { step: 3, label: '프롬프트 입력', sub: '질문을 작성하고 있습니다' },
  { step: 4, label: '프롬프트 전송', sub: '질문을 전송하고 있습니다' },
  { step: 5, label: '완료', sub: 'NotebookLM이 응답을 생성하고 있습니다' }
];

const TOTAL_STEPS = STEPS.length;

const setProgress = (stepNumber, customSub) => {
  const info = STEPS.find(s => s.step === stepNumber);
  if (!info) return;
  const text = `[${info.step}/${TOTAL_STEPS}] ${info.label}`;
  const sub = customSub || info.sub;
  updateOverlay(text, sub);
  updateProgressBar(stepNumber);
  sendStatus(text, sub, stepNumber === TOTAL_STEPS ? 'success' : 'progress');
};

const updateProgressBar = (stepNumber) => {
  const bar = document.getElementById('nlm-progress-fill');
  if (!bar) return;
  const pct = Math.round((stepNumber / TOTAL_STEPS) * 100);
  bar.style.width = `${pct}%`;

  const stepText = document.getElementById('nlm-progress-step');
  if (stepText) stepText.textContent = `${stepNumber} / ${TOTAL_STEPS}`;
};

// ============================================================
// 로딩 오버레이
// ============================================================
```

---

#### Edit B: Update overlay HTML to include progress bar

**old_string:**
```js
    overlay = document.createElement('div');
    overlay.id = 'nlm-ext-overlay';
    overlay.innerHTML = `
      <div class="nlm-spinner"></div>
      <div class="nlm-overlay-text"></div>
      <div class="nlm-overlay-sub"></div>
    `;
```

**new_string:**
```js
    overlay = document.createElement('div');
    overlay.id = 'nlm-ext-overlay';
    overlay.innerHTML = `
      <div class="nlm-spinner"></div>
      <div class="nlm-overlay-text"></div>
      <div class="nlm-overlay-sub"></div>
      <div class="nlm-progress-bar-container">
        <div class="nlm-progress-fill" id="nlm-progress-fill"></div>
      </div>
      <div class="nlm-progress-step" id="nlm-progress-step"></div>
    `;
```

---

#### Edit C: Add progress bar CSS to the injected stylesheet

**old_string:**
```js
    @keyframes nlm-spin { to { transform: rotate(360deg); } }
  `;
```

**new_string:**
```js
    @keyframes nlm-spin { to { transform: rotate(360deg); } }
    #nlm-ext-overlay .nlm-progress-bar-container {
      margin-top: 20px; width: 220px; height: 6px;
      background: rgba(255,255,255,.15); border-radius: 3px; overflow: hidden;
    }
    #nlm-ext-overlay .nlm-progress-fill {
      height: 100%; width: 0%; background: #3b82f6;
      border-radius: 3px; transition: width .4s ease;
    }
    #nlm-ext-overlay .nlm-progress-step {
      margin-top: 8px; color: rgba(255,255,255,.5); font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  `;
```

---

#### Edit D: Update `runAutomation` to use `setProgress`

Replace the step comments and status calls inside the retry-wrapped `runAutomation` (from Task 3):

**old_string:**
```js
  // ----------------------------------------------------------
  // Step 1: 소스 추가 버튼 찾기 + 클릭
  // ----------------------------------------------------------
  showOverlay('소스 추가 중...', '소스 추가 버튼을 찾고 있습니다');
  sendStatus('소스 추가 중...', '소스 추가 버튼을 찾고 있습니다');
  await sleep(2000);

  await withRetry(async () => {
    let addSourceBtn = null;
    for (const label of SEL.addSource.ariaLabels) {
      addSourceBtn = document.querySelector(`button[aria-label="${label}"]`);
      if (addSourceBtn && addSourceBtn.getBoundingClientRect().width > 0) break;
      addSourceBtn = null;
    }
    if (!addSourceBtn) {
      addSourceBtn = Array.from(document.querySelectorAll(SEL.addSource.buttonQuery)).find(btn => {
        const text = (btn.textContent || '').replace(/\s+/g, '');
        return SEL.addSource.textMatches.some(m => text.includes(m))
          && btn.getBoundingClientRect().width > 0;
      });
    }
    if (!addSourceBtn) {
      console.log('[NLM-EXT] 소스 추가 버튼 못 찾음. 페이지 버튼 목록:',
        Array.from(document.querySelectorAll('button')).map(b => `"${b.getAttribute('aria-label') || b.textContent.trim().substring(0,30)}"`));
      throw new Error('소스 추가 버튼을 찾지 못했습니다');
    }
    console.log('[NLM-EXT] 소스 추가 버튼 클릭:', addSourceBtn.getAttribute('aria-label'));
    addSourceBtn.click();
  }, { maxAttempts: 3, baseDelay: 2000, label: 'addSourceBtn' });

  // ----------------------------------------------------------
  // Step 2: 웹사이트 선택 + URL 입력 + 삽입
  // ----------------------------------------------------------
  await sleep(1000);
  updateOverlay('웹사이트 소스 선택 중...', 'URL 입력 창을 열고 있습니다');

  await withRetry(async () => {
    await clickButtonByText(SEL.websiteButton.text1, SEL.websiteButton.text2);
  }, { maxAttempts: 3, baseDelay: 1000, label: 'websiteBtn' });

  const inputField = await waitForVisibleElement(SEL.urlInput);
  inputField.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(inputField, url);
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  inputField.dispatchEvent(new Event('change', { bubbles: true }));
  inputField.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(2000);

  await withRetry(async () => {
    await clickButtonByText(SEL.insertSource.primary.text1, SEL.insertSource.primary.text2);
  }, { maxAttempts: 3, baseDelay: 1000, label: 'insertBtn' });

  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText(SEL.insertSource.fallback.text1, SEL.insertSource.fallback.text2, 3000); } catch(_) {}

  // ----------------------------------------------------------
  // Step 3: 프롬프트 입력
  // ----------------------------------------------------------
  updateOverlay('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  sendStatus('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  const myPrompt = buildPrompt(type, lang, length);
  const chatInput = await waitForVisibleElement(SEL.chatInput, 90000);
  await sleep(2000);
  chatInput.focus();
  const chatSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  chatSetter.call(chatInput, myPrompt);
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  chatInput.dispatchEvent(new Event('change', { bubbles: true }));

  // ----------------------------------------------------------
  // Step 4: 전송
  // ----------------------------------------------------------
  await sleep(1000);

  await withRetry(async () => {
    try {
      const sendBtn = await waitForVisibleElement(SEL.submitButton, 10000);
      (sendBtn.closest('button') || sendBtn).click();
    } catch (_) {
      chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
  }, { maxAttempts: 2, baseDelay: 2000, label: 'submitBtn' });

  // ----------------------------------------------------------
  // Step 5: 완료
  // ----------------------------------------------------------
  injectCopyButton();
  updateOverlay('완료!', 'NotebookLM이 응답을 생성하고 있습니다');
  hideOverlay(2000);
  sendStatus('완료!', 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능', 'success');
```

**new_string:**
```js
  // ----------------------------------------------------------
  // Step 1/5: 소스 추가 버튼 찾기 + 클릭
  // ----------------------------------------------------------
  showOverlay('자동화 시작...', '준비 중');
  setProgress(1);
  await sleep(2000);

  await withRetry(async () => {
    let addSourceBtn = null;
    for (const label of SEL.addSource.ariaLabels) {
      addSourceBtn = document.querySelector(`button[aria-label="${label}"]`);
      if (addSourceBtn && addSourceBtn.getBoundingClientRect().width > 0) break;
      addSourceBtn = null;
    }
    if (!addSourceBtn) {
      addSourceBtn = Array.from(document.querySelectorAll(SEL.addSource.buttonQuery)).find(btn => {
        const text = (btn.textContent || '').replace(/\s+/g, '');
        return SEL.addSource.textMatches.some(m => text.includes(m))
          && btn.getBoundingClientRect().width > 0;
      });
    }
    if (!addSourceBtn) {
      console.log('[NLM-EXT] 소스 추가 버튼 못 찾음. 페이지 버튼 목록:',
        Array.from(document.querySelectorAll('button')).map(b => `"${b.getAttribute('aria-label') || b.textContent.trim().substring(0,30)}"`));
      throw new Error('소스 추가 버튼을 찾지 못했습니다');
    }
    console.log('[NLM-EXT] 소스 추가 버튼 클릭:', addSourceBtn.getAttribute('aria-label'));
    addSourceBtn.click();
  }, { maxAttempts: 3, baseDelay: 2000, label: 'addSourceBtn',
       onRetry: (attempt) => updateOverlay(`[1/${TOTAL_STEPS}] 소스 추가 버튼 클릭`, `재시도 ${attempt}회...`) });

  // ----------------------------------------------------------
  // Step 2/5: 웹사이트 선택 + URL 입력 + 삽입
  // ----------------------------------------------------------
  setProgress(2);
  await sleep(1000);

  await withRetry(async () => {
    await clickButtonByText(SEL.websiteButton.text1, SEL.websiteButton.text2);
  }, { maxAttempts: 3, baseDelay: 1000, label: 'websiteBtn' });

  const inputField = await waitForVisibleElement(SEL.urlInput);
  inputField.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(inputField, url);
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  inputField.dispatchEvent(new Event('change', { bubbles: true }));
  inputField.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(2000);

  await withRetry(async () => {
    await clickButtonByText(SEL.insertSource.primary.text1, SEL.insertSource.primary.text2);
  }, { maxAttempts: 3, baseDelay: 1000, label: 'insertBtn' });

  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText(SEL.insertSource.fallback.text1, SEL.insertSource.fallback.text2, 3000); } catch(_) {}

  // ----------------------------------------------------------
  // Step 3/5: 프롬프트 입력
  // ----------------------------------------------------------
  setProgress(3);
  const myPrompt = buildPrompt(type, lang, length);
  const chatInput = await waitForVisibleElement(SEL.chatInput, 90000);
  await sleep(2000);
  chatInput.focus();
  const chatSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  chatSetter.call(chatInput, myPrompt);
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  chatInput.dispatchEvent(new Event('change', { bubbles: true }));

  // ----------------------------------------------------------
  // Step 4/5: 전송
  // ----------------------------------------------------------
  setProgress(4);
  await sleep(1000);

  await withRetry(async () => {
    try {
      const sendBtn = await waitForVisibleElement(SEL.submitButton, 10000);
      (sendBtn.closest('button') || sendBtn).click();
    } catch (_) {
      chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
  }, { maxAttempts: 2, baseDelay: 2000, label: 'submitBtn' });

  // ----------------------------------------------------------
  // Step 5/5: 완료
  // ----------------------------------------------------------
  setProgress(5, 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능');
  injectCopyButton();
  hideOverlay(2000);
```

---

### Manual Verification Steps

1. Reload the extension at `chrome://extensions`.
2. Open a YouTube video page, click "전체 요약" in the popup.
3. On the NotebookLM tab, observe the overlay:
   - The spinner and text should show `[1/5] 소스 추가 버튼 클릭`.
   - A blue progress bar should appear below the spinner text, filling ~20%.
   - A small `1 / 5` step counter should appear below the bar.
4. As automation progresses, verify:
   - Step 2: bar at ~40%, text `[2/5] URL 입력 및 삽입`
   - Step 3: bar at ~60%, text `[3/5] 프롬프트 입력`
   - Step 4: bar at ~80%, text `[4/5] 프롬프트 전송`
   - Step 5: bar at 100%, text `[5/5] 완료`, then overlay fades out
5. In the popup, confirm status messages update with step numbers: `[1/5]`, `[2/5]`, etc.
6. If automation fails at any step, confirm:
   - The retry `onRetry` callback updates the overlay with "재시도 N회..."
   - After all retries are exhausted, the error is shown with the last step number visible.
7. Verify the progress bar has a smooth CSS transition (0.4s ease) and does not jump.

### Commit Message

```
feat(content): add 5-step progress bar to overlay and popup status

Each runAutomation step now reports structured progress [N/5] to both
the in-page overlay (with animated progress bar) and the popup status
area, giving users clear visibility into automation state.
```

---

## Implementation Order & Dependencies

```
Task 1 (background.js rewrite)
  └─ Independent — no prerequisite

Task 2 (selectors.js extraction)
  └─ Independent — no prerequisite
  └─ Creates selectors.js, modifies manifest.json + content.js

Task 3 (withRetry wrapper)
  └─ Depends on Task 2 — uses SEL.* references in the retry-wrapped code
  └─ Creates retry.js, modifies manifest.json + content.js

Task 4 (Progress 5-step)
  └─ Depends on Task 3 — modifies the retry-wrapped runAutomation from Task 3
  └─ Modifies content.js only
```

**Recommended execution**: Task 1, then Task 2, then Task 3, then Task 4.

Tasks 1 and 2 can be done in parallel since they touch different files (Task 1 only touches `background.js`; Task 2 touches `selectors.js`, `manifest.json`, and `content.js`). However, sequential execution is safer for manual verification.

---

## Final File State After All 4 Tasks

| File | Status |
|------|--------|
| `background.js` | Rewritten (chrome.storage.session) |
| `selectors.js` | New (selector registry) |
| `retry.js` | New (withRetry utility) |
| `content.js` | Modified (SEL references, withRetry wrapping, 5-step progress) |
| `manifest.json` | Modified (content_scripts: `["selectors.js", "retry.js", "content.js"]`) |
| `index.html` | Unchanged |
| `popup.js` | Unchanged |

---

## Rollback Plan

Since there is no build tooling, rollback is straightforward:

1. Revert `background.js` to the original (remove async storage helpers, restore `let pendingTask = null`).
2. Delete `selectors.js` and `retry.js`.
3. Revert `manifest.json` content_scripts to `["content.js"]`.
4. Revert `content.js` to the original (restore hardcoded selectors, remove withRetry calls, remove progress bar code).
5. Reload the unpacked extension.
