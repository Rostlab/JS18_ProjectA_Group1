# Testing
Run the following command
```
# Start the app
$ npm test
```

#### Structure of the test cases:
- Five tests for testing API endpoints. 
- Test simple plot functions
  - Histogram test
  - Pie chart test
  - Scatter plot tests
  - Line chart test
- Test filter operations
  - Pie chart with sex filter
  - Histogram with age filter
  - Pie chart with age filter
- Tests from commands.json


The plot function tests are written for the human recource dataset. Since this dataset does not change the outcome of the plot functions will always be the same under the same input parameters and can be tested.

These plot function tests also check if the layout is correct, since the plot functions create the layout as well.

