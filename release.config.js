const package = 'systemlink-grafana-plugins';

module.exports = {
    branches: ['main'],
    plugins: [
        ["@semantic-release/commit-analyzer", {
            preset: "conventionalcommits",
            releaseRules: [
                { type: "feat", release: "minor" },
                { type: "fix", release: "patch" },
                { type: "perf", release: "patch" },
                { type: "build", release: "patch" },
            ]
        }],
        ["@semantic-release/release-notes-generator", {
            preset: "conventionalcommits"
        }],
        '@semantic-release/changelog',
        '@semantic-release/npm',
        ['@semantic-release/exec', {
            prepareCmd: 'npm run build',
            publishCmd: `mv dist ${package} && zip -r ${package}.zip ${package}`
        }],
        ['@semantic-release/github', {
            assets: [{ path: `${package}.zip`, name: package + '-${nextRelease.version}.zip'}]
        }],
        '@semantic-release/git'
    ]
}
