// === Formula Engine ===
// Simple arithmetic formula engine for computed columns.
// Supports: +, -, *, /, parentheses, field references, numeric literals.

export interface CompiledFormula {
  evaluate: (row: Record<string, unknown>) => number | null
  dependencies: string[]
}

type Token =
  | { type: "number"; value: number }
  | { type: "field"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }

function tokenize(formula: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < formula.length) {
    const ch = formula[i]
    if (/\s/.test(ch)) { i++; continue }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch }); i++; continue
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      // Handle negative numbers: '-' at start, after operator, or after open paren
      if (
        ch === "-" &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === "op" ||
          (tokens[tokens.length - 1].type === "paren" &&
            tokens[tokens.length - 1].value === "("))
      ) {
        let num = "-"
        i++
        while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === ".")) {
          num += formula[i]; i++
        }
        if (num === "-") throw new Error("Invalid formula: lone minus")
        tokens.push({ type: "number", value: parseFloat(num) })
        continue
      }
      tokens.push({ type: "op", value: ch as "+" | "-" | "*" | "/" }); i++; continue
    }
    if (/\d/.test(ch) || ch === ".") {
      let num = ""
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === ".")) {
        num += formula[i]; i++
      }
      tokens.push({ type: "number", value: parseFloat(num) })
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let name = ""
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        name += formula[i]; i++
      }
      tokens.push({ type: "field", value: name })
      continue
    }
    throw new Error(`Unexpected character: ${ch}`)
  }
  return tokens
}

// Recursive descent parser
// Grammar:
//   expr   = term (('+' | '-') term)*
//   term   = factor (('*' | '/') factor)*
//   factor = NUMBER | FIELD | '(' expr ')'

function parse(tokens: Token[]): {
  eval: (row: Record<string, unknown>) => number | null
  deps: Set<string>
} {
  let pos = 0
  const deps = new Set<string>()
  let depth = 0
  const MAX_DEPTH = 20

  function peek(): Token | undefined { return tokens[pos] }
  function consume(): Token { return tokens[pos++] }

  function parseExpr(): (row: Record<string, unknown>) => number | null {
    let left = parseTerm()
    while (peek() && peek()!.type === "op" && (peek()!.value === "+" || peek()!.value === "-")) {
      const op = consume().value as "+" | "-"
      const right = parseTerm()
      const prevLeft = left
      left = (row) => {
        const l = prevLeft(row)
        const r = right(row)
        if (l === null || r === null) return null
        return op === "+" ? l + r : l - r
      }
    }
    return left
  }

  function parseTerm(): (row: Record<string, unknown>) => number | null {
    let left = parseFactor()
    while (peek() && peek()!.type === "op" && (peek()!.value === "*" || peek()!.value === "/")) {
      const op = consume().value as "*" | "/"
      const right = parseFactor()
      const prevLeft = left
      left = (row) => {
        const l = prevLeft(row)
        const r = right(row)
        if (l === null || r === null) return null
        if (op === "/" && r === 0) return null
        return op === "*" ? l * r : l / r
      }
    }
    return left
  }

  function parseFactor(): (row: Record<string, unknown>) => number | null {
    const token = peek()
    if (!token) throw new Error("Unexpected end of formula")

    if (token.type === "number") {
      consume()
      const val = token.value
      return () => val
    }

    if (token.type === "field") {
      consume()
      const fieldName = token.value
      deps.add(fieldName)
      return (row) => {
        const v = row[fieldName]
        if (v === null || v === undefined) return null
        const num = Number(v)
        return isNaN(num) ? null : num
      }
    }

    if (token.type === "paren" && token.value === "(") {
      depth++
      if (depth > MAX_DEPTH) {
        throw new Error("Formula too deeply nested (max 20 levels)")
      }
      consume()
      const expr = parseExpr()
      const closing = consume()
      if (!closing || closing.type !== "paren" || closing.value !== ")") {
        throw new Error("Expected closing parenthesis")
      }
      depth--
      return expr
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`)
  }

  const evalFn = parseExpr()
  if (pos < tokens.length) {
    throw new Error(`Unexpected token at position ${pos}: ${JSON.stringify(tokens[pos])}`)
  }
  return { eval: evalFn, deps }
}

/**
 * Compile a formula string into an evaluator.
 * Formula examples: "salary_total - salary_official", "a + b * 2", "(a - b) / c * 100"
 */
export function compileFormula(formula: string): CompiledFormula {
  if (formula.length > 1000) {
    throw new Error("Formula too long (max 1000 characters)")
  }

  const tokens = tokenize(formula)

  if (tokens.length > 200) {
    throw new Error("Formula too complex (max 200 tokens)")
  }

  const { eval: evalFn, deps } = parse(tokens)
  return {
    evaluate: evalFn,
    dependencies: Array.from(deps),
  }
}

/**
 * Extract field dependencies from a formula without compiling.
 */
export function extractDependencies(formula: string): string[] {
  try {
    const tokens = tokenize(formula)
    return tokens.filter((t) => t.type === "field").map((t) => t.value as string)
  } catch {
    return []
  }
}

/**
 * Evaluate a formula string against a row (convenience function).
 */
export function evaluateFormula(formula: string, row: Record<string, unknown>): number | null {
  try {
    return compileFormula(formula).evaluate(row)
  } catch (err) {
    console.warn("Formula evaluation failed:", err)
    return null
  }
}
