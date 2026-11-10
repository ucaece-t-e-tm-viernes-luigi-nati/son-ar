// Datos públicos de la marca. Nada secreto acá: este archivo se usa también en el navegador.
export const site = {
  name: 'Son.ar',
  city: 'Mar del Plata',
  tagline: 'La red social de la música en vivo: músicos, bandas y venues de Argentina.',
  course: 'Taller Emprendedor · UCAECE · comisión viernes · 2026 2C',
}

/** CTA comercial para venues en la landing (marketing). No lleva a ningún panel: abre un mail o WhatsApp. */
export function contactHref(subject = 'Quiero sumar mi venue a Son.ar') {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  if (email) return `mailto:${email}?subject=${encodeURIComponent(subject)}`
  const phone = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? '5492230000000'
  return `https://wa.me/${phone}?text=${encodeURIComponent(subject)}`
}
