# SystemLink Data Frames data source

## 📊 Overview

The **SystemLink Data Frames** data source allows you to display data table properties and visualize data from multiple data tables in dashboards.

---

## 🎯 Key Features

* **Flexible Filtering:** Filter data tables by result properties, data table properties, and column properties.
* **Display Data Table Properties:** Retrieve and display properties such as Data table name, ID, row count, column properties, and workspace.
* **Display Data Table Data:** Retrieve and display row data from selected columns across one or more filtered data tables.

---

## Example Queries

- **Visualize Sensor Data From Multiple Test Runs:** View and compare sensor data collected across different test runs in a plot.

- **Filter Data Tables By Column Name:** Retrieves and displays properties and data of data tables that have a specific column.

---

## ℹ️ Data Limits

| Configuration        | Max limit per query   | Behavior                                                                                                                |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Data Tables**      | 1,000 tables          | If a filter matches more than 1,000 tables, the data source only processes the first 1,000 tables. |
| **Columns Options**  | 10,000 unique columns | If more than 10,000 unique columns exist, the data source only displays the first 10,000 columns in the drop-down menu. |
| **Column Selection** | 20 columns            | If you select more than 20 columns, the data source will not query the data and instead return an error. |
| **Data Points**      | 1 million points      | The data source caps all results at 1 million data points (rows × columns). |
| **Data Table Custom Properties** | 100 properties | If the matching data tables contain more than 100 unique custom property keys, the data source only returns the first 100 properties. |

---

## URL Length Considerations

When using the **Filter x-axis range on zoom/pan** feature on data tables with numeric columns, excessive use of zoom and pan operations can cause a URI Length error.

Use the following methods to avoid a URI Length error.

- Minimize your use of multi-value dashboard variables.
- Avoid the zoom and pan operations on too many unique numeric **X-columns**.

### Troubleshooting a URI Length Error

If your system returns a "414 URI Too Long" error, use one of the following methods to resolve the error.

- Remove one or more URL query parameters from the browser address bar.
- Navigate to the dashboard through the navigation menu.

---

## Additional Resources

- **Query Optimization:** <a href="https://www.ni.com/r/dfs-db-query-performance" target="_blank" rel="noopener noreferrer">Optimizing Data Frame Queries</a>
- **Visualizing Data Tables:** <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/visualizing-data-tables-in-a-dashboard.html" target="_blank" rel="noopener noreferrer">Visualizing Data Tables in a Dashboard</a>
- **Using Data Frames Datasource:** <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/data-frames-data-source.html" target="_blank" rel="noopener noreferrer"> Using Data Frames data source in a dashboard</a>
