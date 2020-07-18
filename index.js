// METAPROC :: STATE -> PROMISE(STATE), [OP] -> METAPROC
// An extensiable STATE monad for processing asynchronous operations in the order they're defined:
module.exports = METAPROC = (STATE, OPS) => OPS.reduce((metaproc, op) => op.fn(metaproc), {

  /**
   *
   *  "Instance" Methods
   *
   */

  // fmap :: (STATE -> STATE) -> METAPROC
  // Applies function to "lifted" STATE , then "re-wraps" result in new instance of METAPROC
  "fmap":(fn) => METAPROC.of(STATE.then(async (state) => {
    try {
      return await fn(state);
    } catch (err) {
      if (err.hasOwnProperty("msg") && err.hasOwnProperty("STATE")) {
          throw err; // Error has been re-caught, so keep on throwing
      }
      // Throws error message and current STATE value when error occurs:
      throw {"msg":err, "STATE":state};
    }
  }), OPS),

  // lift :: (STATE, [OP]) -> *
  // Applies function to "lifted" STATE and OPS values:
  // NOTE: I realize this could have been "join", but I felt "lift" better described how it's different from "chain":
  "lift":(fn) => fn(STATE, OPS),

  // chain :: (STATE -> METAPROC) -> METAPROC
  // Applies this STATE to another instance of METAPROC, re-wrapping the result of that application as a new instance:
  "chain":(fn) => METAPROC.of(STATE.then((state) => fn(state).lift(state => state)), OPS),

  // augment :: (STRING, METAPROC -> METAPROC) -> METAPROC
  // Binds new method to instance of METAPROC:
  "augment":(id, fn) => METAPROC.of(STATE, OPS.concat([METAPROC.OP(id, fn)])),

  // :: (STATE -> METAPROC, [STRING]) -> METAPROC
  // Binds methods of the given METAPROC instance returned by the given function to this METPAROC instance:
  // NOTE: Optional argument "onlyInclude" only returns OPS that match the OP.ids included in "onlyInclude" array
  // NOTE: Empty STATE is passed to prevent STATE manipulation when only lifting OPS:
  "absorb":(fn, onlyInclude) => METAPROC(STATE, OPS.concat(
    onlyInclude === undefined
      ? fn(Promise.resolve({})).lift((STATE, OPS) => OPS)
      : fn(Promise.resolve({})).lift((STATE, OPS) => OPS.filter(op => onlyInclude.includes(op.id)))
  )),

  // fail :: (err) -> *
  // Applies function to "catch" of PROMISE of STATE:
  // NOTE: If no function is given, then error is written to error console:
  // NOTE: This must be explicity called by a METAPROC instance, otherwise an uncaught promise notice will be thrown if anything fails:
  "fail":(fn) => METAPROC.of(fn === undefined ? STATE.catch((err) => console.error(err)) : STATE.catch(fn), OPS)

});

/**
 *
 * "Static" Methods
 *
 */

// unit :: (OBJECT|PROMISE(OBJECT), [OP]) -> METAPROC
// "Unit" monadaic operation for wrapping STATE value in PROMISE:
// NOTE: If STATE is already is PROMISE, passes value as is to METAPROC:
METAPROC.of = (STATE, OPS) => METAPROC(
  STATE === undefined
    ? Promise.resolve({}) : STATE instanceof Promise
    ? STATE : Promise.resolve(STATE),
  OPS || []
);

// OP :: (STRING, METAPROC -> METAPROC) -> OP
// OP constructor for binding new methods to METAPROC instance
// NOTE: "OP" methods apply functions to STATE using monadic operations provided by METAPROC:
METAPROC.OP = (id, fn) => ({
  "id":id,
  "fn":(metaproc) => Object.assign(metaproc, {[id]:(...args) => fn.apply(null, args).call(null, metaproc)})
});

/**
 *
 *  "Standard" Operations
 *
 */

