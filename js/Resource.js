var ResourceLibrary = (function() {
    "use strict";

    var baseUrl = "";

    /**
     * This is a cache of resources to reduce the number of calls that need to be made.
     */
    var cache = {};
    
    function Resource(data, id) {
        this.id = id;
        this.relations = null;
        if (data) {
            $.extend(this, data);
        }
    }

    Resource.prototype.getRelations = function(callback) {
        var _this = this;

        if (this.relations) {
            callback();
        } else {
            var url = baseUrl + "relations?id=" + this.id;
            $.ajax(url, {
                dataType: "json",
                success: function(data) {
                    _this.relations = data.relations;
                    callback();
                }
            });
        }
    };

    // TODO: Change this
    Resource.prototype.loadResourcesFromRelations = function(relationRole, test, callback) {
        test = test || function (resource) { return true; };

        var filteredRelations = this.relations.filter(test);

        async.map(filteredRelations, function(relation, asyncCallback) {

            // We have a relation. Get the resource
            ResourceLibrary.load(relation[relationRole], function (resource) {
                asyncCallback(null, resource);
            });
        }, function (err, results) {
            callback(results);
        });
    };

    Resource.prototype.getTranscripts = function(callback, additionalTest) {
        var _this = this;
        var test = function (relation) {
            var isTranscript = relation.type == "transcriptOf" && relation.objectId == _this.id;
            var passesAdditionalTest = true;
            if (additionalTest)
                passesAdditionalTest = additionalTest(relation);
            return isTranscript && passesAdditionalTest;
        };
        this.getRelations(function () {
            _this.loadResourcesFromRelations("subjectId", test, callback);
        });
    };

    Resource.prototype.getAnnotations = function(callback, additionalTest) {
        var _this = this;
        var test = function (relation) {
            var isAnnotations = relation.type == "references" && relation.objectId == _this.id && relation.attributes.type === "annotations";
            var passesAdditionalTest = true;
            if (additionalTest)
                passesAdditionalTest = additionalTest(relation);
            return isAnnotations && passesAdditionalTest;
        };
        this.getRelations(function () {
            _this.loadResourcesFromRelations("subjectId", test, callback);
        });
    };
    
    return {
        setBaseUrl: function(url) {
            baseUrl = url;
        },
        load: function (id, callback) {
            if (cache[id]) {
                callback(cache[id]);
            } else {
                var url = baseUrl + "resources/" + id;
                $.ajax(url, {
                    dataType: "json",
                    success: function(data) {
                        if (callback) {
                            var resource = new Resource(data.resource, id);
                            cache[id] = resource;
                            callback(resource);
                        }
                    }
                });
            }
        },
        Resource: Resource
    };
}());