let request = require('supertest');
let assert = require('assert');
let server = require('../../server');
let nlp = require('../../controllers/nlp.js')

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
            .send({dataset: "human_resources__core_dataset", input: "Plot a histogram of age"})
            .expect(200, done);
    });
});

describe('Test Transformation Functions', function () {
    it('should render ok', function (done) {
        let fkt = nlp.functions["plotHistogramOfColumn"];
        fkt("human_resources__core_dataset", ["age"], (data) => {
            if(data[0].x[0] === 32){
                done();
            }
        });
    });
    it('should render ok', function (done) {
        let fkt = nlp.functions["plotPieChartOfColumn"];
        fkt("human_resources__core_dataset", ["racedesc"], (data) => {
            if(data[0].labels[0] === "Black or African American"){
                if(data[0].values[0] === 54){
                    done();
                }
            } else {
                done();
            }
        });
    });
    it('should render ok', function (done) {
        let fkt = nlp.functions["plotScatterOfTwoColumns"];
        fkt("human_resources__core_dataset", ["racedesc", "age"], (data) => {
            if(data[0].type === "scatter" && data[0].x[0] === "Black or African American" && data[0].y[0] === 32){
                done();
            }
        });
    });
});