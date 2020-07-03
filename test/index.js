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
const showError = (err) => {
  console.error(err);
  return err;
}

let a = METAPROC.Standard()
  .asifnot("x", 5)
  .asifnot("y", 10)
  .asifnot("z", 100)

let b = METAPROC.Standard()
  .apto("y", adder(1000,6))
  .apto("x", adder(2000, -7))

let c = METAPROC.Standard()
  .aptoif("y", (y) => y > 10, (y) => {throw "Y is to large!"})

let d = METAPROC.Standard()
  .augment("adder", (id, delay, value) => (metaproc) => metaproc.apto(id, adder(delay,value)))

let e = METAPROC.Standard()
  .absorbs(d)
  .augment("subtractor", (id, delay, value) => (metaproc) => metaproc.adder(id, delay, value * -1))
  .augment("subtractif", (id, pred, delay, value) => (metaproc) => metaproc.ap(async (state) => {
    return pred(state[id], state) === true ? await metaproc.subtractor(id, delay, value).lift(fns => fns(state)) : state
  }))
  .subtractif("z", (z) => z !== undefined, 1234, 200)

METAPROC.Standard()
  .chains(a).log()
  .chains(b).log()
  .absorbs(e).subtractor("y", 50, 1000).log()
  .chains(c)
  //.chain(b).log()
  .run()
  //.chain(e).log()
  /*.absorb(e)
  .adder("z", 500, 250).log()
  .subtractor("z", 50, 100).log()
  .run({"x":1000})*/
.then((STATE) => {
  console.log(`Done: ${JSON.stringify(STATE)}`)
})
.catch(showError)
