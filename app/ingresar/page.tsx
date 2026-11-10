import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Logo } from '@/components/brand/logo'
import { PublicLoginForm } from './login-form'

export const metadata: Metadata = { title: 'Ingresar', robots: { index: false, follow: false } }

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Suspense>
          <PublicLoginForm />
        </Suspense>
      </div>
    </main>
  )
}
