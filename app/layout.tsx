import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: {
    default: 'Son.ar — La red social de la música en vivo',
    template: '%s · Son.ar',
  },
  description:
    'Son.ar conecta músicos solistas, bandas y venues de Argentina. Encontrá banda, sumá integrantes y conseguí fechas.',
  applicationName: 'Son.ar',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#16151b',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  )
}
