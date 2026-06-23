# KCopyMoney PWA

Minervini 전략 자동매매 모니터링 앱 (읽기 전용).

## 파일 구조

```
pwa/
├─ index.html              ← 앱 본체 (이게 진입점)
├─ manifest.json           ← PWA 설정 (이름·아이콘·전체화면)
├─ sw.js                   ← 서비스워커 (앱 셸 캐시, /api/는 항상 네트워크)
├─ favicon.ico
└─ icons/
   ├─ icon-192.png
   ├─ icon-512.png
   ├─ icon-maskable-512.png
   └─ apple-touch-icon.png
```

## VPS 배포 (방법 A — FastAPI가 같이 서빙)

FastAPI에서 이 `pwa/` 폴더를 정적 파일로 서빙하면 끝. 예시:

```python
from fastapi.staticfiles import StaticFiles
# API 라우트들 (/api/...) 정의한 뒤, 마지막에:
app.mount("/", StaticFiles(directory="pwa", html=True), name="static")
```

- 같은 도메인에서 API(`/api/...`)와 앱이 함께 제공되므로 CORS 불필요.
- **HTTPS 필수**: 서비스워커는 https에서만 동작 (localhost 예외).
  도메인이 있으면 Caddy나 nginx + Let's Encrypt로 인증서 자동 발급 권장.

## 아이폰12 설치 (최종 사용자)

1. **사파리**로 배포된 URL 접속 (크롬 아님 — iOS는 사파리만 홈 추가 지원)
2. 하단 공유 버튼 (□↑) 탭
3. **"홈 화면에 추가"** 선택
4. 홈 화면에 KCopyMoney 아이콘 생성 → 전체화면 앱으로 실행

친구도 링크만 받아 같은 과정으로 설치.

## 업데이트 배포 시

`sw.js`의 `CACHE = 'kcm-v1'` 버전을 올리면(`kcm-v2`) 사용자 기기에서 옛 캐시를 비우고 새 버전을 받습니다. 화면을 크게 바꿀 때마다 이 숫자를 올리세요.

## 주의

- 이 앱은 **읽기 전용 모니터링**. 주문/매매 기능 없음.
- 실시간 데이터(`/api/...`)는 캐시하지 않고 항상 최신을 받아옴.
- 매매 엔진과는 완전히 분리 — 앱에 문제가 생겨도 엔진에 영향 없음.
