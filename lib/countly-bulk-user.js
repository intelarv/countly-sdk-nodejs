/**
 * CountlyBulkUser object to make it easier to send information about specific user in bulk requests
 * @name CountlyBulkUser
 * @module lib/countly-bulk-user
 * @example
 * var CountlyBulk = require('countly-sdk-nodejs').Bulk;
 *
 * var server = new CountlyBulk({
 *   app_key: "{YOUR-API-KEY}",
 *   url: "https://API_HOST/",
 *   debug: true
 * });

 * //adding requests by user
 * var user = server.add_user({device_id:"my_device_id"});
 */

/**
 * @lends module:lib/countly-bulk-user
 * Initialize CountlyBulkUser object
 * @param {Object} conf - CountlyBulkUser configuration options
 * @param {Object} conf.server - CountlyBulk instance with server configuration
 * @param {string} conf.device_id - identification of the user
 * @param {string=} conf.country_code - country code for your user
 * @param {string=} conf.city - name of the city of your user
 * @param {string=} conf.ip_address - ip address of your user
 * @returns {module:lib/countly-bulk-user} instance
 * @example
 * var CountlyBulk = require('countly-sdk-nodejs').Bulk;
 *
 * var server = new CountlyBulk({
 *   app_key: "{YOUR-API-KEY}",
 *   url: "https://API_HOST/",
 *   debug: true
 * });
 
 * //adding requests by user
 * var user = server.add_user({device_id:"my_device_id"});
 * user.begin_session().add_event({key:"Test", count:1})
 */
