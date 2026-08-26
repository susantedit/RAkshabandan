/**
 * CreatorFooter.tsx — Creator details, social badges, and branding for anithor.site
 */

export function CreatorFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`mt-10 pt-6 pb-8 border-t-2 border-dashed border-clayline/60 text-center ${className}`}>
      <div className="max-w-md mx-auto px-4 space-y-3">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <img src="/logo.png" alt="anithor bond logo" className="w-12 h-12 object-contain block mb-1" />
          <div className="flex items-center justify-center gap-2">
            <span className="font-display font-black text-[1.25rem] text-marigold tracking-wide">
              anithor bond
            </span>
            <span className="text-[0.75rem] px-2.5 py-0.5 rounded-full bg-pista/20 text-pista border border-pista/40 font-semibold">
              anithor.site
            </span>
          </div>
          <p className="font-display font-bold text-[0.85rem] text-espresso">
            Rakhi with Digital Love
          </p>
          <p className="text-[0.78rem] text-espresso/70 italic">
            A bond that protects, a love that connects
          </p>
        </div>

        <div className="p-2.5 bg-gulabi/10 border border-gulabi/30 rounded-xl text-center">
          <p className="text-[0.82rem] font-bold text-gulabi-deep">
            📸 Don't forget to tag <a href="https://instagram.com/susantgamerz" target="_blank" rel="noopener noreferrer" className="underline font-black text-gulabi">@susantgamerz</a> on Instagram!
          </p>
        </div>

        <p className="text-[0.82rem] text-espresso/70 leading-snug">
          Created with ❤️ by <strong className="text-espresso">Kanta Raj Luitel</strong>
        </p>

        <a
          href="https://kantarajluitel.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-marigold hover:underline"
        >
          🌐 kantarajluitel.tech →
        </a>

        {/* Social Badges Grid */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
          <a href="https://facebook.com/Kantaraj.Luitel" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Facebook-%231877F2.svg?logo=Facebook&logoColor=white" alt="Facebook" />
          </a>
          <a href="https://instagram.com/susantgamerz" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Instagram-%23E4405F.svg?logo=Instagram&logoColor=white" alt="Instagram" />
          </a>
          <a href="https://linkedin.com/in/kantaraj-luitel" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/LinkedIn-%230077B5.svg?logo=linkedin&logoColor=white" alt="LinkedIn" />
          </a>
          <a href="https://pinterest.com/susantluitel" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Pinterest-%23E60023.svg?logo=Pinterest&logoColor=white" alt="Pinterest" />
          </a>
          <a href="https://reddit.com/user/Successful-Twist2608" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Reddit-%23FF4500.svg?logo=Reddit&logoColor=white" alt="Reddit" />
          </a>
          <a href="https://tiktok.com/@vortexeditz34" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/TikTok-%23000000.svg?logo=TikTok&logoColor=white" alt="TikTok" />
          </a>
          <a href="https://x.com/Susantedit" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/X-black.svg?logo=X&logoColor=white" alt="X" />
          </a>
          <a href="https://codepen.io/susant-gamerz" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Codepen-000000?logo=codepen&logoColor=white" alt="CodePen" />
          </a>
          <a href="https://github.com/susantedit" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/GitHub-181717.svg?logo=github&logoColor=white" alt="GitHub" />
          </a>
          <a href="https://wa.me/9779708838261" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/WhatsApp-25D366?logo=whatsapp&logoColor=white" alt="WhatsApp" />
          </a>
          <a href="mailto:susantedit@gmail.com" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Email-D14836?logo=gmail&logoColor=white" alt="Email" />
          </a>
        </div>

        <p className="text-[0.7rem] text-espresso/45 pt-1">
          anithor.site · Encrypted end-to-end · No data sent to servers
        </p>
      </div>
    </footer>
  )
}
