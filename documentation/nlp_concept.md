# NLP Workflow
## Overview
Each input of the user runs through the following steps:
1. [Request](#1-request) - send user input to server
2. [Command detection](#2-command-detection) - extract the users intention
    1. [Tokenize input](#21-tokenize-input) - split up input
    2. [Classify tokens](#22-classify-tokens) - tag tokens with important classes
    3. [Combine tokens](#23-combine-tokens) - combine tokens that depend on each other
    4. [Command matching](#24-command-matching) - match the results with the available functionality
3. [Command execution](#3-command-execution) - get and transform the needed data
4. [Response](#4-response) - send the data to the client
5. [Plot of Graph](#5-plot-of-graph) - use the data to generate the requested plot 

## 1. Request
Whenever the user types a query into the input field or selects a example this **input text** is send to the server together with the currently selected **dataset** and the **history** which contains the previously executed queries (by default this is a empty array `[]`)

The endpoint used is [/API/nlp](https://js2018-group1.azurewebsites.net/API/documentation/nlp#/nlp/nlp)

The server ensures that all three parameters are valid.

## 2. Command detection
> see `server/controllers/nlp.js`: `generateNewHistory(input, dataset, history)`

This step aims to find out what functionality has to be executed to fulfill the users request. 

The result of this is a new history containing a list of function names and parameters. If user wants to create a new plot the history is wiped and contains only the new functions but not the previous ones.

### 2.1. Tokenize input
To be able to work with the input the string is tokenized by the framework [compromise](http://compromise.cool/). It ensures that values like `42` or `3.14` are tokenized correctly and labels values differently from text so that we can work with them directly.

### 2.2. Classify tokens
> see `server/controllers/classifier.js`: `Classifier.classifyTokens(tokens, dataset)`

Each token is compared with all items of the following classes. 
We use [Levenshtein string distance](https://raw.githubusercontent.com/NaturalNode/natural/master/lib/natural/distance/levenshtein_distance.js) here to find the nearest match which allows us to compensate some typos. 
Additionally we use a synonym lexicon which is used for every item as well (see `server/data/column_synonyms.json`).
Afterwards the token is labeled with the class of the best match. 
As some tokens are longer than one word (e.g. `pie chart`) we use a dynamic lookahead in the classifier, so tokens can be accumulated to a bigger token.

Class | Examples | Comment
--- | --- | ---
value | `42`, `3.14`, ... | labeled by [compromise](http://compromise.cool/)
operation | `draw`, `plot`, ... | currently ignored
chart type | `histogram`, `scatter plot`, ... | 
column | `age`, `sex`, ... | 
column value | `male`, `female`, ... | extracted from the database
filter operation | `is`, `is equal to`, `bigger than`, ... | 

Sometimes the label contains additional information. Examples: 
- the column a column value is referring to (`male` -> `sex`)
- the mathematical operation a filter operation is using (`=` `>`, ...)

Every token that has not yet been labeled is dropped for now.

### 2.3. Combine tokens
> see `server/controllers/nlp.js`: `combineComplexTokens(tokens)`

To filter correctly (SQL `WHERE` clauses) we have to know which **filter operation** with which **value** should be executed on which **column**. This follows these rules:
- If a token is a **filter operation** and the next token is a **value** or a **column value** we combine the two tokens.
- If we don't yet know the column a filter is operating on and the token before is a **column** we have found the column we search for.
- If we still don't know the column the filter is operating on and the token before is a filter as well that knows on which column it is operating on we have found the column we search for.

Afterwards we remove all column duplicates.

### 2.4. Command matching
> see `server/controllers/nlp.js`: `findDataTransformationFunction(tokens, callback, errorCallback)`

First we extract the interesting tokens from the list. We search for the **operation**, the **chart type**, all **columns** and all **filters**.

After this we compare the gathered information with every available command from `server/data/commands.json`. 
A command qualifies when all these conditions hold:
- if there is a operation it must be one that we know (see `Classifier.staticWords.plotOperations)`
- the chart type must match
- we need at least as much columns as the command consumes
- if a previous command matched already the number of columns this command consumes must be bigger than the number of columns the previous command consumes (it must be more specific)

If no command has been found we assume that it is a transformation function. This will call the `editChart()`functionality of the [transformation library](https://github.com/Rostlab/JS18_ProjectB_Group3).

## 3. Command execution
> see `server/controllers/nlp.js`: `executeFunctions(history, dataset)`

Now we have a list of functionality the we have to execute to get the data that the user has requested. 
We start with an empty **plotly object** and call for each item in the **history** the referenced function from `server/controllser/plot-functions.js`. 
Each call will return a new **plotly object** that we then can hand into the next function (this allows transformations of the data and the layout).
The result is a [plotly.js](https://plot.ly/javascript/) compatible object that holds the data and the layout for the **plot** that has been queried by the user.

## 4. Response
The server can now return the **plotly object** and the **new history** back to the client. 

In the case that an error occurred anywhere before the server will return a **error message** as well as the **old history** so that the user can refine his input. 

## 5. Plot of Graph
The client can use the **plotly object** from the **response** to generate a graph:
```javascript
Plotly.newPlot('graph', response.plotly.data, response.plotly.layout);
```