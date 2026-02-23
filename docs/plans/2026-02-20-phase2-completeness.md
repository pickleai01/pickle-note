# Phase 2 Implementation Plan — Feature Completeness

> **Date**: 2026-02-20
> **Scope**: Tasks 5–8 (Days 5–11)
> **Prereq**: Phase 1 complete (chrome.storage.session for pendingTask, selectors.js, withRetry, 5-step overlay)
> **Stack**: Chrome Extension Manifest V3, Vanilla JS, no build tools, manual testing

---

## Table of Contents

1. [Task 5: Custom Prompt Slots (Day 5-6)](#task-5-custom-prompt-slots-day-5-6)
2. [Task 6: Two New Presets — STUDY_NOTE & MEETING_MEMO (Day 7-8)](#task-6-two-new-presets-day-7-8)
3. [Task 7: Response Completion Detection (Day 9-10)](#task-7-response-completion-detection-day-9-10)
4. [Task 8: Cleanup & Full Test (Day 11)](#task-8-cleanup--full-test-day-11)

---

## Task 5: Custom Prompt Slots (Day 5-6)

### Overview

Allow users to save up to 2 custom prompts. First click on an empty slot opens an edit modal. Subsequent clicks run automation with the saved prompt. An edit icon allows modifying saved prompts.

### Files Modified

| File | Change |
|------|--------|
| `index.html` | Add custom buttons to btn-grid, add modal HTML |
| `popup.js` | Add modal logic, custom prompt storage, sendAction for CUSTOM_1/CUSTOM_2 |
| `content.js` | Update buildPrompt to handle CUSTOM_1, CUSTOM_2 |
| `background.js` | Pass customPrompt field through message chain |

---

### 5A. index.html — Add custom buttons + modal

**Diff: Add CSS for custom buttons and modal (inside `<style>`, before closing `</style>` tag)**

Find:
```css
    @keyframes ping { 75%,100% { transform:scale(2);opacity:0; } }
    @keyframes pulse-dot { 0% { transform:scale(.8);opacity:.5; } 50% { transform:scale(1.1);opacity:1; } 100% { transform:scale(.8);opacity:.5; } }
  </style>
```

Replace with:
```css
    /* Custom button colors */
    .pill-chip.teal   { border-color:rgba(20,184,166,.3); }
    .pill-chip.teal:hover   { border-color:rgba(45,212,191,.5); }
    .pill-chip.teal   .pill-icon { color:rgb(45,212,191); }
    .pill-chip.pink   { border-color:rgba(236,72,153,.3); }
    .pill-chip.pink:hover   { border-color:rgba(244,114,182,.5); }
    .pill-chip.pink   .pill-icon { color:rgb(244,114,182); }

    /* Edit icon on custom buttons */
    .pill-chip .pill-edit {
      position:absolute;top:4px;right:4px;font-size:12px;color:rgba(255,255,255,.4);
      cursor:pointer;opacity:0;transition:opacity 150ms;z-index:2;
    }
    .pill-chip:hover .pill-edit { opacity:1; }
    .pill-chip .pill-edit:hover { color:#fff; }
    .pill-chip { position:relative; }

    /* Custom prompt modal */
    .modal-backdrop {
      display:none;position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,.6);backdrop-filter:blur(4px);
      align-items:center;justify-content:center;
    }
    .modal-backdrop.visible { display:flex; }
    .modal-box {
      width:420px;max-height:80vh;background:rgba(17,25,40,.95);
      border:1px solid rgba(255,255,255,.15);border-radius:1.5rem;
      padding:1.5rem;color:#fff;font-family:'Inter',sans-serif;
      box-shadow:0 25px 50px rgba(0,0,0,.5);
    }
    .modal-title { margin:0 0 1rem;font-size:1rem;font-weight:700; }
    .modal-textarea {
      width:100%;min-height:180px;padding:.75rem;border-radius:.75rem;
      border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);
      color:#fff;font-size:.8rem;font-family:'Inter',sans-serif;
      resize:vertical;outline:none;line-height:1.5;
    }
    .modal-textarea:focus { border-color:rgba(59,130,246,.5); }
    .modal-textarea::placeholder { color:rgb(107,114,128); }
    .modal-hint { font-size:.65rem;color:rgb(107,114,128);margin-top:.5rem; }
    .modal-actions { display:flex;gap:.5rem;margin-top:1rem;justify-content:flex-end; }
    .modal-btn {
      padding:.5rem 1rem;border-radius:.625rem;border:1px solid rgba(255,255,255,.15);
      background:rgba(255,255,255,.05);color:#fff;font-size:.8rem;font-weight:600;
      cursor:pointer;transition:all 150ms;font-family:'Inter',sans-serif;
    }
    .modal-btn:hover { background:rgba(255,255,255,.1); }
    .modal-btn.primary { border-color:rgba(59,130,246,.4);background:rgba(59,130,246,.15);color:rgb(96,165,250); }
    .modal-btn.primary:hover { background:rgba(59,130,246,.25); }
    .modal-btn.danger { border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.1);color:rgb(248,113,113); }
    .modal-btn.danger:hover { background:rgba(248,113,113,.2); }
    .modal-char-count { font-size:.6rem;color:rgb(107,114,128);text-align:right;margin-top:.25rem; }

    @keyframes ping { 75%,100% { transform:scale(2);opacity:0; } }
    @keyframes pulse-dot { 0% { transform:scale(.8);opacity:.5; } 50% { transform:scale(1.1);opacity:1; } 100% { transform:scale(.8);opacity:.5; } }
  </style>
```

**Diff: Add custom buttons to btn-grid (inside `<div class="btn-grid">`)**

Find:
```html
      <div class="btn-grid">
        <button id="btn-doc" class="pill-chip blue">
          <span class="material-symbols-outlined pill-icon">article</span>
          <span class="pill-label">전체 요약</span>
          <span class="pill-sub">상세 분석</span>
        </button>
        <button id="btn-faq" class="pill-chip green">
          <span class="material-symbols-outlined pill-icon">quiz</span>
          <span class="pill-label">핵심 Q&A</span>
          <span class="pill-sub">질답 추출</span>
        </button>
        <button id="btn-podcast" class="pill-chip purple">
          <span class="material-symbols-outlined pill-icon">headphones</span>
          <span class="pill-label">팟캐스트</span>
          <span class="pill-sub">오디오 변환</span>
        </button>
        <button id="btn-full" class="pill-chip orange">
          <span class="material-symbols-outlined pill-icon">description</span>
          <span class="pill-label">원본 보기</span>
          <span class="pill-sub">텍스트 확인</span>
        </button>
      </div>
```

Replace with:
```html
      <div class="btn-grid">
        <button id="btn-doc" class="pill-chip blue">
          <span class="material-symbols-outlined pill-icon">article</span>
          <span class="pill-label">전체 요약</span>
          <span class="pill-sub">상세 분석</span>
        </button>
        <button id="btn-faq" class="pill-chip green">
          <span class="material-symbols-outlined pill-icon">quiz</span>
          <span class="pill-label">핵심 Q&A</span>
          <span class="pill-sub">질답 추출</span>
        </button>
        <button id="btn-podcast" class="pill-chip purple">
          <span class="material-symbols-outlined pill-icon">headphones</span>
          <span class="pill-label">팟캐스트</span>
          <span class="pill-sub">오디오 변환</span>
        </button>
        <button id="btn-full" class="pill-chip orange">
          <span class="material-symbols-outlined pill-icon">description</span>
          <span class="pill-label">원본 보기</span>
          <span class="pill-sub">텍스트 확인</span>
        </button>
        <button id="btn-custom1" class="pill-chip teal">
          <span class="material-symbols-outlined pill-edit" id="edit-custom1" title="프롬프트 수정">edit</span>
          <span class="material-symbols-outlined pill-icon">edit_note</span>
          <span class="pill-label">커스텀 1</span>
          <span class="pill-sub">프롬프트 설정</span>
        </button>
        <button id="btn-custom2" class="pill-chip pink">
          <span class="material-symbols-outlined pill-edit" id="edit-custom2" title="프롬프트 수정">edit</span>
          <span class="material-symbols-outlined pill-icon">edit_note</span>
          <span class="pill-label">커스텀 2</span>
          <span class="pill-sub">프롬프트 설정</span>
        </button>
      </div>
```

**Diff: Add modal HTML (before closing `</main>` tag, after btn-grid closing `</div>`)**

Find:
```html
      </div>
    </main>

    <footer>
```

Replace with:
```html
      </div>

      <!-- Custom prompt edit modal -->
      <div id="custom-modal" class="modal-backdrop">
        <div class="modal-box">
          <h3 class="modal-title" id="modal-title">커스텀 프롬프트 편집</h3>
          <textarea id="modal-textarea" class="modal-textarea"
                    placeholder="NotebookLM에 전달할 프롬프트를 입력하세요.&#10;&#10;예: 이 영상의 핵심 내용을 표 형식으로 정리해주세요.&#10;&#10;※ 언어/분량 설정은 자동 적용되지 않습니다. 필요하면 프롬프트에 직접 명시하세요."
                    maxlength="5000"></textarea>
          <div class="modal-char-count"><span id="modal-char-current">0</span> / 5,000</div>
          <p class="modal-hint">프롬프트는 chrome.storage.local에 저장됩니다. 언어·분량 옵션은 커스텀 프롬프트에 자동 적용되지 않으니 필요 시 직접 포함하세요.</p>
          <div class="modal-actions">
            <button id="modal-delete" class="modal-btn danger">삭제</button>
            <button id="modal-cancel" class="modal-btn">취소</button>
            <button id="modal-save" class="modal-btn primary">저장</button>
          </div>
        </div>
      </div>
    </main>

    <footer>
```

---

### 5B. popup.js — Modal logic + custom prompt storage

**Diff: Add DOM references (after existing DOM reference declarations, around line 12)**

Find:
```js
  let currentUrl = '';
  let notebookId = '';
  let notebookSource = '';
  let isOnNotebookLM = false;
```

Replace with:
```js
  // Custom prompt modal elements
  const customModal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalTextarea = document.getElementById('modal-textarea');
  const modalCharCurrent = document.getElementById('modal-char-current');
  const modalSave = document.getElementById('modal-save');
  const modalCancel = document.getElementById('modal-cancel');
  const modalDelete = document.getElementById('modal-delete');

  let currentUrl = '';
  let notebookId = '';
  let notebookSource = '';
  let isOnNotebookLM = false;
  let editingSlot = null; // 'CUSTOM_1' or 'CUSTOM_2'
  let customPrompts = { CUSTOM_1: '', CUSTOM_2: '' };
```

**Diff: Add custom prompt functions and button bindings (after the existing 4 button event listeners)**

Find:
```js
  document.getElementById('btn-doc').addEventListener('click', () => sendAction('FULL_DOC'));
  document.getElementById('btn-faq').addEventListener('click', () => sendAction('FAQ'));
  document.getElementById('btn-podcast').addEventListener('click', () => sendAction('PODCAST'));
  document.getElementById('btn-full').addEventListener('click', () => sendAction('FULL_TEXT'));
```

Replace with:
```js
  document.getElementById('btn-doc').addEventListener('click', () => sendAction('FULL_DOC'));
  document.getElementById('btn-faq').addEventListener('click', () => sendAction('FAQ'));
  document.getElementById('btn-podcast').addEventListener('click', () => sendAction('PODCAST'));
  document.getElementById('btn-full').addEventListener('click', () => sendAction('FULL_TEXT'));

  // ============================================================
  // Custom prompt modal
  // ============================================================

  // Load saved custom prompts from storage
  chrome.storage.local.get(['customPrompts'], (result) => {
    if (result.customPrompts) {
      customPrompts = result.customPrompts;
    }
    updateCustomButtonLabels();
  });

  const updateCustomButtonLabels = () => {
    const btn1Sub = document.querySelector('#btn-custom1 .pill-sub');
    const btn2Sub = document.querySelector('#btn-custom2 .pill-sub');
    btn1Sub.textContent = customPrompts.CUSTOM_1 ? '저장됨' : '프롬프트 설정';
    btn2Sub.textContent = customPrompts.CUSTOM_2 ? '저장됨' : '프롬프트 설정';
  };

  const openCustomModal = (slot) => {
    editingSlot = slot;
    const slotNum = slot === 'CUSTOM_1' ? '1' : '2';
    modalTitle.textContent = `커스텀 ${slotNum} 프롬프트 편집`;
    modalTextarea.value = customPrompts[slot] || '';
    modalCharCurrent.textContent = modalTextarea.value.length;
    modalDelete.style.display = customPrompts[slot] ? 'inline-block' : 'none';
    customModal.classList.add('visible');
    modalTextarea.focus();
  };

  const closeCustomModal = () => {
    customModal.classList.remove('visible');
    editingSlot = null;
  };

  modalTextarea.addEventListener('input', () => {
    modalCharCurrent.textContent = modalTextarea.value.length;
  });

  modalCancel.addEventListener('click', closeCustomModal);

  customModal.addEventListener('click', (e) => {
    if (e.target === customModal) closeCustomModal();
  });

  modalSave.addEventListener('click', () => {
    const text = modalTextarea.value.trim();
    if (!text) {
      modalTextarea.style.borderColor = 'rgba(248,113,113,.5)';
      setTimeout(() => { modalTextarea.style.borderColor = ''; }, 1500);
      return;
    }
    customPrompts[editingSlot] = text;
    chrome.storage.local.set({ customPrompts }, () => {
      updateCustomButtonLabels();
      closeCustomModal();
      setStatus('커스텀 프롬프트 저장 완료!', '', 'success');
    });
  });

  modalDelete.addEventListener('click', () => {
    customPrompts[editingSlot] = '';
    chrome.storage.local.set({ customPrompts }, () => {
      updateCustomButtonLabels();
      closeCustomModal();
      setStatus('커스텀 프롬프트 삭제됨', '', 'success');
    });
  });

  // Custom button click: if no prompt saved → open modal; otherwise → run
  const handleCustomClick = (slot) => {
    if (!customPrompts[slot]) {
      openCustomModal(slot);
      return;
    }
    sendAction(slot);
  };

  document.getElementById('btn-custom1').addEventListener('click', (e) => {
    if (e.target.closest('.pill-edit')) { openCustomModal('CUSTOM_1'); return; }
    handleCustomClick('CUSTOM_1');
  });
  document.getElementById('btn-custom2').addEventListener('click', (e) => {
    if (e.target.closest('.pill-edit')) { openCustomModal('CUSTOM_2'); return; }
    handleCustomClick('CUSTOM_2');
  });

  // Edit icon click — open modal even when prompt is saved
  document.getElementById('edit-custom1').addEventListener('click', (e) => {
    e.stopPropagation();
    openCustomModal('CUSTOM_1');
  });
  document.getElementById('edit-custom2').addEventListener('click', (e) => {
    e.stopPropagation();
    openCustomModal('CUSTOM_2');
  });
```

**Diff: Update sendAction to include customPrompt for CUSTOM_1/CUSTOM_2**

Find:
```js
  const sendAction = (actionType) => {
    if (!currentUrl.includes('youtube.com')) {
      setStatus('유튜브에서 실행해주세요!', '유튜브 영상 페이지에서 버튼을 클릭하세요', 'error');
      return;
    }
    if (!notebookId) {
      setStatus('새 노트북 생성 중...', 'NotebookLM에서 자동으로 노트북을 만듭니다', 'progress');
    } else {
      setStatus('NotebookLM 여는 중...', '잠시만 기다려주세요', 'progress');
    }

    chrome.runtime.sendMessage({
      target: 'NOTEBOOKLM_AUTOMATION',
      type: actionType,
      url: currentUrl,
      notebookId: notebookId || '__NEW__',
      clearSources: toggleClear.checked,
      lang: selectLang.value,
      length: selectLength.value
    });
  };
```

Replace with:
```js
  const sendAction = (actionType) => {
    if (!currentUrl.includes('youtube.com')) {
      setStatus('유튜브에서 실행해주세요!', '유튜브 영상 페이지에서 버튼을 클릭하세요', 'error');
      return;
    }
    if (!notebookId) {
      setStatus('새 노트북 생성 중...', 'NotebookLM에서 자동으로 노트북을 만듭니다', 'progress');
    } else {
      setStatus('NotebookLM 여는 중...', '잠시만 기다려주세요', 'progress');
    }

    const msg = {
      target: 'NOTEBOOKLM_AUTOMATION',
      type: actionType,
      url: currentUrl,
      notebookId: notebookId || '__NEW__',
      clearSources: toggleClear.checked,
      lang: selectLang.value,
      length: selectLength.value
    };

    // Attach custom prompt text for CUSTOM_1 / CUSTOM_2
    if (actionType === 'CUSTOM_1' || actionType === 'CUSTOM_2') {
      msg.customPrompt = customPrompts[actionType] || '';
    }

    chrome.runtime.sendMessage(msg);
  };
```

---

### 5C. background.js — Pass customPrompt through message chain

**Diff: Store customPrompt in pendingTask**

Find (in the `NOTEBOOKLM_AUTOMATION` handler inside background.js):
```js
    pendingTask = {
      type: request.type,
      url: request.url,
      clearSources: request.clearSources,
      lang: request.lang,
      length: request.length,
      createNew: request.notebookId === '__NEW__'
    };
```

Replace with:
```js
    pendingTask = {
      type: request.type,
      url: request.url,
      clearSources: request.clearSources,
      lang: request.lang,
      length: request.length,
      customPrompt: request.customPrompt || '',
      createNew: request.notebookId === '__NEW__'
    };
```

**Diff: Pass customPrompt in START_AUTOMATION message**

Find:
```js
      chrome.tabs.sendMessage(tabId, {
        action: 'START_AUTOMATION',
        url: pendingTask.url,
        type: pendingTask.type,
        clearSources: pendingTask.clearSources,
        lang: pendingTask.lang,
        length: pendingTask.length
      });
```

Replace with:
```js
      chrome.tabs.sendMessage(tabId, {
        action: 'START_AUTOMATION',
        url: pendingTask.url,
        type: pendingTask.type,
        clearSources: pendingTask.clearSources,
        lang: pendingTask.lang,
        length: pendingTask.length,
        customPrompt: pendingTask.customPrompt || ''
      });
```

---

### 5D. content.js — buildPrompt handles CUSTOM_1 / CUSTOM_2

**Diff: Add CUSTOM handling at the end of buildPrompt, before `return '';`**

Find:
```js
  if (type === 'FULL_TEXT') return `당신은 전문 속기사입니다.\n이 영상에서 말한 내용을 요약하거나 생략하지 말고, 말한 순서 그대로 ${L.full} 기록해 주세요.\n\n${commonRules}\n- 절대 요약하지 말 것. 내용을 합치거나 재구성하지 말 것\n- "음", "그러니까" 등 의미 없는 필러는 제거하되 실질적 내용은 모두 포함\n\n[출력 형식]\n- 주제가 전환되는 지점마다 빈 줄 + **[소주제]** 헤더 삽입\n- 화자가 여러 명인 경우 **화자명:** 으로 구분\n- 각 단락은 3~5문장 단위로 구분\n\n[주의]\n이 작업의 목적은 '영상을 보지 않고도 전체 내용을 읽을 수 있는 기록'을 만드는 것입니다.\n본인 판단으로 "덜 중요하다"고 생각되는 내용도 반드시 포함하세요.`;

  return '';
};
```

Replace with:
```js
  if (type === 'FULL_TEXT') return `당신은 전문 속기사입니다.\n이 영상에서 말한 내용을 요약하거나 생략하지 말고, 말한 순서 그대로 ${L.full} 기록해 주세요.\n\n${commonRules}\n- 절대 요약하지 말 것. 내용을 합치거나 재구성하지 말 것\n- "음", "그러니까" 등 의미 없는 필러는 제거하되 실질적 내용은 모두 포함\n\n[출력 형식]\n- 주제가 전환되는 지점마다 빈 줄 + **[소주제]** 헤더 삽입\n- 화자가 여러 명인 경우 **화자명:** 으로 구분\n- 각 단락은 3~5문장 단위로 구분\n\n[주의]\n이 작업의 목적은 '영상을 보지 않고도 전체 내용을 읽을 수 있는 기록'을 만드는 것입니다.\n본인 판단으로 "덜 중요하다"고 생각되는 내용도 반드시 포함하세요.`;

  // Custom prompts: returned directly (no lang/length decoration)
  if (type === 'CUSTOM_1' || type === 'CUSTOM_2') return null;

  return '';
};
```

**Diff: Update runAutomation to accept and use customPrompt parameter**

Find:
```js
const runAutomation = async (url, type, lang, length) => {
```

Replace with:
```js
const runAutomation = async (url, type, lang, length, customPrompt = '') => {
```

Find:
```js
  updateOverlay('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  sendStatus('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  const myPrompt = buildPrompt(type, lang, length);
```

Replace with:
```js
  updateOverlay('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  sendStatus('프롬프트 입력 중...', '질문을 작성하고 있습니다');
  let myPrompt = buildPrompt(type, lang, length);
  // For custom prompts, use the user-provided text directly
  if ((type === 'CUSTOM_1' || type === 'CUSTOM_2') && customPrompt) {
    myPrompt = customPrompt;
  }
```

**Diff: Update START_AUTOMATION handler to pass customPrompt**

Find:
```js
  if (message.action === 'START_AUTOMATION') {
    const { url, type, clearSources, lang, length } = message;
    try {
      if (clearSources) await deleteAllSources();
      await runAutomation(url, type, lang || 'ko', length || 'medium');
```

Replace with:
```js
  if (message.action === 'START_AUTOMATION') {
    const { url, type, clearSources, lang, length, customPrompt } = message;
    try {
      if (clearSources) await deleteAllSources();
      await runAutomation(url, type, lang || 'ko', length || 'medium', customPrompt || '');
```

---

### 5E. Manual Verification Steps

1. Load extension in `chrome://extensions` (reload if already loaded)
2. Open popup — confirm 6 buttons visible (4 presets + 2 custom)
3. Click "커스텀 1" when empty — modal should appear
4. Type a prompt, click "저장" — modal closes, sub-label changes to "저장됨"
5. Click "커스텀 1" again on a YouTube page — automation runs with saved prompt
6. Hover over "커스텀 1", click edit icon (pencil) — modal opens with saved text
7. Click "삭제" in modal — prompt cleared, sub-label reverts to "프롬프트 설정"
8. Repeat for "커스텀 2"
9. Close and reopen popup — saved prompts persist (chrome.storage.local)
10. Verify character count updates as you type in modal
11. Click backdrop outside modal — modal closes

### 5F. Commit Message

```
feat: add 2 custom prompt slots with edit modal

- Add CUSTOM_1 and CUSTOM_2 buttons to popup btn-grid
- First click on empty slot opens edit modal with textarea
- Subsequent clicks run automation with saved prompt
- Edit icon on hover allows modifying saved prompts
- Delete button in modal clears saved prompt
- Prompts stored in chrome.storage.local (max 5000 chars each)
- buildPrompt returns null for custom types, uses customPrompt field
- customPrompt passed through background.js message chain
```

---

## Task 6: Two New Presets (Day 7-8)

### Overview

Add STUDY_NOTE (exam prep) and MEETING_MEMO (meeting notes) presets to buildPrompt, plus 2 new buttons. Redesign grid to 2 rows x 4 columns (8 buttons total).

### Files Modified

| File | Change |
|------|--------|
| `content.js` | Add STUDY_NOTE and MEETING_MEMO to buildPrompt |
| `index.html` | Add 2 new preset buttons, update grid CSS |
| `popup.js` | Add event listeners for new buttons |

---

### 6A. content.js — Add STUDY_NOTE and MEETING_MEMO to buildPrompt

**Diff: Add length config entries for new types**

Find:
```js
  const L = {
    short:    { doc: '2~3개 주제, 각 1~2줄', faq: '3개', podcast: '4~5쌍', full: '핵심 위주로 간결하게' },
    medium:   { doc: '3~5개 주제, 각 2~4줄', faq: '5개', podcast: '6~8쌍', full: '빠짐없이 충실하게' },
    detailed: { doc: '5~7개 주제, 각 4~6줄', faq: '7개', podcast: '8~10쌍', full: '모든 세부사항 포함하여 상세하게' }
  }[length];
```

Replace with:
```js
  const L = {
    short:    { doc: '2~3개 주제, 각 1~2줄', faq: '3개', podcast: '4~5쌍', full: '핵심 위주로 간결하게', study: '핵심 위주 간결하게, 연습문제 3개', meeting: '핵심만 간결하게' },
    medium:   { doc: '3~5개 주제, 각 2~4줄', faq: '5개', podcast: '6~8쌍', full: '빠짐없이 충실하게', study: '주요 개념 충실하게, 연습문제 5개', meeting: '빠짐없이 충실하게' },
    detailed: { doc: '5~7개 주제, 각 4~6줄', faq: '7개', podcast: '8~10쌍', full: '모든 세부사항 포함하여 상세하게', study: '모든 세부사항 포함, 연습문제 7개', meeting: '모든 세부사항 상세히' }
  }[length];
```

**Diff: Add STUDY_NOTE and MEETING_MEMO prompt blocks (before the CUSTOM check)**

Find:
```js
  if (type === 'FULL_TEXT') return `당신은 전문 속기사입니다.\n이 영상에서 말한 내용을 요약하거나 생략하지 말고, 말한 순서 그대로 ${L.full} 기록해 주세요.\n\n${commonRules}\n- 절대 요약하지 말 것. 내용을 합치거나 재구성하지 말 것\n- "음", "그러니까" 등 의미 없는 필러는 제거하되 실질적 내용은 모두 포함\n\n[출력 형식]\n- 주제가 전환되는 지점마다 빈 줄 + **[소주제]** 헤더 삽입\n- 화자가 여러 명인 경우 **화자명:** 으로 구분\n- 각 단락은 3~5문장 단위로 구분\n\n[주의]\n이 작업의 목적은 '영상을 보지 않고도 전체 내용을 읽을 수 있는 기록'을 만드는 것입니다.\n본인 판단으로 "덜 중요하다"고 생각되는 내용도 반드시 포함하세요.`;

  // Custom prompts: returned directly (no lang/length decoration)
```

Replace with:
```js
  if (type === 'FULL_TEXT') return `당신은 전문 속기사입니다.\n이 영상에서 말한 내용을 요약하거나 생략하지 말고, 말한 순서 그대로 ${L.full} 기록해 주세요.\n\n${commonRules}\n- 절대 요약하지 말 것. 내용을 합치거나 재구성하지 말 것\n- "음", "그러니까" 등 의미 없는 필러는 제거하되 실질적 내용은 모두 포함\n\n[출력 형식]\n- 주제가 전환되는 지점마다 빈 줄 + **[소주제]** 헤더 삽입\n- 화자가 여러 명인 경우 **화자명:** 으로 구분\n- 각 단락은 3~5문장 단위로 구분\n\n[주의]\n이 작업의 목적은 '영상을 보지 않고도 전체 내용을 읽을 수 있는 기록'을 만드는 것입니다.\n본인 판단으로 "덜 중요하다"고 생각되는 내용도 반드시 포함하세요.`;

  if (type === 'STUDY_NOTE') return `당신은 시험 대비 학습 노트 전문가입니다.\n이 영상의 내용을 바탕으로 시험·복습에 최적화된 학습 노트를 작성해 주세요.\n\n${commonRules}\n\n분량: ${L.study}\n\n**[핵심 개념 정리]**\n영상에 등장하는 주요 개념을 정의와 함께 정리\n- 개념명: 정의 (1~2문장)\n- 관련 예시나 수치가 있으면 반드시 포함\n\n**[암기 포인트]**\n시험에 나올 수 있는 핵심 사항을 bullet point로 정리\n- 수치, 날짜, 고유명사 등 암기가 필요한 정보 강조\n- 혼동하기 쉬운 개념은 비교표로 정리\n\n**[연습 문제]**\n영상 내용을 기반으로 한 연습 문제 출제\n- 객관식, 단답형, 서술형을 골고루 포함\n- 각 문제 아래에 정답과 간단한 해설 제공\n\n**[한 페이지 요약]**\n전체 내용을 한 페이지 분량으로 압축 요약\n- 시험 직전 빠르게 훑어볼 수 있는 형태\n- 핵심 키워드는 **굵게** 표시`;

  if (type === 'MEETING_MEMO') return `당신은 회의/세미나 기록 전문가입니다.\n이 영상의 내용을 바탕으로 공식 회의록 형식의 메모를 작성해 주세요.\n\n${commonRules}\n\n분량: ${L.meeting}\n\n**[회의/세미나 개요]**\n- 주제: (영상 제목 또는 핵심 주제)\n- 발표자/참여자: (영상에서 식별 가능한 경우)\n- 핵심 목적: 1문장 요약\n\n**[주요 내용 요약]**\n논의된 내용을 주제별로 구조화하여 정리\n- 각 주제마다 소제목 + 핵심 내용 (2~4문장)\n- 발표된 데이터, 수치, 사례는 정확히 기록\n\n**[논의 사항]**\n영상에서 논의/토론된 주요 이슈 정리\n- 찬반 의견이 있다면 양쪽 모두 기록\n- 질의응답이 있다면 Q&A 형식으로 정리\n\n**[결정 사항]**\n영상에서 명시적으로 결정/합의된 내용\n- 없으면 "명시적 결정 사항 없음"으로 표기\n\n**[액션 아이템]**\n후속 조치가 필요한 항목을 체크리스트로 정리\n- [ ] 항목 (담당자/기한이 언급된 경우 포함)\n- 없으면 "명시적 액션 아이템 없음"으로 표기\n\n**[미결 이슈]**\n추가 논의나 확인이 필요한 열린 이슈\n- 없으면 생략`;

  // Custom prompts: returned directly (no lang/length decoration)
```

---

### 6B. index.html — Add new preset buttons + update grid to 2x4

**Diff: Update grid CSS to handle 8 buttons in 2 rows of 4**

The existing grid rule already specifies `repeat(4,minmax(0,1fr))`, which naturally wraps 8 buttons into 2 rows. No CSS change needed for the grid layout.

**Diff: Add STUDY_NOTE and MEETING_MEMO buttons (insert before custom buttons)**

Find:
```html
        <button id="btn-custom1" class="pill-chip teal">
```

Replace with:
```html
        <button id="btn-study" class="pill-chip cyan">
          <span class="material-symbols-outlined pill-icon">school</span>
          <span class="pill-label">학습 노트</span>
          <span class="pill-sub">시험 대비</span>
        </button>
        <button id="btn-meeting" class="pill-chip rose">
          <span class="material-symbols-outlined pill-icon">groups</span>
          <span class="pill-label">회의록</span>
          <span class="pill-sub">미팅 정리</span>
        </button>
        <button id="btn-custom1" class="pill-chip teal">
```

**Diff: Add CSS for cyan and rose color variants (add after the `.pill-chip.pink` rules)**

Find:
```css
    .pill-chip.pink   { border-color:rgba(236,72,153,.3); }
    .pill-chip.pink:hover   { border-color:rgba(244,114,182,.5); }
    .pill-chip.pink   .pill-icon { color:rgb(244,114,182); }
```

Replace with:
```css
    .pill-chip.pink   { border-color:rgba(236,72,153,.3); }
    .pill-chip.pink:hover   { border-color:rgba(244,114,182,.5); }
    .pill-chip.pink   .pill-icon { color:rgb(244,114,182); }
    .pill-chip.cyan   { border-color:rgba(6,182,212,.3); }
    .pill-chip.cyan:hover   { border-color:rgba(34,211,238,.5); }
    .pill-chip.cyan   .pill-icon { color:rgb(34,211,238); }
    .pill-chip.rose   { border-color:rgba(244,63,94,.3); }
    .pill-chip.rose:hover   { border-color:rgba(251,113,133,.5); }
    .pill-chip.rose   .pill-icon { color:rgb(251,113,133); }
```

**Diff: Update grid to handle 8 buttons — change to 2 rows of 4 with smaller padding**

Find:
```css
    .btn-grid { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem; }
```

Replace with:
```css
    .btn-grid { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem; }
```

---

### 6C. popup.js — Add event listeners for new buttons

**Diff: Add new button bindings (after the FULL_TEXT listener)**

Find:
```js
  document.getElementById('btn-doc').addEventListener('click', () => sendAction('FULL_DOC'));
  document.getElementById('btn-faq').addEventListener('click', () => sendAction('FAQ'));
  document.getElementById('btn-podcast').addEventListener('click', () => sendAction('PODCAST'));
  document.getElementById('btn-full').addEventListener('click', () => sendAction('FULL_TEXT'));
```

Replace with:
```js
  document.getElementById('btn-doc').addEventListener('click', () => sendAction('FULL_DOC'));
  document.getElementById('btn-faq').addEventListener('click', () => sendAction('FAQ'));
  document.getElementById('btn-podcast').addEventListener('click', () => sendAction('PODCAST'));
  document.getElementById('btn-full').addEventListener('click', () => sendAction('FULL_TEXT'));
  document.getElementById('btn-study').addEventListener('click', () => sendAction('STUDY_NOTE'));
  document.getElementById('btn-meeting').addEventListener('click', () => sendAction('MEETING_MEMO'));
```

---

### 6D. Final Button Grid Layout

After Task 5 + Task 6, the btn-grid contains 8 buttons in 2 rows:

```
Row 1: [전체 요약] [핵심 Q&A] [팟캐스트] [원본 보기]
Row 2: [학습 노트] [회의록]  [커스텀 1] [커스텀 2]
```

---

### 6E. Manual Verification Steps

1. Reload extension
2. Open popup — confirm 8 buttons in 2 rows of 4
3. Click "학습 노트" on a YouTube page — verify STUDY_NOTE prompt is sent
4. Click "회의록" on a YouTube page — verify MEETING_MEMO prompt is sent
5. Verify both new presets respect language and length options
6. Check DevTools console for the full prompt text to confirm it includes study/meeting-specific sections
7. Confirm all 8 buttons have distinct colors and icons
8. Verify the grid does not overflow or break at 480px width

### 6F. Commit Message

```
feat: add STUDY_NOTE and MEETING_MEMO presets

- STUDY_NOTE: concepts, memorization points, practice questions, one-page summary
- MEETING_MEMO: summary, discussions, decisions, action items, open issues
- Both presets support short/medium/detailed length options
- Add 2 new buttons to popup (school icon, groups icon)
- Grid now displays 8 buttons in 2 rows of 4
- Add cyan and rose color variants for new buttons
```

---

## Task 7: Response Completion Detection (Day 9-10)

### Overview

After the prompt is submitted, watch the NotebookLM response area with a MutationObserver. Detect when the response finishes (loading indicator disappears or text stabilizes for 3 seconds). On completion: update overlay with success message, flash the copy button, and send a chrome.notification if the popup is closed.

### Files Modified

| File | Change |
|------|--------|
| `content.js` | Add response watcher with MutationObserver |
| `manifest.json` | Add `notifications` permission |
| `background.js` | Add notification relay handler |

---

### 7A. manifest.json — Add notifications permission

**Diff:**

Find:
```json
  "permissions": [
    "tabs",
    "scripting",
    "activeTab",
    "storage"
  ],
```

Replace with:
```json
  "permissions": [
    "tabs",
    "scripting",
    "activeTab",
    "storage",
    "notifications"
  ],
```

---

### 7B. content.js — Add response completion watcher

**Diff: Add the watchResponseCompletion function (after `injectCopyButton` and before `runAutomation`)**

Find:
```js
// ============================================================
// 자동화: 소스 추가 + 프롬프트 입력
// ============================================================
```

Replace with:
```js
// ============================================================
// 응답 완료 감지 (MutationObserver)
// ============================================================

const watchResponseCompletion = () => {
  // Selectors for the response area and loading indicators
  const RESPONSE_SELECTORS = [
    '.response-container',
    '.model-response',
    '[class*="response"]',
    '.markdown-content',
    '.chat-message'
  ];
  const LOADING_SELECTORS = [
    '.loading-indicator',
    '.typing-indicator',
    '[class*="loading"]',
    '[class*="typing"]',
    '.response-loading',
    'mat-spinner',
    '.mat-mdc-progress-spinner'
  ];

  let lastText = '';
  let stableCount = 0;
  let stabilityTimer = null;
  let observer = null;
  let completionFired = false;
  const STABLE_THRESHOLD = 3; // 3 seconds of no change
  const CHECK_INTERVAL = 1000; // check every 1 second
  const MAX_WAIT = 300000; // 5 minutes max

  const getResponseText = () => {
    for (const sel of RESPONSE_SELECTORS) {
      const elements = Array.from(document.querySelectorAll(sel))
        .filter(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().length > 50);
      if (elements.length > 0) {
        return elements[elements.length - 1].textContent.trim();
      }
    }
    return '';
  };

  const isLoading = () => {
    for (const sel of LOADING_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && el.getBoundingClientRect().width > 0) return true;
    }
    return false;
  };

  const onComplete = () => {
    if (completionFired) return;
    completionFired = true;
    cleanup();

    console.log('[NLM-EXT] 응답 완료 감지!');

    // Flash the copy button
    const fab = document.getElementById('nlm-copy-fab');
    if (fab) {
      fab.textContent = '✅ 응답 완료! 복사하기';
      fab.style.background = '#22c55e';
      fab.style.animation = 'nlm-flash .6s ease-in-out 3';
      setTimeout(() => {
        fab.textContent = '📋 응답 복사';
        fab.style.background = '#3b82f6';
        fab.style.animation = '';
      }, 5000);
    }

    // Show completion overlay briefly
    showOverlay('✅ 응답 완료!', '복사 버튼으로 결과를 복사하세요');
    hideOverlay(3000);

    sendStatus('✅ 응답 완료!', '우하단 복사 버튼으로 결과를 복사하세요', 'success');

    // Send notification via background (in case popup is closed)
    chrome.runtime.sendMessage({
      target: 'SHOW_NOTIFICATION',
      title: 'NotebookLM 응답 완료',
      message: '요청한 분석이 완료되었습니다. 결과를 확인하세요.'
    }).catch(() => {});
  };

  const cleanup = () => {
    if (stabilityTimer) clearInterval(stabilityTimer);
    if (observer) observer.disconnect();
    stabilityTimer = null;
    observer = null;
  };

  // Inject flash animation CSS if not present
  if (!document.getElementById('nlm-flash-style')) {
    const style = document.createElement('style');
    style.id = 'nlm-flash-style';
    style.textContent = `
      @keyframes nlm-flash {
        0%, 100% { box-shadow: 0 4px 16px rgba(34,197,94,.4); }
        50% { box-shadow: 0 4px 32px rgba(34,197,94,.8), 0 0 60px rgba(34,197,94,.3); }
      }
    `;
    document.head.appendChild(style);
  }

  // Strategy 1: Periodic text stability check
  stabilityTimer = setInterval(() => {
    const currentText = getResponseText();
    const loading = isLoading();

    if (loading) {
      // Still loading — reset stability counter
      stableCount = 0;
      lastText = currentText;
      return;
    }

    if (currentText.length > 50 && currentText === lastText) {
      stableCount++;
      if (stableCount >= STABLE_THRESHOLD) {
        onComplete();
      }
    } else {
      stableCount = 0;
      lastText = currentText;
    }
  }, CHECK_INTERVAL);

  // Strategy 2: MutationObserver for loading indicator removal
  const targetNode = document.body;
  observer = new MutationObserver((mutations) => {
    if (completionFired) return;

    for (const mutation of mutations) {
      // Check removed nodes for loading indicators
      for (const node of mutation.removedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const isLoadingEl = LOADING_SELECTORS.some(sel => {
          try { return node.matches(sel) || node.querySelector(sel); } catch (_) { return false; }
        });
        if (isLoadingEl) {
          // Loading indicator removed — wait a bit then check stability
          console.log('[NLM-EXT] 로딩 인디케이터 제거 감지, 안정성 확인 대기...');
          setTimeout(() => {
            if (!isLoading() && getResponseText().length > 50) {
              // Wait one more second to confirm
              setTimeout(() => {
                if (!isLoading()) onComplete();
              }, 1000);
            }
          }, 1000);
        }
      }
    }
  });

  observer.observe(targetNode, { childList: true, subtree: true });

  // Safety: auto-cleanup after MAX_WAIT
  setTimeout(() => {
    if (!completionFired) {
      console.log('[NLM-EXT] 응답 완료 감지 타임아웃 (5분)');
      cleanup();
    }
  }, MAX_WAIT);
};

// ============================================================
// 자동화: 소스 추가 + 프롬프트 입력
// ============================================================
```

**Diff: Call watchResponseCompletion at the end of runAutomation (replace the final section)**

Find:
```js
  injectCopyButton();
  updateOverlay('완료!', 'NotebookLM이 응답을 생성하고 있습니다');
  hideOverlay(2000);
  sendStatus('완료!', 'NotebookLM에서 응답을 생성하고 있습니다 — 우하단 복사 버튼 사용 가능', 'success');
};
```

Replace with:
```js
  injectCopyButton();
  updateOverlay('응답 생성 중...', 'NotebookLM이 응답을 생성하고 있습니다');
  sendStatus('응답 생성 중...', '완료 시 자동 알림됩니다', 'progress');

  // Start watching for response completion
  watchResponseCompletion();
};
```

---

### 7C. background.js — Add notification handler

**Diff: Add SHOW_NOTIFICATION handler (after the existing `NOTEBOOK_LIST_UPDATED` handler)**

Find:
```js
  // Content → Background → Popup: 노트북 목록 갱신 알림
  if (request.target === 'NOTEBOOK_LIST_UPDATED') {
    chrome.runtime.sendMessage(request).catch(() => {});
  }
});
```

Replace with:
```js
  // Content → Background → Popup: 노트북 목록 갱신 알림
  if (request.target === 'NOTEBOOK_LIST_UPDATED') {
    chrome.runtime.sendMessage(request).catch(() => {});
  }

  // Content → Background: 시스템 알림 표시
  if (request.target === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'logo.webp',
      title: request.title || 'NotebookLM 퀵 요약기',
      message: request.message || '작업이 완료되었습니다.',
      priority: 2
    }, (notificationId) => {
      // Auto-clear after 10 seconds
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 10000);
    });
  }
});
```

---

### 7D. Manual Verification Steps

1. Reload extension
2. Run any preset (e.g., FULL_DOC) on a YouTube page
3. Watch the NotebookLM tab — observe overlay shows "응답 생성 중..."
4. Wait for NotebookLM to finish generating the response
5. Verify: overlay briefly shows "응답 완료!" then fades
6. Verify: copy button flashes green with "응답 완료! 복사하기" text
7. Verify: system notification appears (Windows toast) with "NotebookLM 응답 완료"
8. Verify: after 5 seconds, copy button returns to normal blue "응답 복사"
9. Close the popup before response completes — confirm notification still fires
10. Check DevTools console for `[NLM-EXT] 응답 완료 감지!` log message
11. Edge case: if response takes > 5 minutes, watcher should silently clean up

### 7E. Commit Message

```
feat: detect response completion with MutationObserver + notifications

- Watch response area for text stabilization (3s no-change threshold)
- MutationObserver detects loading indicator removal as secondary signal
- On completion: flash copy button green, show overlay, update popup status
- Add chrome.notifications for system-level alert when popup is closed
- Auto-cleanup watcher after 5 minute timeout
- Add flash animation keyframes for copy button
```

---

## Task 8: Cleanup & Full Test (Day 11)

### Overview

Remove unused `tailwind.output.css` file. Run a systematic manual test matrix covering key combinations of presets, lengths, and languages. Document error case testing.

### Files Modified / Deleted

| File | Change |
|------|--------|
| `tailwind.output.css` | DELETE this file |
| `CLAUDE.md` | Update to reflect Phase 2 changes |

---

### 8A. Delete tailwind.output.css

**Action: Delete file**

```
rm tailwind.output.css
```

Verify it is not referenced anywhere:
- `index.html` — does not link to it (CSS is inline)
- `manifest.json` — does not reference it
- No other file imports it

---

### 8B. CLAUDE.md — Update documentation

**Diff: Update file structure section**

Find:
```
manifest.json       — MV3 매니페스트 (permissions: tabs, scripting, activeTab, storage)
```

Replace with:
```
manifest.json       — MV3 매니페스트 (permissions: tabs, scripting, activeTab, storage, notifications)
```

Find:
```
tailwind.output.css — (미사용) Tailwind 빌드 산출물
```

Replace with (delete the line entirely — replace with empty string or remove):
```
```

**Diff: Update summary modes section**

Find:
```
### 1. 4가지 요약 모드 (`buildPrompt`)
- **FULL_DOC** — 전체 요약: 한 줄 요약 + 핵심 내용 + 기억할 포인트 + 한계/주의
- **FAQ** — 핵심 Q&A: 주제별 질문-답변 생성
- **PODCAST** — 팟캐스트 스크립트: 수진(전문가)/민호(청취자) 대화체
- **FULL_TEXT** — 원본 텍스트: 요약 없이 전문 기록
```

Replace with:
```
### 1. 8가지 요약 모드 (`buildPrompt`)
- **FULL_DOC** — 전체 요약: 한 줄 요약 + 핵심 내용 + 기억할 포인트 + 한계/주의
- **FAQ** — 핵심 Q&A: 주제별 질문-답변 생성
- **PODCAST** — 팟캐스트 스크립트: 수진(전문가)/민호(청취자) 대화체
- **FULL_TEXT** — 원본 텍스트: 요약 없이 전문 기록
- **STUDY_NOTE** — 학습 노트: 핵심 개념 + 암기 포인트 + 연습 문제 + 한 페이지 요약
- **MEETING_MEMO** — 회의록: 요약 + 논의 사항 + 결정 사항 + 액션 아이템 + 미결 이슈
- **CUSTOM_1** — 사용자 정의 프롬프트 슬롯 1
- **CUSTOM_2** — 사용자 정의 프롬프트 슬롯 2
```

**Diff: Add response completion feature description (after the copy button section)**

Find:
```
### 5. 플로팅 복사 버튼
- 자동화 완료 후 우하단에 `📋 응답 복사` FAB 주입
- `.response-container`, `.model-response` 등에서 마지막 응답 텍스트 추출
```

Replace with:
```
### 5. 플로팅 복사 버튼
- 자동화 완료 후 우하단에 `📋 응답 복사` FAB 주입
- `.response-container`, `.model-response` 등에서 마지막 응답 텍스트 추출

### 6. 응답 완료 감지
- MutationObserver + 주기적 텍스트 안정성 체크 (3초간 변화 없으면 완료 판정)
- 로딩 인디케이터 제거 감지 (보조 신호)
- 완료 시: 오버레이 표시, 복사 버튼 플래시, 시스템 알림 (chrome.notifications)
- 5분 타임아웃 후 자동 정리

### 7. 커스텀 프롬프트
- chrome.storage.local에 최대 2개 커스텀 프롬프트 저장
- 모달 UI로 편집/삭제, 최대 5000자
- 언어/분량 옵션은 커스텀 프롬프트에 자동 적용되지 않음
```

---

### 8C. Test Matrix

The full test matrix is 8 types x 3 lengths x 4 languages = 96 combinations. Focus on the **key 12 combinations** below:

| # | Type | Length | Lang | Expected Result |
|---|------|--------|------|----------------|
| 1 | FULL_DOC | medium | ko | Full summary in Korean |
| 2 | FULL_DOC | short | en | Brief summary in English |
| 3 | FAQ | medium | ko | 5 Q&A pairs in Korean |
| 4 | FAQ | detailed | ja | 7 Q&A pairs in Japanese |
| 5 | PODCAST | medium | ko | 6-8 dialog pairs in Korean |
| 6 | PODCAST | short | en | 4-5 dialog pairs in English |
| 7 | FULL_TEXT | medium | ko | Full transcript in Korean |
| 8 | STUDY_NOTE | medium | ko | Study note with practice questions |
| 9 | STUDY_NOTE | detailed | en | Detailed study note in English |
| 10 | MEETING_MEMO | medium | ko | Meeting memo with action items |
| 11 | CUSTOM_1 | n/a | n/a | User's custom prompt runs as-is |
| 12 | CUSTOM_2 | n/a | n/a | User's custom prompt runs as-is |

**Manual Test Procedure for each combination:**

1. Open a YouTube video page (use a short video, ~5 minutes)
2. Open popup, select language and length
3. Select or create a notebook
4. Click the corresponding button
5. Verify:
   - NotebookLM tab opens
   - Source is added
   - Prompt is typed into chat input
   - Prompt is submitted
   - Response completion is detected
   - Copy button flashes on completion
   - Notification appears

---

### 8D. Error Case Testing

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| E1 | Wrong URL | Click any button on a non-YouTube page | Popup shows "유튜브에서 실행해주세요!" error |
| E2 | Not logged in | Open NotebookLM while logged out | Automation fails gracefully with error overlay |
| E3 | Network error | Disconnect network during automation | Error overlay + popup status shows error |
| E4 | Empty custom prompt | Click "커스텀 1" with no saved prompt | Modal opens (does not run automation) |
| E5 | Custom prompt save empty | Open modal, leave textarea empty, click save | Textarea border flashes red, save blocked |
| E6 | No notebook selected | Click button with no notebook | "새 노트북 생성 중..." → creates new notebook |
| E7 | Deleted notebook ID | Select notebook, delete it, click button | Should handle gracefully (new notebook or error) |
| E8 | Response timeout | If NotebookLM never responds | Watcher auto-cleans after 5 minutes |

---

### 8E. Commit Message

```
chore: remove unused tailwind.output.css and update documentation

- Delete tailwind.output.css (was already unused, CSS is inline)
- Update CLAUDE.md with Phase 2 features: 8 prompt modes,
  response completion detection, custom prompts, notifications
- Document test matrix and error cases
```

---

## Summary of All File Changes

| Task | File | Action |
|------|------|--------|
| 5 | `index.html` | Add custom button HTML, modal HTML, new CSS |
| 5 | `popup.js` | Add modal logic, custom prompt storage, updated sendAction |
| 5 | `background.js` | Add customPrompt to pendingTask and START_AUTOMATION |
| 5 | `content.js` | buildPrompt returns null for CUSTOM, runAutomation accepts customPrompt |
| 6 | `content.js` | Add STUDY_NOTE and MEETING_MEMO to buildPrompt + length config |
| 6 | `index.html` | Add 2 new buttons, new color CSS, adjust grid gap |
| 6 | `popup.js` | Add 2 new button event listeners |
| 7 | `content.js` | Add watchResponseCompletion with MutationObserver |
| 7 | `manifest.json` | Add notifications permission |
| 7 | `background.js` | Add SHOW_NOTIFICATION handler |
| 8 | `tailwind.output.css` | DELETE |
| 8 | `CLAUDE.md` | Update documentation |

## New Storage Keys

| Key | Location | Type | Description |
|-----|----------|------|-------------|
| `customPrompts` | chrome.storage.local | `{ CUSTOM_1: string, CUSTOM_2: string }` | User's saved custom prompts (max 5000 chars each) |

## New Message Types

| target | Direction | Fields | Description |
|--------|-----------|--------|-------------|
| `SHOW_NOTIFICATION` | Content -> Background | title, message | Trigger system notification |

## New Permissions

| Permission | Reason |
|------------|--------|
| `notifications` | System notifications when response completes and popup is closed |
