
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Progreso Estudiantil - Academic Sentinel',
    short_name: 'Sentinel',
    description: 'Dashboard de monitoreo de progreso estudiantil.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#17594A',
    icons: [
      {
        src: 'https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
