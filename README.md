# apostrophe-db-mongo-3-driver

## The problem to be solved

You have Apostrophe 2.x. You want to use the new [MongoDB 3.x Node.js drivers](http://mongodb.github.io/node-mongodb-native/3.1) to access newer features of MongoDB 3.6 or above, but by default Apostrophe uses the MongoDB 2.x Node.js drivers. This module changes that.

In addition, this module patches the newer driver to support certain features of the old one, so that both Apostrophe core and your own project-level code based on the 2.x driver can work properly. However, there is a **major bc break** that cannot be patched and you must mitigate it manually using the convenience method below.

## The major bc break, and how to work around it

The MongoDB 3.x driver does not accept a `projection` as the second argument to the `find` method. It accepts an `options` object instead.

Unfortunately, there is no guaranteed way to detect the difference. So rather than patching `find()`, we have provided a new `findWithProjection()` method, which operates like the old `find()`. And, **we are also adding this method to the 2.x driver, in the Apostrophe core.** Alongside this, we are in the process of migrating all of our own `find()` calls to use `findWithProjection()`. If you find an omission, please submit a PR.

> **This bc break DOES NOT concern code that uses Apostrophe's own `find(req)` methods. That code should not change.** This bc break ONLY concerns code that talks to MongoDB collection objects **directly**.

## Version numbers: don't be confused

The version number of the Node.js driver and the MongoDB server are **not** directly related. If you are not using at least MongoDB 3.6, you don't need this module. However, you *may* use it with any version of MongoDB server back to 2.6.

## Usage

`npm install apostrophe-db-mongo-3-driver`

```javascript
// in app.js
require('apostrophe')({ 
  modules: {
    // database options, if any, still go here like always
    'apostrophe-db': {
      uri: 'mongodb://localhost:27017/dbname'
    },
    // This module must be activated but should not be configured further,
    // as it improves the `apostrophe-db` module to use the new driver
    'apostrophe-db-mongo-3-driver': {}
});
```

## Differences and warnings

## You must use `findWithProjection` if you do not wish to rewrite your native MongoDB code to use the new options object

As described above, you must use `findWithProjection` if you wish to continue writing MongoDB code like this:

```javascript
self.apos.docs.db.find({ size: 5 }, { title: 1, slug: 1, tags: 1 }).toArray()...
```

That must change to:

```javascript
self.apos.docs.db.findWithProjection({ size: 5 }, { title: 1, slug: 1, tags: 1 }).toArray()...
```

Since **this method is also added to the old MongoDB 2.x driver in the Apostrophe core**, you can make this change safely in code that may use the 2.x or 3.x driver.

Of course you can also rewrite your code to use 3.x-style find() calls, however that will result in code that only runs on the 3.x driver, so be aware.

### `nextObject()` is still available

Although removed in the 3.x driver, this module patches it to invoke the identical `next` method.

### Your connection URI must be properly URL-escaped 

When using the `uri` option you must correctly uri-escape usernames, passwords and other substrings that might contain just about any punctuation. From the MongoDB driver changelog:

"Whereas before `mongodb://u$ername:pa$$w{}rd@/tmp/mongodb-27017.sock/test` would have been a valid connection string (with username `u$ername`, password `pa$$w{}rd`, host `/tmp/mongodb-27017.sock` and database `test`), the connection string for those details would now have to be provided as `mongodb://u%24ername:pa%24%24w%7B%7Drd@%2Ftmp%2Fmongodb-27017.sock/test`."

If you use the `host`, `username`, `password` and `name` options this module will escape the URI properly for you.

To further ease the encoding process, a new `params` option has been added. If present, this object is encoded as the query string of the URI for you. Thus you can configure the entire connection without escaping your own URI, unless you already have a correct one handy.

### The `db` option does not make a new `Db` object

With the 2.x driver, you can pass an existing `Db` object to apostrophe as the `db` option to `apostrophe-db`, and it will create a new `Db` object that accesses the right database for this particular site. With the 3.x driver, you must pass your existing `MongoClient` object as the `client` option to achieve the same effect. In this case Apostrophe will use it to obtain a `Db` object but will not attempt to close the client when the `apos` object is destroyed.

The `db` option does still exist, but can only be used to supply a database object that is already connected to the right database. Apostrophe cannot close the client for you in this case as it does not have any way to access it.

### The `client` object is now available as `apos.modules['apostrophe-db'].client`

With the 3.x driver, you cannot get back to the client object from the `db` object. If you need the MongoDB client object, you may access it as `apos.modules['apostrophe-db'].client`.

### apostrophe-multisite

Not yet compatible with `apostrophe-multisite`.

### bc breaks not relevant to Apostrophe core modules are not currently patched

There are no patches for the following methods removed in the 3.x driver which Apostrophe never calls:

```
Db.prototype.authenticate
Db.prototype.logout
Db.prototype.open
Db.prototype.db
Db.prototype.close
Admin.prototype.authenticate
Admin.prototype.logout
Admin.prototype.profilingLevel
Admin.prototype.setProfilingLevel
Admin.prototype.profilingInfo
```

There are no patches for differences in the behavior of these features unused by Apostrophe core modules:

Bulk writes
Variadic calls (without an array) to `aggregate`
[Additional bc breaks documented in the MongoDB driver changelog](https://github.com/mongodb/node-mongodb-native/blob/HEAD/CHANGES_3.0.0.md)

## Further reading

You should [read the MongoDB driver changelog](https://github.com/mongodb/node-mongodb-native/blob/HEAD/CHANGES_3.0.0.md).

