import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Регистрирует плагины один раз (ScrollTrigger — бесплатный). */
export function ensureGsapPlugins(): void {
	if (registered || typeof window === "undefined") return;
	gsap.registerPlugin(ScrollTrigger);
	gsap.defaults({ ease: "power2.out", duration: 0.45 });
	registered = true;
}

export { gsap, ScrollTrigger };
