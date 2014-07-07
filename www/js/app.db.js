/**
 * Copyright (c) 2013-2014 Memba Sarl. All rights reserved.
 * Sources at https://github.com/Memba/Kidoju-Platform
 */

/* jslint browser: true, jquery: true */
/* jshint browser: true, jquery: true */

;(function (win, $, undefined) {

    'use strict';

    var app = win.app = win.app || {},
        FUNCTION = 'function',
        DB_NAME = 'KidojuDB',

        DEBUG = true,
        MODULE = 'app.db.js: ';

    function log(message) {
        if(DEBUG && win.console && ($.type(win.console.log) === FUNCTION)){
            win.console.log(MODULE + message);
        }
    }
        
    //See http://nparashuram.com/trialtool/index.html#example=/IndexedDB/jquery/demo/trialtool.html
    //See http://nparashuram.com/jquery-indexeddb/example/
    //See https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

    app.db = {

        /**
         * Open the database after creating it of necessary
         * @returns {*} - a jQuery promise
         */
        open: function() {
            return $.indexedDB(DB_NAME, {
                'schema': {
                    '1': function(versionTransaction){
                        var contents = versionTransaction.createObjectStore('contents', {
                            'autoIncrement': false,
                            'keyPath': 'id'
                        });
                        //contents.createIndex("timestamp");
                        var activities = versionTransaction.createObjectStore('activities', {
                            'autoIncrement': false,
                            'keyPath': 'id'
                        });
                        //activities.createIndex("timestamp");
                    }
                    // Continue with the following versions of the site
                    // '2': function(versionTransaction){}
                }
            });
        },

        /**
         * Drop the database
         * @returns {*} - a jQuery promise
         */
        drop: function() {
            log('drop database');
            return $.indexedDB(DB_NAME).deleteDatabase();
        },

        /**
         * Returns a collection with methods to find, insert, update, remove records"
         * @param table
         * @returns {{clear: clear}}
         */
        collection: function(table) {
            return {
                /**
                 * Clear a collection/table
                 * @param table
                 * @returns {*} - a jQuery promise
                 */
                clear: function () {
                    log('clear ' + table);
                    return $.indexedDB(DB_NAME).objectStore(table).clear();
                },

                /**
                 * Insert a new record
                 * @param record
                 * @returns {*} - a jQuery promise
                 */
                insert: function (record) {
                    log('insert ' + table + ' record');
                    return $.indexedDB(DB_NAME).objectStore(table).add(record); //(value, key)
                },

                /**
                 * find a record by its id
                 * @param id
                 * @returns {*} - a jQuery promise
                 */
                find: function (id) {
                    log('get ' + table + ' record');
                    return $.indexedDB(DB_NAME).objectStore(table).get(id);
                },

                /**
                 * Update an existing record
                 * @param record
                 * @returns {*} - a jQuery promise
                 */
                update: function (record) {
                    log('update ' + table + ' record');
                    return $.indexedDB(DB_NAME).objectStore(table).put(record); //(value, key)
                },

                /**
                 * remove a record by its id
                 * @param id
                 * @returns {*} - a jQuery promise
                 */
                remove: function (id) {
                    log('remove ' + table + ' record');
                    return $.indexedDB(DB_NAME).objectStore(table)['delete'](id);
                },

                /**
                 * Iterate through records with/without an index key
                 * Can be called as iterator(callback) to iterate without index
                 * or as iterator(index, callback) to use an index key
                 * @param index
                 * @param callback
                 * @returns {*} - a jQuery promise
                 */
                each: function (index, callback) {
                    log('iterate over ' + table + ' records');
                    if ($.type(index) === 'function' && callback === undefined) {
                        callback = index;
                        return $.indexedDB(DB_NAME).objectStore(table).each(callback);
                    } else {
                        return $.indexedDB(DB_NAME).objectStore(table).index(index).each(callback);
                    }
                },

                /**
                 * count the number of records in the objectStore
                 * @param callback
                 * @returns {*}
                 */
                count: function(callback) {
                    log('count ' + table + ' records');
                    return $.indexedDB(DB_NAME).objectStore(table).count(callback);
                }
            };
        }
    };

}(this, jQuery));