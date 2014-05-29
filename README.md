summary
=======

show summaries of a database


Setup

    install scorpion
    install postgresql
    set postgresql to accept localhost:5432 connections 
    createdb status
    createdb cache
    python summarizedb.py <dbname>


Add new dataset

    pip install dbtruck
    importmydata.py <table> <db> <file>
    python fixnulls <db> <tablename>
    python summarizedb.py dbname


