// selectors.js — Phase 1: 모든 DOM 셀렉터를 한 파일에 집중
// NotebookLM UI가 변경되면 이 파일만 수정하면 됨.

const SEL = {
  // 노트북 목록 (홈페이지)
  notebook: {
    card: 'project-button',
    idPrefix: '[id^="project-"]',
    featured: '.featured-project, .featured-project-card',
    title: '.project-button-title',
    emoji: '.project-button-box-icon',
    notebookLink: 'a[href*="/notebook/"]'
  },

  // 노트북 삭제 (홈페이지 카드 메뉴)
  notebookDelete: {
    moreButton: 'button[aria-label*="Actions"], button[aria-label*="actions"], button[aria-label*="메뉴"], button[aria-label*="더보기"], button[aria-label*="More"]',
    moreButtonFallback1: 'button[class*="more"], button[class*="menu"]',
    moreButtonFallback2: 'mat-card button',
    menuItem: '.mat-mdc-menu-item, [role="menuitem"], .cdk-overlay-pane button',
    deleteTextMatches: ['삭제', 'Delete', 'delete', '휴지통', 'Trash', 'Remove'],
    confirmButton: '[role="dialog"] button[type="submit"], .mat-mdc-dialog-container button[type="submit"], .cdk-overlay-pane button[color="warn"], [role="dialog"] button.mat-warn',
    confirmButtonFallback: '[role="dialog"] button, .cdk-overlay-pane button, .mat-mdc-dialog-container button',
    confirmTextMatches: ['삭제', 'Delete', '이동', 'Move'],
    dialog: '[role="dialog"]'
  },

  // 새 노트북 생성 (홈페이지)
  createNotebook: {
    classes: '.create-new-label, .create-button, .create-new, [class*="create-new"], mat-fab, [class*="mat-fab"]',
    textMatches: ['만들기', '새노트북', 'Createnew', 'Newnotebook', 'Create', 'New'],
    ariaLabels: '[aria-label*="만들기"], [aria-label*="Create"], [aria-label*="New notebook"], [aria-label*="새 노트북"]',
    plusTextMatches: ['+', 'add', 'add_circle'],
    clickable: 'button, [role="button"], a, mat-fab, [class*="fab"], [class*="create"], [class*="new"]',
    clickableText: 'button, [role="button"], a, div[tabindex], span[tabindex]'
  },

  // 소스 추가 (노트북 페이지)
  addSource: {
    ariaLabels: ['소스 추가', '출처 추가', 'Add source', 'Add sources'],
    textMatches: ['소스추가', '출처추가', 'Addsource'],
    buttonSelector: 'button, [role="button"]'
  },

  // URL 입력 (소스 추가 다이얼로그)
  urlInput: {
    textarea: 'textarea[formcontrolname="urls"], textarea[aria-label="URL 입력"]'
  },

  // 노트북 제목 (노트북 페이지 상단)
  notebookTitle: {
    selector: '[class*="notebook-title"] input, [class*="notebook-title"] textarea, [class*="title-input"], input[aria-label*="제목"], input[aria-label*="title"], input[aria-label*="Title"], .notebook-title, [class*="project-title"] input',
    editable: '[contenteditable="true"][class*="title"], [contenteditable="true"][class*="notebook"]',
    heading: 'h1[class*="title"], h2[class*="title"], [class*="notebook-title"], [class*="project-name"]'
  },

  // 채팅 입력 (노트북 메인)
  chatInput: {
    selector: 'textarea.query-box-input, textarea[placeholder*="시작"], textarea[aria-label*="query"], textarea[aria-label*="쿼리"], main textarea'
  },

  // 전송 버튼
  submitButton: {
    selector: 'button[aria-label="제출"]:not([disabled]), button.submit-button:not([disabled])'
  },

  // 소스 삭제 (노트북 페이지 — 소스 패널의 각 소스 아이템)
  sourceDelete: {
    moreButton: 'button[aria-label*="더보기"], button[aria-label*="More"], button[aria-label*="Actions"], button[aria-label*="actions"], button[aria-label*="옵션"], button[aria-label*="Option"], button[aria-label*="menu"], button[aria-label*="메뉴"]',
    moreButtonFallback: 'button[class*="more"], button[class*="menu"], button[class*="option"], button[mat-icon-button], [class*="source"] button',
    menuItem: '.mat-mdc-menu-item, [role="menuitem"], .cdk-overlay-pane button, .mat-menu-item',
    deleteTextMatches: ['삭제', '소스삭제', 'Delete', 'Remove', 'delete', 'remove'],
    confirmButton: '[role="dialog"] button[type="submit"], .mat-mdc-dialog-container button[type="submit"], .cdk-overlay-pane button[color="warn"], [role="dialog"] button.mat-warn',
    confirmButtonFallback: '[role="dialog"] button, .cdk-overlay-pane button, .mat-mdc-dialog-container button',
    confirmTextMatches: ['삭제', 'Delete', '확인', 'Confirm', 'OK', 'Yes']
  },

  // 응답 영역 (복사 버튼용)
  response: {
    containers: '.response-container, .model-response, .markdown-content, .chat-message, message-content, .message-content, [class*="model-response"], [data-message-id], [class*="chat-turn"], [class*="message-body"], .colab-response'
  },

  // 버튼 텍스트 매칭용
  buttons: {
    allButtons: 'button, [role="button"]',
    disabledClass: 'mat-mdc-button-disabled'
  }
};
