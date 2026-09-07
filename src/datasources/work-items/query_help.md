### SystemLink Work Items data source

Use the _SystemLink Work Items_ data source to display work item properties and counts in dashboards. It supports work orders, test plans, jobs, maintenance, calibration, reservations, and transport orders.

### Output

- **Properties**: Returns a table of work items, including work item details, timeline information, resources, and custom properties. Use this to list or inspect individual work items.
- **Total Count**: Returns only the number of work items matching the selected types and filters. Use this for counters and summary panels instead of returning every matching row.

### Type

Select one or more work item types to query: Work orders, Test plans, Job, Maintenance, Calibration, Reservation, or Transport Order. At least one type must be selected, or the query is invalid. Use **All** to include every type.

### Query By

Filter work items by properties such as state, workspace, assigned user, product, dates, resource identifiers, and custom properties. Date filters support the dashboard time range and Grafana global variables (`$__from`, `$__to`), and other fields support Grafana dashboard variables for multi-value filtering.

### Properties output controls

These controls apply only when Output is set to **Properties**:

- **Order By**: Sort results by **ID** or **Updated at**. Defaults to **Updated at**.
- **Descending**: Toggle the sort direction. Defaults to on (newest/highest first).
- **Take**: Limit the number of work items returned. Defaults to 1,000 and cannot exceed 10,000.

### Example Queries

You can use the _SystemLink Work Items_ data source for scenarios such as:

- **View test plans by state**: Select **Test plans** in Type, use Properties output, and group the resulting table by State.
- **Count scheduled calibration work items**: Select **Calibration** in Type, use Total Count output, and filter by State.
- **Track work items due soon**: Select the required types, filter by Due date using the dashboard time range, and return work item name, assigned user, state, and due date.
- **Review work assigned to an operator**: Filter by Assigned to and display the work item name, type, state, planned start date, and workspace.

### Additional Resources

For more information on managing work items using SystemLink Enterprise, refer to <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/creating-and-managing-work-orders.html" target="_blank" rel="noopener noreferrer">Creating and managing work orders - SystemLink Enterprise</a>.
