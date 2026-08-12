const {
    getUserSettingsByUserId,
    createUserSettings,
    updateUserSettings,
} = require('../services/settingsService');

const validateUpdatePayload = (payload) => {
    const errors = [];

    if (payload.email !== undefined) {
        errors.push('email cannot be changed');
    }

    if (payload.image !== undefined || payload.avatar !== undefined) {
        errors.push('profile image is not supported');
    }

    if (payload.name !== undefined && typeof payload.name !== 'string') {
        errors.push('name must be a string');
    }

    if (payload.name !== undefined && typeof payload.name === 'string' && !payload.name.trim()) {
        errors.push('name cannot be empty');
    }

    return errors;
};

const getSettingsHandler = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        let settings = await getUserSettingsByUserId(userId);

        if (!settings) {
            // Auto-provision settings for the logged-in user if they don't have one yet
            settings = await createUserSettings({
                userId,
                email: req.user.email || 'user@example.com',
                name: req.user.name || req.user.email?.split('@')[0] || 'User',
            });
        }

        res.json(settings);
    } catch (error) {
        next(error);
    }
};

const createSettingsHandler = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const name = req.body.name || req.user.name || req.user.email?.split('@')[0] || 'User';
        const email = req.user.email || req.body.email || 'user@example.com';

        const settings = await createUserSettings({
            userId,
            email,
            name: name.trim(),
        });

        res.status(201).json(settings);
    } catch (error) {
        next(error);
    }
};

const updateSettingsHandler = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        const payload = {
            email: req.body.email,
            name: req.body.name,
            image: req.body.image,
            avatar: req.body.avatar,
        };

        const errors = validateUpdatePayload(payload);
        if (errors.length) {
            res.status(400);
            throw new Error(errors.join(', '));
        }

        const hasUpdates = payload.name !== undefined;
        if (!hasUpdates) {
            res.status(400);
            throw new Error('No fields to update');
        }

        let updatedSettings = await updateUserSettings(userId, {
            name: payload.name.trim(),
        });

        if (!updatedSettings) {
            // Provision first if not found
            await createUserSettings({
                userId,
                email: req.user.email || 'user@example.com',
                name: payload.name.trim(),
            });
            updatedSettings = await getUserSettingsByUserId(userId);
        }

        res.json(updatedSettings);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSettingsHandler,
    createSettingsHandler,
    updateSettingsHandler,
};