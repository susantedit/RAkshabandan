/**
 * Blog.tsx — Technical Case Study: How I Built anithor bond
 * Route: #blog or /blog/anithor-bond-3d-rakhi-digital-love
 * Rendered natively for users and search engine crawlers.
 */

import { goHome, go } from '../lib/route'
import { BackBtn, Btn, Card, Screen, Tag, TopBar, Well } from '../ui/kit'

export function Blog() {
  return (
    <Screen header={<TopBar title="Engineering Case Study" left={<BackBtn onClick={goHome} />} />}>
      <article className="max-w-3xl mx-auto pb-16 px-4 font-sans text-espresso selection:bg-gulabi/20">
        
        {/* Header Section */}
        <header className="py-6 border-b border-espresso/10 mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            <Tag tone="pink">Three.js / WebGL</Tag>
            <Tag tone="gold">Web Crypto AES-GCM</Tag>
            <Tag tone="cyan">Zero-Server Architecture</Tag>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-espresso leading-tight">
            How I Built anithor bond: A 3D Raksha Bandhan Experience with Three.js &amp; Zero-Server Cryptography
          </h1>
          <p className="text-lg text-espresso/70 mt-3 font-medium leading-relaxed">
            A deep dive into crafting mobile-first 3D WebGL graphics, AES-GCM encrypted URL hash capsules, single-channel audio synchronization, and zero-server digital gifting for siblings.
          </p>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-espresso/10 text-sm text-espresso/65">
            <span className="font-bold text-espresso">By Kanta Raj Luitel (Susant Luitel)</span>
            <span>•</span>
            <time dateTime="2026-08-26">August 26, 2026</time>
            <span>•</span>
            <span>12 min read</span>
          </div>
        </header>

        {/* Table of Contents */}
        <nav className="mb-10 p-5 rounded-2xl bg-cream border border-espresso/15 shadow-sm">
          <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
            <span>📌</span> Table of Contents
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-espresso/80 font-medium">
            <li><a href="#why-text-message-fails" className="hover:text-gulabi-deep transition-colors">1. Why a Text Message Wasn't Enough</a></li>
            <li><a href="#culture-sibling-tax" className="hover:text-gulabi-deep transition-colors">2. The Culture of Sibling Banter &amp; Sibling Tax</a></li>
            <li><a href="#engineering-challenge" className="hover:text-gulabi-deep transition-colors">3. The Engineering Challenge</a></li>
            <li><a href="#what-i-built" className="hover:text-gulabi-deep transition-colors">4. What I Built: Dual Flow Architecture</a></li>
            <li><a href="#threejs-webgl" className="hover:text-gulabi-deep transition-colors">5. How the Three.js Experience Works</a></li>
            <li><a href="#aes-gcm-capsules" className="hover:text-gulabi-deep transition-colors">6. AES-GCM Encrypted URL Hash Capsules</a></li>
            <li><a href="#shagun-roulette" className="hover:text-gulabi-deep transition-colors">7. Shagun Roulette &amp; Sibling Negotiation</a></li>
            <li><a href="#technical-architecture" className="hover:text-gulabi-deep transition-colors">8. System Tech Stack &amp; Lessons Learned</a></li>
            <li><a href="#faq" className="hover:text-gulabi-deep transition-colors">9. Frequently Asked Questions</a></li>
          </ul>
        </nav>

        {/* Section 1 */}
        <section id="why-text-message-fails" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-gulabi pl-3 py-0.5">
            Why a Text Message Wasn't Enough
          </h2>
          <p className="leading-relaxed text-espresso/85">
            When Raksha Bandhan rolls around, typing <em>"Happy Raksha Bandhan! 🧵✨"</em> into WhatsApp feels like an absolute cop-out.
          </p>
          <p className="leading-relaxed text-espresso/85">
            When you've grown up together sharing snacks, fighting over the TV remote, borrowing chargers without permission, and pulling off endless pranks, a generic text or plain e-card fails to convey the bond. Sibling relationships are built on an affectionate mix of unconditional love and playful extortion—what we lovingly call the <strong>Sibling Tax</strong>.
          </p>
          <p className="leading-relaxed text-espresso/85">
            I wanted to give my sister (and siblings everywhere) an experience they'd never forget: <strong>anithor bond</strong> (<a href="https://anithor.site" className="text-gulabi-deep underline font-semibold">anithor.site</a>) — <em>Rakhi with Digital Love</em>.
          </p>
        </section>

        {/* Section 2 */}
        <section id="culture-sibling-tax" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-gold pl-3 py-0.5">
            The Culture of Sibling Banter and Sibling Tax
          </h2>
          <p className="leading-relaxed text-espresso/85">
            In Nepalese and South Asian culture, Raksha Bandhan is a celebration of protection and love, accompanied by <em>shagun</em> (gifts or monetary tokens given by brothers). 
          </p>
          <p className="leading-relaxed text-espresso/85">
            When building <strong>anithor bond</strong>, I translated sibling banter directly into digital interactions. Here are key itemized lines directly from the code:
          </p>
          <div className="grid gap-3 my-4">
            <Card className="!p-4">
              <h3 className="font-bold text-base text-espresso">The Remote Control Tax</h3>
              <p className="text-sm text-espresso/70 mt-1">Itemized claim for emotional damage suffered during childhood battles over the TV remote control. Default amount: Rs. 501.</p>
            </Card>
            <Card className="!p-4">
              <h3 className="font-bold text-base text-espresso">Covert Operations &amp; Secret Keeping Fee</h3>
              <p className="text-sm text-espresso/70 mt-1">Charging for keeping secrets when parents start asking uncomfortable questions. Default amount: Rs. 1,001.</p>
            </Card>
            <Card className="!p-4">
              <h3 className="font-bold text-base text-espresso">Charger Non-Interference Act</h3>
              <p className="text-sm text-espresso/70 mt-1">Brother counter-defense clause: enforcing strict prohibition against borrowing phone chargers without return. Cap: Rs. 101.</p>
            </Card>
          </div>
        </section>

        {/* Section 3 */}
        <section id="engineering-challenge" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-cyan pl-3 py-0.5">
            The Engineering Challenge
          </h2>
          <p className="leading-relaxed text-espresso/85">
            Building an interactive web app with voice notes, 3D graphics, and custom invoices usually requires user registration, server-side databases, and asset storage. But for personal sibling exchanges, requiring signups kills the magic and creates privacy concerns.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-espresso/85">
            <li><strong>Zero-Server Privacy:</strong> No database, no backend server, no cookies, no tracking.</li>
            <li><strong>URL Hash Limit Constraints:</strong> Storing voice notes, 3D mesh specs, and itemized invoice arrays entirely inside a browser shareable link fragment (`#`).</li>
            <li><strong>Mobile WebGL Performance:</strong> Rendering smooth 60 FPS 3D models of zari threads, brass thalis, and metallic vaults on smartphones without draining batteries or dropping WebGL contexts.</li>
            <li><strong>Single-Channel Audio Sync:</strong> Coordinating ambient background music with meme audio clips across iOS Safari and Android Chrome.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="what-i-built" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-gulabi pl-3 py-0.5">
            What I Built: Dual Flow Architecture
          </h2>
          <p className="leading-relaxed text-espresso/85">
            <strong>anithor bond</strong> supports two distinct interactive workflows:
          </p>
          <div className="grid md:grid-cols-2 gap-4 my-4">
            <Well className="!bg-cream">
              <h3 className="font-bold text-lg text-espresso mb-2">Flow 1: Sister First (Standard)</h3>
              <p className="text-sm text-espresso/75 leading-relaxed">
                Sister designs a 3D Rakhi, selects mithai, itemizes a Sibling Tax invoice, records an audio note, and generates an encrypted URL capsule. The brother opens the link, completes 3D Aarti, ties the Rakhi, and negotiates terms.
              </p>
            </Well>
            <Well className="!bg-cream">
              <h3 className="font-bold text-lg text-espresso mb-2">Flow 2: Pre-emptive Brother Defense</h3>
              <p className="text-sm text-espresso/75 leading-relaxed">
                Brother builds a counter-offer capsule upfront with a fixed Shagun cap, troll vault, or Shagun Roulette challenge, sending it to his sister before she files her invoice.
              </p>
            </Well>
          </div>
        </section>

        {/* Section 5 */}
        <section id="threejs-webgl" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-gold pl-3 py-0.5">
            How the Three.js Experience Works
          </h2>
          <p className="leading-relaxed text-espresso/85">
            The 3D interactive graphics use <strong>Three.js</strong> wrapped in custom React WebGL components. The scene includes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-espresso/85">
            <li><strong>3D Rakhi Mesh (`Rakhi3D.tsx`):</strong> Procedural thread geometries (gold zari, velvet, silk braid), gemstone centerpieces, and floating sparkles.</li>
            <li><strong>3D Pooja Thali (`Thali3D.tsx`):</strong> Embossed brass plate with lit diya flame particles, flower petals, and 3D mithai items (Kaju Katli, Ladoo, Rasbari).</li>
            <li><strong>3D Metallic Vault (`Vault3D.tsx`):</strong> Heavy safe door with rotating dial lock, vault handle, and particle burst effects when unlocked.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="aes-gcm-capsules" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-cyan pl-3 py-0.5">
            AES-GCM Encrypted URL Hash Capsules
          </h2>
          <p className="leading-relaxed text-espresso/85">
            To achieve zero-server privacy, all payload data is encrypted locally using the browser's native Web Crypto API (`window.crypto.subtle`).
          </p>
          
          <div className="bg-[#1a1b26] text-[#a9b1d6] p-4 rounded-xl overflow-x-auto text-xs font-mono my-4 border border-espresso/20 shadow-inner">
            <div className="text-[#7aa2f7] font-bold mb-2">// AES-GCM Encrypted URL Hash Capsule Generation</div>
            <pre>{`import { packPayload, unpackPayload } from './payload'

// 1. Compress JSON payload using browser CompressionStream (gzip)
const json = JSON.stringify(payload)
const compressed = await compressGzip(new TextEncoder().encode(json))

// 2. Encrypt with AES-GCM 256-bit key derived via PBKDF2
const key = await deriveKey(secret)
const iv = window.crypto.getRandomValues(new Uint8Array(12))
const ciphertext = await window.crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  compressed
)

// 3. Encode to URL-safe Base64 hash string (#s=...)
const capsule = encodeBase64Url(concatBuffers(iv, new Uint8Array(ciphertext)))
const shareableLink = \`https://anithor.site/#s=\${capsule}\``}</pre>
          </div>
          
          <p className="leading-relaxed text-espresso/85">
            Because browsers strip the fragment portion (`#`) before sending HTTP requests, the encrypted payload never hits server logs or CDN proxies.
          </p>
        </section>

        {/* Section 7 */}
        <section id="shagun-roulette" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-gulabi pl-3 py-0.5">
            Shagun Roulette and Sibling Negotiation
          </h2>
          <p className="leading-relaxed text-espresso/85">
            Instead of static cash transfers, brothers can initiate a <strong>Shagun Roulette wheel</strong> or <strong>Budget Contract</strong>. The roulette wheel features fair odds (0.5x, 1x, 2x, 5x, or 0x Troll Vault), introducing gaming mechanics into festive negotiations.
          </p>
        </section>

        {/* Section 8 */}
        <section id="technical-architecture" className="space-y-4 mb-10">
          <h2 className="text-2xl font-display font-bold text-espresso border-l-4 border-gold pl-3 py-0.5">
            Technical Architecture &amp; Tech Stack
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
            <Card className="text-center !p-3">
              <span className="text-2xl">⚛️</span>
              <div className="font-bold text-sm text-espresso mt-1">React 18</div>
              <div className="text-xs text-espresso/60">UI Framework</div>
            </Card>
            <Card className="text-center !p-3">
              <span className="text-2xl">⚡</span>
              <div className="font-bold text-sm text-espresso mt-1">Vite + TS</div>
              <div className="text-xs text-espresso/60">Build &amp; Types</div>
            </Card>
            <Card className="text-center !p-3">
              <span className="text-2xl">🎲</span>
              <div className="font-bold text-sm text-espresso mt-1">Three.js</div>
              <div className="text-xs text-espresso/60">3D WebGL Engine</div>
            </Card>
            <Card className="text-center !p-3">
              <span className="text-2xl">🔒</span>
              <div className="font-bold text-sm text-espresso mt-1">Web Crypto</div>
              <div className="text-xs text-espresso/60">AES-GCM 256</div>
            </Card>
          </div>
        </section>

        {/* Section 9: FAQ */}
        <section id="faq" className="space-y-4 mb-10 pt-4 border-t border-espresso/10">
          <h2 className="text-2xl font-display font-bold text-espresso mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            <Well>
              <h3 className="font-bold text-base text-espresso">What is anithor bond?</h3>
              <p className="text-sm text-espresso/75 mt-1">
                anithor bond (anithor.site) is an interactive 3D WebGL web application for Raksha Bandhan allowing sisters and brothers to tie virtual Rakhis, negotiate Sibling Tax, and send voice-blessed encrypted capsules.
              </p>
            </Well>
            <Well>
              <h3 className="font-bold text-base text-espresso">Is any payload data saved on a server?</h3>
              <p className="text-sm text-espresso/75 mt-1">
                No. All capsule state is encrypted on your device using the browser native Web Crypto API (AES-GCM) and encoded directly into the shareable link fragment (#). Zero server database storage.
              </p>
            </Well>
            <Well>
              <h3 className="font-bold text-base text-espresso">Who built anithor bond?</h3>
              <p className="text-sm text-espresso/75 mt-1">
                anithor bond was designed and engineered by Kanta Raj Luitel (Susant Luitel / Susantedit).
              </p>
            </Well>
          </div>
        </section>

        {/* CTA Buttons */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-gulabi/10 via-gold/10 to-cyan/10 border border-espresso/15 text-center my-8">
          <h3 className="text-xl font-display font-extrabold text-espresso">Experience anithor bond Now</h3>
          <p className="text-sm text-espresso/70 mt-1 max-w-md mx-auto">
            Forge a custom 3D Rakhi, attach a Sibling Tax invoice, and share an encrypted link with your sibling.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Btn tone="pink" size="lg" onClick={() => go('make-rakhi')}>
              Forge 3D Rakhi →
            </Btn>
            <Btn tone="ghost" size="lg" onClick={goHome}>
              Back to Home
            </Btn>
          </div>
        </div>

        {/* Author Bio Card */}
        <footer className="pt-6 border-t border-espresso/10">
          <Card className="!p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-espresso text-cream grid place-items-center font-display font-bold text-xl shrink-0">
                KL
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-espresso">Kanta Raj Luitel (Susant Luitel)</h3>
                <p className="text-xs text-espresso/65 mt-0.5">
                  Full-stack developer, WebGL engineer &amp; creator of anithor bond (`anithor.site`).
                </p>
                <div className="flex gap-3 text-xs font-semibold text-gulabi-deep mt-2">
                  <a href="https://kantarajluitel.tech" target="_blank" rel="noopener noreferrer" className="hover:underline">Portfolio ↗</a>
                  <a href="https://github.com/susantedit" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub ↗</a>
                  <a href="https://x.com/Susantedit" target="_blank" rel="noopener noreferrer" className="hover:underline">Twitter/X ↗</a>
                </div>
              </div>
            </div>
          </Card>
        </footer>

      </article>
    </Screen>
  )
}
