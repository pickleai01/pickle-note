// background.js — Phase 1: chrome.storage.session migration
// pendingTask를 chrome.storage.session에 저장하여
// service worker 종료/재시작 시에도 작업 정보 유지.

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
// 메시지 수신
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Popup → Background: 자동화 요청
  if (request.target === 'NOTEBOOKLM_AUTOMATION') {
    console.log('[BG] 메시지 수신:', request.type, request.notebookId);

    const task = {
      type: request.type,
      url: request.url,
      videoTitle: request.videoTitle || '',
      clearSources: request.clearSources,
      lang: request.lang,
      length: request.length,
      customPrompt: request.customPrompt || '',
      createNew: request.notebookId === '__NEW__'
    };

    setPendingTask(task).then(() => {
      if (request.notebookId === '__NEW__') {
        // 새 노트북 생성: 홈페이지 열기
        chrome.tabs.create({ url: 'https://notebooklm.google.com/' });
      } else {
        chrome.tabs.create({
          url: `https://notebooklm.google.com/notebook/${request.notebookId}`
        });
      }
    });
  }

  // Content → Background → Popup: 상태 메시지 중계
  if (request.target === 'POPUP_STATUS') {
    chrome.runtime.sendMessage(request).catch(() => {});
  }

  // Content → Background → Popup: 노트북 목록 갱신 알림
  if (request.target === 'NOTEBOOK_LIST_UPDATED') {
    chrome.runtime.sendMessage(request).catch(() => {});
  }

  // Popup → Background: NotebookLM 외부에서 노트북 삭제 요청
  if (request.target === 'NOTEBOOKLM_DELETE') {
    console.log('[BG] 삭제 요청 수신:', request.notebookTitle);
    setPendingTask({
      type: '__DELETE__',
      notebookId: request.notebookId,
      notebookTitle: request.notebookTitle
    }).then(() => {
      chrome.tabs.create({ url: 'https://notebooklm.google.com/' });
    });
  }

  // Content → Background: 시스템 알림 표시
  if (request.target === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: request.title || 'NotebookLM 퀵 요약기',
      message: request.message || '작업이 완료되었습니다.',
      priority: 2
    }, (notificationId) => {
      setTimeout(() => { chrome.notifications.clear(notificationId); }, 10000);
    });
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

    // 0) 홈페이지 로드 완료 + 삭제 모드 → DELETE_NOTEBOOK 전송
    if (isHomePage && pendingTask.type === '__DELETE__') {
      console.log('[BG] 홈페이지 로드 완료 → 노트북 삭제 요청');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          action: 'DELETE_NOTEBOOK',
          notebookId: pendingTask.notebookId,
          notebookTitle: pendingTask.notebookTitle
        });
        clearPendingTask();
      }, 2000);
      return;
    }

    // 1) 홈페이지 로드 완료 + 새 노트북 생성 모드 → CREATE_NOTEBOOK 전송
    if (isHomePage && pendingTask.createNew) {
      console.log('[BG] 홈페이지 로드 완료 → 새 노트북 생성 요청 (4초 대기)');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'CREATE_NOTEBOOK' });
      }, 4000);
      return; // pendingTask 유지 — 노트북 페이지 로드 시 자동화 시작
    }

    // 2) 노트북 페이지 로드 완료 → 자동화 시작
    if (isNotebookPage) {
      console.log('[BG] 노트북 페이지 로드 완료 → 자동화 시작');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          action: 'START_AUTOMATION',
          url: pendingTask.url,
          videoTitle: pendingTask.videoTitle || '',
          createNew: pendingTask.createNew || false,
          type: pendingTask.type,
          clearSources: pendingTask.clearSources,
          lang: pendingTask.lang,
          length: pendingTask.length,
          customPrompt: pendingTask.customPrompt || ''
        });
        clearPendingTask();
      }, 2000);
    }
  });
});
