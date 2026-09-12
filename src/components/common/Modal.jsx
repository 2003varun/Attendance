// Reusable Modal Component
import React, { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = "720px" }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop open" onClick={onClose}>
            <div 
                className="modal-content" 
                style={{ maxWidth }} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        <h3 style={{ fontSize: "17px", fontWeight: 800 }}>{title}</h3>
                        {subtitle && <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>{subtitle}</p>}
                    </div>
                    <button className="btn btn-default btn-icon" onClick={onClose} title="Close">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
