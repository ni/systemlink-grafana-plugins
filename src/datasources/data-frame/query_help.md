# SystemLink Data Frames data source

## 📊 Overview

The **SystemLink Data Frames** data source allows you to display data table properties and visualize data from multiple data tables in dashboards.

---

## 🎯 Key Features

* **Flexible Filtering**: Filter data tables by result, data table, and column properties.  
* **Display Table Metadata**: Retrieve and display metadata properties such as name, ID, row count, column information, and workspace.  
* **Display Data Table Data**: Retrieve and display row data from selected columns across one or more filtered data tables.  

---

## Example Queries

### 📋 Example 1: Monitor Data Table Metadata

You can track metadata for recently modified data tables.
1. Set the query type to **Properties**.
2. Add the following filter: "Rows modified" **is after** "now-7d"
3. Select the following properties: "Data table name", "Rows", "Rows modified", "Workspace"
4. Set the **Take** to **100**.

---

### 🧪 Example 2: Aggregate Data from Multiple Data Tables

You can view all data from the data tables that are associated with passing test results.
1. Set the query type to **Data**.
2. Add the following test result filter: "Status" **equals** "Passed"
3. Add the following data table filter: "Data table name" **equals** "Test Data table"
4. Select the following columns: "Timestamp", "Temperature", "Location"
5. Set the x-column to "Timestamp".
6. Enable the "Use time range" property to filter by dashboard time.
---

## ℹ️ Data Limits

| Configuration        | Max limit             | Behavior                                                                                                                |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Data Tables**      | 1,000 tables          | If a filter matches more than 1,000 tables, the data source only processes the first 1,000 tables.                      |
| **Columns options**  | 10,000 unique columns | If more than 10,000 unique columns exist, the data source only displays the first 10,000 columns in the drop-down menu. |
| **Column Selection** | 20 columns per query  | If you select more than 20 columns, the data source will not query the data and instead return an error.                |
| **Data Points**      | 1 million points      | The data source caps all results at 1 million data points (rows × columns).                                             |

---

## Additional Resources

- **Query Optimization:** <a href="https://www.ni.com/r/dfs-db-query-performance" target="_blank" rel="noopener noreferrer">Optimizing Data Frame Queries</a>
- **Visualizing Data Tables:** <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/visualizing-data-tables-in-a-dashboard.html" target="_blank" rel="noopener noreferrer">Visualizing Data Tables in a Dashboard</a>
- **DataFrame Datasource:** <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/data-frames-data-source.html" target="_blank" rel="noopener noreferrer">Create dashboards using the Data Frames data source</a>
