// Neo4j Schema Constraints and Indexes for CrimeGraph AI

CREATE CONSTRAINT unique_person_id IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT unique_phone_id IF NOT EXISTS
FOR (ph:Phone) REQUIRE ph.id IS UNIQUE;

CREATE CONSTRAINT unique_vehicle_id IF NOT EXISTS
FOR (v:Vehicle) REQUIRE v.id IS UNIQUE;

CREATE CONSTRAINT unique_location_id IF NOT EXISTS
FOR (l:Location) REQUIRE l.id IS UNIQUE;

CREATE CONSTRAINT unique_org_id IF NOT EXISTS
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

CREATE CONSTRAINT unique_case_id IF NOT EXISTS
FOR (c:Case) REQUIRE c.id IS UNIQUE;

CREATE INDEX person_name_idx IF NOT EXISTS
FOR (p:Person) ON (p.name);

CREATE INDEX phone_number_idx IF NOT EXISTS
FOR (ph:Phone) ON (ph.phone_number);

CREATE INDEX vehicle_plate_idx IF NOT EXISTS
FOR (v:Vehicle) ON (v.plate_number);
