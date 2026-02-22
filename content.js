// --- Auto-save current notebook URL on page load ---
if (window.location.href.includes('notebooklm.google.com/notebook/')) {
  chrome.storage.local.set({ notebookUrl: window.location.href });
}

// --- Auto-scan notebooks on homepage load ---
if (
  window.location.href.includes('notebooklm.google.com') &&
  !window.location.href.includes('/notebook/')
) {
  // SPA이므로 project-button이 렌더링될 때까지 대기 후 스캔
  const waitAndScan = () => {
    let attempts = 0;
    const poller = setInterval(() => {
      attempts++;
      const cards = document.querySelectorAll(SEL.notebook.card);
      if (cards.length > 0 || attempts > 20) {
        clearInterval(poller);
        scanAndSaveNotebooks();
      }
    }, 500);
  };
  if (document.readyState === 'complete') {
    waitAndScan();
  } else {
    window.addEventListener('load', waitAndScan);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, label, maxRetries = 2, delay = 2000) => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      console.log(`[NLM-EXT] ${label} 재시도 ${i + 1}/${maxRetries}...`);
      sendStatus(`${label} 재시도 중...`, `${i + 1}/${maxRetries}회`, 'progress');
      await sleep(delay);
    }
  }
};

const sendStatus = (text, sub = '', type = 'progress') => {
  chrome.runtime.sendMessage({ target: 'POPUP_STATUS', text, sub, type }).catch(() => {});
};

// ============================================================
// 로딩 오버레이
// ============================================================

// 오버레이 전용 스타일 시트 (CDK 오버레이 컨테이너 z-index 강제 제어)
const _injectOverlayStyles = () => {
  if (document.getElementById('nlm-ext-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'nlm-ext-overlay-styles';
  style.textContent = `
    body.nlm-automation-active .cdk-overlay-container,
    body.nlm-automation-active .cdk-overlay-backdrop,
    body.nlm-automation-active .cdk-overlay-pane,
    body.nlm-automation-active .mat-mdc-dialog-container {
      z-index: 999 !important;
    }
    #nlm-ext-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,.55); backdrop-filter: blur(8px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: opacity .3s; pointer-events: none;
    }
    #nlm-ext-overlay .nlm-dismiss-btn {
      margin-top: 32px; pointer-events: auto; cursor: pointer;
      padding: 8px 24px; border: 1px solid rgba(255,255,255,.25); border-radius: 8px;
      background: rgba(255,255,255,.1); color: rgba(255,255,255,.7);
      font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: all .2s; backdrop-filter: blur(4px);
    }
    #nlm-ext-overlay .nlm-dismiss-btn:hover {
      background: rgba(255,255,255,.2); color: #fff; border-color: rgba(255,255,255,.4);
    }
    #nlm-ext-overlay .nlm-spinner {
      width: 52px; height: 52px; border: 4px solid rgba(255,255,255,.15);
      border-top-color: #3b82f6; border-radius: 50%;
      animation: nlm-spin .8s linear infinite;
    }
    #nlm-ext-overlay .nlm-overlay-text {
      margin-top: 24px; color: #fff; font-size: 18px; font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-shadow: 0 2px 12px rgba(0,0,0,.6);
    }
    #nlm-ext-overlay .nlm-overlay-sub {
      margin-top: 8px; color: rgba(255,255,255,.65); font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-shadow: 0 1px 6px rgba(0,0,0,.5);
    }
    #nlm-ext-overlay .nlm-prompt-preview {
      display: none; margin-top: 20px; padding: 16px 20px;
      max-width: 520px; width: 90%; max-height: 240px;
      overflow-y: auto; border-radius: 12px;
      background: rgba(255,255,255,.08); backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,.12);
      color: rgba(255,255,255,.8); font-size: 12.5px; line-height: 1.7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
      white-space: pre-wrap; word-break: break-word;
      text-shadow: none;
    }
    #nlm-ext-overlay .nlm-prompt-preview::-webkit-scrollbar { width: 4px; }
    #nlm-ext-overlay .nlm-prompt-preview::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,.2); border-radius: 4px;
    }
    #nlm-ext-overlay .nlm-prompt-label {
      display: none; margin-top: 16px;
      color: rgba(255,255,255,.45); font-size: 11px; font-weight: 600;
      letter-spacing: .5px; text-transform: uppercase;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    @keyframes nlm-spin { to { transform: rotate(360deg); } }

`;
  document.head.appendChild(style);
};

const showOverlay = (text = '자동화 진행 중...', sub = '잠시만 기다려주세요') => {
  _injectOverlayStyles();

  let overlay = document.getElementById('nlm-ext-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nlm-ext-overlay';
    overlay.innerHTML = `
      <div class="nlm-spinner"></div>
      <div class="nlm-overlay-text"></div>
      <div class="nlm-overlay-sub"></div>
      <div class="nlm-prompt-label">입력 프롬프트</div>
      <div class="nlm-prompt-preview"></div>
      <button class="nlm-dismiss-btn">숨기기</button>
    `;
    overlay.querySelector('.nlm-dismiss-btn').addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        document.body.classList.remove('nlm-automation-active');
      }, 300);
    });
  }
  overlay.querySelector('.nlm-overlay-text').textContent = text;
  overlay.querySelector('.nlm-overlay-sub').textContent = sub;
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  document.body.appendChild(overlay);

  // body에 클래스 추가 → CDK 오버레이 z-index 강제로 낮춤
  document.body.classList.add('nlm-automation-active');
};

