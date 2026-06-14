const nextConfig = {
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/admin.html",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
