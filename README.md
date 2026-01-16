# SystemLink Grafana Plugins
[![Push to
main](https://github.com/ni/systemlink-grafana-plugins/actions/workflows/push.yml/badge.svg)](https://github.com/ni/systemlink-grafana-plugins/actions/workflows/push.yml)

Grafana plugins for visualizing data from [SystemLink
Enterprise](https://www.ni.com/docs/en-US/bundle/systemlink-enterprise/page/systemlink-enterprise.html).

## Description

This project contains a set of data sources and panel plugins bundled as an [app
plugin](https://grafana.com/docs/grafana/latest/administration/plugin-management/#app-plugins),
scaffolded using the [Grafana Plugin
Tools](https://grafana.github.io/plugin-tools/).

### Data sources

- [Data frames](src/datasources/data-frame/)
- [Notebooks](src/datasources/notebook/)
- [Systems](src/datasources/system/)
- [Tags](src/datasources/tag/)
- [Assets](src/datasources/asset/)
- [Products](src/datasources/products/)
- [Results](src/datasources/results/)
- [Work orders](src/datasources/work-orders/)
- [Test plans](src/datasources/test-plans/)
- [Alarms](src/datasources/alarms/)

### Panels

- [Plotly.js chart](src/panels/plotly/)
- [QRCode](src/panels/qr-code/)

## Contributing

If you're at NI, request to be granted access to the repo. Outside contributors
can use a fork & pull workflow.

### Getting started

If you're on Windows, you'll need to first [set up WSL](#wsl-setup). Building
requires [Node.js + npm](https://docs.npmjs.com/cli/v9/configuring-npm/install)
(20.x is the node version used in build pipelines), and
[Docker](https://docs.docker.com/engine/install/) is used to run the Grafana
server in a container for development.

After cloning the repo, `npm install` to fetch dependencies and then `npm run start` to build in development mode. This command does two things:

1. Starts a process that
   watches for changes to the source code and automatically rebuilds.
1. Starts up Grafana in a container with the `./dist` directory
   created by the build process mounted. After a brief startup, you should now
   be able to access the Grafana UI at http://localhost:3000.

Alternatively, if you use VS Code as your editor, this repo contains a launch
configuration that runs the steps above and then attaches to an instance of
Chrome for debugging. See [Debugging in Visual Studio
Code](https://code.visualstudio.com/docs/editor/debugging) for more information.

For panel plugins, there's no extra configuration needed - it will automatically
show up in the list of available visualizations.

### Data source configuration

For data source plugins, some manual configuration is required to have it
connect to a SystemLink service running in the cloud.

1. Navigate to the data sources configuration page (`/datasources`). You can get
   there by clicking the gear icon in the sidebar.
2. Select **Add data source**. Search for the plugin in the list and click on it
   to enter the data source settings view.
3. **Using API Ingress**

   1. Enter the API ingress **URL** of the Stratus environment you want to access (e.g., `https://test-api.lifecyclesolutions.ni.com`).
   2. For authentication, click the **Add header** button. Create a custom header with the name `x-ni-api-key` and set its value to your [API key](https://ni-staging.zoominsoftware.io/docs/en-US/bundle/systemlink-enterprise/page/creating-an-api-key.html) for the SLE instance.

4. **Using UI Ingress**

   1. Enter the UI ingress **URL** of the Stratus environment you want to access (e.g., `https://test.lifecyclesolutions.ni.com`).
   2. Log in to the URL in your browser and navigate to the **Application Tab** to copy the cookie value.
   3. For authentication, enable the **With Credentials** toggle, click the **Add header** button, and create a custom header with the name `cookie` and set its value to the copied browser cookie.

5. Click **Save & test**. You should see **Success** pop up if the data source
   was configured correctly and the API key grants the necessary privileges.

You should now be able to use the data source when building a dashboard or in
the Explore mode. Navigating to Explore is the easiest way to begin testing the
plugin.

### Testing

If you followed the steps above, a live reload script was injected into the
Grafana frontend. Any time the plugin rebuilds, the page will automatically
refresh and load the new bundle.

Run `npm run test` to launch the unit tests in watch mode.

Run `npm run e2e` to run the integration tests.

### Submitting changes

Once you're ready to submit changes to a plugin, all you need to do is open a
pull request on GitHub to merge your branch. Don't forget to resolve any lint
errors (`npm run lint:fix`) and ensure that the [tests are passing](#testing)
locally.

The repo uses
[semantic-release](https://semantic-release.gitbook.io/semantic-release/) and a
[GitHub workflow](.github/workflows/push.yml) to automate the versioning and
release process. For this to work, commits to `main` need to follow a specific
message format.

#### Commit message format

```
<type>(<scope>): <short summary>
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: If your change applies to a single plugin, put its short name
  │                          as the scope (e.g. tag, notebook, system).
  │
  └─⫸ Commit Type: build|ci|docs|feat|fix|perf|refactor|test
```

The `<type>` and `<summary>` fields are mandatory, the `(<scope>)` field is
optional.

`<type>` must be one of the following:

| Type | When to use | Automatic version bump |
| --- | --- | --- |
| `build` | Changes that affect the build system or external dependencies | None |
| `ci` | Changes to our CI configuration files and scripts | None |
| `docs` | Documentation only changes | None |
| `feat` | A new feature | Minor |
| `fix` | A bug fix | Maintenance |
| `perf`| A code change that improves performance | None |
| `refactor`| A code change that neither fixes a bug nor adds a feature | None |
| `test`| Adding missing tests or correcting existing tests | None |
| `chore` | Changes that don't fit into the above categories | None |

For example, if you're making a bug fix to the [Data
frame](src/datasources/data-frame/) plugin, your PR title (and therefore the
commit message when merging into `main`) would be something like:

`fix(data-frame): prevent crash when user hits their head on the keyboard`

Note that none of the `<type>` values will automatically trigger a major version bump. To force a new major version bump, you must put `BREAKING CHANGE: <breaking change summary>` in the footer of the commit. Follow the [commit message format](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md#commit-message-footer) outlined in the Angular docs.

### WSL setup

The [plugin tools](https://grafana.github.io/plugin-tools/) provided by Grafana
do not currently support Windows. However, you can still set up the plugin and
run commands inside a [WSL](https://learn.microsoft.com/en-us/windows/wsl/)
environment.

1. [Enable WSL](https://learn.microsoft.com/en-us/windows/wsl/install). If you
   installed Docker Desktop, it's likely already enabled. Run `wsl --update` to
   make sure it's up to date.
2. If you don't have a distribution installed, run `wsl --install -d ubuntu` to
   install Ubuntu. Note that your distro needs to be on WSL 2 for Docker to
   work.
3. Open Docker Desktop. Go to **Settings > Resources > WSL Integration** and
   **Enable integration with additional distros**.
4. Open a shell in your Linux environment. [Windows
   Terminal](https://learn.microsoft.com/en-us/windows/terminal/install) is
   recommended for seamlessly managing multiple command lines.
5. [Install
   Node.js](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl).

You can now follow the [setup steps](#getting-started). Make sure that you're
running the commands in your Linux environment. The [WSL
extension](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode)
for Visual Studio Code is recommended to simplify development.

### Creating a new plugin

To create a new data source, run `npm run generate` in the root directory and
follow the instructions.

### Considerations updating to a new Grafana version

- Update the `@grafana` scoped npm package dependency versions to align with the [`ni/grafana`](https://github.com/ni/grafana) upgrade version.
- Follow the validation instructions in the [`Skyline/Grafana README.md`](https://dev.azure.com/ni/DevCentral/_git/Skyline?path=/Grafana/README.MD&_a=preview).

### Security scanning with Snyk

This repository uses [Snyk](https://snyk.io/) for security scanning to identify and fix vulnerabilities in code before they reach production. Snyk provides Static Application Security Testing (SAST) that scans your code for security issues as you develop.

- **IDE integration**: Install the Snyk extension for [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=snyk-security.snyk-vulnerability-scanner) or [Visual Studio](https://marketplace.visualstudio.com/items?itemName=snyk-security.snyk-vulnerability-scanner-vs-2022) to get real-time security feedback while writing code. To suggest the Snyk extension to contributors, add `.vscode/extensions.json` or `.vsconfig` files to your project root. The VSCode Snyk extension has a richer feature set and is the preferred IDE for working with Snyk.
- **Pull request scanning**: Snyk automatically scans PRs and posts comments for high/critical vulnerabilities.
- **Post-merge monitoring**: Automated bugs are created for unresolved issues after code is merged.

**Contributors within NI/Emerson**: For detailed guidance on working with Snyk, including how to address security issues and create ignore records, see the [Snyk reference](https://dev.azure.com/ni/DevCentral/_wiki/wikis/Stratus/146862/Snyk-reference).

**Contributors outside of NI/Emerson**: If you are having issues resolving a vulnerability Snyk identifies on your PR, consult with a code owner to understand your options for resolution.

### Helpful links

- [Grafana plugin developer's
guide](https://grafana.com/docs/grafana/latest/developers/plugins/)

Test
