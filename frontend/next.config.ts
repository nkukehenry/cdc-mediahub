import type { NextConfig } from "next";

const nextConfig = {
  // optional: if you have a trailing slash preference
  //basePath: '/mediahub',
  assetPrefix: '/mediahub',
  trailingSlash: false,
  reactStrictMode: true,
}

module.exports = nextConfig
