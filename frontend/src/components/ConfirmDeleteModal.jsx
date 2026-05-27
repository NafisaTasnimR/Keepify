import React from 'react';
import './ConfirmDeleteModal.css';

const ConfirmDeleteModal = ({
    isOpen,
    productName,
    onConfirm,
    onCancel,
    isDeleting = false,
    error = '',
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="confirm-delete-overlay" role="dialog" aria-modal="true">
            <div className="confirm-delete-container">
                <h2 className="confirm-delete-title">Delete product</h2>
                <p className="confirm-delete-text">
                    Are you sure you want to delete
                    <span className="confirm-delete-name">
                        {productName ? ` "${productName}"` : ' this product'}
                    </span>
                    ? This action cannot be undone.
                </p>
                {error ? (
                    <p className="confirm-delete-error">{error}</p>
                ) : null}
                <div className="confirm-delete-actions">
                    <button
                        type="button"
                        className="confirm-btn cancel"
                        onClick={onCancel}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="confirm-btn delete"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
