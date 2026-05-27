import React from 'react';
import './ProductDetailsPage.css';

const ProductDetailsPage = ({
    products,
    onAddProduct,
    onEditProduct,
    onDeleteProduct,
    viewMode = 'card',
    onViewModeChange,
    isLoading = false,
    error = '',
}) => {
    const hasProducts = products.length > 0;

    return (
        <div className="product-details-page">
            <div className="product-details-toolbar">
                <div className="product-details-toolbar-left">
                    <div className="view-toggle-buttons">
                        <button
                            type="button"
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => onViewModeChange('list')}
                            title="List view"
                        >
                            List
                        </button>
                        <button
                            type="button"
                            className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
                            onClick={() => onViewModeChange('card')}
                            title="Card view"
                        >
                            Card
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    className="add-product-button"
                    onClick={onAddProduct}
                >
                    Add product
                </button>
            </div>

            {isLoading ? (
                <div className="card empty-state">
                    <p className="empty-state-title">Loading products</p>
                    <p className="empty-state-text">Please wait while we fetch your data.</p>
                </div>
            ) : error ? (
                <div className="card empty-state error">
                    <p className="empty-state-title">Unable to load products</p>
                    <p className="empty-state-text">{error}</p>
                </div>
            ) : !hasProducts ? (
                <div className="card empty-state">
                    <p className="empty-state-title">No products yet</p>
                    <p className="empty-state-text">Add your first product to get started.</p>
                    <div className="empty-state-actions">
                        <button
                            type="button"
                            className="add-product-button"
                            onClick={onAddProduct}
                        >
                            Add product
                        </button>
                    </div>
                </div>
            ) : (
                <div className="products-card-grid">
                    {products.map((product, i) => (
                        <div key={product.id ?? i} className="product-card">
                            <div className="product-image-section">
                                {product.imagePreview || product.imageUrl ? (
                                    <img
                                        src={product.imagePreview || product.imageUrl}
                                        alt={product.name}
                                    />
                                ) : (
                                    <div className="no-image-placeholder">No image</div>
                                )}
                            </div>

                            <div className="product-info-section">
                                <div className="product-header">
                                    <h3 className="product-name">{product.name}</h3>
                                    <p className="product-category">{product.category}</p>
                                </div>

                                <div className="product-price">
                                    {product.priceLabel ?? product.price}
                                </div>

                                <div className="product-details-list">
                                    <div className="detail-item">
                                        <span className="detail-label">Stock:</span>
                                        <span className={`stock-status ${product.stockLevel}`}>
                                            {product.stock}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Units Sold:</span>
                                        <span className="detail-value">{product.unitsSold}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Performance:</span>
                                        <span className={`performance-badge ${product.performanceType}`}>
                                            {product.performance}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="product-card-actions">
                                <button
                                    type="button"
                                    className="card-btn"
                                    onClick={() => onEditProduct(i)}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    className="card-btn card-btn--danger"
                                    onClick={() => onDeleteProduct(i)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductDetailsPage;
