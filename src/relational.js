import _ from 'lodash';
import state from 'timeforce-state';
import mapping from './mapping.js';

var relational = { key: 'relations', },
    stateMap = state.map,
    relationMap = relational.map = Object.freeze({
        ...mapping.type,
        ..._.pick(mapping, 'instance', 'name', 'times')
    });

relational.globalPrototype = _.defaults({
    relation: Object.freeze({
        ..._.omit(mapping, 'prototypes', 'key')
    }),
    relationalInitialize() {
        if (!this[relational.key]) this[relational.key] = {};
        if (!this[mapping.key]) this[mapping.key] = [];
        this.mapRelations();
    },
    addRelation(name, obj, options = {}) {
        this[relational.key][name] = obj;
        return this._setRelationListener(obj, options);
    },
    addRelationList(name) {
        this[relational.key][name] = [];
    },
    addRelationListItem(name, obj, options = {}) {
        if (!_.isArray(this[relational.key][name])) return;
        this[relational.key][name].push(obj);
        return this._setRelationListener(obj, options);
    },
    _setRelationListener(obj, options = {}) {
        this._listenToState(obj, state.map.type.FETCH, options.listenTo);
        return obj;
    },
    findRelation(name, filter) {
        var result = this[relational.key][name];
        var filterFn = !filter ?
            null :
            (_.isFunction(filter) ? filter : (relation) => (filter + '') === (relation.get(relation.idAttribute) + ''));

        if (_.isArray(result)) {
            filterFn && (result = _.filter(result, filterFn));
        } else {
            result = [result];
        }
        return result;
    },
    findRelationBy(name, key, value) {
        var filterFn = (relation) => (value + '') === (relation.get(key) + '');
        return this.findRelation(name, filterFn);
    },
    filterAttributesAndFindRelation(name, filterFn) {
        var relationMap = this.getRelationMap(name),
            foreignKeyList = relationMap.foreignKey.split('.'),
            foreignKeyField = foreignKeyList.pop(),
            data;

        foreignKeyList = foreignKeyList.join('.');
        data = this.get(foreignKeyList);

        var matches = _.chain(data).filter(filterFn).map((item) => item[foreignKeyField] + '').value();
        var _filterFn = (relation) => _.indexOf(matches, relation.get(relation.idAttribute) + '') > -1;
        return this.findRelation(name, _filterFn);
    },
    matchAttributesAndFindRelations(name, key, value) {
        var filterFn = (item) => item[key] + '' === value + '';
        return this.filterAttributesAndFindRelation(name, filterFn);
    },
    getRelation(name, filter) {
        var result = this.findRelation(name, filter);
        return result ? result[0] : null;
    },
    getRelationBy(name, key, value) {
        var filterFn = (relation) => (value + '') === (relation.get(key) + '');
        return this.getRelation(name, filterFn);
    },
    _listenToState(obj, type, listenTo = 0) {
        if (listenTo === mapping.times.OFF) return;
        if (listenTo === mapping.times.ONCE)
            return this.listenToOnceOff(obj,
                [type, state.map.name[state.map.READY]].join(state.map.eventSplitter),
                () => this.triggerReady(type),
                [type, state.map.name[state.map.BROKEN]].join(state.map.eventSplitter),
                (obj, response, options) => this.triggerBroken(type, obj, response, options)
            );

        obj.on(
            [type, state.map.name[state.map.READY]].join(state.map.eventSplitter),
            () => this.triggerReady(type)
        );
        obj.on(
            [type, state.map.name[state.map.BROKEN]].join(state.map.eventSplitter),
            (obj, resp, options) => this.triggerBroken(type, obj, resp, options)
        );
    },
    relationsReady() {
        return this._listReady(relational.key);
    },
    _listReady(name) {
        var relationsCheck = this.checkLists(name, state.enum.READY);
        this[name + 'StateInfo'] = relationsCheck[1].join(', ');
        // console.log('-> _listReady of ', this.className || this.cid, relationsCheck[0], this[name + 'StateInfo'], _.size(this[relational.key]));

        // console.log('-- lists ready for ', this.cid, result, dependencyCheck[0], relationsCheck[0], this[relational.key]);

        return relationsCheck[0];
    },
    _fetchList(listName, itemName, options = {}) {
        var obj = this[listName][itemName];
        if (!obj) return;
        var list = _.isArray(obj) ? obj : [obj];

        for (var index in list) {
            let instance = list[index];
            let relation = this.getRelationMap(itemName) || {};
            if (relation.fetch === mapping.times.OFF ||
                (relation.fetch === mapping.times.ONCE && instance.isReady()))
                continue;

            instance[this.defineRelationFetchMethod(relation)](options);
        }
    },
    fetchRelation(name, options = {}) {
        return this._fetchList('relations', name, options);
    },
    fetchAllRelations(opts = {}) {
        if (_.size(this[relational.key])) {

            for (var name in this[relational.key]) {
                this.fetchRelation(name, opts);
            }
            return true;
        }
        return false;
    },
    fetchAll() {
        return new Promise((resolve, reject) => {
            this.onceOff(
                [state.map.type.FETCH, state.map.name[state.map.READY]].join(state.map.eventSplitter),
                () => resolve(),
                [state.map.type.FETCH, state.map.name[state.map.BROKEN]].join(state.map.eventSplitter),
                (model, response, options) => reject({ model, response, options })
            );

            (!this.isModel() || this.id) && this.fetch();
            this.fetchAllRelations();
        });
    },
}, mapping.prototypes, state.globalPrototype);

relational.modelPrototype = _.defaults({
    isReady() {
        var result = _.bind(state.modelPrototype.isReady, this)() && this.relationsReady();
        return result;
    },
    hasError() {
        var r = _.bind(state.modelPrototype.hasError, this)() || this.relationsReady() === false;
        return r;
    }
}, state.modelPrototype);

relational.collectionPrototype = _.defaults({
    isReady() {
        var result =
            _.bind(state.collectionPrototype.isReady, this)() &&
            this.relationsReady();
        return result;
    },
    hasError() {
        var result =
            _.bind(state.collectionPrototype.hasError, this)() ||
            this.relationsReady() === false;
        return result;
    },
    modelsReady() {
        var r = true,
            modelsCheck = this.checkLists('models', state.enum.READY);

        this.infoModelsReady = '';
        if (!modelsCheck[0]) {
            r = modelsCheck[0];
            this.infoModelsReady = modelsCheck[1].join(', ');
        }

        return r;
    }
}, state.collectionPrototype);

// Mix in each State methods as a proxy to `Collection#models`.
var mix = relational.mix = function (main, Collection, Model) {
    state.mix(main, Collection, Model);

    main.relation = relationMap;
    _.each([
        [Collection, _.defaults({}, relational.collectionPrototype, relational.globalPrototype)],
        [Model, _.defaults({}, relational.modelPrototype, relational.globalPrototype)]
    ], function (config) {
        var Class = config[0];
        var methods = config[1];

        _.each(methods, function (fn, method) {
            Class.prototype[method] = fn;
        });
        Class.prototype.initializePluginMethods.push('relationalInitialize');
    });
}

export { mix, relationMap as relation, stateMap as state };
export default relational;