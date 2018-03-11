"use strict";

function loadJSON(endpoint, type, body, callback, error) {
    var xhttp = new XMLHttpRequest();
    xhttp.open(type, window.location.origin + "/API/" + endpoint, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(body));
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            var response = JSON.parse(xhttp.responseText);
            callback(response.data);
        } else {
            error();
        }
    };
}

function loadDatasets(endpoint, type, callback, error) {
    var xhttp = new XMLHttpRequest();
    xhttp.open(type, window.location.origin + "/API/" + endpoint, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            var response = JSON.parse(xhttp.responseText);
            callback(response.datasets);
        } else {
            error();
        }
    };
}

function loadAdditionalData(endpoint, type, body, callback, error) {
    var xhttp = new XMLHttpRequest();
    xhttp.open(type, window.location.origin + "/API/" + endpoint, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(body));
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            var response = JSON.parse(xhttp.responseText);
            callback(response);
        } else {
            error();
        }
    };
}

function generateGraph(dataset, input) {
    setLoading(true);
    loadJSON("nlp", "POST", { dataset: dataset, input: input }, function (response) {
        Plotly.newPlot('graph', response);
        setLoading(false);
    }, function () {
        // TODO handle error
        setLoading(false);
    });
}

function setLoading(loading) {
    var command_textfield = document.getElementById("command-textfield");
    command_textfield.disabled = loading;
    var command_button = document.getElementById("command-button");
    var command_loading = document.getElementById("command-loading");
    if (loading) {
        command_button.style.display = "none";
        command_loading.style.display = "block";
    } else {
        command_button.style.display = "block";
        command_loading.style.display = "none";
    }
}

function getColumnDataSuccess(response) {
    var data = response.columns;
    var keys = Object.keys(data);
    var table = document.getElementById('column_body');
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    keys.forEach(function (key) {
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        td1.setAttribute("class", "mdl-data-table__cell--non-numeric");
        td1.append(key.replace(/_/g, " "));
        tr.appendChild(td1);
        var td2 = document.createElement("td");
        td2.setAttribute("class", "mdl-data-table__cell--non-numeric");
        td2.append(data[key].type);
        tr.appendChild(td2);
        table.appendChild(tr);
    });
}

function getColumnData(dataset) {
    loadAdditionalData("columns", "POST", { dataset: dataset }, getColumnDataSuccess, function () {
        // TODO handle error
        setLoading(false);
    });
}

function onExampleSelected(example) {
    console.log(example.textContent);
    var ul = document.getElementById("dataset-list");
    for (var i = 0; i < ul.children.length; i++) {
        if (ul.children[i].dataset.selected === 'true') {
            var dataset = ul.children[i].dataset.val;
            break;
        }
    }
    generateGraph(dataset, example.textContent);
}

function getExampleDataSuccess(response) {
    var data = response.examples;
    var keys = Object.keys(data);
    var table = document.getElementById('example_body');
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    data.forEach(function (d) {
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.setAttribute("class", "mdl-data-table__cell--non-numeric");
        td.append(d.input);
        tr.onclick = function () {
            onExampleSelected(this);
        };
        tr.appendChild(td);
        table.appendChild(tr);
    });
}

function getExamplesData(dataset) {
    loadAdditionalData("examples", "POST", { dataset: dataset }, getExampleDataSuccess, function () {
        // TODO handle error
        setLoading(false);
    });
}

function getAdditionalData(selectedDataset) {
    getColumnData(selectedDataset);
    getExamplesData(selectedDataset);
}

function onDatasetSelected(dataset) {
    if (dataset.dataset.selected === 'false') {
        var ul = document.getElementById("dataset-list");
        for (var i = 0; i < ul.children.length; i++) {
            ul.children[i].dataset.selected = dataset.dataset.val === ul.children[i].dataset.val;
        }
        getAdditionalData(dataset.dataset.val);
    }
}

function loadDatasetSuccess(data) {
    var ul = document.getElementById("dataset-list");
    data.forEach(function (d) {
        var li = document.createElement("li");
        li.setAttribute("class", "mdl-menu__item");
        li.append(d.display_name);
        li.dataset.val = d.table_name;
        li.dataset.selected = false;
        li.onclick = function () {
            onDatasetSelected(this);
        };
        ul.appendChild(li);
    });
    ul.firstElementChild.dataset.selected = true;
    getAdditionalData(ul.firstElementChild.dataset.val);
}

function loadDockData() {
    loadDatasets("datasets", "GET", loadDatasetSuccess, function () {
        // TODO handle error
        setLoading(false);
    });
}

window.onload = function () {
    setLoading(true);
    document.getElementById('menu-button').addEventListener('click', function () {
        document.querySelector('.mdl-layout__drawer').classList.toggle('is-expanded');
        setTimeout(function () {
            Plotly.Plots.resize('graph');
        }, 300);
    }, false);

    loadDockData();

    var command_textfield = document.getElementById("command-textfield");
    command_textfield.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            generateGraph("human_resources__core_dataset", command_textfield.value);
        }
    });
    var command_button = document.getElementById("command-button");
    command_button.addEventListener("click", function (event) {
        generateGraph("human_resources__core_dataset", command_textfield.value);
    });
    setLoading(false);
};

window.onresize = function () {
    Plotly.Plots.resize('graph');
};