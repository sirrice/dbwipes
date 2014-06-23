DBWipes
=======

Interactive browsing of a database + integration with Scorpion (if scorpion is installed).


## Pre-install instructions

    sudo apt-get install postgresql   # install postgresql 9+
    # set postgresql to accept localhost:5432 connections 
    createdb status
    createdb cache

## INSTALL

Manual install

    python setup.py install


PyPi install

    pip install dbwipes


## Usage

DBSetup -- pre-compute attribute value distributions

    summarizedb.py <dbname>
    vi settings.py           # specify your own dburl prefix.

Add new dataset:

    pip install dbtruck
    importmydata.py <table> <db> <file>
    python fixnulls <db> <tablename>     # scorpion doesn't deal with nulls well, otherwise don't worry about this
    python summarizedb.py dbname         # precompute attribute value distributions



