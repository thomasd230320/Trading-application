/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2', 'technicalindicators'],
  },
};

module.exports = nextConfig;
