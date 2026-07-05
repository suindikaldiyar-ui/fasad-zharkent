const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. 'unsafe-eval' добавляем ТОЛЬКО в dev (нужен для HMR
// React Fast Refresh); в проде его нет. img-src разрешает data:/blob:/https:
// (превью загрузки, результат Gemini, canvas). connect-src 'self' — фетч /api/*.
const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Content-Security-Policy", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    serverComponentsExternalPackages: [],
    // Гарантируем попадание фото-референсов в serverless-бандл /api/visualize.
    // Все материалы лежат в public/references/** — включаем всю папку.
    // В Next 14.2 опция живёт под experimental (тип ExperimentalConfig).
    outputFileTracingIncludes: {
      "/api/visualize": ["./public/references/**"],
    },
  },
};

module.exports = nextConfig;
