/** Conway's Game of Life on a wrapping board, with inherited plant species. */
export class Board {
  alive: Uint8Array;
  kind: Uint8Array;
  constructor(
    public cols: number,
    public rows: number,
    public kinds: number,
  ) {
    this.alive = new Uint8Array(cols * rows);
    this.kind = new Uint8Array(cols * rows);
  }
  index(c: number, r: number) {
    const { cols, rows } = this;
    return ((r + rows) % rows) * cols + ((c + cols) % cols);
  }
  randomize(density: number, rand = Math.random) {
    this.alive.fill(0);
    // Seed species in patches so colonies of one plant form naturally.
    const anchors = Array.from({ length: 8 }, () => [
      rand() * this.cols,
      rand() * this.rows,
      Math.floor(rand() * this.kinds),
    ]);
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        let best = 0;
        let bestD = Infinity;
        for (const [x, y, k] of anchors) {
          const d = (x - c) ** 2 + (y - r) ** 2;
          if (d < bestD) [bestD, best] = [d, k];
        }
        this.kind[i] = rand() < 0.15 ? Math.floor(rand() * this.kinds) : best;
        this.alive[i] = rand() < density ? 1 : 0;
      }
  }
  /** Sprinkle a few random live clusters, used to keep a stalled garden growing. */
  sprinkle(count: number, rand = Math.random) {
    for (let n = 0; n < count; n++) {
      const c = Math.floor(rand() * this.cols);
      const r = Math.floor(rand() * this.rows);
      const k = Math.floor(rand() * this.kinds);
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          if (rand() < 0.45) {
            const i = this.index(c + dc, r + dr);
            this.alive[i] = 1;
            this.kind[i] = k;
          }
    }
  }
  population() {
    let n = 0;
    for (const a of this.alive) n += a;
    return n;
  }
  /** Advances one generation. Returns indices of births and deaths. */
  step(rand = Math.random) {
    const { cols, rows, alive, kind } = this;
    const next = new Uint8Array(alive.length);
    const nextKind = kind.slice();
    const born: number[] = [];
    const died: number[] = [];
    const votes = new Uint8Array(this.kinds);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let n = 0;
        votes.fill(0);
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const j = this.index(c + dc, r + dr);
            if (alive[j]) {
              n++;
              votes[kind[j]]++;
            }
          }
        const i = r * cols + c;
        if (alive[i]) {
          if (n === 2 || n === 3) next[i] = 1;
          else died.push(i);
        } else if (n === 3) {
          next[i] = 1;
          born.push(i);
          // The newborn takes the most common species among its three parents.
          let top = 0;
          for (let k = 1; k < this.kinds; k++)
            if (votes[k] > votes[top]) top = k;
          nextKind[i] = rand() < 0.03 ? Math.floor(rand() * this.kinds) : top;
        }
      }
    this.alive = next;
    this.kind = nextKind;
    return { born, died };
  }
  /** Hash of the live pattern, used to detect a garden that stopped changing. */
  signature() {
    let h = 2166136261;
    for (let i = 0; i < this.alive.length; i++)
      if (this.alive[i]) h = Math.imul(h ^ i, 16777619);
    return h >>> 0;
  }
}
