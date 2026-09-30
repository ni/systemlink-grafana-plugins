# SystemLink Work Items data source

This is a plugin for Work Items from the Work item service. It allows you to:

- Visualize work items metadata and count on a dashboard

If a dashboard panel's work-items data query receives an HTTP 403, the panel shows a warning icon in its header. Hover over the icon to see: "You don't have permission to view work items. Contact your SystemLink administrator for access." The affected query returns no data, so the panel may display "No data"; other queries in the same panel can still show their results. Other query errors retain their usual error behavior. Variable queries, query-editor lookups, and data source connection tests are unchanged.
