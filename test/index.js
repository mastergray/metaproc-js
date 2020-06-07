const METAPROC = require("../index.js")

METAPROC.Standard()
  .as("x", 5)
  .method("showFN", () => function (metaproc) {
    let y =  this.ap((STATE) => STATE.y);
    console.log(y); // This returns an aysnc function because operations need to be applied to state,
                    // and methods don't have access to state since STATE is only defined when "run" is called,
                    // and only the function stack is applied to STATE by "run"
    console.log(`Value: ${metaproc.lift().fns.length}`);
    return metaproc;
  })
  .op("add", (id, num) => async function (STATE) {
    this.showFN(); // This shows 3 for ap, add, and apto - meaning calls by operations to other operations are
                   // placing addtional functions on to the stack - so while creating less space (in code)
                   // the cost is more time - since the function stack to be intialized is larger. Consider
                   // an "optimized" version of METAPROC.Standard where there are no calls to other calls,
                   // meaning each Standard op adds only one addtional function to the stack. That's not to say
                   // referencing ops and methods from other ops shouldn't be possible -
                   // it's just a trade off to be aware of
    return this.apto(id, (id) => id + num)
  })
  .add("x", 10)
  .asifnot("y", 5)
  .showFN()
  .asif("x", (x) => x > 5, 8000)
  .aptoif("x", (x) => x < 5, (x) => {
   throw "no"
  })
  .log((STATE) => STATE.x)
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
