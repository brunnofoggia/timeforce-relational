import assert from 'assert';
import axios from 'axios';
import _ from 'lodash';

import { env, timeforce, relation, state, app, appService } from './helpers/setup.js';

const HOST = 'http://127.0.0.1:3000';

// solves do problem when working with listeners
const doneOnce = function (_done) {
    var c = 0;
    return function () {
        if (c > 0) return;
        c++;
        _done.apply(null, arguments);
    }
}

describe('Api start', function () {
    beforeEach((done) => {
        done();
    });

    it('api provider check', async function () {
        var { data } = await axios.get(HOST);
        assert.equal(data, 'api');
        var response = await axios.get(HOST + '/country');
        assert.ok(response.data.length > 0);
    });
});

describe('Relation maps', function () {
    var country, region, city;
    var StateCollection = timeforce.Collection.extend({
        className: 'stateCollection',
        url: HOST + '/state',
    });
    var CityCollection = timeforce.Collection.extend({
        className: 'cityCollection',
        url: HOST + '/city',
        relationsMap: [
            {
                name: 'state',
                collection: StateCollection,
                type: relation.BELONGSTO
            }
        ]
    });
    var PersonModel = timeforce.Model.extend({
        className: 'personModel',
        urlRoot: HOST + '/person',
    });
    var PersonCollection = timeforce.Collection.extend({
        className: 'personCollection',
        url: HOST + '/person',
        model: PersonModel
    });
    var HouseModel = timeforce.Model.extend({
        className: 'houseModel',
        urlRoot: HOST + '/house',
    });
    var RentModel = timeforce.Model.extend({
        className: 'rentModel',
        urlRoot: HOST + '/rent',
        relationsMap: [
            {
                name: 'house',
                model: HouseModel,
                type: relation.BELONGSTO,
                foreignKey: 'ativoId'
            },
            {
                name: 'person',
                collection: PersonCollection,
                type: relation.HASMANY,
                foreignKey: 'envolvidos.usuarioId'
            }
        ]
    });
    var rentId = 68, rent;

    beforeEach((done) => {
        rentId = 68;
        rent = new RentModel({ id: rentId });

        env.dispatch = '';
        done();
    });

    it('isReady detection on related', function (_done) {
        var done = doneOnce(_done);

        city = new CityCollection();
        region = new StateCollection();
        var relatedState = city.getRelation('state');

        relatedState.on('request:fetch', () => {
            try {
                assert.equal(relatedState.state, state.WAITING);
                assert.ok(!relatedState.isReady());
            } catch (err) {
                done(err);
            }
        });
        relatedState.on('state:ready', () => {
            try {
                assert.equal(relatedState.state, state.READY);
                assert.ok(relatedState.isReady());
            } catch (e) {
                console.log(e);
            }
        });
        relatedState.on('fetch:ready', () => {
            try {
                assert.equal(relatedState.state, state.READY);
                assert.ok(relatedState.isReady());
                done();
            } catch (err) {
                console.log(err);
                done(err);
            }
        });

        city.on('state:ready', (obj) => {
            try {
                assert.equal(obj.state, state.READY);
                assert.ok(!obj.isReady());
                obj.fetchAllRelations();
            } catch (e) {
                console.log('error', e);
            }

        });
        city.fetch();
        assert.equal(city.state, state.WAITING);
        assert.equal(relatedState.state, state.INITIAL);
    });

    it('get relation', function (_done) {
        var done = doneOnce(_done), relation;

        relation = rent.getRelation('house');
        assert.ok(!!relation);
        assert.ok(relation.isModel());
        assert.equal(relation.state, state.INITIAL);
        relation = rent.getRelation('person');
        assert.ok(!relation);
        relation = rent.findRelation('person');
        assert.ok(_.isArray(relation));
        assert.ok(relation.length === 0);
        relation = rent.getRelation('personCollection');
        assert.ok(!!relation);
        assert.ok(relation.isCollection());
        assert.equal(relation.state, state.INITIAL);

        done();
    });

    it('hasMany relation sync and state', function (_done) {
        var done = doneOnce(_done);
        var rentId = 68,
            rent = new RentModel({ id: rentId });
        rent.on('fetch:ready', () => {
            try {
                // console.log(rent.attributes.ativoId, rent.getRelation('house').id, rent.getRelation('house').attributes.id);
                assert.equal(rent.get('id'), rentId);
                assert.equal(rent.state, state.READY);
                assert.ok(rent.isReady());
                done();
            } catch (e) {
                console.log('error', e);
            }

        });
        rent.fetchAll();
        assert.equal(rent.state, state.WAITING);
    });

    it('get hasmany relations after sync', function (_done) {
        var done = doneOnce(_done);
        rent.on('fetch:ready', () => {
            try {
                var relation1 = rent.getRelation('person', 1),
                    relation2 = rent.getRelationBy('person', 'id', 2),
                    relations3 = rent.matchAttributesAndFindRelations('person', 'perfil', 'P');

                // console.log(rent.attributes.ativoId, rent.getRelation('house').id, rent.getRelation('house').attributes.id);
                assert.ok(relation1.isModel());
                assert.ok(_.size(relation1.attributes) > 1);
                assert.equal(relation1.id, 1);
                assert.ok(relation2.isModel());
                assert.ok(_.size(relation2.attributes) > 1);
                assert.equal(relation2.id, 2);
                assert.equal(relations3.length, 3);
                assert.equal(relations3[0].id, 3);
                assert.equal(relations3[1].id, 6);
                assert.equal(relations3[2].id, 5);
                assert.ok(_.size(relations3[0].attributes) > 1);
                assert.ok(_.size(relations3[1].attributes) > 1);
                assert.ok(_.size(relations3[2].attributes) > 1);

                done();
            } catch (e) {
                console.log('error', e);
            }

        });
        rent.fetchAll();
        assert.equal(rent.state, state.WAITING);
    });

});

