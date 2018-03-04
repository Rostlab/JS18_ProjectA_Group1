"use strict";

function generateGraph(dataset, input) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", window.location.origin + "/API/nlp", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify({ dataset: dataset, input: input }));
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            var response = JSON.parse(xhttp.responseText);
            Plotly.plot('graph', response.data);
        }
    };
}

// TODO replace with input field
generateGraph("employee", "Plot histogram of employee’s age.");