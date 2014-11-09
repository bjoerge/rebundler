var fs = require("fs");

module.exports = rebundler;

function rebundler(options, bundleFn) {
  if (typeof options === 'function') {
    bundleFn = options;
    options = {}
  }
  var cache = {};
  var pkgCache = {};
  var fileTimes = {};

  return function rebundle() {
    if (options.noop === true) {
      return bundleFn({}, {})
    }

    var bundle = bundleFn(cache, pkgCache);

    bundle.on('dep', function (row) {
      cache[row.id] = row;
      fileTimes[row.id] = fs.statSync(row.id).mtime;
    });

    Object.keys(fileTimes).forEach(function (file) {
      var lastMtime = fileTimes[file];
      try {
        var currMtime = fs.statSync(file).mtime;
        if (!currMtime || lastMtime < currMtime) {
          delete cache[file];
        }
      }
      catch (e) {
        if (e.code === 'ENOENT') {
          delete cache[file];
        }
      }
    });

    return bundle;
  };
}