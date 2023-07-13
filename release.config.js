const package = 'systemlink-grafana-plugins';

module.exports = {
    branches: ['main'],
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
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