# 피클노트 — Chrome Web Store 배포 가이드

> **작성일**: 2026-02-20
> **현재 버전**: v2.0.0

---

## 1. 배포 전 체크리스트

### 파일 점검
- [x] `manifest.json` — 이름, 버전, 설명 확인
- [x] `index.html` — `{{PROJECT_URL}}` 플레이스홀더 제거 완료
- [x] `docs/privacy-policy.html` — 개인정보처리방침 (한/영)
- [x] `icons/` — icon-16.png, icon-48.png, icon-128.png
- [ ] 스크린샷 5장 준비 (아래 섹션 참고)
- [ ] 프로모션 이미지 준비 (선택)

### 기능 최종 테스트
- [ ] YouTube 영상 페이지에서 팝업 열기
- [ ] 새 노트북 생성 → 자동화 완료
- [ ] 기존 노트북 선택 → 소스 삭제 → 자동화 완료
- [ ] 커스텀 프롬프트 저장/실행
- [ ] 노트북 삭제
- [ ] 복사 버튼 동작

---

## 2. 개발자 계정 등록

### 2-1. Chrome Web Store 개발자 등록
1. https://chrome.google.com/webstore/devconsole 접속
2. Google 계정으로 로그인
3. **등록비 $5** (1회) 결제
4. 개발자 이름, 이메일, 연락처 입력
5. 개발자 약관 동의

> **주의**: 결제 후 승인까지 최대 24시간 소요될 수 있음

### 2-2. 개인정보처리방침 URL 준비
개인정보처리방침을 **공개 URL**로 호스팅해야 합니다.

**방법 1: GitHub Pages (무료, 추천)**
```bash
# 1. GitHub 저장소 생성 (예: pickle-note-privacy)
# 2. docs/privacy-policy.html 파일 업로드
# 3. Settings → Pages → Source: main branch → /root
# 4. URL 예시: https://username.github.io/pickle-note-privacy/privacy-policy.html
```

**방법 2: GitHub Gist**
```
1. gist.github.com에 privacy-policy.html 업로드
2. Raw 링크 사용
```

**방법 3: Notion 공개 페이지**
```
1. Notion에 개인정보처리방침 내용 작성
2. "공유" → "웹에 공개" 활성화
3. 공개 URL 복사
```

---

## 3. 패키징 (ZIP 파일 생성)

### 포함할 파일 (v2.0.0 기준 — 총 3.9MB)
```
pickle-note-v2.0.0.zip (3.9 MB)
├── manifest.json              1.1 KB
├── background.js              5.2 KB
├── selectors.js               4.7 KB
├── content.js                  43 KB
├── popup.js                    16 KB
├── index.html                  24 KB
├── icons/
│   ├── icon-16.png            740 B
│   ├── icon-48.png            4.2 KB
│   ├── icon-128.png            22 KB
│   └── logo.png               136 KB
└── fonts/
    ├── Inter.woff2             22 KB
    └── MaterialSymbolsOutlined.woff2  3.7 MB
```

### 제외할 파일 (ZIP에 넣지 말 것)
```
docs/               ← 개발 문서 (배포 불필요)
CLAUDE.md           ← 개발 가이드 (배포 불필요)
*.md                ← 루트의 전략/리뷰 문서들
logo.webp           ← 원본 이미지 (아이콘만 필요)
.claude/            ← 에디터 설정
```

### ZIP 생성 명령어 (검증 완료)

**Git Bash (검증 완료된 명령어):**
```bash
# 1. 릴리스 폴더에 배포 파일만 복사
cd /c/jnk
mkdir -p pickle-note-release/icons pickle-note-release/fonts

cp /c/jnk/1000_notebooklm/manifest.json \
   /c/jnk/1000_notebooklm/background.js \
   /c/jnk/1000_notebooklm/selectors.js \
   /c/jnk/1000_notebooklm/content.js \
   /c/jnk/1000_notebooklm/popup.js \
   /c/jnk/1000_notebooklm/index.html \
   pickle-note-release/

cp /c/jnk/1000_notebooklm/icons/icon-16.png \
   /c/jnk/1000_notebooklm/icons/icon-48.png \
   /c/jnk/1000_notebooklm/icons/icon-128.png \
   /c/jnk/1000_notebooklm/icons/logo.png \
   pickle-note-release/icons/

cp /c/jnk/1000_notebooklm/fonts/Inter.woff2 \
   /c/jnk/1000_notebooklm/fonts/MaterialSymbolsOutlined.woff2 \
   pickle-note-release/fonts/

# 2. ZIP 생성
rm -f pickle-note-v2.0.0.zip
cd pickle-note-release
powershell.exe -Command "Compress-Archive -Path 'C:\jnk\pickle-note-release\*' -DestinationPath 'C:\jnk\pickle-note-v2.0.0.zip' -Force"

# 결과: C:\jnk\pickle-note-v2.0.0.zip (3.9 MB)
```

