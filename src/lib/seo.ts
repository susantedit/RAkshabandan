/**
 * seo.ts — Dynamic Client-Side SEO & Metadata Manager for anithor.site
 * Updates title, description, canonical URL, and Open Graph tags based on current screen route.
 */

export interface SeoMetadata {
  title: string
  description: string
  canonicalUrl?: string
  ogImage?: string
  keywords?: string
}

const DEFAULT_SEO: SeoMetadata = {
  title: 'anithor bond | 3D Raksha Bandhan Experience with Three.js',
  description:
    'Explore anithor bond, an interactive 3D Raksha Bandhan experience built with Three.js, Web Crypto AES-GCM, encrypted URL capsules, Shagun Roulette, and zero-server architecture.',
  canonicalUrl: 'https://anithor.site/',
  ogImage: 'https://anithor.site/logo.png',
  keywords:
    'anithor, anithor bond, anithor.site, 3D Raksha Bandhan website, 3D Rakhi experience, Three.js Raksha Bandhan project, Three.js Rakhi project, WebGL Raksha Bandhan, Raksha Bandhan 3D gift, interactive Raksha Bandhan website, digital Rakhi experience, Three.js WebGL project, Web Crypto AES-GCM web app, zero-server encrypted web app, encrypted URL hash application, client-side AES-GCM encryption, Nepal Rakhi website, Sibling Tax web app, Shagun Roulette, 3D Rakhi Forge, Kanta Raj Luitel, Susant Luitel, Susantedit, kantarajluitel.tech',
}

const ROUTE_SEO: Record<string, SeoMetadata> = {
  home: DEFAULT_SEO,
  'sister-build': {
    title: 'Forge 3D Rakhi & Set Sibling Tax · anithor bond',
    description:
      'Design a custom 3D Rakhi, set your Sibling Tax demand, attach voice blessings & lock gifts inside encrypted Shagun Vaults.',
    canonicalUrl: 'https://anithor.site/#build',
    ogImage: 'https://anithor.site/logo.png',
  },
  'brother-defend': {
    title: 'Negotiate Sibling Tax & Lock Counter Offer · anithor bond',
    description:
      'Review sister Rakhi, counter-negotiate the Sibling Tax invoice, record an audio response & lock your counter-offer capsule.',
    canonicalUrl: 'https://anithor.site/#defend',
    ogImage: 'https://anithor.site/logo.png',
  },
  wallet: {
    title: 'Digital Shagun Wallet & Claim Portal · anithor bond',
    description:
      'Manage digital Shagun, verify UPI / eSewa settlement claims, and track Raksha Bandhan gift capsule receipts.',
    canonicalUrl: 'https://anithor.site/#wallet',
    ogImage: 'https://anithor.site/logo.png',
  },
  privacy: {
    title: 'Zero-Server End-to-End Encryption Privacy Policy · anithor bond',
    description:
      'anithor bond uses browser-native Web Crypto API (AES-GCM + PBKDF2). Zero server storage, 100% on-device local decryption.',
    canonicalUrl: 'https://anithor.site/#privacy',
    ogImage: 'https://anithor.site/logo.png',
  },
  blog: {
    title: 'How I Built anithor bond: 3D Raksha Bandhan with Three.js',
    description:
      'Learn how I built anithor bond, a 3D Raksha Bandhan experience using Three.js, Web Crypto AES-GCM, encrypted URL capsules, and a zero-server architecture.',
    canonicalUrl: 'https://anithor.site/#blog',
    ogImage: 'https://anithor.site/logo.png',
  },
  capsule: {
    title: 'Encrypted Rakhi Capsule · anithor bond',
    description:
      'Decrypting on-device Rakhi capsule containing 3D design, voice blessing, Shagun tax invoice & memory vault.',
    canonicalUrl: 'https://anithor.site/',
    ogImage: 'https://anithor.site/logo.png',
  },
}

export function updateSeoMetadata(routeName: string): void {
  if (typeof document === 'undefined') return

  const seo = ROUTE_SEO[routeName] || DEFAULT_SEO

  // 1. Document Title
  document.title = seo.title

  // 2. Meta Description
  let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (!metaDesc) {
    metaDesc = document.createElement('meta')
    metaDesc.name = 'description'
    document.head.appendChild(metaDesc)
  }
  metaDesc.content = seo.description

  // 3. Meta Keywords
  if (seo.keywords) {
    let metaKw = document.querySelector<HTMLMetaElement>('meta[name="keywords"]')
    if (!metaKw) {
      metaKw = document.createElement('meta')
      metaKw.name = 'keywords'
      document.head.appendChild(metaKw)
    }
    metaKw.content = seo.keywords
  }

  // 4. Canonical Tag
  if (seo.canonicalUrl) {
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = seo.canonicalUrl
  }

  // 5. Open Graph Meta
  updateMetaProperty('og:title', seo.title)
  updateMetaProperty('og:description', seo.description)
  if (seo.canonicalUrl) updateMetaProperty('og:url', seo.canonicalUrl)
  if (seo.ogImage) updateMetaProperty('og:image', seo.ogImage)

  // 6. Twitter Meta
  updateMetaName('twitter:title', seo.title)
  updateMetaName('twitter:description', seo.description)
  if (seo.ogImage) updateMetaName('twitter:image', seo.ogImage)
}

function updateMetaProperty(property: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.content = content
}

function updateMetaName(name: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}
