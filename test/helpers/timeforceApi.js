import _ from 'lodash';
import axios from 'axios';
import { extend, Events, Deep, timeforce } from 'timeforce';
import { mix as mixRelational, relation, state } from '../../src/relational.js';

// mix state first of all because it affects model constructor
mixRelational(timeforce, timeforce.Collection, timeforce.Model);

// Extend timeforce base
var timeforceApi = _.extend(_.omit(timeforce, 'Model', 'Collection', 'View'));
timeforceApi.name = 'API';
timeforceApi._global = timeforceApi;

// Extend timeforce classes
var Model = timeforceApi.Model = timeforce.Model.extend({ _global: timeforceApi });
var Collection = timeforceApi.Collection = timeforce.Collection.extend({ _global: timeforceApi });

// Global options used to create axios instances
timeforceApi.axios = axios;
timeforceApi.requestOptions = {};

// Ensure no cache
timeforceApi.axios.defaults.headers = _.defaultsDeep({
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
}, timeforceApi.axios.defaults.headers);

// Set the default implementation of `timeforce.api` to proxy through to `$`.
// Override this if you'd like to use a different library.
timeforceApi.persist = function (options, config) {
    var axiosInstance = timeforceApi.axios.create(config);

    // options.url += (!/\?/.test(options.url) ? '?' : '&') + 't=' + new Date().getTime();
    return new Promise((resolve, reject) => {
        axiosInstance[options.method](options.url, options.data, options).then((response) => {
            options.success(response.data || {});
            resolve(response);
        }).catch((error) => {
            var args;
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                args = [error.request, error.response.status, error.response.data];
            } else {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                args = [error.request, null, error.message];
            }
            options.error.apply(null, args);
            reject(args);
        });
    });
};

// Sync integration for Models and Collections
var sync = {
    // Access to root
    _global: timeforceApi,
    // Local options used to create axios instances
    requestOptions: {},

    // Proxy `timeforce.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function () {
        var args = _.concat(_.toArray(arguments), _.cloneDeep(this.requestOptions));
        return this._global.sync.apply(this, args);
    },
};

_.extend(timeforceApi.Model.prototype, sync);
_.extend(timeforceApi.Collection.prototype, sync);

timeforceApi.syncConfig = function (config) {
    // Default options, unless specified.
    return _.defaultsDeep(config, timeforceApi.requestOptions);
};

export { timeforceApi as timeforce, timeforceApi, Model, Collection, extend, Events, Deep, relation, state };
export default timeforceApi;