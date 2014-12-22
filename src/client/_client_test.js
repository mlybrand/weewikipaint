/*global describe, it, expect */

(function() {
    "use strict";

    //var assert = chai.assert;

    describe("Nothing", function() {

        it("should run", function() {
            //assert.equal("foo", "foo");
            //"foo".should.equal("foo");
            expect("foo").to.equal("bar");
        });

    });
}());

