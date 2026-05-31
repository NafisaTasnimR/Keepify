import React, { useState } from 'react';
import './CustomerPage.css';

const CustomerFormModal = ({ customer, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name:  customer?.name  || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await onSave(formData);
        } catch (err) {
            setError(err.message || 'Failed to save customer');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">
                        {customer ? 'Edit Customer' : 'Add New Customer'}
                    </h2>
                    <button className="modal-close-btn" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="add-product-form">
                    <div className="form-section">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="Enter full name"
                        />
                    </div>
                    <div className="form-section">
                        <label className="form-label">Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="Enter email address"
                        />
                    </div>
                    <div className="form-section">
                        <label className="form-label">Phone</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter phone number (optional)"
                        />
                    </div>

                    {error && <p className="form-error">{error}</p>}

                    <div className="form-buttons">
                        <button type="button" onClick={onCancel} className="btn btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-save" disabled={saving}>
                            {saving ? 'Saving…' : customer ? 'Update Customer' : 'Save Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;