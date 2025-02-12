/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/.well-known/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/plugin/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Headers',
            value: ['openai-ephemeral-user-id', 'openai-conversation-id', 'Content-Type'].join(','),
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        source: '/api/log',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Headers',
            value: ['Access-Control-Allow-Origin', 'Content-Type'].join(','),
          },
        ],
      },
      {
        source: '/extension/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        source: '/seo-tools/landscamper',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://landscamper.com/",
          },
        ],
      },
    ];
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['cheerio'],
  },
  transpilePackages: ['@aident/shared'],
  images: {
    domains: ['localhost', 'app.aident.ai', 'api.aident.ai'],
  },
};

module.exports = nextConfig;
