// Number checks for grounded answers: every figure Claude states must come from a cited passage, the
// user's question, or a calculation we re-evaluated ourselves from cited figures.

/** Number tokens in a text, ignoring list markers like "1." at the start of a line. */
export function numberTokens(text: string): string[] {
  return text.replace(/^\s*\d+[.)]\s/gm, '').match(/\d+(?:[.,]\d+)*/g) ?? [];
}

/**
 * Possible values of a number token. Vietnamese documents write 2.340.000 (thousands) and 2,34 (decimal);
 * some write 2.34 or 2,340,000 — keep every reading so either style matches.
 */
export function readings(token: string): number[] {
  const out = new Set<number>();
  const add = (s: string) => {
    const v = Number(s);
    if (Number.isFinite(v)) out.add(v);
  };
  add(token.replace(/\./g, '').replace(',', '.')); // vi: 2.340.000 / 2,34
  add(token.replace(/,/g, '')); // en: 2,340,000 / 2.34
  add(token.replace(/[.,]/g, '')); // digits only
  return [...out];
}

export function valuesIn(text: string): number[] {
  return numberTokens(text).flatMap(readings);
}

const close = (a: number, b: number, rel = 1e-9) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * rel);

export class NumberSet {
  private readonly exact: number[] = [];
  private readonly results: number[] = [];
  addText(text: string): this {
    this.exact.push(...valuesIn(text));
    return this;
  }
  addValue(v: number): this {
    this.exact.push(v);
    return this;
  }
  /** Calculation results may be quoted rounded, or in thousands/millions ("5,48 triệu"). */
  addResult(v: number): this {
    this.results.push(v);
    return this;
  }
  hasExact(v: number): boolean {
    return this.exact.some((x) => close(v, x));
  }
  has(token: string): boolean {
    return readings(token).some(
      (v) =>
        this.hasExact(v) ||
        this.results.some((r) => [1, 1e3, 1e6, 1e9].some((scale) => close(v * scale, r, 0.01) || close(v, r, 0.01))),
    );
  }
}

/** Evaluates + - * / and parentheses over plain numbers (1234.5). Returns null on anything else. */
export function evaluate(expression: string): { value: number; operands: number[] } | null {
  const src = expression.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  const operands: number[] = [];
  let i = 0;
  const num = (): number | null => {
    const m = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    const v = Number(m[0]);
    operands.push(v);
    return v;
  };
  const factor = (): number | null => {
    if (src[i] === '(') {
      i++;
      const v = expr();
      if (v === null || src[i] !== ')') return null;
      i++;
      return v;
    }
    if (src[i] === '-') {
      i++;
      const v = factor();
      return v === null ? null : -v;
    }
    return num();
  };
  const term = (): number | null => {
    let v = factor();
    while (v !== null && (src[i] === '*' || src[i] === '/')) {
      const op = src[i++];
      const r = factor();
      if (r === null || (op === '/' && r === 0)) return null;
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number | null => {
    let v = term();
    while (v !== null && (src[i] === '+' || src[i] === '-')) {
      const op = src[i++];
      const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const value = expr();
  if (value === null || i !== src.length || !Number.isFinite(value)) return null;
  return { value, operands };
}

/** 5475600 → "5.475.600", 2.34 → "2,34" */
export function formatVi(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  const [int, dec] = Math.abs(rounded).toString().split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '-' : ''}${grouped}${dec ? `,${dec}` : ''}`;
}

/** "2.34*2340000" → "2,34 × 2.340.000" */
export function prettyExpression(expression: string): string {
  return expression
    .replace(/\s+/g, '')
    .replace(/\d+(?:\.\d+)?/g, (n) => formatVi(Number(n)))
    .replace(/[*×x]/g, ' × ')
    .replace(/[/÷]/g, ' ÷ ')
    .replace(/(\d|\))([+-])/g, '$1 $2 ');
}
