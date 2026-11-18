import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/profile","/faculty","/faculty/login"].map(source=>({source,headers:[{key:"Cache-Control",value:"private, no-store"},{key:"Referrer-Policy",value:"no-referrer"}]}));
  },
};

export default nextConfig;
