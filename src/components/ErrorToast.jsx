import React, { useEffect } from 'react';
import './ErrorToast.css';

const ErrorToast = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 10000); // Auto-close after 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="error-toast">
            <span>{message}</span>
            <button onClick={onClose}>×</button>
        </div>
    );
};

export default ErrorToast;