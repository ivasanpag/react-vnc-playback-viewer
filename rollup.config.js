const pkg = require('./package.json');
const typescript = require('rollup-plugin-typescript2');

const config = {
    input: pkg.source,
    output: [
        { file: pkg.main, format: 'cjs' },
        { file: pkg.module, format: 'es' },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json', useTsconfigDeclarationDir: true })],
    external: Object.keys(pkg.peerDependencies ?? {}),
};

module.exports = config;
