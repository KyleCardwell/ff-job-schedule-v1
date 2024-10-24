import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../utils/dateUtils";
import { addDays, subWeeks, addSeconds } from "date-fns";

const baseCreatedAt = subWeeks(new Date(), 140);

export const completedJobs = [
	{
		id: uuidv4(),
		name: "Trimble",
		completedOn: normalizeDate("2022-01-11"),
		rooms: [
			{
				id: uuidv4(),
				jobNumber: "687",
				taskName: "Kitchen Island",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "688",
				taskName: "Pantry",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "689",
				taskName: "Laundry",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "690",
				taskName: "Laundry Island",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "691",
				taskName: "Mud Room",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "692",
				taskName: "Master Bath Vanities",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
		],
	},
	{
		id: uuidv4(),
		name: "Grossman",
		completedOn: normalizeDate("2022-01-11"),
		rooms: [
			{
				id: uuidv4(),
				jobNumber: "813",
				taskName: "Kitchen",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "814",
				taskName: "Master Bath",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "815",
				taskName: "Master Fireplace",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				jobNumber: "816",
				taskName: "Powder Bath",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
		],
	},
];
