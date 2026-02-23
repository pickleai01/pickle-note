# 피클노트 (Pickle Note) — YouTube 1-Click NotebookLM 자동 분석 (v2.0.0)

## 프로젝트 개요
YouTube 영상 URL을 1-Click으로 Google NotebookLM에 보내, 자동으로 소스를 추가하고 프롬프트를 입력해 핵심 내용을 추출하는 Chrome 확장 프로그램.

- **팀**: 피클AI
- **커뮤니티**: [카카오톡 오픈채팅](https://open.kakao.com/o/gNm1nnhi)

## 기술 스택
- **Chrome Extension Manifest V3** (service worker 기반)
- **Vanilla JS** — 프레임워크 없음
- **인라인 CSS** (index.html 내 `<style>`)
- **폰트**: Inter (woff2), Material Symbols Outlined (woff2) — `fonts/` 디렉터리에 로컬 번들

## 파일 구조
```
manifest.json       — MV3 매니페스트 v2.0.0
background.js       — Service Worker: 메시지 중계, 탭 로딩 감지, pendingTask 관리
selectors.js        — DOM 셀렉터 집중 관리 (SEL 객체)
content.js          — Content Script: NotebookLM DOM 자동화 전체
popup.js            — Popup UI 로직: 노트북 목록, 액션 버튼, 커스텀 모달
index.html          — Popup HTML + 인라인 CSS
icons/              — logo.png (원본), icon-16/48/128.png
fonts/              — Inter, Material Symbols Outlined woff2
docs/               — privacy-policy.html, DEVELOPMENT_HISTORY.md, plans/
```

## 아키텍처 — 메시지 흐름
```
[Popup] → NOTEBOOKLM_AUTOMATION → [Background] → (탭 열기) → [Content Script]
                                                               ↓
[Popup] ← POPUP_STATUS ← [Background] ← POPUP_STATUS ← [Content Script]
[Popup] ← NOTEBOOK_LIST_UPDATED ← [Background] ← [Content Script]
[Content] → SHOW_NOTIFICATION → [Background] → chrome.notifications
```

### 메시지 타입
| target / action | 방향 | 설명 |
|---|---|---|
| `NOTEBOOKLM_AUTOMATION` | Popup → BG | 자동화 요청 (type, url, videoTitle, notebookId, clearSources, lang, length, customPrompt) |
| `POPUP_STATUS` | Content → BG → Popup | 상태 메시지 중계 |
| `NOTEBOOK_LIST_UPDATED` | Content → BG → Popup | 노트북 목록 갱신 |
| `SHOW_NOTIFICATION` | Content → BG | 시스템 알림 |
| `NOTEBOOKLM_DELETE` | Popup → BG | 노트북 삭제 (자동 이동) |
| `CREATE_NOTEBOOK` | BG → Content | 새 노트북 생성 |
| `START_AUTOMATION` | BG → Content | 자동화 시작 (videoTitle, createNew 포함) |
| `SCAN_NOTEBOOKS` | Popup → Content | 노트북 목록 스캔 |
| `DELETE_NOTEBOOK` | Popup/BG → Content | 노트북 삭제 실행 |

## 핵심 기능

### 1. 8가지 요약 모드
- **FULL_DOC** — 전체 요약 (한 줄 요약 + 핵심 + 기억할 포인트)
- **FAQ** — 핵심 Q&A
- **PODCAST** — 팟캐스트 스크립트 (수진/민호 대화체)
- **FULL_TEXT** — 원본 전문 기록
- **STUDY_NOTE** — 학습 노트 (개념 + 암기 + 연습문제)
- **MEETING_MEMO** — 회의록 (요약 + 결정사항 + 액션아이템)
- **CUSTOM_1 / CUSTOM_2** — 사용자 정의 프롬프트

### 2. 옵션
- **언어**: ko / en / ja / zh
- **분량**: short / medium / detailed
- **기존 소스 삭제**: 체크 시 소스 + 채팅 기록 모두 삭제 후 새 소스 추가

### 3. 노트북 관리
- 홈페이지 자동 스캔 (project-button DOM)
- 노트북 선택/생성/삭제 (어디서든 가능, 자동 이동)
- 선택 상태 유지: notebooks 비어있어도 selectedNotebookId 보존
- 새 노트북 생성 시 YouTube 영상 제목으로 이름 자동 설정
- 기존 노트북 + 소스 삭제 시에도 제목 자동 업데이트

### 4. DOM 자동화 (content.js)
- `withRetry` — 자동 재시도 래퍼 (기본 2회)
- `deleteAllSources` — 소스 패널 순회 삭제 (채팅 메뉴 제외 필터)
- `deleteChatHistory` — 채팅 기록 삭제 (소스 삭제 후 자동 호출)
- `renameNotebook` — 노트북 제목 변경 (input/textarea/contenteditable 대응)
- `runAutomation` — 5단계: 소스추가 → URL입력 → 삽입 → 프롬프트입력 → 전송
- `deleteNotebook` — 4단계 블러 오버레이 삭제
- 로딩 오버레이: blur backdrop, spinner, 프롬프트 미리보기 박스, 숨기기 버튼
- 전송 완료 시: 시스템 알림 + 2.5초 후 오버레이 해제

### 5. 플로팅 복사 버튼
- 자동화 후 우하단에 `📋 응답 복사` FAB 주입
- 1차: SEL.response.containers 셀렉터 / 2차: main 내 긴 텍스트 블록 fallback

## 스토리지 키
| 키 | 위치 | 설명 |
|---|---|---|
| `pendingTask` | session | 자동화 작업 정보 (SW 재시작 유지) |
| `notebooks` | local | 노트북 목록 `[{ id, title }]` |
| `selectedNotebookId` | local | 선택된 노트북 ID |
| `notebookUrl` | local | 수동 설정 노트북 URL |
| `customPrompts` | local | `{ CUSTOM_1, CUSTOM_2 }` |

## 배포 상태
- **GitHub**: https://github.com/pickleai01/pickle-note
- **개인정보처리방침**: https://pickleai01.github.io/pickle-note/docs/privacy-policy.html
- **Chrome Web Store**: 심사 중 (1차 반려 후 `scripting` 권한 제거하여 재제출)
- **ZIP**: `pickle-note/pickle-note-v2.0.0.zip`
- **배포 히스토리**: `docs/DEVELOPMENT_HISTORY.md` 섹션 12 참조
- **외부 AI 리뷰**: `docs/PERPLEXITY_REVIEW.md`, `docs/GROK_REVIEW.md`
- **기능 명세서**: `docs/FEATURE_SPEC.md`

## 개발 컨벤션
- 한국어 주석, 한/영 양쪽 텍스트 매칭
- `HTMLTextAreaElement.prototype.value.set` 패턴으로 Angular controlled input 우회
- DOM 셀렉터는 selectors.js의 SEL 객체에 집중 관리
- 에러 시 콘솔 `[NLM-EXT]` 로그 + 팝업 상태 메시지 동시 출력

## 빌드 & 실행
프레임워크/번들러 없음. `chrome://extensions` → "압축 해제된 확장 프로그램 로드"로 프로젝트 폴더 직접 로드.

## 상세 히스토리
`docs/DEVELOPMENT_HISTORY.md` 참조 — 브레인스토밍, 전략, 전체 구현/수정 이력 포함.
