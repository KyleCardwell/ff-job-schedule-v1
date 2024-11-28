import React from "react";
import { useSelector } from "react-redux";

const BuilderLegend = () => {
	const employees = useSelector((state) => state.builders.employees);

	return (
		<div
			className="flex flex-wrap justify-start text-sm"
			style={{
				printColorAdjust: "exact",
				WebkitPrintColorAdjust: "exact",
				MozPrintColorAdjust: "exact",
			}}
		>
			{employees.map((employee) => (
				<div key={employee.employee_id} className="flex items-center mt-[5px] mr-5">
					<div
						className="w-[15px] h-[15px] mr-[5px] border border-black"
						style={{
							backgroundColor: employee.employee_color,
							printColorAdjust: "exact",
							WebkitPrintColorAdjust: "exact",
							MozPrintColorAdjust: "exact",
						}}
					></div>
					<span>{employee.employee_name}</span>
				</div>
			))}
		</div>
	);
};

export default BuilderLegend;
