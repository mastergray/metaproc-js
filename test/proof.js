// My attempt at "proving" METAPROC is in fact - a monad:
// NOTE: https://medium.com/javascript-scene/javascript-monads-made-simple-7856be57bfe8
const METAPROC = require("../index.js");

/**
 *
 *  What we will be comparing
 *
 */

let x = (STATE) => STATE * 2;                      // Value that can be "wrapped" by monad
let f = (FNS) => METAPROC.of(FNS);                 // Wraps value using monadic "unit" operation
let m = METAPROC.of((STATE) => STATE + 5);         // Monad with wrapped value
let p = (STATE) => STATE + 10;                     // A function that adds 10 to STATE
let q = (STATE) => STATE + 100;                    // A function that adds 100 to STATE
let g = (FNS) => METAPROC.of(FNS).fmap(p).fmap(q); // Wraps value and applies "p" and "q" functions to wrapped value

/**
 *
 *  How we will be comparing
 *
 */

// :: (STRING, METAPROC, METAPROC) -> VOID
// Display message and result of comparing the "wrapped" value of one monad with the "wrapped" value of another:
function isEq(msg, ma, mb) {
  return (async (state) => {
    let a = await ma.run(state);
    let b = await mb.run(state);
    console.log(`${msg} | ${a === b}`);
  })(5);
}

/**
 *
 *  And here we go...
 *
 */

// Assuming that the equality we are checking for is the monadic value, i.e. the STATE wrapped by METAPROC:
isEq('Left identity: unit(x).chain(f) === f(x)', METAPROC.of(x).chain(f), f(x));
isEq('Right identity: m.chain(unit) ==== m', m.chain(METAPROC.of), m);
isEq("Associativity: m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))", m.chain(f).chain(g), m.chain((x) => f(x).chain(g)));
