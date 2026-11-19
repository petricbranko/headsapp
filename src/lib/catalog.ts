/**
 * The catalog of tools HeadsApp knows how to watch.
 *
 * Matching is deliberately conservative (low noise beats high recall):
 * - `news`: phrases that must appear in a security-news headline. Ambiguous names
 *   (Linear, Render, Railway, Neon...) only match precise forms or exact casing.
 * - `strict`: platforms often mentioned as the *tool* of an attack ("hackers abuse GitHub").
 *   Their headlines additionally need a breach-style keyword.
 * - `statusPage`: an Atlassian Statuspage-compatible base URL. Only incidents that mention
 *   security terms become alerts; ordinary outages are ignored.
 * - `kev`: CISA Known Exploited Vulnerabilities vendor/product matchers.
 * - `npm`: packages whose GitHub advisories should count for this tool.
 */
export type Category =
  | "Hosting"
  | "Database"
  | "Auth"
  | "Payments"
  | "Email & SMS"
  | "AI"
  | "Code & CI"
  | "Frameworks"
  | "Servers & OS"
  | "Monitoring"
  | "Work";

export interface CatalogEntry {
  slug: string;
  name: string;
  category: Category;
  popular?: boolean;
  news?: (string | { exact: string })[];
  strict?: boolean;
  statusPage?: string;
  kev?: { vendor: RegExp; product?: RegExp };
  npm?: string[];
}

