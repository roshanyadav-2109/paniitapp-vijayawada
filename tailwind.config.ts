import type { Config } from "tailwindcss";
// Imported rather than require()d: this file is ESM (import/export default),
// and on Node >=22 it is loaded as ESM, where `require` is not defined. The
// old `require("tailwindcss-animate")` threw during config load, which left
// Tailwind with no config and the app with no CSS at all in `next dev`.
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '1rem',
  		screens: {
  			'2xl': '1280px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			// The app ground. Plain white — it was briefly a warm cream
  			// (#F4F1EA), which read as light yellow rather than as paper, so
  			// it is white again. `deep` is the inset/hover step and is a
  			// NEUTRAL grey on purpose: the original `slate-50` was a cold
  			// blue-grey that made navy ink look like a dashboard screenshot,
  			// and a warm tan brings the yellow back, so neither extreme.
  			paper: {
  				DEFAULT: '#FFFFFF',
  				deep: '#F4F4F5',
  				raised: '#FFFFFF'
  			},
  			// Hairline rules. Replaces `brand-100` (#d4d2ed, a periwinkle) as
  			// the border everywhere — that lilac cast on 150 borders was most
  			// of why the app looked purple-tinted. Neutral, matching `paper`.
  			rule: {
  				DEFAULT: '#E4E4E7',
  				strong: '#C4C4C8',
  				faint: '#EFEFF1'
  			},
  			brand: {
  				'50': '#eeedf7',
  				'100': '#d4d2ed',
  				'200': '#a9a5db',
  				'300': '#7d78c9',
  				'400': '#524bb7',
  				'500': '#3b329e',
  				'600': '#2e2783',
  				'700': '#241e6b',
  				'800': '#1B1464',
  				'900': '#15104e',
  				'950': '#0d0930'
  			},
  			iit: {
  				'50': '#fff0f3',
  				'100': '#ffd9e0',
  				'200': '#ffb3c2',
  				'300': '#ff7d96',
  				'400': '#ff3c66',
  				'500': '#DD002B',
  				'600': '#b80024',
  				'700': '#94001d',
  				'800': '#700016',
  				'900': '#4d000f'
  			},
  			track: {
  				ai: '#7C3AED',
  				deeptech: '#06B6D4',
  				policy: '#10B981',
  				investor: '#1B1464',
  				workshop: '#EC4899',
  				founders: '#F97316',
  				climate: '#22C55E',
  				fintech: '#3B82F6',
  				keynote: '#1B1464',
  				general: '#64748B'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			// `font-display` — titles only. Deliberately not applied to h1/h2
  			// globally: several `h2`/`h3` in this app are small uppercase
  			// field labels, and a serif is wrong for those. Opt in per title.
  			display: [
  				'var(--font-display)',
  				'Georgia',
  				'ui-serif',
  				'serif'
  			],
  			telugu: [
  				'var(--font-telugu)',
  				'var(--font-sans)',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};

export default config;
