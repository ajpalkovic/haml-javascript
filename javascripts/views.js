/**
 * This file is part of Schedulr.
 * 
 * Schedulr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Schedulr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with Schedulr.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * This is a simple set of functions for managing haml views throughout an app.
 * It maintains a cache of all of the views so that only one instance of a view exists in memory.
 * If a view is requested, but not available, it will make an ajax request to load the view.
 * There are two important settings, viewsRoot, and viewsExtension which are strings that are added to the beginning/end of any view path.
 * This is an extensible interface, as the viewType can be any javascript class which implements a compile and render method.
 */

(function($) {
	var defaults = {
		root: 'views/',
		extension: '.haml'
	};
	var options = $.extend(true, {}, ($.viewDefaults || {}), defaults);
	
    /**
     * Takes a view object or string, renders it, and replaces the html of the current node with the html from the view.
     */
    $.fn.render = function(view, data) {
        view = $.Views.get(view);
        if(view != null)
            this.html(view.render(data));
    };
    
    $.Views = {
        views: {},
        viewsRoot: options.root,
        viewsExtension: options.extension,
        viewType: HamlView,

        /**
         * Cruedly attempts to join two paths together properly such as:
         * test/directory/  /path/to/view
         * becomes:
         * test/directory/path/to/view
         */
        join: function(left, right) {
            left = left.trim();
            right = right.trim();

            if(left.length == 0) {
                return right;
            }
            if(right.length == 0) {
                return left;
            }
                    
            if(left.charAt(left.length-1) == "/") {
                left = left.substring(0, left.length-1);
            }
            if(right.charAt(0) == "/") {
                right = right.substring(1);
            }
            return left+"/"+right;
        },

        /**
         * Returns a view object for the specified view path.
         */
        get: function(view, prefix) {
            if(view instanceof this.viewType) {
                return view;
            }
            
            if(this.views[view] !== undefined) {
                return this.views[view];
            }
            
            if(view.charAt(0) !== '/' && prefix) {
                view = this.join(prefix, view);
            }
            
            if(this.views[view] !== undefined) {
                return this.views[view];
            }
                
            this.load(view);
            return this.views[view];
        },
            
        /**
         * Loads each of the views in views as an instance variable in obj.
         * Views is an object, the keys will be the names of the instance variables, and the values are the paths to the views.
         */
        getAll: function(obj, views) {
            var root = views.root || '';
            for(var key in views) {
                if(key == 'root')
                    continue;
                obj[key] = this.get(views[key], root);
            }
        },

        /**
         * Uses a true ajax request to load a view.
         */
        preload: function() {
            for(var view in arguments) {
                this.load(view, true);
            }
        },

        /**
         * Makes an ajax request to load a view at the specified path.
         */
        load: function(view, asynchronous) {
            var viewUrl = this.join(this.viewsRoot, view)+this.viewsExtension, t=this;
            $.ajax({
                url: viewUrl,
                error: function(xmlHttpRequest, errorMessage, error) {
                    //t.log.error('Failed to load view', view, viewUrl);
                }, success: function(data, status) {
                    t.add(view, data);
                    //t.log.debug('Loaded View Successfully', view);
                },
                async: false
            });
        },

        /**
         * Creates a new view object for the given view text.
         */
        add: function(view, data) {
            this.views[view] = new this.viewType(view, data);
            return this.views[view];
        },

        /**
         * Renders the given view.
         */
        render: function(view, data) {
            view = this.get(view);
            return view.render(data);
        }
    };
})(jQuery);