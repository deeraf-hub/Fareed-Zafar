// Controlled vocabulary for footage tagging, plus the synonym tables used by
// (a) the OFFLINE tagger, which reads hints from the file/folder naming
// convention, and (b) the OFFLINE query parser for `fce search`.
//
// The Claude-powered tagger is instructed to use exactly these values so that
// AI tags and convention tags are interchangeable in the database.

export const SHOT_TYPES = ["extreme_close_up", "close_up", "medium", "wide", "overhead", "pov", "detail"];
export const CAMERA_MOTION = ["static", "pan", "tilt", "push_in", "pull_out", "handheld", "slider", "orbit", "whip"];
export const STAGES = [
  "ingredients", "prep", "cooking", "plating", "hero", "serving", "eating",
  "talking_head", "lifestyle", "meal_prep", "packaging", "workout", "transition",
];
export const ACTIONS = [
  "chopping", "slicing", "dicing", "mincing", "peeling", "grating", "zesting", "cracking",
  "pouring", "drizzling", "stirring", "whisking", "mixing", "blending", "kneading", "rolling",
  "grilling", "searing", "frying", "sauteing", "boiling", "simmering", "baking", "roasting", "air_frying", "steaming",
  "seasoning", "sprinkling", "marinating", "flipping", "tossing", "squeezing", "shaking", "spreading", "layering",
  "plating", "garnishing", "cutting", "biting", "tasting", "weighing", "measuring", "packing", "wrapping",
  "opening", "assembling", "scooping", "shredding", "resting", "lifting", "steam_rising", "sizzling",
];
export const LIGHTING = ["natural", "studio", "mixed", "low"];
export const PROTEINS = [
  "chicken", "beef", "salmon", "shrimp", "tuna", "cod", "eggs", "tofu", "turkey", "lamb", "pork",
  "paneer", "lentils", "chickpeas", "beans", "protein_powder", "greek_yogurt", "cottage_cheese", "tempeh",
];

export const INGREDIENTS = [
  ...PROTEINS,
  "rice", "quinoa", "oats", "pasta", "noodles", "bread", "tortilla", "potato", "sweet_potato", "couscous",
  "broccoli", "spinach", "kale", "avocado", "tomato", "onion", "garlic", "ginger", "chilli", "pepper", "bell_pepper",
  "cucumber", "lettuce", "carrot", "zucchini", "mushroom", "corn", "peas", "edamame", "cabbage", "asparagus",
  "lemon", "lime", "banana", "berries", "blueberries", "strawberries", "apple", "mango", "dates",
  "olive_oil", "butter", "ghee", "coconut_oil", "honey", "maple_syrup", "peanut_butter", "almond_butter",
  "soy_sauce", "sauce", "hot_sauce", "sriracha", "teriyaki", "pesto", "salsa", "tahini", "hummus", "yogurt", "mayo",
  "cheese", "feta", "parmesan", "mozzarella", "milk", "almond_milk", "cream", "coconut_milk",
  "salt", "black_pepper", "paprika", "cumin", "turmeric", "cinnamon", "oregano", "basil", "cilantro", "parsley",
  "herbs", "spices", "sesame", "nuts", "almonds", "walnuts", "chia", "flax", "cocoa", "chocolate", "coffee", "matcha",
  "water", "ice", "broth", "stock", "flour", "sugar", "vanilla", "baking_powder", "vinegar", "wine",
];

