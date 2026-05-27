import React, { useEffect, useState } from 'react';
import ProductPage from './ProductPage';
import ProductDetailsPage from './ProductDetailsPage';
import AddProductPage from './AddProductPage';

const formatPriceLabel = (value, currencySymbol = '$') => {
    const amount = Number(value);
    if (Number.isNaN(amount)) {
        return `${currencySymbol}0`;
    }

    return Number.isInteger(amount)
        ? `${currencySymbol}${amount}`
        : `${currencySymbol}${amount.toFixed(2)}`;
};

const normalizeProduct = (product) => {
    const stockValue = Number(product.stock ?? 0);
    const priceValue = Number(product.price ?? 0);
    const safeName = product.name || 'Untitled product';
    const safeCategory = product.category || 'Uncategorized';

    return {
        id: product.id,
        name: safeName,
        sku: product.sku ?? null,
        description: product.description ?? '',
        price: Number.isNaN(priceValue) ? 0 : priceValue,
        priceLabel: formatPriceLabel(priceValue),
        currency: product.currency ?? 'dollar',
        stock: Number.isNaN(stockValue) ? 0 : stockValue,
        stockLevel: Number.isNaN(stockValue) || stockValue >= 50 ? 'normal' : 'low',
        unitsSold: product.unitsSold ?? 0,
        performance: product.performance ?? '0%',
        performanceType: product.performanceType ?? 'neutral',
        category: safeCategory,
        status: product.status ?? 'active',
        imageUrl: product.imageUrl ?? null,
        imagePreview: product.imagePreview ?? product.imageUrl ?? null,
    };
};

const ProductsView = () => {
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProductIndex, setEditingProductIndex] = useState(null);
    const [productViewMode, setProductViewMode] = useState('list');
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState('');

    const fetchProducts = async () => {
        setProductsLoading(true);
        setProductsError('');

        try {
            const response = await fetch('/api/products?limit=100');
            if (!response.ok) {
                throw new Error('Failed to load products');
            }

            const data = await response.json();
            const items = Array.isArray(data.items) ? data.items : [];
            setProducts(items.map(normalizeProduct));
        } catch (error) {
            setProducts([]);
            setProductsError('Unable to load products right now.');
        } finally {
            setProductsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const getCategories = () => {
        return [...new Set(products.map(p => p.category).filter(Boolean))];
    };

    const handleAddProduct = () => {
        setEditingProductIndex(null);
        setProductsError('');
        setShowProductForm(true);
    };

    const handleEditProduct = (index) => {
        setEditingProductIndex(index);
        setProductsError('');
        setShowProductForm(true);
    };

    const handleSaveProduct = async (formData) => {
        const payload = {
            name: formData.name?.trim(),
            sku: formData.sku?.trim(),
            price: Number(formData.price) || 0,
            stock: Number(formData.stock) || 0,
            category: (formData.newCategory || formData.category || '').trim() || null,
            status: formData.status || 'active',
            imageUrl: formData.imagePreview || null,
        };

        setProductsError('');

        try {
            if (editingProductIndex !== null) {
                const existing = products[editingProductIndex];
                if (existing?.id) {
                    const response = await fetch(`/api/products/${existing.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update product');
                    }

                    const updated = normalizeProduct(await response.json());
                    setProducts(prev =>
                        prev.map((item, index) => (index === editingProductIndex ? updated : item))
                    );
                } else {
                    setProducts(prev => {
                        const updated = [...prev];
                        updated[editingProductIndex] = normalizeProduct({
                            ...existing,
                            ...payload,
                        });
                        return updated;
                    });
                }
            } else {
                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('Failed to create product');
                }

                const created = normalizeProduct(await response.json());
                setProducts(prev => [created, ...prev]);
            }

            setShowProductForm(false);
            setEditingProductIndex(null);
        } catch (error) {
            setProductsError('Unable to save product right now.');
        }
    };

    const handleCancelForm = () => {
        setShowProductForm(false);
        setEditingProductIndex(null);
    };

    return (
        <>
            {productViewMode === 'card' ? (
                <ProductDetailsPage
                    products={products}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    viewMode={productViewMode}
                    onViewModeChange={setProductViewMode}
                    isLoading={productsLoading}
                    error={productsError}
                />
            ) : (
                <ProductPage
                    products={products}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    viewMode={productViewMode}
                    onViewModeChange={setProductViewMode}
                    isLoading={productsLoading}
                    error={productsError}
                />
            )}
            {showProductForm && (
                <AddProductPage
                    product={editingProductIndex !== null ? products[editingProductIndex] : null}
                    categories={getCategories()}
                    onSave={handleSaveProduct}
                    onCancel={handleCancelForm}
                    isEditing={editingProductIndex !== null}
                />
            )}
        </>
    );
};

export default ProductsView;
