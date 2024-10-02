import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../utils/helpers";

export const newJobs = [
	{
		id: uuidv4(),
		name: "Peterson",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-05"),
				duration: 14.9,
				jobNumber: "803",
				name: "Hall Storage Reface",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate(new Date("2024-09-04")),
				duration: 11.61,
				jobNumber: "876",
				name: "Garage Niche",
				active: true,
			},
		],
	},
	{
		id: uuidv4(),
		name: "Johnson",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-09"),
				duration: 45.52,
				jobNumber: "884",
				name: "Scullery",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-17"),
				duration: 33.74,
				jobNumber: "885",
				name: "Laundry",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-23"),
				duration: 38.86,
				jobNumber: "887",
				name: "Master Bath",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-30"),
				duration: 126.68,
				jobNumber: "888",
				name: "Master Closet",
				active: true,
			},
		],
	},
];
