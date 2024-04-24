import tokenizeTex from "./tokenizeTex.js"
import parseTokens from "./parseTokens.js"

/**
 * Parse a TeX math string into a MathJS expression tree.
 * @returns Returns an object containing the root node of a MathJS expression tree
 *          and variables that need to be defined.
 */
function parseTex(texStr) {
  return parseTokens(tokenizeTex(texStr))
}

/**
 * Evaluate a TeX math string, returning the result as a MathJS MathType.
 */
function evaluateTex(texStr, scope) {
  const root = parseTex(texStr)
  const evaluated = root.evaluate(scope)
  return { evaluated, scope }
}

export { parseTex, evaluateTex }
