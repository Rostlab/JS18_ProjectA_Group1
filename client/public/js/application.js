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

window.onload = function () {

    document.getElementById('menu-button').addEventListener('click', function () {
        document.querySelector('.mdl-layout__drawer').classList.toggle('is-expanded');
        setTimeout(function () {
            Plotly.Plots.resize('graph');
        }, 300);
    }, false);

    var command_textfield = document.getElementById("command-textfield");
    command_textfield.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            generateGraph("test", command_textfield.value);
        }
    });
    var command_button = document.getElementById("command-button");
    command_button.addEventListener("click", function (event) {
        generateGraph("test", command_textfield.value);
    });
};

window.onresize = function () {
    Plotly.Plots.resize('graph');
};