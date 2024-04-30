# metaproc-js

METAPROC is an extensible state monad for JavaScript, designed for managing and processing asynchronous operations in a sequential and predictable order. It wraps state into a monadic structure, allowing transformations through a chain of operations defined as functions. This approach helps in handling side effects cleanly and provides a structured method to deal with asynchronous state transformations.

## Features

- **Sequential Processing**: Ensures that asynchronous operations are processed in the order they are defined.
- **Extensibility**: Easily extend with new operations via the `augment` method.
- **Error Handling**: Robust error handling capabilities that allow errors to be re-thrown or logged with the current state for easier debugging.
- **Flexible State Manipulation**: Provides methods like `fmap`, `chain`, and `lift` for versatile manipulations of the wrapped state.

## Usage

### Basic Example

Here's a simple example to demonstrate creating a METAPROC instance and applying functions to the state:

```javascript
const initialState = Promise.resolve({ count: 0 });

const increment = (state) => ({ ...state, count: state.count + 1 });
const double = (state) => ({ ...state, count: state.count * 2 });

// Create a METAPROC instance
const proc = METAPROC(initialState, [])
  .fmap(increment)
  .fmap(double);

proc.lift(console.log);  // Output: { count: 2 }
```

### Augmenting with New Operations

You can define new methods that can be chained to your METAPROC instance:

```javascript
// Define a new operation
METAPROC.OP('addFive', (metaproc) => metaproc.fmap(state => ({ ...state, count: state.count + 5 })));

// Use the new operation
const proc = METAPROC(initialState, [])
  .addFive();

proc.lift(console.log);  // Output: { count: 5 }
```

### Handling Errors

Errors during state transformations can be handled gracefully:

```javascript
const errorProneOperation = (state) => {
  throw { msg: "Something went wrong", STATE: state };
};

const proc = METAPROC(initialState, [])
  .fmap(errorProneOperation)
  .fail(console.error);  // Error handling
```

## API Reference

### Instance Methods

- **`fmap(fn)`:** Applies a function to the wrapped state and returns a new METAPROC instance.
- **`lift(fn)`:** Applies a function directly to the wrapped state and additional operations.
- **`chain(fn)`:** Chains another METAPROC instance and merges their operations.
- **`augment(id, fn)`:** Binds a new method to the METAPROC instance.
- **`absorb(fn, onlyInclude)`:** Binds methods from another METAPROC instance conditionally based on provided identifiers.
- **`fail(fn)`:** Adds error handling to the operations.

### Static Methods

- **`METAPROC.of(state, ops)`:** Creates a new METAPROC instance.
- **`METAPROC.OP(id, fn)`:** Creates a new operation that can be added to METAPROC instances.

## Acknowledgements
This has had more testing, but still not nearly enough. See some examples in test/index.js - more documentation to come. 
