export default class ParseError extends Error {
    constructor(message = "", token, ...args) {
      super(...args)
      this.name = "ParseError"
      this.message = `${token.lexeme} at ${token.pos}: ${message}`
    }
  }
  