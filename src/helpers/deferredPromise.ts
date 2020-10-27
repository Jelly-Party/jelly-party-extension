// see https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-function-scope
export class DeferredPromise<T> {
  _promise: Promise<T>;
  resolve!: (value?: T) => void;
  reject!: (reason?: any) => void;
  then: Promise<T>["then"];
  catch: Promise<any>["catch"];
  finally: Promise<any>["finally"];

  constructor() {
    this._promise = new Promise((resolve, reject) => {
      // assign the resolve and reject functions to `this`
      // making them usable on the class instance
      this.resolve = resolve;
      this.reject = reject;
    });
    // bind `then`, `catch` and `finally` to implement the same interface as Promise
    this.then = this._promise.then.bind(this._promise);
    this.catch = this._promise.catch.bind(this._promise);
    this.finally = this._promise.finally.bind(this._promise);
  }
}
