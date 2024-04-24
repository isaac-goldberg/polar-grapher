// use BigNumber to reduce floating-point rounding errors
const math2 = math.create(math.all, {
  number: "BigNumber",
  precision: 64
})

// Additional functions to be passed to the scope of math.evaluate(scope)
// (not defined in mathjs)
const mathImport = {
  lastFn: "",
  lastArgs: [],
  eigenvalues: matrix => math2.eigs(matrix).values,
  eigenvectors: matrix => math2.eigs(matrix).vectors,
  comp: (a, b) => math2.divide(math2.dot(a, b), math2.norm(a)), // component of b along a
  proj: (a, b) =>
    math2.multiply(
      math2.divide(a, math2.norm(a)),
      math2.divide(math2.dot(a, b), math2.norm(a))
    ) // projection of b along a
}

math2.import(mathImport, {
  override: true
})

// hacky way to disable unit parsing
// https://github.com/josdejong/mathjs/issues/1220
const units = math2.Unit.UNITS
Object.keys(units).forEach(unit => {
  delete units[unit]
})

export default math2
