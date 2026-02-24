
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sentinel Academic',
    short_name: 'Sentinel',
    description: 'Dashboard de monitoreo de progreso estudiantil.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#17594A',
    icons: [
      {
        src: 'https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
