# SystemLink Data Frames Data Source

## Overview

The **SystemLink Data Frames** data source enables you to query and visualize data from multiple data tables in dashboards.

---

## Key Features

- **Two Query Types Available:**
    - **Data Query** — Retrieve and display row data from selected columns across one or multiple filtered data tables
    - **Properties Query** — Retrieve and display data table metadata properties such as name, ID, row count, column information, and workspace

- **Flexible Filtering** — Filter data tables by properties including name, ID, workspace, creation date, row count, and custom properties

- **Multi-Table Aggregation** — Aggregate data from multiple data tables that match your filter criteria in a single query

- **Column Selection** — Select specific columns from filtered data tables (up to 20 columns per query)

---

## Query Types

### Data Query

Retrieves row data from the columns you select across all data tables matching your filters.

**Configuration Options:**

| Control                             | Description                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Query by data table properties**  | Filter data tables using properties like name, ID, workspace, or custom properties                           |
| **Query by test result properties** | Filter data tables associated with specific test results                                                     |
| **Query by column properties**      | Filter data tables by column characteristics like name or data type                                          |
| **Columns**                         | Select up to 20 columns to retrieve from filtered tables. Format: "Column name" or "Column name (Data type)" |
| **Include index columns**           | Automatically include the index column from each data table in the results                                   |
| **X-column**                        | Select the column to use as the X-axis for decimation (must be present in all filtered tables)               |
| **Decimation method**               | Choose how data is aggregated: Lossy, Lossless, or None                                                      |
| **Use time range**                  | Apply the dashboard's time range filter to timestamp columns                                                 |
| **Filter nulls**                    | Exclude null values from the results                                                                         |

---

### Properties Query

Retrieves metadata about data tables matching your filters.

**Configuration Options:**

| Control                             | Description                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| **Query by data table properties**  | Filter data tables using various properties                                                |
| **Query by test result properties** | Filter by associated test result properties                                                |
| **Query by column properties**      | Filter by column-level properties                                                          |
| **Properties**                      | Select which metadata properties to return (e.g., name, ID, row count, column information) |
| **Take**                            | Specify the maximum number of records to return (range: 1-1000, default: 1000)             |

---

## Important Limitations and Restrictions

### ⚡ Performance Considerations

**Indexed Properties (Recommended for Optimal Performance):**

Always include filters on indexed properties such as:
- Test Result ID (when using test result filters)
- Data table ID
- Data table name
- Workspace

> **Note:** Queries using only non-indexed properties (like custom properties) may experience slower performance. An information banner will notify you about potential performance impacts.

**Empty Filters:**

At least one filter (data table, test result, or column filter) must be specified. Queries with all filters empty will return no results.

---

### 📊 Data Limits

| Limit Type            | Maximum               | Behavior                                                                                                            |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Data Tables**       | 1,000 tables          | If your filters match more than 1,000 tables, only the first 1,000 will be processed. A warning banner will appear. |
| **Columns (Display)** | 10,000 unique columns | If more columns exist, only the first 10,000 are shown in the dropdown. A warning banner will notify you.           |
| **Column Selection**  | 20 columns per query  | Hard limit on the number of columns you can select in a data query.                                                 |
| **Data Points**       | 1 million points      | Results capped at 1 million data points (rows × columns). Data retrieval stops at this limit with a warning banner. |

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
- **Test Data Analysis:** [Analyzing and Interacting with Test Results](https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/analyzing-test-data-jupyter.html)

