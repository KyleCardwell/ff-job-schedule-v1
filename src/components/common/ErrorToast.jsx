import PropTypes from 'prop-types';
import { useEffect } from 'react';
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

ErrorToast.propTypes = {
    message: PropTypes.string,
    onClose: PropTypes.func,
};

export default ErrorToast;