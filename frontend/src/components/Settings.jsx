import React, { useState, useEffect } from 'react';
import './Settings.css';
import { apiFetch } from '../api/client';

const Settings = () => {
    const [user, setUser] = useState({
        name: '',
        email: '',
    });
    const [nameInput, setNameInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserSettings = async () => {
            try {
                setIsLoading(true);
                const response = await apiFetch('/api/settings/me');

                if (!response.ok) {
                    throw new Error('Failed to fetch settings');
                }

                const data = await response.json();
                setUser(data);
                setNameInput(data.name || '');
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserSettings();
    }, []);

    const handleSave = async () => {
        if (nameInput.trim() === '') {
            setNameInput(user.name);
            return;
        }

        try {
            const response = await apiFetch('/api/settings/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            const updatedUser = await response.json();
            setUser(updatedUser);
            // Also update localStorage user info if stored
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                storedUser.name = updatedUser.name;
                localStorage.setItem('user', JSON.stringify(storedUser));
            } catch (e) {
                // ignore
            }
        } catch (err) {
            alert(err.message);
            setNameInput(user.name);
        }
    };

    const handleCancel = () => {
        setNameInput(user.name);
    };

    const handleBlur = () => {
        handleSave();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    if (isLoading) return <div className="settings-container">Loading settings...</div>;
    if (error) return <div className="settings-container">Error: {error}</div>;

    return (
        <div className="settings-container">
            <h2 className="settings-title">Settings</h2>

            <div className="settings-card">
                {/* Name – editable */}
                <div className="settings-field">
                    <label className="settings-label" htmlFor="name-input">
                        Name
                    </label>
                    <div className="settings-input-row">
                        <input
                            id="name-input"
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="settings-input"
                            placeholder="Enter your name"
                        />
                        <span className="settings-edit-hint">edit</span>
                    </div>
                </div>

                {/* Email – read-only */}
                <div className="settings-field">
                    <label className="settings-label" htmlFor="email-display">
                        Email
                    </label>
                    <div className="settings-value-display" id="email-display">
                        {user.email}
                    </div>
                </div>
            </div>

            {/* Status indicator – unsaved / saved */}
            <div className="settings-status">
                {nameInput.trim() !== user.name && nameInput.trim() !== '' ? (
                    <span className="settings-status-unsaved">Unsaved changes</span>
                ) : (
                    <span className="settings-status-saved">All changes saved</span>
                )}
            </div>
        </div>
    );
};

export default Settings;