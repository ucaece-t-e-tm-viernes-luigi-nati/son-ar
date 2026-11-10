import { bigint, bigserial, boolean, date, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Esquema de la base (referencia tipada). Las tablas las crea scripts/migrate.mjs (idempotente).
// Si agregás una columna, sumala en los dos lugares.

// ---------- better-auth ----------
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('member'), // superadmin | member
  mustChangePassword: boolean('mustChangePassword').notNull().default(false),
  tempPasswordExpiresAt: timestamp('tempPasswordExpiresAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// ---------- planes y clientes (venues) ----------
export const plan = pgTable('plan', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  features: jsonb('features').notNull().default([]),
  monthlyPriceCents: bigint('monthly_price_cents', { mode: 'number' }).notNull().default(0),
  currency: text('currency').notNull().default('ARS'),
  trialDays: integer('trial_days').notNull().default(14),
  limits: jsonb('limits').notNull().default({}),
  sort: integer('sort').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const client = pgTable('client', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  taxId: text('tax_id'),
  city: text('city'),
  neighborhood: text('neighborhood'),
  address: text('address'),
  venueType: text('venue_type'),
  capacity: integer('capacity'),
  instagram: text('instagram'),
  website: text('website'),
  phone: text('phone'),
  contactEmail: text('contact_email'),
  description: text('description'),
  data: jsonb('data').notNull().default({}),
  planId: text('plan_id').references(() => plan.id),
  monthlyPriceCents: bigint('monthly_price_cents', { mode: 'number' }).notNull().default(0),
  currency: text('currency').notNull().default('ARS'),
  status: text('status').notNull().default('trial'), // trial | active | past_due | paused | cancelled
  trialEndsAt: date('trial_ends_at'),
  billingDay: integer('billing_day'),
  nextDueDate: date('next_due_date'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const clientMember = pgTable(
  'client_member',
  {
    clientId: uuid('client_id').notNull().references(() => client.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('staff'), // owner | staff
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.userId] })],
)

export const clientInvite = pgTable('client_invite', {
  token: text('token').primaryKey(),
  kind: text('kind').notNull(), // personal | campaign
  email: text('email'),
  label: text('label'),
  maxUses: integer('max_uses'),
  uses: integer('uses').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const clientApplication = pgTable('client_application', {
  id: uuid('id').primaryKey().defaultRandom(),
  inviteToken: text('invite_token').references(() => clientInvite.token),
  resumeKey: text('resume_key').notNull(),
  email: text('email').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  step: integer('step').notNull().default(1),
  data: jsonb('data').notNull().default({}),
  requestedPlanId: text('requested_plan_id').references(() => plan.id),
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  status: text('status').notNull().default('draft'), // draft | pending_review | changes_requested | approved | rejected
  reviewReason: text('review_reason'),
  reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  clientId: uuid('client_id').references(() => client.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payment = pgTable('payment', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => client.id, { onDelete: 'cascade' }),
  period: text('period').notNull(),
  amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('ARS'),
  status: text('status').notNull().default('pending'), // pending | paid | overdue | void
  method: text('method'),
  dueDate: date('due_date').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  notes: text('notes'),
  registeredBy: text('registered_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const emailOutbox = pgTable('email_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text'),
  template: text('template'),
  status: text('status').notNull().default('queued'), // queued | sent | failed | outbox_only
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
})

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorUserId: text('actor_user_id'),
  actorRole: text('actor_role'),
  clientId: uuid('client_id'),
  action: text('action').notNull(),
  entity: text('entity'),
  entityId: text('entity_id'),
  detail: jsonb('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- red social ----------
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').unique().references(() => user.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').unique().references(() => client.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // musician | band | venue
  name: text('name').notNull(),
  handle: text('handle').notNull().unique(),
  avatar: text('avatar'),
  city: text('city').notNull().default('Mar del Plata'),
  neighborhood: text('neighborhood').notNull().default(''),
  genres: text('genres').array().notNull().default([]),
  instruments: text('instruments').array().notNull().default([]),
  lookingFor: text('looking_for').array().notNull().default([]),
  bio: text('bio').notNull().default(''),
  members: integer('members'),
  capacity: integer('capacity'),
  venueType: text('venue_type'),
  verified: boolean('verified').notNull().default(false),
  status: text('status').notNull().default('active'), // active | paused
  followers: integer('followers').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  image: text('image'),
  tag: text('tag').notNull(), // busqueda | show | novedad
  likes: integer('likes').notNull().default(0),
  comments: integer('comments').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const gigs = pgTable('gigs', {
  id: text('id').primaryKey(),
  clientId: uuid('client_id').notNull().references(() => client.id, { onDelete: 'cascade' }),
  venueId: text('venue_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  date: date('date').notNull(),
  genres: text('genres').array().notNull().default([]),
  fee: integer('fee').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('open'), // open | closed
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const gigApplications = pgTable(
  'gig_applications',
  {
    gigId: text('gig_id').notNull().references(() => gigs.id, { onDelete: 'cascade' }),
    profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.gigId, t.profileId] })],
)

export const connections = pgTable('connections', {
  id: text('id').primaryKey(),
  fromId: text('from_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  toId: text('to_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending | accepted
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const activityEvents = pgTable('activity_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  profileId: text('profile_id'),
  type: text('type').notNull(), // signup | login | visit | post | connection | connection_accepted | gig_application | gig_created
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
