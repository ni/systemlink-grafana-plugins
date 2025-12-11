# SystemLink Data Frames data source

## 📊 Overview

The **SystemLink Data Frames** data source allows you to display data table properties and visualize data from multiple data tables in dashboards.

---

## 🎯 Key Features

* **Flexible Filtering**: Filter data tables by result, data table, and column properties.  
* **Display Table Metadata**: Retrieve and display metadata properties such as name, ID, row count, column information, and workspace.  
* **Display Data Table Data**: Retrieve and display row data from selected columns across one or more filtered data tables.  

---

## ⚠️ Limitations

### Required Filters
At least one filter (data table, test result, or column filter) must be specified. Queries without any filters will return no results.

### Data Limits

| Limit Type           | Maximum               | Behavior                                                                                   |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| **Data Tables**      | 1,000 tables          | If your filters match more than 1,000 tables, only the first 1,000 will be processed.      |
| **Columns options**  | 10,000 unique columns | If more columns exist, only the first 10,000 are shown in the dropdown.                    |
| **Column Selection** | 20 columns per query  | If more columns are selected, the datasource will return an error and will not query data. |
| **Data Points**      | 1 million points      | Results capped at 1 million data points (rows × columns).                                  |

---

## Example Queries

### 📈 Example 1: View Data from Multiple Data Tables

Query row data from all data tables containing temperature readings:

1. Set query type to **Data**
2. Add filter: "Data table name" **contains** "Temperature"
3. Select columns: "Timestamp", "Temperature", "Location"
4. Set X-column to "Timestamp"
5. Enable "Use time range" to filter by dashboard time

---

### 📋 Example 2: Monitor Data Table Metadata

Track metadata for recently modified data tables:

1. Set query type to **Properties**
2. Add filter: "Rows modified" **is after** "now-7d"
3. Select properties: "Data table name", "Rows", "Rows modified", "Workspace"
4. Set Take to **100**

---

### 🧪 Example 3: Aggregate Data from Test Results

View data from data tables associated with passing test results:

1. Enable the **"Query by test result properties"** in data source settings
2. Set query type to **Data**
3. Add test result filter: "Status" **equals** "Passed"
4. Add data table filter: "Data table name" **contains** "Measurement"
5. Select desired columns from the dropdown

---

## Additional Resources

- **Query Optimization:** [Optimizing Data Frame Queries](https://www.ni.com/r/dfs-db-query-performance)
- **Visualizing Data Tables:** [Visualizing Data Tables in a Dashboard](https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/visualizing-data-tables-in-a-dashboard.html)
- **Test Data Analysis:** [Analyzing and Interacting with Test Results](https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/analyzing-test-data-jupyter.html)
