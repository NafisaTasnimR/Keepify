import React from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    BarChart3,
    Sparkles,
    Send,
    Package,
    Settings as SettingsIcon,
    Circle,
} from 'lucide-react';
import './Sidebar.css';

// Maps a nav item's key/label to an icon. Falls back to a plain dot
// so a new section never renders with a missing icon.
const ICON_MAP = {
    dashboard: LayoutDashboard,
    orders: ShoppingCart,
    customers: Users,
    analytics: BarChart3,
    aiinsights: Sparkles,
    outreach: Send,
    products: Package,
    settings: SettingsIcon,
};

const getIcon = item => {
    const normalizedKey = String(item.key ?? item.label ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    return ICON_MAP[normalizedKey] || Circle;
};

const Sidebar = ({
    activeMenu,
    onSelect,
    navSections,
    isOpen = false,
    onClose = () => { },
}) => (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="logo">
            <div className="logo-row">
                <h2>Keepify</h2>
                <button
                    type="button"
                    className="sidebar-close"
                    onClick={onClose}
                    aria-label="Close navigation"
                >
                    Close
                </button>
            </div>
            <p className="logo-sub">Analytics dashboard</p>
        </div>

        <nav className="nav-sections">
            {navSections.map(section => (
                <div key={section.title} className="nav-section">
                    <h3 className="nav-title">{section.title}</h3>
                    <ul className="nav-menu">
                        {section.items.map(item => {
                            const Icon = getIcon(item);
                            const isActive = activeMenu === item.key;
                            return (
                                <li
                                    key={item.key}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    onClick={() => onSelect(item.key)}
                                >
                                    <span className="nav-icon" aria-hidden="true">
                                        <Icon size={16} strokeWidth={isActive ? 2.25 : 1.9} />
                                    </span>
                                    <span className="nav-label">{item.label}</span>
                                    {item.badge && (
                                        <span className="nav-badge">{item.badge}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    </aside>
);

export default Sidebar;