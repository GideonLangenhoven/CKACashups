/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*"]
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize pdfmake and its dependencies to avoid bundling issues
      config.externals = config.externals || [];
      config.externals.push('pdfmake', 'pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts');
    }
    return config;
  }
};

module.exports = nextConfig;

