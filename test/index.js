const METAPROC = require("../index.js")

METAPROC.Standard()
  .as("x", 5)
  .method("showFN", () => (metaproc) => {
    console.log(metaproc.lift().fns.length);
    return metaproc;
  })
  .op("add", (id, num) => async function (STATE) {
    return this.apto(id, (id) => id + num)
  })
  .showFN()
  .add("x", 10)
  .asifnot("y", 5)
  //.asif("x", (x) => x > 5, 8000)
  .aptoif("x", (x) => x < 5, (x) => {
   throw "no"
 })
 // .log((STATE) => STATE.x)
  .as("y", 10)
  .log()
  .showFN()
  .run({"x":0})
  .then((STATE) => {
    console.log("Done.")
  })
  .catch((err) => {
    console.log(err);
  })
