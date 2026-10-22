const express = require('express');

function isAdmin(user) {
    return user?.status === 'success' && Number(user.permissionLevel) > 5;
}

function createSiteAccessRouter({settingsStore, authorizeToken, adminLogin}) {
    const router = express.Router();
    const handle = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

    const requireAdmin = handle(async (req, res, next) => {
        const user = await authorizeToken(req.headers.authorization);
        if (user.status !== 'success') {
            return res.status(401).json({errorCode: 'UNAUTHORIZED', message: 'Please log in as an administrator.'});
        }
        if (!isAdmin(user)) {
            return res.status(403).json({errorCode: 'ADMIN_REQUIRED', message: 'Administrator permissions are required.'});
        }
        next();
    });

    router.get('/site-status', handle(async (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(await settingsStore.get());
    }));

    router.post('/admin/login', adminLogin);
    router.use('/admin', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    }, requireAdmin);
    router.get('/admin/settings', handle(async (req, res) => res.json(await settingsStore.get())));
    router.put('/admin/settings', handle(async (req, res) => {
        const settings = req.body;
        const keys = ['loginEnabled', 'maintenanceMode', 'maintenanceMessage'];
        if (!settings || Array.isArray(settings) || Object.keys(settings).some(key => !keys.includes(key)) ||
            typeof settings.loginEnabled !== 'boolean' || typeof settings.maintenanceMode !== 'boolean' ||
            typeof settings.maintenanceMessage !== 'string' || settings.maintenanceMessage.length > 500 ||
            !settings.maintenanceMessage.trim()) {
            return res.status(400).json({errorCode: 'INVALID_SETTINGS',
                message: 'Please provide both settings and a maintenance message between 1 and 500 characters.'});
        }
        res.json(await settingsStore.update({...settings, maintenanceMessage: settings.maintenanceMessage.trim()}));
    }));
    router.use('/admin', (req, res) => res.status(404).json({message: 'Admin endpoint not found.'}));

    // Keep session checks and health checks reachable, including during maintenance.
    router.use(handle(async (req, res, next) => {
        const pathname = req.path.toLowerCase().replace(/\/+$/, '') || '/';
        if ((req.method === 'GET' || req.method === 'HEAD') && ['/auth/authorize', '/health'].includes(pathname)) {
            res.set('Cache-Control', 'no-store');
            return next();
        }
        res.set('Cache-Control', 'no-store');
        const settings = await settingsStore.get();
        if (settings.maintenanceMode) {
            return res.status(503).set('Retry-After', '60').json({errorCode: 'MAINTENANCE_MODE',
                message: settings.maintenanceMessage});
        }
        if (!settings.loginEnabled && req.method === 'POST' && ['/auth/login', '/register'].includes(pathname)) {
            return res.status(503).set('Retry-After', '60').json({errorCode: 'LOGIN_DISABLED',
                message: 'Login and registration are temporarily disabled.'});
        }
        next();
    }));

    return router;
}

function siteAccessErrorHandler(error, req, res, next) {
    console.error('Site access request failed:', error.message);
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
        return res.status(error.status).set('Cache-Control', 'no-store').json({
            errorCode: 'INVALID_REQUEST', message: 'The request contains invalid JSON or exceeds the size limit.'
        });
    }
    res.status(503).set('Cache-Control', 'no-store').set('Retry-After', '60').json({
        errorCode: 'SITE_STATUS_UNAVAILABLE', message: 'The site status is currently unavailable. Please try again later.'
    });
}

module.exports = {createSiteAccessRouter, siteAccessErrorHandler, isAdmin};
