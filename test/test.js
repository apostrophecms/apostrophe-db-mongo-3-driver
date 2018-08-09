const assert = require('assert');
const _ = require('lodash');

describe('apostrophe-db-mongo-3-driver', function() {

  let apos;

  this.timeout(5000);

  after(function(done) {
    require('apostrophe/test-lib/util').destroy(apos, done);
  });

  /// ///
  // EXISTENCE
  /// ///

  it('should be a property of the apos object', function(done) {
    apos = require('apostrophe')({
      testModule: true,

      modules: {
        'apostrophe-db-mongo-3-driver': {},
        'apostrophe-pages': {
          park: [
            {
              slug: '/test',
              type: 'testPage',
              navigation: {
                type: 'area',
                items: [
                  {
                    type: 'navigation',
                    _id: 'xyz',
                    by: 'id',
                    ids: [ 'placeholder' ]
                  }
                ]
              }
            },
            {
              slug: '/about',
              type: 'testPage',
              title: 'About',
              published: true
            }
          ],
          types: [
            {
              name: 'home',
              label: 'Home'
            },
            {
              name: 'testPage',
              label: 'Test Page'
            }
          ]
        }
      },
      afterInit: function(callback) {
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  it('verify this is the 3.x+ driver', function() {
    // does not have geoNear (2.x does)
    assert(!apos.docs.db.geoNear);
    // does have our telltale
    assert(apos.docs.db.aposVerifyPatched);
  });

  it('fetch all docs with findWithProjection()', function(done) {
    return apos.docs.db.findWithProjection({}, { slug: 1 }).toArray(function(err, docs) {
      assert(!err);
      assert(docs);
      assert(docs.length);
      // Make sure projection worked
      assert(docs[0].slug);
      assert(!_.find(docs, function(doc) {
        return doc.published;
      }));
      done();
    });
  });

  it('again, with promises', function() {
    return apos.docs.db.findWithProjection({}, { slug: 1 }).toArray().then(function(docs) {
      assert(docs);
      assert(docs.length);
      // Make sure projection worked
      assert(docs[0].slug);
      assert(!_.find(docs, function(doc) {
        return doc.published;
      }));
    });
  });

  it('fetch all docs via apostrophe', function() {
    return apos.docs.find(apos.tasks.getReq(), {}, { slug: 1, published: 1 }).toArray().then(function(docs) {
      assert(docs);
      assert(docs.length);
      // Make sure projection worked
      assert(docs[0].slug);
      assert(!_.find(docs, function(doc) {
        return doc.type;
      }));
    });
  });

  it('no projection passed: fetch all docs with findWithProjection()', function(done) {
    return apos.docs.db.findWithProjection({}).toArray(function(err, docs) {
      assert(!err);
      assert(docs);
      assert(docs.length);
      // Make sure projection worked
      assert(docs[0].slug);
      assert(_.find(docs, function(doc) {
        return doc.type;
      }));
      done();
    });
  });

  it('again, with promises', function() {
    return apos.docs.db.findWithProjection({}).toArray().then(function(docs) {
      assert(docs);
      assert(docs.length);
      // Make sure projection worked
      assert(docs[0].slug);
      assert(_.find(docs, function(doc) {
        return doc.type;
      }));
    });
  });

  it('fetch all docs via apostrophe, no projection', function() {
    return apos.docs.find(apos.tasks.getReq()).toArray().then(function(docs) {
      assert(docs);
      assert(docs.length);
      // Make sure projection worked
      assert(docs[0].slug);
      assert(_.find(docs, function(doc) {
        return doc.type;
      }));
    });
  });

});
