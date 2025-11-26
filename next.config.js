/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
    };
    // Disable filesystem cache to avoid noisy PackFileCacheStrategy snapshot warnings in this setup.
    config.cache = false;
    return config;
  },
};

module.exports = nextConfig;
