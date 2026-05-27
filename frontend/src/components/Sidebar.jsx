import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeMenu, onSelect, navSections }) => (
    <aside className="sidebar">
        <div className="logo">
            <h2>ChurnSense</h2>
            <p className="logo-sub">Analytics dashboard</p>
        </div>

        <nav className="nav-sections">
            {navSections.map(section => (
                <div key={section.title} className="nav-section">
                    <h3 className="nav-title">{section.title}</h3>
                    <ul className="nav-menu">
                        {section.items.map(item => (
                            <li
                                key={item.key}
                                className={`nav-item ${activeMenu === item.key ? 'active' : ''}`}
                                onClick={() => onSelect(item.key)}
                            >
                                {item.label}
                                {item.badge && (
                                    <span className="nav-badge">{item.badge}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    </aside>
);

export default Sidebar;
