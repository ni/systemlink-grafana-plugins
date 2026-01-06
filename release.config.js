const package = 'systemlink-grafana-plugins';

module.exports = {
    branches: [
        'main',
        { name: '*', prerelease: 'pre' }
    ],
    plugins: [
        ["@semantic-release/commit-analyzer", {
            preset: "conventionalcommits"
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
