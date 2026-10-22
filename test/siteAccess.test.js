const {test, before, after, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Set before loading authentication modules; never use real credentials or the database.
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
const userQuery = require('../queries/users');
const authService = require('../services/authService');
const loginService = require('../services/loginRegisterService');
const {createSiteAccessRouter, siteAccessErrorHandler} = require('../services/siteAccessService');
const {createSiteSettingsStore, DEFAULT_MAINTENANCE_MESSAGE} = require('../queries/siteSettings');

let server;
let origin;
let settings;
let failReads = false;
let failWrites = false;
let permissionLevel = 6;
let passwordHash;
let adminToken;
let userToken;
const encryptedPassword = crypto.createHash('sha256').update('isolated-test-password').digest('hex');
const originalGetByUsername = userQuery.getUserByUsername;
const originalGetById = userQuery.getUserById;

before(async () => {
    passwordHash = await bcrypt.hash(encryptedPassword, 4);
    userQuery.getUserByUsername = async username => ['admin', 'member'].includes(username) ? {
        userid: username, username, password: passwordHash, permissionlevel: username === 'admin' ? permissionLevel : 1
    } : undefined;
    userQuery.getUserById = async id => id === 'admin' || id === 'member' ? [{
        userid: id, username: id, permissionlevel: id === 'admin' ? permissionLevel : 1
    }] : [];
    adminToken = jwt.sign({sub: 'admin'}, process.env.JWT_SECRET);
    userToken = jwt.sign({sub: 'member'}, process.env.JWT_SECRET);

    const app = express();
    app.use(express.json());
    app.use('/v1', createSiteAccessRouter({
        settingsStore: {
            async get() {
                if (failReads) throw new Error('Simulated database outage');
                return {...settings};
            },
            async update(next) {
                if (failWrites) throw new Error('Simulated write failure');
                settings = {...next, updatedAt: new Date().toISOString()};
                return {...settings};
            }
        },
        authorizeToken: authService.authorizeToken,
        adminLogin: loginService.adminLogin
    }));
    app.post('/v1/auth/login', loginService.login);
    app.get('/v1/auth/authorize', loginService.authorizeToken);
    // Downstream handlers stand in for gallery routes and must never be reached when blocked.
    app.use('/v1', (req, res) => res.json({reachedGallery: true}));
    app.use(siteAccessErrorHandler);
    await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}/v1`;
});

beforeEach(() => {
    settings = {loginEnabled: true, maintenanceMode: false,
        maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE, updatedAt: '2026-01-01T00:00:00.000Z'};
    failReads = false;
    failWrites = false;
    permissionLevel = 6;
});

after(async () => {
    userQuery.getUserByUsername = originalGetByUsername;
    userQuery.getUserById = originalGetById;
    await new Promise(resolve => server.close(resolve));
});

async function request(path, {method = 'GET', token, body} = {}) {
    return fetch(`${origin}${path}`, {method, headers: {
        ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
        ...(token ? {Authorization: `Bearer ${token}`} : {})
    }, ...(body !== undefined ? {body: JSON.stringify(body)} : {})});
}

test('public status has safe defaults and cannot be cached', async () => {
    const response = await request('/site-status');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), settings);
});

test('only authenticated administrators can read or change settings', async () => {
    for (const method of ['GET', 'PUT']) {
        assert.equal((await request('/admin/settings', {method, body: method === 'PUT' ? {} : undefined})).status, 401);
        assert.equal((await request('/admin/settings', {method, token: userToken,
            body: method === 'PUT' ? {} : undefined})).status, 403);
    }
    const forged = jwt.sign({sub: 'admin'}, 'wrong-secret');
    assert.equal((await request('/admin/settings', {token: forged})).status, 401);
    assert.equal((await request('/admin/settings', {token: adminToken})).status, 200);
});

test('revoking admin rights invalidates access for an already issued token', async () => {
    assert.equal((await request('/admin/settings', {token: adminToken})).status, 200);
    permissionLevel = 5;
    assert.equal((await request('/admin/settings', {token: adminToken})).status, 403);
});

test('admin saves both switches and the message together and public status reflects the change', async () => {
    const response = await request('/admin/settings', {method: 'PUT', token: adminToken,
        body: {loginEnabled: false, maintenanceMode: true, maintenanceMessage: '  Bald zurück!  '}});
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.equal(saved.maintenanceMessage, 'Bald zurück!');
    assert.equal(saved.loginEnabled, false);
    assert.equal(saved.maintenanceMode, true);
    assert.deepEqual(await (await request('/site-status')).json(), saved);
    assert.equal((await request('/admin/settings', {token: adminToken})).status, 200);
});

test('invalid settings never change the stored values', async () => {
    const original = {...settings};
    const valid = {loginEnabled: false, maintenanceMode: true, maintenanceMessage: 'Test'};
    for (const body of [null, [], {}, {...valid, loginEnabled: 'false'}, {...valid, maintenanceMode: 1},
        {...valid, maintenanceMessage: ' '}, {...valid, maintenanceMessage: 'x'.repeat(501)}, {...valid, permissionLevel: 9}]) {
        assert.equal((await request('/admin/settings', {method: 'PUT', token: adminToken, body})).status, 400);
        assert.deepEqual(settings, original);
    }
});

test('disabling login blocks new sign-ins and registrations including case and trailing-slash variants', async () => {
    settings.loginEnabled = false;
    for (const path of ['/auth/login', '/auth/login/', '/AUTH/LOGIN', '/register', '/REGISTER/']) {
        const response = await request(path, {method: 'POST', body: {username: 'admin', encryptedPassword}});
        assert.equal(response.status, 503, path);
        assert.equal((await response.json()).errorCode, 'LOGIN_DISABLED');
    }
    assert.equal((await request('/images')).status, 200);
    assert.equal((await request('/account/images', {token: userToken})).status, 200);
    assert.equal((await request('/upload', {method: 'POST', token: userToken})).status, 200);
    assert.equal((await request('/verify?token=test')).status, 200);
    const session = await request('/auth/authorize', {token: userToken});
    assert.equal(session.status, 200);
    assert.equal((await session.json()).userId, 'member');
});

test('maintenance blocks all gallery access including signed images and existing sessions', async () => {
    settings.maintenanceMode = true;
    for (const [path, method] of [['/images', 'GET'], ['/images/photo.jpg?token=previously-issued', 'GET'],
        ['/uploads/photo.jpg', 'GET'], ['/getSignedImageUrl/photo.jpg', 'GET'],
        ['/account/profile-picture/member.jpg', 'HEAD'], ['/account/images', 'GET'], ['/account/folders', 'GET'],
        ['/upload', 'POST'], ['/auth/login', 'POST'], ['/register', 'POST'], ['/verify?token=test', 'GET']]) {
        const response = await request(path, {method, token: userToken});
        assert.equal(response.status, 503, path);
        assert.equal(response.headers.get('retry-after'), '60');
        if (method !== 'HEAD') assert.equal((await response.json()).errorCode, 'MAINTENANCE_MODE');
    }
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/site-status')).status, 200);
    assert.equal((await request('/auth/authorize', {token: adminToken})).status, 200);
    assert.equal((await request('/admin/settings', {token: adminToken})).status, 200);
});

test('admin login works with both switches blocking visitors and rejects ordinary accounts', async () => {
    settings.loginEnabled = false;
    settings.maintenanceMode = true;
    const response = await request('/admin/login', {method: 'POST', body: {username: 'admin', encryptedPassword}});
    assert.equal(response.status, 200);
    const login = await response.json();
    assert.equal(jwt.verify(login.token, process.env.JWT_SECRET).sub, 'admin');
    assert.equal((await request('/admin/settings', {token: login.token})).status, 200);
    const member = await request('/admin/login', {method: 'POST', body: {username: 'member', encryptedPassword}});
    assert.equal(member.status, 403);
    assert.equal((await member.json()).token, undefined);
    assert.equal((await request('/admin/login', {method: 'POST',
        body: {username: 'admin', encryptedPassword: 'a'.repeat(64)}})).status, 400);
    assert.equal((await request('/admin/login', {method: 'POST', body: {username: ['admin']}})).status, 400);
});

test('ending maintenance restores the gallery without restarting and keeps login choice', async () => {
    settings.maintenanceMode = true;
    settings.loginEnabled = false;
    const response = await request('/admin/settings', {method: 'PUT', token: adminToken,
        body: {loginEnabled: false, maintenanceMode: false, maintenanceMessage: 'Bald zurück'}});
    assert.equal(response.status, 200);
    assert.equal((await request('/images')).status, 200);
    assert.equal((await request('/auth/login', {method: 'POST', body: {}})).status, 503);
});

test('database failures block gallery access, keep admin login reachable and preserve failed changes', async () => {
    failReads = true;
    assert.equal((await request('/images')).status, 503);
    assert.equal((await (await request('/site-status')).json()).errorCode, 'SITE_STATUS_UNAVAILABLE');
    assert.equal((await request('/admin/login', {method: 'POST', body: {username: 'admin', encryptedPassword}})).status, 200);
    failReads = false;
    failWrites = true;
    const original = {...settings};
    const response = await request('/admin/settings', {method: 'PUT', token: adminToken,
        body: {loginEnabled: false, maintenanceMode: true, maintenanceMessage: 'Neue Nachricht'}});
    assert.equal(response.status, 503);
    assert.deepEqual(settings, original);
});

test('PostgreSQL initialization does not overwrite an existing settings row', async () => {
    const statements = [];
    const store = createSiteSettingsStore({async query(sql, values) { statements.push({sql, values}); return {rows: []}; }});
    await store.initialize();
    assert.match(statements[0].sql, /CREATE TABLE IF NOT EXISTS site_settings/);
    assert.match(statements[1].sql, /ON CONFLICT \(id\) DO NOTHING/);
    assert.deepEqual(statements[1].values, [DEFAULT_MAINTENANCE_MESSAGE]);
});

test('PostgreSQL write uses one parameterized update and returns the database timestamp', async () => {
    const statements = [];
    const row = {...settings, loginEnabled: false, maintenanceMode: true};
    const store = createSiteSettingsStore({async query(sql, values) { statements.push({sql, values}); return {rows: [row]}; }});
    const draft = {loginEnabled: false, maintenanceMode: true, maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE};
    assert.deepEqual(await store.update(draft), row);
    assert.equal(statements.length, 1);
    assert.match(statements[0].sql, /UPDATE site_settings/);
    assert.deepEqual(statements[0].values, [false, true, DEFAULT_MAINTENANCE_MESSAGE]);
});
