import React from 'react';
import './ProductPage.css';

const ProductPage = ({
    products,
    onAddProduct,
    onEditProduct,
    viewMode = 'list',
    onViewModeChange,
    isLoading = false,
    error = '',
}) => {
    const hasProducts = products.length > 0;

    return (
        <div className="products-page">
            <div className="products-toolbar">
                <div className="products-toolbar-left">
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
                <div className="card products-card">
                    <table className="products-page-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Units sold</th>
                                <th>Performance</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, i) => (
                                <tr key={product.id ?? i}>
                                    <td>{product.name}</td>
                                    <td>{product.category}</td>
                                    <td>{product.priceLabel ?? product.price}</td>
                                    <td className={`stock ${product.stockLevel}`}>
                                        {product.stock}
                                    </td>
                                    <td>{product.unitsSold}</td>
                                    <td>
                                        <span className={`trend ${product.performanceType}`}>
                                            {product.performance}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="edit-product-btn"
                                            onClick={() => onEditProduct(i)}
                                            title="Edit product"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProductPage;
