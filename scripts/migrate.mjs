// Crea/actualiza las tablas en Neon. Corre antes de cada build (ver "build" en package.json).
// Es idempotente: se puede correr muchas veces sin romper nada.
//   - Sin DATABASE_URL: se saltea (build local sin base).
//   - Planes (Inicial / Pro / Premium, en ARS): se cargan siempre si no existen.
//   - SEED_DEMO=true: carga perfiles, posts, convocatorias y conexiones de ejemplo (los de la v2.1),
//     3 venues demo como clientes aprobados y actividad de los últimos 60 días para el dashboard.
//   - SEED_DEMO_PASSWORD: si está, crea además usuarios demo (…@example.com) con esa contraseña.
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.log('[migrate] Sin DATABASE_URL: se saltea la migración.')
  process.exit(0)
}

const TZ = 'America/Argentina/Buenos_Aires'

const schema = [
  // ---------- better-auth ----------
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL DEFAULT false,
    "image" text,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY,
    "expiresAt" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp,
    "refreshTokenExpiresAt" timestamp,
    "scope" text,
    "password" text,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS session_user_idx ON "session"("userId")`,
  `CREATE INDEX IF NOT EXISTS account_user_idx ON "account"("userId")`,
  `CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"("identifier")`,

  // ---------- roles ----------
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'member'`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "tempPasswordExpiresAt" timestamp`,

  // ---------- planes y clientes (venues) ----------
  `CREATE TABLE IF NOT EXISTS plan (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    features jsonb NOT NULL DEFAULT '[]',
    monthly_price_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'ARS',
    trial_days int NOT NULL DEFAULT 14,
    limits jsonb NOT NULL DEFAULT '{}',
    sort int NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS client (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    legal_name text,
    tax_id text,
    city text,
    neighborhood text,
    address text,
    venue_type text,
    capacity int,
    instagram text,
    website text,
    phone text,
    contact_email text,
    description text,
    data jsonb NOT NULL DEFAULT '{}',
    plan_id text REFERENCES plan(id),
    monthly_price_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'ARS',
    status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','paused','cancelled')),
    trial_ends_at date,
    billing_day int CHECK (billing_day BETWEEN 1 AND 28),
    next_due_date date,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS client_status_idx ON client(status, next_due_date)`,
  `CREATE TABLE IF NOT EXISTS client_member (
    client_id uuid NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS client_member_user_idx ON client_member(user_id)`,

  // ---------- alta por link ----------
  `CREATE TABLE IF NOT EXISTS client_invite (
    token text PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('personal','campaign')),
    email text,
    label text,
    max_uses int,
    uses int NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_by text REFERENCES "user"(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS client_application (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_token text REFERENCES client_invite(token),
    resume_key text NOT NULL,
    email text NOT NULL,
    contact_name text,
    phone text,
    email_verified_at timestamptz,
    step int NOT NULL DEFAULT 1,
    data jsonb NOT NULL DEFAULT '{}',
    requested_plan_id text REFERENCES plan(id),
    terms_accepted_at timestamptz,
    status text NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft','pending_review','changes_requested','approved','rejected')),
    review_reason text,
    reviewed_by text REFERENCES "user"(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    submitted_at timestamptz,
    client_id uuid REFERENCES client(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS client_application_status_idx ON client_application(status, submitted_at)`,
  `CREATE INDEX IF NOT EXISTS client_application_token_idx ON client_application(invite_token)`,

  // ---------- cobros ----------
  `CREATE TABLE IF NOT EXISTS payment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    period text NOT NULL,
    amount_cents bigint NOT NULL,
    currency text NOT NULL DEFAULT 'ARS',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','void')),
    method text,
    due_date date NOT NULL,
    paid_at timestamptz,
    notes text,
    registered_by text REFERENCES "user"(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, period)
  )`,

  // ---------- mails y auditoría ----------
  `CREATE TABLE IF NOT EXISTS email_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email text NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    template text,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','outbox_only')),
    error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS email_outbox_created_idx ON email_outbox(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id bigserial PRIMARY KEY,
    actor_user_id text,
    actor_role text,
    client_id uuid,
    action text NOT NULL,
    entity text,
    entity_id text,
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS audit_log_client_idx ON audit_log(client_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC)`,

  // ---------- red social: perfiles, posts, convocatorias, conexiones ----------
  // Músicos y bandas: user_id (cuenta pública). Venues: client_id (empresa aprobada).
  `CREATE TABLE IF NOT EXISTS profiles (
    id text PRIMARY KEY DEFAULT ('p_' || substr(md5(gen_random_uuid()::text), 1, 10)),
    user_id text UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    client_id uuid UNIQUE REFERENCES client(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('musician','band','venue')),
    name text NOT NULL,
    handle text NOT NULL UNIQUE,
    avatar text,
    city text NOT NULL DEFAULT 'Mar del Plata',
    neighborhood text NOT NULL DEFAULT '',
    genres text[] NOT NULL DEFAULT '{}',
    instruments text[] NOT NULL DEFAULT '{}',
    looking_for text[] NOT NULL DEFAULT '{}',
    bio text NOT NULL DEFAULT '',
    members int,
    capacity int,
    venue_type text,
    verified boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
    followers int NOT NULL DEFAULT 0,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS profiles_kind_status_idx ON profiles(kind, status)`,
  `CREATE INDEX IF NOT EXISTS profiles_genres_idx ON profiles USING GIN (genres)`,
  `CREATE TABLE IF NOT EXISTS posts (
    id text PRIMARY KEY DEFAULT ('post_' || substr(md5(gen_random_uuid()::text), 1, 10)),
    author_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL CHECK (char_length(content) <= 500),
    image text,
    tag text NOT NULL CHECK (tag IN ('busqueda','show','novedad')),
    likes int NOT NULL DEFAULT 0,
    comments int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS gigs (
    id text PRIMARY KEY DEFAULT ('gig_' || substr(md5(gen_random_uuid()::text), 1, 10)),
    client_id uuid NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    venue_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    date date NOT NULL,
    genres text[] NOT NULL DEFAULT '{}',
    fee int NOT NULL CHECK (fee >= 0),
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_by text REFERENCES "user"(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS gigs_client_idx ON gigs(client_id, date)`,
  `CREATE INDEX IF NOT EXISTS gigs_status_idx ON gigs(status, date)`,
  `CREATE TABLE IF NOT EXISTS gig_applications (
    gig_id text NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    profile_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (gig_id, profile_id)
  )`,
  `CREATE TABLE IF NOT EXISTS connections (
    id text PRIMARY KEY DEFAULT ('conn_' || substr(md5(gen_random_uuid()::text), 1, 10)),
    from_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (from_id, to_id)
  )`,
  `CREATE INDEX IF NOT EXISTS connections_to_idx ON connections(to_id)`,

  // Registro de actividad que alimenta el dashboard diario/mensual del superadmin.
  // profile_id sin FK a propósito: la actividad demo usa ids sintéticos.
  `CREATE TABLE IF NOT EXISTS activity_events (
    id bigserial PRIMARY KEY,
    profile_id text,
    type text NOT NULL,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS activity_events_time_idx ON activity_events(created_at)`,
  `CREATE INDEX IF NOT EXISTS activity_events_type_time_idx ON activity_events(type, created_at)`,
]

