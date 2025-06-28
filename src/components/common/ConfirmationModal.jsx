import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-blue-500 hover:bg-blue-600',
  cancelButtonClass = 'bg-gray-500 hover:bg-gray-600'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-700 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        {title && (
          <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
        )}
        <p className="mb-6 text-white">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            className={`px-4 py-2 text-white rounded ${cancelButtonClass}`}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`px-4 py-2 text-white rounded ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
