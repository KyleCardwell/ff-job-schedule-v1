import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../utils/dateUtils";
import { addDays, subWeeks, addSeconds } from "date-fns";

const baseCreatedAt = subWeeks(new Date(), 140);

export const completedJobs = [
	{
		project_id: uuidv4(),
		project_name: "Trimble",
		project_completed_at: normalizeDate("2022-01-11"),
		rooms: [
			{
				task_id: uuidv4(),
				task_number: "687",
				task_name: "Kitchen Island",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "688",
				task_name: "Pantry",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "689",
				task_name: "Laundry",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "690",
				task_name: "Laundry Island",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "691",
				task_name: "Mud Room",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "692",
				task_name: "Master Bath Vanities",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
		],
	},
	{
		project_id: uuidv4(),
		project_name: "Grossman",
		project_completed_at: normalizeDate("2022-01-11"),
		rooms: [
			{
				task_id: uuidv4(),
				task_number: "813",
				task_name: "Kitchen",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "814",
				task_name: "Master Bath",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "815",
				task_name: "Master Fireplace",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				task_id: uuidv4(),
				task_number: "816",
				task_name: "Powder Bath",
				task_active: true,
				task_created_at: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
		],
	},
];
