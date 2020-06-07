// CONSTRUCTOR :: [METAPORC.OP(id, fn)|METAPROC.METHOD(id, fn)], [STATE -> PROMISE(STATE)] -> METAPROC
// Initializes all given operations and methods, binding them to a new instance:
module.exports = METAPROC = (BINDINGS, FNS) => METAPROC.initBindings(BINDINGS, FNS, {}, {

  /**
   *
   *  "Instance" Methods
   *
   */

   // (STRING, (*) -> (STATE) -> PROMISE(STATE)) -> METAPROC
   // Binds operation to instance of metaproc:
  "op":(id, fn) => METAPROC(BINDINGS.concat([METAPROC.OP(id, fn)]), FNS),

  // (STRING, (*) -> (METAPROC) -> *) -> METAPROC
  // Binds method to instance of metaproc:
  "method":(id, fn) => METAPROC(BINDINGS.concat([METAPROC.METHOD(id, fn)]), FNS),

  // :: (METAPROC) -> METAPROC
  // Concatenates this function stack with function stack of another instance:
  "chain":(metaproc) => METAPROC(BINDINGS, FNS.concat(metaproc.lift().fns)),

  // :: (METAPROC) -> METAPROC
  // Concantenates bindings of this instance with the bindings of another instance:
  "join":(metaproc) => METAPROC(BINDINGS.concat(metaproc.lift().bindings), FNS),

  // :: (VOID) -> {"ops":[METAPROC.OP(id, fn)], "fns":[(STATE) -> PROMISE(STATE)], "methods":[METAPROC.METHOD(id, fn)]}
  // Returns operations and function stack of this instance:
  "lift":() => ({"bindings":BINDINGS,"fns":FNS}),

  // :: (OBJECT) -> PROMISE(OBJECT)
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

});

/**
 *
 *  "Static" Methods
 *
 */

// init :: [METAPORC.OP(id, fn)|METAPROC.METHOD(id, fn)], [STATE -> PROMISE(STATE)] -> METAPROC
// Static factory method for initalzing an instance of METAPROC from an array of BINDINGs and function stacks:
// NOTE: Arrays are flattened before instance is intialized:
METAPROC.init = (bindings, fns) => METAPROC(
  bindings !== undefined ? bindings.flat() : [],
  fns !== undefined ? fns.flat() : []
);

// :: ([METAPROC.OP(id, fn)|METAPROC.METHOD(id, fn)], [(STATE) -> PROMISE(STATE)], {STRING:FUNCTION}} , METAPROC) -> METAPROC
// Returns an instance of metaproc with those given bindings bound:
// NOTE: This is also where the "binding context" is created to share calls between operations and methods using "this":
METAPROC.initBindings = (bindings, fns, ctx, metaproc) =>  {
  return bindings.reduce((metaproc, binding) => binding(metaproc, fns, ctx), metaproc);
}

// :: (STRING, * -> (STATE) -> PROMISE(STATE)) -> (METAPROC, [(STATE) -> PROMISE(STATE)], {STRING:FUNCTION}) -> METAPROC
// Bind operation to instance using given id:
// NOTE: An "operation" is a function that's applied to the function stack of an instance of METAPROC -
//       the function "fn" must return a promise of STATE
METAPROC.OP = (id, fn) => (metaproc, fns, ctx) => {
  // Bind operation to ctx:
  ctx[id] = fn;
  // Arguments are passed to the operation's function since not all operations use the same arguments:
  metaproc[id] = (...args) => {
    // Add function to function stack:
    fns.push(async (STATE) => {
      return await METAPROC.OP.run(STATE, () => fn.apply(null, args), ctx);
    });
    // Returns instance so that operations are chainable:
    return metaproc;
  }
  // Returns instance so that another operation can be bound from BINDINGS:
  return metaproc;
};

// :: (OBJECT, (*) -> PROMISE(STATE), {STRING:FUNCTION}, *) -> *
// Recursively runs operation until result is a value:
// NOTE: This is needed when an operation calls another operation since it will return a function:
METAPROC.OP.run = (STATE, fn, ctx, result) => (async () => {
  if (result) {
    // Check if value is a function:
    if (result instanceof Function) {
      result = await result.call(ctx, STATE);
      return METAPROC.OP.run(STATE,fn, ctx, result);
    }
    return result;
  }
  // Runs operation in context of all operations so operations can call each other using "this":
  result = await fn().call(ctx, STATE)
  return METAPROC.OP.run(STATE,fn, ctx, result)
})();

