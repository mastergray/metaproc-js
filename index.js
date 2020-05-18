// CONSTRUCTOR :: ([METAPROC.op], STATE [FUNCTION]) -> metaproc
// Creates "monad-like" object with chainable methods that guarnetees executing operations in the order they were declared
module.exports = METAPROC = (ops, run) => ops.reduce((metaproc, op) => op(metaproc), {

  // Stores function bound to instance by operations declared for this instance:
  "_fns":[],

  // chain : ([FUNCTION]) -> metaproc
  // Adds functions from another instance to this instance:
  "chain":function (fns) {
    this._fns = this._fns.concat(fns);
    return this;
  },

  // run :: (STATE) -> PROMISE(STATE)
  // Applies STATE to functions of this instance of METAPROC, returning promise of STATE:
  // NOTE: This can be overwritten
  "run": function (STATE) {
    return run !== undefined
      ? run(STATE, this._fns)
      : this._fns.reduce((promise, fn) => promise.then(fn), Promise.resolve(STATE))
  }

});

/**
 *
 *  "Static" Methods
 *
 */

// op :: (STRING, (* -> VOID) -> METAPROC) -> METAPROC
// Declares an operation for an instanc of METAPROC:
METAPROC.op = (id, fn) => (metaproc) => {
  metaproc[id] = (...args) => {
    metaproc._fns.push(async (STATE) => {
      try {
        await fn.apply(null, args)(STATE);
        return STATE;
      } catch (err) {
        throw {"msg":err, "STATE":STATE}
      }
    });
    return metaproc;
  };
  return metaproc;
}

// Initailzes an instance of METAPROC with the given array of METAPROC operations
// If no operations are given, METAPROC instance is initalized with "standard" operations
// NOTE: Array given as argument is flattened:
METAPROC.init = (ops, run) => ops === undefined
  ? METAPROC(METAPROC.standard)
  : METAPROC(ops.flat(), run)

/**
 *
 *  Define "Standard" METAPROC operations
 *
 */

METAPROC.standard = [

  // ap :: (STATE -> VOID) -> METAPROC
  // "Applies" function to STATE on run:
  METAPROC.op("ap", (fn) => async (STATE) => {
    await fn(STATE);
  }),

  // apif :: (STATE -> BOOLEAN, STATE -> VOID) -> METAPROC
  // Only applies function to STATE on run if given predicate applied to STATE is TRUE:
  METAPROC.op("apto", (id, fn) => async (STATE) => {
    STATE[id] = await fn(STATE[id], STATE);
  }),

  // apto :: (STRING, * STATE|UNDEFINED -> VOID) -> METAPROC
  // Applies function to property of STATE
  // NOTE: STATE argument of given function is OPTIONAL:
  METAPROC.op("apif", (pred, fn) => async (STATE) => {
    if (pred(STATE) === true) {
      await fn(STATE);
    }
  }),

  // aptoif :: (* STATE|UNDEFINED -> BOOLEAN, STRING, * STATE|UNDEFINED -> VOID) -> METAPROC
  // Only applies function to propert of STATE on run if given predicate applied to STATE property and STATE is TRUE:
  // NOTE: STATE argument of given function and predicate is OPTIONAL:
  METAPROC.op("aptoif", (pred, id, fn) => async (STATE) => {
    if (pred(STATE[id], STATE) === true) {
      STATE[id] = await fn(STATE[id], STATE);
    }
  }),

  // aptoifnot :: (STRING, STATE -> *) -> METAPROC
  // Applies function to property of STATE if that property does not existL
  METAPROC.op("aptoifnot", (id, fn) => async (STATE) => {
    if (STATE[id] === undefined) {
      STATE[id] = await fn(STATE);
    }
  })

]
