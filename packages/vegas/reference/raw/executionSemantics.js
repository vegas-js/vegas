// oxlint-disable no-unused-vars

var referenceExecutionVarState = 0;
let referenceExecutionLetState = 0;
const referenceExecutionConstState = {
  count: 0,
};

referenceExecutionVarState += 1;
referenceExecutionLetState += 1;
referenceExecutionConstState.count += 1;

function captureReferenceExecutionGlobalLifecycle() {
  const before = {
    varState: referenceExecutionVarState,
    letState: referenceExecutionLetState,
    constState: referenceExecutionConstState.count,
  };

  referenceExecutionVarState += 1;
  referenceExecutionLetState += 1;
  referenceExecutionConstState.count += 1;

  const after = {
    varState: referenceExecutionVarState,
    letState: referenceExecutionLetState,
    constState: referenceExecutionConstState.count,
  };

  return {
    before,
    after,
    globalBindings: {
      varOwnProperty: Object.prototype.hasOwnProperty.call(
        globalThis,
        "referenceExecutionVarState",
      ),
      letOwnProperty: Object.prototype.hasOwnProperty.call(
        globalThis,
        "referenceExecutionLetState",
      ),
      constOwnProperty: Object.prototype.hasOwnProperty.call(
        globalThis,
        "referenceExecutionConstState",
      ),
    },
  };
}

function captureReferenceExecutionNonStrictThis() {
  return {
    thisIsUndefined: this === undefined,
    thisIsNull: this === null,
    thisIsGlobalThis: this === globalThis,
    thisType: typeof this,
    thisTag: Object.prototype.toString.call(this),
  };
}

function captureReferenceExecutionStrictThis() {
  "use strict";

  return {
    thisIsUndefined: this === undefined,
    thisIsNull: this === null,
    thisIsGlobalThis: this === globalThis,
    thisType: typeof this,
    thisTag: this === undefined ? null : Object.prototype.toString.call(this),
  };
}

function captureReferenceEntryFunctionDeclaration() {
  return "function-declaration";
}

var captureReferenceEntryVarFunction = function () {
  return "var-function";
};

var captureReferenceEntryVarArrow = () => {
  return "var-arrow";
};

let captureReferenceEntryLetFunction = function () {
  return "let-function";
};

const captureReferenceEntryConstArrow = () => {
  return "const-arrow";
};

var captureReferenceEntryNonCallable = "non-callable";

function captureReferenceExecutionArgumentValues(
  stringValue,
  numberValue,
  booleanValue,
  nullValue,
) {
  return {
    stringValue: {
      type: typeof stringValue,
      value: stringValue,
    },
    numberValue: {
      type: typeof numberValue,
      value: numberValue,
    },
    booleanValue: {
      type: typeof booleanValue,
      value: booleanValue,
    },
    nullValue: {
      type: typeof nullValue,
      isNull: nullValue === null,
    },
  };
}

function captureReferenceExecutionArgumentRealm(objectValue, arrayValue) {
  return {
    objectValue: {
      type: typeof objectValue,
      isArray: Array.isArray(objectValue),
      prototypeIsObjectPrototype: Object.getPrototypeOf(objectValue) === Object.prototype,
      constructorIsObject: objectValue.constructor === Object,

      nestedObject: {
        prototypeIsObjectPrototype:
          Object.getPrototypeOf(objectValue.nestedObject) === Object.prototype,
        constructorIsObject: objectValue.nestedObject.constructor === Object,
      },

      nestedArray: {
        isArray: Array.isArray(objectValue.nestedArray),
        prototypeIsArrayPrototype:
          Object.getPrototypeOf(objectValue.nestedArray) === Array.prototype,
        constructorIsArray: objectValue.nestedArray.constructor === Array,
      },

      nestedArrayObject: {
        prototypeIsObjectPrototype:
          Object.getPrototypeOf(objectValue.nestedArray[1]) === Object.prototype,
        constructorIsObject: objectValue.nestedArray[1].constructor === Object,
      },
    },

    arrayValue: {
      isArray: Array.isArray(arrayValue),
      prototypeIsArrayPrototype: Object.getPrototypeOf(arrayValue) === Array.prototype,
      constructorIsArray: arrayValue.constructor === Array,

      nestedObject: {
        prototypeIsObjectPrototype: Object.getPrototypeOf(arrayValue[1]) === Object.prototype,
        constructorIsObject: arrayValue[1].constructor === Object,
      },

      nestedArray: {
        isArray: Array.isArray(arrayValue[2]),
        prototypeIsArrayPrototype: Object.getPrototypeOf(arrayValue[2]) === Array.prototype,
        constructorIsArray: arrayValue[2].constructor === Array,
      },
    },
  };
}

function captureReferenceExecutionPromiseResolve() {
  return Promise.resolve("promise-resolve");
}

async function captureReferenceExecutionAsyncReturn() {
  return "async-return";
}

function captureReferenceExecutionThenable() {
  return {
    // oxlint-disable-next-line no-thenable
    then(resolve) {
      resolve("thenable-resolve");
    },
  };
}

function captureReferenceExecutionPromiseReject() {
  return Promise.reject(new Error("promise-reject"));
}

async function captureReferenceExecutionAsyncThrow() {
  throw new TypeError("async-throw");
}

function captureReferenceExecutionThrowError() {
  throw new Error("sync-error");
}

function captureReferenceExecutionThrowTypeError() {
  throw new TypeError("sync-type-error");
}

function captureReferenceExecutionThrowString() {
  throw "sync-string";
}

function captureReferenceExecutionThrowNumber() {
  throw 42;
}

function captureReferenceExecutionThrowObject() {
  throw {
    kind: "sync-object",
    value: 42,
  };
}

function captureReferenceExecutionThrowNull() {
  throw null;
}
