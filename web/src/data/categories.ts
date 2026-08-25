import { photoUrl } from './photos';
import type { Category } from '../types';

export const categories: Category[] = [
  {
    id: 'cat-01',
    name: 'Engine Parts',
    slug: 'engine-parts',
    description:
      'Spark plugs, filters, clutch plates, piston rings, gaskets and carburetor parts for routine engine service and overhauls.',
    image: photoUrl('engine-assembly'),
    fallbackImage: '/products/piston-ring.svg',
    createdAt: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'cat-02',
    name: 'Electrical Parts',
    slug: 'electrical-parts',
    description:
      'Batteries, bulbs, indicators, horns, ignition coils, CDI units, rectifiers and complete wiring sets.',
    image: photoUrl('wiring'),
    fallbackImage: '/products/battery.svg',
    createdAt: '2025-01-05T09:05:00.000Z',
  },
  {
    id: 'cat-03',
    name: 'Brake Parts',
    slug: 'brake-parts',
    description:
      'Front and rear brake shoes, brake cables, brake light switches and brake hardware for safe stopping.',
    image: photoUrl('brake-disc'),
    fallbackImage: '/products/brake-shoe.svg',
    createdAt: '2025-01-05T09:10:00.000Z',
  },
  {
    id: 'cat-04',
    name: 'Suspension',
    slug: 'suspension',
    description:
      'Rear shock absorbers, front fork seals, fork oil and suspension hardware for a stable, comfortable ride.',
    image: photoUrl('fork'),
    fallbackImage: '/products/shock-absorber.svg',
    createdAt: '2025-01-05T09:15:00.000Z',
  },
  {
    id: 'cat-05',
    name: 'Chain & Sprocket',
    slug: 'chain-sprocket',
    description:
      'Chain sets, front and rear sprockets, chain adjusters and drive components for every popular bike.',
    image: photoUrl('chain-sprocket'),
    fallbackImage: '/products/chain-set.svg',
    createdAt: '2025-01-05T09:20:00.000Z',
  },
  {
    id: 'cat-06',
    name: 'Controls',
    slug: 'controls',
    description:
      'Brake and clutch levers, handle grips, kick starters, gear levers, foot rests and control cables.',
    image: photoUrl('grip'),
    fallbackImage: '/products/lever.svg',
    createdAt: '2025-01-05T09:25:00.000Z',
  },
  {
    id: 'cat-07',
    name: 'Body Parts',
    slug: 'body-parts',
    description:
      'Side mirrors, headlight and tail light assemblies, mudguards, speedometers and number plate frames.',
    image: photoUrl('headlight'),
    fallbackImage: '/products/mirror.svg',
    createdAt: '2025-01-05T09:30:00.000Z',
  },
  {
    id: 'cat-08',
    name: 'Accessories',
    slug: 'accessories',
    description:
      'Locks, bike covers, mobile holders, LED lights, reflectors and everyday riding accessories.',
    image: photoUrl('rider-phone'),
    fallbackImage: '/products/lock.svg',
    createdAt: '2025-01-05T09:35:00.000Z',
  },
];

export const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
