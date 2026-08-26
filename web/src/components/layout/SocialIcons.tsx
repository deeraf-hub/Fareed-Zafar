/** Simple social glyphs — lucide no longer ships brand icons. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  className: 'size-4',
  'aria-hidden': true,
} as const;

export const FacebookIcon = () => (
  <svg {...base} xmlns="http://www.w3.org/2000/svg">
    <path d="M14 8.5V7c0-.8.2-1 1-1h1.5V3.5H14c-2.2 0-3.5 1.3-3.5 3.4V8.5H8.5V11h2v9.5h3.5V11h2.3l.4-2.5H14z" />
  </svg>
);

export const InstagramIcon = () => (
  <svg {...base} xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8zm4 2.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm0 2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM17 6.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
);

export const YoutubeIcon = () => (
  <svg {...base} xmlns="http://www.w3.org/2000/svg">
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z" />
  </svg>
);
