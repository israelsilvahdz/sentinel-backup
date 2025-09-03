
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.credly.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sic.cultura.gob.mx',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'play.triviamaker.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'edukapp.com.mx',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