function CountlyBulkUser(conf){
    'use strict';
    
    var sessionStart = 0;

    if(!conf.device_id){
        log("device_id is missing");
        return;
    }
    
    if(!conf.server){
        log("server instance is missing");
        return;
    }
    
    /**
    * Start user's sesssion
    * @param {Object} metrics - provide {@link Metrics} for this user/device, or else will try to collect what's possible
    * @param {string} metrics._os - name of platform/operating system
    * @param {string} metrics._os_version - version of platform/operating system
    * @param {string=} metrics._device - device name
    * @param {string=} metrics._resolution - screen resolution of the device
    * @param {string=} metrics._carrier - carrier or operator used for connection
    * @param {string=} metrics._density - screen density of the device
    * @param {string=} metrics._locale - locale or language of the device in ISO format
    * @param {string=} metrics._store - source from where the user/device/installation came from
    * @param {number} seconds - how long did the session last in seconds
    * @param {number} timestamp - timestamp when session started
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.begin_session = function(metrics, seconds, timestamp){
        var bulk = [];
        var query = prepareQuery({begin_session:1, metrics:metrics});
        if(conf.country_code)
            query.country_code = conf.country_code;
        if(conf.city)
            query.city = conf.city;
        if(timestamp){
            sessionStart = timestamp;
            query.timestamp = timestamp;
        }
        bulk.push(query);
        
        seconds = parseInt(seconds || 0);
        
        var beatCount = Math.ceil(seconds/60);
        for(var i = 0; i < beatCount; i++){
            if(seconds > 0){
                query = prepareQuery();
                if(seconds > 60)
                    query.session_duration = 60;
                else
                    query.session_duration = seconds;
                if(conf.ip_address)
                    query.ip_address = conf.ip_address;
                if(timestamp){
                    query.timestamp = timestamp+((i+1)*60);
                }
                seconds -= 60;
                bulk.push(query);
            }
        }
        conf.server.add_bulk_request(bulk);
        return this;
    }
    
    /**
    * Report custom event
    * @param {Event} event - Countly {@link Event} object
    * @param {string} event.key - name or id of the event
    * @param {number} [event.count=1] - how many times did event occur
    * @param {number=} event.sum - sum to report with event (if any)
    * @param {number=} event.dur - duration to report with event (if any)
    * @param {number=} event.timestamp - timestamp when event occurred
    * @param {Object=} event.segmentation - object with segments key /values
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.add_event = function(event){
        conf.server.add_event(conf.device_id, event);
        return this;
    };
    
    /**
    * Report user data
    * @param {Object} user - Countly {@link UserDetails} object
    * @param {string=} user.name - user's full name
    * @param {string=} user.username - user's username or nickname
    * @param {string=} user.email - user's email address
    * @param {string=} user.organization - user's organization or company
    * @param {string=} user.phone - user's phone number
    * @param {string=} user.picture - url to user's picture
    * @param {string=} user.gender - M value for male and F value for femail
    * @param {number=} user.byear - user's birth year used to calculate current age
    * @param {Object=} user.custom - object with custom key value properties you want to save with user
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.user_details = function(user){
        var props = ["name", "username", "email", "organization", "phone", "picture", "gender", "byear", "custom"];
        var query = prepareQuery({user_details: getProperties(user, props)});
        conf.server.add_request(query);
        return this;
    };
    
    /**
    * Report user conversion to the server (when you retrieved countly campaign data, for example through Android INSTALL_REFERER intent)
    * @param {string} campaign_id - id of campaign, the last part of the countly campaign link
    * @param {string=} campaign_user_id - id of user's clicked on campaign link, if you have one or provide null
    * @param {number=} timestamp - timestamp of the conversion
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.report_conversion = function(campaign_id, campaign_user_id, timestamp){
        var query = prepareQuery();
        
        if(campaign_id)
            query.campaign_id = campaign_id;
        
        if(campaign_user_id)
            query.campaign_user = campaign_user_id;
        
        if(timestamp || sessionStart !== 0)
            query.timestamp = timestamp || sessionStart;
        
        conf.server.add_request(query);
        return this;
    };
    
    /**
    * Report user accessing specific view in your application
    * @param {string} view_name - name of the view or any other view identifier
    * @param {string} platform - on which platforms/os did user access this view
    * @param {number} timestamp - when user accessed the view
    * @param {number} duration - how much did user spent on this view
    * @param {boolean=} landing - true if user started using your app with this view
    * @param {boolean=} exit - true if user exited your app after this view
    * @param {boolean=} bounce - true if user bounced having only one view and without much interaction with the app 
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.report_view = function(view_name, platform, timestamp, duration, landing, exit, bounce){
        var event = {
            "key": "[CLY]_view",
            "dur": duration,
            "count": 1,
            "segmentation": {
                "name": view_name,
                "visit":1,
                "segment":platform
            }
        };
        if(landing){
            event.segmentation.start = 1;
        }
        if(exit){
            event.segmentation.exit = 1;
        }
        if(bounce){
            event.segmentation.bounce = 1;
        }
        var query = prepareQuery({events:[event]});
        if(timestamp)
            query.timestamp = timestamp
        conf.server.add_request(query);
        return this;
    };
    
    /**
    * Report rating user left on the app
    * @param {number} rating - rating from 1 to 5
    * @param {string} platform - on which platforms/os did user leave rating
    * @param {number} app_version - for which app_version did user leave rating
    * @param {number} timestamp - when user rated the app
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.report_rating = function(rating, platform, app_version, timestamp){
        var event = {
            "key": "[CLY]_star_rating",
            "count": 1,
            "segmentation": {
                "rating": rating,
                "app_version":app_version,
                "platform":platform
            }
        };
        var query = prepareQuery({events:[event]});
        if(timestamp)
            query.timestamp = timestamp
        conf.server.add_request(query);
        return this;
    };
    
    /**
    * Report crash
    * @param {Object} crash - object containing information about crash and state of device
    * @param {string} crash._os - Platform/OS of the device,
	* @param {string} crash._os_version - Platform's/OS version
	* @param {string=} crash._manufacture - manufacture of the device
	* @param {string=} crash._device - device model
	* @param {string=} crash._resolution - device resolution
	* @param {string} crash._app_version - version of the app that crashed
	* @param {string=} crash._cpu - type of cpu used on device (for ios will be based on device)
	* @param {string=} crash._opengl - version of open gl supported
	* @param {number=} crash._ram_current - used amount of ram at the time of crash in megabytes
	* @param {number=} crash._ram_total - total available amount of ram in megabytes
	* @param {number=} crash._disk_current - used amount of disk space at the time of crash in megabytes
	* @param {number=} crash._disk_total - total amount of disk space in megabytes
    * @param {number=} crash._bat - battery level from 0 to 100
	* @param {string=} crash._orientation - orientation in which device was held, landscape, portrait, etc
	* @param {boolean=} crash._root - true if device is rooted/jailbroken, false or not provided if not
	* @param {boolean=} crash._online - true if device is connected to the internet (WiFi or 3G), false or not provided if not connected
	* @param {boolean=} crash._muted - true if volume is off, device is in muted state
	* @param {boolean=} crash._background - true if app was in background when it crashed
	* @param {string=} crash._name - identfiiable name of the crash if provided by OS/Platform, else will use first line of stack
	* @param {string} crash._error - error stack, can provide multiple separated by blank new lines
	* @param {boolean=} crash._nonfatal - true if handled exception, false or not provided if unhandled crash
	* @param {string=} crash._logs - some additional logs provided, if any 
	* @param {number=} crash._run - running time since app start in seconds until crash
	* @param {string=} crash._custom - custom key values to record with crash report, like versions of other libraries and frameworks used, etc.
    * @param {number} timestamp - when crash happened
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.report_crash = function(crash, timestamp){
        var query = prepareQuery({crash:crash});
        if(timestamp)
            query.timestamp = timestamp
        conf.server.add_request(query);
        return this;
    };
    
    var customData = {};
    var change_custom_property = function(key, value, mod){
        if(!customData[key])
            customData[key] = {};
        if(mod == "$push" || mod == "$pull" || mod == "$addToSet"){
            if(!customData[key][mod])
                customData[key][mod] = [];
            customData[key][mod].push(value);
        }
        else
            customData[key][mod] = value;
    };
    
    /**
    * Sets user's custom property value
    * @param {string} key - name of the property to attach to user
    * @param {string|number} value - value to store under provided property
    * @returns {module:lib/countly-bulk-user} instance
    * @example
    * var CountlyBulk = require('countly-sdk-nodejs').Bulk;
    *
    * var server = new CountlyBulk({
    *   app_key: "{YOUR-API-KEY}",
    *   url: "https://API_HOST/",
    *   debug: true
    * });
    *
    * //adding requests by user
    * var user = server.addUser({device_id:"my_device_id"});
    * //set custom key value property
    * user.custom_set("twitter", "ar2rsawseen");
    * //create or increase specific number property
    * user.custom_increment("login_count");
    * //add new value to array property if it is not already there
    * user.custom_push_unique("selected_category", "IT");
    * //send all custom property modified data to server
    * user.custom_save();
    **/
    this.custom_set = function(key, value){
        customData[key] = value;
        return this;
    },
    /**
    * Sets user's custom property value only if it was not set before
    * @param {string} key - name of the property to attach to user
    * @param {string|number} value - value to store under provided property
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_set_once = function(key, value){
        change_custom_property(key, 1, "$setOnce");
        return this;
    },
    /**
    * Increment value under the key of this user's custom properties by one
    * @param {string} key - name of the property to attach to user
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_increment = function(key){
        change_custom_property(key, 1, "$inc");
        return this;
    },
    /**
    * Increment value under the key of this user's custom properties by provided value
    * @param {string} key - name of the property to attach to user
    * @param {number} value - value by which to increment server value
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_increment_by = function(key, value){
        change_custom_property(key, value, "$inc");
        return this;
    },
    /**
    * Multiply value under the key of this user's custom properties by provided value
    * @param {string} key - name of the property to attach to user
    * @param {number} value - value by which to multiply server value
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_multiply = function(key, value){
        change_custom_property(key, value, "$mul");
        return this;
    },
    /**
    * Save maximal value under the key of this user's custom properties
    * @param {string} key - name of the property to attach to user
    * @param {number} value - value which to compare to server's value and store maximal value of both provided
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_max = function(key, value){
        change_custom_property(key, value, "$max");
        return this;
    },
    /**
    * Save minimal value under the key of this user's custom properties
    * @param {string} key - name of the property to attach to user
    * @param {number} value - value which to compare to server's value and store minimal value of both provided
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_min = function(key, value){
        change_custom_property(key, value, "$min");
        return this;
    },
    /**
    * Add value to array under the key of this user's custom properties. If property is not an array, it will be converted to array
    * @param {string} key - name of the property to attach to user
    * @param {string|number} value - value which to add to array
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_push = function(key, value){
        change_custom_property(key, value, "$push");
        return this;
    },
    /**
    * Add value to array under the key of this user's custom properties, storing only unique values. If property is not an array, it will be converted to array
    * @param {string} key - name of the property to attach to user
    * @param {string|number} value - value which to add to array
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_push_unique = function(key, value){
        change_custom_property(key, value, "$addToSet");
        return this;
    },
    /**
    * Remove value from array under the key of this user's custom properties
    * @param {string} key - name of the property
    * @param {string|number} value - value which to remove from array
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_pull = function(key, value){
        change_custom_property(key, value, "$pull");
        return this;
    },
    /**
    * Save changes made to user's custom properties object and send them to server
    * @returns {module:lib/countly-bulk-user} instance
    **/
    this.custom_save = function(){
        var query = prepareQuery({user_details:{custom:customData}});
        conf.server.add_request(query);
        customData = {};
        return this;
    }
    
    function prepareQuery(query){
        query = query || {};
        if(!query.device_id)
            query.device_id = conf.device_id;
        if(conf.ip_address)
            query.ip_address = conf.ip_address;
        return query;
    }
    
    //retrieve only specific properties from object
    function getProperties(orig, props){
        var ob = {};
        var prop;
        for(var i = 0; i < props.length; i++){
            prop = props[i];
            if(typeof orig[prop] !== "undefined")
                ob[prop] = orig[prop];
        }
        return ob;
    }
};

module.exports = CountlyBulkUser;
