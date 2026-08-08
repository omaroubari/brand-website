import type { BrandColor, BrandConfig, BrandScheme } from './types';

/** Look a palette entry up by id. Throws early so typos fail the build, not the page. */
export function color(brand: BrandConfig, id: string): BrandColor {
	const found = brand.colors.find((c) => c.id === id);
	if (!found) {
		const known = brand.colors.map((c) => c.id).join(', ');
		throw new Error(`[brand] Unknown colour id "${id}". Known ids: ${known}`);
	}
	return found;
}

/** `#f0f` and `#ff00ff` → `[r, g, b]`. */
export function hexToRgb(hex: string): [number, number, number] {
	let h = hex.replace('#', '').trim();
	if (h.length === 3) h = h.split('').map((c) => c + c).join('');
	const n = Number.parseInt(h.slice(0, 6), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance per WCAG 2.1. */
export function luminance(hex: string): number {
	const channel = (v: number) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	const [r, g, b] = hexToRgb(hex);
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Black or white — whichever is legible on `hex`. */
export function readableOn(hex: string): '#000000' | '#ffffff' {
	return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#000000' : '#ffffff';
}

/** WCAG grade for a pairing, used by the contrast matrix. */
export function contrastGrade(ratio: number): 'AAA' | 'AA' | 'AA Large' | 'Fail' {
	if (ratio >= 7) return 'AAA';
	if (ratio >= 4.5) return 'AA';
	if (ratio >= 3) return 'AA Large';
	return 'Fail';
}

/** `steps` tints of `hex`, lightest last, matching the ramps in the printed guidelines. */
export function tintRamp(hex: string, steps = 9): string[] {
	const [r, g, b] = hexToRgb(hex);
	return Array.from({ length: steps }, (_, i) => {
		const mix = (i + 1) / (steps + 1);
		const blend = (c: number) => Math.round(c + (255 - c) * mix);
		return `rgb(${blend(r)} ${blend(g)} ${blend(b)})`;
	});
}

function schemeVars(brand: BrandConfig, scheme: BrandScheme): string {
	return (Object.entries(scheme) as Array<[keyof BrandScheme, string]>)
		.map(([role, id]) => `--${kebab(role)}: var(--color-${color(brand, id).id});`)
		.join('\n\t\t');
}

function kebab(s: string): string {
	return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Every brand-derived custom property, as one `<style>` body.
 *
 * Emitted once in `BaseLayout`. Colours resolve twice — a raw `--color-{id}`
 * for each palette entry, then semantic roles pointing at them per scheme — so
 * components only ever reference `--ink`, `--surface`, `--accent` and friends.
 */
export function brandStyleSheet(brand: BrandConfig): string {
	const palette = brand.colors.map((c) => `--color-${c.id}: ${c.hex};`).join('\n\t\t');
	const typeScale = brand.typography.scale
		.map((s, i) => {
			const key = slug(s.name);
			return [
				`--type-${key}-size: ${s.size};`,
				`--type-${key}-leading: ${s.lineHeight};`,
				`--type-${key}-tracking: ${s.tracking};`,
				`--type-${key}-weight: ${s.weight ?? 400};`,
				i === 0 ? '' : '',
			].join('\n\t\t');
		})
		.join('\n\t\t');

	return `:root {
		${palette}

		--font-display: ${brand.typography.display};
		--font-text: ${brand.typography.text};
		--font-mono: ${brand.typography.mono};

		${typeScale}

		${schemeVars(brand, brand.theme.light)}

		color-scheme: light;
	}

	:root[data-theme='dark'] {
		${schemeVars(brand, brand.theme.dark)}

		color-scheme: dark;
	}
${
	brand.theme.default === 'light'
		? ''
		: `
	@media (prefers-color-scheme: dark) {
		:root:not([data-theme='light']) {
			${schemeVars(brand, brand.theme.dark)}

			color-scheme: dark;
		}
	}`
}`;
}

/** "Display 1.0" → "display-1-0". Used for the type scale custom properties. */
export function slug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/** Inline styles for one step of the type scale. */
export function typeStyle(brand: BrandConfig, name: string): string {
	const step = brand.typography.scale.find((s) => s.name === name);
	if (!step) {
		const known = brand.typography.scale.map((s) => s.name).join(', ');
		throw new Error(`[brand] Unknown type style "${name}". Known styles: ${known}`);
	}
	return [
		`font-family: var(--font-${step.font ?? 'text'})`,
		`font-size: ${step.size}`,
		`line-height: ${step.lineHeight}`,
		`letter-spacing: ${step.tracking}`,
		`font-weight: ${step.weight ?? 400}`,
		step.transform ? `text-transform: ${step.transform}` : '',
	]
		.filter(Boolean)
		.join('; ');
}
