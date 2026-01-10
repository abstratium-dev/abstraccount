#!/bin/bash
docker run -it --rm --network abstratium mysql mysql -h abstratium-mysql --port 3306 -u root -psecret mysql -e "DELETE FROM TODO.T_TODO;"
