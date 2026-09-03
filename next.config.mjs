/** @type {import('next').NextConfig} */
const nextConfig = {
  // Files are uploaded/downloaded via presigned R2 URLs, not proxied
  // through Next.js, so no special body size config is required here.
  experimental: {
    serverActions: { bodySizeLimit: '25mb' }
  }
};

export default nextConfig;
