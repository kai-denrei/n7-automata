// palette.js
// Element sets ("skins") for the 7-element system. Each is just a list of
// { name, glyph, color }. The dominance relation lives in tournament.js and
// is independent of the skin — swapping palettes never changes who beats
// whom (element index i keeps its edges). To make the lore *read* sensibly
// you instead choose an ORDERING of names onto indices 0..6 so that the
// {1,2,4}-mod-7 edges line up with thematic "this consumes that" relations.
// See RESEARCH.md "Fitting lore onto the 14 cyclic triples".

export const PALETTES = {
  // Chinese Wuxing (Wood/Fire/Earth/Metal/Water) + the two elements Japanese
  // Godai adds (Wind, Void/Aether). The set in the reference screenshots.
  wuxingGodai: {
    label: 'Wuxing + Godai',
    elements: [
      { name: 'Earth',  glyph: '地', color: '#f5d442' },
      { name: 'Wood',   glyph: '木', color: '#5dff5d' },
      { name: 'Fire',   glyph: '火', color: '#ff4040' },
      { name: 'Wind',   glyph: '風', color: '#5be8ff' },
      { name: 'Aether', glyph: '空', color: '#ff5dff' },
      { name: 'Metal',  glyph: '金', color: '#f0f0f0' },
      { name: 'Water',  glyph: '水', color: '#4070ff' },
    ],
  },

  // Maximally separated hues with a literal wrap (violet -> red). Best pure
  // legibility on the map.
  // Faded retro ROYGBIV — desaturated, dusty hues that sit on the dark VFD
  // ground and read like an old colour CRT rather than vivid system colours.
  roygbiv: {
    label: 'ROYGBIV',
    elements: [
      { name: 'Red',    glyph: 'R', color: '#d06a5c' },
      { name: 'Orange', glyph: 'O', color: '#d2934f' },
      { name: 'Yellow', glyph: 'Y', color: '#c9bd63' },
      { name: 'Green',  glyph: 'G', color: '#73a87e' },
      { name: 'Blue',   glyph: 'B', color: '#5f9fb5' },
      { name: 'Indigo', glyph: 'I', color: '#7e7fb8' },
      { name: 'Violet', glyph: 'V', color: '#a97bb0' },
    ],
  },

  // Seven classical metals / planets. Transmutation chains give pre-built
  // directional lore to bend onto the tournament edges.
  alchemical: {
    label: 'Alchemical metals',
    elements: [
      { name: 'Gold',    glyph: '☉', color: '#ffd75e' },
      { name: 'Silver',  glyph: '☽', color: '#e8e8ee' },
      { name: 'Mercury', glyph: '☿', color: '#9fd0d6' },
      { name: 'Copper',  glyph: '♀', color: '#e08a5a' },
      { name: 'Iron',    glyph: '♂', color: '#c45b5b' },
      { name: 'Tin',     glyph: '♃', color: '#8fb3e0' },
      { name: 'Lead',    glyph: '♄', color: '#8a8f9c' },
    ],
  },
};

export const DEFAULT_PALETTE = 'roygbiv';
