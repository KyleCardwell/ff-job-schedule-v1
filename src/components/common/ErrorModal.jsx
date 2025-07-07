import PropTypes from 'prop-types';

const ErrorModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-700 p-4 rounded-lg shadow-lg max-w-md">
        <p className="mb-4 text-white">{message}</p>
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onClose}
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
};

ErrorModal.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func,
};

export default ErrorModal;
