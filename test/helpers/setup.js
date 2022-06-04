import { timeforce, relation, state } from './timeforceApi.js';
import { app, appService } from './api.js';

// setup
var sync = timeforce.sync;
var persist = timeforce.persist;
var env = {
    dispatch: '',
};

// We never want to actually call these during tests.
typeof history !== "undefined" && (history.pushState = history.replaceState = function () { });

// Capture axios settings for comparison.
timeforce.persist = function (settings, config) {
    env.persistSettings = settings;
    if (env.dispatch != '')
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                settings[env.dispatch]([]);
                env.dispatch === 'success' ? resolve() : reject();
            }, 20);
        });

    return persist.apply(this, arguments);
};

// Capture the arguments to timeforce.sync for comparison.
timeforce.sync = function (method, model, options) {
    env.syncArgs = {
        method: method,
        model: model,
        options: options
    };

    return sync.apply(this, arguments);
};



export { env, timeforce, relation, state, app, appService };