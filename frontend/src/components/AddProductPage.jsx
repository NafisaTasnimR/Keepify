import React, { useState } from 'react';
import './AddProductPage.css';

const AddProductPage = ({
    product = null,
    categories = [],
    onSave,
    onCancel,
    isEditing = false,
}) => {
    const [formData, setFormData] = useState(
        product || {
            name: '',
            description: '',
            price: '',
            currency: 'taka',
            stock: '',
            category: '',
            newCategory: '',
            status: 'active',
            image: null,
            imagePreview: null,
        }
    );

    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    image: file,
                    imagePreview: reader.result,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        if (value === 'add-new') {
            setShowNewCategoryInput(true);
            setFormData(prev => ({ ...prev, category: '' }));
        } else {
            setShowNewCategoryInput(false);
            setFormData(prev => ({ ...prev, category: value }));
        }
    };

    const handleAddCategory = (e) => {
        const newCat = e.target.value;
        setFormData(prev => ({
            ...prev,
            newCategory: newCat,
            category: newCat,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const finalCategory = showNewCategoryInput ? formData.newCategory : formData.category;

    return (
        <div className="add-product-overlay">
            <div className="add-product-container">
                <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>

                <form onSubmit={handleSubmit} className="add-product-form">
                    {/* Image Upload Section */}
                    <div className="form-section">
                        <label className="form-label">Product Image</label>
                        <div className="image-upload-area">
                            {formData.imagePreview ? (
                                <div className="image-preview">
                                    <img src={formData.imagePreview} alt="Preview" />
                                    <button
                                        type="button"
                                        className="remove-image-btn"
                                        onClick={() =>
                                            setFormData(prev => ({
                                                ...prev,
                                                image: null,
                                                imagePreview: null,
                                            }))
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <label className="image-upload-label">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        hidden
                                    />
                                    <div className="upload-placeholder">
                                        <p>Click to upload image</p>
                                        <span>(Optional)</span>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Product Name */}
                    <div className="form-section">
                        <label htmlFor="name" className="form-label">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                            placeholder="Enter product name"
                        />
                    </div>

                    {/* Product Description */}
                    <div className="form-section">
                        <label htmlFor="description" className="form-label">
                            Product Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="form-textarea"
                            placeholder="Enter product description"
                            rows="3"
                        />
                    </div>

                    {/* Price with Currency */}
                    <div className="form-row">
                        <div className="form-section">
                            <label htmlFor="price" className="form-label">
                                Price *
                            </label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                required
                                className="form-input"
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div className="form-section">
                            <label htmlFor="currency" className="form-label">
                                Currency
                            </label>
                            <select
                                id="currency"
                                name="currency"
                                value={formData.currency}
                                onChange={handleInputChange}
                                className="form-select"
                            >
                                <option value="taka">Taka (৳)</option>
                                <option value="dollar">Dollar ($)</option>
                            </select>
                        </div>
                    </div>

                    {/* Stock */}
                    <div className="form-section">
                        <label htmlFor="stock" className="form-label">
                            Stock Quantity *
                        </label>
                        <input
                            type="number"
                            id="stock"
                            name="stock"
                            value={formData.stock}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                            placeholder="0"
                            min="0"
                        />
                    </div>

                    {/* Category */}
                    <div className="form-section">
                        <label htmlFor="category" className="form-label">
                            Category *
                        </label>
                        {!showNewCategoryInput ? (
                            <select
                                id="category"
                                value={formData.category}
                                onChange={handleCategoryChange}
                                className="form-select"
                                required={!finalCategory}
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                                <option value="add-new">+ Add new category</option>
                            </select>
                        ) : (
                            <div className="new-category-input">
                                <input
                                    type="text"
                                    value={formData.newCategory}
                                    onChange={handleAddCategory}
                                    className="form-input"
                                    placeholder="Enter new category name"
                                    autoFocus
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewCategoryInput(false);
                                        setFormData(prev => ({
                                            ...prev,
                                            newCategory: '',
                                        }));
                                    }}
                                    className="cancel-category-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    <div className="form-section">
                        <label htmlFor="status" className="form-label">
                            Status
                        </label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="form-select"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    {/* Buttons */}
                    <div className="form-buttons">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn btn-cancel"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-save"
                        >
                            {isEditing ? 'Update Product' : 'Save Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductPage;