const updateOverlay = (text, sub, promptText) => {
  const overlay = document.getElementById('nlm-ext-overlay');
  if (!overlay) return;
  if (text) overlay.querySelector('.nlm-overlay-text').textContent = text;
  if (sub) overlay.querySelector('.nlm-overlay-sub').textContent = sub;

  const label = overlay.querySelector('.nlm-prompt-label');
  const preview = overlay.querySelector('.nlm-prompt-preview');
  if (label && preview) {
    if (promptText) {
      label.style.display = 'block';
      preview.style.display = 'block';
      preview.textContent = promptText;
    } else if (promptText === null) {
      // null이면 명시적으로 숨김
      label.style.display = 'none';
      preview.style.display = 'none';
    }
  }
};

const hideOverlay = (delay = 1500) => {
  setTimeout(() => {
    const overlay = document.getElementById('nlm-ext-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.classList.remove('nlm-automation-active');
    }, 300);
  }, delay);
};

// ============================================================
// DOM 유틸리티
// ============================================================

const waitForVisibleElement = async (selector, timeout = 15000) => {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const elements = Array.from(document.querySelectorAll(selector));
      const el = elements.find(e => e.getBoundingClientRect().width > 0);
      if (el) { clearInterval(timer); resolve(el); }
    }, 500);
    setTimeout(() => { clearInterval(timer); reject(new Error(`'${selector}' 요소를 찾지 못했습니다.`)); }, timeout);
  });
};

const clickButtonByText = async (text1, text2 = null, timeout = 20000, allowDisabled = false) => {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const buttons = Array.from(document.querySelectorAll(SEL.buttons.allButtons));
      const valid = buttons.filter(btn => {
        const vis = btn.getBoundingClientRect().width > 0;
        const en = allowDisabled || (!btn.disabled && !btn.classList.contains(SEL.buttons.disabledClass));
        return vis && en;
      });
      const target = valid.reverse().find(btn => {
        const c = (btn.textContent || '').replace(/\s+/g, '');
        const s1 = text1.replace(/\s+/g, '');
        const s2 = text2 ? text2.replace(/\s+/g, '') : null;
        return c.includes(s1) || (s2 && c.includes(s2));
      });
      if (target) { clearInterval(timer); target.click(); resolve(target); }
    }, 500);
    setTimeout(() => { clearInterval(timer); reject(new Error(`'${text1}' 버튼을 찾지 못했습니다.`)); }, timeout);
  });
};

const waitForButton = (selector, timeout = 5000) => {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const btn = document.querySelector(selector);
      if (btn && btn.getBoundingClientRect().width > 0) { clearInterval(timer); resolve(btn); }
    }, 200);
    setTimeout(() => { clearInterval(timer); resolve(null); }, timeout);
  });
};

// ============================================================
// 노트북 목록 스캔
// ============================================================

const scanAndSaveNotebooks = async () => {
  console.log('[NLM-EXT] 노트북 목록 스캔 시작...');
  sendStatus('노트북 목록 스캔 중...', 'DOM 로딩 대기 중');

  // SPA 렌더링 대기: project-button 또는 a[href*="/notebook/"] 가 나타날 때까지 폴링
  let found = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const pb = document.querySelectorAll(SEL.notebook.card);
    const links = document.querySelectorAll(SEL.notebook.notebookLink);
    console.log(`[NLM-EXT] 폴링 ${i+1}/15: project-button=${pb.length}, a[notebook]=${links.length}`);
    if (pb.length > 0 || links.length > 0) { found = true; break; }
  }

  if (!found) {
    // 디버그: 페이지에 어떤 요소가 있는지 출력
    console.log('[NLM-EXT] DOM 탐색 실패. 현재 body 하위 태그:',
      [...new Set([...document.body.querySelectorAll('*')].map(el => el.tagName.toLowerCase()))].sort().join(', '));
    sendStatus('노트북을 찾지 못했습니다', 'DevTools 콘솔에서 [NLM-EXT] 로그를 확인해주세요', 'error');
    chrome.storage.local.set({ notebooks: [] }, () => {
      chrome.runtime.sendMessage({ target: 'NOTEBOOK_LIST_UPDATED' }).catch(() => {});
    });
    return [];
  }

  const notebooks = [];

  const projectButtons = document.querySelectorAll(SEL.notebook.card);
  console.log(`[NLM-EXT] project-button 발견: ${projectButtons.length}개`);

  projectButtons.forEach(pb => {
    // 추천(featured) 노트북 제외 — 내 노트북만 수집
    if (pb.querySelector(SEL.notebook.featured)) {
      console.log('[NLM-EXT] 추천 노트북 건너뜀:', pb.querySelector(SEL.notebook.title)?.textContent?.trim());
      return;
    }

    // [id*="project-"] 요소에서 노트북 ID 추출 (UUID 형식)
    let id = null;
    const idEl = pb.querySelector(SEL.notebook.idPrefix);
    if (idEl) {
      // 예: "project-84216491-a0ec-40d8-94b9-559f8b9cacf6-title" → UUID 부분만 추출
      const match = idEl.id.match(/^project-([a-f0-9-]{36})/);
      if (match) id = match[1];
    }

    if (!id || notebooks.find(n => n.id === id)) return;

    const titleEl = pb.querySelector(SEL.notebook.title);
    const title = titleEl ? titleEl.textContent.trim() : '(제목 없음)';
    const emojiEl = pb.querySelector(SEL.notebook.emoji);
    const emoji = emojiEl ? emojiEl.textContent.trim() : '';

    notebooks.push({ id, title: emoji ? `${emoji} ${title}` : title });
  });

  console.log(`[NLM-EXT] 최종 노트북 ${notebooks.length}개:`, notebooks);

  chrome.storage.local.set({ notebooks }, () => {
    chrome.runtime.sendMessage({ target: 'NOTEBOOK_LIST_UPDATED' }).catch(() => {});
  });

  if (notebooks.length > 0) {
    sendStatus(`노트북 ${notebooks.length}개 발견`, '목록에서 노트북을 선택하세요', 'success');
  } else {
    sendStatus('노트북을 찾지 못했습니다', '콘솔 로그를 확인해주세요', 'error');
  }

  return notebooks;
};

