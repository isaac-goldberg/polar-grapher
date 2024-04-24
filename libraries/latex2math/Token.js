export let TokenType

;(function(TokenType) {
  TokenType[(TokenType["Number"] = 0)] = "Number"
  TokenType[(TokenType["Variable"] = 1)] = "Variable"
  TokenType[(TokenType["Equals"] = 2)] = "Equals"
  TokenType[(TokenType["Plus"] = 3)] = "Plus"
  TokenType[(TokenType["Minus"] = 4)] = "Minus"
  TokenType[(TokenType["Star"] = 5)] = "Star"
  TokenType[(TokenType["Times"] = 6)] = "Times"
  TokenType[(TokenType["Slash"] = 7)] = "Slash"
  TokenType[(TokenType["Caret"] = 8)] = "Caret"
  TokenType[(TokenType["Comma"] = 9)] = "Comma"
  TokenType[(TokenType["Lbrace"] = 10)] = "Lbrace"
  TokenType[(TokenType["Rbrace"] = 11)] = "Rbrace"
  TokenType[(TokenType["Lparen"] = 12)] = "Lparen"
  TokenType[(TokenType["Rparen"] = 13)] = "Rparen"
  TokenType[(TokenType["Bar"] = 14)] = "Bar"
  TokenType[(TokenType["Amp"] = 15)] = "Amp"
  TokenType[(TokenType["Dblbackslash"] = 16)] = "Dblbackslash"
  TokenType[(TokenType["Sqrt"] = 17)] = "Sqrt"
  TokenType[(TokenType["Frac"] = 18)] = "Frac"
  TokenType[(TokenType["Sin"] = 19)] = "Sin"
  TokenType[(TokenType["Cos"] = 20)] = "Cos"
  TokenType[(TokenType["Tan"] = 21)] = "Tan"
  TokenType[(TokenType["Csc"] = 22)] = "Csc"
  TokenType[(TokenType["Sec"] = 23)] = "Sec"
  TokenType[(TokenType["Cot"] = 24)] = "Cot"
  TokenType[(TokenType["Arcsin"] = 25)] = "Arcsin"
  TokenType[(TokenType["Arccos"] = 26)] = "Arccos"
  TokenType[(TokenType["Arctan"] = 27)] = "Arctan"
  TokenType[(TokenType["Sinh"] = 28)] = "Sinh"
  TokenType[(TokenType["Cosh"] = 29)] = "Cosh"
  TokenType[(TokenType["Tanh"] = 30)] = "Tanh"
  TokenType[(TokenType["Log"] = 31)] = "Log"
  TokenType[(TokenType["Ln"] = 32)] = "Ln"
  TokenType[(TokenType["Pi"] = 33)] = "Pi"
  TokenType[(TokenType["E"] = 34)] = "E"
  TokenType[(TokenType["Begin"] = 35)] = "Begin"
  TokenType[(TokenType["End"] = 36)] = "End"
  TokenType[(TokenType["Matrix"] = 37)] = "Matrix"
  TokenType[(TokenType["Left"] = 38)] = "Left"
  TokenType[(TokenType["Right"] = 39)] = "Right"
  TokenType[(TokenType["Eof"] = 40)] = "Eof"
  TokenType[(TokenType["T"] = 41)] = "T"
  TokenType[(TokenType["Det"] = 42)] = "Det"
  TokenType[(TokenType["Opname"] = 43)] = "Opname"
  TokenType[(TokenType["Eigenvalues"] = 44)] = "Eigenvalues"
  TokenType[(TokenType["Eigenvectors"] = 45)] = "Eigenvectors"
  TokenType[(TokenType["Cross"] = 46)] = "Cross"
  TokenType[(TokenType["Proj"] = 47)] = "Proj"
  TokenType[(TokenType["Comp"] = 48)] = "Comp"
  TokenType[(TokenType["Norm"] = 49)] = "Norm"
  TokenType[(TokenType["Inv"] = 50)] = "Inv"
  TokenType[(TokenType["Space"] = 51)] = "Space"
})(TokenType || (TokenType = {}))

