import { v4 as uuidv4 } from "uuid";
import { normalizeDate } from "../utils/helpers";
import { addDays, subWeeks, addSeconds } from "date-fns";

const baseCreatedAt = subWeeks(new Date(), 4);

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
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 0).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate(new Date("2024-09-04")),
				duration: 11.61,
				jobNumber: "876",
				name: "Garage Niche",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 0), 1).toISOString(),
			},
		],
	},
	{
		id: uuidv4(),
		name: "Frantzen",
		rooms: [
			{
				id: uuidv4(),
				builderId: "4",
				startDate: normalizeDate("2024-08-31"),
				duration: 45.21,
				jobNumber: "758",
				name: "Fly Room",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 1), 0).toISOString(),
			},
		],
	},
	{
		id: uuidv4(),
		name: "Johnson",
		rooms: [
			{
				id: uuidv4(),
				builderId: "4",
				startDate: normalizeDate("2024-09-10"),
				duration: 17.06,
				jobNumber: "878",
				name: "Kitchen Refrigerator Wall",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 0).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: normalizeDate("2024-09-12"),
				duration: 27.46,
				jobNumber: "879",
				name: "Kitchen Range Wall",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 1).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: normalizeDate("2024-09-18"),
				duration: 47.71,
				jobNumber: "880",
				name: "Kitchen Storage Wall",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 2).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: normalizeDate("2024-09-26"),
				duration: 54.46,
				jobNumber: "881",
				name: "Kitchen Islands",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 3).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "4",
				startDate: normalizeDate("2024-10-07"),
				duration: 30,
				jobNumber: "882",
				name: "Dining Room",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 4).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: normalizeDate("2024-09-06"),
				duration: 50.4,
				jobNumber: "883",
				name: "Kids Playroom",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 5).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-09"),
				duration: 45.52,
				jobNumber: "884",
				name: "Scullery",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 6).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-17"),
				duration: 33.74,
				jobNumber: "885",
				name: "Laundry",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 7).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: normalizeDate("2024-09-06"),
				duration: 6,
				jobNumber: "886",
				name: "Entry Powder",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 8).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-23"),
				duration: 38.86,
				jobNumber: "887",
				name: "Master Bath",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 9).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "2",
				startDate: normalizeDate("2024-09-30"),
				duration: 126.68,
				jobNumber: "888",
				name: "Master Closet",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 10).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-09-11"),
				duration: 35.76,
				jobNumber: "889",
				name: "Garage Hall",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 11).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-06"),
				duration: 28.19,
				jobNumber: "890",
				name: "Bath 2",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 12).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-09"),
				duration: 10.7,
				jobNumber: "891",
				name: "Bath 3 Linen",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 13).toISOString(),
				},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-13"),
				duration: 3.4,
				jobNumber: "892",
				name: "Bath 3 Vanity",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 14).toISOString(),
						},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-15"),
				duration: 18.89,
				jobNumber: "893",
				name: "Bath 4",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 15).toISOString(),
				},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-09-04"),
				duration: 38.13,
				jobNumber: "894",
				name: "Back Entry",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 16).toISOString(),
				},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-29"),
				duration: 18.7,
				jobNumber: "895",
				name: "Loft",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 17).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-09-17"),
				duration: 13.54,
				jobNumber: "896",
				name: "Pool House Kitchenette",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 18).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "3",
				startDate: normalizeDate("2024-09-09"),
				duration: 138.24,
				jobNumber: "897",
				name: "Bonus Room",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 19).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-09-19"),
				duration: 33.82,
				jobNumber: "898",
				name: "Guest Kitchenette",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 20).toISOString(),
				},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-10-02"),
				duration: 52.82,
				jobNumber: "899",
				name: "Lower Level Stair Hall",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 21).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-09-25"),
				duration: 8.63,
				jobNumber: "900",
				name: "Guest Bath",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 22).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-09-26"),
				duration: 30.38,
				jobNumber: "901",
				name: "Kaci's Room",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 23).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-28"),
				duration: 7.48,
				jobNumber: "902",
				name: "Back Entry Stair",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 24).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "1",
				startDate: normalizeDate("2024-09-03"),
				duration: 10,
				jobNumber: "903",
				name: "Library",
				active: false,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 25).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "1",
				startDate: normalizeDate("2024-09-03"),
				duration: 10,
				jobNumber: "904",
				name: "Office",
				active: false,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 26).toISOString(),
				},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-10-10"),
				duration: 20,
				jobNumber: "905",
				name: "Garage",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 27).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-20"),
				duration: 20,
				jobNumber: "906",
				name: "Bath 2 Linen",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 28).toISOString(),
			},
			{
				id: uuidv4(),
				builderId: "5",
				startDate: normalizeDate("2024-08-23"),
				duration: 20,
				jobNumber: "907",
				name: "Bath 4 Linen",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 2), 29).toISOString(),
			},
		],
	},
	{
		id: uuidv4(),
		name: "Buie",
		rooms: [
			{
				id: uuidv4(),
				builderId: "3",
				startDate: normalizeDate("2024-08-30"),
				duration: 40,
				jobNumber: "914",
				name: "Console Table",
				active: true,
				roomCreatedAt: addSeconds(addDays(baseCreatedAt, 3), 0).toISOString(),
			},
		],
	},
	{
    id: uuidv4(),
    name: "Peterson",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 1,
            jobNumber: "917",
            name: "Table and Ottomans",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 4), 0).toISOString(),
        },
    ],
},
{
    id: uuidv4(),
    name: "Tanner-Madi",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-06-26"),
            duration: 1,
            jobNumber: "920",
            name: "Dining Table",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 5), 0).toISOString(),
        },
    ],
},
{
    id: uuidv4(),
    name: "Rosh",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 7.39,
            jobNumber: "923",
            name: "Kitchenette",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 6), 0).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 14.09,
            jobNumber: "924",
            name: "Command Center",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 6), 1).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 2.17,
            jobNumber: "925",
            name: "Wellness Bath Vanity",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 6), 2).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 25.5,
            jobNumber: "926",
            name: "Wellness Lockers",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 6), 3).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 9.2,
            jobNumber: "927",
            name: "Laundry",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 6), 4).toISOString(),
        	},
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-10-01"),
            duration: 3.17,
            jobNumber: "928",
            name: "Lower Level Bath",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 6), 5).toISOString(),
        },
    ],
},
{
    id: uuidv4(),
    name: "Vickers",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-08-02"),
            duration: 53.14,
            jobNumber: "942",
            name: "Kitchen Perimeter",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 7), 0).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-08-02"),
            duration: 13.84,
            jobNumber: "943",
            name: "Kitchen Island",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 7), 1).toISOString(),
        },
    ],
},
{
    id: uuidv4(),
    name: "Munshi",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-08-01"),
            duration: 49.22,
            jobNumber: "944",
            name: "Kitchen Perimeter",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 8), 0).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-08-01"),
            duration: 13.89,
            jobNumber: "945",
            name: "Kitchen Islands",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 8), 1).toISOString(),
        },
    ],
},
{
    id: uuidv4(),
    name: "Benson",
    rooms: [
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-01"),
            duration: 40.17,
            jobNumber: "946",
            name: "Kitchen Perimeter",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 0).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-08"),
            duration: 19.4,
            jobNumber: "947",
            name: "Kitchen Hood",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 1).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-11"),
            duration: 16.1,
            jobNumber: "948",
            name: "Kitchen Island",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 2).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-15"),
            duration: 16.42,
            jobNumber: "949",
            name: "Dining Buffet",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 3).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-17"),
            duration: 2.66,
            jobNumber: "950",
            name: "Powder Bath",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 4).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-18"),
            duration: 24.79,
            jobNumber: "951",
            name: "Laundry",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 5).toISOString(),
        	},
        {
            id: uuidv4(),
            builderId: "3",
            startDate: normalizeDate("2024-10-23"),
            duration: 19,
            jobNumber: "952",
            name: "Mudroom",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 9), 6).toISOString(),
        	},
    ],
},
{
    id: uuidv4(),
    name: "Williamsen",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-08-30"),
            duration: 88.35,
            jobNumber: "953",
            name: "Kitchen",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 10), 0).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-08-31"),
            duration: 21.19,
            jobNumber: "954",
            name: "Laundry",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 10), 1).toISOString(),
        },
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-09-01"),
            duration: 11.31,
            jobNumber: "955",
            name: "Bathroom",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 10), 2).toISOString(),
        },
    ],
},
{
    id: uuidv4(),
    name: "Marsden",
    rooms: [
        {
            id: uuidv4(),
            builderId: "1",
            startDate: normalizeDate("2024-09-04"),
            duration: 1,
            jobNumber: "956",
            name: "Bookcase",
            active: true,
						roomCreatedAt: addSeconds(addDays(baseCreatedAt, 11), 0).toISOString(),
        },
    ],
}

];
