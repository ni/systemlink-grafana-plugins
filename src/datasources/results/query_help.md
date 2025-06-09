### SystemLink Test Results data source

The _SystemLink TestResults_ data source allows you to display result and step properties in dashboards and derive insights.

### Key Features
- The SystemLink Test Results data source supports two query types: **Results** and **Steps**.
    - **Results query**: Retrieve and display various properties of a result such as part number, program name, system ID, status and workspace.
    - **Steps query**: Retrieve and display various properties of a step, such as step name, associated result ID, step path and workspace.
- **Custom queries**: Create custom queries to filter and sort result or step properties based on specific query conditions, allowing you to get the most relevant information.

### Example Queries

Here are some example queries you can create using the _SystemLink TestResults_ data source:

- **View summary of test result statuses for products**: View list of test results properties such as status, part number, and test program for a selected product by choosing the Product (part number) field.

- **Summary of test results statuses**: Group test results by their statuses (e.g., passed, failed, terminated) and use data transformation to display the count of results. Filter results by product part number and time range (e.g., last 7 days or last month) to view the summary in a Stat visualization.

### Additional Resources

For more information, refer to the following resources:

- [Analyzing and Interacting with Test Results - SystemLink Enterprise](https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/analyzing-test-data-jupyter.html): Learn more about analyzing test data using SystemLink Enterprise.
