import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SidebarItem = ({ item, level, expandedNodes, onToggle }) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isExpanded = expandedNodes.has(item.id);
    const rowPaddingLeft = `${0.2 + (level * 0.95)}rem`;

    return (
        <li className="sidebar-item" data-level={level}>
            <div className="sidebar-row" style={{ paddingLeft: rowPaddingLeft }}>
                {hasChildren ? (
                    <button
                        type="button"
                        className="caret-button"
                        aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        aria-expanded={isExpanded}
                        onClick={() => onToggle(item.id)}
                    >
                        <span className={`caret ${isExpanded ? 'caret-open' : ''}`} />
                    </button>
                ) : (
                    <span className="caret-placeholder" />
                )}

                {item.to ? (
                    <Link className="menu-link" to={item.to}>
                        {item.label}
                    </Link>
                ) : (
                    <button type="button" className="menu-link">
                        {item.label}
                    </button>
                )}
            </div>

            {hasChildren && isExpanded ? (
                <ul className="sidebar-list nested-list">
                    {item.children.map((childItem) => (
                        <SidebarItem
                            key={childItem.id}
                            item={childItem}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                        />
                    ))}
                </ul>
            ) : null}
        </li>
    );
};

const SidebarMenu = ({ title, menuItems }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('accessTokenExpiresAtUtc');
        localStorage.removeItem('playerId');
        localStorage.removeItem('username');
        sessionStorage.clear();
        window.dispatchEvent(new Event('auth-changed'));
        navigate('/login', { replace: true });
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes((currentExpandedNodes) => {
            const nextExpandedNodes = new Set(currentExpandedNodes);

            if (nextExpandedNodes.has(nodeId)) {
                nextExpandedNodes.delete(nodeId);
            } else {
                nextExpandedNodes.add(nodeId);
            }

            return nextExpandedNodes;
        });
    };

    return (
        <aside className="home-sidebar" aria-label="Main navigation">
            <header className="sidebar-header">
                <h1>{title}</h1>
            </header>

            <nav className="sidebar-nav">
                <ul className="sidebar-list root-list">
                    {menuItems.map((rootItem) => (
                        <SidebarItem
                            key={rootItem.id}
                            item={rootItem}
                            level={0}
                            expandedNodes={expandedNodes}
                            onToggle={toggleNode}
                        />
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button type="button" className="sidebar-logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default SidebarMenu;
