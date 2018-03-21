let request = require('supertest');
let server = require('../../server');

describe('GET /', function () {
    it('should render ok', function (done) {
        request(server)
            .get('/')
            .expect(200, done);
    });
});

describe('GET /API/datasets', function () {
    it('should render ok', function (done) {
        request(server)
            .get('/API/datasets')
            .expect(200, done);
    });
});

describe('POST /API/columns', function () {
    it('should render ok', function (done) {
        request(server)
            .post('/API/columns')
            .send({dataset: "human_resources__core_dataset"})
            .expect(200, done);
    });

    it('should render error', function (done) {
        request(server)
            .post('/API/columns')
            .send({dataset: ""})
            .expect(400, done);
    });

    it('should render error', function (done) {
        request(server)
            .post('/API/columns')
            .send({dataset: "imaginary_dataset"})
            .expect(400, done);
    });
});

describe('POST /API/examples', function () {
    it('should render ok', function (done) {
        request(server)
            .post('/API/examples')
            .send({dataset: "human_resources__core_dataset"})
            .expect(200, done);
    });

    it('should render error', function (done) {
        request(server)
            .post('/API/examples')
            .send({dataset: ""})
            .expect(400, done);
    });

    it('should render error', function (done) {
        request(server)
            .post('/API/examples')
            .send({dataset: "imaginary_dataset"})
            .expect(400, done);
    });
});

describe('POST /API/nlp', function () {
    it('should render ok', function (done) {
        request(server)
            .post('/API/nlp')
            .send({dataset: "human_resources__core_dataset", input: "Plot a histogram of age", history: []})
            .expect(200, done);
    });
});