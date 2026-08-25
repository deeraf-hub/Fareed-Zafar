/**
 * Royalty-free product photography.
 *
 * Every photo is from Pexels, whose licence allows free commercial use with no
 * attribution required (https://www.pexels.com/license/). They are served from
 * the Pexels CDN with sizing parameters, so nothing is stored in this repo.
 *
 * To self-host them instead — recommended before launch, so the shop does not
 * depend on a third-party CDN — run `npm run fetch-images`, which downloads
 * every photo below into public/products/photos/ and prints the one-line change
 * needed here.
 *
 * Each entry keeps its Pexels page URL so any photo can be checked or swapped.
 */
export interface Photo {
  id: string;
  /** Pexels CDN path, without sizing parameters. */
  src: string;
  /** Description of what the photo shows, used as image alt text. */
  alt: string;
  /** Pexels page the photo came from. */
  source: string;
}

const P = (id: string, path: string, alt: string, source: string): [string, Photo] => [
  id,
  { id, src: `https://images.pexels.com/photos/${path}`, alt, source },
];

export const photos: Record<string, Photo> = Object.fromEntries([
  // ── Engine ──────────────────────────────────────────────────────────
  P('spark-plug', '36086528/pexels-photo-36086528/free-photo-of-close-up-of-old-rusty-spark-plugs.jpeg', 'Close-up of motorcycle spark plugs', 'https://www.pexels.com/search/spark%20plug/'),
  P('spark-plug-2', '8651903/pexels-photo-8651903.jpeg', 'Spark plug held over an engine', 'https://www.pexels.com/search/spark%20plug/'),
  P('air-filter', '9381013/pexels-photo-9381013.jpeg', 'Air filter element being fitted', 'https://www.pexels.com/photo/a-person-putting-air-filter-in-the-car-9381013/'),
  P('air-filter-2', '9331805/pexels-photo-9331805.jpeg', 'Pleated air filter element', 'https://www.pexels.com/search/air%20filter/'),
  P('oil-filter', '11629442/pexels-photo-11629442.jpeg', 'Oil filter and engine components', 'https://www.pexels.com/search/oil%20filter/'),
  P('oil-filter-2', '7541352/pexels-photo-7541352.jpeg', 'Oil filter in a workshop', 'https://www.pexels.com/search/oil%20filter/'),
  P('engine-oil', '13065690/pexels-photo-13065690.jpeg', 'Engine oil being poured during a service', 'https://www.pexels.com/search/oil%20change/'),
  P('engine-oil-2', '13065697/pexels-photo-13065697.jpeg', 'Engine oil bottle and funnel', 'https://www.pexels.com/search/oil%20change/'),
  P('engine-assembly', '31139705/pexels-photo-31139705/free-photo-of-skilled-mechanic-assembling-a-motorcycle-engine.jpeg', 'Mechanic assembling a motorcycle engine', 'https://www.pexels.com/search/motorcycle%20assembly/'),
  P('cylinder-head', '33559313/pexels-photo-33559313.jpeg', 'Engine cylinder head on a workshop bench', 'https://www.pexels.com/photo/close-up-of-engine-cylinder-head-in-workshop-33559313/'),
  P('cylinder-head-2', '7565172/pexels-photo-7565172.jpeg', 'Cylinder head and valve components', 'https://www.pexels.com/search/cylinder%20head/'),
  P('cylinder-head-3', '33559354/pexels-photo-33559354/free-photo-of-mechanic-handling-engine-cylinder-head-assembly.jpeg', 'Mechanic handling a cylinder head assembly', 'https://www.pexels.com/search/cylinder%20head/'),
  P('cylinder-head-4', '36598777/pexels-photo-36598777.jpeg', 'Engine valves and cylinder head detail', 'https://www.pexels.com/search/cylinder%20head/'),

  // ── Electrical ──────────────────────────────────────────────────────
  P('battery', '32282233/pexels-photo-32282233.jpeg', 'Battery with terminal connections', 'https://www.pexels.com/search/battery%20terminals/'),
  P('battery-2', '5572260/pexels-photo-5572260.jpeg', 'Battery terminal close-up', 'https://www.pexels.com/search/battery%20terminals/'),
  P('wiring', '2332885/pexels-photo-2332885.jpeg', 'Vehicle wiring loom and connectors', 'https://www.pexels.com/search/wiring%20harness/'),
  P('wiring-2', '2332881/pexels-photo-2332881.jpeg', 'Bundled electrical wiring', 'https://www.pexels.com/search/wiring%20harness/'),
  P('headlight', '2865410/pexels-photo-2865410.jpeg', 'Motorcycle headlight close-up', 'https://www.pexels.com/photo/close-up-photo-of-motorcycle-headlight-2865410/'),
  P('headlight-2', '10632414/pexels-photo-10632414.jpeg', 'Motorcycle headlight unit', 'https://www.pexels.com/photo/motorcycle-headlight-in-close-up-photography-10632414/'),
  P('headlight-3', '7996373/pexels-photo-7996373.jpeg', 'Headlight of a motorbike', 'https://www.pexels.com/photo/close-up-photo-of-a-motorbike-s-headlight-7996373/'),
  P('dashboard', '10103321/pexels-photo-10103321.jpeg', 'Motorcycle dashboard and switches', 'https://www.pexels.com/photo/close-up-on-motorcycle-dashboard-10103321/'),
  P('speedometer', '4819388/pexels-photo-4819388.jpeg', 'Motorcycle speedometer close-up', 'https://www.pexels.com/photo/motorcycle-speedometer-in-close-up-shot-4819388/'),
  P('speedometer-2', '38178371/pexels-photo-38178371/free-photo-of-close-up-of-illuminated-motorcycle-speedometer-at-night.jpeg', 'Illuminated motorcycle speedometer', 'https://www.pexels.com/photo/close-up-of-illuminated-motorcycle-speedometer-at-night-38178371/'),

  // ── Brakes & suspension ─────────────────────────────────────────────
  P('brake-system', '1683406/pexels-photo-1683406.jpeg', 'Motorcycle brake assembly close-up', 'https://www.pexels.com/photo/close-up-photo-of-motorcycle-brake-system-1683406/'),
  P('brake-disc', '37811569/pexels-photo-37811569/free-photo-of-close-up-of-motorcycle-brake-disc-and-caliper.jpeg', 'Motorcycle brake disc and caliper', 'https://www.pexels.com/search/disc%20brakes/'),
  P('brake-front', '18608322/pexels-photo-18608322.jpeg', 'Front brake of a motorcycle', 'https://www.pexels.com/photo/a-close-up-of-the-front-brake-of-a-motorcycle-18608322/'),
  P('brake-caliper', '29279937/pexels-photo-29279937.jpeg', 'Motorcycle brake caliper', 'https://www.pexels.com/photo/close-up-of-red-motorcycle-brake-caliper-29279937/'),
  P('fork', '5111327/pexels-photo-5111327.jpeg', 'Motorcycle front fork close-up', 'https://www.pexels.com/photo/close-up-of-motorcycle-fork-5111327/'),
  P('fork-2', '4215008/pexels-photo-4215008.jpeg', 'Front fork and suspension detail', 'https://www.pexels.com/photo/close-up-of-motorcycle-fork-5111327/'),
  P('fork-3', '10392250/pexels-photo-10392250.jpeg', 'Motorcycle fork tubes', 'https://www.pexels.com/search/motorcycle%20fork/'),

  // ── Chain & drive ───────────────────────────────────────────────────
  P('chain-sprocket', '9607395/pexels-photo-9607395.jpeg', 'Motorcycle chain and sprocket', 'https://www.pexels.com/photo/9607395/'),
  P('chain-sprocket-2', '37811511/pexels-photo-37811511/free-photo-of-close-up-of-motorcycle-chain-and-sprocket.jpeg', 'Chain running over a rear sprocket', 'https://www.pexels.com/search/sprocket/'),
  P('chain', '15419149/pexels-photo-15419149/free-photo-of-close-up-of-chain.jpeg', 'Drive chain close-up', 'https://www.pexels.com/search/sprocket/'),
  P('rear-wheel-gear', '37802925/pexels-photo-37802925/free-photo-of-close-up-of-motorcycle-rear-wheel-and-gear-mechanism.jpeg', 'Rear wheel and drive mechanism', 'https://www.pexels.com/search/motorbike%20chain/'),
  P('wheel-chain', '9607388/pexels-photo-9607388.jpeg', 'Motorcycle rear wheel with chain', 'https://www.pexels.com/photo/close-up-photo-of-motorcycle-wheel-9607388/'),

  // ── Controls ────────────────────────────────────────────────────────
  P('lever', '9606979/pexels-photo-9606979.jpeg', 'Motorcycle brake lever on the handlebar', 'https://www.pexels.com/search/brake%20lever/'),
  P('lever-2', '5184998/pexels-photo-5184998.jpeg', 'Handlebar lever close-up', 'https://www.pexels.com/search/brake%20levers/'),
  P('lever-3', '29814886/pexels-photo-29814886.jpeg', 'Brake lever and cable', 'https://www.pexels.com/search/brake%20levers/'),
  P('handbrake', '15398116/pexels-photo-15398116.jpeg', 'Front brake lever and cable', 'https://www.pexels.com/photo/motorcycle-handbrake-in-close-up-15398114/'),
  P('grip', '4922632/pexels-photo-4922632.jpeg', 'Motorcycle handle grip', 'https://www.pexels.com/search/motorcycle%20handle%20grip/'),
  P('grip-2', '36199657/pexels-photo-36199657/free-photo-of-close-up-of-hand-on-motorcycle-handlebar.jpeg', 'Hand on a motorcycle handlebar grip', 'https://www.pexels.com/search/motorcycle%20handle%20grip/'),

  // ── Workshop ────────────────────────────────────────────────────────
  P('mechanic-wrench', '8550669/pexels-photo-8550669.jpeg', 'Mechanic working on a motorcycle engine with a wrench', 'https://www.pexels.com/photo/a-man-using-a-wrench-on-motorcycle-engine-8550669/'),
  P('mechanic', '3822843/pexels-photo-3822843.jpeg', 'Mechanic repairing a motorcycle in a workshop', 'https://www.pexels.com/photo/bearded-man-fixing-motorcycle-in-workshop-3822843/'),
  P('workshop', '29409960/pexels-photo-29409960.jpeg', 'Motorcycle repair workshop', 'https://www.pexels.com/photo/motorcycle-repair-workshop-with-tools-and-posters-29409960/'),
  P('tools', '8550634/pexels-photo-8550634.jpeg', 'Motorcycle tools laid out for a service', 'https://www.pexels.com/search/motorcycle%20tools/'),

  // ── Body, accessories & bikes ───────────────────────────────────────
  P('mirror', '13199123/pexels-photo-13199123.jpeg', 'Side mirror on a motorcycle handlebar', 'https://www.pexels.com/photo/close-up-photo-of-a-side-mirror-in-a-handle-bar-13199123/'),
  P('mirror-2', '15309329/pexels-photo-15309329/free-photo-of-motorcycle-handlebar-and-a-rear-view-mirror.jpeg', 'Handlebar and rear view mirror', 'https://www.pexels.com/photo/motorcycle-handlebar-and-a-rear-view-mirror-15309329/'),
  P('bike-black', '5769601/pexels-photo-5769601.jpeg', 'Black motorcycle parked on the street', 'https://www.pexels.com/photo/a-black-motorcycle-parked-on-the-side-of-the-street-5769601/'),
  P('bike-city', '16934487/pexels-photo-16934487.jpeg', 'Motorcycle parked on a city street', 'https://www.pexels.com/photo/a-motorcycle-parked-on-the-side-of-the-street-in-city-16934487/'),
  P('bike-street', '27799098/pexels-photo-27799098.jpeg', 'Motorcycle parked at the kerb', 'https://www.pexels.com/photo/a-motorcycle-parked-on-the-side-of-a-city-street-27799098/'),
  P('bike-side', '12036802/pexels-photo-12036802.jpeg', 'Side view of a parked motorcycle', 'https://www.pexels.com/photo/side-view-of-a-parked-motorcycle-12036802/'),
  P('bike-close', '17563802/pexels-photo-17563802/free-photo-of-motorcycle-in-close-up.jpeg', 'Motorcycle bodywork close-up', 'https://www.pexels.com/photo/motorcycle-in-close-up-17563802/'),
  P('bike-close-2', '8506363/pexels-photo-8506363.jpeg', 'Black motorcycle close-up', 'https://www.pexels.com/photo/black-motorcycle-in-close-up-photography-8506363/'),
  P('bikes-parked', '19854368/pexels-photo-19854368/free-photo-of-motorbikes-on-pavement.jpeg', 'Motorbikes parked on a pavement', 'https://www.pexels.com/search/motorcycle%20side%20view/'),
  P('bike-vintage', '28965338/pexels-photo-28965338/free-photo-of-vintage-royal-enfield-motorcycle-on-city-street.jpeg', 'Motorcycle on a city street', 'https://www.pexels.com/search/motorcycle%20side%20view/'),
  P('rider-phone', '34710439/pexels-photo-34710439.jpeg', 'Rider using a phone beside a motorcycle', 'https://www.pexels.com/photo/man-with-helmet-using-smartphone-by-motorcycle-34710439/'),
  P('accessories', '17926419/pexels-photo-17926419.jpeg', 'Motorcycle riding accessories', 'https://www.pexels.com/search/motorcycle%20accessories/'),
  P('accessories-2', '38585166/pexels-photo-38585166.jpeg', 'Motorcycle accessories close-up', 'https://www.pexels.com/search/motorcycle%20accessories/'),
]);

/**
 * Set to true after running `npm run fetch-images`, which saves every photo to
 * public/products/photos/. The shop then serves its own images and stops
 * depending on the Pexels CDN.
 */
export const SELF_HOSTED = false;

/** Builds a sized image URL for a photo — CDN, or local once self-hosted. */
export const photoUrl = (id: string, width = 800, height = 600): string => {
  const photo = photos[id];
  if (!photo) throw new Error(`Unknown photo id: ${id}`);
  if (SELF_HOSTED) return `/products/photos/${id}.jpg`;
  return `${photo.src}?auto=compress&cs=tinysrgb&fit=crop&w=${width}&h=${height}`;
};

export const photoAlt = (id: string): string => photos[id]?.alt ?? '';
