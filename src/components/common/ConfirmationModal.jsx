import PropTypes from 'prop-types';

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  confirmLoadingText = 'Working...',
  isConfirmLoading = false,
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-blue-500 hover:bg-blue-600',
  cancelButtonClass = 'bg-gray-500 hover:bg-gray-600'
}) => {
  if (!isOpen) return null;

  const messages = Array.isArray(message) ? message : [message];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-700 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        {title && (
          <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
        )}
        <div className="mb-6 text-white space-y-4">
          {messages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            className={`px-4 py-2 text-white rounded ${cancelButtonClass} ${
              isConfirmLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            onClick={onCancel}
            disabled={isConfirmLoading}
          >
            {cancelText}
          </button>
          <button
            className={`px-4 py-2 text-white rounded inline-flex items-center gap-2 ${confirmButtonClass} ${
              isConfirmLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            onClick={onConfirm}
            disabled={isConfirmLoading}
          >
            {isConfirmLoading && (
              <span
                className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                aria-hidden="true"
              />
            )}
            <span>{isConfirmLoading ? confirmLoadingText : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]),
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  confirmText: PropTypes.string,
  confirmLoadingText: PropTypes.string,
  isConfirmLoading: PropTypes.bool,
  cancelText: PropTypes.string,
  confirmButtonClass: PropTypes.string,
  cancelButtonClass: PropTypes.string,
};

export default ConfirmationModal;
