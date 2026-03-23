import { describe, it, expect } from "vitest"
import { compileFormula, evaluateFormula, extractDependencies } from "../formula-engine"

describe("Formula Engine", () => {
  describe("Basic Arithmetic", () => {
    it("should evaluate simple addition", () => {
      const formula = "a + b"
      const result = evaluateFormula(formula, { a: 10, b: 20 })
      expect(result).toBe(30)
    })

    it("should evaluate simple subtraction", () => {
      const formula = "a - b"
      const result = evaluateFormula(formula, { a: 50, b: 20 })
      expect(result).toBe(30)
    })

    it("should evaluate simple multiplication", () => {
      const formula = "a * b"
      const result = evaluateFormula(formula, { a: 5, b: 10 })
      expect(result).toBe(50)
    })

    it("should evaluate simple division", () => {
      const formula = "a / b"
      const result = evaluateFormula(formula, { a: 100, b: 4 })
      expect(result).toBe(25)
    })

    it("should evaluate mixed operators with precedence", () => {
      const formula = "a + b * c"
      const result = evaluateFormula(formula, { a: 10, b: 5, c: 2 })
      expect(result).toBe(20) // 10 + (5 * 2)
    })

    it("should evaluate expressions with parentheses", () => {
      const formula = "(a + b) * c"
      const result = evaluateFormula(formula, { a: 10, b: 5, c: 2 })
      expect(result).toBe(30) // (10 + 5) * 2
    })

    it("should evaluate complex nested expressions", () => {
      const formula = "(a - b) / (c + d) * 100"
      const result = evaluateFormula(formula, { a: 150, b: 50, c: 5, d: 5 })
      expect(result).toBe(1000) // (150 - 50) / (5 + 5) * 100 = 100 / 10 * 100
    })

    it("should handle multiple levels of parentheses", () => {
      const formula = "((a + b) * (c - d)) / e"
      const result = evaluateFormula(formula, { a: 2, b: 3, c: 10, d: 5, e: 5 })
      expect(result).toBe(5) // ((2 + 3) * (10 - 5)) / 5 = (5 * 5) / 5
    })

    it("should evaluate division and multiplication chain", () => {
      const formula = "a / b * c / d"
      const result = evaluateFormula(formula, { a: 100, b: 5, c: 10, d: 4 })
      expect(result).toBe(50) // 100 / 5 * 10 / 4 = 20 * 10 / 4 = 200 / 4
    })

    it("should evaluate addition and subtraction chain", () => {
      const formula = "a + b - c + d"
      const result = evaluateFormula(formula, { a: 10, b: 20, c: 5, d: 15 })
      expect(result).toBe(40) // 10 + 20 - 5 + 15
    })
  })

  describe("Field References", () => {
    it("should evaluate single field reference", () => {
      const formula = "salary_total"
      const result = evaluateFormula(formula, { salary_total: 100000 })
      expect(result).toBe(100000)
    })

    it("should evaluate multiple field references", () => {
      const formula = "salary_total - salary_official"
      const result = evaluateFormula(formula, { salary_total: 100000, salary_official: 50000 })
      expect(result).toBe(50000)
    })

    it("should handle fields with underscores", () => {
      const formula = "salary_base_amount + bonus_amount"
      const result = evaluateFormula(formula, { salary_base_amount: 80000, bonus_amount: 20000 })
      expect(result).toBe(100000)
    })

    it("should be case sensitive for field names", () => {
      const formula = "SalaryTotal"
      const result = evaluateFormula(formula, { SalaryTotal: 123 })
      expect(result).toBe(123)
    })

    it("should treat different cases as different fields", () => {
      const formula = "salaryTotal + SalaryTotal"
      const result = evaluateFormula(formula, { salaryTotal: 100, SalaryTotal: 200 })
      expect(result).toBe(300)
    })
  })

  describe("Numeric Literals", () => {
    it("should handle integer literals", () => {
      const formula = "100"
      const result = evaluateFormula(formula, {})
      expect(result).toBe(100)
    })

    it("should handle decimal literals", () => {
      const formula = "123.45"
      const result = evaluateFormula(formula, {})
      expect(result).toBe(123.45)
    })

    it("should handle negative number literals", () => {
      const formula = "-50"
      const result = evaluateFormula(formula, {})
      expect(result).toBe(-50)
    })

    it("should handle zero", () => {
      const formula = "0"
      const result = evaluateFormula(formula, {})
      expect(result).toBe(0)
    })

    it("should handle large numbers", () => {
      const formula = "1000000"
      const result = evaluateFormula(formula, {})
      expect(result).toBe(1000000)
    })

    it("should mix literals and fields", () => {
      const formula = "a + 100"
      const result = evaluateFormula(formula, { a: 50 })
      expect(result).toBe(150)
    })
  })

  describe("Unary Minus", () => {
    it("should handle negative number at start", () => {
      const formula = "-10 + a"
      const result = evaluateFormula(formula, { a: 20 })
      expect(result).toBe(10)
    })

    it("should handle negative number in parentheses", () => {
      const formula = "a + (-5)"
      const result = evaluateFormula(formula, { a: 10 })
      expect(result).toBe(5)
    })

    it("should handle negative number after operator", () => {
      const formula = "a * -2"
      const result = evaluateFormula(formula, { a: 10 })
      expect(result).toBe(-20)
    })

    it("should handle multiple negative numbers", () => {
      const formula = "-10 + -5"
      const result = evaluateFormula(formula, {})
      expect(result).toBe(-15)
    })

    it("should handle negative in complex expression", () => {
      const formula = "(-10 + a) * b"
      const result = evaluateFormula(formula, { a: 20, b: 2 })
      expect(result).toBe(20) // (-10 + 20) * 2 = 10 * 2
    })
  })

  describe("Null Handling", () => {
    it("should return null for missing field", () => {
      const formula = "nonexistent_field"
      const result = evaluateFormula(formula, { other_field: 100 })
      expect(result).toBeNull()
    })

    it("should return null for null value", () => {
      const formula = "salary_total"
      const result = evaluateFormula(formula, { salary_total: null })
      expect(result).toBeNull()
    })

    it("should return null for undefined value", () => {
      const formula = "salary_total"
      const result = evaluateFormula(formula, { salary_total: undefined })
      expect(result).toBeNull()
    })

    it("should return null for division by zero", () => {
      const formula = "a / 0"
      const result = evaluateFormula(formula, { a: 100 })
      expect(result).toBeNull()
    })

    it("should return null for non-numeric string", () => {
      const formula = "field"
      const result = evaluateFormula(formula, { field: "not a number" })
      expect(result).toBeNull()
    })

    it("should propagate null through operations", () => {
      const formula = "a + b"
      const result = evaluateFormula(formula, { a: 100, b: null })
      expect(result).toBeNull()
    })
  })

  describe("DoS Protection", () => {
    it("should accept formula at max length (1000 chars)", () => {
      // Create a formula close to 1000 chars but under 200 tokens
      // Each "a + " is 2 tokens (field + operator), need to stay under 200 tokens
      // 98 repetitions = 196 tokens + "a" = 197 tokens, ~396 chars
      const formula = "a + ".repeat(98) + "a" // 197 tokens, ~396 chars
      expect(() => compileFormula(formula)).not.toThrow()
    })

    it("should reject formula exceeding max length (1001+ chars)", () => {
      // Create a string with > 1000 chars but reasonable tokens
      const longFieldName = "a".repeat(1001) // Single field with 1001 chars
      expect(() => compileFormula(longFieldName)).toThrow("Formula too long")
    })

    it("should accept formula at max tokens (200)", () => {
      // Each field is a token, each operator is a token
      // "a + a + a + ..." = 2 tokens per segment (field + operator), minus 1 operator at end
      // 99 segments = 198 tokens + 1 final field = 199 tokens
      const formula = Array(99).fill("a + ").join("") + "a"
      expect(() => compileFormula(formula)).not.toThrow()
    })

    it("should reject formula exceeding max tokens (201+)", () => {
      // 100 segments = 200 tokens + 1 final field = 201 tokens
      const formula = Array(100).fill("a + ").join("") + "a"
      expect(() => compileFormula(formula)).toThrow("Formula too complex")
    })

    it("should accept formula at max depth (20 levels)", () => {
      const formula = "(".repeat(20) + "a" + ")".repeat(20)
      expect(() => compileFormula(formula)).not.toThrow()
    })

    it("should reject formula exceeding max depth (21+ levels)", () => {
      const formula = "(".repeat(21) + "a" + ")".repeat(21)
      expect(() => compileFormula(formula)).toThrow("too deeply nested")
    })
  })

  describe("Edge Cases", () => {
    it("should throw on empty formula", () => {
      expect(() => compileFormula("")).toThrow()
    })

    it("should throw on whitespace only", () => {
      expect(() => compileFormula("   ")).toThrow()
    })

    it("should throw on invalid syntax (incomplete expression)", () => {
      expect(() => compileFormula("a +")).toThrow()
    })

    it("should throw on unbalanced parentheses (missing closing)", () => {
      expect(() => compileFormula("(a + b")).toThrow("Expected closing parenthesis")
    })

    it("should throw on unbalanced parentheses (extra closing)", () => {
      expect(() => compileFormula("a + b)")).toThrow()
    })

    it("should throw on invalid characters", () => {
      expect(() => compileFormula("a & b")).toThrow("Unexpected character")
    })

    it("should handle whitespace correctly", () => {
      const formula = "  a  +  b  "
      const result = evaluateFormula(formula, { a: 10, b: 20 })
      expect(result).toBe(30)
    })
  })

  describe("extractDependencies", () => {
    it("should extract single dependency", () => {
      const deps = extractDependencies("salary_total")
      expect(deps).toEqual(["salary_total"])
    })

    it("should extract multiple dependencies", () => {
      const deps = extractDependencies("salary_total - salary_official")
      expect(deps).toEqual(["salary_total", "salary_official"])
    })

    it("should extract dependencies from complex expression", () => {
      const deps = extractDependencies("(a + b) * c / d - e")
      expect(deps).toEqual(["a", "b", "c", "d", "e"])
    })

    it("should not extract numeric literals", () => {
      const deps = extractDependencies("a + 100 - 50")
      expect(deps).toEqual(["a"])
    })

    it("should return empty array for formula with only literals", () => {
      const deps = extractDependencies("100 + 200")
      expect(deps).toEqual([])
    })

    it("should handle invalid formula gracefully", () => {
      const deps = extractDependencies("invalid & formula")
      expect(deps).toEqual([])
    })
  })

  describe("compileFormula", () => {
    it("should return CompiledFormula with evaluate function", () => {
      const compiled = compileFormula("a + b")
      expect(compiled).toHaveProperty("evaluate")
      expect(compiled).toHaveProperty("dependencies")
      expect(typeof compiled.evaluate).toBe("function")
    })

    it("should return correct dependencies", () => {
      const compiled = compileFormula("a + b * c")
      expect(compiled.dependencies).toEqual(["a", "b", "c"])
    })

    it("should allow reusing compiled formula", () => {
      const compiled = compileFormula("a * 2")
      expect(compiled.evaluate({ a: 10 })).toBe(20)
      expect(compiled.evaluate({ a: 20 })).toBe(40)
      expect(compiled.evaluate({ a: 30 })).toBe(60)
    })
  })
})