// ============================================================
// 노트북 삭제 자동화
// ============================================================

const deleteNotebook = async (notebookId, notebookTitle) => {
  console.log(`[NLM-EXT] 노트북 삭제 시도: ${notebookTitle} (${notebookId})`);
  showOverlay(`[1/4] "${notebookTitle}" 삭제 준비`, '카드를 찾고 있습니다');
  sendStatus(`[1/4] "${notebookTitle}" 삭제 중...`, '카드를 찾고 있습니다', 'progress');
  await sleep(1000);

  // 해당 노트북의 project-button 카드 찾기 (ID 기반)
  let targetCard = null;
  const projectButtons = document.querySelectorAll(SEL.notebook.card);
  for (const pb of projectButtons) {
    const idEl = pb.querySelector(`[id*="${notebookId}"]`);
    if (idEl) {
      targetCard = pb;
      break;
    }
  }

  if (!targetCard) {
    console.log('[NLM-EXT] 카드 못 찾음. 전체 project-button ID 목록:');
    projectButtons.forEach(pb => {
      const idEl = pb.querySelector(SEL.notebook.idPrefix);
      console.log('  -', idEl?.id);
    });
    updateOverlay('삭제 실패', '해당 노트북 카드를 찾을 수 없습니다');
    hideOverlay(3000);
    sendStatus('삭제 실패', '해당 노트북 카드를 찾을 수 없습니다', 'error');
    return;
  }

  // 더보기 버튼 클릭
  updateOverlay('[2/4] 메뉴 열기', '더보기 버튼을 클릭합니다');
  sendStatus('[2/4] 메뉴 열기', '더보기 버튼을 클릭합니다', 'progress');

  const moreBtn = targetCard.querySelector(SEL.notebookDelete.moreButton)
    || targetCard.querySelector(SEL.notebookDelete.moreButtonFallback1)
    || targetCard.querySelector(SEL.notebookDelete.moreButtonFallback2);

  if (!moreBtn) {
    updateOverlay('삭제 실패', '더보기 버튼을 찾을 수 없습니다');
    hideOverlay(3000);
    sendStatus('삭제 실패', '더보기 버튼을 찾을 수 없습니다', 'error');
    return;
  }

  console.log('[NLM-EXT] 더보기 버튼 클릭:', moreBtn.getAttribute('aria-label'));
  moreBtn.click();
  await sleep(1000);

  // 삭제 메뉴 항목 클릭
  updateOverlay('[3/4] 삭제 실행', '삭제 메뉴를 선택합니다');
  sendStatus('[3/4] 삭제 실행', '삭제 메뉴를 선택합니다', 'progress');

  const menuItems = Array.from(document.querySelectorAll(SEL.notebookDelete.menuItem));
  console.log('[NLM-EXT] 메뉴 항목들:', menuItems.map(el => el.textContent.trim()));
  const deleteItem = menuItems.find(el => {
    const text = el.textContent.replace(/\s+/g, '');
    return SEL.notebookDelete.deleteTextMatches.some(t => text.includes(t));
  });

  if (!deleteItem) {
    document.body.click();
    updateOverlay('삭제 실패', '삭제 메뉴를 찾을 수 없습니다');
    hideOverlay(3000);
    sendStatus('삭제 실패', '삭제 메뉴를 찾을 수 없습니다. 콘솔 로그 확인', 'error');
    return;
  }

  console.log('[NLM-EXT] 삭제 메뉴 클릭:', deleteItem.textContent.trim());
  deleteItem.click();
  await sleep(1500);

  // 확인 다이얼로그 — 폴링으로 대기 (최대 5초)
  updateOverlay('[4/4] 삭제 확인', '확인 버튼을 찾고 있습니다');
  sendStatus('[4/4] 삭제 확인', '확인 버튼을 찾고 있습니다', 'progress');

  let confirmBtn = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(500);
    confirmBtn = document.querySelector(SEL.notebookDelete.confirmButton);
    if (!confirmBtn) {
      confirmBtn = Array.from(document.querySelectorAll(SEL.notebookDelete.confirmButtonFallback)).find(btn => {
        const text = (btn.textContent || '').replace(/\s+/g, '');
        return SEL.notebookDelete.confirmTextMatches.some(t => text.includes(t)) &&
               btn.getBoundingClientRect().width > 0 &&
               !btn.disabled;
      });
    }
    if (confirmBtn) break;
    console.log(`[NLM-EXT] 확인 버튼 탐색 ${attempt + 1}/10...`);
  }

  if (confirmBtn) {
    console.log('[NLM-EXT] 확인 버튼 클릭:', confirmBtn.textContent.trim());
    confirmBtn.click();
    await sleep(2000);
  } else {
    console.log('[NLM-EXT] 확인 버튼 못 찾음. 현재 dialog 내부:', document.querySelector(SEL.notebookDelete.dialog)?.innerHTML?.substring(0, 500));
    console.log('[NLM-EXT] 페이지 내 모든 dialog/overlay 버튼:',
      Array.from(document.querySelectorAll('[role="dialog"] button, .cdk-overlay-pane button, .mat-mdc-dialog-container button'))
        .map(b => `"${b.textContent.trim().substring(0, 30)}" disabled=${b.disabled} visible=${b.getBoundingClientRect().width > 0}`)
    );
    updateOverlay('삭제 실패', '확인 다이얼로그를 처리하지 못했습니다');
    hideOverlay(3000);
    sendStatus('삭제 실패', '확인 버튼을 찾지 못했습니다. 콘솔 확인', 'error');
    return;
  }

  // 실제 삭제 검증 — 카드가 사라졌는지 확인
  let deleted = false;
  for (let check = 0; check < 5; check++) {
    const remaining = document.querySelectorAll(SEL.notebook.card);
    let stillExists = false;
    for (const pb of remaining) {
      if (pb.querySelector(`[id*="${notebookId}"]`)) { stillExists = true; break; }
    }
    if (!stillExists) { deleted = true; break; }
    console.log(`[NLM-EXT] 삭제 검증 ${check + 1}/5 — 카드 아직 존재, 대기...`);
    await sleep(1000);
  }

  if (deleted) {
    updateOverlay(`"${notebookTitle}" 삭제 완료!`, '목록을 갱신합니다');
    sendStatus(`"${notebookTitle}" 삭제 완료!`, '', 'success');
  } else {
    updateOverlay('삭제 확인 필요', '노트북이 아직 남아있을 수 있습니다. 직접 확인해주세요');
    sendStatus('삭제 확인 필요', '노트북이 아직 남아있을 수 있습니다', 'error');
  }

  // 목록 다시 스캔
  await sleep(1000);
  await scanAndSaveNotebooks();
  hideOverlay(1500);
};

