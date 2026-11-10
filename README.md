# Son.ar

**Son.ar** es la red social y el marketplace de la música en vivo: músicos solistas, bandas y venues (bares, restaurantes, teatros y centros culturales) de Argentina. Los artistas arman su perfil, conectan entre sí y se postulan a convocatorias pagas que publican los venues.

MVP del Taller Emprendedor — Universidad CAECE, Mar del Plata (comisión viernes, 2.º cuatrimestre 2026). Versión **2.2**.

- **App publicada:** https://son-ar.vercel.app
- **Landing del curso:** https://ucaece-t-e-tm-viernes-luigi-nati.github.io/landing/
- **Docentes:** Luis Miguel Orviz y Natalia Tonon García

## Modelo (B2B2C) y roles

| Quién | Qué hace | Paga |
|---|---|---|
| **Músicos y bandas** (usuarios) | Arman su perfil, publican en el feed, exploran con matching, conectan y se postulan a convocatorias. | No, es gratis. |
| **Venues** (clientes / empresas) | Publican convocatorias pagas ("gigs"), revisan postulantes con su perfil, editan el perfil público del local y gestionan su equipo. | Abono mensual en ARS (planes Inicial / Pro / Premium, con 14 días de prueba). |
| **Equipo de Son.ar** (superadmin) | Da de alta venues, aprueba solicitudes, registra pagos, ve las métricas y pausa cuentas. | — |

Roles en la base: `user.role` (`superadmin` | `member`), `client_member.role` (`owner` | `staff`) y el perfil público (`profiles.kind`: `musician` | `band` | `venue`). La matriz completa de permisos está en `lib/permissions.ts` y se chequea siempre en el servidor (`lib/guards.ts`).

## Superficies

Las tres superficies **nunca se muestran juntas** y cada una tiene su propio login:

- **Pública (músicos y bandas)** — `/` (landing), `/ingresar` (registro e ingreso) y `/app` (feed), `/app/explorar`, `/app/convocatorias`, `/app/conexiones`, `/app/perfil`.
- **Panel de venues** — sección interna a la que los venues llegan con el link que reciben por mail: resumen, convocatorias (crear, cerrar y ver postulantes con su perfil), perfil del local, equipo, plan y pagos y cambio de clave.
- **Plataforma (equipo)** — sección interna del equipo: resumen, métricas diarias y mensuales (recharts sobre `activity_events`), cuentas de músicos y bandas (pausar / activar con auditoría), solicitudes, venues, invitaciones, planes, registro de mails y auditoría.

Las secciones internas no están linkeadas desde la parte pública, no se indexan (`robots.txt`, `noindex` y header `X-Robots-Tag`) y responden **404** a quien no tenga sesión con el rol correspondiente (`proxy.ts` como primera barrera y guards en cada página, layout, server action y route handler). Los datos de cada venue se filtran siempre por el `client_id` que se resuelve en el servidor desde la sesión.

Todos los campos de contraseña tienen el botón para mostrar u ocultar lo tipeado (`components/password-input.tsx`).

## Cómo dar de alta un venue

Los venues **no se registran solos** (el botón "Tengo un venue" de la landing abre un mail o WhatsApp al equipo).

1. Un superadmin entra a la plataforma → **Invitaciones** y crea una **invitación personal** (un solo uso, vence en 14 días, se manda por mail) o un **link de campaña** (reutilizable, con vigencia y cupo opcional, para compartir por mail o WhatsApp).
2. El venue abre el link y completa el alta en 5 pasos, que se guarda como borrador en cada paso:
   1. **Cuenta:** responsable, email (verificado con código en los links de campaña) y WhatsApp.
   2. **Empresa:** nombre comercial, razón social, CUIT, dirección, web e Instagram.
   3. **Venue:** tipo (Bar / Restaurante / Teatro / Centro cultural), capacidad, géneros que programa, barrio y ciudad.
   4. **Plan** y día de pago preferido.
   5. **Revisión** y aceptación de términos → **Enviar**.
3. La solicitud queda **pendiente de revisión**: le llega un mail al equipo ("Nueva solicitud de alta") y otro al venue ("Recibimos tu solicitud").
4. En **Solicitudes**, el superadmin:
   - **Aprueba** (confirma plan, abono, días de prueba y día de pago): se crean la empresa, el usuario propietario con contraseña temporal (vence a las 72 h y se cambia en el primer ingreso) y el **perfil público `kind=venue`**, para que el venue aparezca en Explorar y firme sus convocatorias. Mail "¡Tu cuenta fue aprobada!" con usuario, contraseña temporal, link de ingreso, abono, fin de la prueba y día de pago.
   - **Pide cambios** (mail con el motivo y el link para corregir con los datos precargados) o **rechaza en forma definitiva** (mail con el motivo).