// :: (STRING, METAPROC -> *) -> (METAPROC, [(STATE) -> PROMISE(STATE)], {STRING:FUNCTION}) -> METAPROC
// Bind method to instance using given id:
// NOTE: A "method" is a function that's applied to the instance that it's bound to.
//       The function "fn" can return any value, but to be "chainable" - it must return an instance of METAPROC:
METAPROC.METHOD = (id, fn) => (metaproc, fns, ctx) => {
  // Bind method to context and instance:
  // The function is the same for both so methods can be called from other bindings
  // without having to pass a METAPROC instance
  metaproc[id] = ctx[id] = (...args) => fn.apply(null, args).call(ctx, metaproc);
  // Returns instance so that another method can be bound from BINDINGS:
  return metaproc;
};

// :: [(STATE) -> PROMISE(STATE)] -> METAPROC
// Returns a new instance of METAPROC initialized with METAPROC.ops:
METAPROC.Standard = (fns) => METAPROC.init([METAPROC.ops], fns);

/**
 *
 *  Operations
 *
 */

METAPROC.ops = [

  // ap :: (STATE -> STATE) -> PROMISE(STATE)
  // "Applies" function to STATE, returning the result as STATE:
  METAPROC.OP("ap", (fn) => async function (STATE) {
    return await fn(STATE);
  }),

  // apif :: (STATE -> BOOLEAN, STATE -> STATE) -> PROMISE(STATE)
  // Only applies function to STATE if predicate applied to STATE is TRUE:
  METAPROC.OP("apif", (pred, fn) => async function (STATE) {
    return pred(STATE) === true ? this.ap(fn) : STATE;
  }),

  // apifnot :: (STATE -> STATE) -> PROMISE(STATE)
  // Only applies function to STATE if STATE is undefined:
  METAPROC.OP("apifnot", (fn) => async function (STATE) {
      return this.apif((STATE) => STATE === undefined, fn);
  }),

  // apto :: (STRING, STATE -> STATE) -> PROMISE(STATE)
  // Applies function to property of STATE:
  METAPROC.OP("apto", (id, fn) => async function (STATE) {
    STATE[id] = await fn(STATE[id], STATE);
    return STATE;
  }),

  // aptoif :: (STRING, (PROPERTY, STATE) -> BOOLEAN, STATE -> STATE) -> PROMISE(STATE)
  // Only applies function to property of STATE if predicate applied to PROPERTY and STATE is TRUE:
  METAPROC.OP("aptoif", (id, pred, fn) => async function (STATE) {
    return pred(STATE[id], STATE) === true ? this.apto(id, fn) : STATE;
  }),

  // aptoifnot :: (STRING, STATE -> STATE) -> PROMISE(STATE)
  // Only applies function to property of STATE if property does not exist:
  METAPROC.OP("aptoifnot", (id, fn) => async function (STATE) {
    return this.aptoif(id, (id) => id === undefined, fn);
  }),

  // as :: (STRING, *) -> PROMISE(STATE)
  // Binds value to STATE using given id
  METAPROC.OP("as", (id, val) => async function (STATE) {
    return this.apto(id, (id) => val);
  }),

  // asif :: (STRING, (PROPERTY, STATE) -> BOOLEAN, *) -> PROMISE(STATE)
  // Only binds value to STATE using given id if predicate applied to PROPERTY and STATE is TRUE:
  METAPROC.OP("asif", (id, pred, val) => async function (STATE) {
    return this.aptoif(id, pred, (id) => val);
  }),

  // asifnot :: (STRING, *) -> PROMISE(STATE)
  // Only binds value to STATE using given id if PROPERTY does not exist:
  METAPROC.OP("asifnot", (id, val) => async function (STATE) {
    return this.aptoifnot(id, (id) => val);
  }),

  // :: (STATE -> *) -> PROMISE(STATE)
  // Applies function to STATE and consoles out result
  // NOTE: If no function is given, all of STATE is consoles out:
  METAPROC.OP("log", (fn) => async function (STATE) {
    console.log(fn !== undefined ? await fn(STATE) : STATE);
    return STATE;
  })

]