export const CATALOG: CatalogEntry[] = [
  // Hosting & cloud
  { slug: "vercel", name: "Vercel", category: "Hosting", popular: true, news: ["Vercel"], statusPage: "https://www.vercel-status.com", npm: ["vercel"] },
  { slug: "netlify", name: "Netlify", category: "Hosting", popular: true, news: ["Netlify"], statusPage: "https://www.netlifystatus.com", npm: ["netlify-cli"] },
  { slug: "cloudflare", name: "Cloudflare", category: "Hosting", popular: true, news: ["Cloudflare"], strict: true, statusPage: "https://www.cloudflarestatus.com", npm: ["wrangler"] },
  { slug: "aws", name: "AWS", category: "Hosting", popular: true, news: ["AWS", "Amazon Web Services"], strict: true, kev: { vendor: /^(Amazon|AWS)$/i } },
  { slug: "gcp", name: "Google Cloud", category: "Hosting", news: ["Google Cloud", "GCP"], strict: true },
  { slug: "azure", name: "Microsoft Azure", category: "Hosting", news: ["Azure"], strict: true, kev: { vendor: /^Microsoft$/i, product: /Azure/i } },
  { slug: "digitalocean", name: "DigitalOcean", category: "Hosting", popular: true, news: ["DigitalOcean"], statusPage: "https://status.digitalocean.com" },
  { slug: "hetzner", name: "Hetzner", category: "Hosting", news: ["Hetzner"] },
  { slug: "flyio", name: "Fly.io", category: "Hosting", news: ["Fly.io"], statusPage: "https://status.flyio.net" },
  { slug: "render", name: "Render", category: "Hosting", news: ["Render.com", { exact: "Render cloud" }], statusPage: "https://status.render.com" },
  { slug: "railway", name: "Railway", category: "Hosting", news: ["Railway.app", "Railway.com"] },
  { slug: "heroku", name: "Heroku", category: "Hosting", news: ["Heroku"] },
  { slug: "firebase", name: "Firebase", category: "Hosting", popular: true, news: ["Firebase"], npm: ["firebase", "firebase-admin"] },

  // Databases
  { slug: "supabase", name: "Supabase", category: "Database", popular: true, news: ["Supabase"], statusPage: "https://status.supabase.com", npm: ["@supabase/supabase-js", "@supabase/ssr"] },
  { slug: "mongodb", name: "MongoDB", category: "Database", popular: true, news: ["MongoDB", "MongoBleed"], kev: { vendor: /^MongoDB$/i }, npm: ["mongodb", "mongoose"] },
  { slug: "postgresql", name: "PostgreSQL", category: "Database", popular: true, news: ["PostgreSQL", "Postgres"], kev: { vendor: /^PostgreSQL$/i }, npm: ["pg"] },
  { slug: "mysql", name: "MySQL", category: "Database", news: ["MySQL"], kev: { vendor: /^Oracle$/i, product: /MySQL/i }, npm: ["mysql2"] },
  { slug: "redis", name: "Redis", category: "Database", popular: true, news: ["Redis"], kev: { vendor: /^Redis$/i }, npm: ["redis", "ioredis"] },
  { slug: "neon", name: "Neon", category: "Database", news: ["Neon database", "Neon Postgres", "Neon.tech"], npm: ["@neondatabase/serverless"] },
  { slug: "planetscale", name: "PlanetScale", category: "Database", news: ["PlanetScale"], statusPage: "https://www.planetscalestatus.com" },
  { slug: "upstash", name: "Upstash", category: "Database", news: ["Upstash"], statusPage: "https://status.upstash.com", npm: ["@upstash/redis"] },
  { slug: "prisma", name: "Prisma", category: "Database", news: [{ exact: "Prisma ORM" }], npm: ["prisma", "@prisma/client"] },

  // Auth
  { slug: "auth0", name: "Auth0", category: "Auth", popular: true, news: ["Auth0"], npm: ["@auth0/nextjs-auth0", "auth0"] },
  { slug: "okta", name: "Okta", category: "Auth", news: ["Okta"], kev: { vendor: /^Okta$/i } },
  { slug: "clerk", name: "Clerk", category: "Auth", popular: true, news: ["Clerk.com", "Clerk auth", "Clerk.dev"], statusPage: "https://status.clerk.com", npm: ["@clerk/nextjs", "@clerk/clerk-js"] },
  { slug: "nextauth", name: "Auth.js / NextAuth", category: "Auth", news: ["NextAuth", "Auth.js"], npm: ["next-auth", "@auth/core"] },

  // Payments
  { slug: "stripe", name: "Stripe", category: "Payments", popular: true, news: [{ exact: "Stripe" }], npm: ["stripe", "@stripe/stripe-js"] },
  { slug: "paddle", name: "Paddle", category: "Payments", news: ["Paddle.com", { exact: "Paddle payments" }] },
  { slug: "lemonsqueezy", name: "Lemon Squeezy", category: "Payments", news: ["Lemon Squeezy", "LemonSqueezy"] },
  { slug: "paypal", name: "PayPal", category: "Payments", news: ["PayPal"], strict: true },
  { slug: "shopify", name: "Shopify", category: "Payments", news: ["Shopify"] },

  // Email & SMS
  { slug: "twilio", name: "Twilio", category: "Email & SMS", popular: true, news: ["Twilio", "Authy"], statusPage: "https://status.twilio.com", npm: ["twilio"] },
  { slug: "sendgrid", name: "SendGrid", category: "Email & SMS", news: ["SendGrid"], npm: ["@sendgrid/mail"] },
  { slug: "resend", name: "Resend", category: "Email & SMS", popular: true, news: [{ exact: "Resend" }], npm: ["resend"] },
  { slug: "postmark", name: "Postmark", category: "Email & SMS", news: [{ exact: "Postmark" }], npm: ["postmark"] },
  { slug: "mailgun", name: "Mailgun", category: "Email & SMS", news: ["Mailgun"], statusPage: "https://status.mailgun.com", npm: ["mailgun.js"] },
  { slug: "mailchimp", name: "Mailchimp", category: "Email & SMS", news: ["Mailchimp"] },

  // AI
  { slug: "openai", name: "OpenAI", category: "AI", popular: true, news: ["OpenAI", "ChatGPT"], strict: true, statusPage: "https://status.openai.com", npm: ["openai"] },
  { slug: "anthropic", name: "Anthropic", category: "AI", news: ["Anthropic"], strict: true, statusPage: "https://status.claude.com", npm: ["@anthropic-ai/sdk"] },
  { slug: "openrouter", name: "OpenRouter", category: "AI", news: ["OpenRouter"] },
  { slug: "huggingface", name: "Hugging Face", category: "AI", news: ["Hugging Face", "HuggingFace"], strict: true },
  { slug: "langchain", name: "LangChain", category: "AI", news: ["LangChain"], npm: ["langchain", "@langchain/core"] },

  // Code & CI
  { slug: "github", name: "GitHub", category: "Code & CI", popular: true, news: ["GitHub"], strict: true, statusPage: "https://www.githubstatus.com" },
  { slug: "gitlab", name: "GitLab", category: "Code & CI", news: ["GitLab"], kev: { vendor: /^GitLab$/i } },
  { slug: "bitbucket", name: "Bitbucket", category: "Code & CI", news: ["Bitbucket"], kev: { vendor: /^Atlassian$/i, product: /Bitbucket/i } },
  { slug: "npm-registry", name: "npm registry", category: "Code & CI", popular: true, statusPage: "https://status.npmjs.org" },
  { slug: "docker", name: "Docker", category: "Code & CI", popular: true, news: ["Docker Hub", "Docker Desktop"], kev: { vendor: /^Docker$/i } },
  { slug: "circleci", name: "CircleCI", category: "Code & CI", news: ["CircleCI"], statusPage: "https://status.circleci.com" },
  { slug: "jenkins", name: "Jenkins", category: "Code & CI", news: ["Jenkins"], kev: { vendor: /^Jenkins$/i } },
  { slug: "jetbrains", name: "JetBrains", category: "Code & CI", news: ["JetBrains", "TeamCity"], kev: { vendor: /^JetBrains$/i } },

  // Frameworks & runtimes
  { slug: "nextjs", name: "Next.js", category: "Frameworks", popular: true, news: ["Next.js"], kev: { vendor: /^(Vercel|Next\.?js)$/i }, npm: ["next"] },
  { slug: "react", name: "React", category: "Frameworks", popular: true, news: ["React Server Components", "React2Shell", { exact: "React" }], kev: { vendor: /^(Meta|Facebook)$/i, product: /React/i }, npm: ["react", "react-dom", "react-server-dom-webpack"] },
  { slug: "nodejs", name: "Node.js", category: "Frameworks", popular: true, news: ["Node.js"], kev: { vendor: /^Node\.?js$/i } },
  { slug: "express", name: "Express", category: "Frameworks", news: ["Express.js"], npm: ["express"] },
  { slug: "nuxt", name: "Nuxt", category: "Frameworks", news: ["Nuxt"], npm: ["nuxt"] },
  { slug: "sveltekit", name: "SvelteKit", category: "Frameworks", news: ["SvelteKit", "Svelte"], npm: ["@sveltejs/kit", "svelte"] },
  { slug: "remix", name: "Remix / React Router", category: "Frameworks", news: ["React Router", "Remix framework"], npm: ["react-router", "@remix-run/node"] },
  { slug: "vite", name: "Vite", category: "Frameworks", news: ["Vite"], npm: ["vite"] },
  { slug: "laravel", name: "Laravel", category: "Frameworks", news: ["Laravel"], kev: { vendor: /^Laravel$/i } },
  { slug: "django", name: "Django", category: "Frameworks", news: ["Django"] },
  { slug: "rails", name: "Ruby on Rails", category: "Frameworks", news: ["Ruby on Rails"], kev: { vendor: /^Rails$/i } },
  { slug: "wordpress", name: "WordPress", category: "Frameworks", news: ["WordPress"], kev: { vendor: /^WordPress$/i } },
  { slug: "php", name: "PHP", category: "Frameworks", news: [{ exact: "PHP" }], kev: { vendor: /^PHP$/i } },

  // Servers & OS
  { slug: "nginx", name: "nginx", category: "Servers & OS", popular: true, news: ["nginx"], kev: { vendor: /^(F5|Nginx)$/i, product: /nginx/i } },
  { slug: "apache", name: "Apache HTTP Server", category: "Servers & OS", news: ["Apache HTTP Server", "Apache httpd"], kev: { vendor: /^Apache$/i, product: /HTTP Server/i } },
  { slug: "caddy", name: "Caddy", category: "Servers & OS", news: [{ exact: "Caddy server" }] },
  { slug: "openssh", name: "OpenSSH", category: "Servers & OS", news: ["OpenSSH"], kev: { vendor: /^OpenBSD$/i, product: /OpenSSH/i } },
  { slug: "linux", name: "Linux kernel", category: "Servers & OS", news: ["Linux kernel"], kev: { vendor: /^Linux$/i, product: /Kernel/i } },
  { slug: "ubuntu", name: "Ubuntu", category: "Servers & OS", news: ["Ubuntu"] },
  { slug: "kubernetes", name: "Kubernetes", category: "Servers & OS", news: ["Kubernetes", "Ingress-NGINX"], kev: { vendor: /^Kubernetes$/i } },
  { slug: "openssl", name: "OpenSSL", category: "Servers & OS", news: ["OpenSSL"], kev: { vendor: /^OpenSSL$/i } },

  // Monitoring & analytics
  { slug: "sentry", name: "Sentry", category: "Monitoring", news: [{ exact: "Sentry" }], statusPage: "https://status.sentry.io", npm: ["@sentry/nextjs", "@sentry/node"] },
  { slug: "datadog", name: "Datadog", category: "Monitoring", news: ["Datadog"] },
  { slug: "posthog", name: "PostHog", category: "Monitoring", news: ["PostHog"], npm: ["posthog-js", "posthog-node"] },
  { slug: "mixpanel", name: "Mixpanel", category: "Monitoring", news: ["Mixpanel"], statusPage: "https://www.mixpanelstatus.com" },
  { slug: "segment", name: "Segment", category: "Monitoring", news: ["Twilio Segment", "Segment.com"], statusPage: "https://status.segment.com" },

  // Work tools
  { slug: "slack", name: "Slack", category: "Work", news: ["Slack"], strict: true },
  { slug: "discord", name: "Discord", category: "Work", news: ["Discord"], strict: true, statusPage: "https://discordstatus.com" },
  { slug: "notion", name: "Notion", category: "Work", news: [{ exact: "Notion" }] },
  { slug: "linear", name: "Linear", category: "Work", news: ["Linear.app"], statusPage: "https://linearstatus.com" },
  { slug: "figma", name: "Figma", category: "Work", news: ["Figma"], statusPage: "https://status.figma.com" },
  { slug: "google-workspace", name: "Google Workspace", category: "Work", news: ["Google Workspace", "Gmail"], strict: true },
  { slug: "1password", name: "1Password", category: "Work", news: ["1Password"] },
  { slug: "lastpass", name: "LastPass", category: "Work", news: ["LastPass"] },
  { slug: "zapier", name: "Zapier", category: "Work", news: ["Zapier"], statusPage: "https://status.zapier.com" },
];

