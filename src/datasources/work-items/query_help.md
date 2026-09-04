### SystemLink Work Items data source

Use the _SystemLink Work Items_ data source to display work item properties and counts in dashboards. It supports work orders, test plans, jobs, maintenance, calibration, reservations, and transport orders.

### Key Features

- **Properties output**: Select the work item properties to return, including work item details, timeline information, resources, and custom properties.
- **Total Count output**: Return the number of work items that match the selected types and query conditions.
- **Query By filters**: Filter work items by properties such as state, workspace, assigned user, product, dates, resource identifiers, and custom properties. Date filters support dashboard time range variables.
- **Sort and limit results**: For Properties output, order results by **ID** or **Updated at**, choose ascending or descending order, and return up to 10,000 work items.

### Example Queries

You can use the _SystemLink Work Items_ data source for scenarios such as:

- **View test plans by state**: Select **Test plans** in Type, return work item properties, and group the resulting table by State.
- **Count scheduled calibration work items**: Select **Calibration** in Type, use Total Count output, and filter by State.
- **Track work items due soon**: Select the required types, filter by Due date using the dashboard time range, and return work item name, assigned user, state, and due date.
- **Review work assigned to an operator**: Filter by Assigned to and display the work item name, type, state, planned start date, and workspace.

### Additional Resources

For more information on managing work items using SystemLink Enterprise, refer to <a href="https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/creating-and-managing-work-orders.html" target="_blank" rel="noopener noreferrer">Creating and managing work orders - SystemLink Enterprise</a>.
