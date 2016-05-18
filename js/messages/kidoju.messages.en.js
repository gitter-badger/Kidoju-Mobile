/**
 * Copyright (c) 2013-2016 Memba Sarl. All rights reserved.
 * Sources at https://github.com/Memba
 */

/* jshint browser: true, jquery: true */
/* globals define: false */

(function (f, define) {
    'use strict';
    define([], f);
})(function () {

    'use strict';

    var kendo = window.kendo;
    var ui = kendo.ui;
    var options;

    /*  This function has too many statements. */
    /* jshint -W071 */

    /*  This function's cyclomatic complexity is too high. */
    /* jshint -W074 */

    (function ($, undefined) {

        /* kidoju.widgets.assetmanager */
        if (ui.AssetManager) {
            options = ui.AssetManager.prototype.options;
            options.messages = $.extend(true, options.messages, {
                toolbar: {
                    upload: 'Upload',
                    delete: 'Delete',
                    filter: 'Collection: ',
                    search: 'Search'
                },
                tabs: {
                    default: 'Project'
                }
            });
        }

        /* kidoju.widgets.codeeditor */
        /*
        if (ui.CodeEditor) {
             options = ui.CodeEditor.prototype.options;
             options.messages = $.extend(true, options.messages, {
                // TODO
            });
        }
        */

        /* kidoju.widgets.codeinput */
        /*
         if (ui.CodeInput) {
             options = ui.CodeInput.prototype.options;
             options.messages = $.extend(true, options.messages, {
                // TODO
            });
         }
         */

        /* kidoju.widgets.explorer */
        if (ui.Explorer) {
            options = ui.Explorer.prototype.options;
            options.messages = $.extend(true, options.messages, {
                empty: 'No item to display'
            });
        }

        /* kidoju.widgets.mediaplayer */
        if (ui.MediaPlayer) {
            options = ui.MediaPlayer.prototype.options;
            options.messages = $.extend(true, options.messages, {
                play: 'Play/Pause',
                mute: 'Mute/Unmute',
                full: 'Full Screen',
                notSupported: 'Media not supported'
            });
        }

        /* kidoju.widgets.multiinput */
        if (ui.MultiInput) {
            options = ui.MultiInput.prototype.options;
            options.messages = $.extend(true, options.messages, {
                delete: 'Delete'
            });
        }

        /* kidoju.widgets.navigation */
        if (ui.Navigation) {
            options = ui.Navigation.prototype.options;
            options.messages = $.extend(true, options.messages, {
                empty: 'No item to display'
            });
        }

        /* kidoju.widgets.playbar */
        if (ui.PlayBar) {
            options = ui.PlayBar.prototype.options;
            options.messages = $.extend(true, options.messages, {
                empty: 'No page to display',
                page: 'Page',
                of: 'of {0}',
                first: 'Go to the first page',
                previous: 'Go to the previous page',
                next: 'Go to the next page',
                last: 'Go to the last page',
                refresh: 'Refresh',
                morePages: 'More pages'
            });
        }

        /* kidoju.widgets.propertygrid */
        if (ui.PropertyGrid) {
            options = ui.PropertyGrid.prototype.options;
            options.messages = $.extend(true, options.messages, {
                property: 'Property',
                value: 'Value'
            });
        }

        /* kidoju.widgets.quiz */
        if (ui.Quiz) {
            options = ui.Quiz.prototype.options;
            options.messages = $.extend(true, options.messages, {
                optionLabel: 'Select...'
            });
        }

        /* kidoju.widgets.rating */
        /*
        if (ui.Rating) {
             options = ui.Rating.prototype.options;
             options.messages = $.extend(true, options.messages, {
                // TODO
            });
        }
        */

        /* kidoju.widgets.social */
        /*
        if (ui.Social) {
             options = ui.Social.prototype.options;
             options.messages = $.extend(true, options.messages, {
                // TODO
            });
        }
        */

        /* kidoju.widgets.stage */
        if (ui.Stage) {
            options = ui.Stage.prototype.options;
            options.messages = $.extend(true, options.messages, {
                noPage: 'Please add or select a page'
            });
        }

        /* kidoju.widgets.styleeditor */
        if (ui.StyleEditor) {
            options = ui.StyleEditor.prototype.options;
            options.messages = $.extend(true, options.messages, {
                columns: {
                    name: 'Name',
                    value: 'Value'
                },
                toolbar: {
                    create: 'New Style',
                    destroy: 'Delete'
                },
                validation: {
                    name: 'Name is required',
                    value: 'Value is required'
                }
            });
        }

        /* kidoju.widgets.toolbox */
        /*
        if (ui.ToolBox) {
             options = ui.ToolBox.prototype.options;
             options.messages = $.extend(true, options.messages, {
                // TODO
            });
        }
        */


        /**
         * kidoju.tools
         */

        if (window.kidoju) {

            var kidoju = window.kidoju;
            var tools = kidoju.tools;
            var Tool = kidoju.Tool;
            var attributes;
            var properties;

            // if (kidoju.Tool instanceof Function) {
            if (Tool && Tool.constructor && Tool.constructor.name === 'Function') {
                Tool.prototype.i18n = $.extend(true, Tool.prototype.i18n, {
                    tool: {
                        top: { title: 'Top' },
                        left: { title: 'Left' },
                        height: { title: 'Height' },
                        width: { title: 'Width' },
                        rotate: { title: 'Rotate' }
                    },
                    dialogs: {
                        ok: { text: 'OK' },
                        cancel: { text: 'Cancel' }
                    }
                });
            }

            if (tools instanceof kendo.Observable) {

                if (tools.audio instanceof Tool) {
                    // Description
                    tools.audio.constructor.prototype.description = 'Audio Player';
                    // Attributes
                    attributes = tools.audio.constructor.prototype.attributes;
                    attributes.autoplay.title = 'Autoplay';
                    attributes.mp3.title = 'MP3 File';
                    attributes.ogg.title = 'OGG File';
                }

                if (tools.chargrid instanceof Tool) {
                    // Description
                    tools.chargrid.constructor.prototype.description = 'Character Grid';
                    // Attributes
                    attributes = tools.chargrid.constructor.prototype.attributes;
                    attributes.blank.title = 'Blank';
                    attributes.columns.title = 'Columns';
                    attributes.layout.title = 'Layout';
                    attributes.rows.title = 'Rows';
                    attributes.whitelist.title = 'Whitelist';
                    // Properties
                    properties = tools.chargrid.constructor.prototype.attributes;
                    properties.name.title = 'Name';
                    properties.description.title = 'Description';
                    properties.solution.title = 'Solution';
                    properties.validation.title = 'Validation';
                    properties.success.title = 'Success';
                    properties.failure.title = 'Failure';
                    properties.omit.title = 'Omit';
                }

                if (tools.checkbox instanceof Tool) {
                    // Description
                    tools.checkbox.constructor.prototype.description = 'CheckBox';
                    // Attributes
                    attributes = tools.checkbox.constructor.prototype.attributes;
                    attributes.data.title = 'Values';
                    attributes.data.defaultValue = 'Option 1\nOption 2';
                    attributes.groupStyle.title = 'Group Style';
                    attributes.itemStyle.title = 'Item Style';
                    attributes.selectedStyle.title = 'Select. Style';
                    // Properties
                    properties = tools.checkbox.constructor.prototype.properties;
                    properties.name.title = 'Name';
                    properties.description.title = 'Description';
                    properties.solution.title = 'Solution';
                    properties.validation.title = 'Validation';
                    properties.success.title = 'Success';
                    properties.failure.title = 'Failure';
                    properties.omit.title = 'Omit';
                }

                if (tools.connector instanceof Tool) {
                    // Description
                    tools.connector.constructor.prototype.description = 'Connector';
                    // Attributes
                    attributes = tools.connector.constructor.prototype.attributes;
                    attributes.color.title = 'Color';
                    // Properties
                    properties = tools.connector.constructor.prototype.properties;
                    properties.name.title = 'Name';
                    properties.description.title = 'Description';
                    properties.solution.title = 'Solution';
                    properties.validation.title = 'Validation';
                    properties.success.title = 'Success';
                    properties.failure.title = 'Failure';
                    properties.omit.title = 'Omit';
                }

                if (tools.dropzone instanceof Tool) {
                    // Description
                    tools.dropzone.constructor.prototype.description = 'Drop Zone';
                    // Attributes
                    attributes = tools.dropzone.constructor.prototype.attributes;
                    attributes.style.title = 'Style';
                    attributes.text.title = 'Text';
                    attributes.text.defaultValue = 'Please drop here.';
                    // Properties
                    properties = tools.dropzone.constructor.prototype.properties;
                    properties.name.title = 'Name';
                    properties.description.title = 'Description';
                    properties.solution.title = 'Solution';
                    properties.validation.title = 'Validation';
                    properties.success.title = 'Success';
                    properties.failure.title = 'Failure';
                    properties.omit.title = 'Omit';
                }

                if (tools.image instanceof Tool) {
                    // Description
                    tools.image.constructor.prototype.description = 'Image';
                    // Attributes
                    attributes = tools.image.constructor.prototype.attributes;
                    attributes.alt.title = 'Text';
                    attributes.alt.defaultValue = 'Image';
                    attributes.src.title = 'Source';
                    attributes.style.title = 'Style';
                    // Properties
                    properties = tools.image.constructor.prototype.properties;
                    properties.draggable.title = 'Draggable';
                    properties.dropValue.title = 'Value';
                }

                if (tools.label instanceof Tool) {
                    // Description
                    tools.label.constructor.prototype.description = 'Label';
                    // Attributes
                    attributes = tools.label.constructor.prototype.attributes;
                    attributes.style.title = 'Style';
                    attributes.text.title = 'Text';
                    attributes.text.defaultValue = 'Label';
                    // Properties
                    properties = tools.label.constructor.prototype.properties;
                    properties.draggable.title = 'Draggable';
                    properties.dropValue.title = 'Value';
                }

                if (tools.mathexpression instanceof Tool) {
                    // Description
                    tools.mathexpression.constructor.prototype.description = 'Math Expression';
                    // Attributes
                    attributes = tools.mathexpression.constructor.prototype.attributes;
                    attributes.formula.title = 'Formula';
                    attributes.style.title = 'Style';
                }

                if (tools.quiz instanceof Tool) {
                    // Description
                    tools.quiz.constructor.prototype.description = 'Quiz';
                    // Attributes
                    attributes = tools.quiz.constructor.prototype.attributes;
                    attributes.data.title = 'Values';
                    attributes.data.defaultValue = 'True\nFalse';
                    attributes.groupStyle.title = 'Group Style';
                    attributes.itemStyle.title = 'Item Style';
                    attributes.mode.title = 'Mode';
                    attributes.selectedStyle.title = 'Select. Style';
                    // Properties
                    properties = tools.quiz.constructor.prototype.properties;
                    properties.name.title = 'Name';
                    properties.description.title = 'Description';
                    properties.solution.title = 'Solution';
                    properties.validation.title = 'Validation';
                    properties.success.title = 'Success';
                    properties.failure.title = 'Failure';
                    properties.omit.title = 'Omit';
                }

                if (tools.textbox instanceof Tool) {
                    // Description
                    tools.textbox.constructor.prototype.description = 'TextBox';
                    // Attributes
                    attributes = tools.textbox.constructor.prototype.attributes;
                    attributes.style.title = 'Style';
                    // Properties
                    properties = tools.textbox.constructor.prototype.properties;
                    properties.name.title = 'Name';
                    properties.description.title = 'Description';
                    properties.solution.title = 'Solution';
                    properties.validation.title = 'Validation';
                    properties.success.title = 'Success';
                    properties.failure.title = 'Failure';
                    properties.omit.title = 'Omit';
                }

                if (tools.video instanceof Tool) {
                    // Description
                    tools.video.constructor.prototype.description = 'Video Player';
                    // Attributes
                    attributes = tools.video.constructor.prototype.attributes;
                    attributes.autoplay.title = 'Autoplay';
                    attributes.toolbarHeight.title = 'Toolbar Height';
                    attributes.mp4.title = 'MP4 File';
                    attributes.ogv.title = 'OGV File';
                    attributes.wbem.title = 'Fichier WBEM';
                }
            }

        }

    })(window.kendo.jQuery);

    /* jshint +W074 */
    /* jshint +W071 */

    return window.kendo;

}, typeof define === 'function' && define.amd ? define : function (_, f) { 'use strict'; f(); });