/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@trackstack/ui', '@trackstack/core'],
  trailingSlash: true,
}

export default config
