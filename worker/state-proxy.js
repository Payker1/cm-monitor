/**
 * state-proxy — cm-monitor 데이터 전달용 Cloudflare Worker
 *
 * 왜 필요한가:
 *   봇은 34초마다 data 브랜치에 state.json 을 발행하는데, 앱이
 *   raw.githubusercontent.com 에서 직접 읽으면 5분 묵은 값을 받는다.
 *   raw 는 Cache-Control: max-age=300 으로 응답하고 쿼리스트링(?t=)을
 *   캐시 키에서 무시하기 때문에 캐시버스터가 통하지 않는다.
 *
 * ⚠ 여기서 raw 를 그대로 중계하면 의미가 없다. raw 의 CDN 캐시는 상류에
 *   있어서 Worker 가 요청해도 같은 묵은 응답을 받는다. 그래서 CDN 캐시가
 *   없는 GitHub Contents API 를 쓴다(인증 시 5,000 req/hr, 앱은 240 req/hr).
 *
 * 배포: worker/README.md 참고. GH_TOKEN 은 Secret 으로만 넣는다(코드에 두지 말 것).
 */

const REPO = "Payker1/cm-monitor";
const BRANCH = "data";

// 중계 허용 경로만 화이트리스트 — 공개 프록시가 임의 파일을 읽어주지 않게.
function allowed(path) {
  return path === "state.json" || /^charts\/[A-Za-z0-9_.\-]+\.json$/.test(path);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    // charset 을 빼면 브라우저가 인코딩을 추측해 한글 메시지가 깨진다(EUC-KR 로 오독).
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return json(405, { error: "method not allowed" });

    // 경로 정규화: "/" 는 state.json 으로. ?t= 캐시버스터는 무시하고 버린다.
    const path = new URL(request.url).pathname.replace(/^\/+/, "") || "state.json";
    if (!allowed(path)) return json(404, { error: "not found" });

    if (!env.GH_TOKEN) return json(500, { error: "GH_TOKEN secret 미설정" });

    let upstream;
    try {
      upstream = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${env.GH_TOKEN}`,
            // raw 미디어 타입 → base64 가 아니라 파일 내용을 그대로 받는다.
            Accept: "application/vnd.github.raw",
            "User-Agent": "cm-monitor-state-proxy",
          },
          // Cloudflare 쪽 캐시도 끈다. GitHub API 는 Cache-Control: private 라
          // 원래 공유 캐시에 저장되지 않지만, 이중으로 막아둔다.
          cf: { cacheTtl: 0, cacheEverything: false },
        }
      );
    } catch (e) {
      return json(502, { error: "upstream fetch 실패", detail: String(e) });
    }

    if (!upstream.ok) {
      // 레이트리밋 잔량을 그대로 노출해 진단할 수 있게 한다.
      return json(upstream.status === 404 ? 404 : 502, {
        error: `GitHub API ${upstream.status}`,
        rate_remaining: upstream.headers.get("x-ratelimit-remaining"),
        rate_reset: upstream.headers.get("x-ratelimit-reset"),
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        // 브라우저·중간 캐시 모두 저장 금지 — 이게 이 Worker 의 존재 이유다.
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Rate-Remaining": upstream.headers.get("x-ratelimit-remaining") || "",
      },
    });
  },
};
