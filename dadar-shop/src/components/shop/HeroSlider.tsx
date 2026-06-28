import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import bannerSale from "@/assets/banner-sale.jpg";
import heroEmerald from "@/assets/hero-emerald.jpg";
import heroRose from "@/assets/hero-rose.jpg";

interface Slide {
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaTo: string;
  image: string;
  tone: "emerald" | "amber" | "rose";
}

const slides: Slide[] = [
  {
    kicker: "Final Sale",
    title: "Up to 60% off the Eid Edit",
    subtitle: "Curated picks from verified sellers.",
    cta: "Shop the sale",
    ctaTo: "/shop",
    image: bannerSale,
    tone: "amber",
  },
  {
    kicker: "New Season",
    title: "Quietly luxurious basics",
    subtitle: "Cashmere, silk & leather, made to last.",
    cta: "Explore",
    ctaTo: "/shop",
    image: heroEmerald,
    tone: "emerald",
  },
  {
    kicker: "Members Only",
    title: "Early access to weekly drops",
    subtitle: "Join Dadar+ for member pricing & free returns.",
    cta: "Join Dadar+",
    ctaTo: "/account",
    image: heroRose,
    tone: "rose",
  },
];

const overlays: Record<Slide["tone"], string> = {
  emerald: "bg-gradient-to-r from-primary/85 via-primary/55 to-transparent",
  amber: "bg-gradient-to-r from-primary/85 via-primary/45 to-transparent",
  rose: "bg-gradient-to-r from-foreground/70 via-foreground/30 to-transparent",
};

export function HeroSlider() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const s = slides[i];
  if (!s) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-card">
      <div className="relative aspect-[16/10] w-full">
        {slides.map((slide, idx) => (
          <img
            key={slide.image}
            src={slide.image}
            alt={slide.title}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700",
              idx === i ? "opacity-100" : "opacity-0",
            )}
            width={1280}
            height={800}
            loading={idx === 0 ? "eager" : "lazy"}
          />
        ))}
        <div className={cn("absolute inset-0 transition-opacity duration-500", overlays[s.tone])} />

        <div className="text-primary-foreground absolute inset-0 flex flex-col justify-end p-5">
          <span className="bg-amber text-amber-foreground inline-flex w-fit rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
            {s.kicker}
          </span>
          <h2 className="text-display mt-2.5 max-w-[80%] text-[26px] leading-[1.1]">
            {s.title}
          </h2>
          <p className="mt-1.5 max-w-[80%] text-[13px] opacity-90">{s.subtitle}</p>
          <div className="mt-3 flex items-center justify-between">
            <Link
              to={s.ctaTo}
              className="bg-primary-foreground text-primary tap-scale tap-scale-active inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-[13px] font-semibold"
            >
              {s.cta} <ArrowUpRight className="size-4" strokeWidth={2.4} />
            </Link>
            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === i ? "bg-primary-foreground w-6" : "bg-primary-foreground/40 w-1.5",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
