import type { NextConfig } from "next";

const nextConfig = {
  assetPrefix: '/mediahub',
  trailingSlash: false, // let Next.js add the trailing slash
  reactStrictMode: true,
}

module.exports = nextConfig