export const lexemeToType = {
  "=": TokenType.Equals,
  "+": TokenType.Plus,
  "-": TokenType.Minus,
  "*": TokenType.Star,
  "\\cdot": TokenType.Star,
  "\\times": TokenType.Times,
  "^": TokenType.Caret,
  "/": TokenType.Slash,
  ",": TokenType.Comma,
  "{": TokenType.Lbrace,
  "}": TokenType.Rbrace,
  "(": TokenType.Lparen,
  ")": TokenType.Rparen,
  "|": TokenType.Bar,
  "&": TokenType.Amp,
  bmatrix: TokenType.Matrix,
  "\\\\": TokenType.Dblbackslash,
  "\\sqrt": TokenType.Sqrt,
  "\\frac": TokenType.Frac,
  "\\sin": TokenType.Sin,
  "\\cos": TokenType.Cos,
  "\\tan": TokenType.Tan,
  "\\csc": TokenType.Csc,
  "\\sec": TokenType.Sec,
  "\\cot": TokenType.Cot,
  "\\arcsin": TokenType.Arcsin,
  "\\arccos": TokenType.Arccos,
  "\\arctan": TokenType.Arctan,
  "\\sinh": TokenType.Sinh,
  "\\cosh": TokenType.Cosh,
  "\\tanh": TokenType.Tanh,
  "\\log": TokenType.Log,
  "\\ln": TokenType.Ln,
  "\\pi": TokenType.Pi,
  e: TokenType.E,
  "\\begin": TokenType.Begin,
  "\\end": TokenType.End,
  "\\left": TokenType.Left,
  "\\right": TokenType.Right,
  T: TokenType.T,
  "\\det": TokenType.Det,
  "\\operatorname": TokenType.Opname,
  eigenvectors: TokenType.Eigenvectors,
  eigenvalues: TokenType.Eigenvalues,
  cross: TokenType.Cross,
  proj: TokenType.Proj,
  comp: TokenType.Comp,
  norm: TokenType.Norm,
  inv: TokenType.Inv
}

/**
 * A mapping from a token type to the operation it represents.
 * The operation is the name of a function in the mathjs namespace,
 * or of a function to be defined in scope (i.e. in the argument to math.evaluate())
 */
export const typeToOperation = {
  [TokenType.Plus]: "add",
  [TokenType.Minus]: "subtract",
  [TokenType.Star]: "multiply",
  [TokenType.Times]: "multiply",
  [TokenType.Caret]: "pow",
  [TokenType.Slash]: "divide",
  [TokenType.Frac]: "divide",
  [TokenType.Bar]: "abs",
  [TokenType.Sqrt]: "sqrt",
  [TokenType.Sin]: "sin",
  [TokenType.Cos]: "cos",
  [TokenType.Tan]: "tan",
  [TokenType.Csc]: "csc",
  [TokenType.Sec]: "sec",
  [TokenType.Cot]: "cot",
  [TokenType.Arcsin]: "asin",
  [TokenType.Arccos]: "acos",
  [TokenType.Arctan]: "atan",
  [TokenType.Sinh]: "sinh",
  [TokenType.Cosh]: "cosh",
  [TokenType.Tanh]: "tanh",
  [TokenType.Log]: "log10",
  [TokenType.Ln]: "log",
  [TokenType.Det]: "det",
  [TokenType.Eigenvectors]: "eigenvectors",
  [TokenType.Eigenvalues]: "eigenvalues",
  [TokenType.Cross]: "cross",
  [TokenType.Proj]: "proj",
  [TokenType.Comp]: "comp",
  [TokenType.Norm]: "norm",
  [TokenType.Inv]: "inv"
}

class Token {
  /**
   * A token in a TeX string.
   * @param {string} lexeme string literal of the token
   * @param {TokenType} type type of the token
   * @param {Number} pos position of the token in the input string
   *
   * @constructor Token
   */
  constructor(lexeme, type, pos) {
    this.lexeme = lexeme
    this.type = type
    this.pos = pos
  }
}

export default Token
