// Curated real photography sourced from Unsplash, grouped by tool category.
// Each product references a category + index; getProductImage() resolves the actual URL.

const u = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

const POOL = {
  hammers: [
    '1605900009749-b3cdb75ce9c5',
    '1567361809214-b97d828071d9',
    '1595380752980-210b19e81442',
    '1643509963821-563d2ddb0812',
    '1777107508720-5b09f57c711e',
  ],
  screwdrivers: [
    '1729144345962-14ae798ffddd',
    '1641091059144-649f128d23ac',
    '1681292634946-fd55affe0ac3',
    '1567361809214-b97d828071d9',
    '1605900009749-b3cdb75ce9c5',
    '1644893314585-e36c34f7df74',
  ],
  wrenches: [
    '1642096600073-f1f98b869ff7',
    '1708568326307-9d14c6405af6',
    '1681292634946-fd55affe0ac3',
    '1744210492534-74330469a9a8',
    '1641091059144-649f128d23ac',
    '1756030399468-9fa4b1197c37',
    '1530260968894-b9b6fc8f4ccf',
    '1729144345962-14ae798ffddd',
  ],
  drills: [
    '1615974680408-a20e4a345341',
    '1746278925373-c3d823caa6d6',
    '1615974680408-a20e4a345341',
    '1746278925373-c3d823caa6d6',
    '1615974680408-a20e4a345341',
  ],
  pliers: [
    '1687457340782-1176f83e9ea5',
    '1567361809214-b97d828071d9',
    '1605900009749-b3cdb75ce9c5',
    '1708568326307-9d14c6405af6',
    '1641091059144-649f128d23ac',
    '1687457340782-1176f83e9ea5',
  ],
  fasteners: [
    '1655927858183-fe31d5dd1080',
    '1712003752927-d4d14921f96a',
    '1763888450676-f0f7a3987917',
    '1655927858183-fe31d5dd1080',
    '1763888450676-f0f7a3987917',
    '1655927858183-fe31d5dd1080',
    '1712003752927-d4d14921f96a',
  ],
  cutting: [
    '1688397960118-05f25a2c3fba',
    '1593618229012-8aaad1cfefc3',
    '1777107508709-9c7a373c099a',
    '1605900009749-b3cdb75ce9c5',
    '1670845494093-0bd5704e1e0d',
    '1687457340782-1176f83e9ea5',
  ],
  measuring: [
    '1557185602-2bee13540a9c',
    '1615974679958-e095f0617925',
    '1615974679600-665fb9468c4f',
    '1777107508845-f79beaae4c86',
    '1671106642091-086838dc8ab2',
  ],
  sockets: ['1681292634946-fd55affe0ac3', '1708568326307-9d14c6405af6', '1729144345962-14ae798ffddd'],
  workshop: [
    '1467139840664-96b244a66825',
    '1529926542502-77aceca00aa3',
    '1729792706191-08f3ed158650',
    '1630096718482-34dd25f8968b',
  ],
  handtools: ['1708568326307-9d14c6405af6', '1670845494093-0bd5704e1e0d', '1674557934421-5a9908ac27db'],
  hardware: [
    '1584677191047-38f48d0db64e',
    '1672033282598-662d5a93b9f4',
    '1582586131076-6c308a437385',
    '1702625835613-ad7fa6bb5194',
    '1671040690726-b78261eff126',
  ],
}

export const getProductImage = (product, w = 1200) => {
  const pool = POOL[product.imageKey] || POOL.hardware
  const id = pool[(product.imageIndex ?? 0) % pool.length]
  return u(id, w)
}

const CATEGORY_IMAGE = {
  hammers: u('1605900009749-b3cdb75ce9c5'),
  screwdrivers: u('1729144345962-14ae798ffddd'),
  wrenches: u('1642096600073-f1f98b869ff7'),
  drills: u('1615974680408-a20e4a345341'),
  fasteners: u('1763888450676-f0f7a3987917'),
  pliers: u('1687457340782-1176f83e9ea5'),
  measuring: u('1615974679600-665fb9468c4f'),
  cutting: u('1688397960118-05f25a2c3fba'),
  sockets: u('1681292634946-fd55affe0ac3'),
  workshop: u('1467139840664-96b244a66825'),
  'hand-tools': u('1674557934421-5a9908ac27db'),
  hardware: u('1584677191047-38f48d0db64e'),
}

export const getCategoryImage = (categoryId) => CATEGORY_IMAGE[categoryId] || CATEGORY_IMAGE.hardware

export const HERO_IMAGE = u('1426927308491-6380b6a9936f', 1920)
export const HERO_IMAGE_ALT = u('1613206485381-b028e578e791', 1920)
export const ABOUT_IMAGE = u('1519520104014-df63821cb6f9', 1000)
export const WORKSHOP_WALL_IMAGE = u('1670645948617-f06d0d4a92d0', 1600)
