# rebundler

Simple reuse of cache from previous browserify builds. Supports cache invalidation without file watching.

## Usage

```js
var rebundler = require("rebundler");
var entry = rebundler(function(cache, packageCache) {
  return browserify("./entry.js", {
    cache: cache,
    packageCache: packageCache,
    fullPaths: true
    // ... other options
  })
  .transform('brfs')
  //... etc
});

// ...

// GET /entry.js will be slow the first time, but all subsequent requests will re-use 
// the cache from the previous build and be much faster

app.get("/entry.js", function(req, res) {
  entry()
    .bundle()
    .pipe(res);
});
```

## API

`rebundler([options], browserifyFn)`

Where `browserifyFn` is a function that accepts a `cache` and `packageCache` arguments and returns a browserify instance.
Important: The returned browserify instance must have its `fullPaths` option set to true.

`rebundler(browserifyFn)` Returns a function that, when called, will pass the cache from its previous call to the `browserifyFn` and return the created browserify instance. If any of the files included in the previous build has changed, they will be removed from the cache, and re-analyzed again by browserify.

### Options:

The only option currently supported is:

- `noop: true|false` Default false. If set to true, no cache checks/invalidation will be performed and the `browserifyFn` will be passed empty `cache` and `packageCache` objects on every call. This can be used to switch of caching behaviour in an production enviroment.