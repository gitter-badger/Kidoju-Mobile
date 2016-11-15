/**
 * Copyright (c) 2013-2016 Memba Sarl. All rights reserved.
 * Sources at https://github.com/Memba
 */

/* jshint browser: true, jquery: true */
/* globals define: false */

(function (f, define) {
    'use strict';
    define([
        './vendor/blueimp/md5', // Keep at the top considering function arguments
        './vendor/kendo/kendo.core',
        './vendor/kendo/kendo.data',
        './window.assert',
        './window.logger',
        './kidoju.data',
        './kidoju.tools',
        './app.logger',
        './app.rapi',
        './app.cache',
        './app.db',
        './app.fs'
        // './app.models'
    ], f);
})(function (md5H) {

    'use strict';

    /* This function has too many statements. */
    /* jshint -W071 */

    /* This function's cyclomatic complexity is too high. */
    /* jshint -W074 */

    (function ($, undefined) {

        /* jshint maxcomplexity: 8 */

        /**
         * IMPORTANT NOTE 1
         * Lazy models are simplified/flattened readonly models (all properties are non-editable) to load in Lazy datasources
         * Other models are used for CRUD operations and might have nested models like MongoDB schemas
         *
         * IMPORTANT NOTE 2
         * All calculated fields used in MVVM to display properly formatted data are marked with an appended $
         * The reason is to recognize them in kendo templates where they should be used as functions with trailing ()
         * whereas they should be used as properties without trailing () in data-bind attributes
         */

        var app = window.app = window.app || {};
        var models = app.models = app.models || {};
        var kendo = window.kendo;
        var kidoju = window.kidoju;
        var Model = kidoju.data.Model;
        var DataSource = kidoju.data.DataSource;
        var assert = window.assert;
        var logger = new window.Logger('app.mobile.models');
        var md5 = md5H || window.md5;
        var rapi = app.rapi;
        var pongodb = window.pongodb;
        var db = app.db = new pongodb.Database({ name: 'KidojuDB', size: 5 * 1024 * 1024, collections: ['users', 'activities'] });
        var fileSystem = new window.FileSystem();
        // var i18n = app.i18n = app.i18n || { };
        var uris = app.uris = app.uris || {
                cdn: {
                    icons: 'https://cdn.kidoju.com/images/o_collection/svg/office/{0}.svg'
                },
                mobile: {
                    icons: './img/{0}.svg'
                }
            };
        var DATE = 'date';
        var FUNCTION = 'function';
        var STRING = 'string';
        var RX_MONGODB_ID = /^[a-f0-9]{24}$/;
        var DATE_0 = new Date(2000, 1, 1);
        var DOT = '.';

        /**
         * Initialize fileSystem ASAP
         */
        fileSystem.init(); // TODO: it can fail if the user does not allow storage

        /**
         * MobileUser model
         * @type {kidoju.data.Model}
         */
        models.MobileUser = Model.define({
            id: 'id', // the identifier of the model, which is required for isNew() to work
            fields: {
                id: { // mobile id, which cannot be the same as server id otherwise isNew won't work and appropriate transports won't be triggered in DataSource
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                sid: { // mongodb server id
                    type: STRING,
                    editable: false,
                    nullable: false
                },
                firstName: {
                    type: STRING,
                    editable: false,
                    nullable: false
                },
                lastName: {
                    type: STRING,
                    editable: false,
                    nullable: false
                },
                // Last time when the mobile device was synchronized with the server for that specific user
                lastSync: {
                    type: DATE,
                    editable: true,
                    nullable: false,
                    defaultValue: DATE_0
                },
                // The current user is the user with the most recent lastUse
                lastUse: {
                    type: DATE,
                    editable: true,
                    nullable: false,
                    defaultValue: DATE_0
                },
                md5pin: {
                    type: STRING,
                    editable: true,
                    nullable: true
                },
                picture: {
                    type: STRING,
                    editable: false,
                    nullable: false
                }
                // TODO: Consider theme and language
                // consider locale (for display of numbers, dates and currencies)
                // consider timezone (for display of dates), born (for searches)
            },
            fullName$: function () {
                return ((this.get('firstName') || '').trim() + ' ' + (this.get('lastName') || '').trim()).trim();
            },
            picture$: function () {
                /**
                 * Facebook
                 * --------
                 *
                 *
                 * Google
                 * --------
                 *
                 *
                 * Live
                 * --------
                 *
                 *
                 * Twitter
                 * --------
                 * Twitter urls are in the form https://pbs.twimg.com/profile_images/681812478876119042/UQ6KWVL8_normal.jpg
                 * We need to replace normal by 400x400 as in https://pbs.twimg.com/profile_images/681812478876119042/UQ6KWVL8_400x400.jpg
                 */
                return this.get('picture') || kendo.format(app.uris.mobile.icons, 'user');
            },
            mobilePicture$: function () {
                var temporary = fileSystem._temporary;
                if (temporary) {
                    // Note: we might want to check that this.picture$().split(DOT).pop() is a well known image extension
                    return kendo.format(app.uris.mobile.pictures, temporary.root.toURL(), this.get('sid') + DOT + this.picture$().split(DOT).pop());
                } else {
                    return kendo.format(app.uris.mobile.icons, 'user');
                }
            },
            /**
             * _saveMobilePicture should not be used directly
             * This is called from MobileUserDataSource
             * @returns {*}
             * @private
             */
            _saveMobilePicture: function () {
                var that = this;
                var dfd = $.Deferred();
                fileSystem.init()
                    .done(function () {
                        fileSystem.getDirectoryEntry('/users', window.TEMPORARY)
                            .done(function (directoryEntry) {
                                var fileName = that.get('id') + DOT + that.picture$().split(DOT).pop();
                                fileSystem.getFileEntry(directoryEntry, fileName)
                                    .done(function (fileEntry) {
                                        var remoteUrl = that.picture$();
                                        fileSystem.download(remoteUrl, fileEntry)
                                            .done(dfd.resolve)
                                            .fail(dfd.reject);
                                    })
                                    .fail(dfd.reject);
                            })
                            .fail(dfd.reject);
                    })
                    .fail(dfd.reject);
                return dfd.promise();
            },
            /**
             * Add a pin
             * @param pin
             */
            addPin: function (pin) {
                assert.type(STRING, pin, kendo.format(assert.messages.type.default, 'pin', STRING));
                assert.type(FUNCTION, md5, kendo.format(assert.messages.type.default, 'md5', FUNCTION));
                var salt = this.get('sid');
                assert.match(RX_MONGODB_ID, salt, kendo.format(assert.messages.match.default, 'salt', RX_MONGODB_ID));
                var md5pin = md5(salt + pin);
                this.set('md5pin', md5pin);
            },
            /**
             * Reset pin
             * @param pin
             */
            resetPin: function () {
                // TODO: remove if not used considering we check pin before
                this.set('md5pin', null);
            },
            /**
             * Verify pin
             * @param pin
             */
            verifyPin: function (pin) {
                assert.type(STRING, pin, kendo.format(assert.messages.type.default, 'pin', STRING));
                assert.type(FUNCTION, md5, kendo.format(assert.messages.type.default, 'md5', FUNCTION));
                var salt = this.get('sid');
                assert.match(RX_MONGODB_ID, salt, kendo.format(assert.messages.match.default, 'salt', RX_MONGODB_ID));
                var md5pin = md5(salt + pin);
                return this.get('md5pin') === md5pin;
            },
            /**
             * Load user from Kidoju-Server
             * @returns {*}
             */
            load: function () {
                var that = this;
                return app.cache.getMe()
                    .done(function (data) {
                        if ($.isPlainObject(data) && RX_MONGODB_ID.test(data.id)) {
                            // Since we have marked fields as non editable, we cannot use 'that.set',
                            // This should raise a change event on the parent viewModel
                            that.accept({
                                sid: data.id,
                                firstName: data.firstName,
                                lastName: data.lastName,
                                lastUse: new Date(),
                                picture: data.picture
                            });
                        } else {
                            that.reset();
                        }
                    });
            },
            /**
             * Reset user
             */
            reset: function () {
                // Since we have marked fields as non editable, we cannot use 'that.set'
                this.accept({
                    id: this.defaults.id,
                    sid: this.defaults.sid,
                    firstName: this.defaults.firstName,
                    lastName: this.defaults.lastName,
                    lastUse: this.defaults.lastUse,
                    md5pin: this.defaults.md5pin,
                    picture: this.defaults.picture
                });
            }
        });

        /**
         * MobileUserDataSource model (stored localy)
         * @type {kidoju.data.Model}
         */
        models.MobileUserDataSource = DataSource.extend({

            /**
             * Datasource constructor
             * @param options
             */
            init: function (options) {

                var that = this;

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        create: $.proxy(that._transport._create, that),
                        destroy: $.proxy(that._transport._destroy, that),
                        read: $.proxy(that._transport._read, that),
                        update: $.proxy(that._transport._update, that)
                    },
                    // no serverFiltering, serverSorting or serverPaging considering the limited number of users
                    schema: {
                        data: 'data',
                        total: 'total',
                        errors: 'error', // <--------------------- TODO: look at this properly for error reporting
                        modelBase: models.MobileUser,
                        model: models.MobileUser
                    }
                }, options));

            },

            /**
             * Validate user before saving
             * @param user
             */
            _validate: function (user) {
                var errors = [];
                if ($.type(user.md5pin) !== STRING) {
                    errors.push('Missing user pin'); // TODO i18n
                }
                return errors;
            },

            /**
             * Setting _transport here with a reference above is a trick
             * so as to be able to replace these CRUD function in mockup scenarios
             */
            _transport: {

                /**
                 * Create transport
                 * @param options
                 * @returns {*}
                 * @private
                 */
                _create: function (options) {
                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    logger.debug({
                        message: 'User data creation',
                        method: 'app.models.MobileUserDataSource.transport.create'
                    });
                    var user = options.data;
                    var errors = this._validate(user);
                    if (errors.length) {
                        // Do not save a user without a pin
                        // TODO: report errors properly: in xhr.responseText?
                        return options.error(undefined, 'error', 'Invalid user');
                    }
                    // This replaces the machine id in the mongoDB server id by MACHINE_ID
                    // This ensures uniqueness of user in mobile app when sid is unique without further checks
                    // i.e. same user with the same sid recorded twice under different ids in mobile device
                    user.id = new pongodb.ObjectId(user.sid).toMobileId();
                    user.lastUse = new Date();
                    debugger;
                    db.users.insert(user)
                        .done(function () {
                            // TODO save image
                            options.success(user);
                        })
                        .fail(options.error);
                },

                /**
                 * Destroy transport
                 * @param options
                 * @private
                 */
                _destroy: function (options) {
                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    logger.debug({
                        message: 'User data deletion',
                        method: 'app.models.MobileUserDataSource.transport.destroy'
                    });
                    var id = options.data.id;
                    if (RX_MONGODB_ID.test(id)) {
                        db.users.remove({ id: id })
                            .done(function (result) {
                                if (result && result.nRemoved === 1) {
                                    options.success(options.data);
                                } else {
                                    options.error(undefined, 'error', 'User not found');
                                }
                            })
                            .fail(options.error);
                    } else {
                        // No need to hit the database, it won't be found
                        options.error(undefined, 'error', 'User not found');
                    }
                },

                /**
                 * Read transport
                 * @param options
                 * @private
                 */
                _read: function (options) {
                    logger.debug({
                        message: 'User data read',
                        method: 'app.models.MobileUserDataSource.transport.read'
                    });
                    db.users.find()
                        .done(function (result) {
                            if ($.isArray(result)) {
                                options.success({ total: result.length, data: result });
                            } else {
                                options.error(undefined, 'error', '`result` should be an `array`, possibly empty');
                            }
                        })
                        .fail(options.error);
                },

                /**
                 * Update transport
                 * @param options
                 * @returns {*}
                 * @private
                 */
                _update: function (options) {
                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    logger.debug({
                        message: 'User data update',
                        method: 'app.models.MobileUserDataSource.transport.update'
                    });
                    var user = options.data;
                    var errors = this._validate(user);
                    if (errors.length) {
                        // Do not save a user without a pin
                        // TODO: report errors properly: in xhr.responseText?
                        return options.error(undefined, 'error', 'Invalid user');
                    }
                    var id = user.id;
                    if (RX_MONGODB_ID.test(id)) {
                        user.id = undefined;
                        db.users.update({ id: id }, user)
                            .done(function (result) {
                                if (result && result.nMatched === 1 && result.nModified === 1) {
                                    // TODO Save image
                                    user.id = id;
                                    options.success({total: 1, data: user});
                                } else {
                                    options.error(undefined, 'error', 'User not found');
                                }
                            })
                            .fail(options.error);
                    } else {
                        // No need to hit the database, it won't be found
                        options.error(undefined, 'error', 'User not found');
                    }
                }
            }

        });

        /**
         * MobileVersion model
         * @type {kidoju.data.Model}
         */
        models.MobileActivity = Model.define({
            id: 'id', // the identifier of the model, which is required for isNew() to work
            fields: {
                id: {
                    type: STRING,
                    editable: true,
                    nullable: true
                },
                // An activity without a sid does not exist on the server
                sid: {
                    type: STRING,
                    editable: true,
                    nullable: true
                },
                actorId: {
                    type: STRING,
                    editable: false
                },
                // Data varies depending on the type of activity
                data: {
                    // type: UNDEFINED,
                    editable: true, // TODO: false?
                    nullable: true,
                    defaultValue: null
                },
                language: {
                    type: STRING,
                    editable: false
                },
                summaryId: {
                    type: STRING,
                    editable: false
                },
                title: {
                    type: STRING,
                    editable: false
                },
                type: {
                    type: STRING,
                    editable: false
                },
                versionId: {
                    type: STRING,
                    editable: false
                }
                // Do we need a date or can we rely on the updated date?
                // Do we need any additional value/text to display in the mobile app?
            }
        });

        /**
         * MobileActivityDataSource datasource (stored localy and sycnhronized)
         * @type {kidoju.data.DataSource}
         */
        models.MobileActivityDataSource = DataSource.extend({

            /**
             * Datasource constructor
             * @param options
             */
            init: function (options) {

                var that = this;

                // Get the userId from options (if available at this stage)
                var sid = options && options.userId;
                if (RX_MONGODB_ID.test(sid)) {
                    assert.ok(!new pongodb.ObjectId(sid).isMobileId(), '`options.userId` is expected to be a sid');
                    that._userId = sid;
                }

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        create: $.proxy(that._transport._create, that),
                        destroy: $.proxy(that._transport._destroy, that),
                        read: $.proxy(that._transport._read, that),
                        update: $.proxy(that._transport._update, that)
                    },
                    // serverFiltering: true,
                    // serverSorting: true,
                    // pageSize: 5,
                    // serverPaging: true,
                    schema: {
                        data: 'data',
                        total: 'total',
                        errors: 'error', // <--------------------- TODO: look at this properly for error reporting
                        modelBase: models.MobileActivity,
                        model: models.MobileActivity
                        // parse: function (response) {
                        //     return response;
                        // }
                    }
                }, options));

            },

            /**
             * Load possibly with a new userId
             * @param userId
             */
            load: function (options) {
                var that = this;
                var dfd = $.Deferred();
                if (that.hasChanges()) {
                    dfd.reject(undefined, 'error', 'Cannot load with pending changes.');
                } else {
                    var sid = options && options.userId;
                    assert.ok(!new pongodb.ObjectId(sid).isMobileId(), '`options.userId` is expected to be a sid');
                    that._userId = sid;
                    that.read()
                        .done(dfd.resolve)
                        .fail(dfd.reject);
                }
                return dfd.promise();
            },

            /**
             * Validate activity
             * @param activity
             * @private
             */
            _validate: function (activity) {
                var errors = [];
                if (!RX_MONGODB_ID.test(activity.actorId) || activity.actorId !== this._userId) {
                    errors.push('Cannot delegate the creation of activities.');
                }
                return errors;
            },

            /**
             * Setting _transport here with a reference above is a trick
             * so as to be able to replace these CRUD function in mockup scenarios
             */
            _transport: {

                /**
                 * Create transport
                 * @param options
                 * @returns {*}
                 * @private
                 */
                _create: function (options) {
                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    logger.debug({
                        message: 'Activity data creation',
                        method: 'app.models.MobileActivityDataSource.transport.create'
                    });
                    var activity = options.data;
                    var errors = this._validate(activity);
                    if (errors.length) {
                        // TODO: report errors properly: in xhr.responseText?
                        return options.error(undefined, 'error', 'Invalid activity');
                    }
                    activity.id = new pongodb.ObjectId();
                    // TODO activity date????
                    db.activities.insert(activity)
                        .done(options.success)
                        .fail(options.error);
                },

                /**
                 * Destroy transport
                 * @param options
                 * @private
                 */
                _destroy: function (options) {
                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    logger.debug({
                        message: 'Activity data deletion',
                        method: 'app.models.MobileActivityDataSource.transport.destroy'
                    });
                    var id = options.data.id;
                    if (RX_MONGODB_ID.test(id)) {
                        db.activities.remove({ id: id })
                            .done(function (result) {
                                if (result && result.nRemoved === 1) {
                                    options.success(options.data);
                                } else {
                                    options.error(undefined, 'error', 'Activity not found');
                                }
                            })
                            .fail(options.error);
                    } else {
                        // No need to hit the database, it won't be found
                        options.error(undefined, 'error', 'Activity not found');
                    }
                },

                /**
                 * Read transport
                 * @param options
                 * @private
                 */
                _read: function (options) {
                    logger.debug({
                        message: 'Activity data read',
                        method: 'app.models.MobileActivityDataSource.transport.read'
                    });
                    db.activities.find({ actorId: this._userId })
                        .done(function (result) {
                            if ($.isArray(result)) {
                                options.success({ total: result.length, data: result });
                            } else {
                                options.error(undefined, 'error', '`result` should be an `array`, possibly empty');
                            }
                        })
                        .fail(options.error);
                },

                /**
                 * Update transpoort
                 * @param options
                 * @returns {*}
                 * @private
                 */
                _update: function (options) {
                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    logger.debug({
                        message: 'Activity data update',
                        method: 'app.models.MobileActivityDataSource.transport.update'
                    });
                    var activity = options.data;
                    var errors = this._validate(activity);
                    if (errors.length) {
                        // Do not save a activity without a pin
                        // TODO: report errors properly: in xhr.responseText?
                        return options.error(undefined, 'error', 'Invalid activity');
                    }
                    var id = activity.id;
                    if (RX_MONGODB_ID.test(id)) {
                        activity.id = undefined;
                        // TODO: check userId?
                        db.activities.update({ id: id }, activity)
                            .done(function (result) {
                                if (result && result.nMatched === 1 && result.nModified === 1) {
                                    // TODO Save image
                                    activity.id = id;
                                    options.success({total: 1, data: activity});
                                } else {
                                    options.error(undefined, 'error', 'Activity not found');
                                }
                            })
                            .fail(options.error);
                    } else {
                        // No need to hit the database, it won't be found
                        options.error(undefined, 'error', 'Activity not found');
                    }
                }
            },

            /**
             * Synchronizes user activities with the server
             */
            serverSync: function () {
                var that = this;
                /*
                return $.when(
                    that._uploadPendingActivities(),
                    that._purgeOldActivities(),
                    that._downloadRecentActivities()
                );
                */
                var dfd = $.Deferred();
                // First, upload all new activities
                that._uploadPendingActivities()
                    .progress(function (progress) {
                        dfd.notify($.extend({ step: 1 }, progress))
                    })
                    .done(function () {
                        // Second, purge old activities (including possibly some just uploaded new activities if last serverSync is very old)
                        that._purgeOldActivities()
                            .progress(function (progress) {
                                dfd.notify($.extend({ step: 2 }, progress))
                            })
                            .done(function () {
                                // Third, download recently added and updated activities (considering activities are always created, never updated, on the mobile device.
                                that._downloadRecentActivities()
                                    .progress(function (progress) {
                                        dfd.notify($.extend({ step: 3 }, progress))
                                    })
                                    .done(function () {
                                        dfd.resolve(); // Add statistics { nUploaded, nPurged, nDownloaded }
                                    })
                                    .fail(dfd.reject);
                            })
                            .fail(dfd.reject);
                    })
                    .fail(dfd.reject);
                return dfd.promise();
            },

            /**
             * Upload new activities and update sid
             * @returns {*}
             * @private
             */
            _uploadPendingActivities: function () {
                var dfd = $.Deferred();
                // TODO $.when.apply($, my_array);
                dfd.notify({ percent: 1 });
                // IMPORTANT update sid once done
                dfd.resolve();
                return dfd.promise();
            },

            /**
             * Purge old activities
             * @returns {*}
             * @private
             */
            _purgeOldActivities: function () {
                var dfd = $.Deferred();
                // TODO $.when.apply($, my_array);
                dfd.notify({ percent: 1 });
                dfd.resolve();
                return dfd.promise();
            },

            /**
             * Download recently updated activities
             * @returns {*}
             * @private
             */
            _downloadRecentActivities: function () {
                var dfd = $.Deferred();
                // TODO $.when.apply($, my_array);
                // IMPORTANT doanload from oldest to most recent and update lastSync accordingly
                // Nevertheless check whether activity does not already exist using sid
                dfd.notify({ percent: 1 });
                dfd.resolve();
                return dfd.promise();
            }

        });

        /**
         * MobileDownload model
         * @type {kidoju.data.Model}
         */
        // models.MobileDownload = Model.define({});

        /**
         * MobileDownload datasource (stored localy)
         * @type {kidoju.data.Model}
         */
        // models.MobileDownload = DataSource.define({});

    }(window.jQuery));

    /* jshint +W074 */
    /* jshint +W071 */

    return window.app;

}, typeof define === 'function' && define.amd ? define : function (_, f) { 'use strict'; f(); });
