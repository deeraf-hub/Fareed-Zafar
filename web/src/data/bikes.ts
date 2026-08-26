import { photoUrl } from './photos';
import type { BikeModel } from '../types';

/** Popular motorcycle models in Pakistan, used for compatibility filters. */
export const bikes: BikeModel[] = [
  { id: 'bike-01', name: 'Honda CD 70', slug: 'honda-cd-70', brand: 'Honda', engineCc: 70, image: photoUrl('bike-black', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-02', name: 'Honda CG 125', slug: 'honda-cg-125', brand: 'Honda', engineCc: 125, image: photoUrl('bike-city', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-03', name: 'Honda CB 125F', slug: 'honda-cb-125f', brand: 'Honda', engineCc: 125, image: photoUrl('bike-street', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-04', name: 'Honda Pridor', slug: 'honda-pridor', brand: 'Honda', engineCc: 100, image: photoUrl('bike-side', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-05', name: 'Yamaha YBR 125', slug: 'yamaha-ybr-125', brand: 'Yamaha', engineCc: 125, image: photoUrl('bike-close', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-06', name: 'Suzuki GD 110', slug: 'suzuki-gd-110', brand: 'Suzuki', engineCc: 110, image: photoUrl('bike-close-2', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-07', name: 'Suzuki GS 150', slug: 'suzuki-gs-150', brand: 'Suzuki', engineCc: 150, image: photoUrl('bikes-parked', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-08', name: 'United 70', slug: 'united-70', brand: 'United', engineCc: 70, image: photoUrl('bike-vintage', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-09', name: 'Road Prince 70', slug: 'road-prince-70', brand: 'Road Prince', engineCc: 70, image: photoUrl('bike-black', 640, 400), fallbackImage: '/motorcycle.svg' },
  { id: 'bike-10', name: 'Super Power 70', slug: 'super-power-70', brand: 'Super Power', engineCc: 70, image: photoUrl('bike-city', 640, 400), fallbackImage: '/motorcycle.svg' },
];

export const bikeBySlug = Object.fromEntries(bikes.map((b) => [b.slug, b]));
export const bikeByName = Object.fromEntries(bikes.map((b) => [b.name, b]));

/** Brand → models, for the "Find Parts for Your Bike" selector. */
export const bikeBrands = Array.from(new Set(bikes.map((b) => b.brand)));
export const bikesByBrand = (brand: string) => bikes.filter((b) => b.brand === brand);
