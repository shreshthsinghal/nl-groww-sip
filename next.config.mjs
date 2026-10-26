/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() { return [{ source: "/research-v1", destination: "/research-v1/index.html" }]; },
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