// ============================================================
// 소스 삭제
// ============================================================

const deleteAllSources = async () => {
  showOverlay('기존 소스 삭제 중...', '소스를 정리하고 있습니다');
  sendStatus('소스 삭제 중...', '기존 소스를 정리하고 있습니다');

  for (let round = 0; round < 20; round++) {
    // 페이지 내 모든 더보기 버튼 수집
    let moreButtons = Array.from(document.querySelectorAll(SEL.sourceDelete.moreButton))
      .filter(b => b.getBoundingClientRect().width > 0);
    if (moreButtons.length === 0) {
      moreButtons = Array.from(document.querySelectorAll(SEL.sourceDelete.moreButtonFallback))
        .filter(b => b.getBoundingClientRect().width > 0);
    }
    if (moreButtons.length === 0) {
      console.log('[NLM-EXT] 더보기 버튼 없음 — 삭제 완료');
      break;
    }

    // 각 버튼을 순회하며 "소스 삭제" 메뉴가 있는 버튼을 찾기
    // (채팅 영역 더보기 버튼은 "채팅 기록 삭제"만 나오므로 건너뜀)
    let deletedOne = false;
    for (const btn of moreButtons) {
      btn.click();
      await sleep(1000);

      const menuItems = Array.from(document.querySelectorAll(SEL.sourceDelete.menuItem));
      console.log('[NLM-EXT] 메뉴 항목:', menuItems.map(el => el.textContent.trim()));

      // "삭제" 포함 + "채팅" 미포함인 메뉴 항목 찾기
      const del = menuItems.find(el => {
        const text = el.textContent.replace(/\s+/g, '');
        const hasDelete = SEL.sourceDelete.deleteTextMatches.some(t => text.includes(t));
        const isChat = text.includes('채팅');
        return hasDelete && !isChat && el.getBoundingClientRect().width > 0;
      });

      if (!del) {
        // 이 버튼은 소스 삭제 메뉴가 아님 → 닫고 다음 버튼 시도
        console.log('[NLM-EXT] 소스 삭제 아님, 다음 버튼 시도');
        document.body.click();
        await sleep(500);
        continue;
      }

      // 소스 삭제 메뉴 발견
      console.log('[NLM-EXT] 소스 삭제 메뉴 클릭:', del.textContent.trim());
      sendStatus('소스 삭제 중...', `${round + 1}번째 소스 삭제 중`);
      updateOverlay('소스 삭제 중...', `${round + 1}번째 소스 삭제 중`);
      del.click();
      await sleep(1500);

      // 확인 다이얼로그
      let conf = document.querySelector(SEL.sourceDelete.confirmButton);
      if (!conf) {
        conf = Array.from(document.querySelectorAll(SEL.sourceDelete.confirmButtonFallback))
          .find(b => {
            const text = (b.textContent || '').replace(/\s+/g, '');
            return SEL.sourceDelete.confirmTextMatches.some(t => text.includes(t))
              && b.getBoundingClientRect().width > 0 && !b.disabled;
          });
      }
      if (conf) {
        console.log('[NLM-EXT] 확인 클릭:', conf.textContent.trim());
        conf.click();
      }
      await sleep(1500);
      deletedOne = true;
      break; // 1개 삭제 후 다시 버튼 목록 갱신
    }

    if (!deletedOne) {
      console.log('[NLM-EXT] 소스 삭제 메뉴를 가진 버튼 없음 — 종료');
      break;
    }
  }

  // 채팅 기록도 삭제
  await deleteChatHistory();
};

