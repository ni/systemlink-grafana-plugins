import { DataSourceInstanceSettings } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { Workspace } from "core/types";

export class Workspaces {
    readonly workspacesCache = new Map<string, Workspace>([]);
    workspacesPromise: Promise<Map<string, Workspace>> | null = null;

    private readonly queryWorkspacesUrl = `${this.instanceSettings.url}/niauth/v1/auth`;

    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ) {
        this.loadWorkspaces();
    }

    private async loadWorkspaces(): Promise<Map<string, Workspace>> {
        if (this.workspacesCache.size > 0) {
            return this.workspacesCache;
        }

        if (this.workspacesPromise) {
            return this.workspacesPromise;
        }

        this.workspacesPromise = this.getWorkspaces().then(workspaces => {
            if (workspaces) {
                workspaces.forEach(workspace => this.workspacesCache.set(workspace.id, workspace));
            }
            return this.workspacesCache;
        });

        return this.workspacesPromise;
    }

    private async getWorkspaces(): Promise<Workspace[]> {
        const response = await this.backendSrv.get<{ workspaces: Workspace[] }>(this.queryWorkspacesUrl);
        return response.workspaces;
    }
}