### 버전 업데이트 시 ZIP 재생성
```bash
# manifest.json version 수정 후:
rm -rf /c/jnk/pickle-note-release
# 위 명령어 다시 실행 (버전 번호만 변경)
```

---

## 4. Chrome Web Store 제출

### 4-1. 대시보드 접속
https://chrome.google.com/webstore/devconsole

### 4-2. 새 항목 추가
1. **"새 항목"** 버튼 클릭
2. ZIP 파일 업로드 (`pickle-note-v2.0.0.zip`)
3. 업로드 완료 후 각 탭 입력

### 4-3. 스토어 등록 정보 입력

#### 기본 정보
| 항목 | 입력값 |
|---|---|
| **언어** | 한국어 |
| **확장 프로그램 이름** | 피클노트 — YouTube → NotebookLM 1-Click 자동 요약 |
| **간단한 설명** (132자 이내) | YouTube 영상을 1클릭으로 NotebookLM에 보내 자동 요약. 전체요약, FAQ, 학습노트, 팟캐스트 등 8가지 모드 지원. 완전 무료. |
| **상세 설명** | 아래 참고 |
| **카테고리** | 생산성 (Productivity) |

#### 상세 설명 (복사해서 사용)
```
🥒 피클노트 — YouTube 영상을 1-Click으로 NotebookLM 자동 요약

유튜브 영상을 보면서 직접 정리하느라 시간 낭비하고 계신가요?
피클노트는 YouTube 영상 URL을 1클릭으로 Google NotebookLM에 보내,
소스 추가부터 프롬프트 입력까지 자동으로 처리합니다.

━━━━━━━━━━━━━━━━━━━━

📌 주요 기능

✅ 8가지 요약 모드
  • 전체 요약 — 핵심 포인트 + 기억할 내용
  • 핵심 Q&A — 영상의 핵심 질답 추출
  • 팟캐스트 — 대화체 스크립트 생성
  • 원본 보기 — 전문 텍스트 기록
  • 학습 노트 — 개념 정리 + 연습문제
  • 회의록 — 결정사항 + 액션아이템
  • 커스텀 1, 2 — 나만의 프롬프트 저장

✅ 편의 기능
  • 노트북 자동 생성 / 선택 / 삭제
  • 기존 소스 삭제 후 새 소스 추가
  • YouTube 영상 제목으로 노트북 이름 자동 설정
  • 한국어 / English / 日本語 / 中文 지원
  • 간략 / 기본 / 상세 분량 조절

━━━━━━━━━━━━━━━━━━━━

🔒 개인정보 보호
  • 서버로 데이터를 전송하지 않습니다
  • 모든 설정은 브라우저 로컬에만 저장됩니다
  • 분석 도구(Google Analytics 등)를 사용하지 않습니다

━━━━━━━━━━━━━━━━━━━━

💡 사용법
  1. YouTube 영상 페이지에서 피클노트 아이콘 클릭
  2. 원하는 요약 모드 선택 (전체 요약, Q&A 등)
  3. NotebookLM이 자동으로 열리고, 소스 추가 + 프롬프트 입력
  4. 완료 알림이 오면 결과 확인!

━━━━━━━━━━━━━━━━━━━━

📣 피드백 & 커뮤니티
  • 카카오톡 오픈채팅: https://open.kakao.com/o/gNm1nnhi
  • 기능 요청, 버그 제보, 사용 팁 공유 환영!

Made by 피클AI
```

#### 스크린샷 (최소 1장, 권장 5장)

| 순서 | 내용 | 사이즈 |
|:---:|---|---|
| 1 | **팝업 UI 전체** — 8개 버튼 + 상태 표시 | 1280x800 또는 640x400 |
| 2 | **자동화 과정** — 오버레이 + 프롬프트 미리보기 | 1280x800 |
| 3 | **결과물: 전체 요약** | 1280x800 |
| 4 | **결과물: 학습 노트 또는 Q&A** | 1280x800 |
| 5 | **노트북 목록 관리** — 선택/삭제 | 1280x800 |

**스크린샷 촬영 방법:**
1. `Win+Shift+S`로 영역 캡처
2. 또는 Chrome DevTools → `Ctrl+Shift+P` → "Capture screenshot"
3. 팝업 캡처: 팝업 열고 `Alt+PrintScreen`