// [id, nombre, descripción, beneficios, precio en centavos ARS, orden]
const plans = [
  ['inicial', 'Inicial', 'Para empezar a programar música en vivo.', ['1 convocatoria abierta a la vez', 'Perfil del venue en Explorar', 'Soporte por email'], 1500000, 1],
  ['pro', 'Pro', 'Para venues con agenda semanal.', ['Convocatorias ilimitadas', 'Artistas sugeridos por afinidad', 'Soporte prioritario'], 2900000, 2],
  ['premium', 'Premium', 'Para teatros y centros culturales con ciclos.', ['Todo lo de Pro', 'Perfil destacado', 'Acompañamiento del equipo'], 5500000, 3],
]

// ---------- Datos demo (los de referencia-v2.1/lib/data/seed.ts) ----------
const CITY = 'Mar del Plata'
// [id, kind, name, handle, avatar, barrio, géneros, instrumentos, busca, bio, integrantes, capacidad, tipo de venue, verificado, estado, seguidores, alta, email demo]
const demoProfiles = [
  ['u1', 'musician', 'Lucía Ferreyra', 'luciaferreyra', '/images/lucia.png', 'La Perla', ['Indie', 'Folk', 'Pop'], ['Voz', 'Guitarra acústica'], ['Banda', 'Bajista', 'Fechas'],
    'Cantautora. Escribo canciones sobre el mar y la ciudad. Busco banda para llevar mi disco al vivo.', null, null, null, true, 'active', 1284, '2026-03-02', 'lucia.demo@example.com'],
  ['u2', 'musician', 'Tomás Ibarra', 'tomasdrums', '/images/tomas.png', 'Güemes', ['Rock', 'Funk', 'Indie'], ['Batería', 'Percusión'], ['Banda'],
    'Baterista con 10 años de escenario. Disponible para ensayos y fechas los fines de semana.', null, null, null, false, 'active', 642, '2026-04-11', 'tomas.demo@example.com'],
  ['u3', 'musician', 'Martina Sosa', 'martibajo', null, 'Centro', ['Jazz', 'Funk', 'Neo soul'], ['Bajo eléctrico', 'Contrabajo'], ['Banda', 'Sesiones'],
    'Bajista. Formada en conservatorio, fanática del groove.', null, null, null, true, 'active', 910, '2026-02-19', 'martina.demo@example.com'],
  ['u4', 'musician', 'Julián Paz', 'julianpaz', null, 'Constitución', ['Synthpop', 'Electrónica', 'Indie'], ['Teclados', 'Sintetizadores'], ['Banda', 'Productor'],
    'Tecladista y productor. Armo paisajes sonoros con sintes analógicos.', null, null, null, false, 'active', 455, '2026-05-08', 'julian.demo@example.com'],
  ['u5', 'musician', 'Nicolás Reyes', 'nicoreyes', null, 'Puerto', ['Cumbia', 'Reggae'], ['Guitarra eléctrica'], ['Banda'],
    'Guitarrista de cumbia y reggae.', null, null, null, false, 'paused', 120, '2026-06-21', 'nicolas.demo@example.com'],
  ['b1', 'band', 'Los Faros', 'losfaros', '/images/band-faros.png', 'Puerto', ['Rock', 'Indie', 'Alternativo'], ['Guitarra', 'Voz', 'Batería'], ['Bajista', 'Fechas'],
    'Rock alternativo desde la costa. Dos discos editados, buscamos bajista para la gira de verano.', 4, null, null, true, 'active', 3420, '2026-01-14', 'losfaros.demo@example.com'],
  ['b2', 'band', 'Marea Baja', 'mareabaja', '/images/band-marea.png', 'La Perla', ['Folk', 'Indie', 'Acústico'], ['Guitarra', 'Voz', 'Ukelele'], ['Violinista', 'Voz', 'Fechas'],
    'Trío de folk íntimo. Buscamos una voz femenina y violín para ampliar la formación.', 3, null, null, false, 'active', 1870, '2026-02-03', 'mareabaja.demo@example.com'],
  ['b3', 'band', 'Cumbia del Puerto', 'cumbiadelpuerto', null, 'Puerto', ['Cumbia', 'Tropical'], ['Guitarra', 'Teclados', 'Percusión'], ['Fechas'],
    'Cumbia bailable para fiestas, eventos y bares.', 6, null, null, false, 'active', 2210, '2026-03-28', 'cumbiadelpuerto.demo@example.com'],
  ['v1', 'venue', 'Bar La Ruta', 'barlaruta', '/images/venue-bar.png', 'Güemes', ['Rock', 'Indie', 'Blues'], [], ['Bandas', 'Solistas'],
    'Bar con escenario propio y sonido profesional. Música en vivo de jueves a sábado.', null, 120, 'Bar', true, 'active', 5120, '2026-01-05', 'barlaruta.demo@example.com'],
  ['v2', 'venue', 'Teatro Rivera', 'teatrorivera', '/images/venue-teatro.png', 'Centro', ['Folk', 'Jazz', 'Indie'], [], ['Bandas'],
    'Teatro clásico con 450 butacas. Ciclos de música independiente todos los meses.', null, 450, 'Teatro', true, 'active', 8740, '2026-01-09', 'teatrorivera.demo@example.com'],
  ['v3', 'venue', 'Restó El Muelle', 'elmuelle', null, 'Puerto', ['Jazz', 'Bossa nova', 'Acústico'], [], ['Solistas', 'Dúos'],
    'Cenas con música en vivo frente al mar.', null, 80, 'Restaurante', false, 'active', 960, '2026-04-30', 'elmuelle.demo@example.com'],
]

