[
    {
        "financials_id": 466,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1235,
        "financials_updated_at": "2026-08-04T15:36:01.173+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -9.99,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "1fb93129-0ba4-43a2-a6e8-3993b6a0aedd",
                        "cost": 385,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "385",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 385,
                "actual_cost": 385,
                "completedAt": "2026-08-04T15:34:46.816Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "17251574-c786-4465-b7f4-37e0f04fc15c",
                        "cost": 1685.53,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "585+845+255.53",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "249e1c03-a22a-4148-a67f-42388d737fe0",
                        "cost": 15.19,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70 * 21.697%"
                    },
                    {
                        "id": "bd6451d5-9d36-429a-8ef4-501805477a66",
                        "cost": 54.89,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99 * 21.697%"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 2964,
                "actual_cost": 1884.553045,
                "completedAt": "2026-08-04T15:34:46.816Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 33.18,
                        "inputRows": [
                            {
                                "id": "ae1cfc1b-a0cc-49aa-b5f1-4011d75024a3",
                                "hours": {
                                    "decimal": 8.77,
                                    "display": "8:46"
                                },
                                "isOvertime": false,
                                "actual_cost": 482.34999999999997,
                                "employee_id": "41"
                            },
                            {
                                "id": "e6da88f9-42fd-42ec-b116-b143f69f5c18",
                                "hours": {
                                    "decimal": 4.3,
                                    "display": "4:18"
                                },
                                "isOvertime": true,
                                "actual_cost": 307.45,
                                "employee_id": "41"
                            },
                            {
                                "id": "88a844e3-ce59-4102-9f5a-a8575d8676b3",
                                "hours": {
                                    "decimal": 37.53,
                                    "display": "37:32"
                                },
                                "isOvertime": false,
                                "actual_cost": 2026.6200000000001,
                                "employee_id": "34"
                            }
                        ],
                        "actual_cost": 2816.42,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 23.96,
                        "inputRows": [
                            {
                                "id": "1bffc4b7-b554-4be6-89c9-d3bca92e7595",
                                "hours": {
                                    "decimal": 13.48,
                                    "display": "13:29"
                                },
                                "isOvertime": false,
                                "actual_cost": 593.12,
                                "employee_id": "38"
                            },
                            {
                                "id": "3546d018-6de9-4750-85a4-265edc2e0806",
                                "hours": {
                                    "decimal": 9.47,
                                    "display": "9:28"
                                },
                                "isOvertime": false,
                                "actual_cost": 501.91,
                                "employee_id": "39"
                            },
                            {
                                "id": "863a2a70-fa54-465d-b457-12dd94a383c7",
                                "hours": {
                                    "decimal": 14.72,
                                    "display": "14:43"
                                },
                                "isOvertime": false,
                                "actual_cost": 721.2800000000001,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 1816.31,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 34.02,
                        "inputRows": [
                            {
                                "id": "e2a4d73ab422bc7983d5e8234e89f3ab",
                                "cost": 1570,
                                "hours": {
                                    "decimal": 1570,
                                    "display": "1570"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 1570,
                                "employee_id": "fixed_amount"
                            },
                            {
                                "id": "22e0132005cb2ab29dfe8655f2b4cf0f",
                                "cost": 1256,
                                "hours": {
                                    "decimal": 1256,
                                    "display": "1256"
                                },
                                "invoice": "1564",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 1256,
                                "employee_id": "fixed_amount"
                            },
                            {
                                "id": "543987e9b2221152cf0c11bb4f3c05e1",
                                "cost": 200,
                                "hours": {
                                    "decimal": 200,
                                    "display": "200"
                                },
                                "invoice": "1564",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 200,
                                "employee_id": "fixed_amount"
                            },
                            {
                                "id": "73e2f9783d9683a1c8e1d8cb574e35b9",
                                "cost": 150,
                                "hours": {
                                    "decimal": 150,
                                    "display": "150"
                                },
                                "invoice": "1564",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 150,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 3176,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [
                            {
                                "id": "cf8d2e07-8e09-4775-8459-ada5ad18c5cc",
                                "hours": {
                                    "decimal": 15.55,
                                    "display": "15:33"
                                },
                                "isOvertime": false,
                                "actual_cost": 653.1,
                                "employee_id": "43"
                            }
                        ],
                        "actual_cost": 653.1,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 10266,
                "actual_cost": 8461.83,
                "completedAt": "2026-08-04T15:34:46.816Z"
            },
            "other": {
                "data": [
                    {
                        "id": "ea0f54f2-3082-4394-b63b-b646be01d328",
                        "cost": 800,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "800",
                        "taxRateExpression": null
                    }
                ],
                "name": "other",
                "estimate": 800,
                "actual_cost": 800,
                "completedAt": "2026-08-04T15:34:46.816Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "abe5708c-3e8e-46e8-8407-eb8dba815657",
                        "cost": 1120,
                        "invoice": "29546",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "1120",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 1268,
                "actual_cost": 1214.64,
                "completedAt": "2026-08-04T15:34:46.816Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "16d3cd9f-bb07-4b3e-827a-c304a219a6e3",
                        "cost": 2252.2,
                        "invoice": "22366",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "2252.2",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 2475,
                "actual_cost": 2252.2,
                "completedAt": "2026-08-04T15:34:46.816Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "23dc8eab-4959-4eee-b7ca-07e84aab2501",
                        "cost": 356,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "356",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 356,
                "actual_cost": 356,
                "completedAt": "2026-08-04T15:34:46.816Z"
            }
        },
        "costing_complete": "2026-08-04T15:36:01.173+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Laundry",
            "project_id": 315,
            "task_number": "353",
            "task_created_at": "2025-12-24T17:22:49.86+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 467,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1236,
        "financials_updated_at": "2026-08-04T15:51:58.55+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "9a1dd91f-5834-4914-9bad-fec7b7740adc",
                        "cost": 772,
                        "invoice": "",
                        "taxRate": "",
                        "description": "",
                        "costExpression": "772",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 772,
                "actual_cost": 772,
                "completedAt": "2026-08-04T15:42:53.362Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "808b77d8-3b14-4022-a2ec-40575f9625f5",
                        "cost": 2879.78,
                        "invoice": "1695",
                        "taxRate": 7.65,
                        "costExpression": "1235+130+975+539.78",
                        "taxAmountExpression": "220.30"
                    },
                    {
                        "id": "a2e2d8c2-9923-4e68-813f-dfc149ee2444",
                        "cost": 35,
                        "invoice": "1695 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "35"
                    },
                    {
                        "id": "1004ba00-58f7-4010-b4d7-35c10dab7812",
                        "cost": 94.05,
                        "invoice": "1695 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "94.05"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 5044,
                "actual_cost": 3229.1331700000005,
                "completedAt": "2026-08-04T15:40:53.609Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 82.66,
                        "inputRows": [
                            {
                                "id": "b8e194ee-921b-4b39-b084-24520c8f7dc8",
                                "hours": {
                                    "decimal": 14.67,
                                    "display": "14:40"
                                },
                                "isOvertime": false,
                                "actual_cost": 806.85,
                                "employee_id": "41"
                            },
                            {
                                "id": "ea54f06c-3265-4ba5-b1ab-2f806c612a31",
                                "hours": {
                                    "decimal": 2.62,
                                    "display": "2:37"
                                },
                                "isOvertime": true,
                                "actual_cost": 187.33,
                                "employee_id": "41"
                            },
                            {
                                "id": "e733e83d-cdd4-4852-a14c-9604dc79b35a",
                                "hours": {
                                    "decimal": 68.52,
                                    "display": "68:31"
                                },
                                "isOvertime": false,
                                "actual_cost": 2980.62,
                                "employee_id": "33"
                            },
                            {
                                "id": "25827845-64c2-460a-8e34-edbd51b19c12",
                                "hours": {
                                    "decimal": 7.08,
                                    "display": "7:05"
                                },
                                "isOvertime": true,
                                "actual_cost": 384.09000000000003,
                                "employee_id": "33"
                            },
                            {
                                "id": "4db622bb-8317-4e2c-a513-cfc5d4c3d71c",
                                "hours": {
                                    "decimal": 1.78,
                                    "display": "1:47"
                                },
                                "isOvertime": false,
                                "actual_cost": 101.46000000000001,
                                "employee_id": "31"
                            }
                        ],
                        "actual_cost": 4460.35,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 60.04,
                        "inputRows": [
                            {
                                "id": "9a3172ac-bb38-4359-8e09-526b634d0049",
                                "hours": {
                                    "decimal": 25.97,
                                    "display": "25:58"
                                },
                                "isOvertime": false,
                                "actual_cost": 1142.6799999999998,
                                "employee_id": "38"
                            },
                            {
                                "id": "5a2438fe-d3f9-459d-af1c-b487b07a7077",
                                "hours": {
                                    "decimal": 21.98,
                                    "display": "21:59"
                                },
                                "isOvertime": false,
                                "actual_cost": 1164.94,
                                "employee_id": "39"
                            },
                            {
                                "id": "c1e7521e-c71b-4fbe-bcee-5cd37c3e8124",
                                "hours": {
                                    "decimal": 26.37,
                                    "display": "26:22"
                                },
                                "isOvertime": false,
                                "actual_cost": 1292.13,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 3599.75,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 49.93,
                        "inputRows": [
                            {
                                "id": "f48d7f39b7d8a048cc3b9c366a91d209",
                                "cost": 761.25,
                                "hours": {
                                    "decimal": 761.25,
                                    "display": "761.25"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 761.25,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 761.25,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [
                            {
                                "id": "84c2c0a2-994d-4723-9d4c-7e755c99a031",
                                "hours": {
                                    "decimal": 9.5,
                                    "display": "9:30"
                                },
                                "isOvertime": false,
                                "actual_cost": 399,
                                "employee_id": "43"
                            }
                        ],
                        "actual_cost": 399,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 21261.75,
                "actual_cost": 9220.35,
                "completedAt": "2026-08-04T15:40:56.293Z"
            },
            "other": {
                "data": [
                    {
                        "id": "64111712-dc64-4ac6-97e6-acb4092ffced",
                        "cost": 153.56,
                        "invoice": "2339178",
                        "taxRate": 8.45,
                        "description": "Hartung Glass",
                        "costExpression": "153.56",
                        "taxRateExpression": "8.45"
                    },
                    {
                        "id": "f7b14d60-f799-43dc-a981-4818ff1fe530",
                        "cost": 233.46,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "233.46",
                        "taxRateExpression": null
                    }
                ],
                "name": "other",
                "estimate": 400,
                "actual_cost": 399.99582,
                "completedAt": "2026-08-04T15:42:38.429Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "977e4f43-f246-43ef-a8eb-3cd14f762344",
                        "cost": 1251,
                        "invoice": "29543",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "1251",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 1658,
                "actual_cost": 1356.7095,
                "completedAt": "2026-08-04T15:41:33.087Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "f3ea2f3e-390f-4174-81b0-c6f3217d1056",
                        "cost": 1956.61,
                        "invoice": "",
                        "taxRate": 7.25,
                        "description": "",
                        "costExpression": "1956.61",
                        "taxRateExpression": "7.25"
                    }
                ],
                "name": "cabinets",
                "estimate": 2673,
                "actual_cost": 2098.4642249999997,
                "completedAt": "2026-08-04T15:45:41.253Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "d57b7422-e662-4b56-9b58-c38d6955da45",
                        "cost": 758,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "758",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 758,
                "actual_cost": 758,
                "completedAt": "2026-08-04T15:42:44.700Z"
            }
        },
        "costing_complete": "2026-08-04T15:51:58.55+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Kitchen Perimeter",
            "project_id": 315,
            "task_number": "354",
            "task_created_at": "2025-12-24T17:23:01.163+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 468,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1237,
        "financials_updated_at": "2026-08-04T15:56:46.396+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "cdcc4e26-e745-49ed-93a6-27e94013effd",
                        "cost": 389,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "389",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 389,
                "actual_cost": 389,
                "completedAt": "2026-08-04T15:56:27.701Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "6f8274ea-897e-4e2d-b489-2744490b0306",
                        "cost": 1191.63,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "455+585+151.63",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "e02820c4-dbf7-4f0d-bcb6-bf4be5abf34d",
                        "cost": 10.74,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "e0f9495b-2f4b-47df-ae6a-837a55cd7768",
                        "cost": 38.81,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 2447,
                "actual_cost": 1332.3396950000001,
                "completedAt": "2026-08-04T15:53:55.123Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 25.38,
                        "inputRows": [
                            {
                                "id": "5e46fe75-16c1-4c5e-8d76-2cefd4ec8993",
                                "hours": {
                                    "decimal": 1.13,
                                    "display": "1:08"
                                },
                                "isOvertime": false,
                                "actual_cost": 62.14999999999999,
                                "employee_id": "41"
                            },
                            {
                                "id": "e94efc7e-c1a7-4eff-9115-e4d39f6382d9",
                                "hours": {
                                    "decimal": 24.82,
                                    "display": "24:49"
                                },
                                "isOvertime": false,
                                "actual_cost": 1079.67,
                                "employee_id": "33"
                            },
                            {
                                "id": "8ba0a1f1-1c3c-492c-88ad-32c2b6010d90",
                                "hours": {
                                    "decimal": 3.83,
                                    "display": "3:50"
                                },
                                "isOvertime": true,
                                "actual_cost": 207.7775,
                                "employee_id": "33"
                            }
                        ],
                        "actual_cost": 1349.5975,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 14.43,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 14.9,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 1349.5975,
                "completedAt": "2026-08-04T15:53:54.273Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T15:56:34.087Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "19531180-9290-4bd3-a116-657daf4a1deb",
                        "cost": 795.5,
                        "invoice": "29535",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "795.5",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 0,
                "actual_cost": 862.71975,
                "completedAt": "2026-08-04T15:55:53.483Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "bf16bf63-c0b6-481b-8051-e95b91eb044c",
                        "cost": 632.03,
                        "invoice": "22368",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "632.03",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 550,
                "actual_cost": 632.03,
                "completedAt": "2026-08-04T15:53:54.704Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "69b0f817-fa66-49f7-99ec-19cc01875526",
                        "cost": 240,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "240",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 240,
                "actual_cost": 240,
                "completedAt": "2026-08-04T15:56:21.443Z"
            }
        },
        "costing_complete": "2026-08-04T15:56:46.396+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Kitchen Island",
            "project_id": 315,
            "task_number": "355",
            "task_created_at": "2025-12-24T17:23:14.701+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 469,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1238,
        "financials_updated_at": "2026-08-04T16:00:26.536+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "95e58b35-95ca-4b89-9fd0-bbe6098c4784",
                        "cost": 251,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "251",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 251,
                "actual_cost": 251,
                "completedAt": "2026-08-04T16:00:16.627Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "735c9c1b-d71a-42d4-8732-a6535c0144e2",
                        "cost": 1664.51,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "975+455+234.51",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "6848383d-19c4-463b-b942-c85743d98cfb",
                        "cost": 15,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "14d22034-4f57-47fa-b743-59177430305c",
                        "cost": 54.2,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 3261,
                "actual_cost": 1861.0450150000001,
                "completedAt": "2026-08-04T15:59:46.059Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 27.64,
                        "inputRows": [
                            {
                                "id": "3b9a0ac4-c05a-4d12-bd5b-a6c87c355152",
                                "hours": {
                                    "decimal": 11.52,
                                    "display": "11:31"
                                },
                                "isOvertime": false,
                                "actual_cost": 633.6,
                                "employee_id": "41"
                            },
                            {
                                "id": "4e4109f0-597a-468e-b0c6-66ce6cfd658e",
                                "hours": {
                                    "decimal": 15.3,
                                    "display": "15:18"
                                },
                                "isOvertime": false,
                                "actual_cost": 826.2,
                                "employee_id": "34"
                            },
                            {
                                "id": "2e161b9d-fac3-4201-b283-ddd6a1c73055",
                                "hours": {
                                    "decimal": 6,
                                    "display": "6:00"
                                },
                                "isOvertime": true,
                                "actual_cost": 420,
                                "employee_id": "34"
                            }
                        ],
                        "actual_cost": 1879.8000000000002,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 22.51,
                        "inputRows": [
                            {
                                "id": "02d49e1d-f4d2-4fe5-9706-c48abd932bde",
                                "hours": {
                                    "decimal": 7.05,
                                    "display": "7:03"
                                },
                                "isOvertime": false,
                                "actual_cost": 310.2,
                                "employee_id": "38"
                            },
                            {
                                "id": "faba6220-f290-469f-97c9-c88deee65129",
                                "hours": {
                                    "decimal": 4.92,
                                    "display": "4:55"
                                },
                                "isOvertime": true,
                                "actual_cost": 270.6,
                                "employee_id": "38"
                            },
                            {
                                "id": "aee8a71b-7ab2-4047-b483-3670adc0624f",
                                "hours": {
                                    "decimal": 8.28,
                                    "display": "8:17"
                                },
                                "isOvertime": false,
                                "actual_cost": 438.84,
                                "employee_id": "39"
                            },
                            {
                                "id": "d5f7eeb8-bc71-416c-be28-19e710fcaf36",
                                "hours": {
                                    "decimal": 4.13,
                                    "display": "4:08"
                                },
                                "isOvertime": true,
                                "actual_cost": 282.905,
                                "employee_id": "39"
                            },
                            {
                                "id": "f1f67647-7937-45c8-81f3-acc495ad78e3",
                                "hours": {
                                    "decimal": 3.33,
                                    "display": "3:20"
                                },
                                "isOvertime": false,
                                "actual_cost": 163.17000000000002,
                                "employee_id": "40"
                            },
                            {
                                "id": "eaa9ef0e-c978-4274-92d2-38db3e3b42d5",
                                "hours": {
                                    "decimal": 2.48,
                                    "display": "2:29"
                                },
                                "isOvertime": true,
                                "actual_cost": 155,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 1620.715,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 23.8,
                        "inputRows": [
                            {
                                "id": "b81da6a0960a416d6ea181e0cab22ec7",
                                "cost": 2218.5,
                                "hours": {
                                    "decimal": 2218.5,
                                    "display": "2218.5"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 2218.5,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 2218.5,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [
                            {
                                "id": "543874e8-6429-42c2-9c27-3dcacaefb79e",
                                "hours": {
                                    "decimal": 22.18,
                                    "display": "22:11"
                                },
                                "isOvertime": false,
                                "actual_cost": 931.56,
                                "employee_id": "43"
                            }
                        ],
                        "actual_cost": 931.56,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 6650.575000000001,
                "completedAt": "2026-08-04T15:59:21.929Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:00:21.371Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "7a708292-83cd-48f8-bda4-b43916f45044",
                        "cost": 1193,
                        "invoice": "29581",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "1193",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 1365,
                "actual_cost": 1293.8085,
                "completedAt": "2026-08-04T16:00:06.001Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "0f07855a-dcb6-4f33-8487-db9cc1391a4c",
                        "cost": 1928.87,
                        "invoice": "22367",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "1928.87",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 2097,
                "actual_cost": 1928.87,
                "completedAt": "2026-08-04T15:59:40.617Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "fdbc1023-05f0-444e-b4b0-a40943382b3d",
                        "cost": 580,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "580",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 580,
                "actual_cost": 580,
                "completedAt": "2026-08-04T16:00:11.571Z"
            }
        },
        "costing_complete": "2026-08-04T16:00:26.536+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Butler's Pantry",
            "project_id": 315,
            "task_number": "356",
            "task_created_at": "2025-12-24T17:23:27.103+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 470,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1239,
        "financials_updated_at": "2026-08-04T16:05:09.414+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "2c878c6e-bc5c-429d-ac36-a2a629a3e91e",
                        "cost": 266,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "266",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 266,
                "actual_cost": 266,
                "completedAt": "2026-08-04T16:04:51.871Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "2b6362d6-6648-46f8-ab32-d2003396601b",
                        "cost": 574.46,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "520+54.46",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "1193e5c7-74b4-4002-86a3-793b0d37cab4",
                        "cost": 5.17,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "a3941681-700f-4483-9eab-c545cacc6328",
                        "cost": 18.71,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 708,
                "actual_cost": 642.28619,
                "completedAt": "2026-08-04T16:04:37.045Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 30.43,
                        "inputRows": [
                            {
                                "id": "e99eb060-8870-4149-997d-7191ea29adf0",
                                "hours": {
                                    "decimal": 2.17,
                                    "display": "2:10"
                                },
                                "isOvertime": false,
                                "actual_cost": 119.35,
                                "employee_id": "41"
                            },
                            {
                                "id": "698f4f3a-7d90-4dfb-a28f-2bffbcf23c9c",
                                "hours": {
                                    "decimal": 4.22,
                                    "display": "4:13"
                                },
                                "isOvertime": true,
                                "actual_cost": 301.72999999999996,
                                "employee_id": "41"
                            },
                            {
                                "id": "1ddc087f-c15e-4b96-8474-78b69ba4a826",
                                "hours": {
                                    "decimal": 15.3,
                                    "display": "15:18"
                                },
                                "isOvertime": false,
                                "actual_cost": 665.5500000000001,
                                "employee_id": "33"
                            },
                            {
                                "id": "c67beb1d-27f3-48e0-8c65-8b24420ac0c9",
                                "hours": {
                                    "decimal": 3.78,
                                    "display": "3:47"
                                },
                                "isOvertime": true,
                                "actual_cost": 205.065,
                                "employee_id": "33"
                            }
                        ],
                        "actual_cost": 1291.6950000000002,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 23.28,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 18.26,
                        "inputRows": [
                            {
                                "id": "ac6342a636843f3cd42a01143d9a28a4",
                                "cost": 1485,
                                "hours": {
                                    "decimal": 1485,
                                    "display": "1485"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 1485,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 1485,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [
                            {
                                "id": "c5f1b9bb-f65c-4dc2-bc97-58c76f5f3b34",
                                "hours": {
                                    "decimal": 2.32,
                                    "display": "2:19"
                                },
                                "isOvertime": false,
                                "actual_cost": 97.44,
                                "employee_id": "43"
                            },
                            {
                                "id": "02544b69-0f0e-4ee3-81fb-2e49085ec518",
                                "hours": {
                                    "decimal": 1.33,
                                    "display": "1:20"
                                },
                                "isOvertime": true,
                                "actual_cost": 69.16,
                                "employee_id": "43"
                            }
                        ],
                        "actual_cost": 166.6,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 2943.295,
                "completedAt": "2026-08-04T16:04:26.652Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:04:57.617Z"
            },
            "drawers": {
                "data": [],
                "name": "drawers",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:04:43.232Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "fd51ee18-b5af-46aa-9ac9-2574817a31f1",
                        "cost": 682.73,
                        "invoice": "22373",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "682.73",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 1529,
                "actual_cost": 682.73,
                "completedAt": "2026-08-04T16:04:25.748Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "771fc647-3b59-42b7-9f97-c19e52d9f205",
                        "cost": 32,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "32",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 32,
                "actual_cost": 32,
                "completedAt": "2026-08-04T16:04:46.535Z"
            }
        },
        "costing_complete": "2026-08-04T16:05:09.414+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Music Room",
            "project_id": 315,
            "task_number": "357",
            "task_created_at": "2025-12-24T17:23:37.767+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 471,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1240,
        "financials_updated_at": "2026-08-04T16:07:47.764+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "34d02c5c-d392-41fd-aaff-cbac312dbbd8",
                        "cost": 128,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "128",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 128,
                "actual_cost": 128,
                "completedAt": "2026-08-04T16:07:38.193Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "2fc951d9-fbf3-47eb-abcf-010299809067",
                        "cost": 356.28,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "130+130+96.28",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "d16f291f-8e62-41ed-b72f-719044838107",
                        "cost": 3.21,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "d344910e-2515-4711-b2cc-73bb889ee217",
                        "cost": 11.6,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 1258,
                "actual_cost": 398.34542,
                "completedAt": "2026-08-04T16:07:03.189Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 11.12,
                        "inputRows": [
                            {
                                "id": "77e287b6-163a-4526-81b8-dde8f34cb840",
                                "hours": {
                                    "decimal": 10.95,
                                    "display": "10:57"
                                },
                                "isOvertime": false,
                                "actual_cost": 591.3,
                                "employee_id": "34"
                            },
                            {
                                "id": "d24deb85-0cbb-4dc4-894d-f9b6242cd62a",
                                "hours": {
                                    "decimal": 0.25,
                                    "display": "0:15"
                                },
                                "isOvertime": true,
                                "actual_cost": 17.5,
                                "employee_id": "34"
                            }
                        ],
                        "actual_cost": 608.8,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 9.68,
                        "inputRows": [
                            {
                                "id": "5a7f41f6-7430-4152-8ca3-e778ee2a6459",
                                "hours": {
                                    "decimal": 4.68,
                                    "display": "4:41"
                                },
                                "isOvertime": false,
                                "actual_cost": 205.92,
                                "employee_id": "38"
                            },
                            {
                                "id": "8644c829-4476-450c-8a31-6c8298fbd378",
                                "hours": {
                                    "decimal": 4.57,
                                    "display": "4:34"
                                },
                                "isOvertime": false,
                                "actual_cost": 223.93,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 429.85,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 10.15,
                        "inputRows": [
                            {
                                "id": "0fc017da29b563182d1ebc42af88f8cf",
                                "cost": 684,
                                "hours": {
                                    "decimal": 684,
                                    "display": "684"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 684,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 684,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 1722.65,
                "completedAt": "2026-08-04T16:06:41.324Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:07:43.411Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "77253020-14d8-43a4-9975-f56429337594",
                        "cost": 151,
                        "invoice": "29991",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "151",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 195,
                "actual_cost": 163.7595,
                "completedAt": "2026-08-04T16:07:29.459Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "7c786ea3-43f4-43fd-8292-b96019719cdd",
                        "cost": 572.82,
                        "invoice": "22377",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "572.82",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 1069,
                "actual_cost": 572.82,
                "completedAt": "2026-08-04T16:06:58.703Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "3442cf32-e88e-45bc-8b2a-12365574d113",
                        "cost": 152,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "152",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 152,
                "actual_cost": 152,
                "completedAt": "2026-08-04T16:07:34.275Z"
            }
        },
        "costing_complete": "2026-08-04T16:07:47.764+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Mud Room",
            "project_id": 315,
            "task_number": "358",
            "task_created_at": "2025-12-24T17:23:47.857+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 472,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1241,
        "financials_updated_at": "2026-08-04T16:11:23.224+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "1fdfa8f2-8afe-4852-8eb5-ca0fd40fcac7",
                        "cost": 89,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "89",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 89,
                "actual_cost": 89,
                "completedAt": "2026-08-04T16:11:19.817Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "733965e8-7959-4335-8383-f0794d7ffd52",
                        "cost": 975,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "260+715",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "769a2657-a15b-45ad-a189-b19bbaaf4638",
                        "cost": 8.78,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "0a269048-2b69-47cc-a000-60cfaf9a070f",
                        "cost": 31.75,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 1027,
                "actual_cost": 1090.1175,
                "completedAt": "2026-08-04T16:10:15.788Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 17.66,
                        "inputRows": [
                            {
                                "id": "8a7d84c4-1587-4169-988c-81172b313aa1",
                                "hours": {
                                    "decimal": 8.55,
                                    "display": "8:33"
                                },
                                "isOvertime": false,
                                "actual_cost": 470.25000000000006,
                                "employee_id": "41"
                            },
                            {
                                "id": "5147a4c6-ac2d-4891-a887-0d85ef253b61",
                                "hours": {
                                    "decimal": 23.67,
                                    "display": "23:40"
                                },
                                "isOvertime": false,
                                "actual_cost": 1278.18,
                                "employee_id": "34"
                            },
                            {
                                "id": "ef8cc84a-3317-45b2-87d1-298307c41592",
                                "hours": {
                                    "decimal": 4.38,
                                    "display": "4:23"
                                },
                                "isOvertime": true,
                                "actual_cost": 306.59999999999997,
                                "employee_id": "34"
                            }
                        ],
                        "actual_cost": 2055.03,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 14.46,
                        "inputRows": [
                            {
                                "id": "ccd30ad0-d849-45cc-8256-1931313a669d",
                                "hours": {
                                    "decimal": 3.63,
                                    "display": "3:38"
                                },
                                "isOvertime": true,
                                "actual_cost": 199.65,
                                "employee_id": "38"
                            },
                            {
                                "id": "574803f7-6bf7-4d31-991b-09f6b48eba80",
                                "hours": {
                                    "decimal": 0.75,
                                    "display": "0:45"
                                },
                                "isOvertime": false,
                                "actual_cost": 36.75,
                                "employee_id": "40"
                            },
                            {
                                "id": "92affb12-d564-4acd-afd7-d5aec3317e75",
                                "hours": {
                                    "decimal": 4.42,
                                    "display": "4:25"
                                },
                                "isOvertime": true,
                                "actual_cost": 276.25,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 512.65,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 11.9,
                        "inputRows": [
                            {
                                "id": "5def649f344e92105b0ec34737cdec1e",
                                "cost": 990,
                                "hours": {
                                    "decimal": 990,
                                    "display": "990"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 990,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 990,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 3557.6800000000003,
                "completedAt": "2026-08-04T16:09:10.279Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:11:21.371Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "32775747-c04d-4976-b0bc-944f8c808040",
                        "cost": 567.5,
                        "invoice": "29545",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "567.5",
                        "taxRateExpression": "8.45"
                    },
                    {
                        "id": "77db5fd0-8ce9-4884-ad16-21461ca63437",
                        "cost": 560.5,
                        "invoice": "29683",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "560.5",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 878,
                "actual_cost": 1223.316,
                "completedAt": "2026-08-04T16:11:06.555Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "3f0dc743-3501-4dbf-9e16-1ac448b8da2e",
                        "cost": 445.35,
                        "invoice": "22369",
                        "taxRate": 7.25,
                        "description": "",
                        "costExpression": "445.35",
                        "taxRateExpression": "7.25"
                    }
                ],
                "name": "cabinets",
                "estimate": 596,
                "actual_cost": 477.637875,
                "completedAt": "2026-08-04T16:10:13.417Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "c24565ea-56e8-474f-8b8a-1ec281f61e32",
                        "cost": 196,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "196",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 196,
                "actual_cost": 196,
                "completedAt": "2026-08-04T16:11:14.503Z"
            }
        },
        "costing_complete": "2026-08-04T16:11:23.224+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Master Bath Vanity",
            "project_id": 315,
            "task_number": "359",
            "task_created_at": "2025-12-24T17:24:16.332+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 473,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1242,
        "financials_updated_at": "2026-08-04T16:14:24.161+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "29d94856-cef2-4a24-8fb5-7364ca0b7b32",
                        "cost": 454,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "454",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 454,
                "actual_cost": 454,
                "completedAt": "2026-08-04T16:13:48.303Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "29e086a3-285a-4f2d-9949-1bfba92628a9",
                        "cost": 833.44,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "260+520+53.44",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "4ae5d1b7-12ae-46d1-8b9c-5b9b5f9f205b",
                        "cost": 7.51,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "f5b1713b-f2a8-408c-a81f-72f4e6912c71",
                        "cost": 27.14,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 1691,
                "actual_cost": 931.84816,
                "completedAt": "2026-08-04T16:13:27.545Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 44.96,
                        "inputRows": [
                            {
                                "id": "8d551f53-30ee-492b-81be-b644e3e65420",
                                "hours": {
                                    "decimal": 11.97,
                                    "display": "11:58"
                                },
                                "isOvertime": false,
                                "actual_cost": 658.35,
                                "employee_id": "41"
                            },
                            {
                                "id": "3a9800aa-3dbd-4780-9d5d-0812be23c9dc",
                                "hours": {
                                    "decimal": 3.63,
                                    "display": "3:38"
                                },
                                "isOvertime": true,
                                "actual_cost": 259.545,
                                "employee_id": "41"
                            },
                            {
                                "id": "6b792540-8d53-4c82-b599-c98730ab9d9e",
                                "hours": {
                                    "decimal": 58.23,
                                    "display": "58:14"
                                },
                                "isOvertime": false,
                                "actual_cost": 3144.4199999999996,
                                "employee_id": "34"
                            },
                            {
                                "id": "25e913de-eda8-456d-bf35-049ca730650a",
                                "hours": {
                                    "decimal": 2.95,
                                    "display": "2:57"
                                },
                                "isOvertime": true,
                                "actual_cost": 206.5,
                                "employee_id": "34"
                            }
                        ],
                        "actual_cost": 4268.815,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 24.94,
                        "inputRows": [
                            {
                                "id": "3b4e25cd-47b5-41cb-95d7-71117073e855",
                                "hours": {
                                    "decimal": 9.47,
                                    "display": "9:28"
                                },
                                "isOvertime": false,
                                "actual_cost": 416.68,
                                "employee_id": "38"
                            },
                            {
                                "id": "20614fcd-0129-4644-a49f-2a53d2a63247",
                                "hours": {
                                    "decimal": 4.92,
                                    "display": "4:55"
                                },
                                "isOvertime": true,
                                "actual_cost": 270.6,
                                "employee_id": "38"
                            },
                            {
                                "id": "ef1e7f3e-ea0e-4f7e-b45a-955197bfca41",
                                "hours": {
                                    "decimal": 10.9,
                                    "display": "10:54"
                                },
                                "isOvertime": false,
                                "actual_cost": 534.1,
                                "employee_id": "40"
                            },
                            {
                                "id": "08082e20-1f24-4d7a-a7ae-e41a95b4a29e",
                                "hours": {
                                    "decimal": 5.48,
                                    "display": "5:29"
                                },
                                "isOvertime": true,
                                "actual_cost": 342.5,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 1563.88,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 43.9,
                        "inputRows": [
                            {
                                "id": "e6d67e86e5fddd63082ad2d41e2ea04e",
                                "cost": 4176,
                                "hours": {
                                    "decimal": 4176,
                                    "display": "4176"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 4176,
                                "employee_id": "fixed_amount"
                            },
                            {
                                "id": "0b3f9b8d6901104526decc26ca740cf0",
                                "cost": 200,
                                "hours": {
                                    "decimal": 200,
                                    "display": "200"
                                },
                                "invoice": "1564",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 200,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 4376,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [
                            {
                                "id": "e6fc71bf-b537-4c02-88cd-a8a11a894d0a",
                                "hours": {
                                    "decimal": 7.93,
                                    "display": "7:56"
                                },
                                "isOvertime": false,
                                "actual_cost": 333.06,
                                "employee_id": "43"
                            },
                            {
                                "id": "d66950ad-0547-4fb9-b8f8-0a81f91ad2c9",
                                "hours": {
                                    "decimal": 2,
                                    "display": "2:00"
                                },
                                "isOvertime": true,
                                "actual_cost": 104,
                                "employee_id": "43"
                            }
                        ],
                        "actual_cost": 437.06,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 10645.755,
                "completedAt": "2026-08-04T16:13:03.229Z"
            },
            "other": {
                "data": [
                    {
                        "id": "cca5977e-f338-4723-8f65-3c00f93af800",
                        "cost": 900,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "900",
                        "taxRateExpression": null
                    }
                ],
                "name": "other",
                "estimate": 900,
                "actual_cost": 900,
                "completedAt": "2026-08-04T16:13:54.555Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "79dbc52f-5267-40ea-b9ca-ce04405c6944",
                        "cost": 624,
                        "invoice": "29551",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "624",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 780,
                "actual_cost": 676.7280000000001,
                "completedAt": "2026-08-04T16:13:39.707Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "30d29c23-2513-4802-a241-002811023faf",
                        "cost": 1394.17,
                        "invoice": "22374",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "1394.17",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 1704,
                "actual_cost": 1394.17,
                "completedAt": "2026-08-04T16:13:16.931Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "ebac54a4-e75f-4d56-a7b5-730e49dc6d88",
                        "cost": 200,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "200",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 200,
                "actual_cost": 200,
                "completedAt": "2026-08-04T16:13:45.229Z"
            }
        },
        "costing_complete": "2026-08-04T16:14:24.161+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Master Closet",
            "project_id": 315,
            "task_number": "360",
            "task_created_at": "2025-12-24T17:24:33.042+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 474,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1243,
        "financials_updated_at": "2026-08-04T16:16:16.202+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "f3493913-3f00-4b6d-8421-73a04eeb0416",
                        "cost": 152,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "152",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 152,
                "actual_cost": 152,
                "completedAt": "2026-08-04T16:16:14.055Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "4ab1c359-8a4f-41a2-a126-e35cb973fdb2",
                        "cost": 97.91,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "65+32.91",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "795077f7-5bff-4b38-9b6c-cd90832ef800",
                        "cost": 0.88,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "53f66859-86a9-4f82-83ea-4b40e3e0a5eb",
                        "cost": 3.19,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 316,
                "actual_cost": 109.47011499999999,
                "completedAt": "2026-08-04T16:15:46.501Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 20.78,
                        "inputRows": [
                            {
                                "id": "0e2a22ab-eadc-45a7-9389-a3bc834b7456",
                                "hours": {
                                    "decimal": 2.97,
                                    "display": "2:58"
                                },
                                "isOvertime": false,
                                "actual_cost": 163.35000000000002,
                                "employee_id": "41"
                            },
                            {
                                "id": "41ac0abb-044f-4896-b726-3d1d67867bbb",
                                "hours": {
                                    "decimal": 10.08,
                                    "display": "10:05"
                                },
                                "isOvertime": false,
                                "actual_cost": 438.48,
                                "employee_id": "33"
                            }
                        ],
                        "actual_cost": 601.83,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 13.12,
                        "inputRows": [
                            {
                                "id": "15d845c8-421d-4bb6-8d57-6fb8f5d55890",
                                "hours": {
                                    "decimal": 4.3,
                                    "display": "4:18"
                                },
                                "isOvertime": false,
                                "actual_cost": 210.7,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 210.7,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 10.9,
                        "inputRows": [
                            {
                                "id": "ab76f7a10454169aa3736d237be8ca3a",
                                "cost": 600,
                                "hours": {
                                    "decimal": 600,
                                    "display": "600"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 600,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 600,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [
                            {
                                "id": "fba3786e-0469-45a0-a345-9bf65fe8a775",
                                "hours": {
                                    "decimal": 9.87,
                                    "display": "9:52"
                                },
                                "isOvertime": false,
                                "actual_cost": 414.53999999999996,
                                "employee_id": "43"
                            },
                            {
                                "id": "0b6e9bb6-8765-4546-899d-5822207b5f35",
                                "hours": {
                                    "decimal": 0.8,
                                    "display": "0:48"
                                },
                                "isOvertime": true,
                                "actual_cost": 41.6,
                                "employee_id": "43"
                            }
                        ],
                        "actual_cost": 456.14,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 1868.67,
                "completedAt": "2026-08-04T16:15:28.175Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:16:15.721Z"
            },
            "drawers": {
                "data": [],
                "name": "drawers",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:16:05.311Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "95d3e456-678b-41aa-80b2-d75813ae644d",
                        "cost": 503.25,
                        "invoice": "22376",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "503.25",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 814,
                "actual_cost": 503.25,
                "completedAt": "2026-08-04T16:15:43.409Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "a60de5c5-a7d1-4331-8b44-2de5fe962e59",
                        "cost": 32,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "32",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 32,
                "actual_cost": 32,
                "completedAt": "2026-08-04T16:16:10.505Z"
            }
        },
        "costing_complete": "2026-08-04T16:16:16.202+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Family Room",
            "project_id": 315,
            "task_number": "361",
            "task_created_at": "2025-12-24T17:24:41.289+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 475,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1244,
        "financials_updated_at": "2026-08-04T16:18:45.127+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -9,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "a4db2dce-0106-47c7-8231-18ed3e23039d",
                        "cost": 78,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "78",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 78,
                "actual_cost": 78,
                "completedAt": "2026-08-04T16:18:40.199Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "b9e99f29-8dfb-41b2-9160-83f8976faae4",
                        "cost": 390,
                        "invoice": "1681",
                        "taxRate": 7.65,
                        "costExpression": "390",
                        "taxAmountExpression": "594.31"
                    },
                    {
                        "id": "b49e9615-c7fa-474f-96d5-8c70d449b174",
                        "cost": 3.52,
                        "invoice": "1681 - delivery fee",
                        "taxRate": 0,
                        "description": "Delivery Fee",
                        "costExpression": "70"
                    },
                    {
                        "id": "ac891eee-c861-4e94-a435-6f0d0b6f5481",
                        "cost": 12.7,
                        "invoice": "1681 - credit card fee",
                        "taxRate": 0,
                        "description": "Credit Card Fee",
                        "costExpression": "252.99"
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 96,
                "actual_cost": 436.05499999999995,
                "completedAt": "2026-08-04T16:17:34.468Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 8.47,
                        "inputRows": [
                            {
                                "id": "8db2ba9f-6f62-4949-a421-9ddd7f7e51de",
                                "hours": {
                                    "decimal": 24.67,
                                    "display": "24:40"
                                },
                                "isOvertime": false,
                                "actual_cost": 1073.145,
                                "employee_id": "33"
                            },
                            {
                                "id": "115f4d61-3400-4271-b7a3-fd116381aeae",
                                "hours": {
                                    "decimal": 5.03,
                                    "display": "5:02"
                                },
                                "isOvertime": true,
                                "actual_cost": 272.8775,
                                "employee_id": "33"
                            }
                        ],
                        "actual_cost": 1346.0225,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 7.6,
                        "inputRows": [
                            {
                                "id": "f2b6a00c-cf6c-4942-929c-a083ce3b6351",
                                "hours": {
                                    "decimal": 13.4,
                                    "display": "13:24"
                                },
                                "isOvertime": false,
                                "actual_cost": 589.6,
                                "employee_id": "38"
                            },
                            {
                                "id": "381a910d-7d20-47a1-b029-80936bd0adbf",
                                "hours": {
                                    "decimal": 9.12,
                                    "display": "9:07"
                                },
                                "isOvertime": false,
                                "actual_cost": 483.35999999999996,
                                "employee_id": "39"
                            },
                            {
                                "id": "134fc156-9704-4bce-a4f8-d73cb9a5eebf",
                                "hours": {
                                    "decimal": 13.88,
                                    "display": "13:53"
                                },
                                "isOvertime": false,
                                "actual_cost": 680.12,
                                "employee_id": "40"
                            }
                        ],
                        "actual_cost": 1753.08,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 4,
                        "inputRows": [
                            {
                                "id": "0348ae565be84fd33dd4352b7a10bf10",
                                "cost": 1372.5,
                                "hours": {
                                    "decimal": 1372.5,
                                    "display": "1372.5"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 1372.5,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 1372.5,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 4471.6025,
                "completedAt": "2026-08-04T16:17:31.253Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:18:43.139Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "c72e1b3e-f8f8-42de-8315-a378bf4b30ec",
                        "cost": 478,
                        "invoice": "29548",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "478",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 0,
                "actual_cost": 518.391,
                "completedAt": "2026-08-04T16:18:28.707Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "bb927a85-e907-4943-9b17-ee5075f5cc91",
                        "cost": 1103.53,
                        "invoice": "22375",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "1103.53",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 434,
                "actual_cost": 1103.53,
                "completedAt": "2026-08-04T16:17:31.734Z"
            },
            "hardware": {
                "data": [],
                "name": "hardware",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:18:35.103Z"
            }
        },
        "costing_complete": "2026-08-04T16:18:45.127+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Sitting Room",
            "project_id": 315,
            "task_number": "362",
            "task_created_at": "2025-12-24T17:24:49.349+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    },
    {
        "financials_id": 476,
        "financials_created_at": "2026-06-10T22:18:35.500451+00:00",
        "task_id": 1245,
        "financials_updated_at": "2026-08-04T16:21:04.581+00:00",
        "adjustments": {
            "profit": 20,
            "discount": -10,
            "quantity": 1,
            "addToTotal": 0,
            "commission": 10,
            "addToSubtotal": 0
        },
        "team_id": "e943e472-54c7-472e-892b-731c41508cdd",
        "financial_data": {
            "wood": {
                "data": [
                    {
                        "id": "009e54d4-19c8-4ebf-9229-f35b1185cc6e",
                        "cost": 800,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "800",
                        "taxRateExpression": null
                    }
                ],
                "name": "wood",
                "estimate": 800,
                "actual_cost": 800,
                "completedAt": "2026-08-04T16:20:59.961Z"
            },
            "doors": {
                "data": [
                    {
                        "id": "720b7b99-7205-44f6-923a-84b2aef2cb81",
                        "cost": 400,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "400",
                        "taxRateExpression": null
                    }
                ],
                "name": "doors & drawer fronts",
                "estimate": 400,
                "actual_cost": 400,
                "completedAt": "2026-08-04T16:20:32.787Z"
            },
            "hours": {
                "data": [
                    {
                        "estimate": 4.24,
                        "inputRows": [
                            {
                                "id": "f6671383-700e-4e32-9cc8-7b2adf5b635e",
                                "hours": {
                                    "decimal": 12.5,
                                    "display": "12:30"
                                },
                                "isOvertime": false,
                                "actual_cost": 543.75,
                                "employee_id": "33"
                            }
                        ],
                        "actual_cost": 543.75,
                        "fixedAmount": 0,
                        "rateOverride": 100,
                        "team_service_id": 4
                    },
                    {
                        "estimate": 2.4,
                        "inputRows": [
                            {
                                "id": "2985e5a8-3e1f-48fc-b9fa-ac2d1da1db72",
                                "hours": {
                                    "decimal": 4.65,
                                    "display": "4:39"
                                },
                                "isOvertime": false,
                                "actual_cost": 246.45000000000002,
                                "employee_id": "39"
                            }
                        ],
                        "actual_cost": 246.45000000000002,
                        "fixedAmount": 0,
                        "rateOverride": 112.5,
                        "team_service_id": 8
                    },
                    {
                        "estimate": 4.7,
                        "inputRows": [
                            {
                                "id": "6ff9fd5a3b24fa35754514a521bbaa7f",
                                "cost": 373.5,
                                "hours": {
                                    "decimal": 373.5,
                                    "display": "373.5"
                                },
                                "invoice": "1538",
                                "taxRate": 0,
                                "isOvertime": false,
                                "actual_cost": 373.5,
                                "employee_id": "fixed_amount"
                            }
                        ],
                        "actual_cost": 373.5,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 12
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": 125,
                        "team_service_id": 16
                    },
                    {
                        "estimate": 0,
                        "inputRows": [],
                        "actual_cost": 0,
                        "fixedAmount": 0,
                        "rateOverride": null,
                        "team_service_id": 20
                    }
                ],
                "name": "hours",
                "estimate": 0,
                "actual_cost": 1163.7,
                "completedAt": "2026-08-04T16:19:56.317Z"
            },
            "other": {
                "data": [],
                "name": "other",
                "estimate": 0,
                "actual_cost": 0,
                "completedAt": "2026-08-04T16:21:03.045Z"
            },
            "drawers": {
                "data": [
                    {
                        "id": "f686ab76-1a99-4fb8-b851-eb04bcabd82f",
                        "cost": 266,
                        "invoice": "29544",
                        "taxRate": 8.45,
                        "description": "",
                        "costExpression": "266",
                        "taxRateExpression": "8.45"
                    }
                ],
                "name": "drawers",
                "estimate": 390,
                "actual_cost": 288.47700000000003,
                "completedAt": "2026-08-04T16:20:48.083Z"
            },
            "cabinets": {
                "data": [
                    {
                        "id": "a07d1c03-b101-4f01-b393-24240d7ee405",
                        "cost": 275,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "275",
                        "taxRateExpression": null
                    }
                ],
                "name": "cabinets",
                "estimate": 275,
                "actual_cost": 275,
                "completedAt": "2026-08-04T16:20:31.618Z"
            },
            "hardware": {
                "data": [
                    {
                        "id": "48c907e6-ac51-49d2-a950-30b72d4b1185",
                        "cost": 120,
                        "invoice": "",
                        "taxRate": null,
                        "description": "",
                        "costExpression": "120",
                        "taxRateExpression": null
                    }
                ],
                "name": "hardware",
                "estimate": 120,
                "actual_cost": 120,
                "completedAt": "2026-08-04T16:20:55.289Z"
            }
        },
        "costing_complete": "2026-08-04T16:21:04.581+00:00",
        "estimate_updated_at": null,
        "tasks": {
            "task_name": "Upper Bath #2 Vanity",
            "project_id": 315,
            "task_number": "363",
            "task_created_at": "2025-12-24T17:25:00.013+00:00",
            "task_completed_at": "2026-06-10T22:18:32.206+00:00"
        }
    }
]