> **크기**: 1280x800px 또는 640x400px (PNG/JPEG, 최대 크기 제한 없음)

#### 프로모션 이미지 (선택)
| 타입 | 사이즈 | 용도 |
|---|---|---|
| 작은 타일 | 440x280px | 검색 결과 |
| 마키 | 1400x560px | 추천 배너 |

### 4-4. 개인정보 탭

| 항목 | 입력값 |
|---|---|
| **단일 목적** | YouTube 영상을 Google NotebookLM에 1클릭으로 보내 자동 요약을 생성합니다 |
| **권한 정당성 — tabs** | 현재 탭의 YouTube URL과 영상 제목을 읽어 NotebookLM에 전달하기 위해 필요합니다 |
| **권한 정당성 — scripting** | NotebookLM 페이지에서 소스 추가, 프롬프트 입력 등 DOM 자동화를 수행하기 위해 필요합니다 |
| **권한 정당성 — activeTab** | 활성 탭의 URL 정보에 접근하여 YouTube 영상을 감지하기 위해 필요합니다 |
| **권한 정당성 — storage** | 사용자 설정(노트북 URL, 언어, 분량, 커스텀 프롬프트)을 로컬에 저장하기 위해 필요합니다 |
| **권한 정당성 — notifications** | 자동화 완료 시 사용자에게 알림을 표시하기 위해 필요합니다 |
| **호스트 권한 — youtube.com** | YouTube 영상 URL과 제목을 감지하기 위해 필요합니다 |
| **호스트 권한 — notebooklm.google.com** | NotebookLM에서 소스 추가, 프롬프트 입력 자동화를 수행하기 위해 필요합니다 |
| **개인정보처리방침 URL** | (GitHub Pages 등으로 호스팅한 URL 입력) |
| **데이터 수집 여부** | 수집하지 않음 |
| **원격 코드 사용** | 아니오 |

### 4-5. 배포 설정

| 항목 | 선택 |
|---|---|
| **공개 범위** | 공개 (Public) |
| **지역** | 모든 지역 |

### 4-6. 제출
1. 모든 탭 입력 완료 확인
2. **"검토를 위해 제출"** 버튼 클릭
3. 심사 대기 (보통 1~3 영업일, 최대 7일)

---

## 5. 심사 과정

### 심사 기간
- **첫 제출**: 1~7 영업일 (보통 2~3일)
- **업데이트**: 1~3 영업일

### 자주 거절되는 사유 & 대응

| 거절 사유 | 대응 방법 |
|---|---|
| **권한 과다** | 각 권한이 왜 필요한지 상세 설명 (4-4 참고) |
| **단일 목적 불명확** | "YouTube → NotebookLM 자동 요약" 한 문장으로 명확히 |
| **원격 코드 실행** | 외부 스크립트 로드 없음. 모든 코드 번들에 포함 |
| **개인정보 처리방침 누락** | 반드시 공개 URL 필요 |
| **기만적 설치 유도** | 설명과 실제 기능 일치 확인 |
| **notebooklm.google.com 호스트 권한** | "사용자가 명시적으로 요약 버튼을 클릭한 경우에만 동작"이라고 설명 |

### 거절 시 대응 절차
1. 대시보드에서 거절 사유 확인
2. 해당 사항 수정
3. ZIP 재업로드
4. 다시 제출

---

## 6. 업데이트 방법

1. `manifest.json`에서 `version` 올리기 (예: `"2.0.1"`)
2. 새 ZIP 파일 생성
3. 대시보드 → 해당 확장 → **"패키지"** 탭 → 새 ZIP 업로드
4. 변경사항 입력 후 **"검토를 위해 제출"**

---

## 7. 배포 후 확인

- [ ] Chrome Web Store에서 검색되는지 확인 (게시 후 몇 시간 소요)
- [ ] 스토어 링크로 직접 설치 테스트
- [ ] 설치 후 기능 정상 동작 확인
- [ ] 카카오톡 커뮤니티에 출시 공지
- [ ] 홍보 채널에 스토어 링크 포함하여 게시 (→ `MARKETING_GUIDE.md` 참고)

---

## 빠른 참조: 전체 흐름 요약

```
1. 개발자 계정 등록 ($5)
2. 개인정보처리방침 URL 준비 (GitHub Pages 추천)
3. 스크린샷 5장 촬영
4. ZIP 파일 생성 (배포 파일만)
5. Chrome Web Store 대시보드에서 업로드
6. 스토어 정보 입력 (이름, 설명, 스크린샷, 권한 정당성)
7. "검토를 위해 제출" 클릭
8. 심사 대기 (1~7일)
9. 승인 → 자동 게시
```
