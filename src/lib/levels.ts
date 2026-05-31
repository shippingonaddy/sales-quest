const LEVEL_TITLES: Record<number, string> = {
  1: 'Recruit',
  2: 'Cadet',
  3: 'Pilot',
  4: 'Navigator',
  5: 'Ranger',
  6: 'Specialist',
  7: 'Voyager',
  8: 'Commander',
  9: 'Captain',
  10: 'Admiral',
  11: 'Ace',
  12: 'Elite',
  13: 'Veteran',
  14: 'Legend',
  15: 'Mythic',
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] ?? 'Galactic'
}
