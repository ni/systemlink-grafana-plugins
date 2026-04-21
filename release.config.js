const package = 'systemlink-grafana-plugins';
const prerelease = process.env.PRERELEASE_CHANNEL;
const branch = process.env.PRERELEASE_BRANCH;

module.exports = {
    ...(prerelease && { branches: ['main', { name: branch, prerelease, channel: prerelease }] }),
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
