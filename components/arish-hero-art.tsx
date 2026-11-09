export function ArishHeroArt() {
  return (
    <div className="relative isolate mx-auto w-full max-w-[600px]">
      <div className="absolute -inset-5 -z-10 rounded-[42px] bg-[#8cc63f]/10 blur-2xl" />
      <div className="overflow-hidden rounded-[30px] border border-[#24351c]/10 bg-[#e5f0e9] shadow-[0_28px_90px_rgba(35,65,35,.18)]">
        <svg viewBox="0 0 620 500" className="block h-auto w-full" role="img" aria-label="رسم فني مستوحى من شاطئ العريش وسيارة تاكسي العاصمة">
          <defs>
            <linearGradient id="arishSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8e9e0"/><stop offset="1" stopColor="#f5f7e9"/></linearGradient>
            <linearGradient id="arishSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8fc8c1"/><stop offset="1" stopColor="#4e9e9a"/></linearGradient>
            <linearGradient id="arishRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64736a"/><stop offset="1" stopColor="#293a32"/></linearGradient>
          </defs>
          <rect width="620" height="500" fill="url(#arishSky)"/>
          <circle cx="478" cy="104" r="42" fill="#f8d98a" opacity=".9"/>
          <path d="M0 205 Q100 190 190 204 T380 202 T620 198 V335 H0Z" fill="#f3e8ca"/>
          <path d="M0 232 Q150 215 300 232 T620 224 V356 H0Z" fill="url(#arishSea)"/>
          <path d="M0 260 Q110 248 230 262 T470 258 T620 255" fill="none" stroke="#d9f1e5" strokeWidth="5" opacity=".8"/>
          <path d="M0 287 Q120 276 245 289 T490 283 T620 282" fill="none" stroke="#d9f1e5" strokeWidth="3" opacity=".65"/>
          <path d="M0 320 Q130 302 260 322 T500 315 T620 310 V390 H0Z" fill="#d7c59e"/>
          <path d="M0 350 Q150 326 290 350 T620 342 V500 H0Z" fill="#e8dcc0"/>
          <g fill="#b5a17d" opacity=".8">
            <path d="M38 222v-32h24v32zm32-4v-45h28v45zm34 4v-26h20v26zm430-4v-35h25v35zm33 1v-51h31v51z"/>
          </g>
          <g stroke="#496b4e" strokeWidth="8" strokeLinecap="round" fill="none">
            <path d="M118 340 Q113 292 124 252"/><path d="M510 345 Q514 292 500 248"/>
          </g>
          <g fill="#527e52">
            <path d="M124 258q-50-40-68-14 28 2 68 14-42-49-61-42 20 20 61 42-16-60 4-68 6 29-4 68 17-54 37-46-14 22-37 46 48-29 58-12-25 2-58 12 44 2 48 24-27-12-48-24Z"/>
            <path d="M501 255q-43-34-59-12 25 2 59 12-36-42-53-36 17 17 53 36-13-51 4-59 5 25-4 59 15-47 32-40-12 19-32 40 41-25 50-10-22 2-50 10 38 2 42 21-23-10-42-21Z"/>
          </g>
          <path d="M0 394 Q180 365 320 390 T620 382 V500 H0Z" fill="url(#arishRoad)"/>
          <path d="M0 414 Q180 385 320 410 T620 402" fill="none" stroke="#f4f0d9" strokeWidth="4" opacity=".65"/>
          <path d="M80 466h72m40-8h72m44-1h72m45-8h72" stroke="#f8f4dc" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
          <g transform="translate(220 294)">
            <ellipse cx="100" cy="126" rx="132" ry="17" fill="#182015" opacity=".2"/>
            <path d="M18 71 37 29q8-18 29-18h83q19 0 29 18l19 42 18 12v36H0V83Z" fill="#182015"/>
            <path d="m54 31-13 34h129l-14-34q-4-10-16-10H69q-11 0-15 10Z" fill="#dcebe2"/>
            <path d="M9 83h198v28H9z" fill="#8cc63f"/>
            <path d="M28 89h160" stroke="#f7f8ef" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="43" cy="118" r="19" fill="#17221b" stroke="#e8eee4" strokeWidth="6"/>
            <circle cx="171" cy="118" r="19" fill="#17221b" stroke="#e8eee4" strokeWidth="6"/>
            <rect x="85" y="4" width="42" height="8" rx="4" fill="#8cc63f"/>
          </g>
          <g transform="translate(24 26)">
            <rect width="148" height="48" rx="16" fill="#fff" opacity=".94"/>
            <circle cx="23" cy="24" r="7" fill="#8cc63f"/>
            <text x="128" y="30" textAnchor="end" fill="#182015" fontSize="17" fontWeight="700">العريش · شمال سيناء</text>
          </g>
        </svg>
        <div className="flex items-center justify-between gap-4 bg-white px-5 py-4">
          <div><b className="block text-sm font-extrabold text-[#182015]">من قلب العريش</b><span className="mt-1 block text-xs text-neutral-600">مشاويرك تبدأ بخطوة واضحة</span></div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf6df] text-[#527e25]"><span className="text-lg font-black">CT</span></span>
        </div>
      </div>
    </div>
  );
}
