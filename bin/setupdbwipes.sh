#!/bin/bash

#
# assumes you are at the root of a virtualenv setup
# so that python executables have been installed under ./bin
#
echo "Assuming you are in root of <virtualenv> directory!"

echo "creating cache and status databases"
createdb -h localhost cache
createdb -h localhost status

for mode in simple hard1 hard2
do 
  echo "creating data for $mode"
  echo "gen_dbwipes_test_data.py $mode > /tmp/dbwipesdata.csv"
  gen_dbwipes_test_data.py $mode > /tmp/dbwipesdata.csv
  echo "importmydata.py $mode test /tmp/dbwipesdata.csv"
  importmydata.py $mode test /tmp/dbwipesdata.csv
done

summarizedb.py --reset test simple hard1 hard2


