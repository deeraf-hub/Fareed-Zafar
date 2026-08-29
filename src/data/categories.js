export const CATEGORIES = [
  {
    id: 'hammers',
    name: 'Hammers',
    description: 'Claw, ball peen, sledge & rubber mallets',
    image: 'hammer-cat',
  },
  {
    id: 'screwdrivers',
    name: 'Screwdrivers',
    description: 'Phillips, flat head, precision & insulated sets',
    image: 'screwdriver-cat',
  },
  {
    id: 'wrenches',
    name: 'Wrenches & Spanners',
    description: 'Adjustable, combination, pipe & Allen keys',
    image: 'wrench-cat',
  },
  {
    id: 'drills',
    name: 'Drill Machines',
    description: 'Corded, cordless & heavy duty drills',
    image: 'drill-cat',
  },
  {
    id: 'fasteners',
    name: 'Screws & Fasteners',
    description: 'Wood screws, bolts, nuts & wall plugs',
    image: 'fasteners-cat',
  },
  {
    id: 'pliers',
    name: 'Pliers',
    description: 'Combination, long nose, locking & cutting',
    image: 'pliers-cat',
  },
  {
    id: 'measuring',
    name: 'Measuring Tools',
    description: 'Tapes, levels, rulers & calipers',
    image: 'measuring-cat',
  },
  {
    id: 'cutting',
    name: 'Cutting Tools',
    description: 'Utility knives, hacksaws & cutters',
    image: 'cutting-cat',
  },
  {
    id: 'sockets',
    name: 'Socket Sets',
    description: 'Ratchets, socket sets & accessories',
    image: 'sockets-cat',
  },
  {
    id: 'workshop',
    name: 'Workshop Tools',
    description: 'Vises, tool boxes & organizers',
    image: 'workshop-cat',
  },
  {
    id: 'hand-tools',
    name: 'Hand Tools',
    description: 'Files, chisels, brushes & general tools',
    image: 'handtools-cat',
  },
  {
    id: 'hardware',
    name: 'Other Hardware',
    description: 'General hardware & workshop accessories',
    image: 'hardware-cat',
  },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
