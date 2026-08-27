# state-proxy 배포 (Cloudflare Worker)

앱이 봇 발행 주기(34초)만큼 신선한 state.json 을 받게 하는 중계기.
`raw.githubusercontent.com` 은 `max-age=300` + 쿼리스트링 무시라 5분 묵은 값이 오고,
GitHub Pages 는 push 마다 재빌드가 걸려 더 느리다. 둘 다 우회한다.

소요 10분. 전부 무료 범위.

## 1. GitHub 토큰 발급

Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token

- Repository access: **Only select repositories** → `cm-monitor`
- Permissions → Repository permissions → **Contents: Read-only** (이것 하나만)
- Expiration: 원하는 기간 (만료되면 Worker 가 502 를 반환하므로 갱신 필요)

생성된 토큰(`github_pat_...`)을 복사한다. **이 토큰은 Worker Secret 에만 넣는다. 코드나 커밋에 절대 넣지 않는다.**

## 2. Worker 생성

1. https://dash.cloudflare.com → 계정 생성/로그인
2. **Compute (Workers)** → **Create** → **Start with Hello World!** → Create
3. 이름 예: `cm-state` → Deploy
4. **Edit code** → 기존 내용 전부 지우고 `state-proxy.js` 내용 붙여넣기 → **Deploy**

## 3. 토큰을 Secret 으로 등록

Worker → **Settings** → **Variables and Secrets** → Add

- Type: **Secret**
- Name: `GH_TOKEN`
- Value: 1번에서 복사한 토큰

→ Deploy (Secret 추가 후 재배포되어야 적용된다)

## 4. 동작 확인

브라우저에서 Worker URL 을 연다:

```
https://cm-state.<계정서브도메인>.workers.dev/state.json
```

- JSON 이 뜨고 `meta.ts` 가 현재 시각에서 1분 이내면 성공
- 새로고침을 30초 간격으로 두 번 해서 `meta.ts` 가 바뀌면 캐시 우회까지 확인된 것
- `{"error":"GH_TOKEN secret 미설정"}` → 3번 미완료
- `{"error":"GitHub API 401"}` → 토큰이 잘못됐거나 만료
- `{"error":"GitHub API 404"}` → 토큰 권한에 `cm-monitor` 가 없음

## 5. 앱 연결

Worker URL 을 알려주면 `index.html` 의 `DATA_BASE` 를 그 주소로 바꿔 배포한다.

## 참고

- 경로는 `state.json` 과 `charts/*.json` 만 허용한다(화이트리스트). 공개 프록시가
  임의 파일을 읽어주지 않게 하기 위함.
- 앱 폴링은 15초 주기 = 약 240 req/hr. 인증 시 GitHub API 한도는 5,000 req/hr 라
  여유가 크다. Worker 무료 한도는 100,000 req/day.
- 응답 헤더 `X-Rate-Remaining` 에 남은 한도가 실려 있어 진단에 쓸 수 있다.
- 롤백: `DATA_BASE` 를 raw 주소로 되돌리면 된다(신선도는 5분으로 복귀).
