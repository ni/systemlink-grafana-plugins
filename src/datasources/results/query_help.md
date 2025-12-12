### SystemLink Test Results data source

You can use the _SystemLink TestResults_ data source to display result and step properties in dashboards and derive insights.

### Key Features
- Support for two query types in the SystemLink Test Results data source: **Results** and **Steps**.
    - **Results** query: Retrieve and display various properties of a result. These result properties include the part number, program name, system ID, status, and workspace.
    - **Steps** query: Retrieve and display various properties of a step. These step properties include the step name, associated result ID, step path, and workspace.
- Create custom queries that allow you to filter result or step properties. You can also sort these properties with specific query conditions to find the most relevant information.

### Example Queries

For queries that use the _SystemLink TestResults_ data source, refer to the following examples:

- **View summary of test result statuses for products**: List the test result properties of a product by selecting the Product (part number) field. These test result properties include status, part number, and test program.

- **Summary of test results statuses**: View a summary of test results in a stat visualization by completing the following steps.
    - Group test results by their status (for example, passed, failed, terminated).
    - Display the results count through a data transformation.
    - Filter results by the product part number and the time range (for example, the last seven days).

### Additional Resources

For more information on analyzing test data using SystemLink Enterprise, refer to <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/analyzing-test-data-jupyter.html" target="_blank" rel="noopener noreferrer">Analyzing and Interacting with Test Results - SystemLink Enterprise</a>.
