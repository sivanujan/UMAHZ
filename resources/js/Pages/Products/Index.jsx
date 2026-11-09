import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassButton } from '@/Components/UI/GlassButton';
import {
    Package,
    Plus,
    Search,
    Filter,
    AlertTriangle,
    Edit2,
    Archive,
    Layers,
    DollarSign,
    Boxes,
    ArrowUpDown,
    Check,
    X,
    Upload,
    ImageIcon,
    TrendingDown,
    TrendingUp,
    ShieldAlert,
} from 'lucide-react';

export default function ProductsIndex({
    products = [],
    categories = [],
    categoryMap = {},
    canManage = false,
    stats = {},
    filters = {},
    currency = 'CAD',
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [stockFilter, setStockFilter] = useState(filters.stock_status || 'all');

    // Modals
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [stockProduct, setStockProduct] = useState(null);
    const [archiveConfirmProduct, setArchiveConfirmProduct] = useState(null);

    // Filter handling
    const handleFilterChange = (newOverrides = {}) => {
        const query = {
            search: newOverrides.search !== undefined ? newOverrides.search : search,
            category: newOverrides.category !== undefined ? newOverrides.category : selectedCategory,
            stock_status: newOverrides.stock_status !== undefined ? newOverrides.stock_status : stockFilter,
        };

        if (!query.search) delete query.search;
        if (query.category === 'all') delete query.category;
        if (query.stock_status === 'all') delete query.stock_status;

        router.get('/app/products', query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleFilterChange({ search });
        }
    };

    // Open create modal
    const openCreateModal = () => {
        setEditingProduct(null);
        setProductModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (product) => {
        setEditingProduct(product);
        setProductModalOpen(true);
    };

    // Open stock modal
    const openStockModal = (product) => {
        setStockProduct(product);
        setStockModalOpen(true);
    };

    // Handle archive
    const handleArchive = (product) => {
        router.delete(`/app/products/${product.id}`, {
            preserveScroll: true,
            onSuccess: () => setArchiveConfirmProduct(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Products & Inventory" />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <PageHeader
                        title="Products & Supplies"
                        description="Manage herbs, clinical supplies, and items sold directly to clients."
                    />

                    {canManage && (
                        <div className="flex items-center gap-3">
                            <GlassButton
                                variant="primary"
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Product</span>
                            </GlassButton>
                        </div>
                    )}
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</p>
                            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{stats.total_products ?? 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <Package className="w-5 h-5" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
                            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.low_stock_count ?? 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Units In Stock</p>
                            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{stats.total_units ?? 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <Boxes className="w-5 h-5" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory value (retail price)</p>
                            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.inventory_value ?? '$0.00'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </GlassCard>
                </div>

                {/* Filters & Search */}
                <GlassCard className="p-4 space-y-3">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search by name, SKU, or description… (press Enter)"
                                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        handleFilterChange({ search: '' });
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Category Dropdown */}
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    handleFilterChange({ category: e.target.value });
                                }}
                                className="text-xs py-2 px-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {categoryMap[cat] ?? ucfirst(cat)}
                                    </option>
                                ))}
                            </select>

                            {/* Stock Filter Dropdown */}
                            <select
                                value={stockFilter}
                                onChange={(e) => {
                                    setStockFilter(e.target.value);
                                    handleFilterChange({ stock_status: e.target.value });
                                }}
                                className="text-xs py-2 px-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="all">All Stock Levels</option>
                                <option value="low">Low Stock Only</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* Products Table */}
                <GlassCard className="overflow-hidden">
                    {products.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No products found</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {search || selectedCategory !== 'all' || stockFilter !== 'all'
                                    ? 'No products match your search or filter criteria.'
                                    : 'Add herbs, tape, massage supplies, or equipment to quickly bill clients and track inventory.'}
                            </p>
                            {canManage && (
                                <GlassButton
                                    variant="primary"
                                    onClick={openCreateModal}
                                    className="mt-4 text-xs"
                                >
                                    Add First Product
                                </GlassButton>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/50 dark:bg-slate-900/40">
                                        <th className="py-3 px-4">Product</th>
                                        <th className="py-3 px-4">Category</th>
                                        <th className="py-3 px-4">Unit Price</th>
                                        <th className="py-3 px-4">Tax</th>
                                        <th className="py-3 px-4">Stock Level</th>
                                        <th className="py-3 px-4">Status</th>
                                        {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {products.map((product) => (
                                        <tr
                                            key={product.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            {/* Product Image & Info */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center shrink-0">
                                                            <Package className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-slate-100">
                                                            {product.name}
                                                        </p>
                                                        {product.sku && (
                                                            <p className="text-[11px] font-mono text-slate-400">
                                                                SKU: {product.sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                <span className="inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {product.category_label}
                                                </span>
                                            </td>

                                            {/* Price */}
                                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                                                {product.formatted_price}
                                            </td>

                                            {/* Tax */}
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                {product.taxable ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                                        Taxable ({product.tax_rate ?? 0}%)
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Exempt</span>
                                                )}
                                            </td>

                                            {/* Stock */}
                                            <td className="py-3.5 px-4">
                                                {product.track_inventory ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`font-bold ${
                                                                    product.stock_quantity <= 0
                                                                        ? 'text-rose-600 dark:text-rose-400'
                                                                        : product.is_low_stock
                                                                        ? 'text-amber-600 dark:text-amber-400'
                                                                        : 'text-slate-800 dark:text-slate-200'
                                                                }`}
                                                            >
                                                                {product.stock_quantity ?? 0} in stock
                                                            </span>
                                                            {product.is_low_stock && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                                    Low Stock
                                                                </span>
                                                            )}
                                                            {product.stock_quantity <= 0 && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                                                    Out
                                                                </span>
                                                            )}
                                                        </div>
                                                        {product.low_stock_threshold !== null && (
                                                            <p className="text-[10px] text-slate-400">
                                                                Alert at ≤ {product.low_stock_threshold}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">Not tracked</span>
                                                )}
                                            </td>

                                            {/* Active */}
                                            <td className="py-3.5 px-4">
                                                {product.active ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            {canManage && (
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {product.track_inventory && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openStockModal(product)}
                                                                title="Adjust Stock"
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                            >
                                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(product)}
                                                            title="Edit Product"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setArchiveConfirmProduct(product)}
                                                            title="Archive Product"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                                        >
                                                            <Archive className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Product Modal (Create & Edit) */}
            {productModalOpen && (
                <ProductFormModal
                    isOpen={productModalOpen}
                    onClose={() => setProductModalOpen(false)}
                    product={editingProduct}
                    categories={categories}
                    categoryMap={categoryMap}
                    currency={currency}
                />
            )}

            {/* Stock Adjustment Modal */}
            {stockModalOpen && stockProduct && (
                <StockAdjustmentModal
                    isOpen={stockModalOpen}
                    onClose={() => {
                        setStockModalOpen(false);
                        setStockProduct(null);
                    }}
                    product={stockProduct}
                />
            )}

            {/* Archive Confirmation Modal */}
            {archiveConfirmProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                                <Archive className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Archive Product?
                            </h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Are you sure you want to archive <strong>{archiveConfirmProduct.name}</strong>? It will no longer be available for new invoices. Existing historical invoices will not be affected.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setArchiveConfirmProduct(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleArchive(archiveConfirmProduct)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition"
                            >
                                Archive Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

function ucfirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Product Create / Edit Modal
 */
function ProductFormModal({ isOpen, onClose, product = null, categories = [], categoryMap = {}, currency = 'CAD' }) {
    const isEdit = Boolean(product);

    const { data, setData, post, processing, errors } = useForm({
        name: product?.name || '',
        sku: product?.sku || '',
        category: product?.category || 'herbs',
        description: product?.description || '',
        unit_price: product?.price_dollars || '',
        taxable: product ? product.taxable : true,
        tax_rate: product?.tax_rate !== null && product?.tax_rate !== undefined ? String(product.tax_rate) : '13.00',
        track_inventory: product ? product.track_inventory : false,
        stock_quantity: product?.stock_quantity !== null && product?.stock_quantity !== undefined ? String(product.stock_quantity) : '0',
        low_stock_threshold: product?.low_stock_threshold !== null && product?.low_stock_threshold !== undefined ? String(product.low_stock_threshold) : '5',
        image: null,
        remove_image: false,
        active: product ? product.active : true,
    });

    const [imagePreview, setImagePreview] = useState(product?.image_url || null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setData('remove_image', false);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setData('image', null);
        setData('remove_image', true);
        setImagePreview(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isEdit) {
            post(`/app/products/${product.id}`, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        } else {
            post('/app/products', {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-5 my-8">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {isEdit ? `Edit Product: ${product.name}` : 'New Clinic Product'}
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Configure product pricing, tax rate, and inventory tracking.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Product Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Acupuncture Herbal Tea, Massage Oil 250ml"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                                required
                            />
                            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                SKU / Code (Optional)
                            </label>
                            <input
                                type="text"
                                value={data.sku}
                                onChange={(e) => setData('sku', e.target.value)}
                                placeholder="e.g. HERB-001"
                                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 font-mono"
                            />
                            {errors.sku && <p className="text-[11px] text-rose-500 mt-1">{errors.sku}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Category
                            </label>
                            <select
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                            >
                                <option value="herbs">Herbs & Formulas</option>
                                <option value="oils">Massage Oils & Lotions</option>
                                <option value="tape">Kinesiology Tape</option>
                                <option value="equipment">Clinical & Rehab Equipment</option>
                                <option value="apparel">Apparel & Uniforms</option>
                                <option value="supplements">Nutritional Supplements</option>
                                <option value="other">Other Supplies</option>
                            </select>
                        </div>
                    </div>

                    {/* Pricing & Tax */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Unit Price ({currency}) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.unit_price}
                                        onChange={(e) => setData('unit_price', e.target.value)}
                                        placeholder="24.99"
                                        className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-violet-500"
                                        required
                                    />
                                </div>
                                {errors.unit_price && <p className="text-[11px] text-rose-500 mt-1">{errors.unit_price}</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Sales Tax
                                    </label>
                                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={data.taxable}
                                            onChange={(e) => setData('taxable', e.target.checked)}
                                            className="rounded text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">Taxable</span>
                                    </label>
                                </div>
                                {data.taxable ? (
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={data.tax_rate}
                                            onChange={(e) => setData('tax_rate', e.target.value)}
                                            placeholder="13.00"
                                            className="w-full pl-3 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                                    </div>
                                ) : (
                                    <p className="text-xs py-2 text-slate-400 italic">No sales tax applied (exempt)</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Inventory Tracking */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Track Inventory
                            </span>
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={data.track_inventory}
                                    onChange={(e) => setData('track_inventory', e.target.checked)}
                                    className="rounded text-violet-600 focus:ring-violet-500"
                                />
                                <span className="text-slate-600 dark:text-slate-400 text-xs">
                                    {data.track_inventory ? 'Enabled' : 'Disabled'}
                                </span>
                            </label>
                        </div>

                        {data.track_inventory && (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        {isEdit ? 'Current Stock' : 'Initial Stock Quantity'}
                                    </label>
                                    <input
                                        type="number"
                                        value={data.stock_quantity}
                                        onChange={(e) => setData('stock_quantity', e.target.value)}
                                        disabled={isEdit}
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
                                    />
                                    {isEdit && (
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Use "Adjust Stock" on the table to log manual changes.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Low Stock Alert Threshold
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.low_stock_threshold}
                                        onChange={(e) => setData('low_stock_threshold', e.target.value)}
                                        placeholder="5"
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Product Image (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                            {imagePreview ? (
                                <div className="relative group w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute inset-0 bg-slate-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                            )}

                            <label className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            rows="2"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Usage notes, dosage instructions, or specifications…"
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition disabled:opacity-60"
                        >
                            {isEdit ? 'Save Changes' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Stock Adjustment Modal
 */
function StockAdjustmentModal({ isOpen, onClose, product }) {
    const { data, setData, post, processing, errors } = useForm({
        change: '',
        reason: 'restock',
        notes: '',
    });

    const parsedChange = parseInt(data.change, 10) || 0;
    const currentStock = product.stock_quantity ?? 0;
    const newCalculatedStock = currentStock + parsedChange;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(`/app/products/${product.id}/adjust-stock`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Adjust Stock: {product.name}
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Stock overview */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-center">
                        <div>
                            <p className="text-[11px] text-slate-500 uppercase font-semibold">Current Stock</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{currentStock}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 uppercase font-semibold">New Stock</p>
                            <p className={`text-lg font-bold ${newCalculatedStock < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {newCalculatedStock}
                            </p>
                        </div>
                    </div>

                    {newCalculatedStock < 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <span>Warning: This adjustment will result in negative stock. You can still continue if this is an inventory count correction.</span>
                        </div>
                    )}

                    {/* Change input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Quantity Change (+ or -) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={data.change}
                            onChange={(e) => setData('change', e.target.value)}
                            placeholder="e.g. 10 to add, -2 to remove"
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-violet-500"
                            required
                        />
                        {errors.change && <p className="text-[11px] text-rose-500 mt-1">{errors.change}</p>}
                    </div>

                    {/* Reason select */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Adjustment <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="restock">Restock / New Shipment Received</option>
                            <option value="physical_count">Physical Inventory Count Correction</option>
                            <option value="damage">Damaged or Expired Goods</option>
                            <option value="return">Customer Return</option>
                            <option value="internal_use">Used Internally in Clinic</option>
                            <option value="other">Other Manual Adjustment</option>
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Notes / Reference (Optional)
                        </label>
                        <input
                            type="text"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="e.g. PO #10842 or quarterly count"
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.change || parsedChange === 0}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition disabled:opacity-50"
                        >
                            Confirm Stock Adjustment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

