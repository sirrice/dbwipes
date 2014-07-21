#!/bin/bash

#
# assumes you are at the root of a virtualenv setup
# so that python executables have been installed under ./bin
#
echo "Assuming you are in root of <virtualenv> directory!"

echo "creating cache and status databases"
createdb -h localhost cache
createdb -h localhost status

python ./bin/gen_dbwipes_test_data.py --simple > /tmp/simple.csv
importmydata.py simple test /tmp/simple.csv

python ./bin/gen_dbwipes_test_data.py  > /tmp/test.csv
importmydata.py test test /tmp/test.csv

python ./bin/summarizedb.py --reset test simple test 


