
// Define role groups
const ALL_ROLES = [
    'CREATOR',
    'GROUP LEADER',
    'OPERATOR FT',
    'FUELMAN',
    'FUEL AND OIL ADMIN',
    'OILMAN',
    'PLANT',
    'FUELMAN_PARTNER',
    'FUEL_SUPERVISOR_PARTNER'
  ];
  
  const FUEL_ROLES  = [
    'CREATOR',
    'GROUP LEADER',
    'OPERATOR FT',
    'FUELMAN',
    'FUEL AND OIL ADMIN',
  ];
  
  const OIL_ROLES = [
    'CREATOR',
    'GROUP LEADER',
    'FUEL AND OIL ADMIN',
    'OILMAN'
  ];
  
  const SUPERVISOR= ['CREATOR', 'GROUP LEADER'];
  
  const ADMIN = [
    'CREATOR',
    'GROUP LEADER',
    'FUEL AND OIL ADMIN',
  ];

  const PLANT = [
     'CREATOR',
    'PLANT',
    'PLANNER',
    'PLANT GL',
    'PLANT TE'
  ]


  const FUEL_PARTNER = [
    'CREATOR',
    'GROUP LEADER',
    'FUELMAN_PARTNER',
    'FUEL AND OIL ADMIN',
    'FUEL_SUPERVISOR_PARTNER'
  ]

  export { ALL_ROLES, FUEL_ROLES, OIL_ROLES, ADMIN, SUPERVISOR,PLANT, FUEL_PARTNER };