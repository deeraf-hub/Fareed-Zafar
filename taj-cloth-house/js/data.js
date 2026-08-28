/* New Taj Cloth House — product catalog
   Prices, names and stock are demo data for the storefront. Swap PRODUCT_IMAGE_POOL
   and item names with real photography/inventory before going live. */

const RAW_CATALOG = {
  'men-garments': {
    label: "Men's Garments",
    gender: 'men',
    type: 'garments',
    typeLabel: 'Garments',
    priceRange: [1200, 4500],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    items: [
      'Classic Cotton Kurta', 'Slim Fit Formal Shirt', 'Casual Oxford Shirt', 'Denim Jacket',
      'Premium Polo Tee', 'Graphic Print T-Shirt', 'Chino Trousers', 'Wool Blend Sweater',
      'Zip-Up Hoodie', 'Linen Shalwar Kameez', 'Waistcoat Set', 'Cargo Pants',
      'Flannel Check Shirt', 'Bomber Jacket', 'Track Suit Set', 'Nehru Jacket',
      'Striped Henley Tee', 'Formal Blazer', 'Relaxed Fit Jeans', 'Sherwani Set',
      'Round Neck Sweatshirt', 'Embroidered Kameez Shalwar'
    ]
  },
  'women-garments': {
    label: "Women's Garments",
    gender: 'women',
    type: 'garments',
    typeLabel: 'Garments',
    priceRange: [1500, 4800],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    items: [
      'Embroidered Lawn 3-Piece Suit', 'Floral Maxi Dress', 'Silk Blend Kurti', 'Chiffon Party Saree',
      'Palazzo & Top Set', 'Cotton Kaftan', 'Denim Jacket', 'Abaya with Scarf',
      'Anarkali Frock', 'Printed Wide-Leg Pants', 'Casual Crop Top', 'A-Line Midi Dress',
      'Velvet Shawl Set', 'Straight Trouser Suit', 'Off-Shoulder Top', 'Georgette Gown',
      'Cotton Nightwear Set', 'Bridal Sharara Set', 'Long Cardigan', 'Pleated Skirt',
      'Embellished Kurti', 'Winter Poncho'
    ]
  },
  'kids-garments': {
    label: "Kids' Garments",
    gender: 'kids',
    type: 'garments',
    typeLabel: 'Garments',
    priceRange: [600, 2400],
    sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y'],
    items: [
      'Boys Printed T-Shirt', 'Girls Party Frock', 'Kids Denim Dungaree', 'Boys Shalwar Kameez',
      'Girls Floral Dress', 'Unisex Hoodie', 'Kids Cotton Pyjama Set', 'Girls Ruffle Top',
      'Boys Polo Shirt', 'Kids Winter Jacket', 'Girls Net Frock', 'Boys Cargo Shorts',
      'Kids Track Suit', 'Girls Denim Jumpsuit', 'Boys Formal Waistcoat Set', 'Kids Character Sweatshirt',
      'Girls Embroidered Kurti', 'Boys Checked Shirt', 'Kids Rain Jacket', 'Girls Tutu Dress',
      'Boys Sleeveless Sweater', 'Kids Eid Collection Set'
    ]
  },
  'men-footwear': {
    label: "Men's Footwear",
    gender: 'men',
    type: 'footwear',
    typeLabel: 'Footwear',
    priceRange: [1800, 5000],
    sizes: ['40', '41', '42', '43', '44', '45'],
    items: [
      'Genuine Leather Formal Shoes', 'Classic White Sneakers', 'Suede Loafers', 'Traditional Peshawari Chappal',
      'Running Sports Shoes', 'High-Top Basketball Sneakers', 'Brown Derby Shoes', 'Casual Canvas Shoes',
      'Ankle Chelsea Boots', 'Slip-On Moccasins', 'Sports Sandals', 'Monk Strap Shoes',
      'Mesh Training Shoes', 'Leather Sandals', 'Suede Desert Boots', 'Espadrille Slip-Ons',
      'Formal Brogues', 'Trekking Boots', 'Everyday Flip Flops', 'Velvet Khussa'
    ]
  },
  'women-footwear': {
    label: "Women's Footwear",
    gender: 'women',
    type: 'footwear',
    typeLabel: 'Footwear',
    priceRange: [1500, 4800],
    sizes: ['36', '37', '38', '39', '40'],
    items: [
      'Block Heel Sandals', 'Embellished Khussa', 'Casual White Sneakers', 'Strappy Flat Sandals',
      'Wedge Heels', 'Ankle Strap Pumps', 'Comfy Ballet Flats', 'Platform Sneakers',
      'Peep-Toe Heels', 'Suede Ankle Boots', 'Embroidered Mules', 'Espadrille Wedges',
      'Kolhapuri Sandals', 'Party Stilettos', 'Slide Sandals', 'Chunky Sneakers',
      'Velvet Loafers', 'Knee-High Boots', 'Bridal Heels', 'Flat Slip-Ons'
    ]
  },
  'kids-footwear': {
    label: "Kids' Footwear",
    gender: 'kids',
    type: 'footwear',
    typeLabel: 'Footwear',
    priceRange: [700, 2600],
    sizes: ['28', '29', '30', '31', '32', '33', '34', '35'],
    items: [
      'Kids Light-Up Sneakers', 'School Formal Shoes', 'Girls Party Pumps', 'Boys Sports Sandals',
      'Velcro Strap Sneakers', 'Kids Rain Boots', 'Cartoon Print Slip-Ons', 'Toddler Soft Sole Shoes',
      'Boys Casual Loafers', 'Girls Bow Sandals', 'Kids Running Shoes', 'Winter Snow Boots',
      'Kids Flip Flops', 'Girls Glitter Shoes', 'Boys Canvas Sneakers', 'Kids Eid Special Shoes',
      'Toddler Sandals', 'School Sports Shoes', 'Everyday Kids Chappal', 'Baby First-Walk Shoes'
    ]
  }
};

