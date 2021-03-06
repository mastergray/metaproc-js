const METAPROC = require("../index.js");
const delay = (delay, fn) => (STATE) => new Promise((resolve, reject) => {
  setTimeout(function () {
    try {
      resolve(fn(STATE));
    } catch (err) {
      reject(err);
    }
  }, delay);
});
const adder = (time, num) => delay(time, (STATE) => {
  console.log(`Added ${num} to ${STATE} in ${time} ms...`);
  return STATE + num;
})

let a = (STATE) => METAPROC.Standard(STATE)
  .asifnot("x", 5)
  .asifnot("y", 10)
  .asifnot("z", 100)

let b = (STATE) => METAPROC.Standard(STATE)
  .apto("y", adder(1000,6))
  .apto("x", adder(2000, -7))

let c = (STATE) => METAPROC.Standard(STATE)
  .aptoif("y", (y) => y > 10, (y) => {throw "Y is to large!"})

let d = (STATE) => METAPROC.Standard(STATE)
  .augment("adder", (id, delay, value) => (metaproc) => metaproc.apto(id, adder(delay,value)))

let e = (STATE) => METAPROC.Standard(STATE)
  .absorb(d)
  .augment("subtractor", (id, delay, value) => (metaproc) => metaproc.adder(id, delay, value * -1))
  .augment("subtractif", (id, pred, delay, value) => (metaproc) => metaproc.ap(async (state) => {
    return pred(state[id], state) === true ? await metaproc.subtractor(id, delay, value).lift(state => state) : state
  }))
  .subtractif("z", (z) => z !== undefined, 1234, 200)


METAPROC.Standard()
  .chain(a).log()
  .chain(b).log()
  //.chain(c)
  //.chain(e).log()
  //.chain(e)
  .absorb(e).subtractor("y", 50, 1000).log()
  //.chain(c)
  //.chain(b).log()
  //.chain(e).log()
  /*.absorb(e)
  .adder("z", 500, 250).log()
  .subtractor("z", 50, 100).log()
  .run({"x":1000})*/
  .log((STATE) => `Done: ${JSON.stringify(STATE)}`)
.fail()