// Augments METAPROC instance with utility methods for processing STATE with:
METAPROC.Standard = (STATE, OPS) => METAPROC.of(STATE, OPS)

  /**
   *
   *  Function application to STATE
   *
   */

  // ap :: (STATE -> STATE) -> (METAPROC) -> METAPROC
  // "Applies" function to STATE:
  .augment("ap", (fn) => (metaproc) => metaproc.fmap(fn))

  // apif :: (STATE) -> BOOLEAN, (STATE) -> STATE -> METAPROC -> METAPROC
  // Only applies function to STATE if predicate applied to STATE is TRUE:
  .augment("apif", (pred, fn) => (metaproc) => metaproc.ap(async (state) => await pred(state) ? await fn(state) : state))

  // apifnot :: ((STATE) -> STATE) -> METAPROC -> METAPROC
  // Only applies function to STATE if STATE is an empty OBJECT:
  // NOTE: Assumes OBJECT is empty if OBJECT has no "keys":
  .augment("apifnot", (fn) => (metaproc) => metaproc.apif((state) => Object.keys(state).length === 0 , fn))

  // apifonly :: ((STATE) -> STATE) -> METAPROC -> METAPROC
  // Only applies function to STATE if STATE is not an empty OBJECT:
  // NOTE: Assumes OBJECT empty if OBJECT has no "keys":
  .augment("apifonly", (fn) => (metaproc) => metaproc.apif((state) => Object.keys(state).length !== 0 , fn))

  /**
   *
   *  Function application to PROPERTY of STATE
   *
   */

  // apto :: (STRING, STATE -> STATE) -> (METAPROC) -> METAPROC
  // Applies function to PROPERTY of STATE:
  .augment("apto", (id, fn) => (metaproc) => metaproc.ap(async (state) => Object.assign(state, {[id]: await fn(state[id], state)})))

  // aptoif :: (STRING, (PROPERTY, STATE) -> BOOLEAN, STATE -> STATE) -> (METAPROC) -> METAPROC
  // Only applies function to PROPERTY of STATE if predicate applied to PROPERTY and STATE is TRUE:
  .augment("aptoif", (id, pred, fn) => (metaproc) => metaproc.ap(async (state) => {
    return await pred(state[id], id) ? await metaproc.apto(id, fn).lift((STATE) => STATE) : state;
  }))

  // aptoifnot :: (STRING, PROPERTY, STATE -> STATE) -> (METAPROC) -> METAPROC
  // Only applies function to PROPERTY of STATE if PROPERTY is UNDEFINED:
  .augment("aptoifnot", (id, fn) => (metaproc) => metaproc.aptoif(id, (id) => id === undefined, fn))

  // aptoifonly :: (STRING, PROPERTY, STATE -> STATE) -> (METAPROC) -> METAPROC
  // Only applies function to PROPERTY of STATE if PROPERTY is not UNDEFINED:
  .augment("aptoifonly", (id, fn) => (metaproc) => metaproc.aptoif(id, (id) => id !== undefined, fn))

  /**
   *
   *  Value binding to PROPERTY of STATE
   *
   */

  // as :: (STRING, *) -> (METAPROC) -> METAPROC
  // Binds value to STATE using given id
  .augment("as", (id, val) => (metaproc) => metaproc.apto(id, (id) => val))

  // asif :: (STRING, (PROPERTY, STATE) -> BOOLEAN, *) -> (METAPROC) -> METAPROC
  // Only binds value to STATE using given id if predicate applied to PROPERTY and STATE is TRUE:
  .augment("asif", (id, pred, val) => (metaproc) => metaproc.ap(async (state) => {
    return await pred(state[id], state) ? metaproc.as(id, val).lift((STATE) => STATE) : state
  }))

  // asifnot :: (STRING, *) -> (METAPROC) -> METAPROC
  // Only binds value to STATE using given id if PROPERTY is UNDEFINED:
  .augment("asifnot", (id, val) => (metaproc) => metaproc.asif(id, (id) => id === undefined, val))

  // asifonly ::  (STRING, *) -> (METAPROC) -> METAPROC
  // Only binds value to STATE using given id if PROPERTY is not UNDEFINED:
  .augment("asifonly", (id, val) => (metaproc) => metaproc.asif(id, (id) => id !== undefined, val))

  /**
   *
   *  Logging
   *
   */

  // (STATE -> VOID) -> (METAPROC) -> METAPROC
  // Applies function to STATE and consoles out result
  // NOTE: If no function is given, all of STATE is consoled out:
  .augment("log", (fn) => (metaproc) => metaproc.ap(async (state) => {
    console.log(fn !== undefined ? await fn(state) : state);
    return state;
  }));