const deleteChatHistory = async () => {
  console.log('[NLM-EXT] 채팅 기록 삭제 시도...');
  updateOverlay('채팅 기록 삭제 중...', '이전 대화를 정리합니다');
  sendStatus('채팅 기록 삭제 중...', '이전 대화를 정리합니다');

  let moreButtons = Array.from(document.querySelectorAll(SEL.sourceDelete.moreButton))
    .filter(b => b.getBoundingClientRect().width > 0);
  if (moreButtons.length === 0) {
    moreButtons = Array.from(document.querySelectorAll(SEL.sourceDelete.moreButtonFallback))
      .filter(b => b.getBoundingClientRect().width > 0);
  }

  for (const btn of moreButtons) {
    btn.click();
    await sleep(1000);

    const menuItems = Array.from(document.querySelectorAll(SEL.sourceDelete.menuItem));
    const chatDel = menuItems.find(el => {
      const text = el.textContent.replace(/\s+/g, '');
      return text.includes('채팅') && text.includes('삭제')
        && el.getBoundingClientRect().width > 0;
    });

    if (!chatDel) {
      document.body.click();
      await sleep(500);
      continue;
    }

    console.log('[NLM-EXT] 채팅 기록 삭제 메뉴 클릭:', chatDel.textContent.trim());
    chatDel.click();
    await sleep(1500);

    // 확인 다이얼로그
    let conf = document.querySelector(SEL.sourceDelete.confirmButton);
    if (!conf) {
      conf = Array.from(document.querySelectorAll(SEL.sourceDelete.confirmButtonFallback))
        .find(b => {
          const text = (b.textContent || '').replace(/\s+/g, '');
          return SEL.sourceDelete.confirmTextMatches.some(t => text.includes(t))
            && b.getBoundingClientRect().width > 0 && !b.disabled;
        });
    }
    if (conf) {
      console.log('[NLM-EXT] 채팅 삭제 확인 클릭:', conf.textContent.trim());
      conf.click();
    }
    await sleep(1000);
    console.log('[NLM-EXT] 채팅 기록 삭제 완료');
    return;
  }

  console.log('[NLM-EXT] 채팅 기록 삭제 메뉴 못 찾음 — 건너뜀');
};

// ============================================================
// 노트북 제목 변경
// ============================================================

const renameNotebook = async (title) => {
  if (!title) return;
  console.log('[NLM-EXT] 노트북 제목 변경 시도:', title);

  // 1) input/textarea 기반 제목 필드
  let titleEl = document.querySelector(SEL.notebookTitle.selector);

  // 2) contenteditable 기반
  if (!titleEl) {
    titleEl = document.querySelector(SEL.notebookTitle.editable);
  }

  // 3) 제목 heading 클릭하여 편집 모드 진입
  if (!titleEl) {
    const heading = document.querySelector(SEL.notebookTitle.heading);
    if (heading && heading.getBoundingClientRect().width > 0) {
      console.log('[NLM-EXT] 제목 heading 클릭:', heading.textContent.trim());
      heading.click();
      await sleep(1000);
      // 클릭 후 input/textarea/contenteditable 재탐색
      titleEl = document.querySelector(SEL.notebookTitle.selector)
        || document.querySelector(SEL.notebookTitle.editable);
    }
  }

  if (!titleEl) {
    console.log('[NLM-EXT] 제목 필드 못 찾음. 페이지 내 input/contenteditable:',
      Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'))
        .filter(el => el.getBoundingClientRect().width > 0)
        .map(el => `<${el.tagName.toLowerCase()}> class="${(el.className || '').substring(0, 50)}" aria="${el.getAttribute('aria-label') || ''}" text="${(el.value || el.textContent || '').substring(0, 30)}"`)
    );
    return;
  }

  // 값 설정
  titleEl.focus();
  await sleep(300);

  if (titleEl.contentEditable === 'true') {
    // contenteditable 방식
    titleEl.textContent = '';
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, title);
  } else {
    // input/textarea 방식
    titleEl.select();
    const setter = Object.getOwnPropertyDescriptor(
      titleEl.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
      'value'
    ).set;
    setter.call(titleEl, title);
    titleEl.dispatchEvent(new Event('input', { bubbles: true }));
    titleEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  titleEl.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(500);
  console.log('[NLM-EXT] 노트북 제목 변경 완료:', title);
};

// ============================================================
// 프롬프트 생성
// ============================================================

const LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };

