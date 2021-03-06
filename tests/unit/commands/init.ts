const { beforeEach, afterEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import MockModule from '../../support/MockModule';
import * as sinon from 'sinon';
import chalk from 'chalk';

describe('init command', () => {
	let mockModule: MockModule;
	let sandbox: sinon.SinonSandbox;
	let fs: any;
	let pkgDir: any;
	let warnStub: any;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		mockModule = new MockModule('../../../src/commands/init', require);
		mockModule.dependencies(['fs', 'pkg-dir', '../allCommands']);

		sandbox.stub(console, 'log');
		warnStub = sandbox.stub(console, 'warn');

		pkgDir = mockModule.getMock('pkg-dir');
		pkgDir.ctor.sync = sandbox.stub().returns('./');

		fs = mockModule.getMock('fs');
		fs.existsSync = sandbox.stub().returns(true);
		fs.writeFileSync = sandbox.stub();

		const buildCommandMap = new Map();
		const testCommandMap = new Map();
		const build = {
			name: 'webpack',
			group: 'build'
		};
		const test = {
			name: 'intern',
			group: 'test'
		};

		buildCommandMap.set('webpack', build);
		testCommandMap.set('test', test);
		const groupMap = new Map([['build', buildCommandMap], ['test', testCommandMap]]);

		const allCommands = mockModule.getMock('../allCommands');
		allCommands.loadExternalCommands.returns(groupMap);
	});

	afterEach(() => {
		sandbox.restore();
		mockModule.destroy();
	});

	it('shows a warning if no package.json file is found', async () => {
		pkgDir.ctor.sync = sandbox.stub().returns(undefined);
		fs.readFileSync = sandbox.stub().returns(undefined);
		const moduleUnderTest = mockModule.getModuleUnderTest().default;
		await moduleUnderTest.run();
		assert.isTrue(pkgDir.ctor.sync.calledOnce);
		assert.isTrue(warnStub.calledOnce);
		assert.isTrue(
			warnStub.calledWith(
				chalk.yellow(`Warning: A root `) +
					chalk.whiteBright.bold('package.json ') +
					chalk.yellow(
						`was not found; this directory will be used for the root for your Dojo project. It is strongly recommended you create one by running `
					) +
					chalk.whiteBright.bold('npm init')
			)
		);
	});

	it('creates a .dojorc with the available commands', async () => {
		fs.readFileSync = sandbox.stub().returns(undefined);
		const moduleUnderTest = mockModule.getModuleUnderTest().default;
		await moduleUnderTest.run();
		const [, content] = fs.writeFileSync.firstCall.args;
		assert.equal(content, JSON.stringify({ 'build-webpack': {}, 'test-intern': {} }, null, '\t'));
	});

	it('updates a .dojorc with the available commands', async () => {
		fs.readFileSync = sandbox.stub().returns('{}');
		const moduleUnderTest = mockModule.getModuleUnderTest().default;
		await moduleUnderTest.run();
		const [, content] = fs.writeFileSync.firstCall.args;
		assert.equal(content, JSON.stringify({ 'build-webpack': {}, 'test-intern': {} }, null, '\t'));
	});

	it('updates a .dojorc, but does not overwrite existing config', async () => {
		fs.readFileSync = sandbox.stub().returns(JSON.stringify({ 'build-webpack': { foo: 'bar' } }, null, '\t'));
		const moduleUnderTest = mockModule.getModuleUnderTest().default;
		await moduleUnderTest.run();
		const [, content] = fs.writeFileSync.firstCall.args;
		assert.equal(
			content,
			JSON.stringify(
				{
					'build-webpack': {
						foo: 'bar'
					},
					'test-intern': {}
				},
				null,
				'\t'
			)
		);
	});

	it('updates a .dojorc and keeps indent formatting', async () => {
		fs.readFileSync = sandbox.stub().returns(JSON.stringify({ 'build-webpack': { foo: 'bar' } }, null, 2));
		const moduleUnderTest = mockModule.getModuleUnderTest().default;
		await moduleUnderTest.run();
		const [, content] = fs.writeFileSync.firstCall.args;
		assert.equal(
			content,
			JSON.stringify(
				{
					'build-webpack': {
						foo: 'bar'
					},
					'test-intern': {}
				},
				null,
				2
			)
		);
	});
});
