// CONSTRUCTOR :: [METAPORC.OP(id, fn)], [STATE -> PROMISE(STATE)], [METAPROC.METHOD(id, fn)] -> metaproc
// NOTE: Stores callable contexts for operators and methods in parameters of the self invoking function
// returned by the consturctor:
module.exports = METAPROC = (OPS, FNS, METHODS) => ((ops, fns, methods) => {

  // Initializes all operations and methods, binding them to a new instance:
  return OPS.concat(METHODS).reduce((instance, initFN) => initFN(instance, ops, fns, methods), {

    /**
     *
     *  "Instance" Methods
     *
     */

     // Binds operation to instance of metaproc:
    "op":(id, fn) => METAPROC.OP(id, fn)(OPS, FNS, METHOD)(METAPROC(OPS,FNS,METHODS)),

    // Binds method to instance of metaproc:
    "method":(id, fn) => METAPROC.METHOD(id, fn)(METAPROC(OPS,FNS,METHODS), OPS, FNS, METHODS),

    // Concatenates this function stack with a given function stack:
    "chain":(metaproc) => METAPROC(OPS, FNS.concat(metaproc.lift().fns), METHODS),

    // Returns operations and function stack of this instance:
    "lift":() => ({"ops":ops,"fns":FNS,"methods":methods}),

    // Applies STATE to function stack and returns promise of result:
    "run":(STATE) =>  FNS.reduce((promise, fn) => {
      return promise.then(async (STATE) => {
        try {
          return await fn(STATE);
        } catch (err) {
          throw {"msg":err, "STATE":STATE}
        }
      })
    }, Promise.resolve(STATE))

  })

})({}, FNS || [], {});

/**
 *
 *  "Static" Methods
 *
 */

// :: [[METAPROC.OP]], [[(STATE) -> PROMISE(STATE)]], [[METAPROC.METHOD]] -> metaptoc
// Static factory method for initalzing an instance of METAPROC from an array of OPS, function stacks, and METHODs:
// NOTE: All arrays are flattened before instance is intialized:
METAPROC.init = (ops, fns, methods) => METAPROC(
  ops !== undefined ? ops.flat() : [],
  fns !== undefined ? fns.flat() : [],
  methods !== undefined ?  methods.flat() : []
);


// :: STRING, (STATE) -> PROMISE(STATE) -> metaproc, {STRING:(STATE) -> PROMISE(STATE)}, {STRING:(metaproc) -> *} -> metaproc
// Bind operation to instance using given id:
METAPROC.OP = (id, fn) => (metaproc, ops, fns, methods) => {
  // Add op to op context:
  ops[id] = fn;
  // Arguments are passed to the operation's function since not all operations use the same arguments:
  metaproc[id] = (...args) => {
    // Add function to function stack:
    fns.push(async (STATE) => {
      return await METAPROC.OP.run(STATE, () => fn.apply(null, args), ops);
    });
    // Returns instance so that operations are chainable:
    return metaproc;
  }
  // Returns instance so that another operation can be bound from OPS:
  return metaproc;
}

// :: (OBJECT, (*) -> PROMISE(STATE), {OP_ID:OP_FN}, *) -> *
// Recursively runs operation until result is a value:
// NOTE: This is needed if an OP calls another OP, it will return a function:
METAPROC.OP.run = (STATE, fn, ops, result) => (async () => {
  if (result) {
    // Check if value is a function:
    if (result instanceof Function) {
      result = await result.call(ops, STATE);
      return METAPROC.OP.run(STATE,fn, ops, result);
    }
    return result;
  }
  // Runs OP in context of OPS so operations can call each other using "this":
  result = await fn().call(ops, STATE)
  return METAPROC.OP.run(STATE,fn, ops, result)
})();

// :: (STRING, (metaproc) -> *) -> (metaproc, {STRING:(STATE) -> PROMISE(STATE)}, {STRING:(metaproc) -> *}) -> metaproc
// Binds method to instance of METAPROC:
METAPROC.METHOD = (id, fn) => (metaproc, ops, fns, methods) => {
  // Add method to method context:
  methods[id] = fn;
  // Bind function to instance using id:
  metaproc[id] = (...args) => {
    // All methods are called from a shared methods context so methods can call each other using "this":
    return fn.apply(null, args).call(methods, metaproc);
  }
  return metaproc;
}

// :: [(STATE) -> PROMISE(STATE)] -> metaproc
// Returns a new instance of METAPROC initialized with METAPROC.ops:
METAPROC.Standard = (fns) => METAPROC.init([METAPROC.ops], fns);

/**
 *
 *  Operations
 *
 */

METAPROC.ops = [

  // "Applies" function to STATE, returning the result as STATE:
  METAPROC.OP("ap", (fn) => async function (STATE) {
    return await fn(STATE);
  }),

  // Only applies function to STATE if predicate applied to STATE is TRUE:
  METAPROC.OP("apif", (pred, fn) => async function (STATE) {
    return pred(STATE) === true ? this.ap(fn) : STATE;
  }),

  // Only applies function to STATE if STATE is undefined:
  METAPROC.OP("apifnot", (fn) => async function (STATE) {
      return this.apif((STATE) => STATE === undefined, fn);
  }),

  // Applies function to property of STATE:
  METAPROC.OP("apto", (id, fn) => async function (STATE) {
    STATE[id] = await fn(STATE[id], STATE);
    return STATE;
  }),

  // Only applies function to property of STATE if predicate applied to PROPERTY and STATE is TRUE:
  METAPROC.OP("aptoif", (id, pred, fn) => async function (STATE) {
    return pred(STATE[id], STATE) === true ? this.apto(id, fn) : STATE;
  }),

  // Only applies function to property of STATE if property does not exist:
  METAPROC.OP("aptoifnot", (id, fn) => async function (STATE) {
    return this.aptoif(id, (id) => id === undefined, fn);
  }),

  // Binds value to STATE using given id
  METAPROC.OP("as", (id, val) => async function (STATE) {
    return this.apto(id, (id) => val);
  }),

  // Only binds value to STATE using given id if predicate applied to PROPERTY and STATE is TRUE:
  METAPROC.OP("asif", (id, pred, val) => async function (STATE) {
    return this.aptoif(id, pred, (id) => val);
  }),

  // Only binds value to STATE using given id if PROPERTY does not exist:
  METAPROC.OP("asifnot", (id, val) => async function (STATE) {
    return this.aptoifnot(id, (id) => val);
  }),

  // Applies function to STATE and consoles out result
  // NOTE: If no function is given, all of STATE is consoles out:
  METAPROC.OP("log", (fn) => async function (STATE) {
    console.log(fn !== undefined ? await fn(STATE) : STATE);
    return STATE;
  })

]