Cobros: los pagos se registran a mano desde la plataforma. Un cron diario (`/api/cron/vencimientos`, protegido con `CRON_SECRET`) avisa 5 días antes, marca "pago vencido" al vencer y pausa la cuenta a los `PAUSE_AFTER_DAYS` días. Un venue pausado o dado de baja queda con el panel en solo lectura y su perfil y convocatorias dejan de verse en la red.

## Stack

Next.js 16.4 (App Router, `cacheComponents`) · React 19.3 · Tailwind CSS 4 · better-auth (email + contraseña) · Neon Postgres (`pg` + drizzle para el esquema tipado) · nodemailer · recharts · Vercel.

```
app/
  page.tsx, ingresar/        → landing y login/registro de músicos y bandas
  app/                       → red social (feed, explorar, convocatorias, conexiones, perfil)
  empresa/                   → panel de venues + alta por link (/empresa/alta/[token])
  plataforma/                → panel del equipo (superadmin)
  api/v1/{gigs,profiles}     → API pública (solo datos públicos)
  api/v1/admin/metrics       → métricas (solo superadmin; 404 para el resto)
  api/mcp                    → servidor MCP (herramientas públicas)
  api/cron/vencimientos      → cron diario de cobros
lib/
  auth.ts, guards.ts, permissions.ts   → sesión, guards y matriz de permisos
  repositories/, services/             → acceso a Neon, matching y métricas
  onboarding.ts, billing.ts, mail*.ts, audit.ts, activity.ts
scripts/migrate.mjs          → crea las tablas y el seed demo (corre antes de cada build)
referencia-v2.1/             → entrega v2.1 del equipo (solo referencia, fuera del build)
```

## Tablas

`user`, `session`, `account`, `verification` (better-auth) · `plan` · `client` · `client_member` · `client_invite` · `client_application` · `payment` · `email_outbox` · `audit_log` · `profiles` · `posts` · `gigs` · `gig_applications` · `connections` · `activity_events`.

Las crea `scripts/migrate.mjs`, que es idempotente y corre automáticamente antes de cada build (`npm run build`).

## Variables de entorno

Ver `.env.example` (con comentarios). Resumen:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Neon. |
| `BETTER_AUTH_SECRET` | Firma de sesiones. |
| `BETTER_AUTH_URL`, `APP_URL` | URL pública (links de los mails). |
| `SUPERADMIN_EMAILS` | Emails del equipo (separados por coma). |
| `SUPERADMIN_NOTIFY_EMAILS` | Quién recibe el aviso de nuevas solicitudes. |
| `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envío de mails por SMTP (Gmail con contraseña de aplicación). Sin SMTP los mails solo quedan en el outbox. |
| `CRON_SECRET`, `PAUSE_AFTER_DAYS` | Cron de vencimientos. |
| `SEED_DEMO`, `SEED_DEMO_PASSWORD` | Datos de demo y (opcional) usuarios demo con esa contraseña. |
| `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_WHATSAPP` | Botón "Tengo un venue" de la landing. |

### Datos de demo (`SEED_DEMO=true`)

Carga los perfiles, posts, convocatorias y conexiones de la v2.1 (Lucía Ferreyra, Los Faros, Marea Baja, Bar La Ruta, Teatro Rivera, etc.), tres venues como empresas aprobadas (Restó El Muelle queda pausado), los planes en ARS y actividad de los últimos 60 días para el dashboard. Con `SEED_DEMO_PASSWORD` crea además usuarios demo con esa contraseña: músicos y bandas (`lucia.demo@example.com`, `losfaros.demo@example.com`, …) y propietarios de los venues demo (`barlaruta.demo@example.com`, `teatrorivera.demo@example.com`, `elmuelle.demo@example.com`).

## Desarrollo local

Necesitás [Node.js 20.9+](https://nodejs.org).

```bash
npm install
cp .env.example .env.local   # completá DATABASE_URL, BETTER_AUTH_SECRET, etc.
npm run db:migrate           # crea las tablas (y los datos demo si SEED_DEMO=true)
npm run dev                  # http://localhost:3000
```

## Deploy

1. Push a `main` → Vercel compila y publica (`main` es producción). Otra rama → preview con URL propia.
2. El build (`npm run build`) corre `scripts/migrate.mjs` antes de `next build`, así el esquema de Neon queda siempre al día.
3. Cargar en Vercel las variables de `.env.example`. El cron diario está definido en `vercel.json` y usa `CRON_SECRET`.
4. Primer acceso del equipo: entrar a la plataforma con un email de `SUPERADMIN_EMAILS` y usar "Primer ingreso" para recibir el link de contraseña.
5. Sumar más gente al equipo: en la plataforma → **Equipo** → "Sumar un admin" (nombre + email). Le llega un mail con un link para definir su contraseña (72 h). Los admins tienen las mismas funciones que el superadmin principal (incluido sumar o quitar otros admins), pero el superadmin principal de `SUPERADMIN_EMAILS` no se puede quitar y nadie puede quitarse a sí mismo.

> Demo académica con datos de ejemplo, sin fines comerciales. **Nunca** se suben claves al repo: es público.
