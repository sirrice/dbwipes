createdb -h localhost cache
createdb -h localhost status

python gen_dbwipes_test_data.py --simple > /tmp/simple.csv
importmydata.py simple test /tmp/simple.csv

python gen_dbwipes_test_data.py  > /tmp/test.csv
importmydata.py test test /tmp/test.csv

python summarizedb.py --reset test simple test 


