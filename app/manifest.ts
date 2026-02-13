import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ABU CRM',
        short_name: 'ABU',
        description: 'Modern CRM for ABU Management',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/abu_logo.png',
                sizes: 'any',
                type: 'image/png',
            },
            {
                src: '/abu_logo.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/abu_logo.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
