/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			screens: {
				'mobLan': {
					'raw': "(min-device-width: 320px) and (max-device-width: 1024px) and (-webkit-min-device-pixel-ratio: 2)",
				},
			},
		},
	},
	plugins: [
		function({ addUtilities }) {
			addUtilities({
				'.scrollbar-stable': {
					'scrollbar-gutter': 'stable',
				},
			});
		},
	],
};
