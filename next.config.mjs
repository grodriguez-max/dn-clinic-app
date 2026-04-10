/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Include static MD knowledge files used by fs.readFileSync in agent prompts
    outputFileTracingIncludes: {
      "/api/marketing/chat": ["./lib/agent/marketing/**/*.md"],
      "/api/marketing/calendar": ["./lib/agent/marketing/**/*.md"],
      "/api/crons/marketing": ["./lib/agent/marketing/**/*.md"],
    },
  },
};

export default nextConfig;
