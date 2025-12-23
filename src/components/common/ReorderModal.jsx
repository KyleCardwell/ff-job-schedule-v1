import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import SortableItem from './SortableItem.jsx';

const ReorderModal = ({ items: initialItems, open, onClose, onSave, title, idKey = 'id' }) => {
  const [items, setItems] = useState(initialItems);
  const itemName = idKey === 'est_task_id' ? 'est_task_name' : 'name';

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item[idKey] === active.id);
        const newIndex = items.findIndex((item) => item[idKey] === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    const orderedIds = items.map(item => item[idKey]);
    onSave(orderedIds);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title || 'Reorder Items'}</h2>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={items.map(i => i[idKey])} strategy={verticalListSortingStrategy}>
            <div className="max-h-144 overflow-y-auto pr-2">
              {items.map(item => (
                <SortableItem key={item[idKey]} id={item[idKey]}>
                  {item[itemName] || item[idKey]} 
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReorderModal;

ReorderModal.propTypes = {
  items: PropTypes.array.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  title: PropTypes.string,
  idKey: PropTypes.string,
};