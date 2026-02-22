document.addEventListener('DOMContentLoaded', () => {
  const urlDisplay = document.getElementById('url-display');
  const urlSub = document.getElementById('url-sub');
  const statusArea = document.getElementById('status-area');
  const settingsArea = document.getElementById('settings-area');
  const settingsBtn = document.querySelector('.settings-btn');
  const notebookUrlInput = document.getElementById('notebook-url-input');
  const btnSaveUrl = document.getElementById('btn-save-url');
  const toggleClear = document.getElementById('toggle-clear');
  const selectLang = document.getElementById('select-lang');
  const selectLength = document.getElementById('select-length');
  const notebookListEl = document.getElementById('notebook-list');
  const btnRefresh = document.getElementById('btn-refresh-notebooks');

  // Custom prompt modal elements
  const customModal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalTextarea = document.getElementById('modal-textarea');
  const modalCharCurrent = document.getElementById('modal-char-current');
  const modalSave = document.getElementById('modal-save');
  const modalCancel = document.getElementById('modal-cancel');
  const modalDelete = document.getElementById('modal-delete');

  let currentUrl = '';
  let currentTabTitle = '';
  let notebookId = '';
  let notebookSource = '';
  let isOnNotebookLM = false;
  let editingSlot = null; // 'CUSTOM_1' or 'CUSTOM_2'
  let customPrompts = { CUSTOM_1: '', CUSTOM_2: '' };

  // --- Status helpers ---
  const setStatus = (text, sub, type) => {
    urlDisplay.textContent = text;
    urlSub.textContent = sub || '';
    statusArea.className = 'status-area';
    if (type) statusArea.classList.add(`status-${type}`);
  };

  const extractNotebookId = (url) => {
    const match = url.match(/notebook\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // ============================================================
  // Notebook list
  // ============================================================

  const renderNotebookList = (notebooks) => {
    if (!notebooks || notebooks.length === 0) {
      notebookListEl.innerHTML = '<p class="nb-empty">노트북이 없습니다. NotebookLM을 방문하면 자동 갱신됩니다.</p>';
      return;
    }

    notebookListEl.innerHTML = '';
    notebooks.forEach((nb) => {
      const item = document.createElement('div');
      item.className = 'nb-item' + (nb.id === notebookId ? ' active' : '');

      const title = document.createElement('span');
      title.className = 'nb-item-title';
      title.textContent = nb.title || '(제목 없음)';
      title.title = nb.title || '';

      const del = document.createElement('button');
      del.className = 'nb-item-del';
      del.title = '삭제';
      del.innerHTML = '<span class="material-symbols-outlined">delete</span>';

      item.appendChild(title);
      item.appendChild(del);

      // Click item → select notebook
      item.addEventListener('click', (e) => {
        if (e.target.closest('.nb-item-del')) return;
        notebookId = nb.id;
        notebookSource = 'list';
        const fullUrl = `https://notebooklm.google.com/notebook/${nb.id}`;
        chrome.storage.local.set({ notebookUrl: fullUrl, selectedNotebookId: nb.id });
        notebookUrlInput.value = fullUrl;
        updateNotebookBadge();
        renderNotebookList(notebooks);
        setStatus(`"${nb.title}" 선택됨`, fullUrl, 'success');
      });

      // Delete button
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        setStatus(`"${nb.title}" 삭제 중...`, 'NotebookLM으로 이동합니다', 'progress');
        // 삭제 대상이 현재 선택된 노트북이면 선택 해제
        if (notebookId === nb.id) {
          notebookId = '';
          notebookSource = '';
          chrome.storage.local.remove('selectedNotebookId');
          updateNotebookBadge();
        }

        const isOnHomepage = isOnNotebookLM && !currentUrl.includes('/notebook/');
        if (isOnHomepage) {
          // 홈페이지에 있으면 직접 삭제
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'DELETE_NOTEBOOK',
              notebookId: nb.id,
              notebookTitle: nb.title
            });
          });
        } else {
          // 상세페이지이거나 NotebookLM 밖 → 홈으로 이동 후 삭제
          chrome.runtime.sendMessage({
            target: 'NOTEBOOKLM_DELETE',
            notebookId: nb.id,
            notebookTitle: nb.title
          });
        }
      });

      notebookListEl.appendChild(item);
    });
  };

  // Load notebook list from storage
  const loadNotebookList = () => {
    chrome.storage.local.get(['notebooks', 'selectedNotebookId'], (result) => {
      const notebooks = result.notebooks || [];

      // 선택된 노트북이 목록에 아직 있는지 검증
      if (result.selectedNotebookId) {
        if (notebooks.length > 0) {
          // 목록이 있을 때만 검증 — 목록에 없으면 삭제된 것
          const stillExists = notebooks.find(nb => nb.id === result.selectedNotebookId);
          if (stillExists) {
            notebookId = result.selectedNotebookId;
            notebookSource = 'list';
          } else {
            notebookId = '';
            notebookSource = '';
            chrome.storage.local.remove('selectedNotebookId');
          }
        } else {
          // 목록이 비어있으면 기존 선택 유지 (아직 스캔 전일 수 있음)
          notebookId = result.selectedNotebookId;
          notebookSource = 'storage';
        }
      }

      renderNotebookList(notebooks);
      updateNotebookBadge();
    });
  };

  // Refresh: ask content script to scan
  btnRefresh.addEventListener('click', () => {
    if (!isOnNotebookLM) {
      setStatus('NotebookLM 페이지에서만 새로고침 가능', 'notebooklm.google.com을 열어주세요', 'error');
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'SCAN_NOTEBOOKS' });
    });
    setStatus('노트북 목록 스캔 중...', '', 'progress');
  });

  // ============================================================
  // Notebook badge
  // ============================================================

  const updateNotebookBadge = () => {
    const badge = document.getElementById('notebook-badge');
    if (!notebookId) {
      badge.textContent = '미설정 — 아래 목록에서 노트북을 선택하세요';
      badge.className = 'notebook-badge badge-none';
      return;
    }
    const labels = {
      tab: '열린 탭에서 자동 감지됨',
      storage: '마지막 방문 노트북 사용 중',
      manual: '수동 설정됨',
      list: '목록에서 선택됨'
    };
    badge.textContent = labels[notebookSource] || '';
    badge.className = `notebook-badge badge-${notebookSource === 'list' ? 'tab' : notebookSource}`;
  };

  // ============================================================
  // Settings
  // ============================================================

  settingsBtn.addEventListener('click', () => {
    settingsArea.classList.toggle('visible');
  });

  btnSaveUrl.addEventListener('click', () => {
    const url = notebookUrlInput.value.trim();
    if (!url) { setStatus('URL을 입력해주세요', '', 'error'); return; }
    const id = extractNotebookId(url);
    if (!id) { setStatus('올바른 NotebookLM URL이 아닙니다', '', 'error'); return; }
    chrome.storage.local.set({ notebookUrl: url, selectedNotebookId: id }, () => {
      notebookId = id;
      notebookSource = 'manual';
      updateNotebookBadge();
      setStatus('노트북 URL 저장 완료!', url, 'success');
      setTimeout(() => { settingsArea.classList.remove('visible'); updateUrlDisplay(); }, 1500);
    });
  });

  // ============================================================
  // URL display
  // ============================================================

  const updateUrlDisplay = () => {
    if (currentUrl.includes('youtube.com/watch')) {
      setStatus(currentUrl, '유튜브 영상이 감지되었습니다');
    } else if (isOnNotebookLM) {
      setStatus('NotebookLM 페이지', '노트북 목록을 관리할 수 있습니다');
    } else {
      setStatus('유튜브 영상 페이지가 아닙니다', '유튜브 영상 페이지에서 실행해주세요', 'error');
    }
  };

  // --- Init: get current tab ---
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentUrl = tabs[0].url;
    currentTabTitle = (tabs[0].title || '').replace(/\s*[-–—]\s*YouTube\s*$/i, '').trim();
    isOnNotebookLM = currentUrl.includes('notebooklm.google.com');
    updateUrlDisplay();

    // If on NotebookLM, auto-scan notebooks
    if (isOnNotebookLM && !currentUrl.includes('/notebook/')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'SCAN_NOTEBOOKS' });
    }
  });

  // --- Resolve notebook ID (tab > storage) ---
  chrome.tabs.query({ url: '*://notebooklm.google.com/notebook/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const id = extractNotebookId(tabs[0].url);
      if (id && !notebookId) {
        notebookId = id;
        notebookSource = 'tab';
        notebookUrlInput.value = tabs[0].url;
      }
    }
    // Then load list (which may override with selectedNotebookId)
    loadNotebookList();
  });

  // ============================================================
  // Send action
  // ============================================================

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
      videoTitle: currentTabTitle,
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

  document.getElementById('btn-doc').addEventListener('click', () => sendAction('FULL_DOC'));
  document.getElementById('btn-faq').addEventListener('click', () => sendAction('FAQ'));
  document.getElementById('btn-podcast').addEventListener('click', () => sendAction('PODCAST'));
  document.getElementById('btn-full').addEventListener('click', () => sendAction('FULL_TEXT'));
  document.getElementById('btn-study').addEventListener('click', () => sendAction('STUDY_NOTE'));
  document.getElementById('btn-meeting').addEventListener('click', () => sendAction('MEETING_MEMO'));

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

  // ============================================================
  // Listen for messages
  // ============================================================

  chrome.runtime.onMessage.addListener((message) => {
    if (message.target === 'POPUP_STATUS') {
      setStatus(message.text, message.sub || '', message.type || '');
    }
    // Notebook list updated by content script
    if (message.target === 'NOTEBOOK_LIST_UPDATED') {
      loadNotebookList();
    }
  });
});
