class WorkItemRoutes {
    // Returns an empty result for now; upcoming PRs will filter db work items and return real matches.
    queryWorkItems(_req, res) {
        res.status(200).json({ workItems: [], totalCount: 0 });
    }
}
export const workItemRoutes = new WorkItemRoutes();
