/**
 * Copyright (c) 2013-2016 Memba Sarl. All rights reserved.
 * Sources at https://github.com/Memba
 */

/* jshint browser: true, jquery: true */
/* globals define: false */

(function (f, define) {
    'use strict';
    define([
        './vendor/blueimp/md5', // <-- keep first or adapt function (md5)
        './vendor/kendo/kendo.core',
        './vendor/kendo/kendo.data',
        './window.assert',
        './window.logger',
        './app.logger',
        './app.rapi',
        './app.cache',
        './kidoju.data',
        './kidoju.tools'
    ], f);
    // TODO: app.cultures (search below)
})(function (md5) {

    'use strict';

    // Depending how md5.js is loaded
    // We need `md5` for webpack and `window.md5` for grunt mocha
    md5 = md5 || window.md5;

    /* This function has too many statements. */
    /* jshint -W071 */

    /* This function's cyclomatic complexity is too high. */
    /* jshint -W073 */

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
        var kendo = window.kendo;
        var kidoju = window.kidoju;
        var Model = kidoju.data.Model;
        var DataSource = kidoju.data.DataSource;
        var Stream = kidoju.data.Stream;
        var Node = kendo.data.Node;
        var HierarchicalDataSource = kendo.data.HierarchicalDataSource;
        var assert = window.assert;
        var logger = new window.Logger('app.models');
        var rapi = app.rapi;
        var models = app.models = app.models || {};
        var i18n = app.i18n = app.i18n || {
                culture: {
                    dateFormat: 'dd MMM yyyy',
                    languages: [
                        {
                            value: 'en',
                            name: 'English',
                            icon: ''
                        },
                        {
                            value: 'fr',
                            name: 'French',
                            icon: ''
                        }
                    ],
                    finder: {
                        treeview: {
                            rootNodes: {
                                home: {
                                    text: 'Home',
                                    icon: 'home'
                                },
                                favourites: {
                                    text: 'Favourites',
                                    icon: 'star'
                                },
                                categories: {
                                    text: 'Categories',
                                    icon: 'folders2'
                                }
                            }
                        }
                    },
                    versions: {
                        draft: {
                            name: 'Draft'
                        },
                        published: {
                            name: 'Version {0}'
                        }
                    }
                }
            };
        var uris = app.uris = app.uris || {}; // we expect to have app.uris.rapi = {...}
        uris.cdn = uris.cdn || {
                icons: 'https://cdn.kidoju.com/images/o_collection/svg/office/{0}.svg'
            };
        uris.webapp = uris.webapp  || { // this is for testing only
                editor      : window.location.protocol + '//' + window.location.host + '/{0}/e/{1}/{2}',
                finder      : window.location.protocol + '//' + window.location.host + '/{0}',
                player      : window.location.protocol + '//' + window.location.host + '/{0}/x/{1}/{2}',
                user        : window.location.protocol + '//' + window.location.host + '/{0}/u/{1}',
                summary     : window.location.protocol + '//' + window.location.host + '/{0}/s/{1}'
            };
        var STRING = 'string';
        var NUMBER = 'number';
        var DATE = 'date';
        var BOOLEAN = 'boolean';
        var CHANGE = 'change';
        var ITEMCHANGE = 'itemchange';
        var RX_MONGODB_ID = /^[a-z0-9]{24}$/;
        var LOCALE = i18n && $.isFunction(i18n.locale) ? i18n.locale() : 'en';
        var HASHBANG = '#!';
        var HOME = 'home';
        var FAVOURITES = 'favourites';
        var CATEGORIES = 'categories';
        var VERSION_STATE = { DRAFT: 0, PUBLISHED: 5 };
        var MD5_A = '0cc175b9c0f1b6a831c399e269772661';

        /*******************************************************************************
         * Helpers
         *******************************************************************************/

        /**
         * Filter an object to a list of fields
         * @param obj
         * @param fields (an array or a [space, comma, semi-colon] delimited string)
         */
        function filter(obj, fields) {
            if ($.isPlainObject(obj) && ($.isArray(fields) || $.type(fields) === STRING)) {
                var ret = {};
                var fieldArray = $.isArray(fields) ? fields : fields.split(/[\s,;]+/);
                for (var i = 0; i < fieldArray.length; i++) {
                    if (obj.hasOwnProperty(fieldArray[i])) {
                        ret[fieldArray[i]] = obj[fieldArray[i]];
                    }
                }
                return ret;
            }
            return obj;
        }

        /*
         // See kendo.date and kendo.timezone in kendo.core
         http://www.telerik.com/forums/undocumented-use-of-kendo-timezones
         function applyZone(date, fromZone, toZone) {
         if (toZone) {
         date = kendo.timezone.convert(date, fromZone, toZone);
         } else {
         date = kendo.timezone.remove(date, fromZone);
         }
         return date;
         }
         */


        /*******************************************************************************
         * Taxonomy
         *******************************************************************************/

        /**
         * LazyCategory
         * A flattened readonly model for categories
         * @type {kidoju.data.Model}
         */
        models.LazyCategory = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                icon: {
                    type: STRING,
                    editable: false
                },
                language: {
                    type: STRING,
                    editable: false
                },
                name: {
                    type: STRING,
                    editable: false
                },
                parentId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                }
            }
        });

        /**
         * LazyCategoryDataSource
         * A readonly datasource of categories
         * @type {kendo.data.DataSource}
         */
        models.LazyCategoryDataSource = DataSource.extend({
            init: function (options) {

                var that = this;

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        read: $.proxy(that._transport._read, that)
                    },
                    schema: {
                        data: 'data',
                        total: 'total',
                        errors: 'error',
                        modelBase: models.LazyCategory,
                        model: models.LazyCategory
                    }
                }, options));

            },
            /*
             * Setting _transport._read here with a reference above is a trick
             * so as to be able to replace this function in mockup scenarios
             */
            _transport: {
                _read: function (options) {
                    logger.debug({
                        message: 'dataSource.read',
                        method: 'app.models.LazyCategoryDataSource.transport.read'
                        // data: options
                    });
                    app.cache.getAllCategories(LOCALE)
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                }
            }
        });

        /*******************************************************************************
         * Searches and Rummages
         *******************************************************************************/

        /**
         * Search model
         * Note: Search is more about content than taxonomy, but saving a search adds to rummages
         * @type {kidoju.data.Model}
         */
        models.Search = Model.define({
            id: 'userId', // the identifier of the model
            fields: {
                userId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                age: {
                    type: NUMBER,
                    nullable: true
                },
                author: {
                    type: STRING
                },
                category: {
                    type: STRING
                },
                favourite: { // name of favourite when saveChecked
                    type: STRING
                },
                navbar: { // text search in navbar
                    type: STRING
                },
                saveChecked: {
                    type: BOOLEAN,
                    defaultValue: false
                },
                sort: {
                    type: STRING,
                    defaultValue: 'd' // other possible values are 'r' and 'v' for dates, rates and views
                },
                text: { // text search
                    type: STRING
                }
            },

            /**
             * Contructor
             * @param data
             */
            init: function (data) {
                var that = this;
                Model.fn.init.call(that, data);
                this.bind(CHANGE, $.proxy(that._onChange, that));
            },

            /**
             * Whether there is enough data to save a favourite
             * @returns {boolean}
             */
            isSavable$: function () {
                return RX_MONGODB_ID.test(this.get('userId')) &&
                    (this.get('age') !== this.defaults.age || this.get('author') !== this.defaults.author || this.get('category') !== this.defaults.category || this.get('text') !== this.defaults.text);
            },

            /**
             * Event handler for the change event
             * @param e
             * @private
             */
            _onChange: function (e) {
                if (e.field === 'saveChecked' && !this.get('saveChecked')) {
                    this.set('favourite', this.defaults.favourite);
                } else if (!this.isSavable$() && this.get('saveChecked')) {
                    this.set('saveChecked', this.defaults.saveChecked);
                }
            },

            /* This function's cyclomatic complexity is too high. */
            /* jshint -W074 */

            /**
             * get the hash
             * the hashchange event handler will actually trigger the search so that searches can be bookmarked as favourites
             * @param advanced
             * @returns {string}
             */
            getHash: function (advanced) {
                if (advanced) { // build hash from search panel
                    var options = {
                        filter: {
                            logic : 'and',
                            filters: []
                        },
                        sort: []
                    };

                    // Filter
                    var age = this.get('age');
                    if ($.type(age) === NUMBER) {
                        options.filter.filters.push({ field: 'minAge', operator: 'lte', value: age });
                        options.filter.filters.push({ field: 'maxAge', operator: 'gte', value: age });
                    }
                    var author = this.get('author');
                    if ($.type(author) === STRING && author.trim().length) {
                        options.filter.filters.push({ field: 'author.lastName', operator: 'startswith', value: author.trim() });
                    }
                    var category = this.get('category');
                    if (RX_MONGODB_ID.test(category)) {
                        options.filter.filters.push({ field: 'categories', operator: 'eq', value: category });
                    }
                    var text = this.get('text');
                    if ($.type(text) === STRING && text.trim().length) {
                        options.filter.filters.push({ field: '$text', operator: 'eq', value: text.trim() });
                        // Note: the language is added server side based on the url, so do not bother here
                    }

                    var length = options.filter.filters.length;

                    if (length === 0) {
                        return HASHBANG; // '';
                    } else if (length === 1) {
                        options.filter = options.filter.filters[0];
                    }

                    // Sort
                    var sort = this.get('sort');
                    switch (sort) {
                        case 'd': // sort by dates
                            options.sort = [{ field: 'updated', dir: 'desc' }];
                            break;
                        case 'r': // sort by ratings
                            options.sort = [{ field: 'metrics.ratings.average', dir: 'desc' }];
                            break;
                        case 'v': // sort by number of views
                            options.sort = [{ field: 'metrics.views.count', dir: 'desc' }];
                            break;
                    }

                    // Return hash
                    return HASHBANG + $.param(options);

                } else { // build hash from navbar

                    var navbar = this.get('navbar').trim();

                    // Return hash - this is a different format that can be used for sitelink search snippet
                    // https://developers.google.com/webmasters/richsnippets/sitelinkssearch
                    return HASHBANG + (navbar ? 'q=' + encodeURIComponent(navbar) : '');

                }
            },

            /* jshint +W074 */

            /**
             * Load search
             * @returns {*}
             */
            load: function () {
                var that = this;
                return app.cache.getMe()
                    .done(function (me) {
                        // TODO in order to set a default age, we would need the date of birth
                        if ($.isPlainObject(me) && RX_MONGODB_ID.test(me.id)) {
                            // Since we have marked fields as non editable, we cannot use 'that.set',
                            // This should raise a change event on the parent viewModel
                            that.accept({ userId: me.id });
                        } else {
                            that.accept({ userId: null });
                        }
                    });
            },

            /**
             * Reset search
             */
            reset: function () {
                this.set('age', this.defaults.age);
                this.set('author', this.defaults.author);
                this.set('category', this.defaults.category);
                this.set('favourite', this.defaults.favourite);
                this.set('navbar', this.defaults.navbar);
                this.set('saveChecked', this.defaults.saveChecked);
                this.set('sort', this.defaults.sort);
                this.set('text', this.defaults.text);
            },

            /**
             * Save search as favourite
             * @returns {*}
             */
            save: function () {
                // We need a userId to save a search as a user favourite
                assert.match(RX_MONGODB_ID, this.userId, kendo.format(assert.messages.match.default, 'this.userId', RX_MONGODB_ID));
                var root = window.location.protocol + '//' + window.location.host;
                var finder = kendo.format(uris.webapp.finder, LOCALE);
                finder = finder.indexOf(root) === 0 ? finder.substr(root.length) : finder;
                var favourite = {
                    name: this.get('favourite').trim(),
                    path: finder + this.getHash(true)
                };
                // TODO: we should rather update the cache
                app.cache.removeMyFavourites(LOCALE);
                // Save a favourite on the current user
                return rapi.v1.user.createMyFavourite(LOCALE, favourite);
            }
        });

        /**
         * Rummage node (displayed in treeview on find page)
         * @type {kendo.data.Node}
         */
        models.Rummage = Node.define({
            id: 'id',
            hasChildren: true,
            children: {
                schema: {
                    data: 'items'
                }
            },
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                name: {
                    type: STRING,
                    editable: false
                },
                icon: {
                    type: STRING,
                    editable: false
                },
                path: {
                    type: STRING,
                    nullable: true,
                    editable: false
                },
                type: { // 0 = groups/folders, 1 = home, 2 = categories, 3 = favourites
                    type: NUMBER,
                    editable: false
                }
            },

            /* This function's cyclomatic complexity is too high. */
            /* jshint -W074 */

            /**
             * Return a complete path
             * @returns {*}
             */
            path$: function () {
                var root = window.location.protocol + '//' + window.location.host;
                var finder = kendo.format(uris.webapp.finder, LOCALE);
                finder = finder.indexOf(root) === 0 ? finder.substr(root.length) : finder;
                switch (this.get('type')) {
                    case 1: // home
                        return finder + HASHBANG; // Note: without hashbang, the page is reloaded
                    case 2: // categories
                        return finder + HASHBANG + $.param({ filter: { field: 'categories', operator: 'eq', value: this.get('id') } });
                    case 3: // favourites
                        return this.get('path');
                    default: // including 0 (no hypertext link)
                        return null; // should not be used!!!
                }
            },

            /* jshint +W074 */

            /**
             * Return a complete icon path
             * @returns {*}
             */
            icon$: function () {
                return kendo.format(uris.cdn.icons, this.get('icon'));
            }
        });

        // Children schema model cannot be set until the model exists
        // See http://www.telerik.com/forums/display-of-calculated-fields-in-treeview-template
        models.Rummage.prototype.children.schema.model = models.Rummage;
        // models.Rummage.prototype.children.schema.modelBase = models.Rummage;

        /**
         * Hierarchical datasource of rummages
         * @type {*|void}
         */
        models.RummageHierarchicalDataSource = HierarchicalDataSource.extend({
            init: function (options) {

                var that = this;

                HierarchicalDataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        read: $.proxy(that._transport._read, that),
                        update: $.proxy(that._transport._update, that),
                        destroy: $.proxy(that._transport._destroy, that)
                    },
                    schema: {
                        model: models.Rummage,
                        modelBase: models.Rummage
                    }
                }, options));

            },
            _transport: {
                _read: function (options) {
                    logger.debug({
                        message: 'dataSource.read',
                        method: 'app.models.RummageHierarchicalDataSource.transport.read'
                        // data: options.data
                    });
                    $.when(
                        app.cache.getFavouriteHierarchy(LOCALE),
                        app.cache.getCategoryHierarchy(LOCALE)
                        )
                        .done(function (favourites, categories) {
                            var rootNodes = i18n.culture.finder.treeview.rootNodes;
                            var rummages = [
                                { id: HOME, icon: rootNodes.home.icon, name: rootNodes.home.name, type: 1 },
                                { id: FAVOURITES, icon: rootNodes.favourites.icon, name: rootNodes.favourites.name, items: favourites, type: 0 },
                                { id: CATEGORIES, icon: rootNodes.categories.icon, name: rootNodes.categories.name, items: categories, type: 0 }
                            ];
                            options.success(rummages);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                },
                _update: function (options) {
                    // Update is required because it is called on the parent node before any destroy of a child node
                    return options.success(options.data);
                },
                _destroy: function (options) {
                    logger.debug({
                        message: 'dataSource.destroy',
                        method: 'app.models.RummageHierarchicalDataSource.transport.destroy',
                        data: options.data
                    });
                    // assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    assert.match(RX_MONGODB_ID, options.data.id, kendo.format(assert.messages.match.default, 'options.data.id', RX_MONGODB_ID));
                    return app.rapi.v1.user.deleteMyFavourite(LOCALE, options.data.id)
                        .done(function () {
                            app.cache.removeMyFavourites(LOCALE)
                                .always(function () {
                                    options.success(options.data);
                                });
                        })
                        .fail(options.error);
                }
            }
        });

        /************************************************************************************
         * Metrics
         ************************************************************************************/

        /**
         * CountReferenceModel
         * @type {kidoju.data.Model}
         */
        models.CountReference = Model.define({
            fields: {
                count: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                }
            }
        });

        /**
         * AverageReferenceModel
         * @type {kidoju.data.Model}
         */
        models.AverageReference = Model.define({
            fields: {
                average: {
                    type: NUMBER,
                    editable: false,
                    nullable: true, // average is null when there is no count
                    parse: function (value) {
                        return isNaN(value) ? null : value;
                    },
                    serializable: false
                }
            }
        });

        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */

        /**
         * RatingCountReference
         * @type {kidoju.data.Model}
         */
        models.RatingCountReference = Model.define({
            fields: {
                average: {
                    type: NUMBER,
                    editable: false,
                    nullable: true, // average is null when there is no count
                    parse: function (value) {
                        return isNaN(value) ? null : value;
                    },
                    serializable: false
                },
                count_1: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_2: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_3: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_4: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_5: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                }
            }
        });

        /**
         * ScoreCountReference
         * @type {kidoju.data.Model}
         */
        models.ScoreCountReference = Model.define({
            fields: {
                average: {
                    type: NUMBER,
                    editable: false,
                    nullable: true, // average is null when there is no count
                    parse: function (value) {
                        return isNaN(value) ? null : value;
                    },
                    serializable: false
                },
                count_00: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_05: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_10: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_15: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_20: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_25: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_30: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_35: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_40: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_45: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_50: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_55: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_60: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_65: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_70: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_75: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_80: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_85: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_90: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                },
                count_95: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false,
                    serializable: false
                }
            },
            /**
             * Return an array ready for a kendo.dataviz.Chart histogram
             * To draw on the chart, see http://docs.telerik.com/kendo-ui/dataviz/chart/how-to/draw-on-scatter-plots
             */
            series: function () {
                return [
                    { score:  '0+', count: this.get('count_00') },
                    { score:  '5+', count: this.get('count_05') },
                    { score: '10+', count: this.get('count_10') },
                    { score: '15+', count: this.get('count_15') },
                    { score: '20+', count: this.get('count_20') },
                    { score: '25+', count: this.get('count_25') },
                    { score: '30+', count: this.get('count_30') },
                    { score: '35+', count: this.get('count_35') },
                    { score: '40+', count: this.get('count_40') },
                    { score: '45+', count: this.get('count_45') },
                    { score: '50+', count: this.get('count_50') },
                    { score: '55+', count: this.get('count_55') },
                    { score: '60+', count: this.get('count_60') },
                    { score: '65+', count: this.get('count_65') },
                    { score: '70+', count: this.get('count_70') },
                    { score: '75+', count: this.get('count_75') },
                    { score: '80+', count: this.get('count_80') },
                    { score: '85+', count: this.get('count_85') },
                    { score: '90+', count: this.get('count_90') },
                    { score: '95+', count: this.get('count_95') }
                ];
            }
        });

        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        /**
         * SummaryMetricsReference model
         * @type {kidoju.data.Model}
         */
        models.SummaryMetricsReference = Model.define({
            fields: {
                comments: {
                    defaultValue: {},
                    editable: false,
                    parse: function (value) {
                        return value instanceof models.CountReference ? value : new models.CountReference(value);
                    },
                    serializable: false
                },
                ratings: {
                    defaultValue: {},
                    editable: false,
                    parse: function (value) {
                        return value instanceof models.RatingCountReference ? value : new models.RatingCountReference(value);
                    },
                    serializable: false
                },
                scores: {
                    defaultValue: {},
                    editable: false,
                    parse: function (value) {
                        return value instanceof models.ScoreCountReference ? value : new models.ScoreCountReference(value);
                    },
                    serializable: false
                },
                views: {
                    defaultValue: {},
                    editable: false,
                    parse: function (value) {
                        return value instanceof models.CountReference ? value : new models.CountReference(value);
                    },
                    serializable: false
                }
            }
        });

        /************************************************************************************
         * Users
         ************************************************************************************/

        /**
         * UserReference Model
         * @class
         * @type {kidoju.data.Model}
         */
        models.UserReference = Model.define({
            id: 'userId',
            fields: {
                userId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                firstName: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                lastName: {
                    type: STRING,
                    editable: false,
                    serializable: false
                }
            }
        });

        /**
         * CurrentUser model
         * Minimal non-editable user to display in the navbar
         *
         * @type {kidoju.data.Model}
         */
        models.CurrentUser = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                firstName: {
                    type: STRING,
                    editable: false
                },
                lastName: {
                    type: STRING,
                    editable: false
                },
                picture: {
                    type: STRING,
                    editable: false,
                    nullable: true
                }
                // timezone (for display of dates), born (for searches)
            },
            name$: function () {
                return ((this.get('firstName') || '').trim() + ' ' + (this.get('lastName') || '').trim()).trim();
            },
            picture$: function () {
                return this.get('picture') || kendo.format(uris.cdn.icons, 'user');
            },
            isAuthenticated$: function () {
                return RX_MONGODB_ID.test(this.get('id'));
            },
            uri$: function () {
                return kendo.format(uris.webapp.user, LOCALE, this.get('id'));
            },
            reset: function () {
                var that = this;
                // Since we have marked fields as non editable, we cannot use 'that.set'
                that.accept({
                    id: this.defaults.id,
                    firstName: this.defaults.firstName,
                    lastName: this.defaults.lastName,
                    picture: this.defaults.picture
                });
            },
            load: function () {
                var that = this;
                return app.cache.getMe()
                    .done(function (data) {
                        if ($.isPlainObject(data) && RX_MONGODB_ID.test(data.id)) {
                            // Since we have marked fields as non editable, we cannot use 'that.set',
                            // This should raise a change event on the parent viewModel
                            that.accept({
                                id: data.id,
                                firstName: data.firstName,
                                lastName: data.lastName,
                                picture: data.picture
                            });
                        } else {
                            that.reset();
                        }
                    });
            }
        });

        /**
         * Account model
         * @type {kidoju.data.Model}
         */
        models.Account = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true,
                    serializable: false
                },
                email: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                firstName: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                gender: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                lastName: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                link: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                locale:{
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                timezone: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                picture: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                updated: {
                    type: DATE,
                    editable: false,
                    serializable: false
                },
                verified: {
                    type: BOOLEAN,
                    editable: false,
                    serializable: false
                }
            }
        });

        /**
         * User model
         * @type {kidoju.data.Model}
         */
        models.User = Model.define({
            id: 'id', // the identifier of the model
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true,
                    serializable: false
                },
                born: {
                    type: DATE,
                    nullable: true
                },
                created: {
                    type: DATE,
                    editable: false,
                    serializable: false
                },
                description: {
                    type: STRING
                },
                email: {
                    type: STRING
                },
                firstName: {
                    type: STRING
                },
                lastName: {
                    type: STRING
                },
                // favourites are stored with users but are diplayed with rummages
                language: {
                    type: STRING
                },
                // TODO metrics, student points, teacher points and belts
                picture: {
                    type: STRING
                },
                updated: {
                    type: DATE,
                    editable: false,
                    serializable: false
                },
                // For complex types, the recommendation is to leave the type undefined and set a default value
                // See: http://www.telerik.com/forums/model---complex-model-with-nested-objects-or-list-of-objects
                // See: http://demos.telerik.com/kendo-ui/grid/editing-custom
                facebook: {
                    defaultValue: null,
                    editable: false,
                    serializable: false,
                    parse: function (value) {
                        // return $.isPlainObject(value) ? new models.Account(value) : null;
                        return (value instanceof models.Account || value === null) ? value : new models.Account(value);
                    }
                },
                google: {
                    defaultValue: null,
                    editable: false,
                    serializable: false,
                    parse: function (value) {
                        return (value instanceof models.Account || value === null) ? value : new models.Account(value);
                    }
                },
                live: {
                    defaultValue: null,
                    editable: false,
                    serializable: false,
                    parse: function (value) {
                        return (value instanceof models.Account || value === null) ? value : new models.Account(value);
                    }
                },
                twitter: {
                    defaultValue: null,
                    editable: false,
                    serializable: false,
                    parse: function (value) {
                        return (value instanceof models.Account || value === null) ? value : new models.Account(value);
                    }
                }
            },

            /* This function's cyclomatic complexity is too high. */
            /* jshint -W074 */

            /**
             * Gets a unique list of email addresses from user accounts
             * @returns {Array}
             */
            emails$: function () {
                var emails = [];
                var facebook = (this.get('facebook.email') || '').trim().toLowerCase();
                var google = (this.get('google.email') || '').trim().toLowerCase();
                var live = (this.get('live.email') || '').trim().toLowerCase();
                var twitter = (this.get('twitter.email') || '').trim().toLowerCase();
                if (facebook.length && emails.indexOf(facebook) === -1) {
                    emails.push(facebook);
                }
                if (google.length && emails.indexOf(google) === -1) {
                    emails.push(google);
                }
                if (live.length && emails.indexOf(live) === -1) {
                    emails.push(live);
                }
                if (twitter.length && emails.indexOf(twitter) === -1) {
                    emails.push(twitter);
                }
                return emails;
            },

            /**
             * Gets a unique list of first names from user accounts
             * // TODO: we should not mix firstNames and lastNames from sepearate accounts so this needs to be reviewed
             * @returns {Array}
             */
            firstNames$: function () {
                var firstNames = [];
                var facebook = (this.get('facebook.firstName') || '').trim(); // TODO Capitalize (camel case)
                var google = (this.get('google.firstName') || '').trim();
                var live = (this.get('live.firstName') || '').trim();
                var twitter = (this.get('twitter.firstName') || '').trim();
                if (facebook.length && firstNames.indexOf(facebook) === -1) {
                    firstNames.push(facebook);
                }
                if (google.length && firstNames.indexOf(google) === -1) {
                    firstNames.push(google);
                }
                if (live.length && firstNames.indexOf(live) === -1) {
                    firstNames.push(live);
                }
                if (twitter.length && firstNames.indexOf(twitter) === -1) {
                    firstNames.push(twitter);
                }
                return firstNames;
            },

            /**
             * Gets a unique list of last names from user accounts
             * // TODO: we should not mix firstNames and lastNames from sepearate accounts so this needs to be reviewed
             * @returns {Array}
             */
            lastNames$: function () {
                var lastNames = [];
                var facebook = (this.get('facebook.lastName') || '').trim().toUpperCase();
                var google = (this.get('google.lastName') || '').trim().toUpperCase();
                var live = (this.get('live.lastName') || '').trim().toUpperCase();
                var twitter = (this.get('twitter.lastName') || '').trim().toUpperCase();
                if (facebook.length && lastNames.indexOf(facebook) === -1) {
                    lastNames.push(facebook);
                }
                if (google.length && lastNames.indexOf(google) === -1) {
                    lastNames.push(google);
                }
                if (live.length && lastNames.indexOf(live) === -1) {
                    lastNames.push(live);
                }
                if (twitter.length && lastNames.indexOf(twitter) === -1) {
                    lastNames.push(twitter);
                }
                return lastNames;
            },

            /* jshint +W074 */

            /**
             * Get user's full name
             * @returns {string}
             */
            name$: function () {
                return ((this.get('firstName') || '').trim() + ' ' + (this.get('lastName') || '').trim()).trim();
            },

            /**
             * Get user's avatar
             * @returns {*}
             */
            picture$: function () {
                return this.get('picture') || kendo.format(uris.cdn.icons, 'user');
            },

            /**
             * Get user's uri
             * @returns {*}
             */
            uri$: function () {
                return kendo.format(uris.webapp.user, LOCALE, this.get('id'));
            },

            /**
             * Load
             * @param data
             * @returns {*}
             */
            load: function (data) {
                var that = this;
                var dfd = $.Deferred();
                // Actually data is never an id in our web application
                if (RX_MONGODB_ID.test(data)) {
                    app.cache.getMe()
                        .done(function (me) {
                            if ($.isPlainObject(me) && data === me.id) {
                                // The authenticated user requests his own profile
                                // Get the full profile including provider accounts
                                rapi.v1.user.getMe()
                                    .done(function (user) {
                                        that.accept(user);
                                        dfd.resolve(user);
                                    })
                                    .fail(dfd.reject);
                            } else {
                                // Any user requests another user's public profile
                                // Get a public profile with limited information
                                rapi.v1.user.getUser(data)
                                    .done(function (user) {
                                        that.accept(user);
                                        dfd.resolve(user);
                                    })
                                    .fail(dfd.reject);
                            }
                        })
                        .fail(dfd.reject);
                } else if ($.isPlainObject(data) && RX_MONGODB_ID.test(data.id)) {
                    app.cache.getMe()
                        .done(function (me) {
                            if ($.isPlainObject(me) && data.id === me.id) {
                                // The authenticated user requests his own profile
                                // Get the full profile including provider accounts
                                rapi.v1.user.getMe()
                                    .done(function (user) {
                                        that.accept(user);
                                        dfd.resolve(user);
                                    })
                                    .fail(dfd.reject);
                            } else {
                                // Any user requests another user's public profile
                                // Get a public profile with limited information
                                that.accept(data);
                                dfd.resolve(data);
                            }
                        })
                        .fail(dfd.reject);
                } else {
                    // dfd.reject(xhr, status, error);
                    dfd.reject('TODO', 'TODO', 'TODO'); // TODO
                }
                return dfd.promise();
            },

            /**
             * Save
             * @param fields
             * @returns {*}
             */
            save: function (fields) {
                var that = this;
                var dfd = $.Deferred();
                if (that.dirty) {  // TODO Validate
                    var data = filter(that.toJSON(), fields);
                    // serializable === false in User model field properies (see above) discards the following data
                    assert.isPlainObject(data, kendo.format(assert.messages.isPlainObject.default, 'data'));
                    assert.isUndefined(data.created, kendo.format(assert.messages.isUndefined.default, 'data.created'));
                    assert.isUndefined(data.facebook, kendo.format(assert.messages.isUndefined.default, 'data.facebook'));
                    assert.isUndefined(data.google, kendo.format(assert.messages.isUndefined.default, 'data.google'));
                    assert.isUndefined(data.id, kendo.format(assert.messages.isUndefined.default, 'data.id'));
                    assert.isUndefined(data.live, kendo.format(assert.messages.isUndefined.default, 'data.live'));
                    assert.isUndefined(data.twitter, kendo.format(assert.messages.isUndefined.default, 'data.twitter'));
                    assert.isUndefined(data.updated, kendo.format(assert.messages.isUndefined.default, 'data.updated'));
                    rapi.v1.user.updateMe(data)
                        .done(function (data) {
                            // Note: data is not parsed, so dates are string
                            that.accept(data); // this updates dirty and updated
                            dfd.resolve(data);
                        })
                        .fail(function (xhr, status, error) {
                            dfd.reject(xhr, status, error);
                        });
                } else {
                    setTimeout(function () {
                        dfd.resolve(); // nothing to save, nothing to return
                    }, 0);
                }
                return dfd.promise();
            }

        });

        /*********************************************************************************
         * Summaries
         *********************************************************************************/

        /**
         * New summary model
         * This model is essentially used by the create window in header.ejs
         * @type {kidoju.data.Model}
         */
        models.NewSummary = Model.define({
            id: 'id', // the identifier of the model
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                author: {
                    defaultValue: {},
                    parse: function (value) {
                        return value instanceof models.UserReference ? value : new models.UserReference(value);
                    }
                },
                category: {
                    nullable: true,
                    parse: function (value) {
                        return (value instanceof models.LazyCategory || value === null) ? value : new models.LazyCategory(value);
                    }
                },
                language: {
                    type: STRING,
                    defaultValue: LOCALE,
                    editable: false,
                    validation: {
                        required: true
                    }
                },
                title: {
                    type: STRING,
                    validation: {
                        required: true,
                        pattern: '^\\S[^<>]{4,48}\\S$'
                    }
                }/*,
                 type: {
                 type: STRING,
                 validation: {
                 required: true
                 }
                 }*/
            },
            author$: function () {
                return ((this.get('author.firstName') || '').trim() + ' ' + (this.get('author.lastName') || '').trim()).trim();
            },
            language$: function () {
                var locale = this.get('language');
                var languages = i18n.culture.languages;
                for (var i = 0; i < languages.length; i++) {
                    if (languages[i].value === locale) {
                        return languages[i].name;
                    }
                }
                return null ;
            },
            load: function () {
                var that = this;
                return app.cache.getMe()
                    .done(function (me) {
                        if ($.isPlainObject(me) && RX_MONGODB_ID.test(me.id)) {
                            me.userId = me.id;
                            // delete me.picture;
                            that.set('author', new models.UserReference(me));
                            // that.set('language', LOCALE);
                        }
                    });
            },
            reset: function () {
                var that = this;
                that.set('category', this.defaults.category);
                that.set('title', this.defaults.title);
                // that.set('type', this.defaults.type);
            },
            save: function () {
                var that = this;
                // We could also have used toJSON and deleted any useless data
                var newSummary = {
                    author: {
                        userId: that.get('author.userId')
                        // Let the server feed the authenticated user firstName and lastName from author.userId
                    },
                    // Make an array of categories and the server will use this category to set the default icon
                    categories: [that.get('category.id')],
                    language: that.get('language'),
                    title: that.get('title'),
                    type: that.get('type.value')
                };
                // Call server to create a new summary and return a promise
                return rapi.v1.content.createSummary(LOCALE, newSummary);
            }
        });

        /**
         * Lazy summary model (for lazy loading in lists)
         * @type {kidoju.data.Model}
         */
        models.LazySummary = Model.define({
            id: 'id', // the identifier of the model
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                comments: {
                    type: NUMBER,
                    editable: false
                },
                created: {
                    type: DATE,
                    editable: false
                },
                firstName: {
                    type: STRING,
                    editable: false
                },
                // ? language
                lastName: {
                    type: STRING,
                    editable: false
                },
                icon: {
                    type: STRING,
                    editable: false
                },
                published: {
                    type: DATE,
                    nullable: true,
                    editable: false
                },
                ratings: {
                    type: NUMBER,
                    nullable: true,
                    editable: false
                },
                scores: {
                    type: NUMBER,
                    nullable: true,
                    editable: false
                },
                tags: {
                    // type: Array
                    defaultValue: [],
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
                updated: {
                    type: DATE,
                    editable: false
                },
                userId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                views: {
                    type: NUMBER,
                    defaultValue: 0,
                    editable: false
                }
            },
            authorName$: function () {
                return ((this.get('firstName') || '').trim() + ' ' + (this.get('lastName') || '').trim()).trim();
            },
            authorUri$: function () {
                return kendo.format(uris.webapp.user, LOCALE, this.get('userId'));
            },
            icon$: function () {
                return kendo.format(uris.cdn.icons, this.get('icon'));
            },
            summaryUri$: function () {
                return kendo.format(uris.webapp.summary, LOCALE, this.get('id')) + (this.get('published') ? '' : '?bypass=true');
            },
            tags$: function () {
                var ret = [];
                var tags = this.get('tags');
                if (tags instanceof kendo.data.ObservableArray) {
                    ret = tags.map(function (tag) {
                        return {
                            name: tag,
                            hash: HASHBANG + $.param({ filter: { field:'tags', operator:'eq', value:tag } })
                        };
                    });
                }
                return ret;
            }
        });

        /**
         * DataSource of Lazy summaries
         * @type {kendo.Observable}
         */
        models.LazySummaryDataSource = DataSource.extend({

            init: function (options) {

                var that = this;

                // Cache the userId from options
                that.userId = options && options.userId;

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        read: $.proxy(that._transport._read, that)
                    },
                    serverFiltering: true,
                    serverSorting: true,
                    pageSize: 5,
                    serverPaging: true,
                    schema: {
                        data: 'data',
                        total: 'total',
                        errors: 'error',
                        modelBase: models.LazySummary,
                        model: models.LazySummary,
                        parse: function (response) {
                            // We parse the response to flatten data for our LazySummary model (instead of using field.from and field.defaultValue definitions)
                            if (response && $.type(response.total) === NUMBER && $.isArray(response.data)) {
                                $.each(response.data, function (index, summary) {
                                    // We need to flatten author and metrics in case we need to represent data in a kendo.ui.Grid
                                    // Flatten author
                                    assert.isPlainObject(summary.author, kendo.format(assert.messages.isPlainObject.default, 'summary.author'));
                                    summary.userId = summary.author.userId;
                                    summary.firstName = summary.author.firstName;
                                    summary.lastName = summary.author.lastName;
                                    delete summary.author;
                                    // Flatten metrics
                                    summary.comments = summary.metrics && summary.metrics.comments && summary.metrics.comments.count || 0;
                                    summary.ratings = summary.metrics && summary.metrics.ratings && summary.metrics.ratings.average || null;
                                    summary.scores = summary.metrics && summary.metrics.scores && summary.metrics.scores.average || null;
                                    summary.views = summary.metrics && summary.metrics.views && summary.metrics.views.count || 0;
                                    if ($.isPlainObject(summary.metrics)) {
                                        delete summary.metrics;
                                    }
                                });
                            }
                            return response;
                        }
                    }
                }, options));

            },
            load: function (options) {
                var that = this;
                that.userId = options && options.userId;
                return that.query(options);
            },
            /*
             * Setting _transport._read here with a reference above is a trick
             * so as to be able to replace this function in mockup scenarios
             */
            _transport: {
                _read: function (options) {

                    var that = this;

                    logger.debug({
                        message: 'dataSource.read',
                        method: 'app.models.LazySummaryDataSource.transport.read',
                        data: { userId: that.userId }
                    });

                    // add options.filter.filters.push({ field: 'language', operator: 'eq', value: LOCALE });
                    // ATTENTION logic and or or

                    options.data.fields = 'author,icon,metrics.comments.count,metrics.ratings.average,metrics.scores.average,metrics.views.count,published,tags,title,type,updated';
                    options.data.sort = options.data.sort || [{ field: 'updated', dir: 'desc' }];

                    if (!RX_MONGODB_ID.test(that.userId)) {

                        // Without user id, we just query public summaries
                        rapi.v1.content.findSummaries(LOCALE, options.data)
                            .done(function (response) {
                                options.success(response);
                            })
                            .fail(function (xhr, status, error) {
                                options.error(xhr, status, error);
                            });

                    } else {

                        // With a userId, we request all summaries the author of which has such userId
                        app.cache.getMe()
                            .done(function (me) {

                                if ($.isPlainObject(me) && that.userId === me.id) {

                                    // If we request the summaries of the authenticated user, include drafts
                                    rapi.v1.user.findMySummaries(LOCALE, options.data)
                                        .done(function (response) {
                                            options.success(response);
                                        })
                                        .fail(function (xhr, status, error) {
                                            options.error(xhr, status, error);
                                        });

                                } else {

                                    // If we request the summaries of an author who is not the (authenticated/anonymous) user, only fetch public/published summaries
                                    options.data.filter = {
                                        logic: 'and',
                                        filters: [
                                            { field: 'author.userId', operator: 'eq', value: that.userId }
                                        ]
                                    };

                                    rapi.v1.content.findSummaries(LOCALE, options.data)
                                        .done(function (response) {
                                            options.success(response);
                                        })
                                        .fail(function (xhr, status, error) {
                                            options.error(xhr, status, error);
                                        });
                                }

                            })
                            .fail(function (xhr, status, error) {
                                options.error(xhr, status, error);
                            });
                    }
                }
            }
        });

        /**
         * Summary model
         * @type {kidoju.data.Model}
         */
        models.Summary = Model.define({
            id: 'id', // the identifier of the model
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true,
                    serializable: false
                },
                author: {
                    // For complex types, the recommendation is to leave the type undefined and set a default value
                    // See: http://www.telerik.com/forums/model---complex-model-with-nested-objects-or-list-of-objects
                    // See: http://demos.telerik.com/kendo-ui/grid/editing-custom
                    defaultValue: null,
                    editable: false,
                    serializable: false,
                    parse: function (value) {
                        return (value instanceof models.UserReference || value === null) ? value : new models.UserReference(value);
                    }
                },
                categories: {
                    defaultValue: []
                },
                created: {
                    type: DATE,
                    editable: false,
                    serializable: false
                },
                description: {
                    type: STRING
                },
                icon: {
                    type: STRING,
                    defaultValue: 'spacer'
                },
                language: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                minAge: {
                    type: NUMBER,
                    defaultValue: 0
                },
                maxAge: {
                    type: NUMBER,
                    defaultValue: 99
                },
                metrics: {
                    defaultValue: {},
                    editable: false,
                    parse: function (value) {
                        return value instanceof models.SummaryMetricsReference ? value : new models.SummaryMetricsReference(value);
                    },
                    serializable: false
                },
                published: {
                    type: DATE,
                    editable: false,
                    nullable: true,
                    serializable: false
                },
                tags: {
                    defaultValue: []
                },
                title: {
                    type: STRING
                },
                type: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                updated: {
                    type: DATE,
                    editable: false,
                    serializable: false
                }
            },
            categories$: function () {
                var that = this;
                var ret = [];
                if ($.isFunction(that.parent)) {
                    var viewModel = that.parent();
                    if (viewModel instanceof kendo.Observable) {
                        var ids = this.get('categories') || [];
                        var categories = viewModel.get('categories'); // This supposes the parent viewModel as categories
                        if (categories instanceof models.LazyCategoryDataSource) {
                            categories = categories.data();
                            $.each(ids, function (index, id) {
                                var found = $.grep(categories, function (category) {
                                    return category.id === id;
                                });
                                if (found.length) {
                                    ret.push(found[0].name);
                                }
                            });
                        }
                    }
                }
                return ret.join(', '); // TODO: sort
            },
            icon$: function () {
                return kendo.format(uris.cdn.icons, this.icon);
            },
            tags$: function () {
                return this.tags.join(', ');
            },
            init: function (data) {
                var that = this;
                Model.fn.init.call(that, data);
                that.bind(CHANGE, $.proxy(that._onChange, that));
            },
            _onChange: function (e) {
                // call the base function
                Model.fn._notifyChange.call(this, e);
                Model.fn._notifyChange.call(this, e);
                // kendo only handles add/remove on arrays of child elements
                // set dirty when an itemchange occurs in an array, e.g. versions
                // See: http://blog.falafel.com/Blogs/JoshEastburn/josh-eastburn/2014/04/25/dirty-children-and-kendo-ui
                if (e.action === ITEMCHANGE) {
                    this.dirty = true;
                }
            },
            load: function (data) {
                var that = this;
                var dfd = $.Deferred();
                if (RX_MONGODB_ID.test(data)) {
                    // data is a summary id and we fetch a full summary
                    rapi.v1.content.getSummary(LOCALE, data)
                        .done(function (summary) {
                            that.accept(summary);
                            dfd.resolve(summary);
                        })
                        .fail(dfd.reject);
                } else if ($.isPlainObject(data) && RX_MONGODB_ID.test(data.id)) {
                    if (data.published instanceof Date) {
                        // data is a published summary and we use model.accept to load data
                        that.accept(data);
                        dfd.resolve(data);
                    } else {
                        // data is a draft summary, hence it is incomplete
                        // because the webapp could not fetch the summary without authentication
                        // We therefore need to fetch a full summary
                        // data is a summary id and we fetch a full summary
                        rapi.v1.content.getSummary(LOCALE, data.id)
                            .done(function (summary) {
                                that.accept(summary);
                                dfd.resolve(summary);
                            })
                            .fail(dfd.reject);
                    }
                } else {
                    // dfd.reject(xhr, status, error);
                    dfd.reject('TODO', 'TODO', 'TODO'); // TODO
                }
                return dfd.promise();
            },
            save: function (fields) {
                var that = this;
                var dfd = $.Deferred();
                if (that.dirty) { // TODO Validate
                    var data = filter(that.toJSON(), fields);
                    assert.isPlainObject(data, kendo.format(assert.messages.isPlainObject.default, 'data'));
                    // Check that all model fields marked as serializable === false won't be sent
                    assert.isUndefined(data.author, kendo.format(assert.messages.isUndefined.default, 'data.author'));
                    assert.isUndefined(data.created, kendo.format(assert.messages.isUndefined.default, 'data.created'));
                    assert.isUndefined(data.id, kendo.format(assert.messages.isUndefined.default, 'data.id'));
                    assert.isUndefined(data.language, kendo.format(assert.messages.isUndefined.default, 'data.language'));
                    assert.isUndefined(data.metrics, kendo.format(assert.messages.isUndefined.default, 'data.metrics'));
                    assert.isUndefined(data.type, kendo.format(assert.messages.isUndefined.default, 'data.type'));
                    assert.isUndefined(data.updated, kendo.format(assert.messages.isUndefined.default, 'data.updated'));
                    var language = that.get('language');
                    var id = that.get('id');
                    rapi.v1.content.updateSummary(language, id, data)
                        .done(function (data) {
                            // Note: data is not parsed, so dates are string
                            that.accept(data); // this updates dirty and updated
                            dfd.resolve(data);
                        })
                        .fail(function (xhr, status, error) {
                            dfd.reject(xhr, status, error);
                        });
                } else {
                    setTimeout(function () {
                        dfd.resolve(); // nothing to save
                    }, 0);
                }
                return dfd.promise();
            },
            createDraft: function () {
                return rapi.v1.content.executeCommand(this.get('language'), this.get('id'), { command: 'draft' });
            },
            publish: function () {
                return rapi.v1.content.executeCommand(this.get('language'), this.get('id'), { command: 'publish' });
            },
            rate: function (value) {
                // TODO: what if already rated?????
                // TODO: check that an author cannot rate his own summaries
                return rapi.v1.content.createSummaryActivity(this.get('language'), this.get('id'), { type: 'rating', value: value });
            }
        });

        /*********************************************************************************
         * Versions
         *********************************************************************************/

        /**
         * Lazy version
         * @type {kidoju.data.Model}
         */
        models.LazyVersion = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                // created
                // language
                name: {
                    type: STRING,
                    editable: false
                },
                state: {
                    type: NUMBER,
                    editable: false
                },
                // stream
                summaryId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                }
                // type
                // updated
                // userId
            },
            versionPlayUri$: function () {
                return kendo.format(uris.webapp.player, LOCALE, this.get('summaryId'), this.get('id'), '').slice(0, -1);
            },
            versionEditUri$: function () {
                return kendo.format(uris.webapp.editor, LOCALE, this.get('summaryId'), this.get('id'));
            },
            iframe$: function () {
                // TODO consider the sandbox attribute -- see http://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/
                return kendo.format(
                    '<iframe src="{0}?embed=true{1}" style="height:494px;width:600px;border:0"></iframe>',
                    this.versionPlayUri$(),
                    app && app.theme && $.isFunction(app.theme.name) ? '&theme=' + app.theme.name() : ''
                );
            }
        });

        /**
         * Lazy version data source (especially for drop down list)
         * @type {*|void}
         */
        models.LazyVersionDataSource = DataSource.extend({

            init: function (options) {
                var that = this;

                that.summaryId = options && options.summaryId;

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        read: $.proxy(that._transport._read, that),
                        destroy: $.proxy(that._transport._destroy, that),
                        update: $.proxy(that._transport._update, that)
                    },
                    serverFiltering: true,
                    serverSorting: true,
                    pageSize: 100,
                    serverPaging: true,
                    schema: {
                        data: 'data',
                        total: 'total',
                        errors: 'error',
                        modelBase: models.LazyVersion,
                        model: models.LazyVersion,
                        parse: function (response) {
                            // Name versions: draft, version 1, version 2, ....
                            if (response && $.type(response.total === NUMBER && $.isArray(response.data))) {
                                $.each(response.data, function (index, version) {
                                    if (version.state === VERSION_STATE.DRAFT) {
                                        version.name = i18n.culture.versions.draft.name;
                                    } else {
                                        version.name = kendo.format(i18n.culture.versions.published.name, response.data.length - index);
                                    }
                                });
                            }
                            return response;
                        }
                    }
                }, options));
            },
            load: function (options) {
                var that = this;
                that.summaryId = options && options.summaryId;
                return that.query(options);
                // return that.read();
            },
            /*
             * Setting _transport._read here with a reference above is a trick
             * so as to be able to replace this function in mockup scenarios
             */
            _transport: {
                _read: function (options) {

                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    // assert.type(STRING, options.data.summaryId, kendo.format(assert.messages.type.default, 'options.data.summaryId', STRING));
                    // assert.equal(this.summaryId, options.data.summaryId, kendo.format(assert.messages.equal.default, options.data.summaryId, this.summaryId ));

                    var that = this;

                    logger.debug({
                        message: 'dataSource.read',
                        method: 'app.models.LazyVersionDataSource.transport.read',
                        data: { language: LOCALE, summaryId: that.summaryId }
                    });

                    options.data.fields = 'state,summaryId';
                    options.data.sort = [{ field: 'id', dir: 'desc' }];

                    rapi.v1.content.findSummaryVersions(LOCALE, that.summaryId, options.data)
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, error, status) {
                            options.error(xhr, error, status);
                        });
                },
                _destroy: function (options) {

                    assert.isPlainObject(options, kendo.format(assert.messages.isPlainObject.default, 'options'));
                    assert.isPlainObject(options.data, kendo.format(assert.messages.isPlainObject.default, 'options.data'));
                    assert.type(STRING, options.data.id, kendo.format(assert.messages.type.default, 'options.data.id', STRING));
                    assert.type(STRING, options.data.summaryId, kendo.format(assert.messages.type.default, 'options.data.summaryId', STRING));
                    assert.equal(this.summaryId, options.data.summaryId, kendo.format(assert.messages.equal.default, options.data.summaryId, this.summaryId));

                    var that = this;

                    logger.debug({
                        message: 'dataSource.destroy',
                        method: 'app.models.LazyVersionDataSource.transport.destroy',
                        data: { language: LOCALE, summaryId: options.data.summaryId, versionId: options.data.id }
                    });

                    rapi.v1.content.deleteSummaryVersion(LOCALE, options.data.summaryId, options.data.id)
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, error, status) {
                            options.error(xhr, error, status);
                        });
                }
            }

        });

        /**
         * Version
         * @type {kidoju.data.Model}
         */
        models.Version = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true,
                    serializable: false
                },
                created: {
                    type: DATE,
                    editable: false,
                    serializable: false
                },
                language: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                state: {
                    type: NUMBER,
                    editable: false,
                    serializable: false
                },
                stream: {
                    defaultValue: new Stream(),
                    nullable: false,
                    parse: function (value) {
                        return value instanceof Stream ? value : new Stream(value);
                    }
                },
                summaryId: {
                    type: STRING,
                    editable: false,
                    nullable: true,
                    serializable: false
                },
                type: {
                    type: STRING,
                    editable: false,
                    serializable: false
                },
                updated: {
                    type: DATE,
                    editable: false,
                    serializable: false
                },
                userId: {
                    type: STRING,
                    editable: false,
                    nullable: true,
                    serializable: false
                }
            },
            load: function (summaryId, versionId) {
                var that = this;
                return rapi.v1.content.getSummaryVersion(LOCALE, summaryId, versionId)
                    .done(function (version) {
                        that.accept(version);
                        assert.equal(MD5_A, md5('a'), kendo.format(assert.messages.equal.default, 'md5("a")', MD5_A));
                        that._md5 = md5(JSON.stringify(that.toJSON()));
                    });
            },
            save: function () {
                var that = this;
                // That.dirty is not updated when modifying dataSource items
                // so we have no way to optimize and avoid saving unmodified versions based on `dirty`
                // like we have done elsewhere
                var _md5 = that._md5;
                var data = that.toJSON(true); // true means with hierarchy of data sources
                assert.isPlainObject(data, kendo.format(assert.messages.isPlainObject.default, 'data'));
                assert.isUndefined(data.created, kendo.format(assert.messages.isUndefined.default, 'data.created'));
                assert.isUndefined(data.id, kendo.format(assert.messages.isUndefined.default, 'data.id'));
                assert.isUndefined(data.language, kendo.format(assert.messages.isUndefined.default, 'data.language'));
                assert.isUndefined(data.state, kendo.format(assert.messages.isUndefined.default, 'data.state'));
                assert.isUndefined(data.summaryId, kendo.format(assert.messages.isUndefined.default, 'data.summaryId'));
                assert.isUndefined(data.type, kendo.format(assert.messages.isUndefined.default, 'data.type'));
                assert.isUndefined(data.updated, kendo.format(assert.messages.isUndefined.default, 'data.updated'));
                assert.isUndefined(data.userId, kendo.format(assert.messages.isUndefined.default, 'data.userId'));
                assert.equal(MD5_A, md5('a'), kendo.format(assert.messages.equal.default, 'md5("a")', MD5_A));
                that._md5 = md5(JSON.stringify(data));
                if (that._md5 !== _md5) { // if (that.dirty) { // TODO Validate
                    var language = that.get('language');
                    var summaryId = that.get('summaryId');
                    var versionId = that.get('id');
                    return rapi.v1.content.updateSummaryVersion(language, summaryId, versionId, data)
                        .done(function (data) {
                            // Note: data is not parsed, so dates are string
                            that.accept(data); // this updates dirty and updated
                        });
                } else {
                    return $.Deferred().resolve().promise();
                }
            }
        });

        /**
         * Version reference for activities
         * @type {kidoju.data.Model}
         */
        models.VersionReference = Model.define({
            id: 'versionId',
            fields: {
                language: {
                    type: STRING,
                    editable: false
                },
                summaryId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                title: {
                    type: STRING,
                    editable: false
                },
                versionId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                }
            }
        });

        /*********************************************************************************
         * Activities
         *********************************************************************************/

        /**
         * Activity model
         * @type {kidoju.data.Model}
         */
        models.LazyActivity = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                /*
                 created: {
                 type: DATE,
                 editable: false
                 },
                 */
                firstName: {
                    type: STRING,
                    editable: false
                },
                language: {
                    type: STRING,
                    editable: false
                },
                lastName: {
                    type: STRING,
                    editable: false
                },
                /*text: {
                 type: STRING,
                 nullable: true,
                 editable: false
                 },*/
                type: {
                    type: STRING,
                    editable: false
                },
                updated: {
                    type: DATE,
                    editable: false
                },
                score: {
                    type: NUMBER,
                    nullable: true,
                    editable: false
                },
                summaryId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                title: {
                    type: STRING,
                    editable: false
                },
                userId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                versionId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                }/*,
                 value: {
                 type: NUMBER,
                 nullable: true,
                 editable: false
                 }*/
            },
            actorName$: function () {
                return ((this.get('firstName') || '').trim() + ' ' + (this.get('lastName') || '').trim()).trim();
            },
            actorUri$: function () {
                return kendo.format(uris.webapp.user, this.get('language'), this.get('userId'));
            },
            scoreUri$: function () {
                return kendo.format(uris.webapp.player, this.get('language'), this.get('summaryId'), this.get('versionId')) +
                    kendo.format('#/report/{0}', this.get('id')); // TODO: add to config files
            },
            summaryUri$: function () {
                // Some activities like `creation` may refer to unpublished summaries and we do not know whether the summary is published or not
                // Therefore, we should always bypass server-side data requests to display such summaries
                // This is not an issue regarding SEO because activities are only displayed to authenticated user
                return kendo.format(uris.webapp.summary, this.get('language'), this.get('summaryId')) + '?bypass=true';
            }
        });

        /**
         * Datasource of user activities
         * @type {kendo.Observable}
         */
        models.LazyActivityDataSource = DataSource.extend({

            init: function (options) {
                var that = this;

                that.summaryId = options && options.summaryId;

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        read: $.proxy(that._transport._read, that)
                    },
                    serverFiltering: true,
                    serverSorting: true,
                    pageSize: 5,
                    serverPaging: true,
                    schema: {
                        data: 'data',
                        total: 'total',
                        errors: 'error',
                        modelBase: models.LazyActivity,
                        model: models.LazyActivity,
                        parse: function (response) {
                            // we parse the response to flatten data for our LazyActivity model (instead of using field.from and field.defaultValue definitions)
                            if (response && $.type(response.total === NUMBER && $.isArray(response.data))) {

                                /* This function's cyclomatic complexity is too high. */
                                /* jshint -W074 */

                                $.each(response.data, function (index, activity) {
                                    // Flatten actor
                                    activity.userId = activity.actor && activity.actor.userId || null;
                                    activity.firstName = activity.actor && activity.actor.firstName || '';
                                    activity.lastName = activity.actor && activity.actor.lastName || '';
                                    if (activity.actor) {
                                        delete activity.actor;
                                    }
                                    // Flatten version
                                    activity.language = activity.version && activity.version.language || LOCALE;
                                    activity.summaryId = activity.version && activity.version.summaryId || null;
                                    activity.title = activity.version && activity.version.title || '';
                                    activity.versionId = activity.version && activity.version.versionId || null;
                                    if (activity.version) {
                                        delete activity.version;
                                    }
                                });

                                /* jshint +W074 */
                            }
                            return response;
                        }
                    }
                }, options));
            },
            load: function (options) {
                var that = this;
                that.summaryId = options && options.summaryId;
                return that.query(options);
                // return that.read();
            },
            /*
             * Setting _transport._read here with a reference above is a trick
             * so as to be able to replace this function in mockup scenarios
             */
            _transport: {
                _read: function (options) {

                    var that = this;

                    logger.debug({
                        message: 'dataSource.read',
                        method: 'app.models.LazyActivityDataSource.transport.read',
                        data: { summaryId: that.summaryId }
                    });

                    if (RX_MONGODB_ID.test(that.summaryId)) { // If we have a summaryId for the content being displayed, we fetch summary activities

                        options.data.fields = 'actor,score,type,updated,version';
                        options.data.sort = options.data.sort || [{ field: 'updated', dir: 'desc' }];

                        rapi.v1.content.findSummaryActivities(LOCALE, that.summaryId, options.data)
                            .done(function (response) {
                                options.success(response);
                            })
                            .fail(function (xhr, status, error) {
                                options.error(xhr, status, error);
                            });

                    } else { // Without a summaryId, we need an authenticated user to fetch user activities

                        // options.data.fields = 'actor,score,type,updated,version'; <-- actor is always the same
                        options.data.fields = 'score,type,updated,version';
                        options.data.sort = options.data.sort || [{ field: 'updated', dir: 'desc' }];

                        rapi.v1.user.findMyActivities(LOCALE, options.data)
                            .done(function (response) {
                                options.success(response);
                            })
                            .fail(function (xhr, status, error) {
                                options.error(xhr, status, error);
                            });
                    }
                }
            }
        });

        /**
         * Activity model
         * @type {kidoju.data.Model}
         */
        models.Activity = Model.define({
            id: 'id',
            fields: {
                id: {
                    type: STRING,
                    editable: false,
                    nullable: true
                },
                actor: { // <--- models.UserReference
                    // For complex types, the recommendation is to leave the type undefined and set a default value
                    // See: http://www.telerik.com/forums/model---complex-model-with-nested-objects-or-list-of-objects
                    // See: http://demos.telerik.com/kendo-ui/grid/editing-custom
                    defaultValue: null,
                    parse: function (value) {
                        return (value instanceof models.UserReference || value === null) ? value : new models.UserReference(value);
                    }
                },
                created: {
                    type: DATE,
                    editable: false
                },
                type: {
                    type: STRING,
                    editable: false
                },
                updated: {
                    type: DATE,
                    editable: false
                },
                version: { // <--- models.VersionReference
                    // For complex types, the recommendation is to leave the type undefined and set a default value
                    // See: http://www.telerik.com/forums/model---complex-model-with-nested-objects-or-list-of-objects
                    // See: http://demos.telerik.com/kendo-ui/grid/editing-custom
                    defaultValue: null,
                    parse: function (value) {
                        return (value instanceof models.VersionReference || value === null) ? value : new models.VersionReference(value);
                    }
                }
            },
            load: function (summaryId, activityId) {
                var that = this;
                return rapi.v1.content.getSummaryActivity(LOCALE, summaryId, activityId)
                    .done(function (activity) {
                        that.accept(activity);
                    });
            },
            save: function () {
                var that = this;
                var language = that.get('version.language') || LOCALE;
                var summaryId = that.get('version.summaryId');
                var activity = that.toJSON(true); // true means with hierarchy of data sources
                if (that.isNew()) {
                    return rapi.v1.content.createSummaryActivity(language, summaryId, activity)
                        .done(function (data) {
                            // Note: data is not parsed, so dates are string
                            that.accept(data); // this updates dirty and updated
                        });
                } else {
                    var activityId = that.get('id');
                    return rapi.v1.content.updateSummaryActivity(language, summaryId, activityId, activity)
                        .done(function (data) {
                            // Note: data is not parsed, so dates are string
                            that.accept(data); // this updates dirty and updated
                        });
                }
            }
        });

        /**
         * Comment model
         * @type {kidoju.data.Model}
         */
        models.Comment = models.Activity.define({
            fields: {
                text: {
                    type: STRING
                },
                // the authenticated user
                userId: {
                    type: STRING,
                    editable: false,
                    nullable: true
                }
            },
            init: function (data) {
                // Call the base init method
                Model.fn.init.call(this, data);
                // Enforce the type
                this.type = 'comment';
            },
            actor$: function () {
                return ((this.get('actor.firstName') || '').trim() + ' ' + (this.get('actor.lastName') || '').trim()).trim();
            },
            // TODO: add actorUri$
            isEditable$: function () {
                return this.get('actor.userId') === this.get('userId');
            },
            color$: function () {
                var hex = '000000';
                var name = this.get('actor.lastName');
                for (var i = 0; i < Math.min(3, name.length) ; i++) {
                    // 26 alphabet lower case letters spanning char codes 65 to 91,
                    // we need to 'space' them to create more color variety
                    hex += ((43 * name.charCodeAt(i)) % 256).toString(16);
                }
                return '#' + hex.slice(-6);
            }
        });

        /**
         * Datasource of comments
         * @type {kendo.Observable}
         */
        models.CommentDataSource = DataSource.extend({

            init: function (options) {
                var that = this;
                that.userId = options && options.userId; // the authenticated user
                that.summaryId = options && options.summaryId;

                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        create: $.proxy(that._transport._create, that),
                        destroy: $.proxy(that._transport._destroy, that),
                        read: $.proxy(that._transport._read, that),
                        update: $.proxy(that._transport._update, that)
                    },
                    serverFiltering: true,
                    serverSorting: true,
                    pageSize: 5,
                    serverPaging: true,
                    schema: {
                        data: function (response) {
                            // See: http://www.telerik.com/forums/transport-methods-and-ids-created-on-the-server
                            if (response && $.type(response.total) === NUMBER && $.isArray(response.data)) { // read list
                                return response.data;
                            } else { // create, update, delete
                                return response;
                            }
                        },
                        total: 'total',
                        errors: 'error',
                        modelBase: models.Comment,
                        model: models.Comment,
                        parse: function (response) {
                            // add userId of authenticated user
                            if (response) {
                                if ($.type(response.total) === NUMBER && $.isArray(response.data)) { // a read
                                    $.each(response.data, function (index, comment) {
                                        comment.userId = that.userId;
                                    });
                                } else { // a create or update
                                    response.userId = that.userId;
                                }
                            }
                            return response;
                        }
                    }
                }, options));
            },
            load: function (options) {
                var that = this;
                that.summaryId = options && options.summaryId;
                that.userId = options && options.userId;
                return that.query(options);
            },
            /*
             * Setting _transport._read here with a reference above is a trick
             * so as to be able to replace this function in mockup scenarios
             */
            _transport: {
                _create: function (options) {
                    var that = this;
                    rapi.v1.content.createSummaryActivity(
                            (options.data.version && options.data.version.language) || LOCALE,
                            (options.data.version && options.data.version.summaryId) || that.summaryId,
                        { type: 'comment', text: options.data.text }
                        )
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                },
                _destroy: function (options) {
                    var that = this;
                    rapi.v1.content.deleteSummaryActivity(
                        options.data.version.language,
                        options.data.version.summaryId,
                        options.data.id
                        )
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                },
                _read: function (options) {
                    var that = this;
                    // We cannot fetch activities without a summary Id
                    assert.match(RX_MONGODB_ID, that.summaryId, kendo.format(assert.messages.match.default, 'this.summaryId', RX_MONGODB_ID));
                    options.data.fields = 'actor,created,text,updated,version';
                    options.data.filter = { field: 'type', operator: 'eq', value: 'Comment' };
                    options.data.sort = [{ field: 'id', dir: 'desc' }];
                    rapi.v1.content.findSummaryActivities(
                        LOCALE,
                        that.summaryId,
                        options.data
                        )
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                },
                _update: function (options) {
                    rapi.v1.content.updateSummaryActivity(
                        options.data.version.language,
                        options.data.version.summaryId,
                        options.data.id,
                        { text: options.data.text }
                        )
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                }
            }
        });

        /**
         * Score model
         * @type {kidoju.data.Model}
         */
        models.Score = models.Activity.define({
            fields: {
                test: {
                    defaultValue: null
                    /*
                     A test is a hash object of
                     val_abcd: {
                     result: true/false,
                     score: n,
                     value: 'user answer'
                     }
                     */
                },
                score: {
                    type: NUMBER,
                    editable: false
                }
            },
            init: function (data) {
                // Call the base init method
                Model.fn.init.call(this, data);
                // Enforce the type
                this.type = 'score';
            },
            name$ : function () {
                var id = this.get('id');
                if (RX_MONGODB_ID.test(id)) {
                    return kendo.format('{0:' + i18n.culture.dateFormat + '} ({1:p0})', this.get('created'), this.get('score') / 100);
                }
            }
        });

        /**
         * Datasource of summary scores
         * This is used both for the leaderboard on the summary page and in the player, accordingly, userId is optional
         * @type {kendo.Observable}
         */
        models.ScoreDataSource = DataSource.extend({

            init: function (options) {
                var that = this;
                that.summaryId = options && options.summaryId;
                that.userId = options && options.userId; // optional authenticated user
                that.versionId = options && options.versionId;
                DataSource.fn.init.call(that, $.extend(true, {}, {
                    transport: {
                        read: $.proxy(that._transport._read, that)
                    },
                    serverFiltering: true,
                    serverSorting: true,
                    pageSize: 100,
                    serverPaging: true,
                    schema: {
                        data: function (response) {
                            // See: http://www.telerik.com/forums/transport-methods-and-ids-created-on-the-server
                            if (response && $.type(response.total) === NUMBER && $.isArray(response.data)) { // read list
                                return response.data;
                            } else { // create, update, delete
                                return response;
                            }
                        },
                        total: 'total',
                        errors: 'error',
                        modelBase: models.Score,
                        model: models.Score,
                        parse: function (response) {
                            // add userId of authenticated user
                            if (response) {
                                if ($.type(response.total) === NUMBER && $.isArray(response.data)) { // a read
                                    $.each(response.data, function (index, comment) {
                                        comment.userId = that.userId;
                                    });
                                } else { // a create or update
                                    response.userId = that.userId;
                                }
                            }
                            return response;
                        }
                    }
                }, options));
            },
            load: function (options) {
                var that = this;
                that.summaryId = options && options.summaryId;
                that.userId = options && options.userId;
                that.versionId = options && options.versionId;
                return that.query(options);
            },
            /*
             * Setting _transport._read here with a reference above is a trick
             * so as to be able to replace this function in mockup scenarios
             */
            _transport: {
                _read: function (options) {
                    var that = this;
                    // We cannot fetch scores without a summary Id, version Id and user Id
                    assert.match(RX_MONGODB_ID, that.summaryId, kendo.format(assert.messages.match.default, 'this.summaryId', RX_MONGODB_ID));
                    // assert.match(RX_MONGODB_ID, that.userId, kendo.format(assert.messages.match.default, 'this.userId', RX_MONGODB_ID));
                    assert.match(RX_MONGODB_ID, that.versionId, kendo.format(assert.messages.match.default, 'this.versionId', RX_MONGODB_ID));
                    options.data.fields = 'created,score,test,updated'; // Cannot get created without updated
                    options.data.filter = [
                        { field: 'type', operator: 'eq', value: 'Score' },
                        { field: 'version.versionId', operator: 'eq', value: that.versionId }
                    ];
                    if (RX_MONGODB_ID.test(that.userId)) {
                        options.data.filter.push({ field: 'actor.userId', operator: 'eq', value: that.userId });
                    }
                    options.data.sort = [{ field: 'id', dir: 'desc' }];
                    rapi.v1.content.findSummaryActivities(
                        LOCALE,
                        that.summaryId,
                        options.data
                        )
                        .done(function (response) {
                            options.success(response);
                        })
                        .fail(function (xhr, status, error) {
                            options.error(xhr, status, error);
                        });
                }
            }
        });


    }(window.jQuery));

    /* jshint +W073 */
    /* jshint +W071 */

    return window.app;

}, typeof define === 'function' && define.amd ? define : function (_, f) { 'use strict'; f(); });