const COLOR_POOL = ['Navy', 'Black', 'White', 'Beige', 'Maroon', 'Charcoal', 'Olive', 'Mustard', 'Blush Pink', 'Sky Blue', 'Grey', 'Ivory'];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* Deterministic pseudo-random in [0,1) so prices/ratings stay stable across reloads. */
function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return ((h >>> 0) % 100000) / 100000;
}

function pick(arr, r) {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function productImage(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/750`;
}

function buildCatalog() {
  const byCategory = [];
  let id = 1;
  Object.entries(RAW_CATALOG).forEach(([catKey, cat]) => {
    const products = [];
    cat.items.forEach((name, idx) => {
      const seed = `${catKey}-${name}`;
      const r1 = seededRandom(seed + 'price');
      const r2 = seededRandom(seed + 'rating');
      const r3 = seededRandom(seed + 'badge');
      const r4 = seededRandom(seed + 'reviews');
      const [min, max] = cat.priceRange;
      const price = Math.round((min + r1 * (max - min)) / 50) * 50;
      const isSale = r3 < 0.22;
      const isNew = !isSale && r3 < 0.4;
      const isBestseller = !isSale && !isNew && r3 < 0.5;
      const originalPrice = isSale ? Math.round((price * (1.15 + r1 * 0.25)) / 50) * 50 : null;

      const colors = [
        pick(COLOR_POOL, r1),
        pick(COLOR_POOL, r2),
        pick(COLOR_POOL, r3)
      ].filter((c, i, a) => a.indexOf(c) === i);

      products.push({
        id: id++,
        slug: slugify(`${name}-${id}`),
        name,
        category: catKey,
        categoryLabel: cat.label,
        gender: cat.gender,
        type: cat.type,
        typeLabel: cat.typeLabel,
        price,
        originalPrice,
        rating: Math.round((3.7 + r2 * 1.3) * 10) / 10,
        reviews: Math.round(8 + r4 * 420),
        sizes: cat.sizes,
        colors: colors.length ? colors : [pick(COLOR_POOL, r1)],
        image: productImage(seed + '-a'),
        image2: productImage(seed + '-b'),
        badge: isSale ? 'Sale' : isNew ? 'New' : isBestseller ? 'Bestseller' : null,
        description: `Premium quality ${name.toLowerCase()} from New Taj Cloth House — crafted for everyday comfort with a modern fit. Available in multiple sizes and colours.`
      });
    });
    byCategory.push(products);
  });

  /* Round-robin merge so the default "All" view mixes categories instead of
     showing one category at a time. */
  const merged = [];
  const maxLen = Math.max(...byCategory.map(arr => arr.length));
  for (let i = 0; i < maxLen; i++) {
    byCategory.forEach(arr => { if (arr[i]) merged.push(arr[i]); });
  }
  return merged;
}

const PRODUCTS = buildCatalog();

const CATEGORY_META = [
  { key: 'men-garments', title: "Men's Garments", filterGender: 'men', filterType: 'garments', img: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=600&q=70&auto=format&fit=crop' },
  { key: 'women-garments', title: "Women's Garments", filterGender: 'women', filterType: 'garments', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=70&auto=format&fit=crop' },
  { key: 'kids-garments', title: "Kids' Garments", filterGender: 'kids', filterType: 'garments', img: 'https://images.unsplash.com/photo-1519238359922-989348752efb?w=600&q=70&auto=format&fit=crop' },
  { key: 'men-footwear', title: "Men's Footwear", filterGender: 'men', filterType: 'footwear', img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=70&auto=format&fit=crop' },
  { key: 'women-footwear', title: "Women's Footwear", filterGender: 'women', filterType: 'footwear', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=70&auto=format&fit=crop' },
  { key: 'kids-footwear', title: "Kids' Footwear", filterGender: 'kids', filterType: 'footwear', img: 'https://images.unsplash.com/photo-1560343776-97e7d202ff0e?w=600&q=70&auto=format&fit=crop' }
];