// Words → canonical tag. Longer phrases are matched first.
export const SYNONYMS = {
  shot_type: {
    extreme_close_up: ["extreme close-up", "extreme closeup", "extreme close up", "ecu", "super macro"],
    close_up: ["close-up", "closeup", "close up", "cu", "tight shot", "tight", "macro", "detail shot"],
    detail: ["detail", "texture", "insert"],
    overhead: ["overhead", "top-down", "top down", "topdown", "birds eye", "bird's eye", "birdseye", "flat lay", "flatlay", "flat-lay"],
    wide: ["wide", "establishing", "full kitchen", "ws"],
    medium: ["medium", "mid shot", "mid-shot", "midshot", "ms"],
    pov: ["pov", "first person", "first-person"],
  },
  camera_motion: {
    push_in: ["push in", "push-in", "pushin", "dolly in", "zoom in", "punch in"],
    pull_out: ["pull out", "pull-out", "pullout", "dolly out", "zoom out"],
    whip: ["whip pan", "whip"],
    pan: ["panning", "pan"],
    tilt: ["tilting", "tilt"],
    handheld: ["handheld", "hand held", "hand-held"],
    slider: ["slider", "dolly"],
    orbit: ["orbit", "orbiting", "360"],
    static: ["static", "locked off", "locked-off", "lockedoff", "tripod"],
  },
  stage: {
    ingredients: ["ingredients", "ingredient", "mise en place", "pantry", "flat lay", "flatlay", "shopping"],
    prep: ["preparing", "preparation", "prep"],
    cooking: ["cooking", "cook", "on the stove", "in the pan", "stovetop"],
    plating: ["plating", "plate up", "plate-up", "plateup", "assembly", "assembling the bowl"],
    hero: ["hero", "beauty shot", "beauty", "final dish", "money shot", "reveal", "finished dish", "glamour"],
    serving: ["serving", "serve"],
    eating: ["eating", "bite", "tasting", "taste test", "first bite", "reaction"],
    talking_head: ["talking head", "talking-head", "to camera", "piece to camera", "intro", "vlog"],
    lifestyle: ["lifestyle", "kitchen scene", "b-roll", "broll", "morning routine"],
    meal_prep: ["meal prep", "meal-prep", "mealprep", "containers", "batch", "portioning", "tupperware"],
    packaging: ["packaging", "product shot", "unboxing", "supplement"],
    workout: ["workout", "gym", "training", "exercise", "lifting weights", "fitness"],
    transition: ["transition", "whip transition"],
  },
  action: {
    air_frying: ["air fry", "air-fry", "airfry", "air fryer", "airfryer"],
    grilling: ["grilling", "grilled", "grill", "bbq", "barbecue", "char", "grill marks", "griddle"],
    searing: ["searing", "seared", "sear"],
    sauteing: ["sauteing", "sautéing", "saute", "sauté", "pan fry", "pan-fry", "panfry"],
    frying: ["frying", "fried", "deep fry", "fry"],
    boiling: ["boiling", "boil"],
    simmering: ["simmering", "simmer", "reduce", "reducing"],
    baking: ["baking", "baked", "bake", "oven"],
    roasting: ["roasting", "roasted", "roast"],
    steaming: ["steaming", "steamed"],
    chopping: ["chopping", "chop", "knife work", "knifework"],
    slicing: ["slicing", "sliced", "slice"],
    dicing: ["dicing", "diced", "dice"],
    mincing: ["mincing", "minced", "mince"],
    peeling: ["peeling", "peel"],
    grating: ["grating", "grated", "grate"],
    zesting: ["zesting", "zest"],
    cracking: ["cracking", "crack egg", "cracking eggs", "crack"],
    pouring: ["pouring", "pour"],
    drizzling: ["drizzling", "drizzle"],
    stirring: ["stirring", "stir"],
    whisking: ["whisking", "whisk"],
    mixing: ["mixing", "mix", "combine"],
    blending: ["blending", "blender", "blend"],
    kneading: ["kneading", "knead"],
    rolling: ["rolling", "roll"],
    seasoning: ["seasoning", "season", "salting"],
    sprinkling: ["sprinkling", "sprinkle"],
    marinating: ["marinating", "marinade", "marinate"],
    flipping: ["flipping", "flip"],
    tossing: ["tossing", "toss"],
    squeezing: ["squeezing", "squeeze"],
    shaking: ["shaking", "shake"],
    spreading: ["spreading", "spread"],
    layering: ["layering", "layer"],
    plating: ["plating"],
    garnishing: ["garnishing", "garnish"],
    cutting: ["cutting into", "cut open", "cutting", "cut"],
    biting: ["biting", "bite"],
    tasting: ["tasting", "taste"],
    weighing: ["weighing", "scale", "weigh"],
    measuring: ["measuring", "measure"],
    packing: ["packing", "pack", "portioning", "portion"],
    wrapping: ["wrapping", "wrap"],
    opening: ["opening", "open"],
    assembling: ["assembling", "assemble", "building the bowl"],
    scooping: ["scooping", "scoop"],
    shredding: ["shredding", "shredded", "shred", "pulling apart"],
    resting: ["resting", "rest"],
    steam_rising: ["steam rising", "steam"],
    sizzling: ["sizzling", "sizzle"],
  },
};

export const INGREDIENT_SYNONYMS = {
  chicken: ["chicken", "chicken breast", "chicken thigh", "thighs", "breast"],
  beef: ["beef", "steak", "mince", "ground beef", "sirloin", "ribeye"],
  salmon: ["salmon"],
  shrimp: ["shrimp", "prawn", "prawns"],
  tuna: ["tuna"],
  cod: ["cod", "white fish"],
  eggs: ["egg", "eggs", "egg whites", "omelette", "omelet", "scrambled"],
  tofu: ["tofu"],
  turkey: ["turkey"],
  lamb: ["lamb"],
  pork: ["pork", "bacon"],
  paneer: ["paneer"],
  lentils: ["lentil", "lentils", "dal", "daal"],
  chickpeas: ["chickpea", "chickpeas"],
  beans: ["beans", "black beans", "kidney beans"],
  protein_powder: ["protein powder", "whey", "protein shake", "scoop of protein"],
  greek_yogurt: ["greek yogurt", "greek yoghurt"],
  cottage_cheese: ["cottage cheese"],
  tempeh: ["tempeh"],
  sweet_potato: ["sweet potato", "sweet potatoes"],
  bell_pepper: ["bell pepper", "capsicum", "peppers"],
  olive_oil: ["olive oil", "evoo"],
  peanut_butter: ["peanut butter", "pb"],
  almond_butter: ["almond butter"],
  soy_sauce: ["soy sauce", "soy"],
  hot_sauce: ["hot sauce"],
  black_pepper: ["black pepper", "cracked pepper"],
  almond_milk: ["almond milk"],
  coconut_milk: ["coconut milk"],
  coconut_oil: ["coconut oil"],
  maple_syrup: ["maple syrup", "maple"],
  baking_powder: ["baking powder"],
  chilli: ["chilli", "chili", "chile", "jalapeno", "jalapeño"],
  berries: ["berries", "mixed berries"],
  blueberries: ["blueberry", "blueberries"],
  strawberries: ["strawberry", "strawberries"],
  potato: ["potato", "potatoes", "fries"],
  tomato: ["tomato", "tomatoes", "cherry tomatoes"],
  onion: ["onion", "onions", "shallot"],
  mushroom: ["mushroom", "mushrooms"],
  cheese: ["cheese", "cheddar"],
  sauce: ["sauce", "dressing", "gravy", "glaze"],
  herbs: ["herbs", "fresh herbs"],
  spices: ["spices", "spice mix", "spice blend"],
  nuts: ["nuts", "mixed nuts", "cashews", "pistachios"],
};

