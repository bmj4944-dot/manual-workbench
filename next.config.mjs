/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB → silently fails for larger attachments.
      // Vercel function body hard limit is 4.5MB on most plans.
      // For uploads larger than ~4MB, switch to direct-to-Storage signed URLs.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