// Venues demo como clientes aprobados: [profile id, slug, plan, estado]
const demoClients = [
  ['v1', 'bar-la-ruta', 'pro', 'active'],
  ['v2', 'teatro-rivera', 'premium', 'active'],
  ['v3', 'resto-el-muelle', 'inicial', 'paused'],
]

// [id, autor, texto, imagen, etiqueta, likes, comentarios, horas atrás]
const demoPosts = [
  ['p1', 'b1', 'Buscamos bajista para la temporada de verano. Ensayamos en el Puerto martes y jueves. Influencias: Arctic Monkeys, Él Mató a un Policía Motorizado.', '/images/band-faros.png', 'busqueda', 214, 38, 4],
  ['p2', 'v2', 'Abrimos convocatoria para el ciclo "Costa Independiente". Folk, jazz e indie. Postulate desde Convocatorias.', '/images/venue-teatro.png', 'show', 489, 61, 7],
  ['p3', 'u3', 'Me sumo a sesiones de grabación este mes. Bajo eléctrico y contrabajo, lectura a primera vista.', null, 'busqueda', 97, 12, 24],
  ['p4', 'b2', 'Gracias La Perla por la noche de ayer. Próxima fecha anunciada muy pronto.', '/images/band-marea.png', 'novedad', 352, 27, 36],
  ['p5', 'v1', 'Tenemos dos fechas libres este mes para bandas de rock e indie. Sonido e iluminación incluidos.', '/images/venue-bar.png', 'show', 276, 44, 50],
]

