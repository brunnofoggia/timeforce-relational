
import _ from 'lodash';

var mapping = {
    key: 'relationsMap',
    collectionOfRelationSuffix: 'Collection',
    type: {
        BELONGSTO: 0,
        HASMANY: 1,
    },
    instance: {
        COLLECTION: 0,
        MODEL: 1,
    },
    times: {
        OFF: -1,
        ALWAYS: 0,
        ONCE: 1
    },
    name: ['BelongsTo', 'HasMany'],
};

mapping.globalOptions = [
    // belongsto
    {
        // only fetch if is not ready
        fetch: mapping.times.ONCE,
        // listen to collections once by default
        listen: function (relation) {
            return this.mapRelationInstanceType(relation) === mapping.instance.COLLECTION ?
                mapping.times.ONCE :
                mapping.times.ALWAYS;
        }
    },
    // hasmany
    {
        fetch: mapping.times.ONCE,
    },
];

mapping.prototypes = {
    getRelationMap(name) {
        return _.find(this[mapping.key], (relation) => relation.name === name);
    },
    mapRelations() {
        _.each(this[mapping.key], (relation, index) => {
            relation = this[mapping.key][index] = _.defaultsDeep(relation, mapping.globalOptions[relation.type] || {});
            this.mapRelation(relation, index);
        });
    },
    mapRelation(relation) {
        var fnName = 'mapRelation' + mapping.name[relation.type];
        this[fnName](relation);
    },
    mapRelationInstanceType(relation) {
        return ((relation.instance && relation.isModel()) || !!relation.model) ? mapping.instance.MODEL : mapping.instance.COLLECTION;
    },
    mapGetRelationClass(relation) {
        return relation.model || (!relation.collection ? null : relation.foreignKey ? relation.collection.prototype.model : relation.collection)
    },
    // will instantiate the object of a relation
    mapRelationInstanciate(relation) {
        var attributes = _.defaultsDeep({}, this.fnfy('attributes', relation)(relation, this) || {});
        var options = _.defaultsDeep({}, this.fnfy('options', relation)(relation, this) || {});
        var _class = this.mapGetRelationClass(relation);
        return relation.instance || (new _class(attributes, options));
    },
    _addMapRelationForeignKeyListener(relation, instance) {
        if (relation.foreignKey) {
            this.on('change:' + relation.foreignKey, () => {
                instance[this.defineRelationSetMethod(instance)](instance.idAttribute, this.get(relation.foreignKey));
                instance[this.defineRelationFetchMethod(relation)]();
            });
        }
    },
    // used when a relation has both model and collection
    mapCollectionOfRelation(relation) {
        if (!relation.foreignKey || !relation.collection) return;

        var collectionRelation = _.defaultsDeep({
            name: relation.collectionAlias || [relation.name, mapping.collectionOfRelationSuffix].join(''),
            type: mapping.type.BELONGSTO,
            instance: relation.collectionInstance,
            collection: relation.collection,
        }, mapping.globalOptions[mapping.type.BELONGSTO]);

        this.mapRelationBelongsTo(collectionRelation);
    },
    mapRelationBelongsTo(relation) {
        var instance = this.mapRelationInstanciate(relation),
            listen = this.fnfy('listen', relation);
        if (!instance) return;

        this.mapCollectionOfRelation(relation);
        this.addRelation(relation.name, instance, { listenTo: listen(relation, instance, this) });
        this._addMapRelationForeignKeyListener(relation, instance);

        return instance;
    },
    _addMapRelationForeignKeyListListener(relation) {
        if (relation.foreignKey) {
            // tem que ouvir 'envolvidos..usuarioId' inves de 'envolvidos' senao
            // qualquer alteracao nos envolvidos vai gerar recarregamento da model
            let foreignKey = relation.foreignKey.replace(/(\w+)\.(\w+)/, '$1..$2');
            this.on('change:' + foreignKey, (model, id) => {
                // console.log('onchange triggered for ', foreignKey, id);
                if (!id) return;

                let _class = this.mapGetRelationClass(relation);
                let instance = new _class();
                instance[this.defineRelationSetMethod(instance)](_class.prototype.idAttribute, id);

                let listen = this.fnfy('listen', relation);
                this.addRelationListItem(relation.name, instance, { listenTo: listen(relation, instance, this) });

                instance[this.defineRelationFetchMethod(relation)]();
            });
        }
    },
    mapRelationHasMany(relation, idList) {
        this.mapCollectionOfRelation(relation);
        this.addRelationList(relation.name);
        this._addMapRelationForeignKeyListListener(relation);
        if (!idList) return;
    },
    defineRelationFetchMethod(relation) {
        !relation && (relation = {});
        return relation.deep ? 'fetchAll' : 'fetch';
    },
    defineRelationSetMethod(instance) {
        return instance.isModel() ? 'set' : 'setForm';
    }
};


export default mapping;