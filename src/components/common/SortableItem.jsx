import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiMenu } from 'react-icons/fi';

const SortableItem = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center bg-gray-100 p-2 my-1 rounded-md shadow-sm">
      <button {...listeners} className="cursor-grab p-2">
        <FiMenu />
      </button>
      <div className="flex-grow ml-2">{props.children}</div>
    </div>
  );
} 

export default SortableItem;