// ---------------------------------------------------------------------------

export function normalizeText(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/i, "") // strip extension if present
    .replace(/[_\-./\\]+/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMatcher(table) {
  // Flatten to [{phrase, tag}] sorted by phrase length desc so multi-word phrases win.
  const entries = [];
  for (const [tag, phrases] of Object.entries(table)) {
    for (const p of phrases) entries.push({ phrase: p.toLowerCase(), tag });
  }
  entries.sort((a, b) => b.phrase.length - a.phrase.length);
  return entries;
}

const MATCHERS = {
  shot_type: buildMatcher(SYNONYMS.shot_type),
  camera_motion: buildMatcher(SYNONYMS.camera_motion),
  stage: buildMatcher(SYNONYMS.stage),
  action: buildMatcher(SYNONYMS.action),
  ingredient: buildMatcher({
    ...Object.fromEntries(INGREDIENTS.map((i) => [i, [i.replace(/_/g, " ")]])),
    ...INGREDIENT_SYNONYMS,
  }),
};

function matchAll(matcher, text) {
  const found = [];
  let remaining = ` ${text} `;
  for (const { phrase, tag } of matcher) {
    const needle = ` ${phrase} `;
    if (remaining.includes(needle)) {
      if (!found.includes(tag)) found.push(tag);
      remaining = remaining.split(needle).join(" ");
    }
  }
  return found;
}

/**
 * Extract every controlled-vocabulary tag mentioned in free text
 * (a filename, folder name or a search query).
 */
export function extractTags(text) {
  const t = normalizeText(text);
  const hero = /\b(hero|beauty|money shot|reveal|final dish)\b/.test(t);
  const hook = /\b(hook|opener|opening)\b/.test(t);
  const ingredients = matchAll(MATCHERS.ingredient, t);
  return {
    shot_types: matchAll(MATCHERS.shot_type, t),
    camera_motion: matchAll(MATCHERS.camera_motion, t),
    stages: matchAll(MATCHERS.stage, t),
    actions: matchAll(MATCHERS.action, t),
    ingredients,
    proteins: ingredients.filter((i) => PROTEINS.includes(i)),
    hero,
    hook,
  };
}

/** Human-readable label for a tag value: "close_up" → "close-up". */
export function label(tag) {
  return String(tag ?? "").replace(/_/g, tag === "close_up" || tag === "extreme_close_up" ? "-" : " ");
}

export function titleCase(s) {
  return String(s ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Imperative verb for an action tag, used for offline caption copy. */
export const ACTION_VERBS = {
  chopping: "Chop", slicing: "Slice", dicing: "Dice", mincing: "Mince", peeling: "Peel", grating: "Grate", zesting: "Zest",
  cracking: "Crack", pouring: "Pour", drizzling: "Drizzle", stirring: "Stir", whisking: "Whisk", mixing: "Mix", blending: "Blend",
  kneading: "Knead", rolling: "Roll", grilling: "Grill", searing: "Sear", frying: "Fry", sauteing: "Sauté", boiling: "Boil",
  simmering: "Simmer", baking: "Bake", roasting: "Roast", air_frying: "Air fry", steaming: "Steam", seasoning: "Season",
  sprinkling: "Sprinkle", marinating: "Marinate", flipping: "Flip", tossing: "Toss", squeezing: "Squeeze", shaking: "Shake",
  spreading: "Spread", layering: "Layer", plating: "Plate up", garnishing: "Garnish", cutting: "Cut", biting: "First bite",
  tasting: "Taste test", weighing: "Weigh", measuring: "Measure", packing: "Pack", wrapping: "Wrap", opening: "Open",
  assembling: "Assemble", scooping: "Scoop", shredding: "Shred", resting: "Let it rest", lifting: "Lift",
  steam_rising: "Watch the steam", sizzling: "Hear that sizzle",
};
