USE oams_db;

CREATE TABLE IF NOT EXISTS demo_counters (
    counter_id INT PRIMARY KEY DEFAULT 1,
    count_value INT NOT NULL DEFAULT 0
);

INSERT INTO demo_counters (counter_id, count_value) 
VALUES (1, 0) 
ON DUPLICATE KEY UPDATE count_value = count_value;