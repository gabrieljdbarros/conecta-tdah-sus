import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: true,
      },
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ]
  },
  // O link de convite leva o token na URL (/convite/<token> e ?convite=).
  // `no-referrer` impede que o navegador envie essa URL a outros sites
  // (cabeçalho Referer) ao sair da página ou carregar recursos externos.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ]
  },
};

export default nextConfig;
