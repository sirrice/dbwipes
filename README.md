summary
=======

show summaries of a database


Setup

    pip install -e .                  # install scorpion
    sudo apt-get install postgresql   # install postgresql 9
    # set postgresql to accept localhost:5432 connections 
    createdb status
    createdb cache

DBSetup -- pre-compute attribute value distributions

    summarizedb.py <dbname>
    vi settings.py           # specify your own dburl prefix.

Add new dataset:

    pip install dbtruck
    importmydata.py <table> <db> <file>
    python fixnulls <db> <tablename>     # scorpion doesn't deal with nulls well, otherwise don't worry about this
    python summarizedb.py dbname         # precompute attribute value distributions



