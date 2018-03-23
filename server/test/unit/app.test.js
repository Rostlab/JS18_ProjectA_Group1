let request = require('supertest');
let assert = require('assert');
let server = require('../../server');
let plot_functions = require('../../controllers/plot-functions.js');
let Classifier = require('../../controllers/classifier.js');

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

describe('Test Plot Functions', function () {
    it('should render ok', function () {
        let fkt = plot_functions["plotHistogramOfColumn"];
        fkt("human_resources__core_dataset", ["age"], "test Input", "test data", (data, layout) => {
            assert.equal(data.length, 2);
            /*if(data.length === 1 && layout.xaxis.title === "age" && layout.title !== undefined && data[0].type === "histogram" && data[0].x[0] === 32){
                done();
            }*/
        }, (error) => {

        });
    });
    it('should render ok', function (done) {
        let fkt = plot_functions["plotPieChartOfColumn"];
        fkt("human_resources__core_dataset", ["racedesc"], "test Input","test data", (data, layout) => {
            if(data[0].labels[0] === "Black or African American" && data[0].values[0] === 54 && layout.title === "Pie Chart of racedesc" && data.length === 1 && data[0].type === "pie"){
                done();
            }
        }, (error) => {

        });
    });
    it('should render ok', function (done) {
        let fkt = plot_functions["plotScatterOfTwoColumns"];
        fkt("human_resources__core_dataset", ["racedesc", "age"], "test Input", "test data", (data, layout) => {
            if(data[0].type === "scatter" &&
                data[0].x[0] === "Black or African American" &&
                data[0].y[0] === 32 &&
                layout.title === "Scatter plot of racedesc and age" &&
                layout.xaxis.title === "racedesc" &&
                data.length === 1){
                done();
            }
        }, (error) => {

        });
    });
});

describe('Test Classifier', function () {
    describe('Test Scatter Plot Detection', function () {
        it('should render ok', function (done) {
            let tokenHolders = ["scatter", "plot"].map(token => ({
                token: token,
                type: null,
                matchedValue: null,
                distance: Classifier.maxDistance + 1
            }));
            let initState = {
                tokenHolders: tokenHolders,
                layer: 0,
                currentToken: 0,
                dataset: "human_resources__core_dataset"
            };
            let c = new Classifier(initState, state => {
                if(state.tokenHolders[0].matchedValue === "scatter plot"){
                    done();
                }
            });
            let possibleTypes = ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"];
            c.classifyToken(Classifier.staticWords.chartType, possibleTypes, true)
        });
    });
    describe('Test Column Detection', function () {
        it('should render ok', function (done) {
            let tokenHolders = ["racedesc"].map(token => ({
                token: token,
                type: null,
                matchedValue: null,
                distance: Classifier.maxDistance + 1
            }));
            let initState = {
                tokenHolders: tokenHolders,
                layer: 0,
                currentToken: 0,
                dataset: "human_resources__core_dataset"
            };
            let c = new Classifier(initState, state => {
                if(state.tokenHolders[0].matchedValue === "racedesc" && state.tokenHolders[0].type === "Column"){
                    done();
                }
            });
            c.extractColumn()
        });
    });
});
