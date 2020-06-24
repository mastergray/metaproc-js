// My attempt at "proving" METAPROC is in fact - a monad:
// NOTE: https://medium.com/javascript-scene/javascript-monads-made-simple-7856be57bfe8
const METAPROC = require("../index.js");

/**
 *
 *  What we will be comparing
 *
 */

let x = {"x":true};                                // Value that can be "wrapped" by monad
let f = (val) => METAPROC.of(val);                 // Wraps value using monadic "unit" operation
let m = METAPROC.of({"m":true});                   // Monad with wrapped value
let p = (val) => {val.x = true; return val};       // A function that binds TRUE to the given value using "y"
let q = (val) => {val.y = true; return val};       // A function that binds TRUE to the given value using "y"
let g = (val) => METAPROC.of(val).fmap(p).fmap(q); // Wraps value and applied "p" and "q" functions to wrapped value

/**
 *
 *  How we will be comparing
 *
 */

// :: PROMISE(OBJECT) -> PROMISE(STRING)
// Lifts value from promise and returns Promise(STRING():
// NOTE: Assume value in promise is an OBJECT:
function toString(promise) {
  return promise.then((STATE) => JSON.stringify(STATE));
}

// :: (STRING, METAPROC, METAPROC) -> VOID
// Display message and result of comparing the "wrapped" value of one monad with the "wrapped" value of another:
function isEq(msg, ma, mb) {
  return (async () => {
    let a = await ma.lift(toString);
    let b = await mb.lift(toString);
    console.log(`${msg} | ${a === b}`);
  })();
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
