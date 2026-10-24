/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() { return [{ source: "/research", destination: "/research/index.html" }]; },
  async redirects() { return [{ source: "/engine/index.html", destination: "/engine", permanent: false }]; },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ]}];
  }
};
export default nextConfig;