const buildPrompt = (type, lang = 'ko', length = 'medium') => {
  const langName = LANG_NAMES[lang] || '한국어';
  const langRule = `- 모든 답변은 반드시 ${langName}로 작성\n- 핵심 전문 용어는 "${langName}(원문)" 형식으로 병기`;
  const commonRules = `[규칙]\n${langRule}\n- 영상에 없는 내용을 추가하거나 추측하지 말 것\n- 수치, 고유명사, 예시는 원본 그대로 정확히 반영`;

  const L = {
    short:    { doc: '2~3개 주제, 각 1~2줄', faq: '3개', podcast: '4~5쌍', full: '핵심 위주로 간결하게', study: '핵심 위주 간결하게, 연습문제 3개', meeting: '핵심만 간결하게' },
    medium:   { doc: '3~5개 주제, 각 2~4줄', faq: '5개', podcast: '6~8쌍', full: '빠짐없이 충실하게', study: '주요 개념 충실하게, 연습문제 5개', meeting: '빠짐없이 충실하게' },
    detailed: { doc: '5~7개 주제, 각 4~6줄', faq: '7개', podcast: '8~10쌍', full: '모든 세부사항 포함하여 상세하게', study: '모든 세부사항 포함, 연습문제 7개', meeting: '모든 세부사항 상세히' }
  }[length];

  if (type === 'FULL_DOC') return `당신은 YouTube 영상 콘텐츠 분석 전문가입니다.\n아래 영상의 내용을 분석하여 다음 형식으로 정리해 주세요.\n\n${commonRules}\n\n**[한 줄 요약]**\n영상 전체를 1문장(50자 이내)으로 요약\n\n**[핵심 내용]**\n${L.doc} 분량으로 주제별 정리\n- 각 주제마다 소제목 + 구체적 설명\n- 수치·예시·주장은 빠짐없이 포함\n\n**[기억할 포인트]**\n영상 핵심 3가지를 bullet point로 정리\n\n**[한계 및 주의]**\n영상에서 논란이 되거나 검증이 필요한 주장이 있다면 별도 표기 (없으면 생략)`;

  if (type === 'FAQ') return `당신은 교육 콘텐츠 Q&A 전문가입니다.\n이 영상을 처음 접하는 사람의 관점에서 가장 궁금해할 질문 ${L.faq}개를 만들고 답변해 주세요.\n\n${commonRules}\n\n[질문 선정 기준]\n- 영상의 핵심 주제를 골고루 커버\n- 질문 유형 다양하게: 개념 정의(What), 이유/배경(Why), 방법/적용(How), 비교/차이점, 실용적 시사점\n\n[출력 형식]\n**Q1.** [질문]\n**A1.** [2~3문장 답변. 영상 내 구체적 수치/예시 인용]\n\n(이하 동일)\n\n**[이 영상 한 줄 결론]**\n한 문장으로 핵심 메시지 요약`;

  if (type === 'PODCAST') return `당신은 교육 팟캐스트 작가입니다.\n이 영상 내용을 바탕으로 두 진행자의 대화 스크립트를 작성해 주세요.\n\n[등장인물]\n- 수진 (전문가): 이 영상의 내용을 깊이 이해. 핵심을 쉽게 풀어 설명하는 스타일\n- 민호 (청취자): 이 주제를 처음 접함. 호기심 많고 날카로운 질문을 던짐\n\n${commonRules}\n- 자연스러운 구어체 ("~거든요", "~잖아요" 등 자연스러운 종결어미)\n- 어려운 개념은 민호가 질문 → 수진이 비유/예시로 설명\n\n[구성] 대화 쌍(수진+민호) ${L.podcast}개\n1. 도입: 주제 소개 + 흥미 유발 (1쌍)\n2. 본론: 핵심 내용 전달 (나머지)\n3. 마무리: 핵심 메시지 재강조 + 리스너에게 한마디 (1쌍)\n\n[출력 형식]\n**수진:** 대사\n**민호:** 대사`;

  if (type === 'FULL_TEXT') return `당신은 전문 속기사입니다.\n이 영상에서 말한 내용을 요약하거나 생략하지 말고, 말한 순서 그대로 ${L.full} 기록해 주세요.\n\n${commonRules}\n- 절대 요약하지 말 것. 내용을 합치거나 재구성하지 말 것\n- "음", "그러니까" 등 의미 없는 필러는 제거하되 실질적 내용은 모두 포함\n\n[출력 형식]\n- 주제가 전환되는 지점마다 빈 줄 + **[소주제]** 헤더 삽입\n- 화자가 여러 명인 경우 **화자명:** 으로 구분\n- 각 단락은 3~5문장 단위로 구분\n\n[주의]\n이 작업의 목적은 '영상을 보지 않고도 전체 내용을 읽을 수 있는 기록'을 만드는 것입니다.\n본인 판단으로 "덜 중요하다"고 생각되는 내용도 반드시 포함하세요.`;

  if (type === 'STUDY_NOTE') return `당신은 시험 대비 학습 노트 전문가입니다.\n이 영상의 내용을 바탕으로 시험·복습에 최적화된 학습 노트를 작성해 주세요.\n\n${commonRules}\n\n분량: ${L.study}\n\n**[핵심 개념 정리]**\n영상에 등장하는 주요 개념을 정의와 함께 정리\n- 개념명: 정의 (1~2문장)\n- 관련 예시나 수치가 있으면 반드시 포함\n\n**[암기 포인트]**\n시험에 나올 수 있는 핵심 사항을 bullet point로 정리\n- 수치, 날짜, 고유명사 등 암기가 필요한 정보 강조\n- 혼동하기 쉬운 개념은 비교표로 정리\n\n**[연습 문제]**\n영상 내용을 기반으로 한 연습 문제 출제\n- 객관식, 단답형, 서술형을 골고루 포함\n- 각 문제 아래에 정답과 간단한 해설 제공\n\n**[한 페이지 요약]**\n전체 내용을 한 페이지 분량으로 압축 요약\n- 시험 직전 빠르게 훑어볼 수 있는 형태\n- 핵심 키워드는 **굵게** 표시`;

  if (type === 'MEETING_MEMO') return `당신은 회의/세미나 기록 전문가입니다.\n이 영상의 내용을 바탕으로 공식 회의록 형식의 메모를 작성해 주세요.\n\n${commonRules}\n\n분량: ${L.meeting}\n\n**[회의/세미나 개요]**\n- 주제: (영상 제목 또는 핵심 주제)\n- 발표자/참여자: (영상에서 식별 가능한 경우)\n- 핵심 목적: 1문장 요약\n\n**[주요 내용 요약]**\n논의된 내용을 주제별로 구조화하여 정리\n- 각 주제마다 소제목 + 핵심 내용 (2~4문장)\n- 발표된 데이터, 수치, 사례는 정확히 기록\n\n**[논의 사항]**\n영상에서 논의/토론된 주요 이슈 정리\n- 찬반 의견이 있다면 양쪽 모두 기록\n- 질의응답이 있다면 Q&A 형식으로 정리\n\n**[결정 사항]**\n영상에서 명시적으로 결정/합의된 내용\n- 없으면 "명시적 결정 사항 없음"으로 표기\n\n**[액션 아이템]**\n후속 조치가 필요한 항목을 체크리스트로 정리\n- [ ] 항목 (담당자/기한이 언급된 경우 포함)\n- 없으면 "명시적 액션 아이템 없음"으로 표기\n\n**[미결 이슈]**\n추가 논의나 확인이 필요한 열린 이슈\n- 없으면 생략`;

  // Custom prompts: returned directly (no lang/length decoration)
  if (type === 'CUSTOM_1' || type === 'CUSTOM_2') return null;

  return '';
};

