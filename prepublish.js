const fs = require('fs');
const pkg = require('./package.json');

// remove dependencies that are not needed for the library.
const {
	react,
	'react-scripts': reactScripts,
	'react-dom': reactDom,
	'@testing-library/jest-dom': testingLibraryjestDom,
	'@testing-library/react': testingLibraryReact,
	'@testing-library/user-event': testingLibraryUserEvent,
	'@types/jest': typesJest,
	'@types/node': typesNode,
	'@types/react': typesReact,
	'@types/react-dom': typesReactDom,
	'web-vitals': webVitals,
	...dependencies
} = pkg.dependencies;

const peerDependencies = {
	react: '>=18.3.1',
	'react-scripts': '>=5.0.1',
	'react-dom': '>=18.3.1',
};

fs.writeFileSync('package.json', JSON.stringify({
	name: pkg.name,
	description: pkg.description,
	version: pkg.version,
	repository: pkg.repository,
	keywords: pkg.keywords,
	main: pkg.main,
	module: pkg.module,
	exports: pkg.exports,
	typings: pkg.typings,
	publishConfig: pkg.publishConfig,
	dependencies,
	peerDependencies,
}, null, 4));
