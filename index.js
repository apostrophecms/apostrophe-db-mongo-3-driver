const mongo = require('mongodb');
const _ = require('lodash');
const qs = require('qs');

module.exports = {
  improve: 'apostrophe-db',
  afterConstruct: function(self) {
    self.bcPatch();
  },
  construct: function(self, options) {
    self.connectToMongo = function(callback) {
      const dbName = options.name || self.apos.shortName;
      if (self.options.client) {
        self.client = self.options.client;
        self.apos.db = self.client.db(dbName);
        self.connectionReused = true;
        return callback(null);
      } else if (self.options.db) {
        // The db object we want has been passed in directly.
        // It must already be targeted to the proper database.
        //
        // With the 2.x driver this option has different semantics,
        // a new and independent db object is created from this
        // one, possibly targeting a new database name.
        //
        // Semantics are different with the 3.x driver,
        // where we can't make a new db object from an existing
        // one. Instead, use the client option for connection reuse.
        self.apos.db = self.options.db;
        return callback(null);
      }
      let Logger = null;
      if (process.env.APOS_MONGODB_LOG_LEVEL) {
        Logger = require('mongodb').Logger;
        // Set debug level
        Logger.setLevel(process.env.APOS_MONGODB_LOG_LEVEL);
      }
      let uri = 'mongodb://';
      const baseOptions = {
        autoReconnect: true,
        // retry forever
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 1000,
        useNewUrlParser: true
      };
      if (process.env.APOS_MONGODB_URI) {
        uri = process.env.APOS_MONGODB_URI;
      } else if (options.uri) {
        uri = options.uri;
      } else {
        if (options.user) {
          uri += e(options.user) + ':' + e(options.password) + '@';
        }
        if (!options.host) {
          options.host = 'localhost';
        }
        if (!options.port) {
          options.port = 27017;
        }
        if (!options.name) {
          options.name = self.apos.shortName;
        }
        uri += e(options.host) + ':' + e(options.port) + '/' + e(options.name);
        if (options.params) {
          uri += '?' + qs.stringify(options.params);
        }
      }

      // If a comma separated host list appears, or a mongodb+srv seedlist URI,
      // it's a replica set or sharded cluster. In either case, the autoReconnect
      // eature is undesirable and will actually cause problems, per the MongoDB
      // team:
      //
      // https://github.com/apostrophecms/apostrophe/issues/1508

      if (uri.match(/\/\/[^/]+,/) || uri.match(/^mongodb\+srv/)) {
        delete baseOptions.autoReconnect;
        delete baseOptions.reconnectTries;
        delete baseOptions.reconnectInterval;
      }

      const connectOptions = _.assign(baseOptions, self.options.connect || {});

      return mongo.MongoClient.connect(uri, connectOptions, function (err, client) {
        if (err) {
          self.apos.utils.error('ERROR: There was an issue connecting to the database. Is it running?');
          return callback(err);
        }
        self.client = client;
        const parsed = require('url').parse(uri, false, true);
        if (parsed.pathname && (parsed.pathname.length > 1)) {
          // Consistent with our 2.x behavior, we want to use whatever
          // the default database of the URI is
          self.apos.db = self.client.db();
        } else {
          // The database name wasn't specified, so base it on
          // the name option or the shortName
          self.apos.db = self.client.db(dbName);
        }
        return callback(null);
      });

      function e(s) {
        return encodeURIComponent(s);
      }
    };

    // Invoked by `callAll` when `apos.destroy` is called.
    // Closes the database client (if we own it) and the keepalive
    // interval timer.

    self.apostropheDestroy = function(callback) {
      if (self.keepaliveInterval) {
        clearInterval(self.keepaliveInterval);
      }
      if (!self.client) {
        // We were given a db object directly, we have
        // no way to access the client to close it
        return setImmediate(callback);
      }
      if (self.connectionReused) {
        // If we close our client, which is reusing a connection
        // shared by someone else, they will lose their connection
        // too, resulting in unexpected "topology destroyed" errors.
        // This responsibility should fall to the parent
        return setImmediate(callback);
      }
      return self.client.close(false, callback);
    };

    self.bcPatch = function() {
      const superFind = mongo.Collection.prototype.find;
      // Introduce a findWithProjection method supporting the old
      // 2.x (and prior) calling convention. This method supports
      // all of the previously valid ways of invoking `find()` in 2.x,
      // including calling with callbacks, returning promises, etc.
      // (provided there are no unrelated bc breaks to those features in 3.x).
      //
      // It operates by splicing the projection argument, when present,
      // into the new options argument.
      mongo.Collection.prototype.findWithProjection = function(query, projection) {
        if ((typeof projection) !== 'object') {
          return superFind.apply(this, arguments);
        }
        const args = Array.prototype.slice.call(arguments, 0);
        args[1] = {
          projection: args[1]
        };
        return superFind.apply(this, args);
      };

      mongo.Collection.prototype.aposVerifyPatched = true;

      // For bc, bring back the classic `nextObject` method name as a
      // simple alias for the `next` method.
      mongo.Cursor.prototype.nextObject = mongo.Cursor.prototype.next;
    };
  }
};
