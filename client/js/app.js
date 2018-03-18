function loadJSON(endpoint, type, body, callback, error) {
    let xhttp = new XMLHttpRequest();
    xhttp.open(type, window.location.origin + "/API/" + endpoint, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(body));
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4) {
            if (xhttp.status === 200) {
                let response = JSON.parse(xhttp.responseText);
                callback(response)
            } else if (xhttp.status === 417) {
                var errorMessage = JSON.parse(xhttp.responseText).error;
                error(errorMessage);
            }
            else if (xhttp.status === 500) {
                var errorMessage = JSON.parse(xhttp.responseText).error;
                console.log(errorMessage);
                error('Internal server error');
            }
        }
    }
}

function generateGraph(dataset, input) {
    setLoading(true);
    let error = document.getElementById('error');
    if (error.innerHTML !== '')
        error.innerHTML = '';
    loadJSON("nlp", "POST", {dataset: dataset, input: input}, (response) => {
        Plotly.newPlot('graph', response.data);
        setLoading(false)
    }, (errorText) => {
        // TODO handle error
        error.innerHTML = errorText;
        setLoading(false);
    });
}

function setLoading(loading) {
    let command_textfield = document.getElementById("command-textfield");
    command_textfield.disabled = loading;
    let command_button = document.getElementById("command-button");
    let command_loading = document.getElementById("command-loading");
    if (loading) {
        command_button.style.display = "none";
        command_loading.style.display = "block";
    } else {
        command_button.style.display = "block";
        command_loading.style.display = "none";
    }
}

function createColumnEntry(column, table) {
    let tr = document.createElement("tr");
    let td1 = document.createElement("td");
    td1.setAttribute("class", "mdl-data-table__cell--non-numeric");
    let columnName = column.column_name;
    if (column.synonyms.length > 0) {
        columnName += " (" + column.synonyms.join(", ") + ")";
    }
    td1.append(columnName.replace(/_/g, " "));
    tr.appendChild(td1);
    let td2 = document.createElement("td");
    td2.setAttribute("class", "mdl-data-table__cell--non-numeric");
    td2.append(column.type);
    tr.appendChild(td2);
    table.appendChild(tr);
}

function createColumnList(response) {
    let columns = response.columns;
    let table = document.getElementById('column_body');
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    columns.forEach(column => createColumnEntry(column, table));
}

function getColumnData(dataset) {
    loadJSON("columns", "POST", {dataset: dataset}, createColumnList, () => {
        // TODO handle error
        setLoading(false)
    });
}

function getCurrentDataset() {
    return document.getElementById('dataset-selected').value;
}

function onExampleSelected(example) {
    document.getElementById('command-textfield').value = example.textContent;
    document.getElementById('query-textfield').setAttribute("class", "mdl-textfield mdl-js-textfield mdl-textfield--floating-label is-upgraded is-dirty");
    document.getElementById("command-button").click();
}

function createExampleEntry(example, table) {
    let tr = document.createElement("tr");
    let td = document.createElement("td");
    td.setAttribute("class", "mdl-data-table__cell--non-numeric");
    td.append(example.input);
    tr.onclick = function () {
        onExampleSelected(this);
    };
    tr.appendChild(td);
    table.appendChild(tr);
}

function createExampleList(response) {
    let examples = response.examples;
    let table = document.getElementById('example_body');
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    examples.forEach(example => {
        createExampleEntry(example, table);
    })
}

function getExamplesData(dataset) {
    loadJSON("examples", "POST", {dataset: dataset}, createExampleList, () => {
        // TODO handle error
        setLoading(false)
    });
}

function getAdditionalData(selectedDataset) {
    getColumnData(selectedDataset);
    getExamplesData(selectedDataset);
}

function onDatasetSelected() {
    getAdditionalData(getCurrentDataset());
}

function loadDatasetSuccess(response) {
    let datasets = response.datasets;
    let ul = document.getElementById("dataset-list");
    datasets.forEach(dataset => {
        let li = document.createElement("li");
        li.setAttribute("class", "mdl-menu__item");
        li.append(dataset.display_name);
        li.dataset.val = dataset.table_name;
        ul.appendChild(li);
    });
    ul.onclick = function () {
        onDatasetSelected();
    };
    ul.firstElementChild.dataset.selected = true;
    getmdlSelect.init('#dataset-select');
    getAdditionalData(getCurrentDataset());
}

function loadDockData() {
    loadJSON("datasets", "GET", undefined, loadDatasetSuccess, () => {
        // TODO handle error
        setLoading(false)
    });
}

window.onload = function () {
    setLoading(true);
    document.getElementById('menu-button').addEventListener('click', () => {
        document.querySelector('.mdl-layout__drawer').classList.toggle('is-expanded');
        setTimeout(function () {
            Plotly.Plots.resize('graph');
        }, 300);

    }, false);
    loadDockData();
    let command_textfield = document.getElementById("command-textfield");
    command_textfield.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            generateGraph(getCurrentDataset(), command_textfield.value)
        }
    });
    let command_button = document.getElementById("command-button");
    command_button.addEventListener("click", () => {
        generateGraph(getCurrentDataset(), command_textfield.value)
    });
    setLoading(false);
};

window.onresize = function () {
    Plotly.Plots.resize('graph');
};
