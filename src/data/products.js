// Product catalog for Hand Tools Trading Corporation.
// `imageKey` + `imageIndex` resolve to a real photo via getProductImage() in ./images.js

let uid = 0
const p = (item) => ({ id: `p${++uid}`, rating: 4.5, reviewCount: 20, badge: null, availability: 'In Stock', ...item })

export const PRODUCTS = [
  // ---------------- Hammers ----------------
  p({
    name: 'Claw Hammer 250g',
    category: 'hammers',
    price: 650,
    imageKey: 'hammers',
    imageIndex: 0,
    shortDescription: 'Lightweight steel claw hammer with a comfortable fibreglass grip.',
    description:
      'A versatile 250g claw hammer built for everyday carpentry and household repairs. The drop-forged steel head resists chipping, while the shock-absorbing fibreglass handle reduces fatigue on long jobs.',
    specs: [
      { label: 'Head Weight', value: '250g' },
      { label: 'Handle', value: 'Fibreglass, non-slip grip' },
      { label: 'Head Material', value: 'Drop-forged carbon steel' },
      { label: 'Use', value: 'Household & light carpentry' },
    ],
    rating: 4.6,
    reviewCount: 84,
    badge: 'Popular',
  }),
  p({
    name: 'Claw Hammer 500g',
    category: 'hammers',
    price: 950,
    imageKey: 'hammers',
    imageIndex: 1,
    shortDescription: 'Heavier claw hammer for framing, decking and general construction.',
    description:
      'A 500g claw hammer suited to tougher jobs where more driving force is needed. Polished striking face and a curved claw make nail removal quick and clean.',
    specs: [
      { label: 'Head Weight', value: '500g' },
      { label: 'Handle', value: 'Fibreglass, non-slip grip' },
      { label: 'Head Material', value: 'Drop-forged carbon steel' },
      { label: 'Use', value: 'Carpentry & construction' },
    ],
    rating: 4.7,
    reviewCount: 61,
  }),
  p({
    name: 'Ball Peen Hammer 500g',
    category: 'hammers',
    price: 1050,
    imageKey: 'hammers',
    imageIndex: 2,
    shortDescription: 'Engineer’s hammer for metalworking, shaping and rivet work.',
    description:
      'The rounded peen makes this hammer ideal for shaping metal, rounding edges, and setting rivets in workshop and mechanical work. Hardened head keeps its edge under repeated use.',
    specs: [
      { label: 'Head Weight', value: '500g' },
      { label: 'Handle', value: 'Hardwood shaft' },
      { label: 'Head Material', value: 'Hardened steel' },
      { label: 'Use', value: 'Metalworking & fabrication' },
    ],
  }),
  p({
    name: 'Ball Peen Hammer 1kg',
    category: 'hammers',
    price: 1650,
    imageKey: 'hammers',
    imageIndex: 2,
    shortDescription: 'Heavy-duty ball peen hammer for demanding workshop tasks.',
    description:
      'A 1kg ball peen hammer for tougher metalwork, chiselling and punch work. Balanced head-to-handle ratio gives controlled, accurate strikes.',
    specs: [
      { label: 'Head Weight', value: '1kg' },
      { label: 'Handle', value: 'Hardwood shaft' },
      { label: 'Head Material', value: 'Hardened steel' },
      { label: 'Use', value: 'Heavy metalworking' },
    ],
  }),
  p({
    name: 'Sledge Hammer 2kg',
    category: 'hammers',
    price: 2200,
    imageKey: 'hammers',
    imageIndex: 3,
    shortDescription: 'Compact 2kg sledge hammer for demolition and driving stakes.',
    description:
      'Built for demolition, breaking masonry and driving stakes, this 2kg sledge hammer pairs a hardened steel head with a reinforced fibreglass handle for repeated heavy impact.',
    specs: [
      { label: 'Head Weight', value: '2kg' },
      { label: 'Handle', value: 'Reinforced fibreglass' },
      { label: 'Head Material', value: 'Forged steel' },
      { label: 'Use', value: 'Demolition & heavy driving' },
    ],
    rating: 4.4,
    reviewCount: 27,
  }),
  p({
    name: 'Rubber Mallet',
    category: 'hammers',
    price: 750,
    imageKey: 'hammers',
    imageIndex: 4,
    shortDescription: 'Non-marring rubber mallet for tiling, woodworking and assembly.',
    description:
      'A soft-face rubber mallet that drives components into place without damaging finished surfaces — ideal for flooring, tiling, upholstery and flat-pack assembly.',
    specs: [
      { label: 'Head Weight', value: '450g' },
      { label: 'Handle', value: 'Wooden shaft' },
      { label: 'Head Material', value: 'Vulcanised rubber' },
      { label: 'Use', value: 'Tiling & assembly work' },
    ],
  }),

  // ---------------- Screwdrivers ----------------
  p({
    name: 'Phillips Screwdriver Set',
    category: 'screwdrivers',
    price: 850,
    imageKey: 'screwdrivers',
    imageIndex: 0,
    shortDescription: '6-piece Phillips screwdriver set in assorted sizes.',
    description:
      'A complete set of Phillips (cross-head) screwdrivers covering the most common screw sizes for household, electronics and general repair work. Chrome-vanadium tips resist wear and rounding.',
    specs: [
      { label: 'Pieces', value: '6' },
      { label: 'Tip Type', value: 'Phillips (PH1–PH3)' },
      { label: 'Handle', value: 'Soft-grip PVC' },
      { label: 'Material', value: 'Chrome-vanadium steel' },
    ],
    rating: 4.6,
    reviewCount: 112,
    badge: 'Popular',
  }),
  p({
    name: 'Flat Head Screwdriver Set',
    category: 'screwdrivers',
    price: 750,
    imageKey: 'screwdrivers',
    imageIndex: 1,
    shortDescription: '6-piece slotted screwdriver set for general purpose use.',
    description:
      'A reliable set of flat-head screwdrivers in graduated sizes for everyday household, electrical and mechanical tasks. Magnetised tips help hold small screws in place.',
    specs: [
      { label: 'Pieces', value: '6' },
      { label: 'Tip Type', value: 'Slotted (3–8mm)' },
      { label: 'Handle', value: 'Soft-grip PVC' },
      { label: 'Material', value: 'Chrome-vanadium steel' },
    ],
  }),
  p({
    name: 'Precision Screwdriver Set',
    category: 'screwdrivers',
    price: 650,
    imageKey: 'screwdrivers',
    imageIndex: 2,
    shortDescription: '24-in-1 precision set for electronics and small repairs.',
    description:
      'A compact 24-piece precision screwdriver kit designed for mobile phones, laptops, watches and electronics repair, with interchangeable bits stored in a slim case.',
    specs: [
      { label: 'Pieces', value: '24' },
      { label: 'Tip Types', value: 'Phillips, slotted, Torx, pentalobe' },
      { label: 'Case', value: 'Compact carry case' },
      { label: 'Use', value: 'Electronics & precision repair' },
    ],
    badge: 'New',
  }),
  p({
    name: 'Heavy Duty Screwdriver Set',
    category: 'screwdrivers',
    price: 1450,
    imageKey: 'screwdrivers',
    imageIndex: 3,
    shortDescription: '8-piece heavy duty set for demanding trade use.',
    description:
      'Built for tradesmen, this heavy duty set combines go-through hardened shafts with impact-resistant handles that can take a hammer blow when extra force is needed.',
    specs: [
      { label: 'Pieces', value: '8' },
      { label: 'Shaft', value: 'Go-through hardened steel' },
      { label: 'Handle', value: 'Impact-resistant, hammer-cap' },
      { label: 'Use', value: 'Professional trade use' },
    ],
  }),
  p({
    name: 'Magnetic Screwdriver Set',
    category: 'screwdrivers',
    price: 1200,
    imageKey: 'screwdrivers',
    imageIndex: 4,
    shortDescription: 'Magnetised-tip screwdriver set that keeps screws secure.',
    description:
      'Every tip in this set is magnetised to hold screws firmly in awkward or overhead positions, speeding up assembly and repair jobs around the workshop or home.',
    specs: [
      { label: 'Pieces', value: '10' },
      { label: 'Tip Types', value: 'Phillips & slotted, magnetised' },
      { label: 'Handle', value: 'Soft-grip PVC' },
      { label: 'Material', value: 'Chrome-vanadium steel' },
    ],
  }),
  p({
    name: 'Insulated Screwdriver Set',
    category: 'screwdrivers',
    price: 1650,
    imageKey: 'screwdrivers',
    imageIndex: 5,
    shortDescription: 'VDE-style insulated screwdrivers for electrical work.',
    description:
      'A screwdriver set with 1000V-rated insulated handles for safe work near live electrical circuits. A must-have for electricians and maintenance technicians.',
    specs: [
      { label: 'Pieces', value: '7' },
      { label: 'Insulation Rating', value: '1000V' },
      { label: 'Tip Types', value: 'Phillips & slotted' },
      { label: 'Use', value: 'Electrical & panel work' },
    ],
    rating: 4.8,
    reviewCount: 39,
  }),

  // ---------------- Wrenches & Spanners ----------------
  p({
    name: 'Adjustable Wrench 8"',
    category: 'wrenches',
    price: 750,
    imageKey: 'wrenches',
    imageIndex: 0,
    shortDescription: '8-inch adjustable wrench with a smooth worm-gear jaw.',
    description:
      'A compact adjustable wrench for plumbing, automotive and general workshop use. The precision worm-gear mechanism adjusts smoothly and grips securely.',
    specs: [
      { label: 'Length', value: '8 inch (200mm)' },
      { label: 'Jaw Capacity', value: 'Up to 25mm' },
      { label: 'Material', value: 'Drop-forged chrome vanadium' },
      { label: 'Finish', value: 'Chrome plated' },
    ],
    rating: 4.6,
    reviewCount: 96,
    badge: 'Popular',
  }),
  p({
    name: 'Adjustable Wrench 12"',
    category: 'wrenches',
    price: 1150,
    imageKey: 'wrenches',
    imageIndex: 1,
    shortDescription: '12-inch adjustable wrench for larger nuts and bolts.',
    description:
      'A longer adjustable wrench that provides extra leverage for larger fasteners in plumbing, machinery and heavy fixtures.',
    specs: [
      { label: 'Length', value: '12 inch (300mm)' },
      { label: 'Jaw Capacity', value: 'Up to 35mm' },
      { label: 'Material', value: 'Drop-forged chrome vanadium' },
      { label: 'Finish', value: 'Chrome plated' },
    ],
  }),
  p({
    name: 'Combination Spanner Set',
    category: 'wrenches',
    price: 2200,
    imageKey: 'wrenches',
    imageIndex: 2,
    shortDescription: '8-piece combination spanner set, metric sizes.',
    description:
      'A full set of combination spanners with an open end on one side and a ring end on the other, covering the most common metric bolt sizes used in automotive and workshop repairs.',
    specs: [
      { label: 'Pieces', value: '8 (8–19mm)' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Finish', value: 'Mirror polish' },
      { label: 'Case', value: 'Storage roll included' },
    ],
    rating: 4.7,
    reviewCount: 58,
  }),
  p({
    name: 'Ring Spanner Set',
    category: 'wrenches',
    price: 1850,
    imageKey: 'wrenches',
    imageIndex: 3,
    shortDescription: 'Double-ended ring spanner set for tight spaces.',
    description:
      'Offset ring ends grip fasteners on all six points, reducing the risk of rounding — ideal for tight engine bays and machinery where an open wrench can slip.',
    specs: [
      { label: 'Pieces', value: '6' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Ends', value: 'Offset ring, both ends' },
      { label: 'Finish', value: 'Chrome plated' },
    ],
  }),
  p({
    name: 'Open End Spanner Set',
    category: 'wrenches',
    price: 1750,
    imageKey: 'wrenches',
    imageIndex: 4,
    shortDescription: 'Double open-end spanner set for quick fastening.',
    description:
      'A set of open-end spanners for fast turning on nuts and bolts where a ring spanner cannot be slipped over the fastener.',
    specs: [
      { label: 'Pieces', value: '8' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Ends', value: 'Open, both ends' },
      { label: 'Finish', value: 'Chrome plated' },
    ],
  }),
  p({
    name: 'Pipe Wrench 12"',
    category: 'wrenches',
    price: 1450,
    imageKey: 'wrenches',
    imageIndex: 5,
    shortDescription: '12-inch pipe wrench with serrated self-tightening jaws.',
    description:
      'A heavy cast-iron pipe wrench for gripping and turning pipes and round stock. Serrated jaws tighten their grip automatically as torque increases.',
    specs: [
      { label: 'Length', value: '12 inch (300mm)' },
      { label: 'Pipe Capacity', value: 'Up to 38mm' },
      { label: 'Material', value: 'Heat-treated cast iron' },
      { label: 'Use', value: 'Plumbing & pipe fitting' },
    ],
  }),
  p({
    name: 'Pipe Wrench 18"',
    category: 'wrenches',
    price: 2200,
    imageKey: 'wrenches',
    imageIndex: 6,
    shortDescription: '18-inch heavy duty pipe wrench for larger pipework.',
    description:
      'Extra length gives greater leverage on larger diameter pipe and fittings, making this a staple for plumbers and maintenance crews.',
    specs: [
      { label: 'Length', value: '18 inch (450mm)' },
      { label: 'Pipe Capacity', value: 'Up to 60mm' },
      { label: 'Material', value: 'Heat-treated cast iron' },
      { label: 'Use', value: 'Heavy-duty plumbing' },
    ],
  }),
  p({
    name: 'Allen Key Set',
    category: 'wrenches',
    price: 650,
    imageKey: 'wrenches',
    imageIndex: 7,
    shortDescription: '9-piece hex (Allen) key set, metric sizes.',
    description:
      'A folding hex key set covering common metric sizes for furniture assembly, bicycles, machinery and electronics. Compact and easy to carry.',
    specs: [
      { label: 'Pieces', value: '9 (1.5–10mm)' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Format', value: 'Folding holder' },
      { label: 'Use', value: 'Furniture, bicycles & machinery' },
    ],
    rating: 4.5,
    reviewCount: 44,
  }),

  // ---------------- Drill Machines ----------------
  p({
    name: 'Electric Drill Machine 10mm',
    category: 'drills',
    price: 3500,
    imageKey: 'drills',
    imageIndex: 0,
    shortDescription: 'Corded 10mm drill for household and light-duty drilling.',
    description:
      'A dependable corded electric drill with a 10mm keyed chuck, variable speed trigger and reverse function — well suited to drilling wood, metal and light masonry around the home.',
    specs: [
      { label: 'Chuck Size', value: '10mm' },
      { label: 'Power', value: '450W' },
      { label: 'Speed', value: 'Variable, 0–2800 RPM' },
      { label: 'Cable', value: '2m power cord' },
    ],
    rating: 4.5,
    reviewCount: 71,
  }),
  p({
    name: 'Electric Drill Machine 13mm',
    category: 'drills',
    price: 4500,
    imageKey: 'drills',
    imageIndex: 1,
    shortDescription: 'Corded 13mm drill with hammer function for masonry.',
    description:
      'A more powerful 13mm chuck drill with a hammer-drill setting for concrete and brick, alongside standard rotary drilling for wood and steel.',
    specs: [
      { label: 'Chuck Size', value: '13mm' },
      { label: 'Power', value: '650W' },
      { label: 'Function', value: 'Drill / hammer-drill' },
      { label: 'Speed', value: 'Variable, 0–3000 RPM' },
    ],
    badge: 'Popular',
  }),
  p({
    name: 'Heavy Duty Drill Machine',
    category: 'drills',
    price: 5800,
    imageKey: 'drills',
    imageIndex: 2,
    shortDescription: 'Industrial-grade drill for continuous professional use.',
    description:
      'Built for tradesmen and workshops, this heavy duty drill handles extended continuous use with a robust motor, metal gear housing and side handle for control.',
    specs: [
      { label: 'Chuck Size', value: '13mm' },
      { label: 'Power', value: '850W' },
      { label: 'Housing', value: 'Metal gear box' },
      { label: 'Use', value: 'Professional / industrial' },
    ],
    rating: 4.7,
    reviewCount: 33,
  }),
  p({
    name: 'Cordless Drill Machine',
    category: 'drills',
    price: 6500,
    imageKey: 'drills',
    imageIndex: 3,
    shortDescription: '18V cordless drill/driver with 2 batteries and case.',
    description:
      'A rechargeable 18V cordless drill driver with two lithium-ion batteries, torque-adjust clutch and LED work light — ideal for jobs away from a power socket.',
    specs: [
      { label: 'Voltage', value: '18V lithium-ion' },
      { label: 'Chuck Size', value: '10mm keyless' },
      { label: 'Batteries', value: '2 included' },
      { label: 'Case', value: 'Carry case included' },
    ],
    rating: 4.8,
    reviewCount: 52,
    badge: 'New',
  }),
  p({
    name: 'Mini Electric Drill',
    category: 'drills',
    price: 2800,
    imageKey: 'drills',
    imageIndex: 4,
    shortDescription: 'Compact drill for light DIY and craft drilling tasks.',
    description:
      'A lightweight, compact drill for small household jobs, crafts, hobby work and light-duty drilling where a full-size drill is more than needed.',
    specs: [
      { label: 'Chuck Size', value: '6mm' },
      { label: 'Power', value: '250W' },
      { label: 'Weight', value: '0.9kg' },
      { label: 'Use', value: 'DIY & craft work' },
    ],
  }),

  // ---------------- Pliers ----------------
  p({
    name: 'Combination Pliers',
    category: 'pliers',
    price: 650,
    imageKey: 'pliers',
    imageIndex: 0,
    shortDescription: '8-inch combination pliers for gripping, bending and cutting.',
    description:
      'An all-purpose pair of combination pliers with a serrated jaw for gripping, a pipe-grip section and built-in cutting edges — an essential in any toolbox.',
    specs: [
      { label: 'Length', value: '8 inch (200mm)' },
      { label: 'Material', value: 'Drop-forged steel' },
      { label: 'Handle', value: 'Dual-component grip' },
      { label: 'Finish', value: 'Polished head' },
    ],
    rating: 4.6,
    reviewCount: 88,
    badge: 'Popular',
  }),
  p({
    name: 'Long Nose Pliers',
    category: 'pliers',
    price: 600,
    imageKey: 'pliers',
    imageIndex: 1,
    shortDescription: 'Slim-jaw pliers for reaching into tight spaces.',
    description:
      'Long, tapered jaws let you grip, bend and position wire and small parts in confined areas — popular for electrical and electronics work.',
    specs: [
      { label: 'Length', value: '6 inch (150mm)' },
      { label: 'Material', value: 'Drop-forged steel' },
      { label: 'Handle', value: 'Dual-component grip' },
      { label: 'Use', value: 'Electrical & wirework' },
    ],
  }),
  p({
    name: 'Side Cutting Pliers',
    category: 'pliers',
    price: 700,
    imageKey: 'pliers',
    imageIndex: 2,
    shortDescription: 'Diagonal cutting pliers for wire and cable trimming.',
    description:
      'Hardened cutting edges make quick, clean cuts through copper wire, cable ties and light-gauge steel wire.',
    specs: [
      { label: 'Length', value: '6 inch (150mm)' },
      { label: 'Material', value: 'Hardened carbon steel' },
      { label: 'Handle', value: 'Dual-component grip' },
      { label: 'Use', value: 'Wire & cable cutting' },
    ],
  }),
  p({
    name: 'Locking Pliers',
    category: 'pliers',
    price: 950,
    imageKey: 'pliers',
    imageIndex: 3,
    shortDescription: 'Vice-grip style locking pliers with adjustable jaw tension.',
    description:
      'These locking pliers clamp onto a workpiece and stay locked, freeing your hands — useful for welding, repairs and holding stubborn fasteners.',
    specs: [
      { label: 'Length', value: '10 inch (250mm)' },
      { label: 'Material', value: 'Heat-treated alloy steel' },
      { label: 'Adjustment', value: 'Screw-adjustable jaw' },
      { label: 'Use', value: 'Clamping & welding work' },
    ],
  }),
  p({
    name: 'Water Pump Pliers',
    category: 'pliers',
    price: 850,
    imageKey: 'pliers',
    imageIndex: 4,
    shortDescription: 'Multi-position pliers for plumbing and pipe work.',
    description:
      'A groove-joint design gives multiple jaw-width settings for gripping pipes, nuts and fittings of varying sizes — a plumber’s staple.',
    specs: [
      { label: 'Length', value: '10 inch (250mm)' },
      { label: 'Material', value: 'Drop-forged steel' },
      { label: 'Adjustment', value: 'Multi-position groove joint' },
      { label: 'Use', value: 'Plumbing & pipe fitting' },
    ],
  }),
  p({
    name: 'Circlip Pliers Set',
    category: 'pliers',
    price: 1250,
    imageKey: 'pliers',
    imageIndex: 5,
    shortDescription: '4-in-1 circlip plier set with interchangeable tips.',
    description:
      'A specialised set for installing and removing internal and external circlips (snap rings), commonly used in automotive and mechanical repair.',
    specs: [
      { label: 'Pieces', value: '4 interchangeable tips' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Type', value: 'Internal & external' },
      { label: 'Use', value: 'Automotive & mechanical repair' },
    ],
  }),

  // ---------------- Screws & Fasteners ----------------
  p({
    name: 'Wood Screw Assortment',
    category: 'fasteners',
    price: 450,
    imageKey: 'fasteners',
    imageIndex: 0,
    shortDescription: 'Assorted wood screws in multiple lengths and gauges.',
    description:
      'A handy assortment box of wood screws in commonly used lengths and gauges, sorted for easy access — ideal for furniture, carpentry and home repairs.',
    specs: [
      { label: 'Contents', value: 'Assorted sizes, 200+ pieces' },
      { label: 'Material', value: 'Zinc-plated steel' },
      { label: 'Head Type', value: 'Countersunk, Phillips drive' },
      { label: 'Storage', value: 'Compartment box' },
    ],
    rating: 4.4,
    reviewCount: 37,
  }),
  p({
    name: 'Self-Tapping Screw Set',
    category: 'fasteners',
    price: 500,
    imageKey: 'fasteners',
    imageIndex: 1,
    shortDescription: 'Self-tapping screws for sheet metal and plastic.',
    description:
      'Sharp-pointed self-tapping screws that cut their own thread into sheet metal, plastic and light materials without pre-drilling.',
    specs: [
      { label: 'Contents', value: 'Assorted sizes, 150+ pieces' },
      { label: 'Material', value: 'Hardened steel, zinc-plated' },
      { label: 'Point Type', value: 'Self-tapping' },
      { label: 'Storage', value: 'Compartment box' },
    ],
  }),
  p({
    name: 'Machine Screw Set',
    category: 'fasteners',
    price: 550,
    imageKey: 'fasteners',
    imageIndex: 2,
    shortDescription: 'Machine screws with matching nuts, assorted sizes.',
    description:
      'A set of machine screws with matching nuts for mounting electronics, panels and mechanical assemblies with a consistent, even thread.',
    specs: [
      { label: 'Contents', value: 'Assorted M3–M6, 180+ pieces' },
      { label: 'Material', value: 'Stainless steel' },
      { label: 'Head Type', value: 'Pan head, Phillips drive' },
      { label: 'Storage', value: 'Compartment box' },
    ],
  }),
  p({
    name: 'Wall Plug & Screw Set',
    category: 'fasteners',
    price: 400,
    imageKey: 'fasteners',
    imageIndex: 3,
    shortDescription: 'Wall plugs paired with screws for fixing into masonry.',
    description:
      'Nylon wall plugs matched with screws for mounting shelves, frames and fixtures securely into brick, block and concrete walls.',
    specs: [
      { label: 'Contents', value: 'Assorted sizes, 100+ sets' },
      { label: 'Plug Material', value: 'Nylon' },
      { label: 'Screw Material', value: 'Zinc-plated steel' },
      { label: 'Use', value: 'Masonry wall fixing' },
    ],
  }),
  p({
    name: 'Hex Bolt Set',
    category: 'fasteners',
    price: 650,
    imageKey: 'fasteners',
    imageIndex: 4,
    shortDescription: 'Hex head bolts with nuts and washers, assorted sizes.',
    description:
      'A boxed set of hex bolts, nuts and washers for structural fixing, machinery assembly and general workshop use.',
    specs: [
      { label: 'Contents', value: 'Assorted M6–M10, 120+ pieces' },
      { label: 'Material', value: 'Carbon steel, zinc-plated' },
      { label: 'Includes', value: 'Bolts, nuts & washers' },
      { label: 'Storage', value: 'Compartment box' },
    ],
  }),
  p({
    name: 'Nut & Bolt Assortment',
    category: 'fasteners',
    price: 950,
    imageKey: 'fasteners',
    imageIndex: 5,
    shortDescription: 'Large mixed assortment of nuts and bolts for the workshop.',
    description:
      'A generous mixed assortment covering the most-used nut and bolt sizes, keeping your workshop stocked and reducing hardware-store runs.',
    specs: [
      { label: 'Contents', value: 'Assorted sizes, 300+ pieces' },
      { label: 'Material', value: 'Carbon steel, zinc-plated' },
      { label: 'Includes', value: 'Nuts, bolts & washers' },
      { label: 'Storage', value: 'Multi-compartment case' },
    ],
    rating: 4.5,
    reviewCount: 29,
  }),
  p({
    name: 'Stainless Steel Screw Set',
    category: 'fasteners',
    price: 850,
    imageKey: 'fasteners',
    imageIndex: 6,
    shortDescription: 'Corrosion-resistant stainless screws for outdoor use.',
    description:
      'Stainless steel construction resists rust and corrosion, making this set well suited to outdoor furniture, marine fittings and humid environments.',
    specs: [
      { label: 'Contents', value: 'Assorted sizes, 150+ pieces' },
      { label: 'Material', value: '304 stainless steel' },
      { label: 'Head Type', value: 'Countersunk, Phillips drive' },
      { label: 'Use', value: 'Outdoor & marine-grade fixing' },
    ],
  }),

  // ---------------- Cutting Tools ----------------
  p({
    name: 'Utility Knife',
    category: 'cutting',
    price: 350,
    imageKey: 'cutting',
    imageIndex: 0,
    shortDescription: 'Retractable utility knife with snap-off blade.',
    description:
      'A sturdy retractable utility knife for cutting cardboard, packaging, flooring and general materials, with a snap-off blade for a fresh edge every time.',
    specs: [
      { label: 'Blade Type', value: 'Snap-off, 18mm' },
      { label: 'Body', value: 'ABS plastic with rubber grip' },
      { label: 'Lock', value: 'Blade lock slider' },
      { label: 'Use', value: 'General purpose cutting' },
    ],
    rating: 4.5,
    reviewCount: 66,
  }),
  p({
    name: 'Heavy Duty Cutter',
    category: 'cutting',
    price: 550,
    imageKey: 'cutting',
    imageIndex: 1,
    shortDescription: 'Reinforced heavy duty cutter for thick materials.',
    description:
      'A reinforced-body cutting knife for tougher materials such as thick cardboard, carpet, rope and rubber sheeting.',
    specs: [
      { label: 'Blade Type', value: 'Snap-off, 25mm' },
      { label: 'Body', value: 'Metal-reinforced housing' },
      { label: 'Lock', value: 'Blade lock slider' },
      { label: 'Use', value: 'Heavy duty cutting' },
    ],
  }),
  p({
    name: 'Hacksaw Frame',
    category: 'cutting',
    price: 650,
    imageKey: 'cutting',
    imageIndex: 2,
    shortDescription: 'Adjustable hacksaw frame for metal and PVC cutting.',
    description:
      'A tubular-frame hacksaw with tool-free blade tensioning and an adjustable frame that fits both 10" and 12" blades — a workshop essential.',
    specs: [
      { label: 'Frame', value: 'Adjustable tubular steel' },
      { label: 'Blade Length', value: '10" / 12" compatible' },
      { label: 'Handle', value: 'Soft-grip pistol handle' },
      { label: 'Use', value: 'Metal & PVC cutting' },
    ],
  }),
  p({
    name: 'Hacksaw Blade Pack',
    category: 'cutting',
    price: 300,
    imageKey: 'cutting',
    imageIndex: 3,
    shortDescription: 'Pack of 10 replacement hacksaw blades.',
    description:
      'A 10-pack of high-carbon steel hacksaw blades for clean, accurate cuts through metal pipe, rod and sheet.',
    specs: [
      { label: 'Pack Size', value: '10 blades' },
      { label: 'Length', value: '12 inch (300mm)' },
      { label: 'Material', value: 'High-carbon steel' },
      { label: 'Teeth', value: '24 TPI' },
    ],
  }),
  p({
    name: 'Metal Cutting Blade Set',
    category: 'cutting',
    price: 950,
    imageKey: 'cutting',
    imageIndex: 4,
    shortDescription: 'Abrasive cutting discs for angle grinders, assorted sizes.',
    description:
      'A set of abrasive metal-cutting discs sized for standard angle grinders — for cutting steel bar, sheet and rod cleanly and quickly.',
    specs: [
      { label: 'Pack Size', value: '5 discs' },
      { label: 'Diameter', value: '4 inch (100mm)' },
      { label: 'Material', value: 'Aluminium oxide abrasive' },
      { label: 'Use', value: 'Angle grinder metal cutting' },
    ],
  }),
  p({
    name: 'Wire Cutter',
    category: 'cutting',
    price: 700,
    imageKey: 'cutting',
    imageIndex: 5,
    shortDescription: 'Heavy duty wire cutter for cable and wire work.',
    description:
      'Hardened jaws cut through copper, aluminium and steel wire cleanly, making this a go-to tool for electrical and general wiring work.',
    specs: [
      { label: 'Length', value: '7 inch (180mm)' },
      { label: 'Material', value: 'Hardened carbon steel' },
      { label: 'Handle', value: 'Dual-component grip' },
      { label: 'Use', value: 'Electrical & wire work' },
    ],
  }),

  // ---------------- Measuring Tools ----------------
  p({
    name: 'Measuring Tape 5m',
    category: 'measuring',
    price: 450,
    imageKey: 'measuring',
    imageIndex: 0,
    shortDescription: '5-metre steel measuring tape with locking mechanism.',
    description:
      'A pocket-sized steel tape measure with a magnetic hook, blade lock and easy-to-read markings — the everyday tool for site and household measuring.',
    specs: [
      { label: 'Length', value: '5 metres' },
      { label: 'Blade Width', value: '19mm' },
      { label: 'Case', value: 'Rubber-coated ABS' },
      { label: 'Features', value: 'Auto-lock, belt clip' },
    ],
    rating: 4.6,
    reviewCount: 103,
    badge: 'Popular',
  }),
  p({
    name: 'Measuring Tape 7.5m',
    category: 'measuring',
    price: 650,
    imageKey: 'measuring',
    imageIndex: 1,
    shortDescription: '7.5-metre steel measuring tape for site work.',
    description:
      'A longer 7.5m tape measure for construction and site work, with a wide blade that stands out further without buckling.',
    specs: [
      { label: 'Length', value: '7.5 metres' },
      { label: 'Blade Width', value: '25mm' },
      { label: 'Case', value: 'Rubber-coated ABS' },
      { label: 'Features', value: 'Auto-lock, belt clip' },
    ],
  }),
  p({
    name: 'Steel Ruler',
    category: 'measuring',
    price: 300,
    imageKey: 'measuring',
    imageIndex: 2,
    shortDescription: '30cm stainless steel ruler with dual scale.',
    description:
      'A rigid stainless steel ruler with clearly etched metric and imperial scales — useful for precise marking, cutting guides and drafting.',
    specs: [
      { label: 'Length', value: '30cm / 12 inch' },
      { label: 'Material', value: 'Stainless steel' },
      { label: 'Scale', value: 'Metric & imperial' },
      { label: 'Use', value: 'Marking & drafting' },
    ],
  }),
  p({
    name: 'Spirit Level',
    category: 'measuring',
    price: 850,
    imageKey: 'measuring',
    imageIndex: 3,
    shortDescription: '60cm aluminium spirit level with 3 vials.',
    description:
      'An aluminium-bodied spirit level with horizontal, vertical and 45-degree vials for accurate levelling in construction, tiling and shelving.',
    specs: [
      { label: 'Length', value: '60cm (24 inch)' },
      { label: 'Body', value: 'Extruded aluminium' },
      { label: 'Vials', value: '3 (horizontal, vertical, 45°)' },
      { label: 'Accuracy', value: '±0.5mm/m' },
    ],
  }),
  p({
    name: 'Digital Vernier Caliper',
    category: 'measuring',
    price: 2200,
    imageKey: 'measuring',
    imageIndex: 4,
    shortDescription: 'Digital caliper for precise internal/external measurement.',
    description:
      'A digital vernier caliper with an LCD readout for fast, accurate internal, external, depth and step measurements — popular with machinists and engineers.',
    specs: [
      { label: 'Range', value: '0–150mm' },
      { label: 'Resolution', value: '0.01mm' },
      { label: 'Display', value: 'LCD, mm/inch switchable' },
      { label: 'Material', value: 'Stainless steel' },
    ],
    rating: 4.7,
    reviewCount: 41,
    badge: 'New',
  }),

  // ---------------- Sockets ----------------
  p({
    name: 'Socket Wrench Set',
    category: 'sockets',
    price: 3500,
    imageKey: 'sockets',
    imageIndex: 0,
    shortDescription: '46-piece socket wrench set with ratchet and case.',
    description:
      'A comprehensive socket set covering metric sockets, extension bars, a ratchet handle and accessories, organised in a durable moulded case.',
    specs: [
      { label: 'Pieces', value: '46' },
      { label: 'Drive Size', value: '1/4" & 1/2"' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Case', value: 'Blow-moulded storage case' },
    ],
    rating: 4.7,
    reviewCount: 74,
    badge: 'Popular',
  }),
  p({
    name: 'Ratchet Handle',
    category: 'sockets',
    price: 1200,
    imageKey: 'sockets',
    imageIndex: 1,
    shortDescription: 'Quick-release reversible ratchet handle, 1/2" drive.',
    description:
      'A durable reversible ratchet handle with a fine-tooth gear for turning in tight spaces and a quick-release button for fast socket changes.',
    specs: [
      { label: 'Drive Size', value: '1/2 inch' },
      { label: 'Teeth', value: '72-tooth gear' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Features', value: 'Quick-release, reversible' },
    ],
  }),
  p({
    name: 'Hex Socket Set',
    category: 'sockets',
    price: 2800,
    imageKey: 'sockets',
    imageIndex: 2,
    shortDescription: 'Hex bit socket set for Allen-head fasteners.',
    description:
      'A dedicated hex bit socket set for driving Allen-head bolts and screws with a ratchet or power tool, covering common metric sizes.',
    specs: [
      { label: 'Pieces', value: '14' },
      { label: 'Drive Size', value: '3/8 & 1/2 inch' },
      { label: 'Material', value: 'Chrome vanadium steel' },
      { label: 'Case', value: 'Storage rail included' },
    ],
  }),

  // ---------------- Workshop Tools ----------------
  p({
    name: 'Tool Box',
    category: 'workshop',
    price: 2500,
    imageKey: 'workshop',
    imageIndex: 0,
    shortDescription: 'Durable steel tool box with tray and lock.',
    description:
      'A heavy-gauge steel tool box with a lift-out tray, secure latch closure and comfortable carry handle — keeps tools organised on-site or in the workshop.',
    specs: [
      { label: 'Material', value: 'Powder-coated steel' },
      { label: 'Size', value: '16 inch (400mm)' },
      { label: 'Features', value: 'Lift-out tray, lockable latch' },
      { label: 'Use', value: 'Tool storage & transport' },
    ],
    rating: 4.6,
    reviewCount: 47,
  }),
  p({
    name: 'Combination Tool Set',
    category: 'hardware',
    price: 4500,
    imageKey: 'hardware',
    imageIndex: 0,
    shortDescription: '108-piece household combination tool kit with case.',
    description:
      'An all-in-one household tool kit combining a hammer, pliers, screwdrivers, a wrench, a tape measure and bits — everything a home or small workshop needs to get started.',
    specs: [
      { label: 'Pieces', value: '108' },
      { label: 'Includes', value: 'Hammer, pliers, screwdrivers, bits, wrench' },
      { label: 'Case', value: 'Blow-moulded carry case' },
      { label: 'Use', value: 'Home & general workshop use' },
    ],
    rating: 4.6,
    reviewCount: 55,
    badge: 'Popular',
  }),
  p({
    name: 'Bench Vise',
    category: 'workshop',
    price: 3800,
    imageKey: 'workshop',
    imageIndex: 1,
    shortDescription: '4-inch cast iron bench vise for the workbench.',
    description:
      'A rugged cast iron bench vise that bolts to a workbench for holding material steady during sawing, filing, drilling and assembly work.',
    specs: [
      { label: 'Jaw Width', value: '4 inch (100mm)' },
      { label: 'Material', value: 'Cast iron' },
      { label: 'Jaw Opening', value: 'Up to 100mm' },
      { label: 'Mounting', value: 'Bolt-down base' },
    ],
  }),
  p({
    name: 'Wire Brush Set',
    category: 'hand-tools',
    price: 450,
    imageKey: 'handtools',
    imageIndex: 0,
    shortDescription: '3-piece wire brush set for cleaning and rust removal.',
    description:
      'A set of steel, brass and nylon wire brushes for removing rust, paint and debris from metal, wood and masonry surfaces before finishing.',
    specs: [
      { label: 'Pieces', value: '3 (steel, brass, nylon)' },
      { label: 'Handle', value: 'Moulded plastic grip' },
      { label: 'Use', value: 'Surface cleaning & prep' },
      { label: 'Bristle Rows', value: '4-row' },
    ],
  }),
  p({
    name: 'Metal File Set',
    category: 'hand-tools',
    price: 850,
    imageKey: 'handtools',
    imageIndex: 1,
    shortDescription: '5-piece file set for shaping and smoothing metal.',
    description:
      'A set of flat, round, half-round, triangular and square files for deburring, shaping and finishing metal and wood surfaces.',
    specs: [
      { label: 'Pieces', value: '5 assorted profiles' },
      { label: 'Length', value: '8 inch (200mm)' },
      { label: 'Material', value: 'High-carbon steel' },
      { label: 'Handle', value: 'Comfort-grip handles' },
    ],
  }),
  p({
    name: 'Chisel Set',
    category: 'hand-tools',
    price: 950,
    imageKey: 'handtools',
    imageIndex: 2,
    shortDescription: '4-piece wood chisel set with hardened edges.',
    description:
      'A set of bevel-edge wood chisels with hardened, precision-ground blades for joinery, carving and general woodworking.',
    specs: [
      { label: 'Pieces', value: '4 (6, 12, 19, 25mm)' },
      { label: 'Blade Material', value: 'Hardened chrome steel' },
      { label: 'Handle', value: 'Impact-resistant polypropylene' },
      { label: 'Use', value: 'Woodworking & joinery' },
    ],
  }),
  p({
    name: 'Tool Organizer Box',
    category: 'workshop',
    price: 1800,
    imageKey: 'workshop',
    imageIndex: 2,
    shortDescription: 'Multi-compartment organizer for small parts and tools.',
    description:
      'A stackable, multi-compartment organiser box for sorting screws, fasteners, drill bits and small tools so they stay easy to find.',
    specs: [
      { label: 'Compartments', value: '24 adjustable' },
      { label: 'Material', value: 'Impact-resistant plastic' },
      { label: 'Features', value: 'Stackable, clear lid' },
      { label: 'Use', value: 'Small parts organisation' },
    ],
  }),
  p({
    name: 'Workshop Tool Kit',
    category: 'workshop',
    price: 6500,
    imageKey: 'workshop',
    imageIndex: 3,
    shortDescription: 'Complete 150-piece professional workshop tool kit.',
    description:
      'A full professional-grade kit combining hand tools, sockets, screwdriver bits and accessories in a rugged rolling case — built to equip a workshop from day one.',
    specs: [
      { label: 'Pieces', value: '150' },
      { label: 'Includes', value: 'Sockets, wrenches, pliers, screwdrivers, bits' },
      { label: 'Case', value: 'Rolling storage case' },
      { label: 'Use', value: 'Professional workshop setup' },
    ],
    rating: 4.8,
    reviewCount: 22,
    badge: 'New',
  }),

  // ---------------- Other Hardware ----------------
  p({
    name: 'Electrical Tape Roll',
    category: 'hardware',
    price: 150,
    imageKey: 'hardware',
    imageIndex: 1,
    shortDescription: 'PVC insulating tape for electrical wiring work.',
    description:
      'Flexible PVC electrical tape for insulating and bundling wires, with strong adhesion that holds up in Lahore’s heat and humidity.',
    specs: [
      { label: 'Length', value: '10 metres' },
      { label: 'Material', value: 'PVC, self-adhesive' },
      { label: 'Voltage Rating', value: 'Up to 600V' },
      { label: 'Use', value: 'Electrical insulation' },
    ],
  }),
  p({
    name: 'Safety Gloves (Pair)',
    category: 'hardware',
    price: 350,
    imageKey: 'hardware',
    imageIndex: 2,
    shortDescription: 'Cut-resistant work gloves for workshop safety.',
    description:
      'Durable work gloves with a textured palm for grip and a breathable back — recommended for handling sheet metal, tools and rough materials.',
    specs: [
      { label: 'Material', value: 'Cotton with PU-coated palm' },
      { label: 'Sizes', value: 'M / L / XL' },
      { label: 'Grip', value: 'Textured, non-slip palm' },
      { label: 'Use', value: 'General workshop safety' },
    ],
  }),
  p({
    name: 'Safety Goggles',
    category: 'hardware',
    price: 450,
    imageKey: 'hardware',
    imageIndex: 3,
    shortDescription: 'Impact-resistant safety goggles for eye protection.',
    description:
      'Clear, scratch-resistant polycarbonate lenses with a snug elastic strap protect your eyes from dust, debris and sparks while drilling, grinding or cutting.',
    specs: [
      { label: 'Lens Material', value: 'Polycarbonate' },
      { label: 'Protection', value: 'Impact & dust resistant' },
      { label: 'Fit', value: 'Adjustable elastic strap' },
      { label: 'Use', value: 'Cutting, grinding & drilling' },
    ],
  }),
  p({
    name: 'Extension Cord Reel 10m',
    category: 'hardware',
    price: 1850,
    imageKey: 'hardware',
    imageIndex: 4,
    shortDescription: '10-metre retractable extension cord reel with sockets.',
    description:
      'A retractable extension reel with 10 metres of heavy-duty cable and multiple sockets, ideal for powering tools around the workshop or job site.',
    specs: [
      { label: 'Cable Length', value: '10 metres' },
      { label: 'Sockets', value: '3-way outlet' },
      { label: 'Cable Rating', value: '13A, PVC-sheathed' },
      { label: 'Use', value: 'Workshop & site power' },
    ],
  }),
]

export const getProductById = (id) => PRODUCTS.find((prod) => prod.id === id)

export const getRelatedProducts = (product, count = 4) =>
  PRODUCTS.filter((p2) => p2.category === product.category && p2.id !== product.id).slice(0, count)

export const PRICE_BOUNDS = {
  min: Math.min(...PRODUCTS.map((p2) => p2.price)),
  max: Math.max(...PRODUCTS.map((p2) => p2.price)),
}