// [id, venue, título, días desde hoy, géneros, cachet ARS, descripción, estado, postulantes]
const demoGigs = [
  ['g1', 'v1', 'Noche de rock alternativo', 5, ['Rock', 'Indie'], 180000, 'Buscamos banda principal para un sábado. Set de 75 minutos, backline disponible.', 'open', ['b1']],
  ['g2', 'v1', 'Jueves acústico', 10, ['Folk', 'Acústico', 'Indie'], 90000, 'Solistas o dúos acústicos. Dos sets de 40 minutos.', 'open', ['b2']],
  ['g3', 'v2', 'Ciclo Costa Independiente', 13, ['Folk', 'Jazz', 'Indie'], 450000, 'Ciclo mensual en sala principal. Buscamos propuestas con material original.', 'open', []],
  ['g4', 'v1', 'Fiesta de cumbia', -29, ['Cumbia'], 150000, 'Fecha cerrada.', 'closed', ['b3']],
]

// [id, desde, hacia, estado, días atrás]
const demoConnections = [
  ['c1', 'u1', 'b2', 'accepted', 58],
  ['c2', 'u2', 'u1', 'pending', 19],
  ['c3', 'v2', 'u1', 'pending', 18],
  ['c4', 'u1', 'u3', 'accepted', 70],
]

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
try {
  for (const sql of schema) await pool.query(sql)

  for (const [id, name, description, features, cents, sort] of plans) {
    await pool.query(
      `INSERT INTO plan (id, name, description, features, monthly_price_cents, currency, trial_days, sort)
       VALUES ($1, $2, $3, $4::jsonb, $5, 'ARS', 14, $6) ON CONFLICT (id) DO NOTHING`,
      [id, name, description, JSON.stringify(features), cents, sort],
    )
  }

  // Superadmin: solo cuentas ya verificadas (creadas por el "primer ingreso" de la plataforma) cuyo email
  // está en SUPERADMIN_EMAILS. Nadie puede registrarse como superadmin desde el registro público.
  const superadmins = (process.env.SUPERADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (superadmins.length) {
    await pool.query(
      `UPDATE "user" SET role = 'superadmin' WHERE lower(email) = ANY($1) AND "emailVerified" = true AND role <> 'superadmin'`,
      [superadmins],
    )
  }
  await pool.query(`UPDATE "user" SET role = 'member' WHERE role = 'superadmin' AND NOT (lower(email) = ANY($1))`, [superadmins])

  if (process.env.SEED_DEMO === 'true') {
    await seedDemo()
    console.log('[migrate] Datos de demo cargados (SEED_DEMO=true).')
  }

  console.log(`[migrate] OK (${schema.length} sentencias de esquema).`)
} finally {
  await pool.end()
}

async function seedDemo() {
  // 1. Venues demo como clientes aprobados.
  for (const [pid, slug, planId, status] of demoClients) {
    const p = demoProfiles.find((x) => x[0] === pid)
    await pool.query(
      `INSERT INTO client (slug, name, city, neighborhood, venue_type, capacity, description, data, plan_id, monthly_price_cents, currency,
                           status, billing_day, next_due_date, is_demo)
       SELECT $1::text, $2::text, $3::text, $4::text, $5::text, $6::int, $7::text, $8::jsonb, $9::text, p.monthly_price_cents, 'ARS', $10::text, 10,
              (date_trunc('month', current_date) + interval '1 month' + interval '9 days')::date, true
         FROM plan p WHERE p.id = $9
       ON CONFLICT (slug) DO NOTHING`,
      [slug, p[2], CITY, p[5], p[12], p[11], p[9], JSON.stringify({ genres: p[6] }), planId, status],
    )
  }

  // 2. Perfiles (músicos, bandas y venues).
  for (const p of demoProfiles) {
    const [id, kind, name, handle, avatar, neighborhood, genres, instruments, lookingFor, bio, members, capacity, venueType, verified, status, followers, createdAt] = p
    const slug = demoClients.find((c) => c[0] === id)?.[1] ?? null
    await pool.query(
      `INSERT INTO profiles (id, client_id, kind, name, handle, avatar, city, neighborhood, genres, instruments, looking_for, bio,
                             members, capacity, venue_type, verified, status, followers, is_demo, created_at)
       VALUES ($1, (SELECT id FROM client WHERE slug = $2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, $19::date)
       ON CONFLICT (id) DO NOTHING`,
      [id, slug, kind, name, handle, avatar, CITY, neighborhood, genres, instruments, lookingFor, bio, members, capacity, venueType, verified, status, followers, createdAt],
    )
  }

  // 3. Posts (fechas relativas a hoy para que el feed se vea vivo).
  for (const [id, author, content, image, tag, likes, comments, hoursAgo] of demoPosts) {
    await pool.query(
      `INSERT INTO posts (id, author_id, content, image, tag, likes, comments, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now() - make_interval(hours => $8::int)) ON CONFLICT (id) DO NOTHING`,
      [id, author, content, image, tag, likes, comments, hoursAgo],
    )
  }

  // 4. Convocatorias. Si una abierta ya pasó, se vuelve a mover hacia adelante.
  for (const [id, venue, title, days, genres, fee, description, status, applicants] of demoGigs) {
    await pool.query(
      `INSERT INTO gigs (id, client_id, venue_id, title, date, genres, fee, description, status, created_at)
       SELECT $1::text, pr.client_id, pr.id, $3::text, ((now() AT TIME ZONE '${TZ}')::date + $4::int), $5::text[], $6::int, $7::text, $8::text, now() - interval '20 days'
         FROM profiles pr WHERE pr.id = $2::text AND pr.client_id IS NOT NULL
       ON CONFLICT (id) DO UPDATE SET date = EXCLUDED.date WHERE gigs.status = 'open' AND gigs.date < (now() AT TIME ZONE '${TZ}')::date`,
      [id, venue, title, days, genres, fee, description, status],
    )
    for (const profileId of applicants) {
      await pool.query(
        `INSERT INTO gig_applications (gig_id, profile_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM gigs WHERE id = $1) ON CONFLICT DO NOTHING`,
        [id, profileId],
      )
    }
  }

  // 5. Conexiones.
  for (const [id, from, to, status, daysAgo] of demoConnections) {
    await pool.query(
      `INSERT INTO connections (id, from_id, to_id, status, created_at)
       VALUES ($1, $2, $3, $4, now() - make_interval(days => $5::int)) ON CONFLICT DO NOTHING`,
      [id, from, to, status, daysAgo],
    )
  }

  // 6. Actividad de los últimos 60 días (solo los días que todavía no tienen actividad demo).
  //    Ids sintéticos "demo-NN" para simular usuarios activos distintos.
  await pool.query(
    `WITH days AS (
       SELECT d::date AS day FROM generate_series((now() AT TIME ZONE '${TZ}')::date - 59, (now() AT TIME ZONE '${TZ}')::date, interval '1 day') d
     ), missing AS (
       SELECT day, (extract(dow FROM day) IN (5, 6))::int AS weekend, (day - ((now() AT TIME ZONE '${TZ}')::date - 59)) AS idx
         FROM days
        WHERE NOT EXISTS (SELECT 1 FROM activity_events e WHERE e.is_demo AND (e.created_at AT TIME ZONE '${TZ}')::date = days.day)
     ), counts AS (
       SELECT day, t.type,
              CASE t.type
                WHEN 'visit' THEN 14 + (idx / 4) + weekend * 6 + floor(random() * 8)::int
                WHEN 'signup' THEN floor(random() * 3 + idx / 30.0)::int
                WHEN 'connection' THEN 2 + floor(random() * 5)::int + weekend * 2
                WHEN 'post' THEN 3 + floor(random() * 6)::int
                WHEN 'gig_application' THEN floor(random() * 4)::int
              END AS n
         FROM missing CROSS JOIN (VALUES ('visit'), ('signup'), ('connection'), ('post'), ('gig_application')) AS t(type)
     )
     INSERT INTO activity_events (profile_id, type, is_demo, created_at)
     SELECT 'demo-' || (1 + floor(random() * 60))::int, counts.type, true,
            ((counts.day + make_interval(hours => 10 + floor(random() * 13)::int, mins => floor(random() * 60)::int)) AT TIME ZONE '${TZ}')
       FROM counts CROSS JOIN LATERAL generate_series(1, GREATEST(counts.n, 0))`,
  )
  // Que cada id sintético cuente una sola vez por día como "visit" no importa: el dashboard usa count(DISTINCT).

  // 7. Usuarios demo (opcional): solo si hay SEED_DEMO_PASSWORD. Nunca se hardcodea una contraseña.
  const password = process.env.SEED_DEMO_PASSWORD
  if (password && password.length >= 8) {
    const { hashPassword } = await import('better-auth/crypto')
    const hash = await hashPassword(password)
    for (const p of demoProfiles) {
      const [id, kind, name] = p
      const email = p[17]
      let userId = (await pool.query(`SELECT id FROM "user" WHERE lower(email) = $1`, [email])).rows[0]?.id
      if (!userId) {
        userId = crypto.randomUUID()
        await pool.query(
          `INSERT INTO "user" (id, name, email, "emailVerified", role) VALUES ($1, $2, $3, true, 'member')`,
          [userId, name, email],
        )
        await pool.query(
          `INSERT INTO account (id, "accountId", "providerId", "userId", password) VALUES ($1, $2, 'credential', $2, $3)`,
          [crypto.randomUUID(), userId, hash],
        )
      }
      if (kind === 'venue') {
        await pool.query(
          `INSERT INTO client_member (client_id, user_id, role)
           SELECT client_id, $2, 'owner' FROM profiles WHERE id = $1 AND client_id IS NOT NULL ON CONFLICT DO NOTHING`,
          [id, userId],
        )
      } else {
        await pool.query(`UPDATE profiles SET user_id = $2 WHERE id = $1 AND user_id IS NULL`, [id, userId])
      }
    }
    console.log('[migrate] Usuarios demo listos (contraseña = SEED_DEMO_PASSWORD).')
  }
}
