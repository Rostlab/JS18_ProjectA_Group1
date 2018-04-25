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
  - Pie chart with sex filter (is equal to)
  - Histogram with age filter (is smaller than)
  - Pie chart with age filter (is smaller than)
- Tests from commands.json
  - Plot a histogram of age 
  - Set title to "Title goes here" 
  - Set title of y-axis to "y-axis Count"
  - Set width of gridlines of x-axis to 8 
  - Make a scatter plot with age and pay rate.
  - Set position of legend to 10,0 
  - age change symbol to "star" 
  - Show the number of department as pie chart 
  - Set colors to red, black, yellow, green, purple, pink, orange 
  - Draw a scatter plot of department and age 
  - Change title of x-axis to "x-axis" 
  - Change color of gridlines of x-axis to red 
  - age change opacity to 0.8 
  - Show the position as pie chart 
  - Change info type to "value" 
  - Show the position and sex as line chart 
  - Female set width of line to 7 
  - Male set dash to "dashdot" 
  - Show a pie chart of all departements for all male where age is bigger than 20
  - Show a scatter plot of all state where pay rate is smaller than 40 
  - Show a histogram of all sex where age is bigger than 30 

The plot function tests are written for the human recource dataset. Since this dataset does not change the outcome of the plot functions will always be the same under the same input parameters and can be tested this way. The filter operation tests check it the filters "is equal to" and "is smaller than" work with different plot funktions.

All the plot function tests also check if the layout is correct, since the plot functions create the layout as well.

The commands.json tests are dynamically created based on the commands in commands.json. Each input of the test object is tested with input, dataset and history parameters. The classification of the input is tested by matching the output with the function and function parameters specified in commands.json. The same technique is followed for testing transformation functions of Project B.
