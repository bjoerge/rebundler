var fs = require('fs')
var debounce = require('debounce')
var assert = require('assert')
var debug = require('debug')('rebundler')
var mkdirp = require('mkdirp')
var path = require('path')

var cacheDir = path.join(process.cwd(), '.rebundler-cache')

module.exports = rebundler

function restoreCache (file) {
  debug('Reading cache from %s...', file)

  var cacheContent
  try {
    cacheContent = fs.readFileSync(file, 'utf-8')
  } catch(e) {
    if (e.code === 'ENOENT') {
      debug('No cache file found')
      return null
    } else {
      throw e
    }
  }

  try {
    var cache = JSON.parse(cacheContent)
    assert(typeof cache === 'object', 'Expected persisted cache to be an object')
    assert(typeof cache.deps === 'object', 'Expected persisted cache object to have a "deps" property')
    assert(typeof cache.pkgs === 'object', 'Expected persisted cache object to have a "pkgs" property')
    assert(typeof cache.mtimes === 'object', 'Expected persisted cache object to have a "mtimes" property')

    debug('Read %d deps and %d packages entries from %s',
        Object.keys(cache.deps).length,
        Object.keys(cache.pkgs).length,
        file
    )

    return cache
  } catch(e) {
    debug('Unable to read cache from file %s: %s', file, e.stack)
    return null
  }
}

function rebundler (options, bundleFn) {
  if (typeof options === 'function') {
    bundleFn = options
    options = {}
  }

  var cache, cacheFile = null
  if (options.persist) {
    debug('Checking for persisted cache')
    cacheFile = path.join(cacheDir, 'cache' + (options.persistKey ? '-' + options.persistKey : '') + '.json')
    cache = restoreCache(cacheFile)
  }
  cache = cache || {
      deps: {},
      pkgs: {},
      mtimes: {}
  }
  var dump = debounce(function dump () {
    debug('Dumping cache to disk...')
    mkdirp(cacheDir, function () {
      fs.writeFile(cacheFile, JSON.stringify(cache), function (err) {
        if (err) {
          throw err
        }
        debug('Wrote %d deps and %d packages entries to %s',
          Object.keys(cache.deps).length,
          Object.keys(cache.pkgs).length,
          cacheFile
        )
      })
    })
  }, 1000)

  return function rebundle () {
    debug('Rebundling')

    if (options.noop === true) {
      return bundleFn({}, {})
    }

    var bundle = bundleFn(cache.deps, cache.pkgs)

    bundle.on('dep', function (row) {
      cache.deps[row.id] = row
      cache.mtimes[row.id] = fs.statSync(row.id).mtime.getTime()
    })

    debug('Looking for modified deps invalidate')
    Object.keys(cache.mtimes).forEach(function (file) {
      var lastMtime = cache.mtimes[file]
      try {
        var currMtime = fs.statSync(file).mtime.getTime()
        if (!currMtime || lastMtime < currMtime) {
          debug('%s has changed since previous build, invalidating...', file)
          delete cache.deps[file]
        }
      } catch (e) {
        if (e.code === 'ENOENT') {
          debug('%s has been removed since previous build, invalidating...', file)
          delete cache.deps[file]
        } else {
          throw e
        }
      }
    })

    debug('Done looking for modified deps')

    if (options.persist) {
      bundle.on('dep', dump)
    }

    return bundle
  }
}
