import { Audiences } from '@/components/landing/audiences'
import { Hero } from '@/components/landing/hero'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'

// Landing pública (estática). Solo muestra la superficie de músicos y bandas: sin links a paneles internos.
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Audiences />
      </main>
      <SiteFooter />
    </>
  )
}
