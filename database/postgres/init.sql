-- CrimeGraph AI: PostgreSQL Database Initialization
\set ON_ERROR_STOP on

CREATE DATABASE crimegraph_db;
\c crimegraph_db;

\i schema.sql;
