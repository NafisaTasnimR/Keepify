import React, { useState } from 'react';
import './CsvUploadModal.css';

const CsvUploadModal = ({ isOpen, onClose, onUploaded }) => {
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleFileChange = (e) => {
        setFile(e.target.files[0] || null);
        setResult(null);
        setError('');
        setProgress(0);
    };

    const handleUpload = () => {
        if (!file) {
            setError('Please choose a CSV file first.');
            return;
        }

        setIsUploading(true);
        setError('');
        setResult(null);
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/orders/upload-csv');
        const token = localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            setIsUploading(false);
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                setResult(data);
                setProgress(100);
                if (onUploaded) {
                    onUploaded();
                }
            } else {
                setError('Upload failed. Please check the file and try again.');
            }
        };

        xhr.onerror = () => {
            setIsUploading(false);
            setError('Upload failed. Please check your connection and try again.');
        };

        xhr.send(formData);
    };

    const handleClose = () => {
        if (isUploading) {
            return;
        }
        setFile(null);
        setProgress(0);
        setResult(null);
        setError('');
        onClose();
    };

    return (
        <div className="csv-upload-overlay" role="dialog" aria-modal="true">
            <div className="csv-upload-container">
                <h2 className="csv-upload-title">Upload orders CSV</h2>
                <p className="csv-upload-text">
                    Columns: customer_id, product_id, quantity, amount, order_date, status
                </p>

                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="csv-file-input"
                />

                {isUploading || progress > 0 ? (
                    <div className="csv-progress-track">
                        <div className="csv-progress-fill" style={{ width: `${progress}%` }} />
                        <span className="csv-progress-label">{progress}%</span>
                    </div>
                ) : null}

                {error ? <p className="csv-upload-error">{error}</p> : null}

                {result ? (
                    <div className="csv-upload-result">
                        <p>
                            Imported <strong>{result.imported}</strong>, failed{' '}
                            <strong>{result.failed}</strong>
                        </p>
                        {result.errors?.length ? (
                            <ul className="csv-upload-error-list">
                                {result.errors.slice(0, 5).map((e, i) => (
                                    <li key={i}>
                                        Row {e.row}: {e.message}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                <div className="csv-upload-actions">
                    <button
                        type="button"
                        className="confirm-btn cancel"
                        onClick={handleClose}
                        disabled={isUploading}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        className="confirm-btn upload"
                        onClick={handleUpload}
                        disabled={isUploading || !file}
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CsvUploadModal;
