import { BingoCardData, BingoSpace } from './types';

export function generateRandomNumbers(min: number, max: number, count: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(nums);
}

export function generateBingoCard(id: string, playerName: string): BingoCardData {
  const b = generateRandomNumbers(1, 15, 5);
  const i = generateRandomNumbers(16, 30, 5);
  const n = generateRandomNumbers(31, 45, 4);
  const g = generateRandomNumbers(46, 60, 5);
  const o = generateRandomNumbers(61, 75, 5);
  
  const grid: BingoSpace[][] = [
    [b[0], i[0], n[0], g[0], o[0]],
    [b[1], i[1], n[1], g[1], o[1]],
    [b[2], i[2], 'FREE', g[2], o[2]],
    [b[3], i[3], n[2], g[3], o[3]],
    [b[4], i[4], n[3], g[4], o[4]],
  ];
  return { id, playerName, grid };
}
