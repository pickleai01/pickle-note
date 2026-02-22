# 피클노트 (Pickle Note) — 개발 히스토리 & 브레인스토밍

> **프로젝트명**: 피클노트 (Pickle Note)
> **팀**: 피클AI
> **버전**: v2.0.0
> **개발 기간**: 2026-02-20
> **커뮤니티**: [카카오톡 오픈채팅](https://open.kakao.com/o/gNm1nnhi)

---

## 1. 프로젝트 컨셉 & 브레인스토밍

### 1.1 문제 정의
- YouTube 영상 콘텐츠를 효율적으로 분석/정리하는 수요가 큼
- Google NotebookLM은 강력한 AI 분석 도구이지만, YouTube → NotebookLM 워크플로우가 번거로움
  - 수동으로 NotebookLM 열기 → 노트북 선택/생성 → 소스 추가 → 웹사이트 선택 → URL 붙여넣기 → 삽입 → 프롬프트 작성 → 전송
  - 최소 7단계 이상의 수동 작업 필요
- 반복 작업을 자동화하면 생산성이 크게 향상됨

### 1.2 솔루션 컨셉
**"YouTube 영상 페이지에서 1-Click으로 NotebookLM 자동 분석"**

- Chrome 확장 프로그램 형태
- YouTube 페이지에서 팝업 열기 → 원하는 분석 타입 버튼 클릭 → 자동화 완료
- 사전 정의된 한국어 프롬프트 프리셋 제공
- 커스텀 프롬프트도 지원

### 1.3 타겟 사용자
- 유튜브 학습러 (강의, 세미나, 교육 콘텐츠 정리)
- 콘텐츠 크리에이터 (리서치 및 요약)
- 직장인 (회의 녹화 정리, 세미나 메모)
- 학생 (시험 대비 노트 작성)

### 1.4 핵심 차별점
1. **8가지 한국어 최적화 프리셋** — 단순 요약이 아닌 목적별 분석
2. **완전 자동화** — URL 복붙 없이 1-Click
3. **노트북 관리** — 노트북 선택/생성/삭제까지 확장 프로그램 내에서 가능
4. **커스텀 프롬프트** — 사용자 맞춤 분석 지원

### 1.5 기술 아키텍처 결정

| 결정사항 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Vanilla JS (프레임워크 없음) | Chrome 확장은 번들 크기가 중요. 리뷰 과정에서 빌드 도구 없는 코드가 유리 |
| Manifest | V3 | Chrome Web Store 필수 요구사항 (V2 deprecated) |
| 상태 관리 | chrome.storage.session + local | Service worker 재시작에도 작업 상태 유지 필수 |
| UI 스타일링 | 인라인 CSS | Tailwind 등 빌드 도구 의존성 제거. 단일 파일 관리 |
| DOM 자동화 | CSS 셀렉터 + 폴링 | NotebookLM SPA이므로 MutationObserver보다 폴링이 안정적 |
| 셀렉터 관리 | 중앙 집중 (selectors.js) | NotebookLM UI 변경 시 1개 파일만 수정 |

### 1.6 프롬프트 설계 철학
- **한국어 네이티브** — 모든 프롬프트가 한국어 기반, 전문 용어는 "한국어(원문)" 병기
- **목적별 최적화** — 같은 영상이라도 "학습 노트"와 "회의록"은 완전히 다른 포맷
- **분량 조절** — short/medium/detailed 3단계로 사용자가 원하는 깊이 선택
- **환각 방지** — "영상에 없는 내용을 추가하거나 추측하지 말 것" 규칙 포함

---

## 2. 전략 수립 (3-Phase 로드맵)

### Phase 1: 안정화 (Task 1~4)
> 목표: 신뢰성 있는 기반 코드 구축

| Task | 내용 | 핵심 변경 |
|---|---|---|
| Task 1 | pendingTask를 chrome.storage.session으로 마이그레이션 | Service worker 종료/재시작 시에도 작업 정보 유지 |
| Task 2 | 40+ 하드코딩된 CSS 셀렉터를 selectors.js로 추출 | NotebookLM UI 변경 시 1파일만 수정 |
| Task 3 | withRetry 래퍼 함수 구현 | DOM 조작 실패 시 자동 재시도 (기본 2회) |
| Task 4 | 5단계 진행률 표시 | [1/5]~[5/5] 포맷으로 오버레이+팝업에 진행 상황 표시 |

### Phase 2: 완성도 (Task 5~8)
> 목표: 사용자 경험 완성

| Task | 내용 | 핵심 변경 |
|---|---|---|
| Task 5 | 커스텀 프롬프트 슬롯 (CUSTOM_1, CUSTOM_2) | 모달 UI로 편집/삭제, chrome.storage.local 저장 |
| Task 6 | STUDY_NOTE + MEETING_MEMO 프리셋 추가 | 버튼 4→8개 (2x4 그리드), 시험 대비/회의록 프롬프트 |
| Task 7 | 응답 완료 감지 | MutationObserver + 텍스트 안정성 체크 + 시스템 알림 |
| Task 8 | 정리 및 문서화 | 미사용 파일 삭제, CLAUDE.md 업데이트 |

### Phase 3: 배포 + 퍼널 (Task 9~11)
> 목표: Chrome Web Store 출시 준비

| Task | 내용 | 핵심 변경 |
|---|---|---|
| Task 9 | 스토어 배포 준비 | manifest v2.0.0, 아이콘 생성, 개인정보처리방침 |
| Task 10 | 퍼널 터치포인트 구현 | 푸터 링크, 완료 배너, 설정 카드 (UTM 트래킹) |
| Task 11 | 문서화 최종 업데이트 | CLAUDE.md, 스토어 설명 텍스트 |

---

## 3. Phase 1~3 구현 상세

### 3.1 Phase 1 — 안정화

#### Task 1: chrome.storage.session 마이그레이션
**문제**: background.js의 `let pendingTask`가 Service Worker 종료 시 날아감
**해결**: `chrome.storage.session`에 저장/로드하는 헬퍼 함수 3개 구현
```
getPendingTask() → chrome.storage.session.get('pendingTask')
setPendingTask(task) → chrome.storage.session.set({ pendingTask: task })
clearPendingTask() → chrome.storage.session.remove('pendingTask')
```

#### Task 2: selectors.js 추출
**문제**: content.js 전체에 40+ 하드코딩된 CSS 셀렉터가 분산
**해결**: `SEL` 글로벌 객체에 카테고리별 집중 관리
- `notebook` — 홈페이지 카드 (project-button, title, emoji, link)
- `notebookDelete` — 카드 메뉴 삭제 (더보기, 메뉴, 확인)
- `createNotebook` — 새 노트북 생성 (클래스, 텍스트, aria-label, FAB)
- `addSource` — 소스 추가 버튼
- `urlInput` — URL 입력 textarea
- `chatInput` — 채팅 입력 textarea
- `submitButton` — 전송 버튼
- `sourceDelete` — 소스 삭제
- `response` — 응답 영역 (복사용)
- `buttons` — 범용 버튼 셀렉터

#### Task 3: withRetry 래퍼
**구현**: 제네릭 재시도 래퍼
```js
withRetry(fn, label, maxRetries = 2, delay = 2000)
```
적용 위치 (runAutomation 내 4곳):
1. 소스 추가 버튼 탐색
2. "웹사이트" 버튼 클릭
3. "삽입" 버튼 클릭
4. 전송 버튼 클릭

#### Task 4: 5단계 진행률
```
[1/5] 소스 추가 준비 중...
[2/5] URL 입력 중...
[3/5] 소스 삽입 중...
[4/5] 프롬프트 입력 중...
[5/5] 전송 완료!
```

### 3.2 Phase 2 — 완성도

#### Task 5: 커스텀 프롬프트 슬롯
- **팝업 UI**: 모달 오버레이 (`#custom-modal`) — textarea, 글자 수 카운터, 저장/취소/삭제 버튼
- **저장소**: `chrome.storage.local.customPrompts = { CUSTOM_1: '', CUSTOM_2: '' }`
- **동작**: 프롬프트 미저장 시 클릭 → 모달 열기 / 저장됨 → 자동화 실행
- **편집**: 연필 아이콘으로 저장된 프롬프트도 편집 가능

#### Task 6: STUDY_NOTE + MEETING_MEMO
**학습 노트 (STUDY_NOTE)** 구조:
1. 핵심 개념 정리 (정의 + 예시)
2. 암기 포인트 (수치, 날짜, 고유명사)
3. 연습 문제 (객관식/단답형/서술형 + 정답)
4. 한 페이지 요약

**회의록 (MEETING_MEMO)** 구조:
1. 회의/세미나 개요
2. 주요 내용 요약
3. 논의 사항
4. 결정 사항
5. 액션 아이템 (체크리스트)
6. 미결 이슈

#### Task 7: 응답 완료 감지
> **최종적으로 제거됨** (아래 "후속 개선" 섹션 참조)

초기 구현:
- MutationObserver로 로딩 인디케이터 제거 감지
- 주기적 텍스트 안정성 체크 (N초간 변화 없으면 완료)
- 완료 시: 오버레이 표시, 복사 버튼 플래시, chrome.notifications 알림

제거 이유:
- `[class*="loading"]` 등 넓은 셀렉터가 NotebookLM의 다른 요소에 매칭 → `isLoading()` 영원히 true
- 기존 채팅 텍스트를 새 응답으로 오인 → 조기 완료 판정
- 응답 작성 중에 "완료"로 판정하는 오류
- **최종 결정**: 프롬프트 전송 후 알림 띄우고 오버레이 해제 → 사용자가 직접 응답 확인

#### Task 8: 정리
- `tailwind.output.css` 삭제
- CLAUDE.md 전체 업데이트

### 3.3 Phase 3 — 배포 준비

#### Task 9: Chrome Web Store 준비
- `manifest.json` → version "2.0.0"
- SEO 최적화 타이틀: `"NotebookLM 퀵 요약기 — YouTube 1-Click 자동 분석"`
- 아이콘 생성: `logo.png` → `icon-16.png`, `icon-48.png`, `icon-128.png` (sharp 라이브러리)
- 개인정보처리방침: `docs/privacy-policy.html` (한국어 + English 이중 언어)
- permissions 추가: `"notifications"`

#### Task 10: 퍼널 터치포인트
3곳에 비침투적 터치포인트:
1. **팝업 푸터** — 로고 이미지를 프로젝트 링크로 래핑 + "Made by 피클AI"
2. **완료 배너** — 오버레이 하단 글래스 배너 (→ 이후 제거됨, 응답 감지 제거와 함께)
3. **설정 카드** — 설정 패널에 프로젝트 소개 카드

모든 링크에 UTM 파라미터: `?utm_source=nlm-ext&utm_medium=[touchpoint]`

#### Task 11: 문서화
- CLAUDE.md 최종 버전 작성
- 메시지 타입 표, 스토리지 키 표, 개발 컨벤션 문서화

---

## 4. 후속 개선 (Phase 3 이후)

### 4.1 브랜딩 변경
**변경 전**: "NotebookLM 퀵 가이드"
**변경 후**: "피클노트 — Pickle Note"

- **팀명**: 피클AI
- **로고**: 새 Pickle Note 로고 (`icons/logo.png`)로 교체
- 아이콘 재생성: 16/48/128px PNG
- index.html 타이틀: "피클노트 — Pickle Note"
- 푸터 로고: `logo.webp` → `icons/logo.png`
- 개인정보처리방침: 이메일 `privacy@피클AI.com`

### 4.2 UI 개선 — 헤더 버튼 추가
팝업 헤더에 3개 버튼 추가:

| 버튼 | 아이콘 | 기능 |
|---|---|---|
| NotebookLM 바로가기 | `open_in_new` | notebooklm.google.com 새 탭 열기 |
| 커뮤니티 | `forum` | 카카오톡 오픈채팅 열기 |
| 설정 | `settings` | 설정 패널 토글 |

### 4.3 카카오톡 오픈채팅 커뮤니티
- 링크: `https://open.kakao.com/o/gNm1nnhi`
- 디스코드 vs 카카오톡 검토 → **카카오톡만 선택** (한국 타겟 사용자 접근성)

### 4.4 노트북 삭제 개선
**이전**: NotebookLM 페이지가 아니면 "NotebookLM 페이지에서만 삭제 가능" 에러
**이후**: 어디서든 삭제 가능

구현:
1. popup.js — NotebookLM이 아닐 때 `NOTEBOOKLM_DELETE` 메시지를 background로 전송
2. background.js — `pendingTask`에 `type: '__DELETE__'` 저장 → NotebookLM 홈 탭 열기
3. background.js — `onUpdated`에서 홈페이지 로드 완료 시 `DELETE_NOTEBOOK` 메시지 전송
4. content.js — 4단계 블러 오버레이로 삭제 진행 표시:
   ```
   [1/4] 삭제 준비 — 카드를 찾고 있습니다
   [2/4] 메뉴 열기 — 더보기 버튼을 클릭합니다
   [3/4] 삭제 실행 — 삭제 메뉴를 선택합니다
   [4/4] 삭제 확인 — 확인 버튼을 클릭합니다
   ```

### 4.5 소스 삭제 버그 수정
**증상**: "기존 소스가 삭제가 안되고 있어"

**원인 1** — 셀렉터가 너무 좁음:
- `button[aria-label="더보기"]` (정확한 매치만) → 현재 UI와 불일치
- `.mat-mdc-menu-item` 단일 셀렉터 → 다른 메뉴 요소 놓침
- `'소스삭제'` 단일 텍스트 → 매치 실패

**수정**: notebookDelete와 동일한 수준으로 확장
```js
moreButton: 'button[aria-label*="더보기"], button[aria-label*="More"], ...'
moreButtonFallback: 'button[class*="more"], button[mat-icon-button], ...'
menuItem: '.mat-mdc-menu-item, [role="menuitem"], .cdk-overlay-pane button, ...'
deleteTextMatches: ['삭제', '소스삭제', 'Delete', 'Remove', ...]
```

**원인 2** — 채팅 영역 더보기 버튼 오클릭:
- 페이지 내 모든 "더보기" 버튼을 찾다가 채팅 영역 버튼도 포함
- "채팅 기록 삭제" 메뉴가 "삭제" 텍스트를 포함하여 잘못 매칭
- `moreButtons[0]`만 클릭하므로 소스 버튼이 아닌 채팅 버튼 클릭

**수정**:
1. 버튼 순회: `moreButtons[0]`만 → 모든 버튼 순회하며 올바른 메뉴 찾기
2. 채팅 제외 필터: `text.includes('채팅')` → `isChat` 플래그로 건너뜀
3. 1개 삭제 후 `break` → 버튼 목록 새로고침 후 재탐색

### 4.6 채팅 기록 삭제 추가
**요구사항**: 소스 삭제 시 채팅 기록도 함께 삭제
**구현**: `deleteChatHistory()` 함수 추가
- 소스 전체 삭제 완료 후 자동 호출
- 더보기 버튼 순회 → "채팅 기록 삭제" 메뉴 찾기 (채팅 + 삭제 포함)
- 확인 다이얼로그 클릭

### 4.7 노트북 제목 자동 변경
**요구사항**:
- 새 노트북 생성 시 → YouTube 영상 제목으로 노트북 이름 설정
- 기존 노트북 + 소스 삭제 시 → 새 영상 제목으로 업데이트

**구현 흐름**:
1. **popup.js** — `tabs[0].title`에서 " - YouTube" 제거하여 `videoTitle` 추출
2. **background.js** — `videoTitle`, `createNew` 플래그를 pendingTask → START_AUTOMATION으로 전달
3. **content.js** — `renameNotebook(title)` 함수:
   - input/textarea 기반: `HTMLInputElement.prototype.value.set` + input/change 이벤트
   - contenteditable 기반: `execCommand('selectAll')` + `execCommand('insertText')`
   - heading 클릭으로 편집 모드 진입 후 재탐색
4. **호출 조건**: `createNew === true` 또는 `clearSources === true`

### 4.8 새 노트북 생성 안정성 개선
**증상**: 노트북 없을 때 생성이 안 됨

**원인**:
1. background.js에서 CREATE_NOTEBOOK 메시지 전송까지 2초 대기 → SPA 렌더링 부족
2. content.js에서 `sleep(2000)` 1회만 대기 후 탐색 → 만들기 버튼 미렌더링 시 실패

**수정**:
1. background.js: 2초 → 4초 대기
2. content.js: 최대 15초 폴링 (1초 간격으로 반복 탐색)

### 4.9 노트북 선택 상태 유실 버그 수정
**증상**: "무조건 새 노트북으로 생성"

**원인**: `loadNotebookList()`에서 `notebooks` 배열이 비어있으면 (스캔 전) `selectedNotebookId`가 목록에 없다고 판단 → 선택 초기화 → `notebookId` 빈 문자열 → `'__NEW__'`

**수정**:
```js
if (notebooks.length > 0) {
  // 목록이 있을 때만 검증
  const stillExists = notebooks.find(nb => nb.id === selectedNotebookId);
  if (stillExists) notebookId = selectedNotebookId;
  else /* 삭제된 것 → 초기화 */
} else {
  // 목록이 비어있으면 기존 선택 유지 (아직 스캔 전)
  notebookId = selectedNotebookId;
  notebookSource = 'storage';
}
```

### 4.10 응답 완료 감지 → 제거 및 간소화
**문제**: 응답 완료 감지가 불안정
- `[class*="loading"]` 셀렉터가 페이지의 다른 요소에 매칭 → 영원히 로딩 상태
- 기존 채팅 텍스트를 새 응답으로 오인 → 즉시 "완료" 판정
- 응답 작성 중에 잠시 멈추면 "완료"로 판정

**단계적 수정 시도**:
1. 넓은 셀렉터 제거 (`[class*="loading"]`, `[class*="typing"]`)
2. `baselineText` 스냅샷으로 기존 텍스트 구분
3. `STABLE_THRESHOLD` 4초 → 6초로 증가
4. **최종 결정**: 전체 제거

**최종 구현**:
- 프롬프트 전송 완료 시 시스템 알림 (`chrome.notifications`)
- 2.5초 후 오버레이 자동 해제
- 사용자가 직접 응답 작성 과정 확인 가능

### 4.11 오버레이 "숨기기" 버튼 추가
**요구사항**: 블러 오버레이 때문에 뒤에서 실제로 뭐가 일어나는지 확인 불가
**구현**: 오버레이 하단에 "숨기기" 버튼 → 클릭 시 오버레이 즉시 해제 (자동화는 계속 진행)

### 4.12 프롬프트 미리보기 디자인
**요구사항**: 4단계에서 어떤 프롬프트가 입력되는지 더 많이 보여주기

**구현**: 오버레이에 글래스 스타일 프롬프트 미리보기 박스 추가
- 최대 520px 너비, 240px 높이 (스크롤 가능)
- `white-space: pre-wrap` — 프롬프트 포맷 유지
- 커스텀 스크롤바 (4px, 반투명 흰색)
- "입력 프롬프트" 라벨 표시
- 5단계 전환 시 자동 숨김 (`promptText === null`)

### 4.13 노트북 상세페이지에서 삭제 불가 버그 수정
**증상**: 노트북 상세페이지(`/notebook/XXX`)에서 팝업의 삭제 버튼 클릭 시 삭제 안 됨

**원인**: `popup.js`에서 `isOnNotebookLM`이 true이면 무조건 현재 탭에 `DELETE_NOTEBOOK` 메시지를 전송했으나, 상세페이지에는 노트북 카드(project-button)가 없어 `deleteNotebook()`이 카드를 찾지 못하고 실패

**수정**: 홈페이지 여부를 추가 판별
```js
const isOnHomepage = isOnNotebookLM && !currentUrl.includes('/notebook/');
if (isOnHomepage) {
  // 홈페이지 → 직접 DELETE_NOTEBOOK 전송
} else {
  // 상세페이지 or 외부 → NOTEBOOKLM_DELETE → background가 홈으로 이동 → 삭제
}
```

**영향 파일**: `popup.js` (삭제 버튼 이벤트 핸들러)

### 4.14 삭제 확인 다이얼로그 미처리 — "삭제 완료" 거짓 보고 수정
**증상**: 노트북 삭제 시 "삭제 완료"라고 표시되지만 실제로는 삭제가 안 됨

**원인**: `deleteNotebook()`에서 확인 다이얼로그 버튼을 못 찾아도 에러 처리 없이 "삭제 완료!" 메시지를 출력
```js
// 기존 코드 — 확인 버튼 실패해도 무조건 "완료" 보고
if (confirmBtn) { confirmBtn.click(); }
else { console.log('못 찾음'); }
updateOverlay('"..." 삭제 완료!');  // ← 항상 실행됨
```

**수정 3가지**:
1. **확인 버튼 폴링** — 1회 탐색 → 최대 5초(500ms × 10회) 폴링. 다이얼로그 렌더링 대기
2. **확인 실패 시 즉시 리턴** — 버튼 못 찾으면 "삭제 실패" 보고 후 `return`
3. **삭제 검증** — 확인 클릭 후 카드가 실제로 DOM에서 사라졌는지 최대 5초간 확인. 남아있으면 "삭제 확인 필요" 경고

**영향 파일**: `content.js` (`deleteNotebook` 함수)

### 4.15 복사 버튼 개선
**증상**: "응답 복사" 버튼이 작동하지 않음

**원인**: `SEL.response.containers` 셀렉터가 현재 NotebookLM UI에 매칭되지 않음

**수정**:
1. 셀렉터 확장: `message-content`, `[data-message-id]`, `[class*="chat-turn"]`, `[class*="message-body"]` 추가
2. fallback 추가: `main div, main section, main p` 중 100자 이상인 요소에서 탐색
3. 디버그 로그: 클릭 시 매칭된 블록 수와 텍스트 미리보기 콘솔 출력

---

## 5. 최종 파일 구조

```
C:\jnk\1000_notebooklm\
├── manifest.json          — MV3 매니페스트 v2.0.0
├── background.js          — Service Worker (146줄)
│                            pendingTask 관리, 메시지 중계, 탭 로딩 감지
├── selectors.js           — 중앙 셀렉터 관리 (88줄)
│                            SEL 객체: notebook, notebookDelete, createNotebook,
│                            addSource, urlInput, notebookTitle, chatInput,
│                            submitButton, sourceDelete, response, buttons
├── content.js             — Content Script (887줄)
│                            DOM 자동화, 오버레이, 소스/채팅 삭제, 노트북 제목 변경,
│                            프롬프트 입력, 복사 버튼, 노트북 스캔/생성/삭제
├── popup.js               — Popup 로직 (398줄)
│                            노트북 목록, 액션 버튼, 커스텀 모달, 설정
├── index.html             — Popup UI (400줄)
│                            글래스모피즘 디자인, 2x4 버튼 그리드, 커스텀 모달
├── icons/
│   ├── logo.png           — Pickle Note 원본 로고
│   ├── icon-16.png        — 툴바 아이콘
│   ├── icon-48.png        — 확장 프로그램 관리 아이콘
│   └── icon-128.png       — Chrome Web Store 아이콘
├── fonts/
│   ├── Inter-*.woff2      — Inter 폰트 (Regular, Medium, SemiBold, Bold)
│   └── MaterialSymbols*.woff2 — Material Symbols Outlined
├── docs/
│   ├── privacy-policy.html — 개인정보처리방침 (한국어 + English)
│   ├── DEVELOPMENT_HISTORY.md — 이 문서
│   └── plans/
│       ├── 2026-02-20-phase1-stabilization.md
│       ├── 2026-02-20-phase2-completeness.md
│       └── 2026-02-20-phase3-deployment-funnel.md
└── CLAUDE.md              — 프로젝트 기술 문서
```

---

## 6. 메시지 아키텍처

```
[Popup] ──NOTEBOOKLM_AUTOMATION──→ [Background] ──(탭 열기)──→ [Content Script]
  │         (type, url, videoTitle,       │                          │
  │          notebookId, clearSources,    │    CREATE_NOTEBOOK       │
  │          lang, length, customPrompt)  │────────────────────────→ │
  │                                       │                          │
  │                                       │    START_AUTOMATION      │
  │                                       │────────────────────────→ │
  │                                       │    (url, videoTitle,     │
  │                                       │     createNew, type,     │
  │                                       │     clearSources, ...)   │
  │                                       │                          │
  │←──POPUP_STATUS──────[Background]←─────POPUP_STATUS───────────────│
  │←──NOTEBOOK_LIST_UPDATED──[BG]←────────NOTEBOOK_LIST_UPDATED──────│
  │                                       │                          │
  │                    [Background]←──────SHOW_NOTIFICATION───────────│
  │                         │                                        │
  │                  chrome.notifications                             │
  │                                                                  │
  │──NOTEBOOKLM_DELETE──→ [Background] ──(탭 열기)──→ DELETE_NOTEBOOK │
```

---

## 7. 8가지 프롬프트 프리셋 상세

| 타입 | 이름 | 출력 포맷 |
|---|---|---|
| `FULL_DOC` | 전체 요약 | 한 줄 요약 → 핵심 내용 (주제별) → 기억할 포인트 → 한계/주의 |
| `FAQ` | 핵심 Q&A | Q1/A1 ~ Q5/A5 → 한 줄 결론 |
| `PODCAST` | 팟캐스트 | 수진(전문가) + 민호(청취자) 대화체 스크립트 |
| `FULL_TEXT` | 전문 기록 | 요약 없이 말한 순서 그대로 전문 기록 |
| `STUDY_NOTE` | 학습 노트 | 핵심 개념 → 암기 포인트 → 연습 문제(정답 포함) → 한 페이지 요약 |
| `MEETING_MEMO` | 회의록 | 개요 → 주요 내용 → 논의 사항 → 결정 사항 → 액션 아이템 → 미결 이슈 |
| `CUSTOM_1` | 커스텀 1 | 사용자 정의 (최대 5000자) |
| `CUSTOM_2` | 커스텀 2 | 사용자 정의 (최대 5000자) |

**분량 옵션별 차이 (FULL_DOC 기준)**:
- `short`: 2~3개 주제, 각 1~2줄
- `medium`: 3~5개 주제, 각 2~4줄
- `detailed`: 5~7개 주제, 각 4~6줄

---

## 8. 스토리지 키 전체 목록

| 키 | 위치 | 타입 | 설명 |
|---|---|---|---|
| `pendingTask` | session | Object | 진행 중 자동화 작업 (SW 재시작 시에도 유지, 탭 종료 시 삭제) |
| `notebooks` | local | Array | 스캔된 노트북 목록 `[{ id, title }]` |
| `selectedNotebookId` | local | String | 선택된 노트북 UUID |
| `notebookUrl` | local | String | 수동 설정된 노트북 전체 URL |
| `customPrompts` | local | Object | `{ CUSTOM_1: '...', CUSTOM_2: '...' }` |

---

## 9. 권한 및 호스트 권한

| 권한 | 용도 |
|---|---|
| `tabs` | 현재 탭 URL 확인 (YouTube 영상 감지) |
| `scripting` | NotebookLM 페이지에 자동화 스크립트 실행 |
| `activeTab` | 활성 탭 정보 접근 |
| `storage` | 로컬/세션 설정 저장 |
| `notifications` | 자동화 완료 시스템 알림 |
| `*://*.youtube.com/*` | YouTube 영상 URL 감지 및 제목 추출 |
| `*://notebooklm.google.com/*` | NotebookLM 페이지 DOM 자동화 |

---

## 10. 배포 전 체크리스트

- [x] `{{PROJECT_URL}}` 플레이스홀더 교체 완료 (카카오톡 오픈채팅 링크로 대체)
- [x] manifest.json name/description 최종 확인 ("피클노트 — YouTube → NotebookLM 1-Click 자동 요약")
- [ ] 개인정보처리방침 URL GitHub Pages에 배포
- [ ] Chrome Web Store 개발자 계정 등록 ($5 일회성)
- [ ] 스토어 스크린샷 준비 (1280x800 또는 640x400)
- [ ] 프로모션 이미지 준비 (440x280)
- [ ] 카테고리: "Productivity" 선택
- [ ] 스토어 설명 (한국어 + 영어) 작성
- [ ] 개인정보처리방침 링크 입력
- [ ] 테스트 매트릭스 실행:
  - 8 프리셋 × 3 분량 × 4 언어 = 96 조합 (주요 조합만 테스트)
  - 새 노트북 생성 / 기존 노트북 사용
  - 소스 삭제 on/off
  - 노트북 삭제
  - 복사 버튼 동작

---

## 11. 알려진 제한사항

1. **NotebookLM UI 의존성** — Google이 NotebookLM DOM 구조를 변경하면 `selectors.js` 업데이트 필요
2. **SPA 타이밍** — NotebookLM이 Angular SPA이므로 DOM 렌더링 타이밍에 의존 (폴링으로 대응)
3. **제목 변경** — NotebookLM의 제목 편집 UI가 변경되면 `renameNotebook` 업데이트 필요
4. **복사 버튼** — 응답 영역 셀렉터가 맞지 않으면 복사 실패 가능 (fallback으로 대응)
5. **단일 탭** — 동시에 여러 자동화는 미지원 (pendingTask가 1개만 저장)

---

*마지막 업데이트: 2026-02-21*
*작성: Claude (피클AI 개발 어시스턴트)*
