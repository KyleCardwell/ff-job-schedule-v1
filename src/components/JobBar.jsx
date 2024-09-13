// import React from "react";

// const JobBar = ({ job }) => {
// 	return (
// 		<div
// 			style={{ backgroundColor: job.builderColor, width: job.duration * 10 }}
// 		>
// 			{job.jobName}
// 		</div>
// 	);
// };

// export default JobBar;

import React from "react";
import { useDrag } from "react-dnd";

const JobBar = ({ job, onDrop }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "JOB",
    item: { id: job.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        backgroundColor: job.builderColor,
        width: job.duration * 10, // adjust width based on job duration
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {job.jobName}
    </div>
  );
};

export default JobBar;