// ============================================================
// 플로팅 복사 버튼
// ============================================================

const injectCopyButton = () => {
  if (document.getElementById('nlm-copy-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'nlm-copy-fab';
  fab.textContent = '📋 응답 복사';
  fab.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;padding:12px 20px;border:none;border-radius:12px;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(59,130,246,.4);transition:all .2s;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
  fab.addEventListener('mouseenter', () => { fab.style.transform = 'scale(1.05)'; });
  fab.addEventListener('mouseleave', () => { fab.style.transform = 'scale(1)'; });
  fab.addEventListener('click', async () => {
    // 1차: 셀렉터 기반 탐색
    let blocks = Array.from(
      document.querySelectorAll(SEL.response.containers)
    ).filter(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().length > 50);

    // 2차 fallback: main 내 긴 텍스트 블록
    if (!blocks.length) {
      blocks = Array.from(document.querySelectorAll('main div, main section, main p'))
        .filter(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().length > 100
          && el.children.length > 0);
    }

    console.log('[NLM-EXT] 복사 대상 블록:', blocks.length, '개',
      blocks.length > 0 ? `(마지막: ${blocks[blocks.length - 1].textContent.trim().substring(0, 50)}...)` : '');

    if (!blocks.length) {
      fab.textContent = '⏳ 응답 없음'; fab.style.background = '#eab308';
      setTimeout(() => { fab.textContent = '📋 응답 복사'; fab.style.background = '#3b82f6'; }, 2000);
      return;
    }
    const text = (blocks[blocks.length - 1].innerText || '').trim();
    try { await navigator.clipboard.writeText(text); } catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    fab.textContent = '✅ 복사 완료!'; fab.style.background = '#22c55e';
    setTimeout(() => { fab.textContent = '📋 응답 복사'; fab.style.background = '#3b82f6'; }, 2000);
  });
  document.body.appendChild(fab);
};

// ============================================================
// 자동화: 소스 추가 + 프롬프트 입력
// ============================================================

const runAutomation = async (url, type, lang, length, customPrompt = '') => {
  showOverlay('[1/5] 소스 추가 준비 중...', '소스 추가 버튼을 찾고 있습니다');
  sendStatus('[1/5] 소스 추가 준비 중...', '소스 추가 버튼을 찾고 있습니다');
  await sleep(2000);

  // 소스 추가 버튼 — withRetry로 래핑
  const addSourceBtn = await withRetry(() => {
    let btn = null;
    for (const label of SEL.addSource.ariaLabels) {
      btn = document.querySelector(`button[aria-label="${label}"]`);
      if (btn && btn.getBoundingClientRect().width > 0) return btn;
      btn = null;
    }
    // fallback: 텍스트 기반 탐색
    btn = Array.from(document.querySelectorAll(SEL.addSource.buttonSelector)).find(b => {
      const text = (b.textContent || '').replace(/\s+/g, '');
      return SEL.addSource.textMatches.some(t => text.includes(t))
        && b.getBoundingClientRect().width > 0;
    });
    if (!btn) {
      console.log('[NLM-EXT] 소스 추가 버튼 못 찾음. 페이지 버튼 목록:',
        Array.from(document.querySelectorAll('button')).map(b => `"${b.getAttribute('aria-label') || b.textContent.trim().substring(0,30)}"`));
      throw new Error('소스 추가 버튼을 찾지 못했습니다');
    }
    return btn;
  }, '소스 추가 버튼');

  console.log('[NLM-EXT] 소스 추가 버튼 클릭:', addSourceBtn.getAttribute('aria-label'));
  addSourceBtn.click();
  await sleep(1000);
  updateOverlay('[2/5] URL 입력 중...', '웹사이트 소스를 선택하고 URL을 입력합니다');
  await withRetry(() => clickButtonByText('웹사이트', 'Website'), '웹사이트 버튼');
  const inputField = await waitForVisibleElement(SEL.urlInput.textarea);
  inputField.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(inputField, url);
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  inputField.dispatchEvent(new Event('change', { bubbles: true }));
  inputField.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(2000);
  updateOverlay('[3/5] 소스 삽입 중...', '소스를 노트북에 삽입하고 있습니다');
  sendStatus('[3/5] 소스 삽입 중...', '소스를 노트북에 삽입하고 있습니다');
  await withRetry(() => clickButtonByText('삽입', 'Insert'), '삽입 버튼');
  // fallback: "추가" 버튼
  await sleep(500);
  try { await clickButtonByText('추가', 'Add', 3000); } catch(_) {}

  let myPrompt = buildPrompt(type, lang, length);
  // For custom prompts, use the user-provided text directly
  if ((type === 'CUSTOM_1' || type === 'CUSTOM_2') && customPrompt) {
    myPrompt = customPrompt;
  }
  updateOverlay('[4/5] 프롬프트 입력 중...', '아래 프롬프트를 노트북에 입력합니다', myPrompt);
  const promptPreview = myPrompt.length > 60 ? myPrompt.substring(0, 60) + '...' : myPrompt;
  sendStatus('[4/5] 프롬프트 입력 중...', promptPreview);
  const chatInput = await waitForVisibleElement(SEL.chatInput.selector, 90000);
  await sleep(2000);
  chatInput.focus();
  const chatSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  chatSetter.call(chatInput, myPrompt);
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  chatInput.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1000);
  await withRetry(async () => {
    try {
      const sendBtn = await waitForVisibleElement(SEL.submitButton.selector, 10000);
      (sendBtn.closest('button') || sendBtn).click();
    } catch (_) {
      chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
  }, '전송 버튼');

  injectCopyButton();
  updateOverlay('[5/5] 전송 완료!', '노트북이 답변을 작성합니다', null);
  sendStatus('[5/5] 전송 완료!', '노트북이 답변을 작성합니다', 'success');

  chrome.runtime.sendMessage({
    target: 'SHOW_NOTIFICATION',
    title: '피클노트',
    message: '프롬프트 전송 완료! 노트북이 답변을 작성하고 있습니다.'
  }).catch(() => {});

  hideOverlay(2500);
};

// ============================================================
// 메시지 수신
// ============================================================

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // 노트북 목록 스캔
  if (message.action === 'SCAN_NOTEBOOKS') {
    await scanAndSaveNotebooks();
  }

  // 노트북 삭제
  if (message.action === 'DELETE_NOTEBOOK') {
    await deleteNotebook(message.notebookId, message.notebookTitle);
  }

  // 새 노트북 생성 (홈페이지에서 실행)
  if (message.action === 'CREATE_NOTEBOOK') {
    console.log('[NLM-EXT] 새 노트북 생성 시작...');
    showOverlay('새 노트북 생성 중...', '만들기 버튼을 찾고 있습니다');
    sendStatus('새 노트북 생성 중...', '만들기 버튼을 찾고 있습니다');
    try {
      // SPA 렌더링 대기: 만들기 버튼이 나타날 때까지 폴링 (최대 15초)
      let createBtn = null;
      for (let attempt = 0; attempt < 15; attempt++) {
        await sleep(1000);

        // 1) 클래스 기반
        createBtn = document.querySelector(SEL.createNotebook.classes);

        // 2) aria-label 기반
        if (!createBtn) {
          createBtn = document.querySelector(SEL.createNotebook.ariaLabels);
        }

        // 3) project-button 중 텍스트 매칭
        if (!createBtn) {
          createBtn = [...document.querySelectorAll(SEL.notebook.card)].find(pb => {
            const text = pb.textContent.replace(/\s+/g, '');
            return SEL.createNotebook.textMatches.some(t => text.includes(t));
          });
        }

        // 4) 클릭 가능 요소 텍스트 탐색
        if (!createBtn) {
          createBtn = [...document.querySelectorAll(SEL.createNotebook.clickableText)].find(el => {
            const text = (el.textContent || '').replace(/\s+/g, '');
            return SEL.createNotebook.textMatches.some(t => text.includes(t) || text === t)
              && el.getBoundingClientRect().width > 0;
          });
        }

        // 5) 플러스(+) 아이콘 FAB 버튼
        if (!createBtn) {
          createBtn = [...document.querySelectorAll(SEL.buttons.allButtons)].find(el => {
            const text = (el.textContent || '').trim();
            return SEL.createNotebook.plusTextMatches.some(t => text === t || text.includes(t))
              && el.getBoundingClientRect().width > 0;
          });
        }

        if (createBtn) break;
        console.log(`[NLM-EXT] 만들기 버튼 탐색 ${attempt + 1}/15...`);
        updateOverlay('새 노트북 생성 중...', `만들기 버튼 탐색 중 (${attempt + 1}/15)`);
      }

      if (createBtn) {
        console.log('[NLM-EXT] 만들기 버튼 발견:', createBtn.tagName, createBtn.textContent.trim().substring(0, 50));
        updateOverlay('새 노트북으로 이동 중...', '잠시만 기다려주세요');
        createBtn.click();
      } else {
        // 디버그: 페이지 내 클릭 가능한 모든 요소 출력
        const allClickable = document.querySelectorAll(SEL.createNotebook.clickable);
        console.log('[NLM-EXT] 만들기 버튼 못 찾음. 클릭 가능 요소들:', [...allClickable].map(el =>
          `<${el.tagName.toLowerCase()}> class="${el.className?.substring?.(0,60)||''}" text="${el.textContent.trim().substring(0,40)}" aria="${el.getAttribute('aria-label')||''}"`
        ));
        hideOverlay(0);
        sendStatus('새 노트북 생성 실패', '만들기 버튼을 찾지 못했습니다. 콘솔 확인', 'error');
      }
    } catch (error) {
      console.error('[NLM-EXT] 노트북 생성 오류:', error);
      hideOverlay(0);
      sendStatus('새 노트북 생성 실패', error.message, 'error');
    }
  }

  // 자동화 실행
  if (message.action === 'START_AUTOMATION') {
    const { url, videoTitle, createNew, type, clearSources, lang, length, customPrompt } = message;
    try {
      // 새 노트북이거나 소스 삭제 시 → 유튜브 제목으로 노트북 이름 변경
      if (videoTitle && (createNew || clearSources)) {
        await renameNotebook(videoTitle);
      }
      if (clearSources) await deleteAllSources();
      await runAutomation(url, type, lang || 'ko', length || 'medium', customPrompt || '');
    } catch (error) {
      console.error('자동화 실패:', error);
      hideOverlay(0);
      sendStatus(`오류: ${error.message}`, '자동화 중 문제가 발생했습니다', 'error');
    }
  }
});
