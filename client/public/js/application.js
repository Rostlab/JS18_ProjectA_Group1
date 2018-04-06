"use strict";var plotHistory=[];function loadJSON(e,t,n,a,o){var l=new XMLHttpRequest;l.open(t,window.location.origin+"/API/"+e,!0),l.setRequestHeader("Content-type","application/json"),l.send(JSON.stringify(n)),l.onreadystatechange=function(){if(4===l.readyState)if(200===l.status){var e=JSON.parse(l.responseText);a(e)}else if(417===l.status){var t=JSON.parse(l.responseText).error;o(t)}else if(500===l.status){JSON.parse(l.responseText).error;o("Internal server error")}}}function generateGraph(e,t){setLoading(!0);var n=document.getElementById("error");""!==n.innerHTML&&(n.innerHTML=""),loadJSON("nlp","POST",{dataset:e,input:t,history:plotHistory},function(e){Plotly.newPlot("graph",e.plotly.data,e.plotly.layout),createHistoryList(e.history),setLoading(!1)},function(e){n.innerHTML=e,setLoading(!1)})}function setLoading(e){document.getElementById("command-textfield").disabled=e;var t=document.getElementById("command-button"),n=document.getElementById("command-loading");e?(t.style.display="none",n.style.display="block"):(t.style.display="block",n.style.display="none")}function createColumnEntry(e,t){var n=document.createElement("tr"),a=document.createElement("td");a.setAttribute("class","mdl-data-table__cell--non-numeric");var o=e.column_name;e.synonyms.length>0&&(o+=" ("+e.synonyms.join(", ")+")"),a.append(o.replace(/_/g," ")),n.appendChild(a);var l=document.createElement("td");l.setAttribute("class","mdl-data-table__cell--non-numeric"),l.append(e.type),n.appendChild(l),t.appendChild(n)}function createColumnList(e){for(var t=e.columns,n=document.getElementById("column_body");n.firstChild;)n.removeChild(n.firstChild);t.forEach(function(e){return createColumnEntry(e,n)})}function getColumnData(e){loadJSON("columns","POST",{dataset:e},createColumnList,function(){setLoading(!1)})}function getCurrentDataset(){return document.getElementById("dataset-selected").value}function onExampleSelected(e){document.getElementById("command-textfield").value=e.textContent,document.getElementById("query-textfield").setAttribute("class","mdl-textfield mdl-js-textfield mdl-textfield--floating-label is-upgraded is-dirty"),document.getElementById("command-button").click()}function createHistoryList(e){plotHistory=e;var t=document.getElementById("history_body");clearList(t),e.forEach(function(e){createTableEntry(e,t)})}function createTableEntry(e,t,n){var a=document.createElement("tr"),o=document.createElement("td");o.setAttribute("class","mdl-data-table__cell--non-numeric"),o.append(e.input),n&&(a.onclick=function(){n(this)}),a.appendChild(o),t.appendChild(a)}function clearList(e){for(;e.firstChild;)e.removeChild(e.firstChild)}function createExampleList(e){var t=e.examples,n=document.getElementById("example_body");clearList(n),t.forEach(function(e){createTableEntry(e,n,onExampleSelected)})}function getExamplesData(e){loadJSON("examples","POST",{dataset:e},createExampleList,function(){setLoading(!1)})}function getAdditionalData(e){getColumnData(e),getExamplesData(e)}function onDatasetSelected(){getAdditionalData(getCurrentDataset())}function loadDatasetSuccess(e){var t=e.datasets,n=document.getElementById("dataset-list");t.forEach(function(e){var t=document.createElement("li");t.setAttribute("class","mdl-menu__item"),t.append(e.display_name),t.dataset.val=e.table_name,n.appendChild(t)}),n.onclick=function(){onDatasetSelected()},n.firstElementChild.dataset.selected=!0,getmdlSelect.init("#dataset-select"),getAdditionalData(getCurrentDataset())}function loadDockData(){loadJSON("datasets","GET",void 0,loadDatasetSuccess,function(){setLoading(!1)})}window.onload=function(){setLoading(!0),document.getElementById("menu-button").addEventListener("click",function(){document.querySelector(".mdl-layout__drawer").classList.toggle("is-expanded"),setTimeout(function(){Plotly.Plots.resize("graph")},300)},!1),loadDockData();var e=document.getElementById("command-textfield");e.addEventListener("keyup",function(t){"Enter"===t.key&&generateGraph(getCurrentDataset(),e.value)}),document.getElementById("command-button").addEventListener("click",function(){generateGraph(getCurrentDataset(),e.value)}),setLoading(!1)},window.onresize=function(){Plotly.Plots.resize("graph")};