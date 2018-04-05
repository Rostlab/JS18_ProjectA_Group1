let request = require('supertest');
let chai = require('chai');
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

describe('Test Simple Plot Functions', function () {
    it('should render ok',async function () {
        var me = this;
        let fkt = plot_functions["plotHistogramOfColumn"];

        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "age", label: "age", labelType: "Column"}], filters: []}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data.length === 1);
        chai.assert(result.layout.xaxis.title === "age");
        chai.assert(result.layout.title === "Histogram of age");
        chai.assert(result.data[0].type === "histogram");
        chai.assert(result.data[0].x[0] === 32);
    });
    
    it('should render ok', async function () {
        let fkt = plot_functions["plotPieChartOfColumn"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "racedesc", label: "racedesc", labelType: "Column"}], filters: []}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data[0].labels[0] === "Black or African American");
        chai.assert(result.data[0].values[0] === 54);
        chai.assert(result.layout.title === "Pie Chart of racedesc");
        chai.assert(result.data.length === 1);
        chai.assert(result.data[0].type === "pie");
    });

    it('should render ok', async function () {
        let fkt = plot_functions["plotScatterOfTwoColumns"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "racedesc", label: "racedesc", labelType: "Column"}, {token: "age", label: "age", labelType: "Column"}], filters: []}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data[0].type === "scatter");
        chai.assert(result.data[0].x[0] === "Black or African American");
        chai.assert(result.data[0].y[0] === 32);
        chai.assert(result.layout.title === "Scatter plot of racedesc and age");
        chai.assert(result.layout.xaxis.title === "racedesc");
        chai.assert(result.data.length === 1);
    });

    it('should render ok', async function () {
        let fkt = plot_functions["plotScatterOfTwoColumns"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "racedesc", label: "racedesc", labelType: "Column"}, {token: "age", label: "age", labelType: "Column"}], filters: []}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data[0].type === "scatter");
        chai.assert(result.data[0].x[0] === "Black or African American");
        chai.assert(result.data[0].y[0] === 32);
        chai.assert(result.layout.title === "Scatter plot of racedesc and age");
        chai.assert(result.layout.xaxis.title === "racedesc");
        chai.assert(result.data.length === 1);
    });

    it('should render ok',async function () {
        let fkt = plot_functions["plotLineChartOfTwoColumns"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "racedesc", label: "racedesc", labelType: "Column"}, {token: "age", label: "age", labelType: "Column"}], filters: []}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data.length === 6);
        chai.assert(result.data[0].x[0] === 25);
        chai.assert(result.data[0].y[0] === 0);
        chai.assert(result.layout.title === "Line Chart of age and racedesc");
        chai.assert(result.layout.xaxis.title === "age");
        chai.assert(result.data[0].name === "American Indian or Alaska Native");

    });
});

describe('Test Filter Operations', function () {
    it('should render ok',async function () {
        let fkt = plot_functions["plotPieChartOfColumn"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "racedesc", label: "racedesc", labelType: "Column"}], filters: [
            {token: "is equal to", label: "is equal to", labelType: "FilterSelector", filterValue: {token: "male", label: "Male", labelType: "ColumnValue", column: "sex"}}
            ]}, "test Input", "test data", (data, layout) => {
                resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data[0].labels.length === 6);
        chai.assert(result.data[0].labels[0] === "Black or African American");
        chai.assert(result.data[0].values[0] === 24);
    });

    // test if is smaller than filter works
    it('should render ok',async function () {
        let fkt = plot_functions["plotHistogramOfColumn"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "age", label: "age", labelType: "Column"}], filters: [
                {token: "is smaller than", label: "is smaller than", labelType: "FilterSelector", filterValue: {token: "50", label: null, labelType: "Value", column: "age"}}
            ]}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        let isOver50 = false
        result.data[0].x.forEach(value => {
            if(value > 50){
                isOver50 = true
            }
        })
        chai.assert(!isOver50);
    });

    it('should render ok',async function () {
        let fkt = plot_functions["plotPieChartOfColumn"];
        var result = await new Promise((resolve, reject) => {fkt("human_resources__core_dataset", {columns: [{token: "sex", label: "sex", labelType: "Column"}, {token: "age", label: "age", labelType: "Column"}], filters: [
                {token: "is smaller than", label: "is smaller than", labelType: "FilterSelector", filterValue: {token: "40", label: null, labelType: "Value", column: "age"}}
            ]}, "test Input", "test data", (data, layout) => {
            resolve({'data':data, 'layout' : layout});
        }, (error) => {
            reject(error);
        })});
        chai.assert(result.data[0].labels.length === 2);
        chai.assert(result.data[0].labels[0] === "Female");
        chai.assert(result.data[0].values[0] === 108);
    });
});
