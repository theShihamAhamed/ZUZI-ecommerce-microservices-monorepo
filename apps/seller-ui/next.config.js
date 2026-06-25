//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require("@nx/next");

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  images: {
    domains: ["ik.imagekit.io"], // allow ImageKit-hosted images
    // Or use remotePatterns for more control:
    // remotePatterns: [
    //   {
    //     protocol: "https",
    //     hostname: "ik.imagekit.io",
    //     pathname: "/**",
    //   },
    // ],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
