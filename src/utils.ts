import { BingoCardData, BingoSpace, GameMode } from './types';

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

export function isCardWinner(card: BingoCardData, drawnNumbers: number[], gameMode: GameMode = 'full_card') {
  if (!card || !card.grid || !Array.isArray(card.grid)) return false;
  const checkMarked = (r: number, c: number) => {
    if (r < 0 || r > 4 || c < 0 || c > 4) return false;
    const row = card.grid[r];
    if (!row) return false;
    const cell = row[c];
    return cell === 'FREE' || drawnNumbers.includes(cell as number);
  };

  const effectiveMode = gameMode === 'bot_vs_bot' ? 'full_card' : gameMode;

  if (effectiveMode === 'full_card') {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!checkMarked(r, c)) return false;
      }
    }
    return true;
  } else if (effectiveMode === 'line') {
    for (let r = 0; r < 5; r++) {
      let rowWin = true;
      for (let c = 0; c < 5; c++) {
         if (!checkMarked(r, c)) rowWin = false;
      }
      if (rowWin) return true;
    }
    for (let c = 0; c < 5; c++) {
      let colWin = true;
      for (let r = 0; r < 5; r++) {
         if (!checkMarked(r, c)) colWin = false;
      }
      if (colWin) return true;
    }
  } else if (effectiveMode === 'block_of_4') {
    // Verifica 16 possíveis blocos de 2x2 dentro da cartela 5x5
    for (let r = 0; r <= 3; r++) {
      for (let c = 0; c <= 3; c++) {
        const topLeft = checkMarked(r, c);
        const topRight = checkMarked(r, c + 1);
        const bottomLeft = checkMarked(r + 1, c);
        const bottomRight = checkMarked(r + 1, c + 1);
        
        if (topLeft && topRight && bottomLeft && bottomRight) {
          return true;
        }
      }
    }
  }
  return false;
}

export function serializeGrid(grid: BingoSpace[][]): any[] {
  return grid.map(row => {
    const rowObj: Record<string, any> = {};
    row.forEach((cell, colIndex) => {
      rowObj[colIndex.toString()] = cell;
    });
    return rowObj;
  });
}

export function deserializeGrid(serialized: any[]): BingoSpace[][] {
  const grid: BingoSpace[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: BingoSpace[] = [];
    const rowObj = serialized[r];
    for (let c = 0; c < 5; c++) {
      row.push(rowObj[c.toString()]);
    }
    grid.push(row);
  }
  return grid;
}