describe('On the fly mappings', function () {
    var country, region, cityOnTheFly;
    var CountryCollection = timeforce.Collection.extend({
        url: HOST + '/country',
    });
    var StateCollection = timeforce.Collection.extend({
        url: HOST + '/state',
    });
    var CityCollectionOnTheFly = timeforce.Collection.extend({
        url: HOST + '/city',
        initialize() {
            this.addRelation('state', new StateCollection, true);
        }
    });

    beforeEach((done) => {
        country = new CountryCollection();
        cityOnTheFly = new CityCollectionOnTheFly();
        region = new StateCollection();
        env.dispatch = '';

        done();
    });

    it('isReady detection on related', function (_done) {
        var done = doneOnce(_done);
        var relatedState = cityOnTheFly.getRelation('state');
        relatedState.on('request:fetch', () => {
            try {
                assert.equal(relatedState.state, state.WAITING);
                assert.ok(!relatedState.isReady());
            } catch (err) {
                done(err);
            }
        });
        relatedState.on('fetch:ready', () => {
            try {
                assert.equal(relatedState.state, state.READY);
                assert.ok(relatedState.isReady());
                done();
            } catch (err) {
                done(err);
            }
        });
        cityOnTheFly.fetch();
        assert.equal(cityOnTheFly.state, state.WAITING);
        assert.equal(relatedState.state, state.INITIAL);
        assert.ok(!cityOnTheFly.isReady());
        cityOnTheFly.fetchAllRelations();
    });

    it('isReady detection with related', function (_done) {
        var done = doneOnce(_done);
        var relatedState = cityOnTheFly.getRelation('state');
        cityOnTheFly.on('request:fetch', () => {
            try {
                assert.equal(cityOnTheFly.state, state.WAITING);
            } catch (err) {
                done(err);
            }
        });
        cityOnTheFly.on('fetch', () => {
            try {
                assert.equal(cityOnTheFly.state, state.READY);
            } catch (err) {
                done(err);
            }
        });
        cityOnTheFly.on('fetch:ready', () => {
            try {
                assert.equal(cityOnTheFly.state, state.READY);
                assert.equal(relatedState.state, state.READY);
                assert.ok(cityOnTheFly.isReady());
                done();
            } catch (err) {
                done(err);
            }
        });
        cityOnTheFly.fetch();
        assert.equal(cityOnTheFly.state, state.WAITING);
        assert.equal(relatedState.state, state.INITIAL);
        assert.ok(!cityOnTheFly.isReady());
        cityOnTheFly.fetchAllRelations();
        assert.equal(cityOnTheFly.state, state.WAITING);
        assert.equal(relatedState.state, state.WAITING);
        assert.ok(!cityOnTheFly.isReady());
    });

    it('isReady detection with dependency', function (_done) {
        var done = doneOnce(_done);
        region.addRelation('country', country);
        region.on('fetch:ready', () => {
            try {
                assert.ok(region.isReady());
                done();
            } catch (err) {
                done(err);
            }
        });
        region.fetch();
        assert.equal(region.state, state.WAITING);
        assert.equal(country.state, state.INITIAL);
        assert.ok(!region.isReady());
        region.fetchAllRelations();
    });

    it('error on related', function (_done) {
        var done = doneOnce(_done);
        var relatedState = cityOnTheFly.getRelation('state');
        cityOnTheFly.fetch();
        assert.equal(cityOnTheFly.state, state.WAITING);
        assert.equal(relatedState.state, state.INITIAL);
        assert.ok(!cityOnTheFly.isReady());

        cityOnTheFly.on('fetch', () => {
            try {
                assert.equal(cityOnTheFly.state, state.READY);
                assert.equal(cityOnTheFly.isReady(), false);

                env.dispatch = 'error';
                cityOnTheFly.fetchAllRelations();
            } catch (err) {
                done(err);
            }
        });
        relatedState.on('fetch:error', () => {
            try {
                assert.equal(relatedState.state, state.BROKEN);
                assert.equal(relatedState.isReady(), false);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('isReady detection with related and deep dependency', function (_done) {
        var done = doneOnce(_done);
        var relatedState = cityOnTheFly.getRelation('state');
        relatedState.addRelation('country', country);
        cityOnTheFly.on('fetch:ready', () => {
            try {
                assert.equal(relatedState.state, state.READY);
                assert.equal(country.state, state.READY);
                assert.ok(cityOnTheFly.isReady());
                done();
            } catch (err) {
                done(err);
            }
        });
        cityOnTheFly.fetch();
        assert.equal(relatedState.state, state.INITIAL);
        assert.ok(!cityOnTheFly.isReady());
        cityOnTheFly.fetchAllRelations();
        relatedState.fetchAllRelations();
    });

    it('error on deep dependency (fetchAll)', function (_done) {
        var done = doneOnce(_done);
        var relatedState = cityOnTheFly.getRelation('state');
        relatedState.addRelation('country', country);
        env.dispatch = 'error';

        cityOnTheFly.on('fetch:error', () => {
            try {
                assert.equal(cityOnTheFly.state, state.BROKEN);
                assert.equal(cityOnTheFly.isReady(), false);
            } catch (err) {
                done(err);
            }
        });
        relatedState.on('fetch:error', () => {
            try {
                assert.equal(relatedState.state, state.BROKEN);
                assert.equal(relatedState.isReady(), false);
            } catch (err) {
                done(err);
            }
        });
        country.on('fetch:error', () => {
            try {
                assert.equal(country.state, state.BROKEN);
                assert.equal(country.isReady(), false);
                done();
            } catch (err) {
                done(err);
            }
        });

        cityOnTheFly.fetchAll();
        relatedState.fetchAllRelations();
    });
});

describe('Listeners', function () {
    var region, cityOnTheFly, city;

    var StateCollection = timeforce.Collection.extend({
        url: HOST + '/state',
    });
    var CityCollection = timeforce.Collection.extend({
        className: 'cityCollection',
        url: HOST + '/city',
        relationsMap: [
            {
                name: 'state',
                collection: StateCollection,
                type: relation.BELONGSTO
            }
        ]
    });
    var CityCollectionAlways = timeforce.Collection.extend({
        className: 'cityCollection',
        url: HOST + '/city',
        relationsMap: [
            {
                name: 'state',
                collection: StateCollection,
                type: relation.BELONGSTO,
                listen: relation.times.ALWAYS
            }
        ]
    });
    var CityCollectionOnTheFly = timeforce.Collection.extend({
        url: HOST + '/city',
        initialize() {
            this.addRelation('state', new StateCollection, { listenTo: relation.times.ONCE });
        }
    });
    var CityCollectionOnTheFlyListenOnce = timeforce.Collection.extend({
        url: HOST + '/city',
        initialize() {
            this.addRelation('state', new StateCollection); //, { listenTo: relation.times.ALWAYS }
        }
    })

    beforeEach((done) => {
        city = new CityCollection();
        cityOnTheFly = new CityCollectionOnTheFly();
        region = new StateCollection();
        env.dispatch = '';

        done();
    });

    it('always listening to related (on the fly)', function (_done) {
        var done = doneOnce(_done);
        var cityOnTheFly2 = new CityCollectionOnTheFlyListenOnce;
        var relatedState = cityOnTheFly2.getRelation('state');
        env.dispatch = 'error';

        // 1st receive fetch error
        var errorCount = 0;
        cityOnTheFly2.on('fetch:broken', () => {
            try {
                errorCount++;
                assert.ok(cityOnTheFly.isReady() === false);
            } catch (err) {
                done(err);
            }
        });

        // fake procedure to check if it's always listening
        var invalidReadyTriggered = 0;

        // 2nd receive related fetch error
        relatedState.on('fetch:broken', () => {
            try {
                // 3rd trigger ready manually to see if city still listening to related ready
                setTimeout(() => relatedState.trigger('fetch:ready'), 20);
                setTimeout(() => relatedState.trigger('fetch:ready'), 20);
            } catch (err) {
                done(err);
            }
        });

        // 4th inform that city was still listening
        cityOnTheFly2.on('invalid:ready', () => {
            try {
                invalidReadyTriggered++;
            } catch (err) {
                done(err);
            }
        });

        // 5th check if city was listening to related ready
        var readyListenerCount = 0;
        relatedState.on('fetch:ready', () => {
            try {
                assert.equal(errorCount, 2);
                // console.log('related ready status', status);
                assert.equal(invalidReadyTriggered, ++readyListenerCount);
            } catch (err) {
                done(err);
            }
        });

        cityOnTheFly2.fetchAll();
        setTimeout(() => done(), 50);
    });

    it('off once listener of related (on the fly)', function (_done) {
        var done = doneOnce(_done);
        var relatedState = cityOnTheFly.getRelation('state');
        env.dispatch = 'error';

        // 1st receive fetch error
        cityOnTheFly.on('fetch:error', () => {
            try {
                assert.ok(cityOnTheFly.isReady() === false);
            } catch (err) {
                done(err);
            }
        });

        // fake procedure to check if off worked
        var invalidReadyTriggered = false;

        // 2nd receive related fetch error
        relatedState.on('fetch:error', () => {
            try {
                // console.log('related fetch:error status', status);

                // 3rd trigger ready manually to see if city still listening to related ready
                setTimeout(() => relatedState.trigger('fetch:ready'), 10);
                setTimeout(() => relatedState.trigger('fetch:ready'), 10);
                // relatedState.trigger('fetch:ready');
            } catch (err) {
                done(err);
            }
        });

        // 4th ensure city was not listening anymore to related ready
        cityOnTheFly.on('invalid:ready', () => {
            try {
                invalidReadyTriggered = true;
                assert.equal(invalidReadyTriggered, false);
            } catch (err) {
                done(err);
            }
        });

        // 5th check if city was listening to related ready
        relatedState.on('fetch:ready', () => {
            try {
                // console.log('related ready status', status);
                assert.equal(invalidReadyTriggered, false);
            } catch (err) {
                done(err);
            }
        });

        cityOnTheFly.fetchAll();
        setTimeout(() => done(), 50);
    });

    it('always listening to related (mapping)', function (_done) {
        var done = doneOnce(_done);
        var city2 = new CityCollectionAlways;
        var relatedState = city2.getRelation('state');
        env.dispatch = 'error';

        // 1st receive fetch error
        var errorCount = 0;
        city2.on('fetch:broken', () => {
            try {
                errorCount++;
                assert.ok(cityOnTheFly.isReady() === false);
            } catch (err) {
                done(err);
            }
        });

        // fake procedure to check if it's always listening
        var invalidReadyTriggered = 0;

        // 2nd receive related fetch error
        relatedState.on('fetch:broken', () => {
            try {
                // 3rd trigger ready manually to see if city still listening to related ready
                setTimeout(() => relatedState.trigger('fetch:ready'), 20);
                setTimeout(() => relatedState.trigger('fetch:ready'), 20);
            } catch (err) {
                done(err);
            }
        });

        // 4th inform that city was still listening
        city2.on('invalid:ready', () => {
            try {
                invalidReadyTriggered++;
            } catch (err) {
                done(err);
            }
        });

        // 5th check if city was listening to related ready
        var readyListenerCount = 0;
        relatedState.on('fetch:ready', () => {
            try {
                assert.equal(errorCount, 2);
                // console.log('related ready status', status);
                assert.equal(invalidReadyTriggered, ++readyListenerCount);
            } catch (err) {
                done(err);
            }
        });

        city2.fetchAll();
        setTimeout(() => done(), 50);
    });

    it('off once listener of related (mapping)', function (_done) {
        var done = doneOnce(_done);
        var relatedState = city.getRelation('state');
        env.dispatch = 'error';

        // 1st receive fetch error
        city.on('fetch:error', () => {
            try {
                assert.ok(city.isReady() === false);
            } catch (err) {
                done(err);
            }
        });

        // fake procedure to check if off worked
        var invalidReadyTriggered = false;

        // 2nd receive related fetch error
        relatedState.on('fetch:error', () => {
            try {
                // console.log('related fetch:error status', status);

                // 3rd trigger ready manually to see if city still listening to related ready
                setTimeout(() => relatedState.trigger('fetch:ready'), 10);
                setTimeout(() => relatedState.trigger('fetch:ready'), 10);
                // relatedState.trigger('fetch:ready');
            } catch (err) {
                done(err);
            }
        });

        // 4th ensure city was not listening anymore to related ready
        city.on('invalid:ready', () => {
            try {
                invalidReadyTriggered = true;
                assert.equal(invalidReadyTriggered, false);
            } catch (err) {
                done(err);
            }
        });

        // 5th check if city was listening to related ready
        relatedState.on('fetch:ready', () => {
            try {
                // console.log('related ready status', status);
                assert.equal(invalidReadyTriggered, false);
            } catch (err) {
                done(err);
            }
        });

        city.fetchAll();
        setTimeout(() => done(), 50);
    });
});

describe('Api close', function () {
    it('api provider close', function () {
        appService.close();
    });
});