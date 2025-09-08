export const mockServices = [
  {
    id: 1,
    created_at: "2025-08-28T15:59:44.568826+00:00",
    name: "Shop",
    team_id: null,
  },
  {
    id: 2,
    created_at: "2025-08-28T15:59:54.191422+00:00",
    name: "Finish",
    team_id: null,
  },
  {
    id: 3,
    created_at: "2025-08-28T16:00:03.429479+00:00",
    name: "Install",
    team_id: null,
  },
  {
    id: 4,
    created_at: "2025-08-28T16:00:10.123456+00:00",
    name: "CNC",
    team_id: 2, // Exclusive to Shop Team
  },
  {
    id: 5,
    created_at: "2025-08-28T16:00:15.789012+00:00",
    name: "Design",
    team_id: null,
  },
];

export const mockTeams = [
  { id: 1, name: "Mock Team 1" },
  { id: 2, name: "Mock Team 2" },
  { id: 3, name: "Mock Team 3" },
  { id: 4, name: "Mock Team 4" },
  { id: 5, name: "Mock Team 5" },
];

export const mockTeamServicesView = [
  // Team 1 (Mock Team 1) has all services
  { team_id: 1, service_id: 1, name: 'Shop', is_active: true, hourly_rate: 50, team_service_id: 101 },
  { team_id: 1, service_id: 2, name: 'Finish', is_active: true, hourly_rate: 55, team_service_id: 102 },
  { team_id: 1, service_id: 3, name: 'Install', is_active: false, hourly_rate: 60, team_service_id: 103 },
  { team_id: 1, service_id: 4, name: 'CNC', is_active: true, hourly_rate: 70, team_service_id: 104 },
  { team_id: 1, service_id: 5, name: 'Design', is_active: false, hourly_rate: 75, team_service_id: 105 },

  // Team 2 (Mock Team 2)
  { team_id: 2, service_id: 1, name: 'Shop', is_active: true, hourly_rate: 52, team_service_id: 201 },
  { team_id: 2, service_id: 2, name: 'Finish', is_active: false, hourly_rate: 57, team_service_id: 202 },
  { team_id: 2, service_id: 3, name: 'Install', is_active: true, hourly_rate: 62, team_service_id: 203 },
  { team_id: 2, service_id: 4, name: 'CNC', is_active: true, hourly_rate: 72, team_service_id: 204 }, // Has access to its own service
  { team_id: 2, service_id: 5, name: 'Design', is_active: false, hourly_rate: 77, team_service_id: 205 },
];
