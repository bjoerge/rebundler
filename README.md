# rebundler

Simple reuse of cache from previous browserify builds. Supports cache invalidation without file watching.

## Usage

```js
var rebundler = require("rebundler");
var build = rebundler(function(cache, packageCache) {
  return browserify("./entry.js", {
    cache: cache,
    packageCache: packageCache,
    fullPaths: true
    // ... other options
  });
});
```

```js
// GET /entry.js will be slow the first time, but all subsequent requests will use the same cache and be much faster

app.get("/entry.js", function(req, res) {
  rebundle()
    .bundle()
    .pipe(res);
});
```

## API

`fn rebundler(bundleFn)`

bundleFn is a function that will be called with the `cache` and `packageCache` arguments
This function must return a browserify instance.
Important: The bundle must be created with the `fullPaths` option set to true.

Returns a function that when called will pass the cache from its previous call to the `bundleFn`
and return the new browserify instance. If any of the files included in the previous build has changed, they
will be removed from the cache, and re-analyzed again in this build.