import { addDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { getPreviousMonday } from "../utils/helpers";

const ogDate = getPreviousMonday("2024-09-16"); //Choose a Monday

export const newJobs = [
	{
		id: uuidv4(),
		name: "Frantzen",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 0),
				duration: 36,
				jobNumber: "234",
				name: "Kitchen",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 1),
				duration: 27,
				jobNumber: "235",
				name: "Living Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 2),
				duration: 6,
				jobNumber: "236",
				name: "Bathroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 7),
				duration: 64,
				jobNumber: "237",
				name: "Bedroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 7),
				duration: 7,
				jobNumber: "238",
				name: "Office",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 3),
				duration: 5,
				jobNumber: "239",
				name: "Garage",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 17),
				duration: 4,
				jobNumber: "240",
				name: "Dining Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 8),
				duration: 8,
				jobNumber: "241",
				name: "Laundry",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 4),
				duration: 94,
				jobNumber: "242",
				name: "Hallway",
				active: true,
			},
		],
	},
	{
		id: uuidv4(),
		name: "Potter",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 18),
				duration: 7,
				jobNumber: "243",
				name: "Kitchen",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 9),
				duration: 5,
				jobNumber: "244",
				name: "Living Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 22),
				duration: 4,
				jobNumber: "245",
				name: "Bathroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 19),
				duration: 8,
				jobNumber: "246",
				name: "Bedroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 10),
				duration: 6,
				jobNumber: "247",
				name: "Office",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 23),
				duration: 3,
				jobNumber: "248",
				name: "Garage",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 22),
				duration: 5,
				jobNumber: "249",
				name: "Dining Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 11),
				duration: 7,
				jobNumber: "250",
				name: "Laundry",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 24),
				duration: 6,
				jobNumber: "251",
				name: "Hallway",
				active: true,
			},
		],
	},
	{
		id: uuidv4(),
		name: "Benson",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 23),
				duration: 4,
				jobNumber: "252",
				name: "Kitchen",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 14),
				duration: 8,
				jobNumber: "253",
				name: "Living Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 25),
				duration: 5,
				jobNumber: "254",
				name: "Bathroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 24),
				duration: 7,
				jobNumber: "255",
				name: "Bedroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 16),
				duration: 6,
				jobNumber: "256",
				name: "Office",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 29),
				duration: 8,
				jobNumber: "257",
				name: "Garage",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 25),
				duration: 4,
				jobNumber: "258",
				name: "Dining Room",
				active: true,
			},
		],
	},
	{
		id: uuidv4(),
		name: "Perry",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 28),
				duration: 7,
				jobNumber: "243",
				name: "Kitchen",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 15),
				duration: 5,
				jobNumber: "244",
				name: "Living Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 28),
				duration: 4,
				jobNumber: "245",
				name: "Bathroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 29),
				duration: 8,
				jobNumber: "246",
				name: "Bedroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 22),
				duration: 6,
				jobNumber: "247",
				name: "Office",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 30),
				duration: 3,
				jobNumber: "248",
				name: "Garage",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 30),
				duration: 5,
				jobNumber: "249",
				name: "Dining Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 23),
				duration: 7,
				jobNumber: "250",
				name: "Laundry",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 31),
				duration: 6,
				jobNumber: "251",
				name: "Hallway",
				active: true,
			},
		],
	},
	{
		id: uuidv4(),
		name: "Taylor",
		rooms: [
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 31),
				duration: 41,
				jobNumber: "252",
				name: "Kitchen",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 24),
				duration: 22,
				jobNumber: "253",
				name: "Living Room",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 32),
				duration: 6,
				jobNumber: "254",
				name: "Bathroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 39),
				duration: 17,
				jobNumber: "255",
				name: "Bedroom",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: addDays(ogDate, 29),
				duration: 35,
				jobNumber: "256",
				name: "Office",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: addDays(ogDate, 35),
				duration: 11,
				jobNumber: "257",
				name: "Garage",
				active: true,
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: addDays(ogDate, 44),
				duration: 29,
				jobNumber: "258",
				name: "Dining Room",
				active: true,
			},
		],
	},
];