export const CATEGORIES: Category[] = [
  "Hosting", "Database", "Auth", "Payments", "Email & SMS", "AI", "Code & CI", "Frameworks", "Servers & OS", "Monitoring", "Work",
];

const bySlug = new Map(CATALOG.map((e) => [e.slug, e]));
export function catalogEntry(slug: string) {
  return bySlug.get(slug);
}

export function vendorKey(slug: string) {
  return `vendor:${slug}`;
}
export function npmKey(name: string) {
  return `npm:${name}`;
}

/** Human label for a stack key. */
export function labelForKey(key: string): string {
  if (key.startsWith("vendor:")) return catalogEntry(key.slice(7))?.name ?? key.slice(7);
  if (key.startsWith("npm:")) return key.slice(4);
  return key;
}

// npm naming rules (simplified, strict): optional scope, lowercase, url-safe.
export const NPM_NAME_RE = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
export function isValidNpmName(name: string) {
  return name.length <= 214 && NPM_NAME_RE.test(name);
}

export function searchCatalog(q: string, limit = 12): CatalogEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return CATALOG.filter((e) => e.popular).slice(0, limit);
  const scored = CATALOG.map((e) => {
    const n = e.name.toLowerCase();
    let score = 0;
    if (n === s || e.slug === s) score = 100;
    else if (n.startsWith(s)) score = 50;
    else if (n.includes(s)) score = 20;
    else if (e.npm?.some((p) => p === s)) score = 40;
    else if (e.category.toLowerCase().includes(s)) score = 5;
    return { e, score };
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
  return scored.slice(0, limit).map((x) => x.e);
}
