# 프론트는 빌드 산출물이 **정적 파일**이다. 런타임에 node 를 띄울 이유가 없으므로
# 빌더에서 번들만 뽑고 런타임 이미지에는 nginx + dist 만 남긴다.
#
# ⚠️ Vite 의 `import.meta.env.VITE_*` 는 **빌드 시각에 문자열로 박히는** 값이다.
#    컨테이너 런타임 환경변수로는 절대 바뀌지 않는다. 그래서 ARG 로 받는다.
#
# 오케스트레이션(compose·터널 설정)은 이 저장소에 두지 않는다 — 별도 devops 저장소 소관이다.
# 여기서는 "이미지를 어떻게 만드는가" 만 정의한다.
#
#   docker build -t bulchimbeon-frontend .
#   docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 -t bulchimbeon-frontend .

FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 레이어를 소스와 분리해 캐시를 살린다 — 소스만 고쳤을 때 npm ci 를 다시 돌리지 않는다.
COPY package.json package-lock.json ./
# `npm ci` 는 package-lock.json 을 정본으로 삼는다. lock 과 package.json 이 어긋나면
# 조용히 다른 버전을 깔지 않고 즉시 실패한다 — 배포 이미지에는 이 엄격함이 맞다.
RUN npm ci

COPY . .

# 빌드 시각에 번들로 들어갈 값. 기본값은 소스의 폴백(`/api/v1`)과 일부러 일치시킨다 —
# 앞단(Cloudflare Tunnel)이 같은 호스트의 `/api/*` 를 백엔드로 보내는 구성을 전제한다.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# `npm run build` = `tsc -b && vite build`. 타입 에러가 나면 여기서 이미지가 죽는다 —
# 타입이 깨진 채로 배포 이미지가 만들어지는 것보다 낫다.
RUN npm run build


# nginx 공식 이미지를 그대로 쓰면 마스터 프로세스가 root 다. unprivileged 변종은
# 처음부터 uid 101 로 돌고, 대신 특권 포트를 못 여니 리스닝 포트가 8080 이다.
# 백엔드 이미지도 비루트(appuser)로 도므로 여기서만 root 로 도는 것은 일관성이 없다.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

# 기본 서버 블록을 남겨두면 우리 설정과 함께 로드되어 8080 을 놓고 겹친다.
RUN rm -f /etc/nginx/conf.d/default.conf

# 치환할 변수가 없으므로 templates/ 가 아니라 최종 위치에 그대로 둔다 (envsubst 미경유).
COPY docker/nginx.conf /etc/nginx/conf.d/app.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
